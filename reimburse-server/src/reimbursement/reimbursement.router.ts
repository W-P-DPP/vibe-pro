import express, { type Router } from 'express';
import multer from 'multer';
import {
  approveReimbursement,
  createReimbursement,
  deleteReimbursementAttachment,
  getReimbursementDetail,
  listReimbursements,
  markReimbursementPaid,
  rejectReimbursement,
  submitReimbursement,
  updateReimbursement,
  uploadReimbursementAttachment,
} from './reimbursement.controller.ts';

const reimbursementRouter: Router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

reimbursementRouter.get('/', listReimbursements);
reimbursementRouter.post('/', createReimbursement);
reimbursementRouter.get('/:id', getReimbursementDetail);
reimbursementRouter.put('/:id', updateReimbursement);
reimbursementRouter.post('/:id/submit', submitReimbursement);
reimbursementRouter.post('/:id/approve', approveReimbursement);
reimbursementRouter.post('/:id/reject', rejectReimbursement);
reimbursementRouter.post('/:id/mark-paid', markReimbursementPaid);
reimbursementRouter.post('/:id/attachments', upload.single('file'), uploadReimbursementAttachment);
reimbursementRouter.delete('/:id/attachments/:attachmentId', deleteReimbursementAttachment);

export default reimbursementRouter;
