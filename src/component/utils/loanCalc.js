// Single source of truth for the LTV/EMI math — was previously copy-pasted identically
// in OfferSummary.jsx (dealer-facing) and SanctionReview.jsx (HO-facing). A policy rate
// change or formula fix now only needs to happen here instead of in both places, which
// also removes the risk of the two copies drifting and showing different figures.

// Only used to estimate the EMI shown on these two pages — the backend determines and
// stores the actual sanctioned EMI independently.
export const INTEREST_RATE_ANNUAL = 30;

// Returns null when either input is missing/zero — callers decide their own
// display fallback ("0.0" vs "—"), since OfferSummary.jsx and SanctionReview.jsx
// each had a different convention here before this was centralized.
export const calculateLtvRatio = (loanAmount, onRoadPrice) => {
  const principal = parseInt(loanAmount || 0, 10);
  const price = parseInt(onRoadPrice || 0, 10);
  if (!principal || !price) return null;
  return ((principal / price) * 100).toFixed(1);
};

export const calculateMonthlyEmi = (loanAmount, tenureMonths) => {
  const principal = parseInt(loanAmount || 0, 10);
  const tenure = parseInt(tenureMonths || 0, 10);
  if (!principal || !tenure) return 0;

  const monthlyRate = INTEREST_RATE_ANNUAL / 12 / 100;
  return Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
      (Math.pow(1 + monthlyRate, tenure) - 1)
  );
};
