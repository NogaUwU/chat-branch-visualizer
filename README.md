# chat-branch-visualizer-mvp

Chrome extension for visualizing ChatGPT and Claude conversation branches in a native side panel, with diagnostics and automation hooks for DOM drift.

## Core features

- Shared tree renderer for ChatGPT and Claude
- Platform-specific DOM parsers in `content.js`
- Full-tree traversal with branch navigation
- Partial/full snapshot state restoration
- Selector probe and diagnostics capture when parsing degrades

## Local install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder
5. Open a ChatGPT or Claude conversation page

## Diagnostics pipeline

When the parser hits one of these conditions:

- `no_turns_detected`
- `build_error`
- `branch_navigation_warning`

the extension captures a diagnostics payload with:

- `platform`
- `url`
- `extensionVersion`
- `selectorVersion`
- `probe.hits`
- `probe.broken`
- `activePath`
- `visiblePath`
- `domSummary`

The payload is sent to the side panel as `PROBE_RESULT`. If reporting is enabled, `background.js` also auto-posts it to your Vercel endpoint.

## Selector registry

Key selectors live in [`selectors.json`](./selectors.json). The runtime parser still keeps behavior logic in code, but probe tooling and automation both read from this registry.

## Reporting setup

### 1. Configure the extension client

Edit [`reporting-config.js`](./reporting-config.js):

- `enabled`: turn backend reporting on/off
- `endpoint`: your deployed Vercel endpoint, for example `https://your-app.vercel.app/api/reports`
- `publicKey`: optional low-trust identifier checked by the API
- `autoSend`: auto-submit diagnostics from `background.js`
- `manualReports`: keep `false` for now if you want feedback UI hidden

### 2. Deploy the Vercel API

This repo now includes:

- [`api/reports.js`](./api/reports.js)
- [`api/health.js`](./api/health.js)

Required Vercel environment variables:

- `GITHUB_TOKEN`
- `GITHUB_REPOSITORY`

Optional:

- `REPORT_PUBLIC_KEY`

`api/reports.js` accepts extension payloads, sanitizes them, and triggers a GitHub `repository_dispatch` event:

- `extension_breakage_report`
- `extension_user_report`

## GitHub automation

### Scheduled probe

[`probe.yml`](./.github/workflows/probe.yml) runs Playwright against ChatGPT / Claude using stored session cookies and opens an issue if selectors drift.

Secrets used by the probe workflow:

- `TEST_CHATGPT_URL`
- `TEST_CLAUDE_URL`
- `CHATGPT_SESSION_COOKIE`
- `CLAUDE_SESSION_COOKIE`

### Report intake

[`report-intake.yml`](./.github/workflows/report-intake.yml) listens for `repository_dispatch` and upserts an issue for incoming extension reports.

### Reviewer

[`review.yml`](./.github/workflows/review.yml) adds a lightweight structural review comment on auto-fix PRs.

## Local automation scripts

- `npm run probe`
- `npm run review`
- `npm run patch`
- `npm run check:reporting`

## Privacy / scope

The reporting path is designed to send minimal diagnostics, not full chat transcripts. The captured text is limited to short signatures and DOM snippets needed for selector debugging.
