// lib/email.js — MSAL config, Graph API email sending, HTML email builders
const { log } = require('./logger');
const { escHtml } = require('./helpers');
const { withRetry } = require('../resilience');

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || '';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'nbihub@nbi-consulting.com';
const APP_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 8888}`;

let _msalClient = null;
if (AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET) {
  const msal = require('@azure/msal-node');
  _msalClient = new msal.ConfidentialClientApplication({
    auth: {
      clientId: AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
      clientSecret: AZURE_CLIENT_SECRET
    }
  });
  log('info', 'Server', `Email configured: Graph API as ${EMAIL_FROM}`);
}

async function _getGraphToken() {
  if (!_msalClient) throw new Error('MSAL client not configured');
  const result = await _msalClient.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default']
  });
  if (!result || !result.accessToken) throw new Error('Failed to acquire Graph API token');
  return result.accessToken;
}

async function _sendViaGraph(mailOptions) {
  const token = await _getGraphToken();
  const toRecipients = (Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to])
    .map(addr => ({ emailAddress: { address: addr } }));
  const message = {
    subject: mailOptions.subject,
    body: { contentType: mailOptions.html ? 'HTML' : 'Text', content: mailOptions.html || mailOptions.text || '' },
    toRecipients,
  };
  if (mailOptions.replyTo) {
    message.replyTo = [{ emailAddress: { address: mailOptions.replyTo } }];
  }
  const body = { message, saveToSentItems: false };
  const sender = mailOptions.from || EMAIL_FROM;
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${sender}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph API ${res.status}: ${errText}`);
  }
}

let _emailSends = null;
function setEmailCounter(counter) { _emailSends = counter; }

function sendEmailAsync(mailOptions) {
  if (!_msalClient) {
    log('info', 'Email', 'Graph API not configured, logging email', { to: mailOptions.to, subject: mailOptions.subject });
    return;
  }
  withRetry(() => _sendViaGraph(mailOptions), { maxAttempts: 2, backoffMs: 2000, log })
    .then(() => { log('info', 'Email', 'Email sent via Graph API', { to: mailOptions.to }); _emailSends?.inc({ status: 'success' }); })
    .catch(err => { log('error', 'Email', 'Failed after retries', { to: mailOptions.to, error: err.message }); _emailSends?.inc({ status: 'failure' }); });
}

function buildEmailHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5">
<div style="max-width:640px;margin:0 auto;background:#fff">
  <div style="background:#1e293b;padding:16px 24px">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600">${title}</h1>
  </div>
  <div style="padding:24px">${bodyHtml}</div>
  <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
    Sent from NBI Hub &middot; <a href="${APP_URL}/nbi_project_dashboard.html" style="color:#64748b">Open Dashboard</a>
  </div>
</div>
</body></html>`;
}

function buildEmailTable(cols, rows) {
  const thStyle = 'padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:13px;color:#64748b';
  const tdStyle = 'padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px';
  const header = cols.map(c => `<th style="${thStyle}">${c.label}</th>`).join('');
  const body = rows.map(r =>
    '<tr>' + cols.map(c => `<td style="${tdStyle}${c.style ? ';' + c.style : ''}">${escHtml(String(r[c.key] ?? ''))}</td>`).join('') + '</tr>'
  ).join('');
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0">${header ? `<tr>${header}</tr>` : ''}${body}</table>`;
}

function buildEmailSection(title, colour, contentHtml) {
  if (!contentHtml) return '';
  return `<div style="margin:20px 0;border-left:4px solid ${colour};padding-left:16px">
    <h2 style="margin:0 0 8px;font-size:15px;color:#1e293b">${title}</h2>
    ${contentHtml}
  </div>`;
}

module.exports = {
  sendEmailAsync, setEmailCounter, EMAIL_FROM, APP_URL, _msalClient,
  buildEmailHtml, buildEmailTable, buildEmailSection,
};
