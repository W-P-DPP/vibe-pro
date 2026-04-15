import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  createKnowledgeBase,
  getKnowledgeBases,
  type KnowledgeBaseItem,
} from '@/api/modules/knowledge';
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
  Input,
  Spinner,
  Textarea,
} from '@/components/ui';

export function KnowledgePage() {
  const navigate = useNavigate();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadKnowledgeBases() {
      try {
        setLoading(true);
        const response = await getKnowledgeBases();
        if (active) {
          setKnowledgeBases(response);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载知识库失败');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadKnowledgeBases();

    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('请先输入知识库名称');
      return;
    }

    try {
      setSubmitting(true);
      const created = await createKnowledgeBase({
        name: name.trim(),
        description: description.trim(),
      });
      setKnowledgeBases((current) => [created, ...current]);
      setName('');
      setDescription('');
      toast.success('知识库创建成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建知识库失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="grid gap-4 p-4 md:grid-cols-[22rem_minmax(0,1fr)] md:p-6">
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>新建知识库</CardTitle>
          <CardDescription>当前支持 txt、jsonl、csv 三种格式。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：客户资料库"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="简要说明知识库用途"
            className="min-h-28"
          />
          <Button type="button" className="w-full" onClick={handleCreate} disabled={submitting}>
            {submitting ? <Spinner className="size-4" /> : <PlusIcon className="size-4" />}
            创建知识库
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>我的知识库</CardTitle>
          <CardDescription>点击卡片进入详情，上传资料并测试检索结果。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              正在加载知识库
            </div>
          ) : null}

          {knowledgeBases.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/knowledge/${item.id}`)}
              className="w-full rounded-2xl border border-border/80 bg-background/40 px-4 py-4 text-left transition hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{item.name}</div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description || '暂无描述'}
                  </div>
                </div>
                {item.boundToDefaultAgent ? <Badge>默认范围已包含</Badge> : <Badge variant="outline">未加入默认范围</Badge>}
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{item.documentCount} 个文档</span>
                <span>更新于 {item.updateTime ? new Date(item.updateTime).toLocaleDateString('zh-CN') : '刚刚'}</span>
              </div>
            </button>
          ))}

          {!loading && knowledgeBases.length === 0 ? (
            <Empty className="border border-dashed border-border/80 bg-background/40">
              <EmptyHeader>
                <EmptyTitle>暂无知识库</EmptyTitle>
                <EmptyDescription>先创建一个知识库，再上传结构化资料。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
