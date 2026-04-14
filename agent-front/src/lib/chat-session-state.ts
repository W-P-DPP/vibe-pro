import type { ChatSessionItem } from '@/api/modules/chat';

export function upsertSessionSummary(
  sessions: ChatSessionItem[],
  nextSession: ChatSessionItem,
) {
  return [nextSession, ...sessions.filter((item) => item.id !== nextSession.id)];
}
