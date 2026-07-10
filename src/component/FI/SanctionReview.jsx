import React, { useState } from "react";
import "../../assets/css/SanctionReview.css";
import logo from "../../assets/image/logo.png";
import { useNavigate } from "react-router-dom";
import { API } from "../api/apiRoutes";

// ASSUMPTION: only decision=1 (Approved) was confirmed via curl. Declined/Referred-back
// codes are guessed — confirm the real values with the backend before relying on them.
const DECISION_CODE = {
  APPROVED: 1,
  DECLINED: 2,
  REFERRED_BACK: 3,
};

const SanctionReview = () => {
  const navigate = useNavigate();

  const [sanctionNote, setSanctionNote] = useState("e.g. Approved with condition: post-dated reference verification within 7 days; cap LTV at 80% if on-road price revised.");
  const [sanctionAmount, setSanctionAmount] = useState("150000");
  const [showReferModal, setShowReferModal] = useState(false);
  const [referBackNote, setReferBackNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // POST /save-sanction expects application/x-www-form-urlencoded, not JSON.
  const submitSanctionDecision = async (decision, note) => {
    const kycId = localStorage.getItem("applicant_kyc_id") || "1";
    const empId = localStorage.getItem("emp_id") || "1";

    setError("");
    setIsSubmitting(true);

    try {
      const body = new URLSearchParams({
        kyc_id: kycId,
        emp_id: empId,
        decision: String(decision),
        sanction_amt: sanctionAmount,
        sanction_note: note,
      });

      const res = await fetch(API.SANCTION_SAVE_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const data = await res.json();

      if (!res.ok || data?.status === false || data?.success === false) {
        throw new Error(data?.message || `Save failed (HTTP ${res.status})`);
      }

      return true;
    } catch (err) {
      setError(err.message || "Something went wrong while saving the sanction decision.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    const ok = await submitSanctionDecision(DECISION_CODE.APPROVED, sanctionNote);
    if (ok) {
      alert("Sanction approved! Proceeding to next stage...");
      navigate("/vehicle-delivery");
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
            <strong>VED-7185-2826</strong>
          </div>
        </div>
      </div>

      <div className="sanction-content">
        {/* Row 1: Three Cards in One Row */}
        <div className="cards-row">
          {/* Identity & Images Card */}
          <div className="info-card">
            <h3>Identity & Images</h3>
            <div className="checklist">
              <div className="check-item">✓ Aadhaar EKYC</div>
              <div className="check-item">✓ PAN (NSDL)</div>
              <div className="check-item">✓ Applicant live image</div>
              <div className="check-item">✓ Co-applicant image</div>
              <div className="check-item">✓ House proof</div>
            </div>
          </div>

          {/* BANKING & BUREAU Card */}
          <div className="info-card">
            <h3>BANKING & BUREAU</h3>
            <div className="details-list">
              <div className="detail-item">
                <span>Penny-drop</span>
                <span className="value">✓</span>
              </div>
              <div className="detail-item">
                <span>CB score</span>
                <span className="value">742</span>
              </div>
              <div className="detail-item">
                <span>Active loans</span>
                <span className="value">1</span>
              </div>
              <div className="detail-item">
                <span>Overdue / DPD</span>
                <span className="value success">No overdue</span>
              </div>
              <div className="detail-item">
                <span>Monthly obligation</span>
                <span className="value">₹2,400</span>
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
              <div className="check-item">✓ Video PD</div>
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
        <div className="full-width-card">
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
        </div>

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
              <span className="label">LTV</span>
              <span className="value">81.1%</span>
            </div>
            <div className="loan-detail-item">
              <span className="label">Tenure</span>
              <span className="value">24 months</span>
            </div>
            <div className="loan-detail-item">
              <span className="label">EMI</span>
              <span className="value">₹7,150</span>
            </div>
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

        {error && <div className="error-msg">{error}</div>}

        {/* Footer Info */}
        <div className="footer-info">
          <span>✓ Decision logged with authority ID, IP, timestamp</span>
          <span className="four-eye">4-eye check if &gt; sanction limit</span>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="back-btn" onClick={handleBack} disabled={isSubmitting}>← Back</button>
          <button className="refer-btn" onClick={handleReferBack} disabled={isSubmitting}>Refer back</button>
          <button className="decline-btn" onClick={handleDecline} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Decline"}
          </button>
          <button className="approve-btn" onClick={handleApprove} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Approve sanction →"}
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