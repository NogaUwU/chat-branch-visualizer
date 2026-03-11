#!/usr/bin/env node
'use strict';

const fs = require('fs');

async function githubRequest(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'chat-branch-visualizer-reviewer',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function buildReview(diffFiles) {
  const changed = diffFiles.map(file => file.filename);
  const touchedSelectors = changed.includes('selectors.json');
  const touchedParser = changed.includes('content.js');
  const touchedUi = changed.some(name => name.startsWith('sidepanel'));
  const findings = [];

  if (!touchedSelectors && touchedParser) {
    findings.push('Parser changed without updating `selectors.json`; verify this is intentional.');
  }
  if (touchedSelectors && !touchedParser) {
    findings.push('`selectors.json` changed without parser changes; confirm runtime already consumes the new entries.');
  }
  if (!touchedParser && !touchedSelectors) {
    findings.push('Auto-fix PR did not touch selector or parser files; likely wrong patch target.');
  }

  const verdict = findings.length ? 'needs-human-attention' : 'lgtm';
  const summary = verdict === 'lgtm'
    ? 'LGTM from automated reviewer. Please still verify both ChatGPT and Claude manually before merge.'
    : 'Automated reviewer found issues that need human attention before merge.';

  return {
    verdict,
    summary,
    changed,
    findings,
    checklist: [
      `selectors.json touched: ${touchedSelectors ? 'yes' : 'no'}`,
      `content.js touched: ${touchedParser ? 'yes' : 'no'}`,
      `sidepanel/viewer touched: ${touchedUi ? 'yes' : 'no'}`,
    ],
  };
}

async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER || process.env.GITHUB_REF_NAME?.replace('refs/pull/', '').split('/')[0];

  if (!token || !repo || !prNumber) {
    const payload = {
      ok: false,
      message: 'Missing GH token, repository, or PR number for review.',
    };
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  const [owner, name] = repo.split('/');
  const files = await githubRequest(`https://api.github.com/repos/${owner}/${name}/pulls/${prNumber}/files`, token);
  const review = buildReview(files);
  const body = [
    '## Automated Review',
    '',
    review.summary,
    '',
    '### Checklist',
    ...review.checklist.map(item => `- ${item}`),
    '',
    '### Findings',
    ...(review.findings.length ? review.findings.map(item => `- ${item}`) : ['- No structural findings from the lightweight reviewer.']),
    '',
    `Verdict: \`${review.verdict}\``,
  ].join('\n');

  fs.writeFileSync('review-result.json', JSON.stringify(review, null, 2));
  console.log(body);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
