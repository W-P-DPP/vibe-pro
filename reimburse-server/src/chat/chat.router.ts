import express, { type Router } from 'express';
import {
  createChatSession,
  deleteChatSession,
  getChatMessages,
  getChatSessions,
  streamChatSession,
} from './chat.controller.ts';

const chatRouter: Router = express.Router();

chatRouter.get('/sessions', getChatSessions);
chatRouter.post('/sessions', createChatSession);
chatRouter.delete('/sessions/:id', deleteChatSession);
chatRouter.get('/sessions/:id/messages', getChatMessages);
chatRouter.post('/sessions/:id/stream', streamChatSession);

export default chatRouter;
