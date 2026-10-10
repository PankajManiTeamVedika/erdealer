import React, { useEffect, useState } from "react";
import "../../assets/css/SanctionReview.css";
import logo from "../../assets/image/logo.png";
import { useNavigate, useParams } from "react-router-dom";
import { API, DEALER_API_BASE } from "../api/apiRoutes";
import { apiFetch } from "../utils/apiFetch";
import { calculateLtvRatio, calculateMonthlyEmi } from "../utils/loanCalc";
import { parseStoredJson } from "../utils/parseStoredJson";
import { buildSanctionLetterHtml, buildSanctionLetterFilename } from "../utils/sanctionLetter";

// ASSUMPTION: only decision=1 (Approved) was confirmed via curl. Declined/Referred-back
// codes are guessed — confirm the real values with the backend before relying on them.
const DECISION_CODE = {
  APPROVED: 1,
  DECLINED: 2,
  REFERRED_BACK: 3,
};

const baseURL = DEALER_API_BASE;

const SanctionReview = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);

  const [sanctionNote, setSanctionNote] = useState("e.g. Approved with condition: post-dated reference verification within 7 days; cap LTV at 80% if on-road price revised.");
  const [sanctionAmount, setSanctionAmount] = useState("150000");
  // Editable at sanction stage — HO can revise these from what the dealer originally
  // submitted before approving/declining.
  const [sanctionTenure, setSanctionTenure] = useState("24");
  const [sanctionOnRoadPrice, setSanctionOnRoadPrice] = useState("");
  const [sanctionExShowroomPrice, setSanctionExShowroomPrice] = useState("");
  const [showReferModal, setShowReferModal] = useState(false);
  const [referBackNote, setReferBackNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showAllDetails, setShowAllDetails] = useState(true);
  const [showVideoPdDetails, setShowVideoPdDetails] = useState(false);
  const [fiDetails, setFiDetails] = useState(null);
  const [fiDetailsLoading, setFiDetailsLoading] = useState(false);
  const [fiDetailsError, setFiDetailsError] = useState("");
  const [isUpdatingLoanStructure, setIsUpdatingLoanStructure] = useState(false);
  const [loanStructureUpdateMessage, setLoanStructureUpdateMessage] = useState(null); // { type: "success" | "error", text }
  const [dealerContact, setDealerContact] = useState(null);
  const [letterMessage, setLetterMessage] = useState(null); // { type: "success" | "error", text }
  // Set the moment Approve succeeds — submitSanctionDecision doesn't refetch/update
  // `customer`, so sanction_status on the local customer object stays stale right after
  // approving. Combined with customer?.sanction_status so the letter option also shows
  // on a later revisit to an already-sanctioned lead, not just right after approving.
  const [isApproved, setIsApproved] = useState(false);
  const sanctionApproved = isApproved || Number(customer?.sanction_status) === 1;

  // Fetch the real customer record so this page reflects the actual case
  // instead of the static mock data it started as.
  useEffect(() => {
    if (!customerId) return;

    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${baseURL}/public/api/customer/${customerId}?_=${Date.now()}`);
        const result = await res.json();
        if (result.success) {
          setCustomer(result.data);
          if (result.data?.loan_amount) {
            setSanctionAmount(String(result.data.loan_amount));
          }
          if (result.data?.tenure) {
            setSanctionTenure(String(result.data.tenure));
          }
          if (result.data?.on_road_price) {
            setSanctionOnRoadPrice(String(result.data.on_road_price));
          }
          if (result.data?.ex_showroom_price) {
            setSanctionExShowroomPrice(String(result.data.ex_showroom_price));
          }
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

    fetchCustomer();
  }, [customerId]);

  // Dealer's own record — needed for the sanction letter's "Payable Bank" details and
  // the dealer's WhatsApp number, neither of which come back on the customer record.
  // ASSUMPTION: customer.dealer_id round-trips on the customer GET response (it's sent
  // at Stage 1 create — see ApplicantVerification.jsx — but not otherwise displayed
  // anywhere in this app, so this isn't curl-confirmed). Fails silently to "—"/blank
  // in the letter and a "dealer contact not found" message on the WhatsApp button.
  useEffect(() => {
    if (!customer?.dealer_id) return;

    const fetchDealer = async () => {
      try {
        const res = await fetch(`${API.DEALERS}/${customer.dealer_id}`);
        const result = await res.json();
        if (result.success) setDealerContact(result.data);
      } catch (err) {
        console.error("Dealer contact fetch error:", err);
      }
    };

    fetchDealer();
  }, [customer?.dealer_id]);

  // Lazy-loaded the first time the Video PD "Details" toggle is opened — the saved
  // FI submission record (request_payload holds vpd_session_id/pd_latitude/pd_longitude/
  // distances, api_status is the FI provider's own processing status for this request).
  const fetchFiDetails = async () => {
    const custId = parseInt(customerId, 10) || customer?.id || null;
    if (!custId) return;

    setFiDetailsError("");
    setFiDetailsLoading(true);
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
    } finally {
      setFiDetailsLoading(false);
    }
  };

  const toggleVideoPdDetails = () => {
    setShowVideoPdDetails((v) => {
      const next = !v;
      if (next && !fiDetails && !fiDetailsLoading) fetchFiDetails();
      return next;
    });
  };

  // Confirmed via curl: JSON body { cust_id, kyc_id, emp_id, decision, sanction_amt, sanction_note }
  // and Authorization: Bearer <token from login>. No credentials: "include" — the API's CORS
  // response uses Access-Control-Allow-Origin: *, which the browser rejects for credentialed requests.
  // Response wraps a separate downstream call in third_party_response — success can be true
  // (our save succeeded, logged under log_id) even while third_party_response.status is "error".
  const submitSanctionDecision = async (decision, note) => {
    const custId = parseInt(customerId, 10) || customer?.id || null;
    const kycId = parseInt(customer?.kyc_id, 10) || parseInt(localStorage.getItem("applicant_kyc_id"), 10) || 1;
    const empId = parseInt(localStorage.getItem("emp_id"), 10) || 1;

    setError("");
    setIsSubmitting(true);

    try {
      const res = await apiFetch(API.SANCTION_SAVE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cust_id: custId,
          kyc_id: kycId,
          emp_id: empId,
          decision: Number(decision),
          sanction_amt: Number(sanctionAmount),
          sanction_note: note,
          // ASSUMPTION: field names for these three follow the same on_road_price/
          // ex_showroom_price/tenure convention used elsewhere (e.g. OfferSummary's
          // stage3 save) — not confirmed via curl for THIS endpoint like the fields above.
          tenure: Number(sanctionTenure),
          on_road_price: Number(sanctionOnRoadPrice),
          ex_showroom_price: Number(sanctionExShowroomPrice),
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Save failed (HTTP ${res.status})`);
      }

      if (data?.third_party_response?.status === "error") {
        setError(
          `Sanction saved (log #${data.log_id}), but the downstream system reported: ${data.third_party_response.message}`
        );
      }

      return true;
    } catch (err) {
      setError(err.message || "Something went wrong while saving the sanction decision.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Saves just the loan structure (amount/tenure/on-road/ex-showroom/LTV/EMI) to the
  // table, independent of the Approve/Decline/Refer-back decision below.
  // Confirmed via curl — see UPDATE_LOAN_STRUCTURE_API in apiRoutes.js.
  const handleUpdateLoanStructure = async () => {
    const custId = parseInt(customerId, 10) || customer?.id || null;
    const kycId = parseInt(customer?.kyc_id, 10) || parseInt(localStorage.getItem("applicant_kyc_id"), 10) || 1;

    setLoanStructureUpdateMessage(null);
    setIsUpdatingLoanStructure(true);

    try {
      const res = await apiFetch(API.SANCTION_SAVE_API, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cust_id: custId,
          kyc_id: kycId,
          sanction_amt: Number(sanctionAmount),
          tenure: Number(sanctionTenure),
          on_road_price: Number(sanctionOnRoadPrice),
          ex_showroom_price: Number(sanctionExShowroomPrice),
          ltv: sanctionLtvRatio != null ? Number(sanctionLtvRatio) : null,
          emi: sanctionMonthlyEmi || null,
          sanction_note: sanctionNote,
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.success === false || data?.status === false) {
        throw new Error(data?.message || `Update failed (HTTP ${res.status})`);
      }

      setLoanStructureUpdateMessage({ type: "success", text: data?.message || "Loan structure updated successfully" });
    } catch (err) {
      console.error("Update loan structure error:", err);
      setLoanStructureUpdateMessage({ type: "error", text: err.message || "Failed to update loan structure" });
    } finally {
      setIsUpdatingLoanStructure(false);
    }
  };

  // Opens the sanction letter (Letter of Offer / DO) in a new tab and triggers the
  // print dialog so HO can "Save as PDF" — no PDF library added, same pattern
  // FinalReview.jsx already uses for its "Generate PDF" action.
  const handleGenerateSanctionLetter = () => {
    setLetterMessage(null);
    const leadId = customer?.id || customerId;

    const html = buildSanctionLetterHtml({
      leadId,
      applicantName: customer?.applicant_name,
      applicantMobile: customer?.applicant_mobile,
      dealerName: customer?.dealer_name,
      dealerAddress: dealerContact?.showroom_address,
      onRoadPrice: sanctionOnRoadPrice,
      exShowroomPrice: sanctionExShowroomPrice,
      loanAmount: sanctionAmount,
      tenure: sanctionTenure,
      monthlyEmi: sanctionMonthlyEmi,
      processingFee: customer?.processing_fee,
      insuranceAmount: customer?.insurance_amount,
      downPayment: customer?.customer_down_payment,
      dealerSubvention: customer?.dealer_subvention,
      // BANKING & BUREAU already has these confirmed on the customer record itself
      // (bank_name/bank_account_number/ifsc_code) — use that instead of the dealer's
      // own record, which was a fragile, unconfirmed field-name guess.
      payableBankName: customer?.bank_name,
      payableAccountNumber: customer?.bank_account_number,
      payableIfsc: customer?.ifsc_code,
      payableEmail: dealerContact?.owner_email,
    });

    const win = window.open("", "_blank");
    if (!win) {
      setLetterMessage({ type: "error", text: "Please allow pop-ups for this site to generate the letter." });
      return;
    }
    win.document.write(html);
    win.document.close();
    // Browsers default the print/"Save as PDF" filename to the tab title — match the
    // same ER-DO-<id>-<timestamp>.pdf convention as the sample letter.
    win.document.title = buildSanctionLetterFilename(leadId).replace(/\.pdf$/i, "");
    win.focus();
    // Let the new tab paint before handing it the print dialog.
    setTimeout(() => win.print(), 300);
  };

  // No WhatsApp Business API is wired up anywhere in this app (adding one from the
  // browser would mean shipping the API secret in client-side JS, which is unsafe) —
  // this opens a wa.me chat with the applicant's own mobile number (from Applicant
  // Details — customer.applicant_mobile) pre-filled with a message. The PDF itself
  // must be attached manually from the "Save as PDF" step above; wa.me links can't
  // auto-attach a file without a backend WhatsApp API integration.
  const handleShareOnWhatsapp = () => {
    setLetterMessage(null);
    const rawMobile = (customer?.applicant_mobile || "").replace(/\D/g, "");
    if (!rawMobile) {
      setLetterMessage({ type: "error", text: "Applicant's mobile number not found for this lead." });
      return;
    }
    const phone = rawMobile.length === 10 ? `91${rawMobile}` : rawMobile;
    const leadRef = customer?.application_id || customerId;
    const message = `Sanction Letter (Letter of Offer) for ${customer?.applicant_name || "you"} — Lead ${leadRef} is ready. Please attach the PDF you just saved from "Generate Sanction Letter" to this chat.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleApprove = async () => {
    const ok = await submitSanctionDecision(DECISION_CODE.APPROVED, sanctionNote);
    if (ok) {
      alert("Sanction approved!");
      // Stay on the page instead of auto-navigating away — HO needs to generate the
      // sanction letter next. "Go to dashboard" below is now the explicit exit.
      setIsApproved(true);
    }
  };

  const handleDecline = async () => {
    const ok = await submitSanctionDecision(DECISION_CODE.DECLINED, sanctionNote);
    if (ok) {
      alert("Sanction declined. Application closed.");
    }
  };

  const handleReferBack = () => {
    setShowReferModal(true);
  };

  const submitReferBack = async () => {
    if (!referBackNote.trim()) {
      alert("Please enter a reason for refer back");
      return;
    }
    const ok = await submitSanctionDecision(DECISION_CODE.REFERRED_BACK, referBackNote);
    if (ok) {
      setShowReferModal(false);
      alert(`Application referred back with note: ${referBackNote}`);
    }
  };

  const handleBack = () => {
    navigate("/field-investigation");
  };

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

  // Bank holder name comes from the penny-drop verification saved during Document
  // Collection (Stage 2).
  const pennyDropData = parseStoredJson(customer?.penny_drop_response)?.data || {};

  // LTV and EMI auto-calculate from the (editable) loan amount/tenure/on-road price
  // above — same shared formulas as OfferSummary (utils/loanCalc.js), so revising any
  // of them here updates both, and a policy rate change only needs one edit.
  const sanctionLtvRatio = calculateLtvRatio(sanctionAmount, sanctionOnRoadPrice);
  const sanctionMonthlyEmi = calculateMonthlyEmi(sanctionAmount, sanctionTenure);

  return (
    <div className="sanction-page">
      {/* Corner Bubbles */}
      <div className="corner-bubbles">
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
              <h1>Sanction • Credit authority review</h1>
            </div>
          </div>
          <div className="lead-info">
            <span>Lead ID</span>
            <strong>{customer?.application_id || "VED-7185-2826"}</strong>
          </div>
        </div>
      </div>

      {loading && <div className="loading-msg">Loading customer details...</div>}

      <div className="sanction-content">
        {customer && (
          <div className="full-width-card">
            <div className="card-header-flex">
              <h3>Full Customer Details</h3>
              <button
                type="button"
                className="toggle-details-btn"
                onClick={() => setShowAllDetails((v) => !v)}
              >
                {showAllDetails ? "Hide ▲" : "Show ▼"}
              </button>
            </div>

            {showAllDetails && (
              <div className="full-details-grid">
                {/* Applicant */}
                <div className="detail-category">
                  <h4>Applicant Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Name</span><span className="value">{customer.applicant_name || "—"}</span></div>
                    <div className="detail-item"><span>Mobile</span><span className="value">{customer.applicant_mobile || "—"}</span></div>
                    <div className="detail-item"><span>Aadhaar</span><span className="value">{customer.applicant_aadhaar || "—"}</span></div>
                    <div className="detail-item"><span>PAN</span><span className="value">{customer.applicant_pan || "—"}</span></div>
                    <div className="detail-item"><span>CIBIL Score</span><span className="value">{customer.applicant_cibil_score || "N/A"}</span></div>
                    <div className="detail-item"><span>House Type</span><span className="value">{customer.house_type || "—"}</span></div>
                    <div className="detail-item"><span>House Ownership</span><span className="value">{customer.house_ownership_type || "—"}</span></div>
                    <div className="detail-item"><span>House Proof Type</span><span className="value">{customer.house_proof_type || "—"}</span></div>
                  </div>
                </div>

                {/* Co-Applicant */}
                <div className="detail-category">
                  <h4>Co-Applicant Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Name</span><span className="value">{customer.co_applicant_name || "—"}</span></div>
                    <div className="detail-item"><span>Mobile</span><span className="value">{customer.co_applicant_mobile || "—"}</span></div>
                    <div className="detail-item"><span>Aadhaar</span><span className="value">{customer.co_applicant_aadhaar || "—"}</span></div>
                    <div className="detail-item"><span>PAN</span><span className="value">{customer.co_applicant_pan || "—"}</span></div>
                    <div className="detail-item"><span>CIBIL Score</span><span className="value">{customer.co_applicant_cibil_score || "N/A"}</span></div>
                  </div>
                </div>

                {/* Vehicle & Loan */}
                <div className="detail-category">
                  <h4>Vehicle & Loan Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Manufacturer</span><span className="value">{customer.manufacturer_name || "—"}</span></div>
                    <div className="detail-item"><span>Model</span><span className="value">{customer.model || "—"}</span></div>
                    <div className="detail-item"><span>Battery Capacity</span><span className="value">{customer.battery_capacity || "—"}</span></div>
                    <div className="detail-item"><span>Ex-Showroom Price</span><span className="value">₹{customer.ex_showroom_price || "—"}</span></div>
                    <div className="detail-item"><span>On-Road Price</span><span className="value">₹{customer.on_road_price || "—"}</span></div>
                   <div className="detail-item"><span>Loan Amount</span><span className="value">₹{customer.loan_amount || "—"}</span></div>
                    <div className="detail-item"><span>Interest Rate(Reducing)</span><span className="value">{customer.interest_rate ? `${customer.interest_rate}%` : ""}30%</span></div>
                    <div className="detail-item"><span>EMI Amount</span><span className="value">{customer.emi_amount ? `₹${customer.emi_amount}` : "—"}</span></div>
                    <div className="detail-item"><span>Tenure</span><span className="value">{customer.tenure || "—"} months</span></div>
                    <div className="detail-item"><span>Processing Fee</span><span className="value">₹{customer.processing_fee || "—"}</span></div>
                    <div className="detail-item"><span>Dealer Subvention</span><span className="value">₹{customer.dealer_subvention || "—"}</span></div>
                    <div className="detail-item"><span>Customer Down Payment</span><span className="value">₹{customer.customer_down_payment || "—"}</span></div>
                    <div className="detail-item"><span>Total Down Payment</span><span className="value">₹{customer.total_down_payment || "—"}</span></div>
                    <div className="detail-item"><span>LTV Ratio</span><span className="value">{customer.ltv_ratio || "—"}%</span></div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="detail-category">
                  <h4>Bank Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Account Number</span><span className="value">{customer.bank_account_number || "—"}</span></div>
                    <div className="detail-item"><span>IFSC Code</span><span className="value">{customer.ifsc_code || "—"}</span></div>
                    <div className="detail-item"><span>Bank Name</span><span className="value">{customer.bank_name || "—"}</span></div>
                    <div className="detail-item"><span>Account Holder Name</span><span className="value">{pennyDropData.beneficiary_name_with_bank || "—"}</span></div>
                  </div>
                </div>

                {/* References */}
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

                {/* Dealer & Sourcing */}
                <div className="detail-category">
                  <h4>Dealer & Sourcing Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Dealer Name</span><span className="value">{customer.dealer_name || "—"}</span></div>
                    <div className="detail-item"><span>Dealer Code</span><span className="value">{customer.dealer_code || "—"}</span></div>
                    <div className="detail-item"><span>Branch Name</span><span className="value">{customer.dealer_branch || customer.branch_name || "—"}</span></div>
                    <div className="detail-item"><span>Employee ID</span><span className="value">{customer.employee_id || "—"}</span></div>
                    {/* <div className="detail-item"><span>Sales Executive</span><span className="value">{customer.sales_executive_name || "—"}</span></div> */}
                  </div>
                </div>

                {/* Documents */}
                <div className="detail-category">
                  <h4>Uploaded Documents</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Aadhaar Copy</span>{renderDocValue(customer.aadhaar_copy_file)}</div>
                    <div className="detail-item"><span>PAN Copy</span>{renderDocValue(customer.pan_copy_file)}</div>
                    <div className="detail-item"><span>House Proof</span>{renderDocValue(customer.house_proof_file)}</div>
                    <div className="detail-item"><span>Applicant Image</span>{renderDocValue(customer.applicant_image)}</div>
                    <div className="detail-item"><span>Co-Applicant Image</span>{renderDocValue(customer.co_applicant_image)}</div>
                    <div className="detail-item"><span>Quotation</span>{renderDocValue(customer.quotation_image)}</div>
                  </div>
                </div>

                {/* Application Meta */}
                <div className="detail-category">
                  <h4>Application Meta</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>Application Status</span><span className="value">{customer.application_status || "—"}</span></div>
                    <div className="detail-item"><span>Stage</span><span className="value">{customer.stage ?? "—"}</span></div>
                    <div className="detail-item"><span>Consent Accepted</span><span className="value">{customer.consent_accepted ? "Yes" : "No"}</span></div>
                    <div className="detail-item"><span>Consent Date/Time</span><span className="value">{customer.consent_datetime || "—"}</span></div>
                    <div className="detail-item"><span>Created At</span><span className="value">{customer.created_at || "—"}</span></div>
                    <div className="detail-item"><span>Updated At</span><span className="value">{customer.updated_at || "—"}</span></div>
                    <div className="detail-item"><span>Remarks</span><span className="value">{customer.remarks || "—"}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 1: Three Cards in One Row */}
        <div className="cards-row">
          {/* Identity & Images Card */}
          <div className="info-card">
            <h3>Identity & Images</h3>
            <div className="checklist">
              <div className="check-item">{customer?.aadhaar_copy_file ? "✓" : "✗"} Aadhaar EKYC</div>
              <div className="check-item">{customer?.pan_copy_file ? "✓" : "✗"} PAN (NSDL)</div>
              <div className="check-item">{customer?.applicant_image ? "✓" : "✗"} Applicant live image</div>
              <div className="check-item">{customer?.co_applicant_image ? "✓" : "✗"} Co-applicant image</div>
              <div className="check-item">{customer?.house_proof_file ? "✓" : "✗"} House proof</div>
            </div>
          </div>

          {/* BANKING & BUREAU Card */}
          <div className="info-card">
            <h3>BANKING & BUREAU</h3>
            <div className="details-list">
              <div className="detail-item">
                <span>Bank</span>
                <span className="value">{customer?.bank_name || "—"}</span>
              </div>
              <div className="detail-item">
                <span>Account number</span>
                <span className="value">{customer?.bank_account_number || "—"}</span>
              </div>
              <div className="detail-item">
                <span>IFSC</span>
                <span className="value">{customer?.ifsc_code || "—"}</span>
              </div>
              <div className="detail-item">
                <span>Account Holder Name</span>
                <span className="value">{pennyDropData.beneficiary_name_with_bank || "—"}</span>
              </div>
              <div className="detail-item">
                <span>CB score</span>
                <span className="value">{customer?.applicant_cibil_score || "742"}</span>
              </div>
              <div className="detail-item">
                <span>Co-applicant CB score</span>
                <span className="value">{customer?.co_applicant_cibil_score || "—"}</span>
              </div>
            </div>
          </div>

          {/* FI / GAR OUTCOME Card */}
          <div className="info-card highlight">
            <div className="card-header-flex">
              <h3>FI / GAR OUTCOME</h3>
              <span className="gar-badge">GREEN • 72</span>
            </div>
            <div className="checklist">
              <div className="check-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <span>✓ Video PD</span>
                <button
                  type="button"
                  className="toggle-details-btn"
                  onClick={toggleVideoPdDetails}
                  disabled={fiDetailsLoading}
                >
                  {fiDetailsLoading ? "Loading…" : showVideoPdDetails ? "Hide ▲" : "Details ▼"}
                </button>
              </div>
              {showVideoPdDetails && (() => {
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
                  <div className="details-list" style={{ margin: "6px 0" }}>
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

                    {responsePayload ? (() => {
                      const deviceDetails = sessionData.extras?.device_details || {};
                      const browserInfo = deviceDetails.browser?.browser || {};
                      const osInfo = deviceDetails.os || {};
                      return (
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
                      );
                    })() : (
                      <div className="detail-item"><span>Response Payload</span><span className="value">Not available yet (FI request status: {fiDetails?.api_status || "—"})</span></div>
                    )}

                    <div className="detail-item"><span>FI Request Status</span><span className="value">{fiDetails?.api_status || "—"}</span></div>
                    <div className="detail-item"><span>Submitted At</span><span className="value">{fiDetails?.created_at || "—"}</span></div>
                    <div className="detail-item"><span>Last Updated At</span><span className="value">{fiDetails?.updated_at || "—"}</span></div>
                  </div>
                );
              })()}
              <div className="check-item">✓ Transcription</div>
              <div className="check-item">✓ Geo-tagged at residence</div>
            </div>
          </div>
        </div>

        {/* Row 2: REPAYMENT CAPACITY CHECK (FOIR) - Full Width */}
        <div className="full-width-card">
          <h3>REPAYMENT CAPACITY CHECK (FOIR)</h3>
          <div className="foir-details-row">
            <div className="foir-detail-item">
              <span className="label">Assessed income</span>
              <span className="value">₹13,000</span>
            </div>
            <div className="foir-detail-item">
              <span className="label">Existing obligation</span>
              <span className="value">₹2,400</span>
            </div>
            <div className="foir-detail-item">
              <span className="label">Proposed EMI</span>
              <span className="value">₹7,150</span>
            </div>
          </div>
        </div>

        {/* Row 3: FOIR Indicator - Full Width */}
        {/* <div className="full-width-card">
          <div className="foir-header">
            <span className="foir-label">FOIR</span>
            <span className="foir-percentage">73.5%</span>
          </div>
          <div className="foir-bar-container">
            <div className="foir-bar">
              <div className="foir-fill" style={{ width: "73.5%" }}></div>
            </div>
            <div className="foir-markers">
              <span className="marker green">
                <span className="marker-dot green"></span>60% comfort
              </span>
              <span className="marker red">
                <span className="marker-dot red"></span>75% policy cap
              </span>
            </div>
          </div>
        </div> */}

        {/* Row 4: Loan structure being sanctioned - Full Width */}
        <div className="full-width-card">
          <h3>Loan structure being sanctioned</h3>
          <div className="loan-details-row">
            <div className="loan-detail-item">
              <span className="label">Loan amount</span>
              <input
                type="number"
                className="sanction-note"
                value={sanctionAmount}
                onChange={(e) => setSanctionAmount(e.target.value)}
              />
            </div>
            <div className="loan-detail-item">
              <span className="label">Tenure (months)</span>
              <input
                type="number"
                className="sanction-note"
                value={sanctionTenure}
                onChange={(e) => setSanctionTenure(e.target.value)}
              />
            </div>
            <div className="loan-detail-item">
              <span className="label">On-Road price (₹)</span>
              <input
                type="number"
                className="sanction-note"
                value={sanctionOnRoadPrice}
                onChange={(e) => setSanctionOnRoadPrice(e.target.value)}
              />
            </div>
            <div className="loan-detail-item">
              <span className="label">Ex-Showroom price (₹)</span>
              <input
                type="number"
                className="sanction-note"
                value={sanctionExShowroomPrice}
                onChange={(e) => setSanctionExShowroomPrice(e.target.value)}
              />
            </div>
            <div className="loan-detail-item">
              <span className="label">LTV</span>
              <span className="value" style={{ color: sanctionLtvRatio && parseFloat(sanctionLtvRatio) > 80 ? 'red' : undefined }}>
                {sanctionLtvRatio ? `${sanctionLtvRatio}%` : "—"}
              </span>
            </div>
            <div className="loan-detail-item">
              <span className="label">EMI</span>
              <span className="value">{sanctionMonthlyEmi ? `₹${sanctionMonthlyEmi.toLocaleString('en-IN')}` : "—"}</span>
            </div>
          </div>

          <div className="input-group" style={{ marginTop: "12px" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleUpdateLoanStructure}
              disabled={isUpdatingLoanStructure}
            >
              {isUpdatingLoanStructure ? "Updating…" : "Update"}
            </button>
            {loanStructureUpdateMessage && (
              <small
                className="field-note"
                style={{ color: loanStructureUpdateMessage.type === "success" ? "#1e7e34" : "#c0392b" }}
              >
                {loanStructureUpdateMessage.text}
              </small>
            )}
          </div>
        </div>

        {/* Row 5: Sanction note / conditions - Full Width */}
        <div className="full-width-card">
          <h3>Sanction note / conditions</h3>
          <textarea 
            className="sanction-note"
            value={sanctionNote}
            onChange={(e) => setSanctionNote(e.target.value)}
            rows="3"
          />
        </div>

        {/* Sanction Letter (Letter of Offer / DO) — only once the sanction is approved */}
        {sanctionApproved && (
          <div className="full-width-card">
            <h3>Sanction letter</h3>
            <p className="field-note">
              Generates the Letter of Offer with this lead's current sanction terms, opened in a new tab for "Save as PDF".
              WhatsApp sharing opens a chat with the applicant's number — the saved PDF must be attached manually (no WhatsApp
              Business API is wired up in this app).
            </p>
            <div className="action-buttons" style={{ marginTop: "8px" }}>
              <button type="button" className="btn-primary" onClick={handleGenerateSanctionLetter}>
                Generate sanction letter (PDF)
              </button>
              <button type="button" className="btn-primary" onClick={handleShareOnWhatsapp}>
                Share on WhatsApp
              </button>
              <button type="button" className="back-btn" onClick={() => navigate("/ho-dashboard")}>
                Go to dashboard →
              </button>
            </div>
            {letterMessage && (
              <small
                className="field-note"
                style={{ color: letterMessage.type === "success" ? "#1e7e34" : "#c0392b", display: "block", marginTop: "8px" }}
              >
                {letterMessage.text}
              </small>
            )}
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        {/* Footer Info */}
        <div className="footer-info">
          {/* <span>✓ Decision logged with authority ID, IP, timestamp</span>
          <span className="four-eye">4-eye check if &gt; sanction limit</span> */}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="back-btn" onClick={handleBack} disabled={isSubmitting}>← Back</button>
          {!sanctionApproved && (
            <>
              <button className="refer-btn" onClick={handleReferBack} disabled={isSubmitting}>Refer back</button>
              <button className="decline-btn" onClick={handleDecline} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Decline"}
              </button>
            </>
          )}
          <button className="approve-btn" onClick={handleApprove} disabled={isSubmitting || sanctionApproved}>
            {sanctionApproved ? "✓ Approved" : isSubmitting ? "Saving..." : "Approve sanction →"}
          </button>
        </div>
      </div>

      {/* Refer Back Modal */}
      {showReferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Refer Back Application</h3>
            <textarea 
              className="modal-textarea"
              placeholder="Enter reason for refer back..."
              value={referBackNote}
              onChange={(e) => setReferBackNote(e.target.value)}
              rows="4"
            />
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={() => setShowReferModal(false)} disabled={isSubmitting}>Cancel</button>
              <button className="modal-submit" onClick={submitReferBack} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SanctionReview;