// Base URLs come from environment variables (see .env at the project root — add a
// .env.production to override for a prod deploy) so switching environments is a config
// change, not a code edit. Each falls back to the current UAT value if the env var
// isn't set, so an existing build/checkout without the .env file keeps working exactly
// as before.
export const DEALER_API_BASE = process.env.REACT_APP_DEALER_API_BASE || "https://vfpl.teamvedika.com/dealer-api";
const BASE_URL = `${DEALER_API_BASE}/public/api`;
const BASE_URL_CUSTOMER =  "https://weblosapi.teamvedika.com/api/sweb/v1";

const BASE_URL_STATE = process.env.REACT_APP_LOCATION_API_BASE || "https://teamvedika.com/APILocation/location_api.php";
const BASE_URL_UAT = process.env.REACT_APP_UAT_API_BASE || "https://erapi.teamvedika.com";
const BASE_URL_CIBIL = `${BASE_URL_UAT}/checkCbStatusForSweb`;

// TODO: paste your Google Maps Geocoding API key here.
export const GOOGLE_MAPS_API_KEY = "";

export const API = {
  LOGIN: `${BASE_URL}/login`,
  OTP_VERIFY: `${BASE_URL}/verify-mobile-otp`,
  MANUFACTURERS: `${BASE_URL}/manufacturers`,
  DEALER_ONBOARDING: `${BASE_URL}/dealers`,
  DEALERS: `${BASE_URL}/dealers`,
  VERIFY_PAN: `${BASE_URL}/verify/pan`,
   MANUFACTURERS_DEALER: `${BASE_URL}/dealers/manufacturers`,
   // Confirmed via curl: JSON body { mobile }.
   SEND_OTP: `${BASE_URL}/send-otp`,
   // Confirmed via curl: multipart/form-data body { mobile, otp }.
   VERIFY_MOBILE_OTP: `${BASE_URL}/verify-mobile-otp`,
   CUSTOMERSTAGE_FIRST:`${BASE_URL}/application/create`,
   CUSTOMERSTAGE_SECOND:`${BASE_URL}/application/stage2`,
   CUSTOMERSTAGE_THIRD:`${BASE_URL}/application/stage3`,
   CUSTOMERS_STAGE3: `${BASE_URL}/customers/stage3`,
   CUSTOMER_DETAILS: `${BASE_URL}/customer`,
   FI_SAVE_API: `${BASE_URL}/fi/save`,
   // Confirmed via curl: GET /er-loan/fi/<cust_id> — returns the saved FI submission
   // record, including request_payload (the exact object CustomerDetails.jsx's
   // buildFiPayload posted: pd_latitude, pd_longitude, vpd_session_id, dist_from_dealer,
   // distance_from_pd_to_customer_km, residence_dtl_address, etc.), api_status, timestamps.
   FI_DETAILS_GET_API: `${BASE_URL}/er-loan/fi`,
   // Confirmed via curl: JSON body { cust_id, kyc_id, emp_id, decision, sanction_amt, sanction_note }.
   SANCTION_SAVE_API: `${BASE_URL}/er-loan/save-sanction`,
   // Confirmed via curl: JSON body { cust_id, kyc_id, emp_id, vehicle_no, engine_no, chassis_no, battery_no, battery_make }.
   VEHICLE_DELIVERY_SAVE_API: `${BASE_URL}/er-loan/save-vehicle-delivery`,
   // Confirmed via curl: GET ?cust_id=<id> — returns the vehicle/battery numbers and the
   // 4 delivery document paths saved by save-vehicle-delivery, for HO review.
   VEHICLE_DELIVERY_GET_API: `${BASE_URL}/er-loan/get-vehicle-delivery`,
   // Confirmed via curl: JSON body { cust_id, verified_by, remarks, action, vehicle_checks[], evidence_checks[] }.
   // action is whichever radio value HO picked: "release" | "referBack" | "verifyRelease".
   HO_DELIVERY_VERIFICATION_SAVE_API: `${BASE_URL}/er-loan/save-ho-delivery-verification`,
   INITIATE_MANDATE_API: `${BASE_URL_UAT}/api/er-loan/initiate-mandate`,
   // Confirmed via curl: JSON body { cust_id, kyc_id } — checks status with NPCI via UAT and saves it.
   // Response: { success, message, log_id, mandate_status, external_response: { loan_dtl_id, umrn, next_step, mandate_id, mandate_complete, status } }.
   CHECK_MANDATE_STATUS_API: `${BASE_URL}/er-loan/check-mandate-status`,
   // Confirmed via curl: x-www-form-urlencoded body { kyc_id, emp_id } — same shape as initiate-mandate.
   INITIATE_ESIGN_API: `${BASE_URL_UAT}/api/er-loan/initiate-esign`,
   // TODO (UNCONFIRMED): placeholder URL/contract, following the same er-loan/* naming
   // convention as the other endpoints on this page — not yet confirmed via curl with
   // backend. Assumed JSON body: { cust_id, kyc_id, emp_id }. Confirm/replace before
   // relying on this in production.
   AUTO_DISBURSEMENT_API: `${BASE_URL}/er-loan/auto-disbursement`,
   BANK_PENNY_DROP_API: `${BASE_URL}/bank-account/verify`,
   BRANCH_LAT_LNG_API: `${BASE_URL_UAT}/api/branch/lat-lng`,
   APPLICATION_ADDRESS_API: `${BASE_URL_UAT}/api/application/address`,
   GEOCODE_API: `https://maps.googleapis.com/maps/api/geocode/json`,

  //  Customer Onboarding ThirdParty
    generateOtp: `${BASE_URL_CUSTOMER}/auth/otp/generate`,
    verifyOtp: `${BASE_URL_CUSTOMER}/auth/otp/verify`,
    // Sends the OTP (same response shape as auth/otp/generate: otp_session_id,
    // expires_in, cooldown_info) AND returns the applicant's saved progress ("stage" +
    // stage_data) for this mobile number, so an in-progress application can resume
    // instead of redoing already-completed Aadhaar/PAN/CB steps.
    checkStage: `${BASE_URL_CUSTOMER}/auth/stage`,
     ekycLinkGenerate: `${BASE_URL_CUSTOMER}/kyc/ekyc/initiate`,
     ekycVerify: `${BASE_URL_CUSTOMER}/kyc/ekyc/webhook`,
     verifyPan: `${BASE_URL_CUSTOMER}/kyc/pan/verify`,
       coverifyPan: `${BASE_URL_CUSTOMER}/kyc/pan/co-applicant/verify`,
      cibilapplicant: `${BASE_URL_CIBIL}`,

      ekycCoApplicantLinkGenerate: `${BASE_URL_CUSTOMER}/kyc/ekyc/co-applicant/initiate`,
      coApplicantEkycVerify: `${BASE_URL_CUSTOMER}/kyc/ekyc/co-applicant/webhook`,
  





  LOCATION_STATES: `${BASE_URL_STATE}?type=state`,
  LOCATION_DISTRICTS: (state) => `${BASE_URL_STATE}?type=district&state=${encodeURIComponent(state)}`,
  LOCATION_BRANCHES: (district) => `${BASE_URL_STATE}?type=branch&district=${encodeURIComponent(district)}`,


};

