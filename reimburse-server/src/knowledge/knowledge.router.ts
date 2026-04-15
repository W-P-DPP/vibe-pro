import express, { type Router } from 'express';
import multer from 'multer';
import {
  createKnowledgeBase,
  getKnowledgeBaseDetail,
  getKnowledgeBases,
  getKnowledgeDocuments,
  searchKnowledge,
  uploadKnowledgeDocument,
} from './knowledge.controller.ts';

const knowledgeRouter: Router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

knowledgeRouter.get('/bases', getKnowledgeBases);
knowledgeRouter.post('/bases', createKnowledgeBase);
knowledgeRouter.get('/bases/:id', getKnowledgeBaseDetail);
knowledgeRouter.get('/bases/:id/documents', getKnowledgeDocuments);
knowledgeRouter.post('/bases/:id/documents/upload', upload.single('file'), uploadKnowledgeDocument);
knowledgeRouter.post('/bases/:id/search', searchKnowledge);

export default knowledgeRouter;
