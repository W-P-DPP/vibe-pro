import express, { type Router } from 'express';
import contactRouter from './contact/contact.router.ts';
import fileRouter from './file/file.router.ts';
import screenRouter from './screen/screen.router.ts';
import siteMenuRouter from './siteMenu/siteMenu.router.ts';
import todoRouter from './todo/todo.router.ts';
import userRouter from './user/user.router.ts';
import { jwtMiddleware } from '../utils/middleware/jwtMiddleware.ts';

const router: Router = express.Router();

router.use('/contact', contactRouter);
router.use('/file', jwtMiddleware, fileRouter);
router.use('/screen', jwtMiddleware, screenRouter);
router.use('/site-menu',  siteMenuRouter);
router.use('/todo', todoRouter);
router.use('/user', userRouter);

export default router;
