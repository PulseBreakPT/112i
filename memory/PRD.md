# Distrito 112 — Current Design Handoff

## Latest task — unboxed white HUD, local blur menus (approved)
User explicitly confirmed removing ALL permanent HUD boxes/backgrounds/borders. Game-first, GTA6/Rockstar-inspired restraint: white information/icons with BLACK shadow; dark translucent blur ONLY on open menus. This supersedes earlier graphite HUD-card styling. Do not restore permanent glass islands.

### Delivery
- ONLY `frontend/src/Interface.css` changed in product code. Targeted permanent-HUD allowlist enforces no background/border/box-shadow/backdrop on brand, readout, pause/options buttons, launchers/count, map controls, incoming call and pause indicator, including hover/expanded states.
- White copy and leaf SVGs get shared black shadow tokens. No ancestor filter or opacity on the HUD, so its child options popover can blur the actual map. Hover/expanded feedback is a small underline; keyboard focus remains explicit. Counter no longer looks like a badge. Default secondary labels stay screen-reader accessible per existing Compact rules.
- Shared menu material is ~80% dark translucent with 24px blur: navigation, turn controls, map layers, tactical drawers, workspaces, portalled dialogs and toasts. Flat/translucent interior rows and minimal borders; removed reflected edge highlights. No full-screen blur; map remains sharp outside open menus.
- Mobile controls keep 44px invisible hit areas, 12px budget/time and 16px wordmark. Region popup offset accommodates taller controls; pause label offset leaves room for zoom controls. Attribution remains present and readable with white/shadow treatment.
- Readability fallback for unsupported backdrop-filter and reduced-transparency. Reduced-motion remains respected. No new dependencies, integrations, environment/URL changes, game logic, JSX, renderer, save/key or provider changes.

### Verification / limits
- App.js/server.py lint and whitespace diff check pass; read-only cascade review found no conflicts in the new HUD surface split. Not a build/CSS-parser/browser verification.
- Known preview blockers remain untouched: missing node_modules / unavailable fast-uri; backend missing networkx/env. No environment fix authorized. Browser screenshots/interaction testing NOT performed; request permission after backend scope check.
- When authorized and runnable, verify populated game over bright/dark map at 1920x800 and 390x844: no boxes even on hover/active, crisp black icon/text shadows, options/menu/layers blur locally, dialogs/tactical/workspaces consistent, keyboard focus/outside-click/ESC, 44px targets without overlap, long budget and brand fit. Do not create an alternative preview or install anything without permission.

## Previous task — complete rebrand to Distrito 112
User explicitly approved replacing all active brand references, including internal identity, API, docs and exports, with compatibility exceptions for existing saves/preferences. Earlier prohibition on dependency/environment fixes remains in force.

### Rebrand implementation
- `game/branding.js` centralizes BRAND_WORD, BRAND_NUMBER, APP_NAME and REPORT_FILENAME. HUD, loading screen and legacy header render Distrito 112 with real text spacing, matching accessible names; exported report is `distrito112-relatorio.json` (JSON data schema unchanged).
- HTML title/description/noscript, README, simulation roadmap, language guide, vehicle credits, test labels and workflow display name updated. No build configuration, links, package/lock or environment changes.
- Interface.css custom properties/classes/container names now use `distrito-`; App.js root matches. Wordmark typography adapts to the longer name (18px desktop HUD, 16px mobile; responsive loading size). No changes to material, page flow or services/semantic colors.
- Backend identity: FastAPI title `Distrito 112 · Central de Operações`, GET `/api/` name `Distrito 112`, router User-Agent `Distrito112-GeographicSimulation/1.0`. Request/response shapes, endpoints, DB selection and provider URLs unchanged.
- Transient map-state property renamed consistently. Only TWO old-brand strings remain in active source, both intentionally kept in `game/storageCompatibility.js`. App and localGame import these identical historical storage IDs for reads AND writes. No migration, reset, deletion or duplicate saves; player-authored names/data untouched.
- Historical testing log entries remain accurate; they are not active product branding.

### Rebrand verification
- Full source/public/backend reference inventory: old name only in the two intentional storage constants; no old-brand filenames. App.js and backend lint pass, modified branding consumers/modules have no lint findings.
- Read-only backend identity checks PASS (title, health return, User-Agent, test expectation); HTTP verification BLOCKED by existing missing networkx/.env. No repair, install, restart or mutation attempted.
- Wider frontend lint exposes PRE-EXISTING empty catches in PortugalMap/localGame, missing CarFront import in DispatchPanel (crash risk when rendering unit groups), and missing Jest lint globals. Confirmed against baseline; not fixed without permission.
- No browser/build verification or screenshots. Preview still blocked by unavailable frontend dependencies; frontend test permission pending. Once independently available and authorized, verify branding everywhere, report filename, existing-save/sound retention and wordmark overflow at 1920x800 / 390x844. Do NOT fix dependencies or create an alternate preview without explicit permission.

## Previous task — uniform menus and HUDs
User requested SSS-tier unification of all menus using the same background/material as the HUD, then explicitly confirmed: “Não corrigir a dependência, uniformiza e melhora os huds”. Dependencies and environment must remain untouched.

### Latest delivery
- Added `frontend/src/Interface.css`, imported LAST after VehicleMedia.css. App.js adds `distrito-interface` to the existing minimal shell; no handlers/routes/game logic changed.
- One graphite glass token for HUD islands, menu/turn controls, launchers, map controls, tactical drawers, workspace, portalled modals and toasts. Shared nested card/inset/header/button materials and consistent borders/radii/shadows.
- Neutralized divergent green/gold Comando/Estratégia, personnel, hospital specialties and RAR controls, plus blue support surfaces. No decorative radar sweeps/rotated diamonds in menus. Preserved meaningful service/status colors.
- Standardized headings, form fields (including PDI/command creation), focus, disabled/active states, secondary actions and silver primary actions. Kept compact map-first layout; container queries make grids respect actual workspace width, and mobile controls/forms adapt without touching map renderer or vehicle assets.
- No integrations, package/lock/environment/backend/gameplay/persistence changes. No authentication; memory/test_credentials.md records this explicitly.

### Current verification and blockers
- App.js lint and git diff whitespace check PASS. Read-only CSS cascade review found no actionable conflicts. This is NOT visual verification, CSS parser verification, or a build pass.
- Frontend remains unavailable: no node_modules, unavailable fast-uri@3.2.2 resolution, missing frontend/.env reported by diagnostic agent. User refused dependency changes; no install, configuration writes, restart, replacement version or alternative preview attempted.
- Read-only backend smoke attempt BLOCKED: GET /api/ and /api/world connection refused. Troubleshooter confirmed missing networkx and backend/.env, unrelated to frontend CSS patch. No repairs, installs or game mutations were performed.
- Browser/screenshot tests have NOT run. Frontend testing permission pending; do not claim desktop/mobile overflow or render pass. When authorized AND environment restored independently, inspect all populated menus/modals and HUD at 1920x800 and 390x844, including Comando, Estratégia, personnel, hospital specialties and RAR, focus/disabled states, navigation and long names.

## Previous design task (historical)
User wanted a significantly clearer UI/HUD, minimal and map-first, GTA6/Rockstar-inspired with gradients, shadows and lights. Keep real Portugal map full-screen and drawers closed by default. Semantic accents remain INEM yellow, fire red, PSP blue; waiting amber, active blue, positive green, danger red.

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
