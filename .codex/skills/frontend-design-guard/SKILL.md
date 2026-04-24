---
name: frontend-design-guard
description: Enforce this repository's frontend engineering and design workflow. Use for React, Vite, Tailwind, shadcn, page work, component work, styling, interaction changes, frontend refactors, API integration, auth redirects, shared types/contracts, and frontend quality review in super-pro frontend packages. Before frontend analysis, planning, or code changes, read frontend-template/design.md first, then the bundled shadcn theme reference. Default user-facing copy to Simplified Chinese unless explicitly overridden.
---

# Frontend Design Guard

## Overview

Use this skill for frontend work in this repository, especially React/Vite frontend packages such as `frontend-template`, `agent-front`, `reimburse-front`, `summary-front`, and `login-template`.

`frontend-template/design.md` is the primary design constraint document and must be read before any frontend implementation starts. After that, load the bundled shadcn theme reference and treat it as the default theme source for design and styling work unless the user explicitly requests a different theme.

Frontend code should align with backend contracts and shared packages. API calls belong in `src/api/modules/*`, reusable browser infrastructure belongs in `packages/shared-web`, cross-app types belong in `packages/shared-types` or future contracts packages, and app pages should not directly call `fetch` or `axios`.

## Required Workflow

1. Confirm that the task is frontend work in this repository, including page work, component work, styling, interaction changes, or UI refactors.
2. Read `frontend-template/design.md` before further analysis, planning, code generation, styling, or component edits.
3. Read `references/shadcn-theme.css` immediately after `design.md` and treat it as the preferred theme source.
4. Unless the user explicitly requests another language, generate user-facing frontend content in Simplified Chinese, including page copy, labels, placeholders, helper text, status text, empty states, and validation messages.
5. Default to a restrained, minimal UI direction unless the user explicitly asks for a stronger visual treatment. Prefer fewer layers, fewer decorative badges, and clearer information hierarchy over visual flourish.
6. Summarize the design constraints and theme constraints that matter for the current task before implementation.
7. Inspect the target app's API layer, auth/session utilities, shared package usage, and existing page/component patterns before changing code.
8. Implement the task while keeping the output aligned with `design.md`, the bundled theme, and the repository's API/session conventions.
9. Re-check the result against `design.md`, the bundled theme, API contract expectations, and auth behavior before finishing.

## Hard Rules

- Do not skip reading `frontend-template/design.md`.
- Do not start frontend implementation before reading `design.md`.
- Do not skip reading `references/shadcn-theme.css` for frontend design work in `frontend-template`.
- Do not introduce a separate visual language that conflicts with `design.md`.
- Do not ignore the bundled theme unless the user explicitly asks for a different theme direction.
- Do not turn existing `shadcn` components into a different UI style.
- Do not over-design simple interactions. For straightforward utility UI such as search, filters, popovers, and small forms, prefer minimal structure and avoid decorative layers unless the user explicitly asks for them.
- Do not validate only one theme for UI changes. Check both light and dark themes.
- Do not default to English for generated frontend copy unless the user explicitly asks for English or another language.
- Do not call `fetch` or raw `axios` directly from pages or visual components when an API module should own the request.
- Do not duplicate browser infrastructure that belongs in `packages/shared-web`.
- Do not invent response shapes that conflict with backend envelopes such as `code`, `msg`, `data`, `timestamp`.
- Do not ignore `401` or `403`; protected frontend requests must route users back to login with a redirect target.

## Execution Details

### Step 1: Read the design spec

Read this file first:

- `frontend-template/design.md`

Read this file second:

- `references/shadcn-theme.css`

If the task is directly related to theming, styling, component variants, or layout primitives, then read these after `design.md` and `references/shadcn-theme.css`:

- `frontend-template/src/index.css`
- `frontend-template/components.json`

The order is mandatory: `design.md` first, `references/shadcn-theme.css` second, then any other frontend context files. This order applies even when the implementation target is another frontend package such as `login-template`.

If the task touches API integration, auth, navigation, protected routes, request utilities, or backend-facing data, also inspect the relevant files before implementation:

- `src/api/request.ts`
- `src/api/modules/*`
- `src/lib/auth-session.ts`
- `src/lib/login-redirect.ts`
- shared types from `packages/shared-types`
- browser utilities from `packages/shared-web`

### Step 2: Summarize relevant constraints

Before writing code, summarize the constraints relevant to the task, such as:

- required visual tone
- required theme tokens, font choices, radius, and shadow style from `references/shadcn-theme.css`
- light and dark theme consistency
- reuse of the existing `shadcn` system
- use of the existing token, spacing, radius, and interaction systems
- whether the task should be visually restrained and simplified to the minimum useful hierarchy
- default Simplified Chinese copy unless the user explicitly overrides the language
- data ownership: page, feature component, hook, API module, or shared package
- whether the request follows backend response envelopes and auth redirect rules
- whether shared types or shared web utilities should be reused instead of local copies

If the task conflicts with `design.md`, state the conflict and ask the user to confirm direction before continuing. If the bundled theme conflicts with an explicit user instruction, follow the user instruction.

### Step 3: Implement

During implementation:

- reuse existing components and styles first
- prefer the current `shadcn` component system
- prefer the bundled shadcn theme file as the baseline theme source
- keep token usage consistent
- avoid creating a parallel design system
- when the user asks for simplicity, actively remove non-essential badges, helper blocks, nested containers, and ornamental emphasis instead of only restyling them
- preserve the interaction and state patterns defined by the project
- when a frontend request is protected by authentication, make the request path explicit and redirect to the login page with a `redirect` target when auth returns `401` or `403`
- default generated user-facing content to Simplified Chinese unless the user explicitly requests another language
- put backend-facing requests in `src/api/modules/*`
- keep pages focused on composition, routing state, loading/error/empty states, and user intent
- use shared response/session utilities from `packages/shared-web` when available
- use shared DTO/type definitions from `packages/shared-types` or contracts packages when available
- preserve backend response envelope handling: `code`, `msg`, `data`, `timestamp`
- handle loading, empty, error, and auth-expired states explicitly
- do not log sensitive tokens, passwords, cookies, authorization headers, or raw large API payloads in frontend code

### Step 4: Validate

Before finishing, check at least:

- whether the result matches `design.md`
- whether the result uses or remains compatible with the bundled shadcn theme
- whether light and dark themes still express the same visual language
- whether the work still fits the existing component system
- whether there are stray color, radius, shadow, or spacing values that bypass project tokens
- whether simple utility UI has been kept intentionally minimal instead of being over-structured
- whether generated user-facing content stayed in Simplified Chinese unless the user explicitly requested another language
- whether protected requests that fail auth now redirect to login with the correct redirect target
- whether API calls are centralized in API modules instead of pages/components
- whether response envelope parsing and error messages stay compatible with backend contracts
- whether shared package utilities were reused instead of copied
- whether loading, empty, error, and auth-expired states are visible and testable

For API or auth changes, run focused tests if available. Prefer commands such as:

```bash
pnpm --filter @super-pro/shared-web test
pnpm --filter @super-pro/<target-front> build
pnpm --filter @super-pro/<target-front> test
```

Use the actual package name in place of `<target-front>`.

## Missing or conflicting design rules

- If `frontend-template/design.md` is missing, stop implementation and ask the user to provide or confirm the design rules.
- If `references/shadcn-theme.css` is missing, stop implementation and restore or recreate the bundled theme reference before continuing.
- If new user instructions conflict with `design.md`, identify the conflict first and continue only after confirmation.
- If the task is not frontend work, do not use this skill.
