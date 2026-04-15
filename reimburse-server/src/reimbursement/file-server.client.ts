import axios from 'axios';
import FormData from 'form-data';
import type { Express } from 'express';
import type { UploadFileResultDto } from './reimbursement.dto.ts';

type FileServerUploadResponse = {
  code: number;
  msg: string;
  data: {
    uploaded?: Array<{
      name: string;
      relativePath: string;
      type: string;
    }>;
  };
};

function getFileServerBaseUrl() {
  return (process.env.FILE_SERVER_API_BASE_URL || 'http://127.0.0.1:30010/api').replace(/\/$/, '');
}

export class FileServerClient {
  async uploadAttachment(input: {
    file: Express.Multer.File;
    targetPath: string;
    authorization?: string;
  }): Promise<UploadFileResultDto> {
    const formData = new FormData();
    formData.append('targetPath', input.targetPath);
    formData.append('relativePaths', input.file.originalname);
    formData.append('files', input.file.buffer, {
      filename: input.file.originalname,
      contentType: input.file.mimetype,
      knownLength: input.file.size,
    });

    const response = await axios.post<FileServerUploadResponse>(
      `${getFileServerBaseUrl()}/file/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          ...(input.authorization ? { Authorization: input.authorization } : {}),
        },
        maxBodyLength: Infinity,
      },
    );

    if (response.data.code !== 200 || !response.data.data.uploaded?.[0]) {
      throw new Error(response.data.msg || '附件上传失败');
    }

    const uploaded = response.data.data.uploaded[0];
    return {
      fileId: uploaded.relativePath,
      fileUrl: `${getFileServerBaseUrl()}/file/preview?targetPath=${encodeURIComponent(uploaded.relativePath)}`,
      originalFileName: uploaded.name,
      fileSize: input.file.size,
      contentType: input.file.mimetype,
    };
  }
}

export const fileServerClient = new FileServerClient();
