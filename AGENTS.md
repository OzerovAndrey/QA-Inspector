# QA Inspector

Read README.md and docs/PROJECT_CONTEXT.md before changing the project.

- Standalone local Chrome Manifest V3 extension. Keep the UI Ukrainian and simple.
- Preserve three independent modes: Component, Page, Site, with separate results.
- Any supported site can be inspected without JSON. Extraction is not a compliance verdict: never label extracted values Pass/Fail without a reference.
- Imported Tokens Studio/DTCG JSON or ZIP enables optional comparison. Distinguish token membership from explicit component rules.
- Keep the product neutral. Atlas is an optional example and fixture, never a default dependency.
- No backend, paid API, Figma integration or remote report uploads.
- Do not modify other projects. Keep generated scan reports, secrets and browser profiles out of Git.
- Run npm test. For UI or browser integration changes also run applicable browser tests. Installation in Chrome needs only extension/, without a build.
- Use a temporary browser profile for automated extension tests. Never use the user's personal Chrome profile.
- Clearly state checks performed and limitations. iPhone is for directing development; actual extension validation happens in desktop Chrome.
