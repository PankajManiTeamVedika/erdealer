import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../assets/css/DealerDetails.css";
import logo from "../assets/image/logowhite.png";
import { API } from "../component/api/apiRoutes";

const baseURL = "https://vfpl.teamvedika.com/dealer-api";

const DealerDetails = () => {
  const { dealerId } = useParams();
  const navigate = useNavigate();
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState({});
  const [cancelDocIdx, setCancelDocIdx] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelledDocs, setCancelledDocs] = useState({});

  useEffect(() => {
    const fetchDealer = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API.DEALERS}/${dealerId}`);
        const result = await res.json();
        console.log("Dealer API response:", result);
        if (result.status) {
          setDealer(result.data);
        } else {
          alert(result.message || "Dealer not found");
        }
      } catch (err) {
        console.error("Dealer fetch error:", err);
        alert("Failed to fetch dealer details");
      } finally {
        setLoading(false);
      }
    };
    fetchDealer();
  }, [dealerId]);

  // inside DealerDetails.jsx component
  const handleApprove = async () => {
    if (!dealer) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API.DEALERS}/${dealer.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      const data = await res.json();
      if (data.status) {
        alert(`Dealer approved successfully`);
        setDealer(prev => ({ ...prev, status: 'ACTIVE' }));
      } else {
        alert(data.message || "Approval failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!dealer) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API.DEALERS}/${dealer.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' })
      });
      const data = await res.json();
      if (data.status) {
        alert(`Dealer rejected successfully`);
        setDealer(prev => ({ ...prev, status: 'REJECTED' }));
      } else {
        alert(data.message || "Rejection failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleBlock = () => {
    setActionInProgress(true);
    setTimeout(() => {
      alert(`Dealer ${dealer.login_user_id} has been blocked.`);
      setActionInProgress(false);
      navigate("/ho-dashboard");
    }, 1000);
  };

  if (loading) return <div className="loading">Loading dealer details...</div>;
  if (!dealer) return <div className="error">Dealer not found.</div>;

  // Normalize status: API returns "active" for approved dealers
  let displayStatus = dealer.status?.toLowerCase();
  if (displayStatus === "active") displayStatus = "approved";
  const statusClass = displayStatus || "pending";
  const isPending = displayStatus === "pending";

  const uploadedCount = dealer.documents?.length || 0;

  // Helper to get full image URL
  const getFullUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    return `${baseURL}/${url}`;
  };

  const toggleDocChecked = (idx) => {
    setCheckedDocs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const openCancelModal = (idx) => {
    setCancelReason(cancelledDocs[idx]?.reason || "");
    setCancelDocIdx(idx);
  };

  const closeCancelModal = () => {
    setCancelDocIdx(null);
    setCancelReason("");
  };

  const confirmCancelDoc = () => {
    if (!cancelReason.trim()) return;
    setCancelledDocs((prev) => ({ ...prev, [cancelDocIdx]: { reason: cancelReason.trim() } }));
    setCheckedDocs((prev) => ({ ...prev, [cancelDocIdx]: false }));
    closeCancelModal();
  };

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
              <h1>Dealer Details</h1>
              <p>Application ID: {dealer.login_user_id}</p>
            </div>
          </div>
          <div className="status-badge large">
            Status:{" "}
            <strong className={statusClass}>
              {displayStatus === "approved" ? "APPROVED" : displayStatus?.toUpperCase()}
            </strong>
          </div>
        </div>
      </div>

      <div className="details-layout">
        {/* LEFT COLUMN – Form Data */}
        <div className="details-left">
          {/* Step 1 - Location */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">1</span><h3>Dealer Location Details</h3></div>
            <div className="info-row"><span className="label">State:</span><span>{dealer.state || "—"}</span></div>
            <div className="info-row"><span className="label">District:</span><span>{dealer.district || "—"}</span></div>
            <div className="info-row"><span className="label">Branch:</span><span>{dealer.branch || "—"}</span></div>
            <div className="info-row"><span className="label">Manufacturer Name:</span><span>{dealer.manufacturer_name || "—"}</span></div>
          </div>

          {/* Step 2 - Firm & Owner */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">2</span><h3>Firm & Owner Details</h3></div>
            <div className="info-row"><span className="label">Legal Name:</span><span>{dealer.legal_name || dealer.showroom_name || "—"}</span></div>
            <div className="info-row"><span className="label">Entity Type:</span><span>{dealer.firm_type || "—"}</span></div>
            <div className="info-row"><span className="label">Year of Business:</span><span>{dealer.year_of_business || "—"}</span></div>
            <div className="info-row"><span className="label">Firm PAN:</span><span>{dealer.firm_pan || "—"}</span></div>
            <div className="info-row"><span className="label">GST Number:</span><span>{dealer.gst_number || "—"}</span></div>
            <div className="info-row"><span className="label">Showroom Address:</span><span>{dealer.showroom_address || dealer.address || "—"}</span></div>
            <div className="info-row"><span className="label">Owner Name:</span><span>{dealer.owner_name || "—"}</span></div>
            <div className="info-row"><span className="label">Owner PAN:</span><span>{dealer.owner_pan || "—"}</span></div>
            <div className="info-row"><span className="label">Owner Contact:</span><span>+91 {dealer.owner_contact || "—"}</span></div>
            <div className="info-row"><span className="label">Owner Email:</span><span>{dealer.owner_email || "—"}</span></div>
            <div className="info-row"><span className="label">Owner Aadhaar:</span><span>{dealer.owner_aadhaar || "—"}</span></div>
          </div>

          {/* Step 3 - Documents */}
          <div className="info-card">
            <div className="step-header"><span className="step-num">3</span><h3>Document Upload Checklist</h3></div>
            {dealer.documents && dealer.documents.length > 0 ? (
              <>
                <div className="doc-verify-summary">
                  {Object.values(checkedDocs).filter(Boolean).length} of {dealer.documents.length} documents verified
                </div>
                <div className="doc-list">
                {dealer.documents.map((doc, idx) => (
                  <div key={idx} className={`doc-item ${!checkedDocs[idx] ? "doc-unverified" : ""}`}>
                    <label className={`check-line doc-check ${cancelledDocs[idx] ? "doc-check-disabled" : ""}`}>
                      <input
                        type="checkbox"
                        checked={!!checkedDocs[idx]}
                        onChange={() => toggleDocChecked(idx)}
                        disabled={!!cancelledDocs[idx]}
                      />
                      <span>{doc.document_type}:</span>
                    </label>
                    <div className="doc-item-right">
                      {cancelledDocs[idx] ? (
                        <span className="cancelled-badge" title={cancelledDocs[idx].reason}>Cancelled</span>
                      ) : (
                        !checkedDocs[idx] && <span className="not-verified-badge">Not Verified</span>
                      )}
                      {doc.document_url?.endsWith(".pdf") ? (
                        <a href={getFullUrl(doc.document_url)} target="_blank" rel="noopener noreferrer" className="doc-link">
                          📄 View PDF
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="image-preview-btn"
                          onClick={() => {
                            setImageLoading(true);
                            setPreviewImage(getFullUrl(doc.document_url));
                          }}
                        >
                          🖼️ View Image
                        </button>
                      )}
                      {!checkedDocs[idx] && (
                        <button
                          type="button"
                          className="doc-cancel-btn"
                          onClick={() => openCancelModal(idx)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </>
            ) : (
              <p className="no-docs">No documents uploaded</p>
            )}
          </div>

          {/* Step 4 - Bank */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">4</span><h3>Bank Verification</h3></div>
            <div className="info-row"><span className="label">Account Number:</span><span>{dealer.bank_account || "—"}</span></div>
            <div className="info-row"><span className="label">IFSC Code:</span><span>{dealer.ifsc_code || "—"}</span></div>
            <div className="info-row"><span className="label">Bank Name:</span><span>{dealer.bank_name || "—"}</span></div>
          </div>

          {/* Step 5 - Declarations */}
          <div className="info-card">
            <div className="step-header"><span className="step-num">5</span><h3>Declaration & Consent</h3></div>
            <div className="consent-list">
              <div className="consent-item">✓ I confirm all uploaded documents are genuine, current and belong to the applicant firm.</div>
              <div className="consent-item">✓ I authorize Vedika to verify KYC, conduct CIBIL commercial bureau pull and perform penny-drop on the bank account.</div>
              <div className="consent-item">✓ I agree to source only the manufacturer and models for which I have valid employment with Vedika.</div>
              <div className="consent-item">✓ I consent to Vedika dealer code of conduct, data privacy terms and field re-verification at any time.</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN – Progress, Verifications, Actions */}
        <div className="details-right">
          {/* Application Progress */}
          <div className="progress-card">
            <h3>APPLICATION PROGRESS</h3>
            <ul>
              <li><span className="green"></span> Dealer details</li>
              <li><span className={uploadedCount > 0 ? "green" : "amber"}></span> Documents uploaded</li>
              <li><span className={dealer.bank_account ? "green" : "gray"}></span> Bank verification</li>
              <li><span className="green"></span> Declaration</li>
              <li><span className={!isPending ? "green" : "gray"}></span> Final approval</li>
            </ul>
          </div>

          {/* Action Buttons – Conditional */}
          <div className="action-buttons">
            <button className="back-btn" onClick={() => navigate(`/application-status`)}>
              ← Assign to Dealer
            </button>

            {dealer.status.toLowerCase() === 'pending' ? (
              <div className="approve-reject">
                <button
                  className="reject-btn"
                  onClick={handleReject}
                  disabled={actionInProgress}
                >
                  Reject
                </button>
                <button
                  className="approve-btn"
                  onClick={handleApprove}
                  disabled={actionInProgress}
                >
                  Approve
                </button>
              </div>
            ) : (
              <button
                className="block-btn"
                onClick={() => alert("Block action placeholder")}
                disabled={actionInProgress}
              >
                Block Dealer
              </button>
            )}
          </div>
        </div>
      </div>

      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="modal-content image-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setPreviewImage(null)}>✕</button>
            {imageLoading && <div className="image-loader"></div>}
            <img
              src={previewImage}
              alt="Document preview"
              style={{ display: imageLoading ? "none" : "block" }}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
          </div>
        </div>
      )}

      {cancelDocIdx !== null && (
        <div className="modal-overlay" onClick={closeCancelModal}>
          <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeCancelModal}>✕</button>
            <h3>Cancel Document</h3>
            <p className="cancel-doc-name">{dealer.documents[cancelDocIdx]?.document_type}</p>
            <textarea
              className="cancel-reason-input"
              placeholder="Enter reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={closeCancelModal}>Close</button>
              <button
                className="modal-submit"
                onClick={confirmCancelDoc}
                disabled={!cancelReason.trim()}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerDetails;