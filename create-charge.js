// POST /api/create-charge
// Body: { items: [{id, qty}], customer: { name, phone, fulfilment, address, tableNumber } }
// Returns: { url, orderId }  — url is Tap's hosted payment page; redirect the browser there.
//
// SECURITY NOTE: the total charged is always recomputed here from lib/menu-data.js.
// We never trust a price or total sent from the browser.

const { findItem } = require('../lib/menu-data');

function generateOrderId() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `AR-${n}`;
}

// Kuwait phone numbers: strip spaces/dashes/leading +965 if present, keep digits only.
function parsePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const withoutCountry = digits.startsWith('965') ? digits.slice(3) : digits;
  return withoutCountry || digits;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const TAP_SECRET_KEY = process.env.TAP_SECRET_KEY;
  if (!TAP_SECRET_KEY) {
    console.error('TAP_SECRET_KEY is not set');
    res.status(500).json({ error: 'Payments are not configured yet.' });
    return;
  }

  try {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const customer = body.customer || {};

    if (items.length === 0) {
      res.status(400).json({ error: 'Cart is empty.' });
      return;
    }
    if (!customer.name || !customer.phone) {
      res.status(400).json({ error: 'Name and phone are required.' });
      return;
    }

    // Recompute total server-side from the authoritative price list.
    let total = 0;
    const lineItemsForMetadata = [];
    for (const line of items) {
      const item = findItem(line.id);
      const qty = Math.max(1, Math.min(50, parseInt(line.qty, 10) || 0));
      if (!item || qty === 0) {
        res.status(400).json({ error: `Unknown item or quantity: ${line.id}` });
        return;
      }
      total += item.price * qty;
      lineItemsForMetadata.push(`${item.id}x${qty}`);
    }
    total = Math.round(total * 1000) / 1000; // KWD has 3 decimal places

    const orderId = generateOrderId();
    const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;

    const chargePayload = {
      amount: total,
      currency: 'KWD',
      customer_initiated: true,
      threeDSecure: true,
      save_card: false,
      description: `Altitude Roasters order ${orderId}`,
      customer: {
        first_name: String(customer.name).slice(0, 60),
        phone: {
          country_code: '965',
          number: parsePhone(customer.phone),
        },
      },
      source: { id: 'src_all' }, // lets the customer choose KNET, cards, Apple Pay, etc.
      redirect: { url: `${siteUrl}/payment-return.html` },
      post: { url: `${siteUrl}/api/tap-webhook` },
      reference: { transaction: orderId, order: orderId },
      metadata: {
        order_id: orderId,
        fulfilment: String(customer.fulfilment || '').slice(0, 20),
        address: String(customer.address || '').slice(0, 200),
        table_number: String(customer.tableNumber || '').slice(0, 20),
        items: lineItemsForMetadata.join(','),
      },
    };

    const tapRes = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TAP_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chargePayload),
    });

    const tapData = await tapRes.json();

    if (!tapRes.ok || !tapData?.transaction?.url) {
      console.error('Tap charge creation failed:', tapData);
      res.status(502).json({ error: 'Could not start payment. Please try again.' });
      return;
    }

    res.status(200).json({ url: tapData.transaction.url, orderId });
  } catch (err) {
    console.error('create-charge error:', err);
    res.status(500).json({ error: 'Something went wrong starting payment.' });
  }
};
