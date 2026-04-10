import express, { type Router } from 'express';
import {
  createUser,
  deleteUser,
  getUser,
  getUserDetail,
  updateUser,
} from './user.controller.ts';

const userRouter: Router = express.Router();

userRouter.get('/getUser', getUser);
userRouter.get('/getUser/:id', getUserDetail);
userRouter.post('/createUser', createUser);
userRouter.put('/updateUser/:id', updateUser);
userRouter.delete('/deleteUser/:id', deleteUser);

export default userRouter;
