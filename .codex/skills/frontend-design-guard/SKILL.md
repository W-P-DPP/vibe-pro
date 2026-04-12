---
name: frontend-design-guard
description: Enforce this repository's frontend design workflow. Use for React, Vite, Tailwind, shadcn, page work, component work, styling changes, interaction changes, refactors, and frontend feature implementation in this repository's frontend packages, especially frontend-template and login-template. Before any frontend analysis, planning, or code changes, always read frontend-template/design.md first, then read the bundled shadcn theme reference and prefer that theme unless the user explicitly overrides it. Unless the user explicitly requests another language, generated frontend content should default to Simplified Chinese.
---

# Frontend Design Guard

## Overview

Use this skill for frontend work in this repository, especially `frontend-template` and `login-template`. `frontend-template/design.md` is the primary design constraint document and must be read before any frontend implementation starts. After that, load the bundled shadcn theme reference and treat it as the default theme source for design and styling work unless the user explicitly requests a different theme.

## Required Workflow

1. Confirm that the task is frontend work in this repository, including page work, component work, styling, interaction changes, or UI refactors.
2. Read `frontend-template/design.md` before further analysis, planning, code generation, styling, or component edits.
3. Read `references/shadcn-theme.css` immediately after `design.md` and treat it as the preferred theme source.
4. Unless the user explicitly requests another language, generate user-facing frontend content in Simplified Chinese, including page copy, labels, placeholders, helper text, status text, empty states, and validation messages.
5. Default to a restrained, minimal UI direction unless the user explicitly asks for a stronger visual treatment. Prefer fewer layers, fewer decorative badges, and clearer information hierarchy over visual flourish.
6. Summarize the design constraints and theme constraints that matter for the current task before implementation.
7. Implement the task while keeping the output aligned with `design.md` and the bundled theme.
8. Re-check the result against `design.md` and the bundled theme before finishing.

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

### Step 2: Summarize relevant constraints

Before writing code, summarize the constraints relevant to the task, such as:

- required visual tone
- required theme tokens, font choices, radius, and shadow style from `references/shadcn-theme.css`
- light and dark theme consistency
- reuse of the existing `shadcn` system
- use of the existing token, spacing, radius, and interaction systems
- whether the task should be visually restrained and simplified to the minimum useful hierarchy
- default Simplified Chinese copy unless the user explicitly overrides the language

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

## Missing or conflicting design rules

- If `frontend-template/design.md` is missing, stop implementation and ask the user to provide or confirm the design rules.
- If `references/shadcn-theme.css` is missing, stop implementation and restore or recreate the bundled theme reference before continuing.
- If new user instructions conflict with `design.md`, identify the conflict first and continue only after confirmation.
- If the task is not frontend work, do not use this skill.
