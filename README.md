# Altitude Roasters — menu site + Tap payments

## What changed from before

The site used to be a single HTML file you could just open in a browser.
That's no longer true — **real payments need a server to hold your Tap
secret key**, so this is now a small project with two parts:

- `index.html`, `payment-return.html`, `images/` — the site itself
- `api/` — three small server functions that talk to Tap on your behalf

Because of the `api/` part, you can't just double-click `index.html`
anymore — it needs to be deployed (see below). Once deployed, it works
exactly like before, plus real checkout.

## 1. Get your Tap account and keys

1. Sign up at [tap.company](https://www.tap.company) if you haven't already.
2. In the Tap dashboard, go to **Settings → API Keys**. You'll see a
   **test** secret key (`sk_test_...`) and, once your account is approved
   for live payments, a **live** one (`sk_live_...`).
3. Start with the test key. Test payments don't move real money, so you
   can go through the whole flow safely before going live.

## 2. Deploy to Vercel (free tier is enough)

The easiest path — no command line needed:

1. Go to [vercel.com](https://vercel.com) and sign up (GitHub, GitLab, or
   email all work).
2. Put this whole folder into a GitHub repository (Vercel can also deploy
   by dragging the folder in via their dashboard — look for "Deploy" on
   the Vercel homepage — if you'd rather skip GitHub).
3. In Vercel, click **Add New → Project**, pick this repo/folder, and
   deploy it. No build settings needed — Vercel detects the `api/`
   folder automatically.
4. Once deployed, Vercel gives you a URL like
   `https://altitude-roasters-site.vercel.app`. That's your live menu.

## 3. Add your Tap key to Vercel

1. In your Vercel project, go to **Settings → Environment Variables**.
2. Add one:
   - **Name:** `TAP_SECRET_KEY`
   - **Value:** your `sk_test_...` key from step 1
3. Redeploy (Vercel usually prompts you, or go to **Deployments → ⋯ →
   Redeploy**) so the new variable takes effect.

`.env.example` in this folder shows the format — don't put real keys in
that file, it's just a template.

## 4. Test it end to end

1. Open your Vercel URL, add items to cart, go through checkout.
2. You'll land on Tap's real payment page. Use one of
   [Tap's test cards](https://developers.tap.company) (search their docs
   for "test cards") — these only work against your test key, so nothing
   is charged.
3. You should land back on `payment-return.html` showing "Payment
   confirmed" with your order number.
4. Check your Vercel project's **Logs** tab — you should see a line like
   `✅ Order AR-123456 paid — KD 4.500` from the webhook. That confirms
   the whole loop (charge → redirect → webhook) is working.

## 5. Go live

1. Get your `sk_live_...` key from Tap (this usually requires Tap to
   approve your business first — check your dashboard for what's
   outstanding).
2. Update the `TAP_SECRET_KEY` environment variable in Vercel to the live
   key, and redeploy.
3. Do one small real test purchase yourself to confirm real money moves
   correctly before sharing the link with customers.

## Where orders actually go right now

Right now, a paid order shows up as a line in your Vercel logs — nothing
more. There's no database, no email, no notification to your phone yet.

The natural place to add that is `api/tap-webhook.js` — look for the
comment block labeled `FULFILMENT INTEGRATION POINT`. That's where
you'd add, for example:
- an email or WhatsApp notification to you/staff
- a row written to a spreadsheet or database
- a push to whatever POS system you end up choosing

Happy to help wire up any of those once you know which one you want.

## Adding item photos

Unchanged from before — drop photos into the `images/` folder using the
exact filenames listed in `images/README.txt`. This works the same
whether you're testing locally or live on Vercel.

## Files in this project

```
index.html              — the menu site
payment-return.html     — shown after a customer pays (or cancels)
images/                 — item photos go here
api/create-charge.js    — starts a Tap payment (recomputes the total server-side)
api/verify-charge.js    — checks a payment's real status with Tap
api/tap-webhook.js      — Tap's reliable "this order was paid" signal
lib/menu-data.js        — the real prices, used to prevent tampering
.env.example            — template for the one environment variable you need
```
