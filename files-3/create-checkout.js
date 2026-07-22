// netlify/functions/create-checkout.js
//
// This function runs on Netlify's servers, never in the browser — so your
// Stripe secret key stays private. It reads the key from an environment
// variable (STRIPE_SECRET_KEY) that you set in the Netlify dashboard under
// Site settings -> Environment variables. Never paste the actual key into
// this file.
//
// Pricing is decided here, server-side, based on a "type" sent from the
// front end. Never trust a price sent directly from the browser — always
// map a type/id to a price on the server, like below.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_TABLE = {
  custom: {
    name: 'Custom Hand-Painted Banner — Brush & Bloom Banners',
    description: 'Deposit to begin your custom hand-painted banner order.',
    unit_amount: 5500, // $55.00
  },
  ready: {
    name: 'Ready to Ship Banner — Brush & Bloom Banners',
    description: 'Payment for your in-stock, ready-to-ship banner.',
    unit_amount: 4000, // $40.00
  },
};

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let type = 'custom';
  try {
    const body = JSON.parse(event.body || '{}');
    if (body.type && PRICE_TABLE[body.type]) {
      type = body.type;
    }
  } catch (err) {
    // If parsing fails, fall back to the default 'custom' tier.
  }

  const item = PRICE_TABLE[type];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.name,
              description: item.description,
            },
            unit_amount: item.unit_amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.URL}/payment-success.html?type=${type}`,
      cancel_url: `${process.env.URL}/pay-your-banner.html?type=${type}`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
