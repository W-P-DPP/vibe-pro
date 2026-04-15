import { Link } from 'react-router-dom';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle, Button } from '@/components/ui';

export function NotFoundPage() {
  return (
    <section className="flex min-h-[calc(100svh-3.75rem)] items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Empty className="border border-dashed border-border/80 bg-background/40">
          <EmptyHeader>
            <EmptyTitle>页面不存在</EmptyTitle>
            <EmptyDescription>
              当前路由未接入页面，请返回对话页或知识库页继续操作。
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-3">
            <Button asChild>
              <Link to="/chat">返回对话页</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/knowledge">前往知识库</Link>
            </Button>
          </div>
        </Empty>
      </div>
    </section>
  );
}
