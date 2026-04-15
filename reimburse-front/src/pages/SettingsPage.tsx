import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getAgentMe, updateAgentBindings, type AgentMeResponse } from '@/api/modules/agent';
import { getKnowledgeBases, type KnowledgeBaseItem } from '@/api/modules/knowledge';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Spinner,
} from '@/components/ui';

export function SettingsPage() {
  const [agentInfo, setAgentInfo] = useState<AgentMeResponse | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        setLoading(true);
        const [agentResponse, knowledgeResponse] = await Promise.all([
          getAgentMe(),
          getKnowledgeBases(),
        ]);
        if (!active) {
          return;
        }

        setAgentInfo(agentResponse);
        setKnowledgeBases(knowledgeResponse);
        setSelectedIds(agentResponse.bindings.map((item) => item.knowledgeBaseId));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载设置失败');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  const toggleKnowledgeBase = (knowledgeBaseId: number) => {
    setSelectedIds((current) =>
      current.includes(knowledgeBaseId)
        ? current.filter((item) => item !== knowledgeBaseId)
        : [...current, knowledgeBaseId],
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const bindings = await updateAgentBindings(selectedIds);
      setAgentInfo((current) => (current ? { ...current, bindings } : current));
      toast.success('设置已更新');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="flex min-h-[calc(100svh-3.75rem)] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          正在加载设置
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 p-4 md:grid-cols-[22rem_minmax(0,1fr)] md:p-6">
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>模型默认值</CardTitle>
          <CardDescription>这里维护当前工作台默认使用的模型参数。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <div className="text-sm font-medium">{agentInfo?.agent.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {agentInfo?.agent.description || '暂无描述'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{agentInfo?.agent.defaultProvider}</Badge>
            <Badge variant="outline">{agentInfo?.agent.defaultModel}</Badge>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/40 px-3 py-3 text-sm leading-6 text-muted-foreground">
            {agentInfo?.agent.systemPrompt}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>默认资料范围</CardTitle>
          <CardDescription>勾选后，聊天页会默认带上这些资料库。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {knowledgeBases.map((item) => (
            <label key={item.id} className="flex items-start gap-3 rounded-xl border border-border/80 px-4 py-3">
              <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleKnowledgeBase(item.id)} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{item.name}</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  {item.description || '暂无描述'}
                </div>
              </div>
            </label>
          ))}

          {knowledgeBases.length === 0 ? (
            <Empty className="border border-dashed border-border/80 bg-background/40">
              <EmptyHeader>
                <EmptyTitle>暂无知识库</EmptyTitle>
                <EmptyDescription>先去知识库页面创建资料，再回来选择默认范围。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner className="size-4" /> : null}
            保存设置
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
