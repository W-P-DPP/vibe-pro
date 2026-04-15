import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UploadIcon, SendIcon, CheckIcon, CircleXIcon, WalletCardsIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import {
  approveReimbursement,
  deleteReimbursementAttachment,
  getReimbursementDetail,
  markReimbursementPaid,
  rejectReimbursement,
  submitReimbursement,
  uploadReimbursementAttachment,
  type ReimbursementDetail,
} from '@/api/modules/reimbursement';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
  Textarea,
} from '@/components/ui';

function statusLabel(status: ReimbursementDetail['status']) {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'submitted':
      return '待审批';
    case 'approved':
      return '已通过';
    case 'rejected':
      return '已驳回';
    case 'paid':
      return '已付款';
    default:
      return status;
  }
}

export function ReimbursementDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const reimbursementId = Number(params.id);
  const [detail, setDetail] = useState<ReimbursementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await getReimbursementDetail(reimbursementId);
        if (active) {
          setDetail(response);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载报销单详情失败');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (Number.isInteger(reimbursementId) && reimbursementId > 0) {
      void load();
    }

    return () => {
      active = false;
    };
  }, [reimbursementId]);

  const createdAt = useMemo(() => {
    if (!detail?.createTime) {
      return '未知';
    }

    return new Date(detail.createTime).toLocaleString('zh-CN');
  }, [detail?.createTime]);

  const handleAction = async (action: () => Promise<ReimbursementDetail>, successMessage: string) => {
    try {
      setSubmitting(true);
      const response = await action();
      setDetail(response);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : successMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (file?: File | null) => {
    if (!file || !detail) {
      return;
    }

    await handleAction(() => uploadReimbursementAttachment(detail.id, file), '附件上传成功');
  };

  if (loading) {
    return (
      <section className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        正在加载报销单详情
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="p-6 text-sm text-muted-foreground">未找到报销单，请返回列表重试。</section>
    );
  }

  return (
    <section className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_22rem] md:p-6">
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{detail.title}</CardTitle>
              <CardDescription>
                {detail.category} · {detail.expenseDate} · 创建于 {createdAt}
              </CardDescription>
            </div>
            <Badge>{statusLabel(detail.status)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="text-sm text-muted-foreground">申请人</div>
              <div className="mt-1 text-base font-semibold">{detail.applicantUsername}</div>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="text-sm text-muted-foreground">报销金额</div>
              <div className="mt-1 text-base font-semibold">¥{detail.amount.toFixed(2)}</div>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="text-sm text-muted-foreground">收款人</div>
              <div className="mt-1 text-base font-semibold">{detail.payeeName || '未填写'}</div>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="text-sm text-muted-foreground">收款账号</div>
              <div className="mt-1 break-all text-base font-semibold">{detail.payeeAccount || '未填写'}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 p-4">
            <div className="text-sm text-muted-foreground">报销说明</div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6">{detail.description || '暂无说明'}</div>
          </div>

          {detail.rejectReason ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              驳回原因：{detail.rejectReason}
            </div>
          ) : null}

          <div className="space-y-3 rounded-2xl border border-border/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">附件</div>
                <div className="text-xs text-muted-foreground">草稿和驳回状态可继续上传或删除附件。</div>
              </div>
              {detail.canEdit ? (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40">
                  <UploadIcon className="size-4" />
                  上传附件
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      void handleUpload(file);
                      event.target.value = '';
                    }}
                  />
                </label>
              ) : null}
            </div>

            {detail.attachments.length === 0 ? (
              <div className="text-sm text-muted-foreground">暂无附件</div>
            ) : (
              <div className="space-y-2">
                {detail.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-3">
                    <div className="min-w-0">
                      <a className="truncate text-sm font-medium text-primary hover:underline" href={attachment.fileUrl} target="_blank" rel="noreferrer">
                        {attachment.originalFileName}
                      </a>
                      <div className="text-xs text-muted-foreground">{attachment.contentType || '未知类型'} · {(attachment.fileSize / 1024).toFixed(1)} KB</div>
                    </div>
                    {detail.canEdit ? (
                      <Button type="button" size="icon" variant="ghost" onClick={() => void handleAction(() => deleteReimbursementAttachment(detail.id, attachment.id), '附件删除成功')} disabled={submitting}>
                        <Trash2Icon className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>操作</CardTitle>
          <CardDescription>根据当前状态执行提交、审批或付款。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {detail.canEdit ? (
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate(`/reimbursements/${detail.id}/edit`)} disabled={submitting}>
              编辑报销单
            </Button>
          ) : null}

          {detail.canSubmit ? (
            <Button type="button" className="w-full" onClick={() => void handleAction(() => submitReimbursement(detail.id), '报销单提交成功')} disabled={submitting}>
              <SendIcon className="size-4" />
              提交审批
            </Button>
          ) : null}

          {detail.canApprove ? (
            <Button type="button" className="w-full" onClick={() => void handleAction(() => approveReimbursement(detail.id), '审批通过成功')} disabled={submitting}>
              <CheckIcon className="size-4" />
              审批通过
            </Button>
          ) : null}

          {detail.canReject ? (
            <div className="space-y-2">
              <Textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="填写驳回原因" className="min-h-24" />
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => void handleAction(() => rejectReimbursement(detail.id, rejectReason.trim()), '报销单已驳回')}
                disabled={submitting || !rejectReason.trim()}
              >
                <CircleXIcon className="size-4" />
                驳回报销单
              </Button>
            </div>
          ) : null}

          {detail.canMarkPaid ? (
            <Button type="button" variant="secondary" className="w-full" onClick={() => void handleAction(() => markReimbursementPaid(detail.id), '已标记为付款完成')} disabled={submitting}>
              <WalletCardsIcon className="size-4" />
              标记已付款
            </Button>
          ) : null}

          {submitting ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              正在处理操作
            </div>
          ) : null}

          <div className="rounded-2xl border border-border/70 p-3 text-xs leading-6 text-muted-foreground">
            已通过：{detail.approvedByUsername || '暂无'}
            <br />
            审批时间：{detail.approvedTime ? new Date(detail.approvedTime).toLocaleString('zh-CN') : '暂无'}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
