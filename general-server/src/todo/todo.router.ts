import express, { type Router } from 'express';
import { jwtMiddleware } from '../../utils/middleware/jwtMiddleware.ts';
import {
  createTodo,
  deleteTodo,
  listTodos,
  toggleTodo,
  updateTodo,
} from './todo.controller.ts';

const todoRouter: Router = express.Router();

todoRouter.use(jwtMiddleware);
todoRouter.get('/list', listTodos);
todoRouter.post('/create', createTodo);
todoRouter.put('/update/:id', updateTodo);
todoRouter.put('/toggle/:id', toggleTodo);
todoRouter.delete('/delete/:id', deleteTodo);

export default todoRouter;
