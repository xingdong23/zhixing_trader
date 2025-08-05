# CRUSH.md

Repository quick facts
- Frontend: Next.js 15 + TypeScript (src/, app/). Lint via eslint-config-next.
- Backend: Python FastAPI service in api-server/ with pytest tests.

Build/run/lint/test
- Frontend dev: npm run dev
- Frontend build: npm run build
- Frontend start: npm start
- Frontend lint (all): npm run lint
- Frontend typecheck: npx tsc -p tsconfig.json --noEmit
- Backend run (dev): python api-server/run.py
- Backend tests (all): pytest api-server -q
- Backend single file: pytest api-server/tests/test_yahoo_data.py -q
- Backend single test: pytest api-server/tests/test_yahoo_data.py::TestYahoo::test_fetch -q
- Backend with marker: pytest api-server -m yahoo -q

Formatting & style (TypeScript/React)
- Use named imports; absolute paths only if configured; prefer barrel files (index.ts) already present.
- React: functional components, hooks; server components under app/ by Next.js defaults.
- Types: prefer exported types/interfaces in src/types; avoid any; use unknown over any when needed.
- Naming: camelCase for vars/functions, PascalCase for components/types, UPPER_SNAKE for constants.
- Errors: throw Error objects; never swallow; surface via utils/errorHandling.ts helpers.
- Utilities: reuse src/utils helpers (dateTime, array, object, validation, formatters, cn).

Formatting & style (Python)
- Python >=3.9. Tests via pytest (see api-server/pytest.ini markers: slow, integration, unit, yahoo, data).
- Structure: services, repositories, core.strategy engine; keep FastAPI routers under api/v1/endpoints.
- Type hints where practical; avoid broad except; raise HTTPException at API layer only.
- Data access via repositories; do not import database directly in endpoints.

Conventions
- Env: do not commit .env*; secrets never logged.
- Commits/PRs: small, focused; include rationale.

Cursor/Copilot rules
- If .cursor/rules/ or .cursorrules or .github/copilot-instructions.md appear, incorporate into reviews and follow them in changes.
