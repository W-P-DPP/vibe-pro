export type ReimbursementCategory = 'travel' | 'meal' | 'office' | 'transport' | 'other';

export type ReimbursementStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export type UserRole = 'admin' | 'employee' | 'approver' | 'guest';

export interface CreateReimbursementRequestDto {
  title: string;
  category: ReimbursementCategory;
  amount: number;
  expenseDate: string;
  description?: string;
  payeeName?: string;
  payeeAccount?: string;
}

export interface UpdateReimbursementRequestDto {
  title?: string;
  category?: ReimbursementCategory;
  amount?: number;
  expenseDate?: string;
  description?: string;
  payeeName?: string;
  payeeAccount?: string;
}

export interface RejectReimbursementRequestDto {
  rejectReason: string;
}

export interface ReimbursementAttachmentItemDto {
  id: number;
  fileId: string;
  originalFileName: string;
  fileSize: number;
  contentType: string;
  fileUrl: string;
  createTime?: string;
}

export interface ReimbursementListItemDto {
  id: number;
  title: string;
  category: ReimbursementCategory;
  amount: number;
  amountCents: number;
  currency: 'CNY';
  expenseDate: string;
  status: ReimbursementStatus;
  applicantUserId: number;
  applicantUsername: string;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canMarkPaid: boolean;
  updateTime?: string;
}

export interface ReimbursementDetailDto extends ReimbursementListItemDto {
  description: string;
  payeeName: string;
  payeeAccount: string;
  rejectReason: string;
  approvedByUserId?: number | null;
  approvedByUsername?: string | null;
  approvedTime?: string | null;
  attachments: ReimbursementAttachmentItemDto[];
  createTime?: string;
}

export interface UploadFileResultDto {
  fileId: string;
  fileUrl: string;
  originalFileName: string;
  fileSize: number;
  contentType: string;
}
