# GitHub Actions Workflows

CI and E2E Tests run on every push to `main` and on pull requests against `main`.
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
4. `bun run test:coverage`
5. `bun run build` (Vite build and `tsc` typecheck)
6. Upload coverage to Codecov. Optional: it never fails the job, and uses the
   `CODECOV_TOKEN` secret when it is set.

## E2E Tests (`smoke-test.yml`, job `smoke-test`)

Installs Playwright's Chromium and runs `bunx playwright test`. The specs run
against an in-process fake WLED device (`e2e/support/`), so no hardware is
needed. When the job fails, the Playwright report and traces are uploaded as
the `playwright-report` artifact (kept for 7 days).

## Pages (`pages.yml`, job `deploy`)

Publishes the landing page to GitHub Pages on pushes to `main` that touch
`site/`, `docs/screenshots/`, `public/icon.svg` or the workflow itself (or when
run by hand). It copies `site/`, the README screenshots and the app icon into
one folder and deploys it with `actions/deploy-pages`. Only this job gets
`pages: write` and `id-token: write`. The repository's Pages source must be set
to "GitHub Actions" (Settings, Pages) for the deploy to succeed.

## Deploys

The app itself is deployed by Cloudflare Pages' own Git integration (configured in the
Cloudflare dashboard), which builds `main` for production and every pull
request for a preview. Its result shows up as a Cloudflare Pages check; no
workflow here deploys the app.

## Keeping workflows up to date

- Dependabot (`.github/dependabot.yml`) bumps the actions weekly, grouped in one
  pull request.
- Node is pinned with `actions/setup-node` in the CI and E2E workflows. Keep it inside
  `engines.node` in `package.json`, and update both when a dependency raises
  its Node floor.
- Branch protection can require the `test` and `smoke-test` checks by name, so
  rename a job only together with its branch protection rule.
