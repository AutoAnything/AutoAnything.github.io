# Stripe Checkout Setup Guide

## Prerequisites
- A [Stripe](https://dashboard.stripe.com) account (free to create)
- The product webpage files in this folder (`index.html`, `styles.css`, `script.js`, `logo.png`)

## Step 1: Get Your Publishable Key
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API keys**
3. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)

## Step 2: Create the Product & Price
1. In the Stripe Dashboard, go to **Products → Add product**
2. **Product name**: `Pico Macro Builder`
3. **Pricing model**: One-time
4. **Price**: `29.99` 
5. **Currency**: `EUR (€)`
6. Click **Save**
7. Copy the **Price ID** (looks like `price_XXXXXXXXXXXXXX`)

## Step 3: Configure `script.js`
Open `script.js` in a text editor and update the `STRIPE_CONFIG` object:

```js
const STRIPE_CONFIG = {
  publishableKey: "pk_test_YOUR_KEY_HERE",   // ← paste your key
  priceId: "price_YOUR_PRICE_ID_HERE",       // ← paste your Price ID
  productName: "Pico Macro Builder",
  price: "€29.99",
};
```

The `RETURN_URLS` in `script.js` are automatically resolved to absolute URLs based on the current page location, so they'll work both locally and when deployed. No changes needed unless you want to point to external URLs.

## Step 4: Test
1. Open `index.html` in a browser (serve via a local web server, not `file://`)
2. Click **"Buy Now — €29.99"**
3. Stripe Checkout should open with the €29.99 EUR price
4. Use Stripe's test card: `4242 4242 4242 4242` with any future date and any CVC

## Important Notes
- This uses **Stripe Checkout** (client-side only) — no backend server required
- The price is **€29.99 EUR excluding delivery fee**
- Stripe automatically handles EUR currency conversion if the customer's card is in another currency
- You can enable additional payment methods in the Stripe Dashboard under **Settings → Payment methods**
