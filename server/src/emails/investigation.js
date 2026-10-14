import { env } from '../config/env.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const VERDICT_LABELS = {
  natural: 'Natural, no treatment detected',
  natural_treated: 'Natural, treated',
  synthetic: 'Synthetic (lab-grown)',
  imitation: 'Imitation or a different stone',
  inconclusive: 'Inconclusive',
};

export const trackUrlFor = (inv, token) => `${env.clientUrl}/investigation/track/${inv.trackingId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

// Local uploads have site-relative URLs; emails need absolute ones
const absolute = (url) => (url.startsWith('/') ? `${env.clientUrl}${url}` : url);

const gemLine = (inv) => `${inv.gem.count} × ${inv.gem.type}`;

// Same frame as the order confirmation: emerald header, white card, ivory ground
function layout({ eyebrow, title, intro, body, button }) {
  return `<!doctype html><html><body style="margin:0;background:#f6f2e9;font-family:Helvetica,Arial,sans-serif;color:#1c1f1d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2e9;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
    <tr><td style="background:#0b3d2e;padding:24px;text-align:center;font-family:Georgia,serif;font-size:22px;color:#fbf9f4">Geological <em style="color:#c9a24b">Kingdom</em></td></tr>
    <tr><td style="padding:28px 28px 8px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#a9843a">${esc(eyebrow)}</p>
      <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:normal;font-size:26px;color:#0b3d2e">${esc(title)}</h1>
      <p style="margin:0;line-height:1.6;color:#5f665f">${esc(intro)}</p>
    </td></tr>
    ${body}
    <tr><td style="padding:16px 28px 32px;text-align:center">
      <a href="${esc(button.url)}" style="display:inline-block;background:#0b3d2e;color:#fbf9f4;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:13px;letter-spacing:2px;text-transform:uppercase">${esc(button.label)}</a>
    </td></tr>
  </table>
  <p style="font-size:12px;color:#5f665f;margin:16px 0 0">Geological Kingdom · Namak Mandi, Peshawar, Pakistan</p>
  </td></tr></table></body></html>`;
}

const detailRows = (rows) => `<tr><td style="padding:16px 28px 8px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;background:#f6f2e9">
    ${rows.map(([k, v]) => `<tr><td style="padding:8px 12px;color:#5f665f;vertical-align:top">${esc(k)}</td><td style="padding:8px 12px;font-weight:bold">${esc(v)}</td></tr>`).join('')}
  </table></td></tr>`;

// Sent right after the request is submitted
export function investigationReceivedEmail(inv, { trackUrl }) {
  const first = inv.contact.name.split(' ')[0];
  const intro = `We have received your Gem Investigation request. We will contact you on WhatsApp (${inv.contact.whatsapp}) to arrange payment and confirm what we need from you.`;
  const rows = [
    ['Tracking ID', inv.trackingId],
    ['Gemstones', gemLine(inv)],
    ['Fee', `US$${inv.feeUSD} ($10 per gemstone)`],
  ];
  const html = layout({
    eyebrow: `Gem Investigation ${inv.trackingId}`,
    title: `Thank you, ${first}`,
    intro,
    body: `${detailRows(rows)}
    <tr><td style="padding:8px 28px;line-height:1.6;font-size:14px;color:#5f665f">Keep your tracking ID. You can check the status of your request at any time with it and this email address.</td></tr>`,
    button: { url: trackUrl, label: 'Track your request' },
  });
  const text = [
    `Thank you, ${first}.`,
    '',
    intro,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Track your request: ${trackUrl}`,
  ].join('\n');
  return { to: inv.contact.email, subject: `Gem Investigation ${inv.trackingId} received · Geological Kingdom`, html, text };
}

// Sent when the investigation is completed, with the verdict and report
export function investigationCompletedEmail(inv, { trackUrl }) {
  const first = inv.contact.name.split(' ')[0];
  const verdict = VERDICT_LABELS[inv.result.verdict] ?? inv.result.verdict;
  const intro = `Our examination of your ${gemLine(inv)} is complete.`;
  const html = layout({
    eyebrow: `Gem Investigation ${inv.trackingId}`,
    title: `Your result is ready, ${first}`,
    intro,
    body: `${detailRows([['Verdict', verdict]])}
    <tr><td style="padding:8px 28px;line-height:1.6;font-size:14px;white-space:pre-line">${esc(inv.result.summary)}</td></tr>
    ${inv.result.report ? `<tr><td style="padding:8px 28px;font-size:14px"><a href="${esc(absolute(inv.result.report.url))}" style="color:#0b3d2e">Download the full report</a></td></tr>` : ''}`,
    button: { url: trackUrl, label: 'View your result' },
  });
  const text = [
    `Your result is ready, ${first}.`,
    '',
    intro,
    '',
    `Verdict: ${verdict}`,
    '',
    inv.result.summary,
    ...(inv.result.report ? ['', `Report: ${absolute(inv.result.report.url)}`] : []),
    '',
    `View your result: ${trackUrl}`,
  ].join('\n');
  return { to: inv.contact.email, subject: `Gem Investigation ${inv.trackingId}: result ready · Geological Kingdom`, html, text };
}
