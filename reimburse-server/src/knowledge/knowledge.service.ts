import path from 'path';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import { agentService } from '../agent/agent.service.ts';
import type {
  CreateKnowledgeBaseRequestDto,
  KnowledgeBaseDetailResponseDto,
  KnowledgeBaseResponseDto,
  KnowledgeDocumentResponseDto,
  KnowledgeSearchItemDto,
} from './knowledge.dto.ts';
import { parseKnowledgeDocument } from './knowledge.parser.ts';
import { knowledgeRepository } from './knowledge.repository.ts';
import { persistKnowledgeFile } from './knowledge.storage.ts';

export class KnowledgeBusinessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = HttpStatus.BAD_REQUEST,
  ) {
    super(message);
    this.name = 'KnowledgeBusinessError';
  }
}

function normalizeDateTime(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function toKnowledgeBaseResponse(
  entity: Awaited<ReturnType<typeof knowledgeRepository.listKnowledgeBases>>[number],
  documentCount: number,
  boundKnowledgeBaseIds: Set<number>,
): KnowledgeBaseResponseDto {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    status: entity.status,
    documentCount,
    boundToDefaultAgent: boundKnowledgeBaseIds.has(entity.id),
    updateTime: normalizeDateTime(entity.updateTime),
  };
}

function toKnowledgeDocumentResponse(
  entity: Awaited<ReturnType<typeof knowledgeRepository.listDocuments>>[number],
): KnowledgeDocumentResponseDto {
  return {
    id: entity.id,
    originalFileName: entity.originalFileName,
    fileExt: entity.fileExt,
    fileSize: entity.fileSize,
    parseStatus: entity.parseStatus,
    parseErrorMessage: entity.parseErrorMessage,
    chunkCount: entity.chunkCount,
    updateTime: normalizeDateTime(entity.updateTime),
  };
}

function normalizeName(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new KnowledgeBusinessError(`${fieldName}不能为空`);
  }

  return value.trim();
}

function normalizeSearchQuery(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new KnowledgeBusinessError('检索内容不能为空');
  }

  return value.trim();
}

function extractKeywords(query: string) {
  const matched = query.match(/[\p{Letter}\p{Number}\u4e00-\u9fff]{2,}/gu) ?? [];
  return Array.from(new Set(matched)).slice(0, 8);
}

function buildSnippet(content: string, query: string) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  const index = normalized.indexOf(query);

  if (index >= 0) {
    const start = Math.max(index - 30, 0);
    const end = Math.min(index + query.length + 60, normalized.length);
    return normalized.slice(start, end);
  }

  return normalized.slice(0, 90);
}

function calculateScore(
  content: string,
  titleHint: string,
  keywordText: string,
  query: string,
  keywords: string[],
) {
  let score = 0;

  if (content.includes(query)) score += 8;
  if (titleHint.includes(query)) score += 4;
  if (keywordText.includes(query)) score += 3;

  for (const keyword of keywords) {
    if (content.includes(keyword)) score += 2;
    if (titleHint.includes(keyword)) score += 1;
    if (keywordText.includes(keyword)) score += 1;
  }

  return score;
}

export class KnowledgeService {
  async getKnowledgeBases(ownerUserId: number): Promise<KnowledgeBaseResponseDto[]> {
    const [knowledgeBases, bindings] = await Promise.all([
      knowledgeRepository.listKnowledgeBases(ownerUserId),
      agentService.listBindings(ownerUserId),
    ]);
    const documentCountMap = await knowledgeRepository.countDocumentsByBaseIds(
      knowledgeBases.map((item) => item.id),
    );
    const boundIds = new Set(bindings.map((item) => item.knowledgeBaseId));

    return knowledgeBases.map((item) =>
      toKnowledgeBaseResponse(item, documentCountMap.get(item.id) ?? 0, boundIds),
    );
  }

  async createKnowledgeBase(ownerUserId: number, input: CreateKnowledgeBaseRequestDto) {
    const name = normalizeName(input.name, '知识库名称');
    const description =
      typeof input.description === 'string' ? input.description.trim() : '';

    try {
      await knowledgeRepository.createKnowledgeBase(ownerUserId, name, description);
      const knowledgeBases = await this.getKnowledgeBases(ownerUserId);
      const created = knowledgeBases.find((item) => item.name === name);

      if (!created) {
        throw new KnowledgeBusinessError('创建知识库失败', HttpStatus.ERROR);
      }

      return created;
    } catch (error) {
      if (error instanceof KnowledgeBusinessError) {
        throw error;
      }

      throw new KnowledgeBusinessError('知识库名称已存在', HttpStatus.CONFLICT);
    }
  }

  async getKnowledgeBaseDetail(
    ownerUserId: number,
    knowledgeBaseId: number,
  ): Promise<KnowledgeBaseDetailResponseDto> {
    const knowledgeBases = await this.getKnowledgeBases(ownerUserId);
    const target = knowledgeBases.find((item) => item.id === knowledgeBaseId);

    if (!target) {
      throw new KnowledgeBusinessError('知识库不存在', HttpStatus.NOT_FOUND);
    }

    return target;
  }

  async getKnowledgeBaseDocuments(ownerUserId: number, knowledgeBaseId: number) {
    const knowledgeBase = await knowledgeRepository.getKnowledgeBaseById(
      ownerUserId,
      knowledgeBaseId,
    );
    if (!knowledgeBase) {
      throw new KnowledgeBusinessError('知识库不存在', HttpStatus.NOT_FOUND);
    }

    const documents = await knowledgeRepository.listDocuments(ownerUserId, knowledgeBaseId);
    return documents.map(toKnowledgeDocumentResponse);
  }

  async uploadKnowledgeDocument(
    ownerUserId: number,
    knowledgeBaseId: number,
    file: Express.Multer.File | undefined,
  ): Promise<KnowledgeDocumentResponseDto> {
    if (!file) {
      throw new KnowledgeBusinessError('请先上传文件');
    }

    const knowledgeBase = await knowledgeRepository.getKnowledgeBaseById(
      ownerUserId,
      knowledgeBaseId,
    );
    if (!knowledgeBase) {
      throw new KnowledgeBusinessError('知识库不存在', HttpStatus.NOT_FOUND);
    }

    const originalFileName = file.originalname.trim();
    if (!originalFileName) {
      throw new KnowledgeBusinessError('文件名无效');
    }

    const fileExt = path.extname(originalFileName).toLowerCase();
    const duplicated = await knowledgeRepository.getDocumentByOriginalFileName(
      ownerUserId,
      knowledgeBaseId,
      originalFileName,
    );

    if (duplicated) {
      throw new KnowledgeBusinessError('同名文件已存在', HttpStatus.CONFLICT);
    }

    const persisted = await persistKnowledgeFile(
      ownerUserId,
      knowledgeBaseId,
      originalFileName,
      file.buffer,
    );
    const document = await knowledgeRepository.createDocument({
      ownerUserId,
      knowledgeBaseId,
      originalFileName,
      storedFilePath: persisted.relativePath,
      fileExt,
      fileSize: file.size,
    });

    await knowledgeRepository.updateDocumentStatus({
      ownerUserId,
      documentId: document.id,
      parseStatus: 'processing',
    });

    try {
      const chunks = parseKnowledgeDocument(file.buffer, fileExt, originalFileName);
      await knowledgeRepository.replaceChunks(ownerUserId, document.id, knowledgeBaseId, chunks);
      const updated = await knowledgeRepository.updateDocumentStatus({
        ownerUserId,
        documentId: document.id,
        parseStatus: 'success',
        chunkCount: chunks.length,
      });

      if (!updated) {
        throw new KnowledgeBusinessError('更新文档状态失败', HttpStatus.ERROR);
      }

      return toKnowledgeDocumentResponse(updated);
    } catch (error) {
      await knowledgeRepository.updateDocumentStatus({
        ownerUserId,
        documentId: document.id,
        parseStatus: 'failed',
        parseErrorMessage: error instanceof Error ? error.message : '文件解析失败',
      });

      throw new KnowledgeBusinessError(
        error instanceof Error ? error.message : '文件解析失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async searchKnowledgeBase(
    ownerUserId: number,
    knowledgeBaseId: number,
    query: string,
  ) {
    return this.searchAcrossKnowledgeBases(ownerUserId, [knowledgeBaseId], query);
  }

  async searchAcrossKnowledgeBases(
    ownerUserId: number,
    knowledgeBaseIds: number[],
    query: string,
  ): Promise<KnowledgeSearchItemDto[]> {
    const normalizedQuery = normalizeSearchQuery(query);
    const normalizedIds = Array.from(
      new Set(
        knowledgeBaseIds
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item > 0),
      ),
    );

    if (normalizedIds.length === 0) {
      return [];
    }

    const availableKnowledgeBases = await knowledgeRepository.getKnowledgeBasesByIds(
      ownerUserId,
      normalizedIds,
    );
    if (availableKnowledgeBases.length !== normalizedIds.length) {
      throw new KnowledgeBusinessError('存在不可用的知识库', HttpStatus.NOT_FOUND);
    }

    const keywords = extractKeywords(normalizedQuery);
    if (keywords.length === 0) {
      return [];
    }

    const chunks = await knowledgeRepository.searchChunks(normalizedIds, keywords, 24);
    const documents = await knowledgeRepository.getDocumentsByIds(
      Array.from(new Set(chunks.map((item) => item.documentId))),
    );
    const documentMap = new Map(documents.map((item) => [item.id, item]));

    return chunks
      .map((item) => ({
        chunkId: item.id,
        knowledgeBaseId: item.knowledgeBaseId,
        documentId: item.documentId,
        documentName: documentMap.get(item.documentId)?.originalFileName ?? '未知文档',
        snippet: buildSnippet(item.content, normalizedQuery),
        score: calculateScore(
          item.content,
          item.titleHint,
          item.keywordText,
          normalizedQuery,
          keywords,
        ),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8);
  }
}

export const knowledgeService = new KnowledgeService();
