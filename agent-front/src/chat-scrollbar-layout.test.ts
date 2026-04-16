/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcDir = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath: string) {
  return readFileSync(resolve(srcDir, relativePath), 'utf8');
}

function readSharedUiSource(relativePath: string) {
  return readFileSync(resolve(srcDir, '../../packages/shared-ui/src/components/ui', relativePath), 'utf8');
}

describe('chat scroll containment', () => {
  it('keeps the message list and long message bubbles inside bounded scroll areas', () => {
    const source = readSource('./pages/ChatPage.tsx');

    expect(source).toContain(
      'md:h-[calc(100svh-3.75rem)] md:min-h-0 md:grid-cols-[minmax(0,1fr)_18rem]',
    );
    expect(source).toContain('<ScrollArea className="min-h-0 flex-1">');
    expect(source).toContain('className="flex w-full flex-col gap-6 px-3 py-6 sm:px-4"');
    expect(source).toContain('rows={2}');
    expect(source).toContain('className="min-h-14 max-h-32 resize-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0"');
  });

  it('uses the same bounded scroll container for the sidebar session list', () => {
    const source = readSource('./components/AppLayout.tsx');

    expect(source).toContain('<ScrollArea className="min-h-0 flex-1">');
    expect(source).toContain('<div className="space-y-2 pr-2">');
  });
});

describe('fixed model chat page mode', () => {
  it('does not load a runtime model catalog or render a model selector', () => {
    const source = readSource('./pages/ChatPage.tsx');

    expect(source).not.toContain('getAgentModels');
    expect(source).not.toContain('<Select');
    expect(source).toContain('buildFixedAgentChatStreamPayload');
    expect(source).toContain('FIXED_AGENT_MODEL.label');
  });
});

describe('scrollbar theme coverage', () => {
  it('defines shared scrollbar theme tokens and classes', () => {
    const source = readSource('./index.css');

    expect(source).toContain('--scrollbar-track');
    expect(source).toContain('--scrollbar-thumb-hover');
    expect(source).toContain('.scrollbar-theme');
    expect(source).toContain('.scrollbar-theme-compact');
  });

  it('applies the shared scrollbar theme to common list surfaces', () => {
    const commandSource = readSharedUiSource('command.tsx');
    const selectSource = readSharedUiSource('select.tsx');
    const comboboxSource = readSharedUiSource('combobox.tsx');
    const sidebarSource = readSharedUiSource('sidebar.tsx');

    expect(commandSource).toContain('scrollbar-theme scrollbar-theme-compact');
    expect(selectSource).toContain('scrollbar-theme scrollbar-theme-compact');
    expect(comboboxSource).toContain('scrollbar-theme scrollbar-theme-compact');
    expect(sidebarSource).toContain('scrollbar-theme scrollbar-theme-compact');
  });
});
