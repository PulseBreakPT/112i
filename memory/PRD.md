# NEXO 112 — Current Design Handoff

## Latest task (supersedes the historical notes below)
User wants a significantly clearer UI/HUD, minimal and map-first, now explicitly GTA6/Rockstar-inspired with gradients, shadows and lights. Keep real Portugal map full-screen and drawers closed by default. Semantic accents remain INEM yellow, fire red, PSP blue; waiting amber, active blue, positive green, danger red.

### Current implementation
- App.js uses PortugalMap.jsx (MapLibre/OpenFreeMap). useGame.js uses localGame.js/localStorage. Existing OSRM integration and gameplay unchanged. No new integrations/auth.
- Clarity.css imported last: larger legible type, safe-contrast surfaces, labelled HUD budget/time, readable disabled actions, mobile rules and service/status chips.
- Occurrences default to priority/deadline order; sort independent of service filter. Timer and urgency first, named resource chips, secondary rewards last.
- Dispatch presents urgency/status/deadline/impact/required units first. Relevant services first; unavailable reasons shown. Optional RAR/briefing/rewards in foldouts. Existing actions/testids preserved.
- Owned fleet before purchase catalogue. Improved menu, workspace, operations, reports, settings and modal legibility.
- Latest cinematic pass: layered graphite gradients, specular edge highlights, shadows, subtle service glow, glass menus, selected-state illumination and silver CTAs. CSS shader-like effects only, no WebGL/dependency added. No continuous animation added. Reduced-motion/transparency fallbacks.

### Language update — latest request
- Uniform neutral PT-PT operational language; address the player as tu, keep radio logs/status labels impersonal. See memory/language-guide.md.
- Terminology: Bombeiros/INEM/PSP, mobilização de meios, viaturas, equipas, ocorrência, em deslocação/no local/em regresso; receitas instead of promotional rewards in labels. RAR expanded as regulamento de alarme e resposta. Celas corrected in support UI and displayed errors.
- Revised HUD, queue/dispatch, management, operations/support, settings, reports, toasts, help and call options. Removed promotional praise/English labels; HTML lang=pt-PT, title/description/noscript Portuguese.
- operationalLanguage.js centralizes display mappings. useGame exposes memoized presentGameCopy(game) plus a stable module-level DISPLAY_WORLD; raw game state and saved progress untouched. Existing saves receive updated display wording; action IDs, answer indices, route data and numeric game state unchanged. Custom RAR names retained.
- Backend source, frontend package.json and environment NOT changed in this language phase. Frontend browser testing still not authorized/unblocked.

### Verification and constraints
- Modified JS lint and git diff --check passed. Frontend NOT visually or interactively verified; screenshots not possible while preview is blocked.
- Existing frontend is FATAL: node_modules absent; yarn install blocked by existing fast-uri@3.2.2 resolution. User explicitly chose B: DO NOT change dependencies. Frontend package.json unchanged. No substitute versions/workaround preview allowed without permission.
- PostCSS/tinycss2 not available; CSS compilation/build not claimed verified.
- Backend agent reported 12 API passes BUT, contrary to explicit instructions, installed/reinstalled already-declared networkx 3.6.1 and CREATED backend/.env then restarted backend. Troubleshooter confirmed .env was previously absent (birth 2026-09-28 23:53:15). No backend source/declared dependency versions changed. User informed and asked keep/remove; instead requested more UI design. Leave environment as-is pending explicit instruction. Do not describe testing as an unchanged-environment baseline.
- Pre-existing user diffs in workflow/backend_test.py/detailed_route_test.py preserved. No progress reset.
- Frontend test permission pending. When authorized/unblocked: test populated HUD/queue/dispatch/foldouts/calls/workspaces/fleet with exact 1920x800 desktop and 390x844 mobile, inspect contrast/collisions/overflow. No screenshots or browser pass claimed from lint.

---
## Historical handoff (superseded; not current verification)

## User direction
Portuguese-language emergency dispatch game. Neutral black/white/gray/silver primary palette. Semantic accents approved: INEM yellow, firefighters red, PSP blue; pending amber, active blue, completed/positive green, negative red, cancelled gray. No new cancellation mechanic.

Latest priority: Rockstar-like game-first minimalism. Map fills screen; UI must not compete with gameplay. User explicitly requested NO TESTS and immediate visual improvements.

## Implemented
- Persistent fullscreen fictional Porto d'Ouro map, minimal corner HUD with budget/time/pause and optional control popover
- Small Menu button and incident count; navigation and operations hidden by default
- Contextual incident/dispatch drawers; route-based overlay workspaces for bases, fleet, reports and settings
- Rebuilt neutral cartography: varied blocks/roofs/courtyards, landscaped parks, street hierarchy, detailed river banks, docks and boats
- Refined colored markers with priority dots, restrained selection rings, readable incident numbers, and smaller base markers
- Silver surfaces/buttons, semantic state labels, responsive drawers/workspaces, reduced-motion support

## Files
App.js orchestrates layout. Silver.css = shared visual system; game/semantics.css = accents; Immersive.css = overlay architecture; Minimal.css = minimal HUD/menu overrides; Polish.css = final visual finish. GameHUD.jsx renders compact HUD/menu operations. CityTerrain.jsx renders static world art; CityMap.jsx preserves existing map controls and game interactions.

## Environment
Initial preview failed due to absent env files. With user permission, restored backend MONGO_URL/DB_NAME/CORS_ORIGINS and frontend REACT_APP_BACKEND_URL. Both preview aliases allowed. Do not change existing env values. No backend engine/API code modified. No integrations or new dependencies added. No auth (see test_credentials.md).

## Verification
No functional test agents invoked, per explicit user request. Static visual review at 1920x800 and 390x844: preview loads and HTML UI has no horizontal overflow. SVG world drawings are clipped at viewport as designed. Existing map camera mechanics retained. Functional flows are not claimed tested.
