import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createReimbursement, type ReimbursementCategory } from '@/api/modules/reimbursement';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@/components/ui';

const categories: Array<{ value: ReimbursementCategory; label: string }> = [
  { value: 'travel', label: '差旅' },
  { value: 'meal', label: '餐饮' },
  { value: 'office', label: '办公' },
  { value: 'transport', label: '交通' },
  { value: 'other', label: '其他' },
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function ReimbursementFormPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ReimbursementCategory>('travel');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayString());
  const [description, setDescription] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [payeeAccount, setPayeeAccount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amountNumber = useMemo(() => Number(amount), [amount]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('请填写报销标题');
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      toast.error('请填写正确的报销金额');
      return;
    }
    if (!expenseDate) {
      toast.error('请选择报销日期');
      return;
    }

    try {
      setSubmitting(true);
      const created = await createReimbursement({
        title: title.trim(),
        category,
        amount: amountNumber,
        expenseDate,
        description: description.trim(),
        payeeName: payeeName.trim(),
        payeeAccount: payeeAccount.trim(),
      });
      toast.success('报销单创建成功');
      navigate(`/reimbursements/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建报销单失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="grid gap-4 p-4 md:p-6">
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>新建报销单</CardTitle>
          <CardDescription>填写基础信息后创建草稿，稍后可继续上传附件并提交审批。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">报销标题</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：上海出差交通与住宿" />
          </div>

          <div className="space-y-2">
            <Label>报销类型</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as ReimbursementCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="选择报销类型" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">报销金额</Label>
            <Input id="amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="例如：128.50" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expenseDate">报销日期</Label>
            <Input id="expenseDate" type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payeeName">收款人</Label>
            <Input id="payeeName" value={payeeName} onChange={(event) => setPayeeName(event.target.value)} placeholder="默认可填写申请人姓名" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="payeeAccount">收款账号</Label>
            <Input id="payeeAccount" value={payeeAccount} onChange={(event) => setPayeeAccount(event.target.value)} placeholder="银行卡号或其他收款账户" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">报销说明</Label>
            <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="补充说明用途、行程或报销原因" className="min-h-32" />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/reimbursements')} disabled={submitting}>
              取消
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Spinner className="size-4" /> : null}
              创建草稿
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
