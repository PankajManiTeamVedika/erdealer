import React, { useEffect, useState } from "react";
import "../assets/css/SanctionReview.css";
import logo from "../assets/image/logo.png";
import { useNavigate, useParams } from "react-router-dom";
import { getStatusInfo, getVehicleDeliveryStatus, isMandateComplete, POST_SANCTION_STAGE_KEYS } from "./utils/leadStatus";
import { DEALER_API_BASE } from "./api/apiRoutes";
import { parseStoredJson } from "./utils/parseStoredJson";

const baseURL = DEALER_API_BASE;

// Read-only "View" landing for the dealer's Sourcing Pipeline: shows the full
// customer record, then unlocks the vehicle-delivery step once HO's sanction
// decision (sanction_status) comes back as 1 (approved).
const LeadDetails = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);

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

    fetchCustomer();
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
  // Bank holder name comes from the penny-drop verification saved during Document
  // Collection (Stage 2) — same stored-JSON shape as the dealer onboarding penny-drop.
  const pennyDropData = parseStoredJson(customer?.penny_drop_response)?.data || {};

  const fiStatus = Number(customer?.fi_status);
  const sanctionStatus = Number(customer?.sanction_status);
  const vehicleDeliveryStatus = getVehicleDeliveryStatus(customer || {});
  const status = getStatusInfo(customer || {});
  // Post-sanction is one continuous action for the dealer: e-Mandate & e-Sign
  // (LoanExecution.jsx) first, then adding vehicle details — covers both the
  // "mandate_pending" and "post_sanction_pending" stages.
  const isPostSanctionPending = POST_SANCTION_STAGE_KEYS.includes(status.key);
  const isDelivered = status.key === "delivered";
  const isMandateApproved = status.key === "mandate_approved";

  const handleBack = () => navigate("/sourcing-pipeline");

  return (
    <div className="sanction-page">
      <div className="corner-bubbles">
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
        <div className="bubble bubble-4"></div>
        <div className="bubble bubble-5"></div>
        <div className="bubble bubble-6"></div>
      </div>

      <div className="page-header">
        <div className="header-content">
          <div className="logo-area">
            <img src={logo} alt="Vedika" className="header-logo" />
            <div>
              <h1>Lead details</h1>
            </div>
          </div>
          <div className="lead-info">
            <span>Lead ID</span>
            <strong>{customer?.application_id || "—"}</strong>
          </div>
        </div>
      </div>

      {loading && <div className="loading-msg">Loading customer details...</div>}

      <div className="sanction-content">
        {customer && (
          <div className="full-width-card">
            <div className="card-header-flex">
              <h3>Full Customer Details</h3>
            </div>

            <div className="full-details-grid">
              <div className="detail-category">
                <h4>Applicant Details</h4>
                <div className="details-list">
                  <div className="detail-item"><span>Name</span><span className="value">{customer.applicant_name || "—"}</span></div>
                  <div className="detail-item"><span>Mobile</span><span className="value">{customer.applicant_mobile || "—"}</span></div>
                  <div className="detail-item"><span>Aadhaar</span><span className="value">{customer.applicant_aadhaar || "—"}</span></div>
                  <div className="detail-item"><span>PAN</span><span className="value">{customer.applicant_pan || "—"}</span></div>
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
                  <div className="detail-item"><span>CB Score</span><span className="value">{coApplicantCb.cb_score ?? customer.co_applicant_cibil_score ?? "N/A"}</span></div>
                  <div className="detail-item"><span>OD Amount</span><span className="value">{coApplicantCb.odAmount != null ? `₹${coApplicantCb.odAmount}` : "—"}</span></div>
                  <div className="detail-item"><span>DPD</span><span className="value">{coApplicantCb.dpd ?? "—"}</span></div>
                  <div className="detail-item"><span>Total Balance Amount</span><span className="value">{coApplicantCb.outstandingBalanceAmount != null ? `₹${coApplicantCb.outstandingBalanceAmount}` : "—"}</span></div>
                </div>
              </div>

              <div className="detail-category">
                <h4>Vehicle & Loan Details</h4>
                <div className="details-list">
                  <div className="detail-item"><span>Manufacturer</span><span className="value">{customer.manufacturer_name || "—"}</span></div>
                  <div className="detail-item"><span>Model</span><span className="value">{customer.model || "—"}</span></div>
                  <div className="detail-item"><span>Battery Capacity</span><span className="value">{customer.battery_capacity || "—"}</span></div>
                  <div className="detail-item"><span>Ex-Showroom Price</span><span className="value">₹{customer.ex_showroom_price || "—"}</span></div>
                  <div className="detail-item"><span>On-Road Price</span><span className="value">₹{customer.on_road_price || "—"}</span></div>
                  {/* <div className="detail-item"><span>On-Board Price</span><span className="value">{customer.on_board_price ? `₹${customer.on_board_price}` : "—"}</span></div> */}
                  <div className="detail-item"><span>Loan Amount</span><span className="value">₹{customer.loan_amount || "—"}</span></div>
                  <div className="detail-item"><span>Interest Rate(Reduce)</span><span className="value">{customer.interest_rate ? `${customer.interest_rate}%` : ""}30%</span></div>
                  <div className="detail-item"><span>EMI Amount</span><span className="value">{customer.emi_amount ? `₹${customer.emi_amount}` : "—"}</span></div>
                  <div className="detail-item"><span>Tenure</span><span className="value">{customer.tenure || "—"} months</span></div>
                  <div className="detail-item"><span>Processing Fee</span><span className="value">₹{customer.processing_fee || "—"}</span></div>
                  <div className="detail-item"><span>Dealer Subvention</span><span className="value">₹{customer.dealer_subvention || "—"}</span></div>
                  {/* <div className="detail-item"><span>Down Payment</span><span className="value">{customer.down_payment ? `₹${customer.down_payment}` : "—"}</span></div> */}
                  <div className="detail-item"><span>Customer Down Payment</span><span className="value">₹{customer.customer_down_payment || "—"}</span></div>
                  <div className="detail-item"><span>Total Down Payment</span><span className="value">₹{customer.total_down_payment || "—"}</span></div>
                  <div className="detail-item"><span>LTV Ratio</span><span className="value">{customer.ltv_ratio || "—"}%</span></div>
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
                <h4>Dealer & Sourcing Details</h4>
                <div className="details-list">
                  <div className="detail-item"><span>Dealer Name</span><span className="value">{customer.dealer_name || "—"}</span></div>
                  <div className="detail-item"><span>Dealer Code</span><span className="value">{customer.dealer_code || "—"}</span></div>
                  <div className="detail-item"><span>Branch Name</span><span className="value">{customer.dealer_branch || customer.branch_name || "—"}</span></div>
                  <div className="detail-item"><span>Employee ID</span><span className="value">{customer.employee_id || "—"}</span></div>
                  {/* <div className="detail-item"><span>Sales Executive</span><span className="value">{customer.sales_executive_name || "—"}</span></div> */}
                </div>
              </div>

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

              <div className="detail-category">
                <h4>Application Meta</h4>
                <div className="details-list">
                  <div className="detail-item"><span>Application Status</span><span className="value">{customer.application_status || "—"}</span></div>
                  <div className="detail-item"><span>Current Stage</span><span className="value">{status.label}</span></div>
                  <div className="detail-item"><span>FI Status</span><span className="value">{fiStatus ? "Completed" : "Pending"}</span></div>
                  <div className="detail-item"><span>Sanction Status</span><span className="value">{sanctionStatus === 1 ? "Sanctioned" : "Pending"}</span></div>
                  <div className="detail-item"><span>Vehicle Delivery Status</span><span className="value">{vehicleDeliveryStatus === 2 ? "Verified · HO Approved" : vehicleDeliveryStatus === 1 ? "Delivered · Pending HO Verification" : "Pending"}</span></div>
                  <div className="detail-item"><span>Mandate Status</span><span className="value">{isMandateComplete(customer) ? "Approved" : "Pending"}</span></div>
                  <div className="detail-item"><span>Created At</span><span className="value">{customer.created_at || "—"}</span></div>
                  <div className="detail-item"><span>Updated At</span><span className="value">{customer.updated_at || "—"}</span></div>
                  {/* <div className="detail-item"><span>Remarks</span><span className="value">{customer.remarks || "—"}</span></div> */}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="full-width-card">
          <h3>Next step</h3>
          {isPostSanctionPending ? (
            <>
              <p>HO sanction is complete. Complete e-Mandate & e-Sign first, then fill in the vehicle delivery details.</p>
              <div className="action-buttons">
                <button className="back-btn" onClick={handleBack}>← Back to pipeline</button>
                <button className="approve-btn" onClick={() => navigate(`/loan-execution/${customerId}`)}>
                  Start e-Mandate & e-Sign →
                </button>
              </div>
            </>
          ) : isDelivered ? (
            <>
              <p>Vehicle has already been delivered for this lead — awaiting HO's delivery verification.</p>
              <div className="action-buttons">
                <button className="back-btn" onClick={handleBack}>← Back to pipeline</button>
              </div>
            </>
          ) : isMandateApproved ? (
            <>
              <p>Mandate has been approved. This lead has completed the full onboarding funnel.</p>
              <div className="action-buttons">
                <button className="back-btn" onClick={handleBack}>← Back to pipeline</button>
              </div>
            </>
          ) : (
            <>
              <p>
                Vehicle delivery unlocks once HO completes the sanction decision.
                {" "}Current status: {!fiStatus ? "FI pending" : "Sanction pending"}.
              </p>
              <div className="action-buttons">
                <button className="back-btn" onClick={handleBack}>← Back to pipeline</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;
