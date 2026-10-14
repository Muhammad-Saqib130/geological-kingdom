import { env } from '../config/env.js';
import { MANUAL_METHODS } from '../models/Order.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pkr = (n) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

export const METHOD_LABELS = {
  cod: 'Cash on delivery',
  bank: 'Bank transfer',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  card: 'Card (Stripe)',
};

// Lines of account details for the chosen manual method
function accountLines(method, accounts = {}) {
  const a = accounts[method] ?? {};
  if (method === 'bank') {
    return [['Bank', a.bankName], ['Account title', a.accountTitle], ['Account number', a.accountNumber], ['IBAN', a.iban]].filter(([, v]) => v);
  }
  return [['Account title', a.accountTitle], ['Number', a.number]].filter(([, v]) => v);
}

// Builds the order confirmation email. `orderUrl` includes the guest access token.
export function orderConfirmationEmail(order, { orderUrl, paymentAccounts }) {
  const method = order.payment.method;
  const manual = MANUAL_METHODS.includes(method);
  const addr = order.shippingAddress;
  const subject = `Order ${order.orderNumber} confirmed · Geological Kingdom`;

  let paymentText;
  if (method === 'cod') paymentText = `Please keep ${pkr(order.totalPKR)} ready in cash when your parcel arrives.`;
  else if (method === 'card') paymentText = `Your card payment has been received. Thank you.`;
  else paymentText = `Please send ${pkr(order.totalPKR)} by ${method === 'bank' ? 'bank transfer' : METHOD_LABELS[method]} using your order number ${order.orderNumber} as the reference, then upload a screenshot of the payment on your order page. Your stones are reserved for 48 hours.`;

  const accounts = manual ? accountLines(method, paymentAccounts) : [];

  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #ebe4d4">${esc(i.name)}<br><span style="color:#5f665f;font-size:12px">${esc([i.category, i.carat && `${i.carat} ct`].filter(Boolean).join(' · '))}${i.qty > 1 ? ` · × ${i.qty}` : ''}</span></td>
        <td style="padding:10px 0;border-bottom:1px solid #ebe4d4;text-align:right;white-space:nowrap">${pkr(i.lineTotalPKR)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!doctype html><html><body style="margin:0;background:#f6f2e9;font-family:Helvetica,Arial,sans-serif;color:#1c1f1d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2e9;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
    <tr><td style="background:#0b3d2e;padding:24px;text-align:center;font-family:Georgia,serif;font-size:22px;color:#fbf9f4">Geological <em style="color:#c9a24b">Kingdom</em></td></tr>
    <tr><td style="padding:28px 28px 8px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#a9843a">Order ${esc(order.orderNumber)}</p>
      <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:normal;font-size:26px;color:#0b3d2e">Thank you, ${esc(order.contact.name.split(' ')[0])}</h1>
      <p style="margin:0;line-height:1.6;color:#5f665f">We have received your order and will be in touch as soon as it ships.</p>
    </td></tr>
    <tr><td style="padding:16px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}
        <tr><td style="padding:8px 0;color:#5f665f">Subtotal</td><td style="padding:8px 0;text-align:right">${pkr(order.subtotalPKR)}</td></tr>
        <tr><td style="padding:0 0 8px;color:#5f665f">Shipping (${order.shipping.zone === 'domestic' ? 'Pakistan' : 'international'})</td><td style="padding:0 0 8px;text-align:right">${order.shipping.feePKR ? pkr(order.shipping.feePKR) : 'Free'}</td></tr>
        <tr><td style="padding:10px 0;border-top:1px solid #0b3d2e;font-weight:bold">Total</td><td style="padding:10px 0;border-top:1px solid #0b3d2e;text-align:right;font-weight:bold">${pkr(order.totalPKR)}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:8px 28px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a9843a">Payment · ${esc(METHOD_LABELS[method])}</p>
      <p style="margin:0;line-height:1.6">${esc(paymentText)}</p>
      ${accounts.length ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px;background:#f6f2e9;width:100%">${accounts.map(([k, v]) => `<tr><td style="padding:6px 12px;color:#5f665f">${esc(k)}</td><td style="padding:6px 12px;font-weight:bold">${esc(v)}</td></tr>`).join('')}</table>` : ''}
    </td></tr>
    <tr><td style="padding:16px 28px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a9843a">Shipping to</p>
      <p style="margin:0;line-height:1.6;font-size:14px">${esc(addr.fullName)}<br>${esc(addr.line1)}${addr.line2 ? `<br>${esc(addr.line2)}` : ''}<br>${esc([addr.city, addr.province, addr.postalCode].filter(Boolean).join(', '))}<br>${esc(addr.country)}<br>${esc(addr.phone)}</p>
    </td></tr>
    <tr><td style="padding:16px 28px 32px;text-align:center">
      <a href="${esc(orderUrl)}" style="display:inline-block;background:#0b3d2e;color:#fbf9f4;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:13px;letter-spacing:2px;text-transform:uppercase">${manual ? 'Upload payment proof' : 'View your order'}</a>
    </td></tr>
  </table>
  <p style="font-size:12px;color:#5f665f;margin:16px 0 0">Geological Kingdom · Namak Mandi, Peshawar, Pakistan</p>
  </td></tr></table></body></html>`;

  const text = [
    `Thank you for your order ${order.orderNumber}.`,
    '',
    ...order.items.map((i) => `- ${i.name}${i.qty > 1 ? ` x ${i.qty}` : ''}: ${pkr(i.lineTotalPKR)}`),
    `Subtotal: ${pkr(order.subtotalPKR)}`,
    `Shipping: ${order.shipping.feePKR ? pkr(order.shipping.feePKR) : 'Free'}`,
    `Total: ${pkr(order.totalPKR)}`,
    '',
    `Payment: ${METHOD_LABELS[method]}. ${paymentText}`,
    ...accounts.map(([k, v]) => `${k}: ${v}`),
    '',
    `Your order: ${orderUrl}`,
  ].join('\n');

  return { to: order.contact.email, subject, html, text };
}

export const orderUrlFor = (order, token) => `${env.clientUrl}/order/${order.orderNumber}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
