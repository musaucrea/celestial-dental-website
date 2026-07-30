import type { VercelRequest, VercelResponse } from '@vercel/node';
import { get } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { getRole, getSheetsClient } from './_utils.js';

// Routed through /api/careers to stay within Vercel Hobby's function limit.

type ApplicationStatus = 'new' | 'shortlisted' | 'regretted';

type CareerApplication = {
  id: string;
  createdAt: string;
  fullName: string;
  email: string;
  roleId: string;
  roleTitle: string;
  noticePeriod: string;
  coverLetter: string;
  resumeUrl: string;
  resumeName: string;
  status: ApplicationStatus;
  termsAcceptedAt: string;
  updatedAt: string;
  responseSubject: string;
  responseMessage: string;
  responseSentAt: string;
  source: string;
};

const APPLICATIONS_SHEET = 'Career Applications';
const APPLICATIONS_HEADER = [
  'id', 'createdAt', 'fullName', 'email', 'roleId', 'roleTitle', 'noticePeriod',
  'coverLetter', 'resumeUrl', 'resumeName', 'status', 'termsAcceptedAt',
  'updatedAt', 'responseSubject', 'responseMessage', 'responseSentAt', 'source',
] as const;
const MAX_RESUME_BYTES = 4 * 1024 * 1024;
const NOTICE_PERIODS = new Set([
  'Immediately',
  '1 week',
  '2 weeks',
  '1 month',
  '2 months',
  '3 months or more',
]);
const GENERAL_ROLE_ID = 'general-application';
const GENERAL_ROLE_TITLE = 'General / Speculative Application';

function clean(value: unknown, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function escapeHtml(value: unknown) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function textToHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function rowsToApplications(rows: string[][] = []): CareerApplication[] {
  return rows
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(
      APPLICATIONS_HEADER.map((key, index) => [key, row[index] || '']),
    ) as CareerApplication)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function applicationToRow(application: CareerApplication) {
  return APPLICATIONS_HEADER.map(key => application[key] || '');
}

async function ensureApplicationsSheet() {
  const { sheets, spreadsheetId } = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = spreadsheet.data.sheets?.some(
    sheet => sheet.properties?.title === APPLICATIONS_SHEET,
  );
  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: APPLICATIONS_SHEET } } }],
      },
    });
    // Header only needs writing once, when the tab is first created — not on
    // every submission.
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${APPLICATIONS_SHEET}'!A1:Q1`,
      valueInputOption: 'RAW',
      requestBody: { values: [Array.from(APPLICATIONS_HEADER)] },
    });
  }
  return { sheets, spreadsheetId };
}

async function readApplications() {
  const { sheets, spreadsheetId } = await ensureApplicationsSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${APPLICATIONS_SHEET}'!A:Q`,
  });
  return {
    applications: rowsToApplications((result.data.values || []) as string[][]),
    sheets,
    spreadsheetId,
  };
}

async function resolveRole(roleId: string) {
  if (roleId === GENERAL_ROLE_ID) {
    return { id: GENERAL_ROLE_ID, title: GENERAL_ROLE_TITLE };
  }
  const { sheets, spreadsheetId } = await getSheetsClient();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Careers!A:H',
  });
  const rows = (result.data.values || []) as string[][];
  const row = rows.slice(1).find(item => item[0] === roleId && item[1] === 'published');
  if (!row) return null;
  return { id: row[0], title: row[2] };
}

async function verifyResume(resumeUrl: string, resumeName: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Resume storage is not configured');
  // Never let a client point this at another blob — only read from the resumes
  // folder. Checked against the URL up front so we can skip a separate head()
  // metadata round-trip (we download the bytes below anyway, for the HR email
  // attachment, and validate size + PDF signature from those).
  let pathname: string;
  try {
    pathname = new URL(resumeUrl).pathname.replace(/^\/+/, '');
  } catch {
    throw new Error('The uploaded resume is invalid');
  }
  if (!pathname.startsWith('career-resumes/')) {
    throw new Error('The uploaded resume is invalid');
  }
  const result = await get(resumeUrl, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!result || result.statusCode !== 200) throw new Error('Resume could not be read');
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (bytes.length > MAX_RESUME_BYTES) throw new Error('The uploaded resume is too large');
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('The uploaded file is not a valid PDF');
  }
  return {
    filename: resumeName,
    content: bytes.toString('base64'),
  };
}

function emailShell(title: string, body: string, action?: { label: string; href: string }) {
  return `<div style="background:#f2faf8;padding:28px 12px">
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#fff;border:1px solid #d4e9e6;border-radius:18px;padding:32px;color:#153536;line-height:1.6">
      <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#0f766e">Celestial Dental Centre</div>
      <h1 style="font-size:24px;line-height:1.25;margin:10px 0 18px;color:#0d1f1e">${escapeHtml(title)}</h1>
      <div style="font-size:15px">${body}</div>
      ${action ? `<p style="margin:26px 0 4px"><a href="${escapeHtml(action.href)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;border-radius:999px;padding:12px 22px;font-weight:700">${escapeHtml(action.label)}</a></p>` : ''}
      <p style="font-size:12px;color:#718080;margin:28px 0 0">Celestial Dental Centre · Recruitment Team</p>
    </div>
  </div>`;
}

function adminUrl() {
  const host = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}/admin/?page=careers` : 'https://celestialdental.org/admin/?page=careers';
}

async function sendEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: string }>;
  idempotencyKey: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Email delivery is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.CAREERS_FROM_EMAIL || 'Celestial Dental HR <hr@celestialdental.org>',
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
      attachments: input.attachments,
    }),
  });
  if (!response.ok) throw new Error(`Email delivery failed: ${await response.text()}`);
}

async function sendSubmissionEmails(
  application: CareerApplication,
  attachment: { filename: string; content: string },
) {
  const applicantSubject = `We received your application — ${application.roleTitle}`;
  const applicantText = `Dear ${application.fullName},\n\nThank you for applying for the ${application.roleTitle} role at Celestial Dental Centre. We have received your application and our recruitment team will review it. If your experience matches what we are looking for, HR will contact you with the next steps.\n\nKind regards,\nCelestial Dental HR`;
  const applicantHtml = emailShell(
    'We received your application',
    `<p>Dear ${escapeHtml(application.fullName)},</p>
     <p>Thank you for applying for the <strong>${escapeHtml(application.roleTitle)}</strong> role. We have received your application and our recruitment team will review it.</p>
     <p>If your experience matches what we are looking for, HR will contact you with the next steps.</p>`,
  );

  const hrRecipients = Array.from(new Set([
    'hr@celestialdental.org',
    ...(process.env.CAREERS_NOTIFICATION_EMAIL || '').split(','),
  ].map(item => item.trim().toLowerCase()).filter(Boolean)));
  const hrSubject = `New application: ${application.fullName} — ${application.roleTitle}`;
  const hrText = `New career application\n\nCandidate: ${application.fullName}\nEmail: ${application.email}\nRole: ${application.roleTitle}\nNotice period: ${application.noticePeriod}\nCover letter: ${application.coverLetter || 'Not provided'}\n\nOpen the admin dashboard to shortlist or regret this application: ${adminUrl()}`;
  const hrHtml = emailShell(
    'New career application',
    `<p><strong>Candidate:</strong> ${escapeHtml(application.fullName)}<br>
     <strong>Email:</strong> ${escapeHtml(application.email)}<br>
     <strong>Role:</strong> ${escapeHtml(application.roleTitle)}<br>
     <strong>Notice period:</strong> ${escapeHtml(application.noticePeriod)}</p>
     <p><strong>Cover letter</strong><br>${application.coverLetter ? textToHtml(application.coverLetter) : '<em>Not provided</em>'}</p>
     <p>The candidate’s PDF resume is attached. Open the admin dashboard to review and send a shortlist or regret email.</p>`,
    { label: 'Review application', href: adminUrl() },
  );

  const results = await Promise.allSettled([
    sendEmail({
      to: application.email,
      subject: applicantSubject,
      html: applicantHtml,
      text: applicantText,
      replyTo: 'hr@celestialdental.org',
      idempotencyKey: `career-received-${application.id}`,
    }),
    sendEmail({
      to: hrRecipients,
      subject: hrSubject,
      html: hrHtml,
      text: hrText,
      replyTo: application.email,
      attachments: [attachment],
      idempotencyKey: `career-hr-notification-${application.id}`,
    }),
  ]);
  results.forEach(result => {
    if (result.status === 'rejected') console.error('Career application email failed', result.reason);
  });
  return {
    applicantEmailSent: results[0].status === 'fulfilled',
    hrEmailSent: results[1].status === 'fulfilled',
  };
}

async function requireAdmin(req: VercelRequest) {
  const role = await getRole(req);
  return role === 'super_admin' || role === 'admin';
}

async function submitApplication(req: VercelRequest, res: VercelResponse) {
  const payload = (req.body || {}) as Record<string, unknown>;
  const fullName = clean(payload.fullName, 120);
  const email = clean(payload.email, 200).toLowerCase();
  const roleId = clean(payload.roleId, 120);
  const noticePeriod = clean(payload.noticePeriod, 40);
  const coverLetter = clean(payload.coverLetter, 5000);
  const resumeUrl = clean(payload.resumeUrl, 1000);
  const resumeName = clean(payload.resumeName, 180);

  if (fullName.length < 2) return res.status(400).json({ error: 'Full name is required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  if (!NOTICE_PERIODS.has(noticePeriod)) {
    return res.status(400).json({ error: 'Please select a valid notice period' });
  }
  if (payload.termsAccepted !== true) {
    return res.status(400).json({ error: 'You must agree to the recruitment terms' });
  }
  if (!resumeUrl || !resumeName.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'A PDF resume is required' });
  }

  const role = await resolveRole(roleId);
  if (!role) return res.status(400).json({ error: 'The selected role is no longer open' });
  const attachment = await verifyResume(resumeUrl, resumeName);

  const { applications, sheets, spreadsheetId } = await readApplications();
  const duplicate = applications.find(
    item => item.email === email && item.roleId === role.id && item.resumeUrl === resumeUrl,
  );
  if (duplicate) {
    return res.status(200).json({ ok: true, id: duplicate.id, applicantEmailSent: true });
  }

  const now = new Date().toISOString();
  const application: CareerApplication = {
    id: `application-${randomUUID()}`,
    createdAt: now,
    fullName,
    email,
    roleId: role.id,
    roleTitle: role.title,
    noticePeriod,
    coverLetter,
    resumeUrl,
    resumeName,
    status: 'new',
    termsAcceptedAt: now,
    updatedAt: now,
    responseSubject: '',
    responseMessage: '',
    responseSentAt: '',
    source: clean(req.headers.referer, 500) || 'careers-page',
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${APPLICATIONS_SHEET}'!A:Q`,
    valueInputOption: 'RAW',
    requestBody: { values: [applicationToRow(application)] },
  });
  const delivery = await sendSubmissionEmails(application, attachment);
  return res.status(201).json({ ok: true, id: application.id, ...delivery });
}

async function respondToApplication(req: VercelRequest, res: VercelResponse) {
  if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
  const payload = (req.body || {}) as Record<string, unknown>;
  const id = clean(payload.id, 120);
  const decision = clean(payload.decision, 20);
  const subject = clean(payload.subject, 200);
  const message = clean(payload.message, 8000);
  if (!['shortlist', 'regret'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid application decision' });
  }
  if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });

  const { applications, sheets, spreadsheetId } = await readApplications();
  const index = applications.findIndex(item => item.id === id);
  if (index < 0) return res.status(404).json({ error: 'Application not found' });
  const application = applications[index];
  const status: ApplicationStatus = decision === 'shortlist' ? 'shortlisted' : 'regretted';
  const html = emailShell(
    decision === 'shortlist' ? 'You have been shortlisted' : 'Update on your application',
    `<p>${textToHtml(message)}</p>`,
  );
  await sendEmail({
    to: application.email,
    subject,
    html,
    text: message,
    replyTo: 'hr@celestialdental.org',
    idempotencyKey: `career-${decision}-${application.id}-${Date.now()}`,
  });

  const updated: CareerApplication = {
    ...application,
    status,
    updatedAt: new Date().toISOString(),
    responseSubject: subject,
    responseMessage: message,
    responseSentAt: new Date().toISOString(),
  };
  const allRows = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${APPLICATIONS_SHEET}'!A:A`,
  });
  const idRows = (allRows.data.values || []) as string[][];
  const rowIndex = idRows.findIndex((row, rowNumber) => rowNumber > 0 && row[0] === id);
  if (rowIndex < 1) return res.status(404).json({ error: 'Application row not found' });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${APPLICATIONS_SHEET}'!A${rowIndex + 1}:Q${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [applicationToRow(updated)] },
  });
  return res.status(200).json({ ok: true, application: updated });
}

async function downloadResume(req: VercelRequest, res: VercelResponse) {
  if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
  const id = clean(req.query.id, 120);
  const { applications } = await readApplications();
  const application = applications.find(item => item.id === id);
  if (!application) return res.status(404).json({ error: 'Application not found' });
  const result = await get(application.resumeUrl, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!result || result.statusCode !== 200) return res.status(404).json({ error: 'Resume not found' });
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  const safeName = (application.resumeName || 'resume.pdf').replace(/[^a-zA-Z0-9._ -]/g, '-');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).send(bytes);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      if (req.query.action === 'resume') return downloadResume(req, res);
      if (!await requireAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
      const { applications } = await readApplications();
      return res.status(200).json({ applications });
    }
    if (req.method === 'POST') {
      const action = clean(req.body?.action, 30);
      if (action === 'submit') return submitApplication(req, res);
      if (action === 'respond') return respondToApplication(req, res);
      return res.status(400).json({ error: 'Unknown action' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Career applications API error', error);
    const message = error instanceof Error ? error.message : 'Career applications request failed';
    return res.status(500).json({ error: message });
  }
}
