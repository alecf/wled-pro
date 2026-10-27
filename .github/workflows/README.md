# GitHub Actions Workflows

Both workflows run on every push to `main` and on pull requests against `main`.
A new push to a pull request cancels that pull request's run in progress; runs
on `main` are never cancelled (each push to `main` gets its own concurrency
group). Workflows get a read-only `GITHUB_TOKEN`
(`permissions: contents: read`) and don't keep it in the checkout
(`persist-credentials: false`).

## CI (`ci.yml`, job `test`)

1. Set up Node (Vite, Vitest and jsdom run on Node) and Bun (the version in
   `packageManager` in `package.json`)
2. `bun install --frozen-lockfile`
3. `bun run lint` (Biome lint and format check)
4. `bun run knip` (fails on unused files, exports or dependencies; config in `knip.json`)
5. `bun run test:coverage` (fails below the coverage floor in `vite.config.ts`)
6. `bun run build` (Vite build and `tsc` typecheck)
7. Upload coverage to Codecov. Optional: it never fails the job, and uses the
   `CODECOV_TOKEN` secret when it is set.

## E2E Tests (`smoke-test.yml`, job `smoke-test`)

Installs Playwright's Chromium and runs `bunx playwright test`. The specs run
against an in-process fake WLED device (`e2e/support/`), so no hardware is
needed. When the job fails, the Playwright report and traces are uploaded as
the `playwright-report` artifact (kept for 7 days).

## Deploys

The app is deployed by Cloudflare Pages' own Git integration (configured in the
Cloudflare dashboard), which builds `main` for production and every pull
request for a preview. Its result shows up as a Cloudflare Pages check; no
workflow here deploys anything.

## Keeping workflows up to date

- Dependabot (`.github/dependabot.yml`) bumps the actions weekly, grouped in one
  pull request.
- Node is pinned with `actions/setup-node` in both workflows. Keep it inside
  `engines.node` in `package.json`, and update both when a dependency raises
  its Node floor.
- Branch protection can require the `test` and `smoke-test` checks by name, so
  rename a job only together with its branch protection rule.
