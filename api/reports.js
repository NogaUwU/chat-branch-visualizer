'use strict';

const {
  buildDigest,
  buildIssueBody,
  buildIssueTitle,
  githubRequest,
  parseReportBody,
} = require('./_lib/reporting');

function readBody(req) {
  if (req.body) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 512 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function isAuthorized(req, report) {
  const expectedPublicKey = process.env.REPORT_PUBLIC_KEY || '';
  if (!expectedPublicKey) return true;
  const candidates = [
    req.headers['x-cbv-public-key'],
    req.headers['X-CBV-Public-Key'],
    report?.metadata?.publicKey,
    report?.publicKey,
    report?.diagnostics?.publicKey,
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean);

  return candidates.includes(expectedPublicKey);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const raw = await readBody(req);
    const report = parseReportBody(raw);
    if (!report.diagnostics) {
      return res.status(400).json({ ok: false, error: 'missing_diagnostics' });
    }
    if (!isAuthorized(req, report)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(500).json({ ok: false, error: 'missing_github_token' });
    }

    const digest = buildDigest(report);
    const eventType = report.type === 'user_report'
      ? 'extension_user_report'
      : 'extension_breakage_report';
    let delivery = 'dispatch';

    try {
      await githubRequest('/dispatches', token, 'POST', {
        event_type: eventType,
        client_payload: {
          digest,
          report,
        },
      });
    } catch (error) {
      if (!/Resource not accessible by personal access token/i.test(error.message)) {
        throw error;
      }

      delivery = 'issue';
      await githubRequest('/issues', token, 'POST', {
        title: buildIssueTitle(report),
        body: buildIssueBody(report, digest),
        labels: [
          'extension-report',
          report.type === 'user_report' ? 'user-report' : 'auto-report',
          ...((report.diagnostics?.probe?.broken || []).length ? ['selector-broken'] : []),
        ],
      });
    }

    return res.status(202).json({
      ok: true,
      digest,
      eventType,
      delivery,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'report_dispatch_failed',
      message: error.message,
    });
  }
};
