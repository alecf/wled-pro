# GitHub Actions Workflows

This directory contains GitHub Actions workflows for continuous integration and automated code review.

## Workflows

### CI Workflow (`ci.yml`)

Runs on every push to `main`/`master` and on pull requests.

**Steps:**
1. Checkout code
2. Set up Node.js 20.x
3. Install dependencies with `npm ci`
4. Run ESLint (`npm run lint`)
5. Run tests with coverage (`npm run test:coverage`)
6. Build the project (`npm run build`)
7. Upload coverage reports to Codecov (optional)

**Required Secrets:**
- `CODECOV_TOKEN` (optional) - For uploading test coverage reports to Codecov

### Claude Code Review (`claude-review.yml`)

Automatically reviews pull requests using Claude AI.

**Triggers:** When a PR is opened, synchronized, or reopened

**Features:**
- Detects changed TypeScript/JavaScript files
- Analyzes the diff and file contents
- Provides AI-powered code review covering:
  - Code quality assessment
  - Potential bugs or issues
  - Security concerns
  - Performance considerations
  - Best practice suggestions
  - TypeScript/React-specific improvements

**Required Secrets:**
- `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude access

## Setup Instructions

### 1. Enable GitHub Actions

GitHub Actions should be enabled by default. If not, go to your repository settings → Actions → General → Allow all actions.

### 2. Configure Secrets

Add the following secrets in your repository settings (Settings → Secrets and variables → Actions):

#### Required for Claude Code Review:
- **`ANTHROPIC_API_KEY`**:
  1. Get your API key from [console.anthropic.com](https://console.anthropic.com/)
  2. Add it as a repository secret named `ANTHROPIC_API_KEY`

#### Optional for Coverage Reports:
- **`CODECOV_TOKEN`**:
  1. Sign up at [codecov.io](https://codecov.io/)
  2. Add your repository
  3. Copy the token and add it as `CODECOV_TOKEN`

### 3. Branch Protection (Recommended)

Consider enabling branch protection rules:
1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main` (or `master`)
3. Enable "Require status checks to pass before merging"
4. Select the `test` check from the CI workflow

## Workflow Behavior

### On Push to Main
- ✅ CI workflow runs (lint, test, build)
- ❌ Claude review does not run (only on PRs)

### On Pull Request
- ✅ CI workflow runs (lint, test, build)
- ✅ Claude review posts a comment with AI analysis

## Troubleshooting

### CI Workflow Fails
- Check that all dependencies are properly listed in `package.json`
- Ensure tests pass locally with `npm run test:coverage`
- Verify build works locally with `npm run build`

### Claude Review Doesn't Post
- Verify `ANTHROPIC_API_KEY` secret is set correctly
- Check that the PR includes changes to `.ts`, `.tsx`, `.js`, or `.jsx` files
- Review the workflow logs in the Actions tab

### API Rate Limits
- The Claude API has rate limits based on your plan
- Consider adding checks to skip review for draft PRs if needed

## Customization

### Adjust CI Node Versions
Edit `ci.yml` matrix to test against multiple Node versions:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]
```

### Modify Claude Review Scope
Edit `claude-review.yml` to change which files trigger review:
```yaml
files: |
  **/*.ts
  **/*.tsx
  **/*.css
  # Add or remove patterns as needed
```

### Change Claude Model
In `claude-review.yml`, update the model name:
```javascript
model: 'claude-sonnet-4-20250514', // Or claude-opus-4-20250514
```
