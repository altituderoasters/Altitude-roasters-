// Vercel Serverless Function — checks the status of a MyFatoorah payment
// after the customer is redirected back from the hosted payment page.
// Called by payment-return.html with the paymentId MyFatoorah appends to
// the CallBackUrl/ErrorUrl.
//
// Requires the same MYFATOORAH_API_KEY / MYFATOORAH_ENV environment
// variables as api/create-charge.js.

const MYFATOORAH_BASE =
  process.env.MYFATOORAH_ENV === 'test'
    ? 'https://apitest.myfatoorah.com'
    : 'https://api.myfatoorah.com';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const paymentId = req.query.paymentId;
  if (!paymentId) {
    res.status(400).json({ error: 'Missing paymentId' });
    return;
  }

  const apiKey = process.env.MYFATOORAH_API_KEY;
  if (!apiKey) {
    console.error('MYFATOORAH_API_KEY is not set.');
    res.status(500).json({ error: 'Payment gateway is not configured.' });
    return;
  }

  try {
    const mfRes = await fetch(MYFATOORAH_BASE + '/v2/GetPaymentStatus', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ Key: paymentId, KeyType: 'PaymentId' }),
    });

    const data = await mfRes.json();

    if (!mfRes.ok || !data.IsSuccess || !data.Data) {
      console.error('MyFatoorah GetPaymentStatus failed:', data);
      res.status(502).json({ error: 'Could not verify payment.' });
      return;
    }

    // InvoiceStatus is one of: "Paid", "Pending", "Failed", "Expired"
    res.status(200).json({
      status: data.Data.InvoiceStatus,
      invoiceId: data.Data.InvoiceId,
      paidAmount: data.Data.InvoiceValue,
      reference: data.Data.CustomerReference,
    });
  } catch (err) {
    console.error('verify-payment error:', err);
    res.status(500).json({ error: 'Something went wrong verifying payment.' });
  }
};
