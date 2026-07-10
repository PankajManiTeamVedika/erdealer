// const BASE_URL = "http://localhost/Pankaj2025/dealer-api/public/api";
const BASE_URL = "https://vfpl.teamvedika.com/dealer-api/public/api";
// const BASE_URL_CUSTOMER = "https://weblosapi.teamvedika.com/api/sweb/v1/";  Production
const BASE_URL_CUSTOMER = "https://weblos.teamvedika.com/api/sweb/v1";  //  UAT

const BASE_URL_STATE = "https://teamvedika.com/APILocation/location_api.php";
const BASE_URL_CIBIL = "https://uat.teamvedika.com/checkCbStatusForSweb";
// const BASE_URL_CIBIL = "https://swatahlos.teamvedika.com/checkCbStatusForSweb";  Production

export const API = {
  LOGIN: `${BASE_URL}/login`,
  OTP_VERIFY: `${BASE_URL}/verify-otp`,
  MANUFACTURERS: `${BASE_URL}/manufacturers`,
  DEALER_ONBOARDING: `${BASE_URL}/dealer-onboarding`,
  DEALERS: `${BASE_URL}/dealers`,
  VERIFY_PAN: `${BASE_URL}/verify/pan`,
   MANUFACTURERS_DEALER: `${BASE_URL}/dealers/manufacturers`,
   SEND_OTP: `${BASE_URL}/send-otp`,
   CUSTOMERSTAGE_FIRST:`${BASE_URL}/application/create`,
   CUSTOMERSTAGE_SECOND:`${BASE_URL}/application/stage2`,
   CUSTOMERSTAGE_THIRD:`${BASE_URL}/application/stage3`,
   CUSTOMERS_STAGE3: `${BASE_URL}/customers/stage3`,
   CUSTOMER_DETAILS: `${BASE_URL}/customer`,
   FI_SAVE_API: `${BASE_URL}/fi/save`,
   // Real, confirmed-working implementation (per curl test). Same raw-IP caveat as
   // FI_SAVE_API: plain http:// on an IP — browsers will block this with CORS/mixed-content
   // when called from an https-served app until it's proxied or fronted by an HTTPS domain.
   SANCTION_SAVE_API: `https://uat.teamvedika.com/api/er-loan/save-sanction`,
   INITIATE_MANDATE_API: `https://uat.teamvedika.com/api/er-loan/initiate-mandate`,

  //  Customer Onboarding ThirdParty
    generateOtp: `${BASE_URL_CUSTOMER}/auth/otp/generate`,
    verifyOtp: `${BASE_URL_CUSTOMER}/auth/otp/verify`,
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

