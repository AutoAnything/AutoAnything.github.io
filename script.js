/* ========================================================
 * Pico Macro Builder — Stripe Checkout Integration
 * ========================================================
 *
 * PRICE: €29.99 (excluding delivery fee)
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Stripe account at https://dashboard.stripe.com
 * 2. In the Stripe Dashboard, go to "Products" → "Add product"
 * 3. Create a product named "Pico Macro Builder"
 * 4. Add a price: €29.99, one-time payment (EUR)
 * 5. Copy the Price ID (looks like: price_XXXXXXXXXXXXXX)
 * 6. Copy your Publishable Key from "Developers" → "API keys"
 * 7. Replace the values below in STRIPE_CONFIG
 * 8. Set your success/cancel URLS in RETURN_URLS
 *
 * For a static site, this is the simplest Stripe integration —
 * no backend server required.
 * ========================================================
 */

const STRIPE_CONFIG = {
  // ⚠️ Replace with your actual Stripe publishable key
  //     Find it at: https://dashboard.stripe.com/test/apikeys
  publishableKey: "pk_test_REPLACE_WITH_YOUR_PUBLISHABLE_KEY",

  // ⚠️ Replace with your actual Price ID
  //     Create the price at: https://dashboard.stripe.com/test/products
  //     Price: €29.99, currency: EUR, type: "One-time"
  priceId: "price_REPLACE_WITH_YOUR_PRICE_ID",

  // Product details
  productName: "Pico Macro Builder",
  price: "€29.99",
};


// Return URLs — relative paths resolved to absolute URLs at runtime.
// Stripe Checkout requires fully-qualified URLs (https://...).
const RETURN_URLS = {
  // Success page (shown after successful payment)
  successUrl: window.location.origin + window.location.pathname.replace(/[^/]+$/, "") + "success.html",
  // Cancel page (shown if user cancels checkout)
  cancelUrl: window.location.origin + window.location.pathname.replace(/[^/]+$/, "") + "cancel.html",
};

// Initialize Stripe.js
let stripe = null;
let isStripeReady = false;

function initStripe() {
  try {
    stripe = Stripe(STRIPE_CONFIG.publishableKey);
    isStripeReady = true;
  } catch (err) {
    console.error("Failed to initialize Stripe:", err);
    showMessage(
      "Stripe failed to initialize. Please check your publishable key in script.js.",
      "error"
    );
  }
}

// Wait for Stripe.js to load before initializing
if (window.Stripe) {
  initStripe();
} else {
  // Stripe.js may load asynchronously; set up a short polling fallback
  let retries = 0;
  const maxRetries = 50;
  const interval = setInterval(() => {
    if (window.Stripe) {
      clearInterval(interval);
      initStripe();
    } else if (retries >= maxRetries) {
      clearInterval(interval);
      showMessage(
        "Stripe.js failed to load. Please check your internet connection.",
        "error"
      );
    }
    retries++;
  }, 100);
}

// Show a status/error message below the clicked button
function showMessage(message, type) {
  const existing = document.querySelector(".stripe-message");
  if (!existing) return;
  existing.textContent = message;
  existing.style.display = "block";
  existing.style.background =
    type === "error"
      ? "rgba(248, 113, 113, 0.1)"
      : "rgba(16, 185, 129, 0.1)";
  existing.style.borderColor =
    type === "error"
      ? "rgba(248, 113, 113, 0.3)"
      : "rgba(16, 185, 129, 0.3)";
  existing.style.color =
    type === "error" ? "#fca5a5" : "#6ee7b7";
  setTimeout(() => {
    existing.style.display = "none";
  }, 6000);
}

// Redirect to Stripe Checkout
async function redirectToCheckout() {
  if (!isStripeReady || !stripe) {
    showMessage(
      "Stripe is not ready yet. Please wait a moment and try again.",
      "error"
    );
    return;
  }

  if (!STRIPE_CONFIG.priceId || STRIPE_CONFIG.priceId.includes("REPLACE")) {
    showMessage(
      "⚠️ Please configure your Stripe Price ID in script.js first.\n" +
        "Steps:\n" +
        "1. Go to https://dashboard.stripe.com and sign in\n" +
        "2. Create a Product with a one-time price of €29.99 EUR\n" +
        "3. Copy the Price ID (starts with 'price_')\n" +
        "4. Paste it into STRIPE_CONFIG.priceId in script.js",
      "error"
    );
    return;
  }

  if (!STRIPE_CONFIG.publishableKey || STRIPE_CONFIG.publishableKey.includes("REPLACE")) {
    showMessage(
      "⚠️ Please configure your Stripe publishable key in script.js first.\n" +
        "Get it from: https://dashboard.stripe.com/test/apikeys",
      "error"
    );
    return;
  }

  try {
    const { error } = await stripe.redirectToCheckout({
      mode: "payment",
      lineItems: [
        {
          price: STRIPE_CONFIG.priceId,
          quantity: 1,
        },
      ],
      successUrl: RETURN_URLS.successUrl,
      cancelUrl: RETURN_URLS.cancelUrl,
    });

    if (error) {
      showMessage("Checkout error: " + error.message, "error");
    }
  } catch (err) {
    showMessage("Unexpected error: " + err.message, "error");
  }
}

// Attach click handlers to all checkout buttons
document.addEventListener("DOMContentLoaded", function () {
  const buttons = [
    document.getElementById("checkout-btn"),
    document.getElementById("checkout-btn-2"),
  ];

  buttons.forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        redirectToCheckout();
      });
    }
  });
});
