// GET /api/verify-charge?tap_id=chg_xxxxx
// Returns a small, safe-to-display summary of a charge's real status.
//
// SECURITY NOTE: the redirect back from Tap can be closed, edited, or replayed
// by the customer — it is NOT proof of payment. We always re-fetch the charge
// from Tap's servers with our secret key before showing "paid" to anyone.

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const TAP_SECRET_KEY = process.env.TAP_SECRET_KEY;
  if (!TAP_SECRET_KEY) {
    res.status(500).json({ error: 'Payments are not configured yet.' });
    return;
  }

  const tapId = req.query?.tap_id;
  if (!tapId || !/^chg_[A-Za-z0-9]+$/.test(tapId)) {
    res.status(400).json({ error: 'Missing or invalid tap_id.' });
    return;
  }

  try {
    const tapRes = await fetch(`https://api.tap.company/v2/charges/${tapId}`, {
      headers: { Authorization: `Bearer ${TAP_SECRET_KEY}` },
    });
    const charge = await tapRes.json();

    if (!tapRes.ok) {
      res.status(502).json({ error: 'Could not verify payment.' });
      return;
    }

    res.status(200).json({
      status: charge.status, // e.g. CAPTURED, FAILED, CANCELLED, ABANDONED, DECLINED
      orderId: charge.reference?.order || null,
      amount: charge.amount,
      currency: charge.currency,
      message: charge.response?.message || '',
    });
  } catch (err) {
    console.error('verify-charge error:', err);
    res.status(500).json({ error: 'Something went wrong verifying payment.' });
  }
};
