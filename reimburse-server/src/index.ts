import express, { type Router } from 'express';
import reimbursementRouter from './reimbursement/reimbursement.router.ts';

const router: Router = express.Router();

router.use('/reimbursements', reimbursementRouter);

export default router;
