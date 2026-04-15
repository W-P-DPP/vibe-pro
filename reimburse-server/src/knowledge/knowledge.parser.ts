import type { ParsedKnowledgeChunkDto } from './knowledge.dto.ts';

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.jsonl', '.csv']);
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 100;

function normalizeText(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim();
}

function collectKeywords(value: string) {
  const matched = value.match(/[\p{Letter}\p{Number}\u4e00-\u9fff]{2,}/gu) ?? [];
  return Array.from(new Set(matched)).slice(0, 20).join(' ');
}

function buildChunksFromText(text: string, titleHint: string): ParsedKnowledgeChunkDto[] {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const chunks: ParsedKnowledgeChunkDto[] = [];
  let cursor = 0;
  let chunkIndex = 0;

  while (cursor < normalized.length) {
    const segment = normalized.slice(cursor, cursor + CHUNK_SIZE).trim();
    if (segment) {
      chunks.push({
        chunkIndex,
        titleHint,
        content: segment,
        keywordText: collectKeywords(segment),
        charCount: segment.length,
      });
      chunkIndex += 1;
    }
    cursor += Math.max(CHUNK_SIZE - CHUNK_OVERLAP, 1);
  }

  return chunks;
}

function flattenValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => flattenValue(item)).filter(Boolean).join(' | ');
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${flattenValue(item)}`)
      .filter((item) => !item.endsWith(': '))
      .join('\n');
  }

  return '';
}

function parseJsonl(content: string, fileName: string) {
  const lines = normalizeText(content).split('\n').filter((line) => line.trim());
  const segments = lines.map((line, index) => {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      return flattenValue(parsed);
    } catch {
      throw new Error(`第 ${index + 1} 行 JSONL 解析失败`);
    }
  });

  return buildChunksFromText(segments.join('\n\n'), fileName);
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content: string, fileName: string) {
  const lines = normalizeText(content).split('\n').filter((line) => line.trim());
  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvLine(lines[0]);
  const segments = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return header
      .map((column, index) => `${column || `column_${index + 1}`}: ${values[index] ?? ''}`.trim())
      .join('\n');
  });

  return buildChunksFromText(segments.join('\n\n'), fileName);
}

export function ensureSupportedKnowledgeExtension(fileExt: string) {
  const normalized = fileExt.toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(normalized)) {
    throw new Error('仅支持上传 jsonl、txt、csv 文件');
  }
}

export function parseKnowledgeDocument(buffer: Buffer, fileExt: string, fileName: string) {
  const normalizedExt = fileExt.toLowerCase();
  ensureSupportedKnowledgeExtension(normalizedExt);
  const content = buffer.toString('utf8');

  if (!normalizeText(content)) {
    throw new Error('上传文件内容为空');
  }

  if (normalizedExt === '.txt') {
    return buildChunksFromText(content, fileName);
  }

  if (normalizedExt === '.jsonl') {
    return parseJsonl(content, fileName);
  }

  return parseCsv(content, fileName);
}
