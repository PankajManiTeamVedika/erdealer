import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../assets/css/SanctionReview.css";
import logo from "../../assets/image/logo.png";
import { API, DEALER_API_BASE } from "../api/apiRoutes";
import { getStatusInfo, getVehicleDeliveryStatus, isMandateComplete } from "../utils/leadStatus";
import { apiFetch } from "../utils/apiFetch";
import { parseStoredJson } from "../utils/parseStoredJson";

const baseURL = DEALER_API_BASE;

// Single consolidated read-only page for HO's final sign-off before disbursement —
// pulls together everything spread across CustomerDetails.jsx/LeadDetails.jsx/
// SanctionReview.jsx/HODeliveryVerification.jsx into one view, so HO doesn't have
// to jump between pages to verify the full customer file.
const FinalReview = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [fiDetails, setFiDetails] = useState(null);
  const [fiDetailsError, setFiDetailsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [disbursementMessage, setDisbursementMessage] = useState(null); // { type: "success" | "error", text }
  const [isDisbursed, setIsDisbursed] = useState(false);
  const [showFiDetails, setShowFiDetails] = useState(false);

  useEffect(() => {
    if (!customerId) return;

    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${baseURL}/public/api/customer/${customerId}?_=${Date.now()}`);
        const result = await res.json();
        if (result.success) {
          setCustomer(result.data);
        } else {
          alert(result.message || "Customer not found");
        }
      } catch (err) {
        console.error("Customer API Error:", err);
        alert("Error fetching customer details");
      } finally {
        setLoading(false);
      }
    };

    // Same endpoint HODeliveryVerification.jsx uses — vehicle identification +
    // the delivery documents the dealer uploaded at the vehicle-delivery stage.
    const fetchDelivery = async () => {
      try {
        const res = await fetch(`${API.VEHICLE_DELIVERY_GET_API}?cust_id=${customerId}&_=${Date.now()}`);
        const result = await res.json();
        if (result.success) setDelivery(result.data);
      } catch (err) {
        console.error("Vehicle delivery fetch error:", err);
      }
    };

    // Confirmed via curl: GET /er-loan/fi/<cust_id> — the saved FI submission record
    // (request_payload + response_payload, the latter populated once the Video PD
    // session actually completes). Same endpoint SanctionReview.jsx uses.
    const fetchFiDetails = async () => {
      const custId = parseInt(customerId, 10);
      if (!custId) return;
      try {
        const res = await apiFetch(`${API.FI_DETAILS_GET_API}/${custId}`, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || `Failed to fetch FI details (HTTP ${res.status})`);
        }
        setFiDetails(data?.data || null);
      } catch (err) {
        console.error("FI details fetch error:", err);
        setFiDetailsError(err.message || "Failed to fetch Video PD / FI details");
      }
    };

    fetchCustomer();
    fetchDelivery();
    fetchFiDetails();
  }, [customerId]);

  const getFullUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `${baseURL}/${url}`;
  };

  const renderDocValue = (url) => {
    const fullUrl = getFullUrl(url);
    if (!fullUrl) return <span className="value">Not uploaded</span>;
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="value doc-value-link">
        View →
      </a>
    );
  };

  const applicantCb = parseStoredJson(customer?.applicant_cb_response) || {};
  const coApplicantCb = parseStoredJson(customer?.co_applicant_cb_response) || {};
  const pennyDropData = parseStoredJson(customer?.penny_drop_response)?.data || {};

  const status = getStatusInfo(customer || {});

  // Final disbursement trigger — only meaningful once the whole funnel is complete
  // (sanctioned, vehicle delivered & HO-approved, mandate/eSign done).
  // AUTO_DISBURSEMENT_API (apiRoutes.js) is still UNCONFIRMED with the backend team —
  // real URL/body/response shape unverified. We now actually call it instead of
  // silently marking "Disbursed" client-side: a 404/failure surfaces as an error so
  // HO is never shown a false success. Once the endpoint is confirmed, only the
  // request body/response parsing below may need adjusting.
  const handleAutoDisbursement = async () => {
    setDisbursementMessage(null);
    setIsDisbursing(true);

    const custId = parseInt(customerId, 10) || customer?.id || null;
    const kycId = parseInt(customer?.kyc_id, 10) || parseInt(localStorage.getItem("applicant_kyc_id"), 10) || null;
    const empId = parseInt(localStorage.getItem("emp_id"), 10) || null;

    try {
      const res = await apiFetch(API.AUTO_DISBURSEMENT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cust_id: custId, kyc_id: kycId, emp_id: empId }),
      });

      let data = null;
      try { data = await res.json(); } catch (_) { /* non-JSON error body */ }

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Disbursement failed (HTTP ${res.status}) — AUTO_DISBURSEMENT_API is still unconfirmed with the backend team.`);
      }

      setIsDisbursed(true);
      setDisbursementMessage({ type: "success", text: data?.message || "Disbursement confirmed by backend — generating PDF." });

      // Let the success message paint before the print dialog takes over the tab.
      setTimeout(() => window.print(), 150);
    } catch (err) {
      console.error("Auto disbursement error:", err);
      setDisbursementMessage({ type: "error", text: err.message || "Something went wrong while calling the disbursement API." });
    } finally {
      setIsDisbursing(false);
    }
  };

  return (
    <div className="sanction-page">
      {/* Hides decorative/interactive chrome so "Generate PDF" (window.print) only
          shows the actual customer file — not buttons, bubbles, or the disbursement action. */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sanction-page { background: #fff !important; }
          .full-width-card, .info-card { box-shadow: none !important; border: 1px solid #ccc !important; break-inside: avoid; }
        }
      `}</style>

      {/* Corner Bubbles */}
      <div className="corner-bubbles no-print">
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
        <div className="bubble bubble-4"></div>
        <div className="bubble bubble-5"></div>
        <div className="bubble bubble-6"></div>
      </div>

      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="logo-area">
            <img src={logo} alt="Vedika" className="header-logo" />
            <div>
              <h1>Final review · Disbursement</h1>
              <p>Complete customer file — onboarding through vehicle delivery</p>
            </div>
          </div>
          <div className="lead-info">
            <span>Lead ID</span>
            <strong>{customer?.application_id || "—"}</strong>
          </div>
        </div>
      </div>

      {loading && <div className="loading-msg">Loading customer file...</div>}

      <div className="sanction-content">
        {customer && (
          <>
            {/* Overall Stage Status */}
            <div className="full-width-card">
              <div className="card-header-flex">
                <h3>Overall stage status</h3>
                <span
                  className="gar-badge"
                  style={status.key === "mandate_approved" ? { background: "#16a34a" } : undefined}
                >
                  {status.label}
                </span>
              </div>
              <div className="details-list">
                <div className="detail-item"><span>FI Status</span><span className="value">{Number(customer.fi_status) ? "Completed" : "Pending"}</span></div>
                <div className="detail-item"><span>Sanction Status</span><span className="value">{Number(customer.sanction_status) === 1 ? "Sanctioned" : "Pending"}</span></div>
                <div className="detail-item"><span>Vehicle Delivery Status</span><span className="value">{getVehicleDeliveryStatus(customer) === 2 ? "HO Approved" : getVehicleDeliveryStatus(customer) === 1 ? "Submitted · Pending HO Approval" : "Pending"}</span></div>
                <div className="detail-item"><span>Mandate & eSign Status</span><span className="value">{isMandateComplete(customer) ? "Approved" : "Pending"}</span></div>
              </div>
            </div>

            {/* Customer Onboarding — Full Details */}
            <div className="full-width-card">
              <div className="card-header-flex">
                <h3>Customer onboarding — full details</h3>
              </div>

              <div className="full-details-grid">
                <div className="detail-category">
                  <h4>Applicant Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Name</span><span className="value">{customer.applicant_name || "—"}</span></div>
                    <div className="detail-item"><span>Mobile</span><span className="value">{customer.applicant_mobile || "—"}</span></div>
                    <div className="detail-item"><span>Aadhaar</span><span className="value">{customer.applicant_aadhaar || "—"}</span></div>
                    <div className="detail-item"><span>PAN</span><span className="value">{customer.applicant_pan || "—"}</span></div>
                    <div className="detail-item"><span>Gender</span><span className="value">{customer.applicant_gender || "—"}</span></div>
                    <div className="detail-item"><span>Marital Status</span><span className="value">{customer.applicant_marital_status || "—"}</span></div>
                    <div className="detail-item"><span>Occupation</span><span className="value">{customer.occupation || "—"}</span></div>
                    <div className="detail-item"><span>CB Score</span><span className="value">{applicantCb.cb_score ?? customer.applicant_cibil_score ?? "N/A"}</span></div>
                    <div className="detail-item"><span>OD Amount</span><span className="value">{applicantCb.odAmount != null ? `₹${applicantCb.odAmount}` : "—"}</span></div>
                    <div className="detail-item"><span>DPD</span><span className="value">{applicantCb.dpd ?? "—"}</span></div>
                    <div className="detail-item"><span>Total Balance Amount</span><span className="value">{applicantCb.outstandingBalanceAmount != null ? `₹${applicantCb.outstandingBalanceAmount}` : "—"}</span></div>
                    <div className="detail-item"><span>House Type</span><span className="value">{customer.house_type || "—"}</span></div>
                    <div className="detail-item"><span>House Ownership</span><span className="value">{customer.house_ownership_type || "—"}</span></div>
                    <div className="detail-item"><span>House Proof Type</span><span className="value">{customer.house_proof_type || "—"}</span></div>
                  </div>
                </div>

                <div className="detail-category">
                  <h4>Co-Applicant Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Name</span><span className="value">{customer.co_applicant_name || "—"}</span></div>
                    <div className="detail-item"><span>Mobile</span><span className="value">{customer.co_applicant_mobile || "—"}</span></div>
                    <div className="detail-item"><span>Aadhaar</span><span className="value">{customer.co_applicant_aadhaar || "—"}</span></div>
                    <div className="detail-item"><span>PAN</span><span className="value">{customer.co_applicant_pan || "—"}</span></div>
                    <div className="detail-item"><span>Relation with Applicant</span><span className="value">{customer.co_applicant_relation || "—"}</span></div>
                    <div className="detail-item"><span>Gender</span><span className="value">{customer.co_applicant_gender || "—"}</span></div>
                    <div className="detail-item"><span>Marital Status</span><span className="value">{customer.co_applicant_marital_status || "—"}</span></div>
                    <div className="detail-item"><span>CB Score</span><span className="value">{coApplicantCb.cb_score ?? customer.co_applicant_cibil_score ?? "N/A"}</span></div>
                    <div className="detail-item"><span>OD Amount</span><span className="value">{coApplicantCb.odAmount != null ? `₹${coApplicantCb.odAmount}` : "—"}</span></div>
                    <div className="detail-item"><span>DPD</span><span className="value">{coApplicantCb.dpd ?? "—"}</span></div>
                    <div className="detail-item"><span>Total Balance Amount</span><span className="value">{coApplicantCb.outstandingBalanceAmount != null ? `₹${coApplicantCb.outstandingBalanceAmount}` : "—"}</span></div>
                  </div>
                </div>

                <div className="detail-category">
                  <h4>Reference Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Ref 1 Name</span><span className="value">{customer.ref1_name || "—"}</span></div>
                    <div className="detail-item"><span>Ref 1 Relationship</span><span className="value">{customer.ref1_relationship || "—"}</span></div>
                    <div className="detail-item"><span>Ref 1 Mobile</span><span className="value">{customer.ref1_mobile || "—"}</span></div>
                    <div className="detail-item"><span>Ref 2 Name</span><span className="value">{customer.ref2_name || "—"}</span></div>
                    <div className="detail-item"><span>Ref 2 Relationship</span><span className="value">{customer.ref2_relationship || "—"}</span></div>
                    <div className="detail-item"><span>Ref 2 Mobile</span><span className="value">{customer.ref2_mobile || "—"}</span></div>
                  </div>
                </div>

                <div className="detail-category">
                  <h4>Bank Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Account Number</span><span className="value">{customer.bank_account_number || "—"}</span></div>
                    <div className="detail-item"><span>IFSC Code</span><span className="value">{customer.ifsc_code || "—"}</span></div>
                    <div className="detail-item"><span>Bank Name</span><span className="value">{customer.bank_name || "—"}</span></div>
                    <div className="detail-item"><span>Bank Holder Name</span><span className="value">{pennyDropData.beneficiary_name_with_bank || "—"}</span></div>
                  </div>
                </div>

                <div className="detail-category">
                  <h4>Dealer Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Dealer Name</span><span className="value">{customer.dealer_name || "—"}</span></div>
                    <div className="detail-item"><span>Dealer Code</span><span className="value">{customer.dealer_code || "—"}</span></div>
                    <div className="detail-item"><span>Branch Name</span><span className="value">{customer.dealer_branch || customer.branch_name || "—"}</span></div>
                    <div className="detail-item"><span>Employee ID</span><span className="value">{customer.employee_id || "—"}</span></div>
                  </div>
                </div>

                <div className="detail-category">
                  <h4>Vehicle Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Manufacturer</span><span className="value">{customer.manufacturer_name || "—"}</span></div>
                    <div className="detail-item"><span>Model</span><span className="value">{customer.model || "—"}</span></div>
                    <div className="detail-item"><span>Battery Capacity</span><span className="value">{customer.battery_capacity || "—"}</span></div>
                    <div className="detail-item"><span>Ex-Showroom Price</span><span className="value">₹{customer.ex_showroom_price || "—"}</span></div>
                    <div className="detail-item"><span>On-Road Price</span><span className="value">₹{customer.on_road_price || "—"}</span></div>
                    <div className="detail-item"><span>Loan Amount (Sanctioned)</span><span className="value">₹{customer.loan_amount || "—"}</span></div>
                    <div className="detail-item"><span>Tenure</span><span className="value">{customer.tenure || "—"} months</span></div>
                    <div className="detail-item"><span>EMI Amount</span><span className="value">{customer.emi_amount ? `₹${customer.emi_amount}` : "—"}</span></div>
                    <div className="detail-item"><span>Processing Fee</span><span className="value">₹{customer.processing_fee || "—"}</span></div>
                    <div className="detail-item"><span>Dealer Subvention</span><span className="value">₹{customer.dealer_subvention || "—"}</span></div>
                    <div className="detail-item"><span>Customer Down Payment</span><span className="value">₹{customer.customer_down_payment || "—"}</span></div>
                    <div className="detail-item"><span>Total Down Payment</span><span className="value">₹{customer.total_down_payment || "—"}</span></div>
                    <div className="detail-item"><span>LTV Ratio</span><span className="value">{customer.ltv_ratio || "—"}%</span></div>
                  </div>
                </div>

                <div className="detail-category">
                  <h4>Vehicle Identification Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Vehicle No.</span><span className="value">{delivery?.vehicle_no || "—"}</span></div>
                    <div className="detail-item"><span>Engine No.</span><span className="value">{delivery?.engine_no || "—"}</span></div>
                    <div className="detail-item"><span>Chassis No.</span><span className="value">{delivery?.chassis_no || "—"}</span></div>
                    <div className="detail-item"><span>Battery No.</span><span className="value">{delivery?.battery_no || "—"}</span></div>
                    <div className="detail-item"><span>Battery Make</span><span className="value">{delivery?.battery_make || "—"}</span></div>
                    {!delivery && <div className="detail-item"><span className="value">Not available yet.</span></div>}
                  </div>
                </div>

                <div className="detail-category">
                  <div className="card-header-flex">
                    <h4>FI Details</h4>
                    <button
                      type="button"
                      className="toggle-details-btn"
                      onClick={() => setShowFiDetails((v) => !v)}
                    >
                      {showFiDetails ? "Hide ▲" : "Details ▼"}
                    </button>
                  </div>
                  {showFiDetails && (() => {
                    const rp = fiDetails?.request_payload || {};
                    const yn = (v) => (v === 1 || v === "1" ? "Yes" : v === 0 || v === "0" ? "No" : "—");
                    const rupee = (v) => (v != null && v !== "" ? `₹${v}` : "—");
                    const val = (v) => (v != null && v !== "" ? v : "—");

                    const responsePayload = parseStoredJson(fiDetails?.response_payload);
                    // Confirmed shape via curl: the Video PD webhook nests the actual session
                    // fields under sessionResponse.session_data — fall back to data.session_data/
                    // session_data/the payload itself in case it's ever saved in a flatter shape.
                    const sessionData =
                      responsePayload?.sessionResponse?.session_data ||
                      responsePayload?.data?.session_data ||
                      responsePayload?.session_data ||
                      responsePayload ||
                      {};
                    const location = parseStoredJson(sessionData.location) || {};
                    const feedback = parseStoredJson(sessionData.feedback) || {};
                    const deviceDetails = sessionData.extras?.device_details || {};
                    const browserInfo = deviceDetails.browser?.browser || {};
                    const osInfo = deviceDetails.os || {};

                    const renderImageLink = (label, url) => url && (
                      <div className="detail-item">
                        <span>{label}</span>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="value doc-value-link" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <img src={url} alt={label} style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
                          View →
                        </a>
                      </div>
                    );

                    const renderLink = (label, url) => (
                      <div className="detail-item">
                        <span>{label}</span>
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="value doc-value-link">View →</a>
                        ) : (
                          <span className="value">—</span>
                        )}
                      </div>
                    );

                    return (
                      <div className="details-list">
                        {fiDetailsError && <div className="detail-item"><span className="value" style={{ color: "#c0392b" }}>{fiDetailsError}</span></div>}

                        <div className="detail-item"><span>KYC ID</span><span className="value">{val(rp.kyc_id)}</span></div>
                        <div className="detail-item"><span>Employee ID</span><span className="value">{val(rp.emp_id)}</span></div>
                        <div className="detail-item"><span>Customer ID</span><span className="value">{val(rp.cust_id)}</span></div>
                        <div className="detail-item"><span>Cycle</span><span className="value">{val(rp.cycle)}</span></div>
                        <div className="detail-item"><span>PD No.</span><span className="value">{val(rp.pd_no)}</span></div>
                        <div className="detail-item"><span>Person Met</span><span className="value">{val(rp.person_met)}</span></div>
                        <div className="detail-item"><span>Relation ID</span><span className="value">{val(rp.relation_id)}</span></div>
                        <div className="detail-item"><span>Residence Address</span><span className="value">{val(rp.residence_dtl_address)}</span></div>
                        <div className="detail-item"><span>Applicant Contact</span><span className="value">{val(rp.contact_no_of_applicant)}</span></div>
                        <div className="detail-item"><span>Distance from Dealer</span><span className="value">{rp.dist_from_dealer != null ? `${rp.dist_from_dealer} km` : "—"}</span></div>
                        <div className="detail-item"><span>Model Name</span><span className="value">{val(rp.model_name)}</span></div>
                        <div className="detail-item"><span>ER Total Price</span><span className="value">{rupee(rp.er_totat_price)}</span></div>
                        <div className="detail-item"><span>Accommodation Type</span><span className="value">{val(rp.accomodation_type)}</span></div>
                        <div className="detail-item"><span>House Construction Type</span><span className="value">{val(rp.house_construction_type)}</span></div>
                        <div className="detail-item"><span>Make of House</span><span className="value">{val(rp.make_house)}</span></div>
                        <div className="detail-item"><span>Year of Known</span><span className="value">{val(rp.year_of_known)}</span></div>
                        <div className="detail-item"><span>Total Family Members</span><span className="value">{val(rp.total_family_member)}</span></div>
                        <div className="detail-item"><span>Non-Earning Members</span><span className="value">{val(rp.non_earning_member)}</span></div>
                        <div className="detail-item"><span>Member1 Yearly Income</span><span className="value">{rupee(rp.member1_self_declared_yearly_income)}</span></div>
                        <div className="detail-item"><span>Member1 Has Smartphone</span><span className="value">{yn(rp.member1_smartphone_yn)}</span></div>
                        <div className="detail-item"><span>Member1 Smartphone Mobile No.</span><span className="value">{val(rp.member1_smartphone_mob_no)}</span></div>
                        <div className="detail-item"><span>Has Other Earning Member</span><span className="value">{yn(rp.earning_member)}</span></div>
                        <div className="detail-item"><span>Member2 Nature of Work</span><span className="value">{val(rp.member2_nature_of_work)}</span></div>
                        <div className="detail-item"><span>ER Ownership Status</span><span className="value">{val(rp.er_ownership_status)}</span></div>
                        <div className="detail-item"><span>Member2 Yearly Income</span><span className="value">{rupee(rp.member2_self_declared_yearly_income)}</span></div>
                        <div className="detail-item"><span>Driving Status</span><span className="value">{val(rp.driver_name)}</span></div>
                        <div className="detail-item"><span>Owns an E-Rickshaw</span><span className="value">{yn(rp.er_exist_yn)}</span></div>
                        <div className="detail-item"><span>Route Point A</span><span className="value">{val(rp.new_pointA)}</span></div>
                        <div className="detail-item"><span>Route Point B</span><span className="value">{val(rp.new_pointB)}</span></div>
                        <div className="detail-item"><span>Expected Daily Earning</span><span className="value">{rupee(rp.expected_daily_earning)}</span></div>
                        <div className="detail-item"><span>Loan Amount</span><span className="value">{rupee(rp.loan_amount)}</span></div>
                        <div className="detail-item"><span>Interest</span><span className="value">{val(rp.interest)}</span></div>
                        <div className="detail-item"><span>Amount</span><span className="value">{val(rp.amount)}</span></div>
                        <div className="detail-item"><span>Family Loan Obligation (Monthly)</span><span className="value">{rupee(rp.family_loan_obligation_monthly)}</span></div>
                        <div className="detail-item"><span>Migrant Member</span><span className="value">{yn(rp.migrant_member)}</span></div>
                        <div className="detail-item"><span>PD Latitude</span><span className="value">{rp.pd_latitude ?? customer?.pd_latitude ?? "—"}</span></div>
                        <div className="detail-item"><span>PD Longitude</span><span className="value">{rp.pd_longitude ?? customer?.pd_longitude ?? "—"}</span></div>
                        <div className="detail-item"><span>Video PD Session ID</span><span className="value">{rp.vpd_session_id || customer?.vpd_session_id || "—"}</span></div>
                        <div className="detail-item"><span>Distance PD to Customer</span><span className="value">{rp.distance_from_pd_to_customer_km != null ? `${rp.distance_from_pd_to_customer_km} km` : "—"}</span></div>

                        {responsePayload ? (
                          <>
                            <div className="detail-item"><span>Event Type</span><span className="value">{val(responsePayload.eventType)}</span></div>
                            <div className="detail-item"><span>Application ID</span><span className="value">{val(responsePayload.applicationId)}</span></div>
                            <div className="detail-item"><span>PD Session Status</span><span className="value">{val(sessionData.session_status)}</span></div>
                            <div className="detail-item"><span>PD Address (from session)</span><span className="value">{val(location.address)}</span></div>
                            <div className="detail-item"><span>PD Latitude (from session)</span><span className="value">{location.latitude ?? "—"}</span></div>
                            <div className="detail-item"><span>PD Longitude (from session)</span><span className="value">{location.longitude ?? "—"}</span></div>
                            <div className="detail-item"><span>Feedback Type</span><span className="value">{val(feedback.type)}</span></div>
                            <div className="detail-item"><span>Feedback Comment</span><span className="value">{val(feedback.comment)}</span></div>
                            <div className="detail-item"><span>Client / Environment</span><span className="value">{val(sessionData.client_name)}</span></div>
                            <div className="detail-item"><span>Phone Number</span><span className="value">{val(sessionData.phone_number)}</span></div>
                            <div className="detail-item"><span>Customer IP</span><span className="value">{val(sessionData.customer_IP)}</span></div>
                            <div className="detail-item"><span>Device OS</span><span className="value">{osInfo.name ? `${osInfo.name} ${osInfo.version || ""}`.trim() : "—"}</span></div>
                            <div className="detail-item"><span>Browser</span><span className="value">{browserInfo.name ? `${browserInfo.name} ${browserInfo.version || ""}`.trim() : "—"}</span></div>
                            {renderImageLink("PD Selfie Image", sessionData.selfie_url)}
                            {renderLink("Agent Video", sessionData.agent_video_url)}
                            {renderLink("User Video", sessionData.user_video_url)}
                            {renderLink("Session Summary (zip)", sessionData.zip_url)}
                          </>
                        ) : (
                          <div className="detail-item"><span>Response Payload</span><span className="value">Not available yet (FI request status: {fiDetails?.api_status || "—"})</span></div>
                        )}

                        <div className="detail-item"><span>FI Request Status</span><span className="value">{fiDetails?.api_status || "—"}</span></div>
                        <div className="detail-item"><span>Submitted At</span><span className="value">{fiDetails?.created_at || "—"}</span></div>
                        <div className="detail-item"><span>Last Updated At</span><span className="value">{fiDetails?.updated_at || "—"}</span></div>
                      </div>
                    );
                  })()}
                </div>

                <div className="detail-category">
                  <h4>Onboarding Document</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Aadhaar Copy</span>{renderDocValue(customer.aadhaar_copy_file)}</div>
                    <div className="detail-item"><span>PAN Copy</span>{renderDocValue(customer.pan_copy_file)}</div>
                    <div className="detail-item"><span>House Proof</span>{renderDocValue(customer.house_proof_file)}</div>
                    <div className="detail-item"><span>Applicant Image</span>{renderDocValue(customer.applicant_image)}</div>
                    <div className="detail-item"><span>Co-Applicant Image</span>{renderDocValue(customer.co_applicant_image)}</div>
                    <div className="detail-item"><span>Quotation</span>{renderDocValue(customer.quotation_image)}</div>
                  </div>
                </div>

                <div className="detail-category">
                  <h4>Delivery Documents</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Delivery Photo</span>{renderDocValue(delivery?.delivery_photo)}</div>
                    <div className="detail-item"><span>Invoice</span>{renderDocValue(delivery?.invoice)}</div>
                    <div className="detail-item"><span>Insurance</span>{renderDocValue(delivery?.insurance)}</div>
                    <div className="detail-item"><span>RC Application</span>{renderDocValue(delivery?.rc_application)}</div>
                    <div className="detail-item"><span>Quotation</span>{renderDocValue(delivery?.quotation)}</div>
                    <div className="detail-item"><span>Disclaimer</span>{renderDocValue(delivery?.disclaimer)}</div>
                    <div className="detail-item"><span>RC Challan</span>{renderDocValue(delivery?.rc_challan)}</div>
                    <div className="detail-item"><span>Battery Photo</span>{renderDocValue(delivery?.battery_photo)}</div>
                    <div className="detail-item"><span>NO HPA Letter</span>{renderDocValue(delivery?.no_hpa_letter)}</div>
                    <div className="detail-item"><span>Form 22</span>{renderDocValue(delivery?.form_22)}</div>
                    {!delivery && <div className="detail-item"><span className="value">Not available yet.</span></div>}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Auto Disbursement */}
        <div className="full-width-card">
          <div className="card-header-flex">
            <h3>Disbursement</h3>
          </div>
          <div className="details-list">
            <p style={{ padding: "0 0 8px" }}>
              Once satisfied that every stage above checks out, trigger auto disbursement for this loan.
            </p>
            <div className="action-buttons" style={{ marginTop: 0 }}>
              <button
                className="approve-btn"
                onClick={handleAutoDisbursement}
                disabled={isDisbursing || isDisbursed}
              >
                {isDisbursed ? "✓ Disbursed" : isDisbursing ? "Disbursing…" : "Ready To Disbursement"}
              </button>
            </div>
            {disbursementMessage && (
              <p style={{ color: disbursementMessage.type === "success" ? "#1e7e34" : "#c0392b", marginTop: "8px" }}>
                {disbursementMessage.text}
              </p>
            )}
          </div>
        </div>

        <div className="action-buttons">
          <button className="back-btn" onClick={() => navigate("/ho-dashboard")}>← Back to HO dashboard</button>
        </div>
      </div>
    </div>
  );
};

export default FinalReview;
