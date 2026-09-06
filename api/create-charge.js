// Vercel Serverless Function — creates a MyFatoorah invoice/payment link.
//
// SETUP REQUIRED (one-time, in the Vercel dashboard):
//   Project → Settings → Environment Variables → add:
//     MYFATOORAH_API_KEY   = <your MyFatoorah API token>
//     MYFATOORAH_ENV       = "live"  (or "test" to use MyFatoorah's test API)
//
// Never put the API key directly in this file or commit it to GitHub —
// environment variables keep it server-side only, which is required for
// PCI-safe payment handling.

const MENU_ITEMS = require('./_lib/menu-items');

const MYFATOORAH_BASE =
  process.env.MYFATOORAH_ENV === 'test'
    ? 'https://apitest.myfatoorah.com'
    : 'https://api.myfatoorah.com';

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

    // Recompute the total server-side from our own price list — never
    // trust a total (or per-item price) sent from the browser.
    let total = 0;
    for (const line of items) {
      const menuItem = MENU_ITEMS[line.id];
      const qty = Number(line.qty);
      if (!menuItem || !Number.isFinite(qty) || qty <= 0) {
        res.status(400).json({ error: 'Invalid item in cart: ' + line.id });
        return;
      }
      total += menuItem.price * qty;
    }
    // KWD uses 3 decimal places.
    total = Math.round(total * 1000) / 1000;

    if (total <= 0) {
      res.status(400).json({ error: 'Invalid order total.' });
      return;
    }

    const apiKey = process.env.MYFATOORAH_API_KEY;
    if (!apiKey) {
      console.error('MYFATOORAH_API_KEY is not set.');
      res.status(500).json({ error: 'Payment gateway is not configured.' });
      return;
    }

    // Build an absolute URL back to this same site for MyFatoorah to
    // redirect to once the customer finishes paying.
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = 'https://' + host;
    const orderRef = 'AR-' + Date.now();

    const payload = {
      CustomerName: (customer && customer.name) || 'Guest',
      NotificationOption: 'LNK', // generate a payment link only — no SMS/email sent by MyFatoorah
      InvoiceValue: total,
      CustomerMobile: (customer && customer.phone) || undefined,
      DisplayCurrencyIso: 'KWD',
      CallBackUrl: origin + '/payment-return.html?ref=' + orderRef,
      ErrorUrl: origin + '/payment-return.html?ref=' + orderRef + '&status=error',
      Language: 'EN',
      CustomerReference: orderRef,
      SourceInfo: 'Altitude Roasters Menu',
    };

    const mfRes = await fetch(MYFATOORAH_BASE + '/v2/SendPayment', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const mfData = await mfRes.json();

    if (!mfRes.ok || !mfData.IsSuccess || !mfData.Data || !mfData.Data.InvoiceURL) {
      const msg =
        (mfData.ValidationErrors && mfData.ValidationErrors.length
          ? mfData.ValidationErrors.map((e) => e.Error).join(', ')
          : mfData.Message) || 'Could not start payment.';
      console.error('MyFatoorah SendPayment failed:', mfData);
      res.status(502).json({ error: msg });
      return;
    }

    res.status(200).json({ url: mfData.Data.InvoiceURL });
  } catch (err) {
    console.error('create-charge error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
