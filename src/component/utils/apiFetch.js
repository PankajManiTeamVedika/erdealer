import { getAuthToken, clearAuthToken } from "./authToken";

// Wraps fetch for Bearer-authenticated calls (SanctionReview.jsx, FinalReview.jsx —
// the only endpoints that actually send a token). Previously an expired token just
// produced a silent 401 with no indication of what went wrong. Now: clear the stale
// session and hard-redirect to login with a flag so Login.jsx can show a
// "session expired" message, instead of leaving the user staring at a failed save.
export const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (res.status === 401) {
    clearAuthToken();
    localStorage.removeItem("user");
    window.location.assign("/?sessionExpired=1");
    throw new Error("Session expired — please log in again.");
  }

  return res;
};
