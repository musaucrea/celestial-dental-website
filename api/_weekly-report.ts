import { getSheetsClient, USERS_SHEET } from './_utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

import { emailShell } from './_email.js';

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[char] || char);
}

function top(counter: Map<string, number>, limit = 5) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function bump(counter: Map<string, number>, key: string) {
  const label = key.trim() || 'Not specified';
  counter.set(label, (counter.get(label) || 0) + 1);
}

function tableRows(items: Array<{ name: string; count: number }>, empty: string) {
  if (!items.length) return `<tr><td style="padding:8px 0;color:#718080">${escapeHtml(empty)}</td></tr>`;
  return items.map(item => `<tr><td style="padding:7px 0;border-bottom:1px solid #e7eeee">${escapeHtml(item.name)}</td><td style="padding:7px 0;border-bottom:1px solid #e7eeee;text-align:right;font-weight:700">${item.count}</td></tr>`).join('');
}

async function readReportData() {
  const { sheets, spreadsheetId } = await getSheetsClient();
  const appointmentTab = (process.env.GOOGLE_SHEET_RANGE || 'Appointments!A:J').split('!')[0];
  const [visitsResult, appointmentsResult, usersResult] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'Visits!A:H' }).catch(() => ({ data: { values: [] } })),
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${appointmentTab}!A:L` }).catch(() => ({ data: { values: [] } })),
    sheets.spreadsheets.values.get({ spreadsheetId, range: `${USERS_SHEET}!A:K` }),
  ]);

  const now = Date.now();
  const from = now - 7 * DAY_MS;
  const visits = ((visitsResult.data.values || []) as string[][]).slice(1).filter(row => {
    const time = Date.parse(row[0] || '');
    return !Number.isNaN(time) && time >= from && time <= now;
  });
  const appointments = ((appointmentsResult.data.values || []) as string[][]).slice(1).filter(row => {
    const time = Date.parse(row[0] || '');
    return !Number.isNaN(time) && time >= from && time <= now;
  });

  const sessions = new Set(visits.map(row => row[6]).filter(Boolean));
  const pages = new Map<string, number>();
  const sources = new Map<string, number>();
  const branches = new Map<string, number>();
  const statuses = new Map<string, number>();
  visits.forEach(row => {
    bump(pages, row[1] || '/');
    if (row[2] && row[2] !== 'internal') bump(sources, row[2]);
  });
  appointments.forEach(row => {
    bump(branches, row[10] || 'Not specified');
    bump(statuses, row[11] || 'pending');
  });

  const configuredRecipients = (process.env.WEEKLY_REPORT_EMAIL || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  const sheetRecipients = ((usersResult.data.values || []) as string[][])
    .slice(1)
    .filter(row => row[4] === 'super_admin' && row[5] === 'active')
    .map(row => (row[2] || '').trim().toLowerCase())
    .filter(Boolean);

  return {
    recipients: [...new Set([...sheetRecipients, ...configuredRecipients])],
    views: visits.length,
    visitors: sessions.size,
    appointments: appointments.length,
    pages: top(pages), sources: top(sources), branches: top(branches), statuses: top(statuses),
    startDate: new Date(from).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' }),
    endDate: new Date(now).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

export async function sendWeeklyReport() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  const report = await readReportData();
  if (!report.recipients.length) throw new Error('No active Super Admin email was found');

  const subject = `Celestial Dental weekly website report · ${report.endDate}`;
  const html = emailShell('Weekly website report', `
    <p style="margin-top:0;color:#718080">${escapeHtml(report.startDate)} – ${escapeHtml(report.endDate)}</p>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin:24px 0">
      <div style="flex:1;min-width:130px;background:#eef9f7;border-radius:14px;padding:18px"><strong style="display:block;font-size:28px;color:#087f78">${report.views}</strong><span>Page views</span></div>
      <div style="flex:1;min-width:130px;background:#eef9f7;border-radius:14px;padding:18px"><strong style="display:block;font-size:28px;color:#087f78">${report.visitors}</strong><span>Visitors</span></div>
      <div style="flex:1;min-width:130px;background:#eef9f7;border-radius:14px;padding:18px"><strong style="display:block;font-size:28px;color:#087f78">${report.appointments}</strong><span>Appointments</span></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div><h2 style="font-size:16px">Most visited pages</h2><table style="width:100%;border-collapse:collapse">${tableRows(report.pages, 'No page views this week')}</table></div>
      <div><h2 style="font-size:16px">Traffic sources</h2><table style="width:100%;border-collapse:collapse">${tableRows(report.sources, 'No referral data this week')}</table></div>
      <div><h2 style="font-size:16px">Bookings by branch</h2><table style="width:100%;border-collapse:collapse">${tableRows(report.branches, 'No bookings this week')}</table></div>
      <div><h2 style="font-size:16px">Booking status</h2><table style="width:100%;border-collapse:collapse">${tableRows(report.statuses, 'No bookings this week')}</table></div>
    </div>
    <p style="font-size:12px;color:#718080;margin-top:28px">Automatic confidential report for Celestial Dental Super Admins.</p>`,
    { label: 'Open Admin Dashboard', href: 'https://celestialdental.org/admin/' },
  );
  const text = `Celestial Dental weekly website report (${report.startDate} – ${report.endDate})\n\nPage views: ${report.views}\nVisitors: ${report.visitors}\nAppointments: ${report.appointments}\n\nAdmin dashboard: https://celestialdental.org/admin/`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.OTP_FROM_EMAIL || 'Celestial Dental <onboarding@resend.dev>',
      to: report.recipients,
      subject,
      html,
      text,
    }),
  });
  if (!response.ok) throw new Error(`Resend failed: ${await response.text()}`);
  return { recipients: report.recipients.length, views: report.views, visitors: report.visitors, appointments: report.appointments };
}
