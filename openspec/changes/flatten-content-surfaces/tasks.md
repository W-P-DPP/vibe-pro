## 1. Flatten the layout shell

- [x] 1.1 Update `frontend-template/src/components/AppLayout.tsx` so the main content shell no longer frames the page as a rounded or elevated surface.
- [x] 1.2 Update `frontend-template/src/pages/HomePage.tsx` so the homepage root content area removes decorative outer margins and aligns directly with the available content region.

## 2. Remove rounded and elevated content surfaces

- [x] 2.1 Update homepage section containers in `frontend-template/src/pages/HomePage.tsx` to remove rounded corners and all shadow styles.
- [x] 2.2 Update homepage entry items in `frontend-template/src/pages/HomePage.tsx` to remove rounded corners and hover elevation while preserving focus and hover feedback.

## 3. Align tokens and validate themes

- [x] 3.1 Update `frontend-template/src/index.css` or page-level utility usage so homepage content surfaces do not inherit radius or shadow styling that conflicts with the flat layout.
- [ ] 3.2 Validate the homepage in light and dark themes to confirm scanability still comes from borders, spacing, and headings rather than card decoration.
- [x] 3.3 Run `pnpm --filter @super-pro/frontend build` and verify the flattened homepage compiles cleanly.
