# QA Inspector — locked UX requirements (Figma connection gating)

Confirmed by product owner on 2026-11-09. Treat these as product requirements in future UI/UX and implementation work.

## Two independent workflows

### 1. Basic inspection — always available, with no Figma token and no design reference
- **Inspect element / Перевірити елемент** launches the picker on the current website and shows the selected element's real computed properties (colors, typography, spacing, sizes, borders, etc.) and any detectable tokens.
- **Scan page / Сканувати сторінку** scans the current page and shows actual site properties/results.
- Neither action is blocked by Figma authorization, importing a layout, or failed/disconnected Figma state.
- Do not display or require the Figma reference-attachment wizard during these basic inspections.

### 2. Figma comparison — gated by Figma authorization
- The **top Figma connection control** is the *one and only* entry for entering/saving the Figma access token needed for Figma integration. Product wording requested by owner: **«Підключити Figma MCP»**. Implementation must accurately distinguish Figma REST API token authentication from a true MCP connection: do not claim an MCP protocol connection exists unless implemented.
- **Before a valid Figma token has been supplied, do not even show the subsequent layout/comparison steps** (not greyed-out, not a visible three-step wizard). In particular, do not show «1. Підключіть макет», «2. Оберіть елемент», «3. Перегляньте розбіжності», or the layout upload/link form.
- Once authorization succeeds, reveal the first layout step, **«Підключіть макет»**, *below the top connection control*. That step is for selecting/attaching a Figma frame/layout (Figma URL; supported reference import, as applicable), **never** for entering the access token again.
- Subsequent layout-selection/comparison stages should only appear when their prerequisites are satisfied; keep normal picker/page scanning separate.
- A saved token is not equivalent to a validated Figma connection. Handle errors and expired/revoked credentials explicitly.

## UI anti-patterns to avoid
- Do not duplicate the existing top-level actions «Перевірити елемент» and «Сканувати сторінку» with redundant «Компонент / Сторінка» navigation for the same action.
- Do not mix *Figma authorization* and *layout attachment* into one step.
- Do not show the token input inside the layout attachment section.
- Do not block reading basic DOM/CSS values simply because no Figma token/layout is available.

## Acceptance scenarios
1. Fresh install / no token: top Figma connection control visible; **no layout or comparison wizard**; picker and page scan work.
2. User clicks top Figma connection: credentials entry opens there, never in the layout wizard.
3. Valid Figma credentials: show the layout attachment stage. Do not ask for token there.
4. User attaches a layout: enable the relevant comparison flow and show results when available.
5. Token removed/expired: hide Figma-only stages and show actionable connection status; basic inspection still works.
6. Any inspection result: focus on inspection data rather than automatically opening the reference-loading wizard.

This file is a requirement record, not proof that the current extension implements all cases.
