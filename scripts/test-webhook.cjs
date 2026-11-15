// Sends a SIGNED, simulated "payment received" event to the deployed webhook, to check that the
// server verifies the signature and marks the charge as paid. No real money moves.
// Usage (values come from the environment, never from the repo):
//   WEBHOOK_URL=https://... WEBHOOK_SECRET=whsec_... CHARGE_ID=<id shown in the app> node scripts/test-webhook.cjs
const { Webhook } = require('standardwebhooks');

const { WEBHOOK_URL, WEBHOOK_SECRET, CHARGE_ID } = process.env;
if (!WEBHOOK_URL || !WEBHOOK_SECRET || !CHARGE_ID) {
  console.error('Set WEBHOOK_URL, WEBHOOK_SECRET and CHARGE_ID.');
  process.exit(1);
}

const payload = JSON.stringify({
  type: 'codi.pn.payment_received',
  amount: 0.01,
  concept: 'Prueba',
  datePaid: Math.floor(Date.now() / 1000),
  transactionId: 'TEST' + Date.now(),
  metadata: { chargeId: CHARGE_ID },
});

const id = 'msg_' + Date.now();
const ts = new Date();
const signature = new Webhook(WEBHOOK_SECRET).sign(id, ts, payload);

(async () => {
  const send = async (label, sig) => {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'webhook-id': id,
        'webhook-timestamp': String(Math.floor(ts.getTime() / 1000)),
        'webhook-signature': sig,
      },
      body: payload,
    });
    console.log(label, res.status, await res.text());
  };
  await send('bad signature (expect 401):', 'v1,AAAA');
  await send('good signature (expect 200 ok):', signature);
  await send('same event again (expect 200 already recorded):', signature);
})();
