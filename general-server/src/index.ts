import express, { type Router } from 'express';
import fileRouter from './file/file.router.ts';
import siteMenuRouter from './siteMenu/siteMenu.router.ts';
import userRouter from './user/user.router.ts';
import { jwtMiddleware } from '../utils/middleware/jwtMiddleware.ts';

const router: Router = express.Router();

router.use('/file', jwtMiddleware, fileRouter);
router.use('/site-menu',  siteMenuRouter);
router.use('/user', userRouter);

export default router;
