#!/usr/bin/env node
'use strict';

const fs = require('fs');

function readIssuePayload() {
  const issuePath = process.env.ISSUE_PAYLOAD_PATH || 'issue-payload.json';
  if (!fs.existsSync(issuePath)) {
    return {
      ok: false,
      message: `Issue payload not found at ${issuePath}.`,
    };
  }
  return {
    ok: true,
    payload: JSON.parse(fs.readFileSync(issuePath, 'utf8')),
  };
}

function summarizeIssue(issue) {
  const title = issue.title || '';
  const body = issue.body || '';
  const labels = (issue.labels || []).map(label => typeof label === 'string' ? label : label.name);
  return {
    title,
    labels,
    bodyPreview: body.slice(0, 1200),
    nextStep: 'Feed this issue body and probe artifact into OpenClaw patch generation.',
  };
}

function main() {
  const result = readIssuePayload();
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const summary = summarizeIssue(result.payload);
  fs.writeFileSync('openclaw-patch-input.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main();
