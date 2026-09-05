// POST /api/tap-webhook
// Tap calls this directly from its own servers after a charge finishes —
// this fires even if the customer closes their browser before being
// redirected back, so it's the one signal you can fully rely on.
//
// Every request is verified with Tap's "hashstring" signature before we
// trust anything in it. Formula from Tap's docs (developers.tap.company/docs/webhook):
//   hmac_sha256( "x_id"+id+"x_amount"+amount+"x_currency"+currency+
//                "x_gateway_reference"+gatewayRef+"x_payment_reference"+paymentRef+
//                "x_status"+status+"x_created"+created , TAP_SECRET_KEY )
// compared against the "hashstring" request header.

const crypto = require('crypto');

// KWD, BHD, OMR, JOD use 3 decimal places; most others use 2.
const THREE_DECIMAL_CURRENCIES = new Set(['KWD', 'BHD', 'OMR', 'JOD']);

function formatAmount(amount, currency) {
  const decimals = THREE_DECIMAL_CURRENCIES.has(currency) ? 3 : 2;
  return Number(amount).toFixed(decimals);
}

function isValidSignature(charge, headerHashstring, secretKey) {
  if (!headerHashstring) return false;
  const amountStr = formatAmount(charge.amount, charge.currency);
  const toHash =
    'x_id' + charge.id +
    'x_amount' + amountStr +
    'x_currency' + charge.currency +
    'x_gateway_reference' + (charge.reference?.gateway || '') +
    'x_payment_reference' + (charge.reference?.payment || '') +
    'x_status' + charge.status +
    'x_created' + charge.transaction?.created;
  const computed = crypto.createHmac('sha256', secretKey).update(toHash).digest('hex');
  return computed === headerHashstring;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const TAP_SECRET_KEY = process.env.TAP_SECRET_KEY;
  if (!TAP_SECRET_KEY) {
    console.error('TAP_SECRET_KEY is not set');
    res.status(500).send('Not configured');
    return;
  }

  const charge = req.body;
  const headerHashstring = req.headers['hashstring'];

  if (!charge?.id || !isValidSignature(charge, headerHashstring, TAP_SECRET_KEY)) {
    console.warn('Webhook rejected: signature mismatch', charge?.id);
    res.status(400).send('Invalid signature');
    return;
  }

  const orderId = charge.reference?.order || charge.metadata?.order_id || 'unknown';

  if (charge.status === 'CAPTURED') {
    // ============================================================
    // FULFILMENT INTEGRATION POINT
    // ------------------------------------------------------------
    // This is the moment to actually act on a paid order — e.g.:
    //  - send yourself/staff a WhatsApp or email notification
    //  - print a ticket, or push to a POS/kitchen display
    //  - write a row to a database or spreadsheet
    // charge.metadata has the item ids/quantities and fulfilment
    // type; charge.customer has name/phone.
    // ============================================================
    console.log(`✅ Order ${orderId} paid — KD ${charge.amount}`, charge.metadata);
  } else {
    console.log(`Order ${orderId} webhook: status ${charge.status}`);
  }

  // Tap expects a 200 response to know the webhook was received.
  res.status(200).send('ok');
};
