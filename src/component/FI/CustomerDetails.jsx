import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../assets/css/DealerDetails.css";
import logo from "../../assets/image/logowhite.png";

const baseURL = "https://vfpl.teamvedika.com/dealer-api";

const CustomerDetails = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
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
        console.error("Customer fetch error:", err);
        alert("Failed to fetch customer details");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [customerId]);

  const getFullUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    return `${baseURL}/${url}`;
  };

  const uploadedCount = [
    customer?.aadhaar_copy_file,
    customer?.pan_copy_file,
    customer?.house_proof_file,
    customer?.applicant_image,
    customer?.co_applicant_image,
    customer?.quotation_image,
  ].filter(Boolean).length;

  // Handle Verify & Approve – now redirects to /vehicle-delivery
//   const handleVerify = async () => {
//     if (!customer) return;
//     setActionLoading(true);
//     try {
//       const res = await fetch(`${baseURL}/public/api/customer/${customer.id}/verify`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status: 'VERIFIED' })
//       });
//       const data = await res.json();
//       if (data.success) {
//         alert(`Customer ${customer.application_id} verified successfully.`);
//         // Redirect to vehicle-delivery page
//         navigate("/vehicle-delivery");
//       } else {
//         alert(data.message || "Verification failed");
//       }
//     } catch (err) {
//       console.error(err);
//       alert("Server error");
//     } finally {
//       setActionLoading(false);
//     }
//   };

const handleVerify = async () => {
     navigate("/field-investigation");
}

  const handleRejectOpen = () => {
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    if (!customer) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${baseURL}/public/api/customer/${customer.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: rejectReason })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Customer ${customer.application_id} rejected. Reason: ${rejectReason}`);
        setShowRejectModal(false);
        navigate("/fi-dashboard");
      } else {
        alert(data.message || "Rejection failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading customer details...</div>;
  if (!customer) return <div className="error">Customer not found.</div>;

  const displayStatus = customer.application_status || "SUBMITTED";
  const statusClass = displayStatus.toLowerCase();

  return (
    <div className="dealer-details-page">
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
              <h1>Customer Details</h1>
              <p>Application ID: {customer.application_id}</p>
            </div>
          </div>
          <div className="status-badge large">
            Status:{" "}
            <strong className={statusClass}>
              {displayStatus}
            </strong>
          </div>
        </div>
      </div>

      <div className="details-layout">
        {/* LEFT COLUMN – Customer Data (unchanged) */}
        <div className="details-left">
          {/* Applicant Details */}
          <div className="info-card">
            <div className="step-header"><span className="step-num">1</span><h3>Applicant Details</h3></div>
            <div className="info-row"><span className="label">Name:</span><span>{customer.applicant_name || "—"}</span></div>
            <div className="info-row"><span className="label">Mobile:</span><span>{customer.applicant_mobile || "—"}</span></div>
            <div className="info-row"><span className="label">Aadhaar:</span><span>{customer.applicant_aadhaar || "—"}</span></div>
            <div className="info-row"><span className="label">PAN:</span><span>{customer.applicant_pan || "—"}</span></div>
            <div className="info-row"><span className="label">CIBIL Score:</span><span>{customer.applicant_cibil_score || "N/A"}</span></div>
          </div>

          {/* Co-Applicant Details */}
          <div className="info-card">
            <div className="step-header"><span className="step-num">2</span><h3>Co-Applicant Details</h3></div>
            <div className="info-row"><span className="label">Name:</span><span>{customer.co_applicant_name || "—"}</span></div>
            <div className="info-row"><span className="label">Mobile:</span><span>{customer.co_applicant_mobile || "—"}</span></div>
            <div className="info-row"><span className="label">Aadhaar:</span><span>{customer.co_applicant_aadhaar || "—"}</span></div>
            <div className="info-row"><span className="label">PAN:</span><span>{customer.co_applicant_pan || "—"}</span></div>
            <div className="info-row"><span className="label">CIBIL Score:</span><span>{customer.co_applicant_cibil_score || "N/A"}</span></div>
          </div>

          {/* Vehicle & Loan Details */}
          <div className="info-card">
            <div className="step-header"><span className="step-num">3</span><h3>Vehicle & Loan Details</h3></div>
            <div className="info-row"><span className="label">Manufacturer:</span><span>{customer.manufacturer_name || "—"}</span></div>
            <div className="info-row"><span className="label">Model:</span><span>{customer.model || "—"}</span></div>
            <div className="info-row"><span className="label">Ex-Showroom Price:</span><span>₹{customer.ex_showroom_price || "—"}</span></div>
            <div className="info-row"><span className="label">On-Road Price:</span><span>₹{customer.on_road_price || "—"}</span></div>
            <div className="info-row"><span className="label">Loan Amount:</span><span>₹{customer.loan_amount || "—"}</span></div>
            <div className="info-row"><span className="label">Tenure:</span><span>{customer.tenure || "—"} months</span></div>
            <div className="info-row"><span className="label">Processing Fee:</span><span>₹{customer.processing_fee || "—"}</span></div>
            <div className="info-row"><span className="label">Dealer Subvention:</span><span>₹{customer.dealer_subvention || "—"}</span></div>
            <div className="info-row"><span className="label">Customer Down Payment:</span><span>₹{customer.customer_down_payment || "—"}</span></div>
            <div className="info-row"><span className="label">Total Down Payment:</span><span>₹{customer.total_down_payment || "—"}</span></div>
            <div className="info-row"><span className="label">LTV Ratio:</span><span>{customer.ltv_ratio || "—"}%</span></div>
          </div>

          {/* Bank Details */}
          <div className="info-card">
            <div className="step-header"><span className="step-num">4</span><h3>Bank Details</h3></div>
            <div className="info-row"><span className="label">Account Number:</span><span>{customer.bank_account_number || "—"}</span></div>
            <div className="info-row"><span className="label">IFSC Code:</span><span>{customer.ifsc_code || "—"}</span></div>
            <div className="info-row"><span className="label">Bank Name:</span><span>{customer.bank_name || "—"}</span></div>
          </div>

          {/* Reference Details */}
          <div className="info-card">
            <div className="step-header"><span className="step-num">5</span><h3>Reference Details</h3></div>
            <div className="info-row"><span className="label">Ref 1 Name:</span><span>{customer.ref1_name || "—"}</span></div>
            <div className="info-row"><span className="label">Relationship:</span><span>{customer.ref1_relationship || "—"}</span></div>
            <div className="info-row"><span className="label">Mobile:</span><span>{customer.ref1_mobile || "—"}</span></div>
            <div className="info-row"><span className="label">Ref 2 Name:</span><span>{customer.ref2_name || "—"}</span></div>
            <div className="info-row"><span className="label">Relationship:</span><span>{customer.ref2_relationship || "—"}</span></div>
            <div className="info-row"><span className="label">Mobile:</span><span>{customer.ref2_mobile || "—"}</span></div>
          </div>

          {/* Documents */}
          <div className="info-card">
            <div className="step-header"><span className="step-num">6</span><h3>Uploaded Documents</h3></div>
            <div className="doc-list">
              <div className="doc-item">
                <span>Aadhaar Copy:</span>
                {customer.aadhaar_copy_file ? (
                  <a href={getFullUrl(customer.aadhaar_copy_file)} target="_blank" rel="noopener noreferrer" className="doc-link">📄 View</a>
                ) : <span className="no-docs">Not uploaded</span>}
              </div>
              <div className="doc-item">
                <span>PAN Copy:</span>
                {customer.pan_copy_file ? (
                  <a href={getFullUrl(customer.pan_copy_file)} target="_blank" rel="noopener noreferrer" className="doc-link">📄 View</a>
                ) : <span className="no-docs">Not uploaded</span>}
              </div>
              <div className="doc-item">
                <span>House Proof:</span>
                {customer.house_proof_file ? (
                  <a href={getFullUrl(customer.house_proof_file)} target="_blank" rel="noopener noreferrer" className="doc-link">📄 View</a>
                ) : <span className="no-docs">Not uploaded</span>}
              </div>
              <div className="doc-item">
                <span>Applicant Image:</span>
                {customer.applicant_image ? (
                  <a href={getFullUrl(customer.applicant_image)} target="_blank" rel="noopener noreferrer" className="doc-link">🖼️ View</a>
                ) : <span className="no-docs">Not uploaded</span>}
              </div>
              <div className="doc-item">
                <span>Co-Applicant Image:</span>
                {customer.co_applicant_image ? (
                  <a href={getFullUrl(customer.co_applicant_image)} target="_blank" rel="noopener noreferrer" className="doc-link">🖼️ View</a>
                ) : <span className="no-docs">Not uploaded</span>}
              </div>
              <div className="doc-item">
                <span>Quotation:</span>
                {customer.quotation_image ? (
                  <a href={getFullUrl(customer.quotation_image)} target="_blank" rel="noopener noreferrer" className="doc-link">📄 View</a>
                ) : <span className="no-docs">Not uploaded</span>}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN – Progress, Verifications, Actions */}
        <div className="details-right">
          {/* Application Progress */}
          <div className="progress-card">
            <h3>APPLICATION PROGRESS</h3>
            <ul>
              <li><span className="green"></span> Applicant Details</li>
              <li><span className={customer.co_applicant_name ? "green" : "gray"}></span> Co-Applicant</li>
              <li><span className={uploadedCount > 0 ? "green" : "amber"}></span> Documents Uploaded</li>
              <li><span className={customer.bank_account_number ? "green" : "gray"}></span> Bank Details</li>
              <li><span className="green"></span> References</li>
              <li><span className={customer.application_status === "SUBMITTED" ? "green" : "gray"}></span> Final Submission</li>
            </ul>
            <div className="progress-bar"><div style={{ width: "70%" }}></div></div>
            <p className="progress-percent">Completion 70%</p>
          </div>

          {/* Auto-Verifications */}
          <div className="auto-verif-card">
            <div className="auto-verif-header">
              <div><h3>Auto-Verifications</h3><p>Live verification status</p></div>
              <span className="live-pulse">● LIVE</span>
            </div>
            <div className="verif-list">
              <div className="verif-row"><span>PAN</span><span className="status success">Verified</span></div>
              <div className="verif-row"><span>Aadhaar EKYC</span><span className="status success">Verified</span></div>
              <div className="verif-row"><span>Mobile OTP</span><span className="status success">Verified</span></div>
              <div className="verif-row"><span>Bank Penny-drop</span><span className="status pending">Pending</span></div>
              <div className="verif-row"><span>CIBIL Commercial</span><span className="status submit">On Submit</span></div>
            </div>
          </div>

          {/* Predicted Routing */}
          <div className="routing-box">
            <h4>Predicted Routing</h4>
            <p>FI Verification</p>
            <p>If all documents are verified, application will move to underwriting.</p>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="back-btn" onClick={() => navigate("/fi-dashboard")}>
              ← Back to Dashboard
            </button>
            <div className="approve-reject">
              <button className="reject-btn" onClick={handleRejectOpen} disabled={actionLoading}>
                Reject
              </button>
              <button className="approve-btn" onClick={handleVerify} disabled={actionLoading}>
                {actionLoading ? "Processing..." : "Verify & Approve"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Application</h3>
            <p>Please provide the reason for rejection.</p>
            <textarea
              className="modal-textarea"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows="4"
              placeholder="Enter rejection reason..."
            />
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button className="modal-submit" onClick={handleRejectSubmit} disabled={actionLoading}>
                {actionLoading ? "Submitting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;