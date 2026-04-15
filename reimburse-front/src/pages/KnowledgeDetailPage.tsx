import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SearchIcon, UploadIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  getKnowledgeBaseDetail,
  getKnowledgeDocuments,
  searchKnowledgeBase,
  uploadKnowledgeDocument,
  type KnowledgeBaseItem,
  type KnowledgeDocumentItem,
  type KnowledgeSearchItem,
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
  Separator,
  Spinner,
} from '@/components/ui';

export function KnowledgeDetailPage() {
  const { id } = useParams();
  const knowledgeBaseId = Number(id);
  const [detail, setDetail] = useState<KnowledgeBaseItem | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocumentItem[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      try {
        setLoading(true);
        const [detailResponse, documentsResponse] = await Promise.all([
          getKnowledgeBaseDetail(knowledgeBaseId),
          getKnowledgeDocuments(knowledgeBaseId),
        ]);
        if (!active) {
          return;
        }

        setDetail(detailResponse);
        setDocuments(documentsResponse);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载知识库详情失败');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (Number.isInteger(knowledgeBaseId) && knowledgeBaseId > 0) {
      void loadDetail();
    }

    return () => {
      active = false;
    };
  }, [knowledgeBaseId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      const uploaded = await uploadKnowledgeDocument(knowledgeBaseId, file);
      setDocuments((current) => [uploaded, ...current]);
      toast.success('文档上传成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '文档上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('请输入检索内容');
      return;
    }

    try {
      setSearching(true);
      const response = await searchKnowledgeBase(knowledgeBaseId, query.trim());
      setResults(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '检索失败');
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <section className="flex min-h-[calc(100svh-3.75rem)] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          正在加载知识库详情
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_22rem] md:p-6">
      <div className="space-y-4">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{detail?.name ?? '知识库'}</CardTitle>
                <CardDescription>{detail?.description || '暂无描述'}</CardDescription>
              </div>
              <Badge variant={detail?.boundToDefaultAgent ? 'default' : 'outline'}>
                {detail?.boundToDefaultAgent ? '默认资料范围已包含' : '默认资料范围未包含'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted/40">
              {uploading ? <Spinner className="size-4" /> : <UploadIcon className="size-4" />}
              上传 txt / jsonl / csv
              <input
                type="file"
                accept=".txt,.jsonl,.csv"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/70">
            <CardTitle>文档列表</CardTitle>
            <CardDescription>上传后会在服务端完成解析与切片。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {documents.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/80 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{item.originalFileName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.fileExt} · {item.fileSize} 字节 · {item.chunkCount} 个切片
                    </div>
                  </div>
                  <Badge variant={item.parseStatus === 'success' ? 'default' : 'outline'}>
                    {item.parseStatus}
                  </Badge>
                </div>
                {item.parseErrorMessage ? (
                  <div className="mt-2 text-xs text-destructive">{item.parseErrorMessage}</div>
                ) : null}
              </div>
            ))}
            {documents.length === 0 ? (
              <Empty className="border border-dashed border-border/80 bg-background/40">
                <EmptyHeader>
                  <EmptyTitle>还没有文档</EmptyTitle>
                  <EmptyDescription>上传你的第一份资料后，这里会展示解析结果。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>检索测试</CardTitle>
          <CardDescription>手动验证关键词检索是否能命中预期资料。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：华东区销售负责人是谁"
          />
          <Button type="button" className="w-full" onClick={handleSearch} disabled={searching}>
            {searching ? <Spinner className="size-4" /> : <SearchIcon className="size-4" />}
            开始检索
          </Button>
          <Separator />
          <div className="space-y-3">
            {results.map((item) => (
              <div key={item.chunkId} className="rounded-xl border border-border/80 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium">{item.documentName}</div>
                  <Badge variant="secondary">{item.score.toFixed(1)}</Badge>
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{item.snippet}</div>
              </div>
            ))}
            {results.length === 0 ? (
              <div className="text-sm text-muted-foreground">输入检索问题后，这里会展示命中的资料片段。</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
