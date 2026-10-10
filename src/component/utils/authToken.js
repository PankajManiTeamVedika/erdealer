// Bearer token lives only in memory, never in localStorage — an XSS payload that
// dumps localStorage (dealer_id, role, OTP data) can no longer walk away with the
// token needed to call authenticated FI/HO endpoints. Trade-off: a hard page
// refresh clears it, so token-authenticated calls (SanctionReview, FinalReview)
// will need a fresh login after a refresh — that's intended, not a bug.
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token || null;
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
  authToken = null;
};
