// Shared helper for the customer/dealer record's double-encoded JSON columns — was
// previously copy-pasted identically in DealerDetails.jsx, LeadDetails.jsx,
// FinalReview.jsx, and twice in SanctionReview.jsx. The column itself holds a JSON
// string whose value is *another* JSON string (sometimes a third layer), so this keeps
// calling JSON.parse while the result is still a string, instead of parsing just once.
//
// Fields known to need this (confirmed via curl / observed API responses):
//   customer record  — applicant_cb_response, co_applicant_cb_response, penny_drop_response
//   dealer record     — gstin_verify_response, bank_penny_drop_response
//   FI record          — response_payload (and its nested session_data.location / .feedback)
//
// See CUSTOMER_RECORD_SCHEMA.md-equivalent notes in this file's JSDoc typedef below for
// the shape each of these unwraps to.
export const parseStoredJson = (value) => {
  let result = value;
  for (let i = 0; i < 3 && typeof result === "string" && result; i++) {
    try {
      result = JSON.parse(result);
    } catch {
      return null;
    }
  }
  return result && typeof result === "object" ? result : null;
};

/**
 * @typedef {Object} CustomerRecord
 * Partial shape of the customer record returned by CUSTOMER_DETAILS / CUSTOMERS_STAGE3 —
 * documents the fields every FI/HO page (FinalReview.jsx, LeadDetails.jsx,
 * SanctionReview.jsx) reads, and which ones are double-encoded JSON strings that must be
 * unwrapped with parseStoredJson() before use.
 *
 * -- Identity --
 * @property {number} id
 * @property {string} application_id
 *
 * -- Applicant / Co-Applicant --
 * @property {string} applicant_name
 * @property {string} applicant_mobile
 * @property {string} applicant_aadhaar
 * @property {string} applicant_pan
 * @property {string} applicant_gender
 * @property {string} applicant_marital_status
 * @property {string} occupation
 * @property {string} co_applicant_name
 * @property {string} co_applicant_mobile
 * @property {string} co_applicant_relation
 * @property {string} co_applicant_gender
 * @property {string} co_applicant_marital_status
 *
 * -- Double-encoded JSON-string fields (parse with parseStoredJson) --
 * @property {string} applicant_cb_response - unwraps to { cb_score, dpd, odAmount, outstandingBalanceAmount, ... }
 * @property {string} co_applicant_cb_response - same shape as applicant_cb_response
 * @property {string} penny_drop_response - unwraps to { data: { beneficiary_name_with_bank, ... } }
 *
 * -- Bank --
 * @property {string} bank_account_number
 * @property {string} ifsc_code
 * @property {string} bank_name
 *
 * -- Status flags (read through utils/leadStatus.js helpers, not directly) --
 * @property {number} fi_status
 * @property {number} sanction_status
 * @property {number} vehicle_delivery_status - use getVehicleDeliveryStatus(), field is misspelled "vehicle_delevery_status" in the raw API
 * @property {string} mandate_status - string "SUCCESS"/other, use isMandateComplete()
 *
 * -- Vehicle / delivery --
 * @property {string} vehicle_no
 * @property {string} engine_no
 * @property {string} chassis_no
 * @property {string} battery_no
 * @property {string} battery_make
 * @property {string} quotation_image
 *
 * -- Onboarding documents (all plain file paths, not JSON) --
 * @property {string} aadhaar_copy_file
 * @property {string} pan_copy_file
 * @property {string} house_proof_file
 * @property {string} applicant_image
 * @property {string} co_applicant_image
 */
