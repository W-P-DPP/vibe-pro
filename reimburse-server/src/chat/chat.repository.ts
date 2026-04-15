import { randomUUID } from 'crypto';
import type { DataSource, Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import {
  ChatMessageEntity,
  ChatRunEntity,
  ChatSessionEntity,
} from './chat.entity.ts';

let chatSessionMigrationDone = false;
let chatSessionMigrationPromise: Promise<void> | null = null;

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

async function ensureChatSessionUuidMigration(dataSource: DataSource) {
  if (chatSessionMigrationDone) {
    return;
  }

  if (chatSessionMigrationPromise) {
    return chatSessionMigrationPromise;
  }

  chatSessionMigrationPromise = (async () => {
    await dataSource.transaction(async (manager) => {
      const sessionRepository = manager.getRepository(ChatSessionEntity);
      const messageRepository = manager.getRepository(ChatMessageEntity);
      const runRepository = manager.getRepository(ChatRunEntity);
      const sessions = await sessionRepository.find({
        select: {
          id: true,
          sessionId: true,
          ownerUserId: true,
        },
      });

      for (const session of sessions) {
        const nextSessionId = session.sessionId?.trim() || randomUUID();
        if (!session.sessionId?.trim()) {
          await sessionRepository.update(
            { id: session.id },
            {
              sessionId: nextSessionId,
              updateBy: String(session.ownerUserId),
            },
          );
        }

        const legacySessionId = String(session.id);
        await messageRepository.update(
          { ownerUserId: session.ownerUserId, sessionId: legacySessionId },
          {
            sessionId: nextSessionId,
            updateBy: String(session.ownerUserId),
          },
        );
        await runRepository.update(
          { ownerUserId: session.ownerUserId, sessionId: legacySessionId },
          {
            sessionId: nextSessionId,
            updateBy: String(session.ownerUserId),
          },
        );
      }
    });

    chatSessionMigrationDone = true;
  })().finally(() => {
    chatSessionMigrationPromise = null;
  });

  return chatSessionMigrationPromise;
}

export class ChatRepository {
  private async getReadyDataSource() {
    const dataSource = await ensureDataSource();
    await ensureChatSessionUuidMigration(dataSource);
    return dataSource;
  }

  private async getSessionRepository(): Promise<Repository<ChatSessionEntity>> {
    const dataSource = await this.getReadyDataSource();
    return dataSource.getRepository(ChatSessionEntity);
  }

  private async getMessageRepository(): Promise<Repository<ChatMessageEntity>> {
    const dataSource = await this.getReadyDataSource();
    return dataSource.getRepository(ChatMessageEntity);
  }

  private async getRunRepository(): Promise<Repository<ChatRunEntity>> {
    const dataSource = await this.getReadyDataSource();
    return dataSource.getRepository(ChatRunEntity);
  }

  async listSessions(ownerUserId: number) {
    const repository = await this.getSessionRepository();
    return repository.find({
      where: { ownerUserId },
      order: { lastMessageAt: 'DESC', id: 'DESC' },
    });
  }

  async createSession(ownerUserId: number, title: string) {
    const repository = await this.getSessionRepository();
    const entity = repository.create({
      sessionId: randomUUID(),
      ownerUserId,
      title,
      lastMessageAt: new Date(),
      createBy: String(ownerUserId),
      updateBy: String(ownerUserId),
    });

    return repository.save(entity);
  }

  async getSessionById(ownerUserId: number, sessionId: string) {
    const repository = await this.getSessionRepository();
    return repository.findOne({
      where: { sessionId, ownerUserId },
    });
  }

  async updateSessionActivity(ownerUserId: number, sessionId: string, title?: string) {
    const repository = await this.getSessionRepository();
    const session = await repository.findOne({
      where: { sessionId, ownerUserId },
    });

    if (!session) {
      return null;
    }

    session.lastMessageAt = new Date();
    session.updateBy = String(ownerUserId);

    if (typeof title === 'string' && title.trim()) {
      session.title = title.trim();
    }

    return repository.save(session);
  }

  async deleteSession(ownerUserId: number, sessionId: string) {
    const dataSource = await this.getReadyDataSource();

    return dataSource.transaction(async (manager) => {
      const sessionRepository = manager.getRepository(ChatSessionEntity);
      const messageRepository = manager.getRepository(ChatMessageEntity);
      const runRepository = manager.getRepository(ChatRunEntity);
      const session = await sessionRepository.findOne({
        where: { ownerUserId, sessionId },
      });

      if (!session) {
        return null;
      }

      await messageRepository.delete({ ownerUserId, sessionId });
      await runRepository.delete({ ownerUserId, sessionId });
      await sessionRepository.delete({ ownerUserId, sessionId });

      return session;
    });
  }

  async listMessages(ownerUserId: number, sessionId: string) {
    const repository = await this.getMessageRepository();
    return repository.find({
      where: { ownerUserId, sessionId },
      order: { id: 'ASC' },
    });
  }

  async createMessage(input: {
    ownerUserId: number;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    provider?: string;
    model?: string;
    runId?: number;
  }) {
    const repository = await this.getMessageRepository();
    const entity = repository.create({
      ownerUserId: input.ownerUserId,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      provider: input.provider ?? '',
      model: input.model ?? '',
      runId: input.runId ?? null,
      createBy: String(input.ownerUserId),
      updateBy: String(input.ownerUserId),
    });

    return repository.save(entity);
  }

  async createRun(input: {
    ownerUserId: number;
    sessionId: string;
    agentProfileId: number;
    provider: string;
    model: string;
    selectedKnowledgeBaseIds: number[];
  }) {
    const repository = await this.getRunRepository();
    const entity = repository.create({
      ownerUserId: input.ownerUserId,
      sessionId: input.sessionId,
      agentProfileId: input.agentProfileId,
      provider: input.provider,
      model: input.model,
      status: 'running',
      selectedKnowledgeBaseIds: input.selectedKnowledgeBaseIds,
      retrievedChunkCount: 0,
      errorMessage: '',
      startedAt: new Date(),
      durationMs: 0,
      createBy: String(input.ownerUserId),
      updateBy: String(input.ownerUserId),
    });

    return repository.save(entity);
  }

  async completeRun(input: {
    ownerUserId: number;
    runId: number;
    status: 'success' | 'failed';
    retrievedChunkCount: number;
    errorMessage?: string;
  }) {
    const repository = await this.getRunRepository();
    const run = await repository.findOne({
      where: { id: input.runId, ownerUserId: input.ownerUserId },
    });

    if (!run) {
      return null;
    }

    const finishedAt = new Date();
    run.status = input.status;
    run.retrievedChunkCount = input.retrievedChunkCount;
    run.errorMessage = input.errorMessage ?? '';
    run.finishedAt = finishedAt;
    run.durationMs = Math.max(finishedAt.getTime() - new Date(run.startedAt).getTime(), 0);
    run.updateBy = String(input.ownerUserId);

    return repository.save(run);
  }
}

export const chatRepository = new ChatRepository();
