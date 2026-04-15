import express, { type Router } from 'express';
import {
  getAgentMe,
  getCurrentUser,
  getDefaultBindings,
  getModels,
  getOpenAiModels,
  getProviderModels,
  updateDefaultBindings,
} from './agent.controller.ts';

const agentRouter: Router = express.Router();

agentRouter.get('/me', getAgentMe);
agentRouter.get('/current-user', getCurrentUser);
// Legacy catalog routes remain for compatibility; chat page should use /models.
agentRouter.get('/openai/models', getOpenAiModels);
agentRouter.get('/providers/:provider/models', getProviderModels);
agentRouter.get('/default/bindings', getDefaultBindings);
agentRouter.put('/default/bindings', updateDefaultBindings);
agentRouter.get('/models', getModels);

export default agentRouter;
