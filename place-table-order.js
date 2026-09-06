// Vercel Serverless Function — for "Table" orders only. Skips the payment
// gateway entirely and instead posts the order straight to a Slack channel
// so staff can bring a POS machine to the table and take payment in person.
//
// SETUP REQUIRED (one-time):
//   1. In Slack: create an Incoming Webhook for the channel staff will
//      watch (Slack → your workspace → Settings & administration → Manage
//      apps → search "Incoming Webhooks" → Add to Slack → pick the channel
//      → copy the Webhook URL it gives you, looks like
//      https://hooks.slack.com/services/XXX/YYY/ZZZ).
//   2. In Vercel: Project → Settings → Environment Variables → add:
//        SLACK_WEBHOOK_URL = <the URL from step 1>
//      Then redeploy.
//
// Never put the webhook URL directly in this file — anyone with that URL
// can post messages into your Slack channel, so it must stay a server-side
// environment variable, not something shipped in the browser bundle.

const MENU_ITEMS = require('./_lib/menu-items');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { items, customer } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    if (!customer || !customer.tableNumber || !String(customer.tableNumber).trim()) {
      res.status(400).json({ error: 'Missing table number.' });
      return;
    }

    // Recompute the total and item names server-side from our own menu
    // data — never trust prices or item labels sent from the browser.
    let total = 0;
    const lines = [];
    for (const line of items) {
      const menuItem = MENU_ITEMS[line.id];
      const qty = Number(line.qty);
      if (!menuItem || !Number.isFinite(qty) || qty <= 0) {
        res.status(400).json({ error: 'Invalid item in cart: ' + line.id });
        return;
      }
      total += menuItem.price * qty;
      lines.push('• ' + menuItem.name + ' × ' + qty);
    }
    total = Math.round(total * 1000) / 1000; // KWD uses 3 decimal places

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('SLACK_WEBHOOK_URL is not set.');
      res.status(500).json({ error: 'Table ordering is not configured yet. Please flag a waiter.' });
      return;
    }

    const orderRef = 'TBL-' + Date.now();
    const tableNumber = String(customer.tableNumber).trim();
    const customerName = customer.name || 'Guest';
    const customerPhone = customer.phone || '';

    const slackText =
      ':bell: *New table order — Table ' + tableNumber + '*\n' +
      lines.join('\n') +
      '\n*Total:* KD ' + total.toFixed(3) +
      '\n*Name:* ' + customerName +
      (customerPhone ? '  |  *Phone:* ' + customerPhone : '') +
      '\n_Ref: ' + orderRef + ' — customer will pay by card/POS at the table._';

    const slackRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: slackText }),
    });

    if (!slackRes.ok) {
      const body = await slackRes.text();
      console.error('Slack webhook failed:', slackRes.status, body);
      res.status(502).json({ error: 'Could not send your order. Please flag a waiter.' });
      return;
    }

    res.status(200).json({ ok: true, ref: orderRef });
  } catch (err) {
    console.error('place-table-order error:', err);
    res.status(500).json({ error: 'Something went wrong. Please flag a waiter.' });
  }
};
