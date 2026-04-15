import { In, type Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import type { ParsedKnowledgeChunkDto } from './knowledge.dto.ts';
import {
  KnowledgeBaseEntity,
  KnowledgeChunkEntity,
  KnowledgeDocumentEntity,
} from './knowledge.entity.ts';

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

export class KnowledgeRepository {
  private async getBaseRepository(): Promise<Repository<KnowledgeBaseEntity>> {
    const dataSource = await ensureDataSource();
    return dataSource.getRepository(KnowledgeBaseEntity);
  }

  private async getDocumentRepository(): Promise<Repository<KnowledgeDocumentEntity>> {
    const dataSource = await ensureDataSource();
    return dataSource.getRepository(KnowledgeDocumentEntity);
  }

  private async getChunkRepository(): Promise<Repository<KnowledgeChunkEntity>> {
    const dataSource = await ensureDataSource();
    return dataSource.getRepository(KnowledgeChunkEntity);
  }

  async listKnowledgeBases(ownerUserId: number) {
    const repository = await this.getBaseRepository();
    return repository.find({
      where: { ownerUserId },
      order: { id: 'DESC' },
    });
  }

  async getKnowledgeBaseById(ownerUserId: number, id: number) {
    const repository = await this.getBaseRepository();
    return repository.findOne({
      where: { id, ownerUserId },
    });
  }

  async getKnowledgeBasesByIds(ownerUserId: number, ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getBaseRepository();
    return repository.find({
      where: { ownerUserId, id: In(ids) },
      order: { id: 'ASC' },
    });
  }

  async createKnowledgeBase(ownerUserId: number, name: string, description: string) {
    const repository = await this.getBaseRepository();
    const entity = repository.create({
      ownerUserId,
      name,
      description,
      status: 'active',
      createBy: String(ownerUserId),
      updateBy: String(ownerUserId),
    });

    return repository.save(entity);
  }

  async countDocumentsByBaseIds(knowledgeBaseIds: number[]) {
    if (knowledgeBaseIds.length === 0) {
      return new Map<number, number>();
    }

    const repository = await this.getDocumentRepository();
    const rows = await repository
      .createQueryBuilder('document')
      .select('document.knowledgeBaseId', 'knowledgeBaseId')
      .addSelect('COUNT(document.id)', 'count')
      .where('document.knowledgeBaseId IN (:...knowledgeBaseIds)', { knowledgeBaseIds })
      .groupBy('document.knowledgeBaseId')
      .getRawMany<{ knowledgeBaseId: string; count: string }>();

    return new Map(rows.map((item) => [Number(item.knowledgeBaseId), Number(item.count)]));
  }

  async listDocuments(ownerUserId: number, knowledgeBaseId: number) {
    const repository = await this.getDocumentRepository();
    return repository.find({
      where: { ownerUserId, knowledgeBaseId },
      order: { id: 'DESC' },
    });
  }

  async getDocumentByOriginalFileName(ownerUserId: number, knowledgeBaseId: number, fileName: string) {
    const repository = await this.getDocumentRepository();
    return repository.findOne({
      where: { ownerUserId, knowledgeBaseId, originalFileName: fileName },
    });
  }

  async createDocument(input: {
    ownerUserId: number;
    knowledgeBaseId: number;
    originalFileName: string;
    storedFilePath: string;
    fileExt: string;
    fileSize: number;
  }) {
    const repository = await this.getDocumentRepository();
    const entity = repository.create({
      ownerUserId: input.ownerUserId,
      knowledgeBaseId: input.knowledgeBaseId,
      originalFileName: input.originalFileName,
      storedFilePath: input.storedFilePath,
      fileExt: input.fileExt,
      fileSize: input.fileSize,
      parseStatus: 'pending',
      parseErrorMessage: '',
      chunkCount: 0,
      createBy: String(input.ownerUserId),
      updateBy: String(input.ownerUserId),
    });

    return repository.save(entity);
  }

  async updateDocumentStatus(input: {
    documentId: number;
    parseStatus: 'pending' | 'processing' | 'success' | 'failed';
    parseErrorMessage?: string;
    chunkCount?: number;
    ownerUserId: number;
  }) {
    const repository = await this.getDocumentRepository();
    const document = await repository.findOne({
      where: { id: input.documentId, ownerUserId: input.ownerUserId },
    });

    if (!document) {
      return null;
    }

    document.parseStatus = input.parseStatus;
    document.parseErrorMessage = input.parseErrorMessage ?? '';
    document.chunkCount = input.chunkCount ?? document.chunkCount;
    document.updateBy = String(input.ownerUserId);

    return repository.save(document);
  }

  async replaceChunks(ownerUserId: number, documentId: number, knowledgeBaseId: number, chunks: ParsedKnowledgeChunkDto[]) {
    const repository = await this.getChunkRepository();
    await repository.delete({ documentId });

    if (chunks.length === 0) {
      return [];
    }

    const entities = chunks.map((item) =>
      repository.create({
        knowledgeBaseId,
        documentId,
        chunkIndex: item.chunkIndex,
        titleHint: item.titleHint,
        content: item.content,
        keywordText: item.keywordText,
        charCount: item.charCount,
        createBy: String(ownerUserId),
        updateBy: String(ownerUserId),
      }),
    );

    return repository.save(entities);
  }

  async searchChunks(knowledgeBaseIds: number[], keywords: string[], limit: number) {
    if (knowledgeBaseIds.length === 0 || keywords.length === 0) {
      return [];
    }

    const repository = await this.getChunkRepository();
    const queryBuilder = repository
      .createQueryBuilder('chunk')
      .where('chunk.knowledgeBaseId IN (:...knowledgeBaseIds)', { knowledgeBaseIds });

    const conditions = keywords
      .map(
        (keyword, index) =>
          `(chunk.content LIKE :content${index} OR chunk.titleHint LIKE :title${index} OR chunk.keywordText LIKE :keyword${index})`,
      )
      .join(' OR ');

    keywords.forEach((keyword, index) => {
      const pattern = `%${keyword}%`;
      queryBuilder.setParameter(`content${index}`, pattern);
      queryBuilder.setParameter(`title${index}`, pattern);
      queryBuilder.setParameter(`keyword${index}`, pattern);
    });

    return queryBuilder
      .andWhere(conditions)
      .orderBy('chunk.documentId', 'DESC')
      .addOrderBy('chunk.chunkIndex', 'ASC')
      .take(limit)
      .getMany();
  }

  async getDocumentsByIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getDocumentRepository();
    return repository.find({
      where: { id: In(ids) },
    });
  }
}

export const knowledgeRepository = new KnowledgeRepository();
