/* Moyo configuration — EDIT THESE BEFORE LAUNCH */
window.MOYO_CONFIG = {
  // 1) YOUR Bitcoin receiving address (no KYC needed — self-custody).
  //    Get one from any wallet app (BlueWallet, Trust Wallet, Exodus...).
  BTC_ADDRESS: "REPLACE_WITH_YOUR_BTC_ADDRESS",

  // 2) Plans (USD). BTC amount is computed live at checkout.
  PLANS: {
    monthly:  { id: "monthly",  name: "Monthly",  usd: 3.99,  days: 30  },
    yearly:   { id: "yearly",   name: "Yearly",   usd: 29.99, days: 365 },
    lifetime: { id: "lifetime", name: "Lifetime", usd: 79.00, days: 0   }
  },

  // Free tier limits
  FREE_MAX_RITUALS: 3,

  // Pet growth thresholds (total ritual check-ins)
  PET_STAGES: [0, 5, 15, 30],

  APP_NAME: "Moyo",
  TAGLINE: "Grow a calmer mind, one puff at a time."
};
