import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceiptTextIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  getReimbursements,
  type ReimbursementListItem,
  type ReimbursementStatus,
} from '@/api/modules/reimbursement';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@/components/ui';

const statusOptions: Array<{ value: 'all' | ReimbursementStatus; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'submitted', label: '待审批' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'paid', label: '已付款' },
];

function statusLabel(status: ReimbursementStatus) {
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

export function ReimbursementListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReimbursementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'all' | ReimbursementStatus>('all');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await getReimbursements(status === 'all' ? undefined : status);
        if (active) {
          setItems(response);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载报销单失败');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <section className="grid gap-4 p-4 md:p-6">
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-border/70 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>报销管理</CardTitle>
            <CardDescription>查看我的报销单，提交审批或处理待办。</CardDescription>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <Select value={status} onValueChange={(value) => setStatus(value as 'all' | ReimbursementStatus)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="筛选状态" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={() => navigate('/reimbursements/new')}>
              <PlusIcon className="size-4" />
              新建报销
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              正在加载报销单
            </div>
          ) : null}

          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/reimbursements/${item.id}`)}
              className="w-full rounded-2xl border border-border/80 bg-background/40 px-4 py-4 text-left transition hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <ReceiptTextIcon className="size-4" />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {item.category} · {item.expenseDate}
                  </div>
                </div>
                <Badge variant={item.status === 'rejected' ? 'destructive' : item.status === 'approved' ? 'default' : 'outline'}>
                  {statusLabel(item.status)}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>申请人 {item.applicantUsername}</span>
                <span>金额 ¥{item.amount.toFixed(2)}</span>
                <span>更新于 {item.updateTime ? new Date(item.updateTime).toLocaleString('zh-CN') : '刚刚'}</span>
              </div>
            </button>
          ))}

          {!loading && items.length === 0 ? (
            <Empty className="border border-dashed border-border/80 bg-background/40">
              <EmptyHeader>
                <EmptyTitle>暂无报销单</EmptyTitle>
                <EmptyDescription>先创建一张报销单，再上传附件并提交审批。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
