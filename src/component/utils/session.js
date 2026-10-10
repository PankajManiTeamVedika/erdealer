// The backend's login/OTP-verify responses return the dealer's primary key as `id`,
// but every other screen in the app reads it via `dealer_id` (DealerRoute.jsx,
// ApplicantVerification.jsx, DealerDetails.jsx, etc.). Merging a fresh API response
// into the stored user WITHOUT this remap silently breaks every dealer_id-dependent
// screen — this exact mismatch already broke the manufacturer list once
// (ApplicantVerification.jsx read `.id` instead of `.dealer_id`). Always merge new
// user/session data through this helper instead of spreading the API response directly,
// so the mapping can't be accidentally dropped during a future refactor.
export const normaliseSession = (existingUser, newData) => ({
  ...existingUser,
  ...newData,
  dealer_id: newData?.dealer_id ?? newData?.id ?? existingUser?.dealer_id,
});
