import { request } from '@/api/request';

export type ReimbursementCategory = 'travel' | 'meal' | 'office' | 'transport' | 'other';
export type ReimbursementStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
export type UserRole = 'admin' | 'employee' | 'approver' | 'guest';

export type ReimbursementAttachmentItem = {
  id: number;
  fileId: string;
  originalFileName: string;
  fileSize: number;
  contentType: string;
  fileUrl: string;
  createTime?: string;
};

export type ReimbursementListItem = {
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
};

export type ReimbursementDetail = ReimbursementListItem & {
  description: string;
  payeeName: string;
  payeeAccount: string;
  rejectReason: string;
  approvedByUserId?: number | null;
  approvedByUsername?: string | null;
  approvedTime?: string | null;
  attachments: ReimbursementAttachmentItem[];
  createTime?: string;
};

export type CurrentUserResponse = {
  userId: number;
  username: string;
  role: UserRole;
};

type ApiEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
};

export function getCurrentUser() {
  return request.get<ApiEnvelope<CurrentUserResponse>>('/me').then((res) => res.data);
}

export function getReimbursements(status?: ReimbursementStatus) {
  return request
    .get<ApiEnvelope<ReimbursementListItem[]>>('/reimbursements', {
      params: status ? { status } : undefined,
    })
    .then((res) => res.data);
}

export function getReimbursementDetail(id: number) {
  return request.get<ApiEnvelope<ReimbursementDetail>>(`/reimbursements/${id}`).then((res) => res.data);
}

export function createReimbursement(payload: {
  title: string;
  category: ReimbursementCategory;
  amount: number;
  expenseDate: string;
  description?: string;
  payeeName?: string;
  payeeAccount?: string;
}) {
  return request
    .post<ApiEnvelope<ReimbursementDetail>, typeof payload>('/reimbursements', payload)
    .then((res) => res.data);
}

export function updateReimbursement(
  id: number,
  payload: Partial<{
    title: string;
    category: ReimbursementCategory;
    amount: number;
    expenseDate: string;
    description: string;
    payeeName: string;
    payeeAccount: string;
  }>,
) {
  return request
    .put<ApiEnvelope<ReimbursementDetail>, typeof payload>(`/reimbursements/${id}`, payload)
    .then((res) => res.data);
}

export function submitReimbursement(id: number) {
  return request.post<ApiEnvelope<ReimbursementDetail>>(`/reimbursements/${id}/submit`).then((res) => res.data);
}

export function approveReimbursement(id: number) {
  return request.post<ApiEnvelope<ReimbursementDetail>>(`/reimbursements/${id}/approve`).then((res) => res.data);
}

export function rejectReimbursement(id: number, rejectReason: string) {
  return request
    .post<ApiEnvelope<ReimbursementDetail>, { rejectReason: string }>(`/reimbursements/${id}/reject`, {
      rejectReason,
    })
    .then((res) => res.data);
}

export function markReimbursementPaid(id: number) {
  return request
    .post<ApiEnvelope<ReimbursementDetail>>(`/reimbursements/${id}/mark-paid`)
    .then((res) => res.data);
}

export async function uploadReimbursementAttachment(id: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request.post<ApiEnvelope<ReimbursementDetail>, FormData>(
    `/reimbursements/${id}/attachments`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
}

export function deleteReimbursementAttachment(id: number, attachmentId: number) {
  return request
    .delete<ApiEnvelope<ReimbursementDetail>>(`/reimbursements/${id}/attachments/${attachmentId}`)
    .then((res) => res.data);
}
