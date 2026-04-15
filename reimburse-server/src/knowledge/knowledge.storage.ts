import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || 'file';
}

export function resolveKnowledgeStorageRoot() {
  const configured = process.env.KNOWLEDGE_STORAGE_ROOT?.trim();
  if (configured) {
    return path.resolve(process.cwd(), configured);
  }

  return path.resolve(process.cwd(), 'storage', 'knowledge');
}

export async function persistKnowledgeFile(
  ownerUserId: number,
  knowledgeBaseId: number,
  originalFileName: string,
  content: Buffer,
) {
  const rootPath = resolveKnowledgeStorageRoot();
  const targetDirectory = path.join(
    rootPath,
    String(ownerUserId),
    String(knowledgeBaseId),
    'original',
  );
  await mkdir(targetDirectory, { recursive: true });

  const ext = path.extname(originalFileName);
  const baseName = path.basename(originalFileName, ext);
  const storedFileName = `${sanitizeFileName(baseName)}-${randomUUID()}${ext}`;
  const absolutePath = path.join(targetDirectory, storedFileName);

  await writeFile(absolutePath, content);

  return {
    absolutePath,
    relativePath: path.relative(process.cwd(), absolutePath).replace(/\\/g, '/'),
  };
}
