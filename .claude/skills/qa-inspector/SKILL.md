---
name: qa-inspector
 description: Project context and canonical repository for QA Inspector Chrome Extension.
---

# QA Inspector — project context

## Canonical repository
- GitHub: https://github.com/OzerovAndrey/QA-Inspector
- Owner/repo: `OzerovAndrey/QA-Inspector`
- Default branch: `main`
- This repository is the source of truth for QA Inspector code and project documentation.
- The owner works from both MacBook and iPhone. Keep work committed and pushed to GitHub so it is accessible without local MacBook files.

## Product scope
- QA Inspector: Chrome Extension (Manifest V3) for visual Design System compliance checks.
- Initial MVP: inspect a selected DOM element; read computed typography, colors, dimensions, padding and borders; compare with a local JSON reference with light/dark modes and tolerances; display Pass/Fail/Not comparable; copy a QA report.
- Later: Figma plugin, design tokens, spacing/layout comparison, page audit and visual regression.
- Initial version should work locally without a backend or paid APIs.

## Working conventions
- Check existing files and branches before changes; do not overwrite other work.
- Prefer small reviewable commits and explain how to test changes.
- Do not claim the extension is published or deployed without verification.
