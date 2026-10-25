# Atlas source snapshot

Read-only copy of selected source files from https://github.com/OzerovAndrey/atlas-finance.
Git tree: a967a2f3fd413ef04c8d3d61fb1bb5ca2ba41e7b (main at retrieval).
Retrieved 2026-10-23 through the connected GitHub integration.

Used for independently resolving expected token values and explicitly mapping CSS selectors. The upstream Atlas project was not modified. scripts/lib/tokens.mjs is the original Atlas token resolver; scripts/build-css.mjs documents its CSS serialization. Token sources remain unmodified. The QA Inspector mapping and package generator are in ../../scripts/build-atlas-system.mjs (relative to fixtures/atlas, use ../../.. from scripts).
