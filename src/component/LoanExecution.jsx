import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/LoanExecution.css";
import logo from "../assets/image/logowhite.png";
import { API } from "./api/apiRoutes";

const LoanExecution = () => {
  const navigate = useNavigate();

  // Step 1 state
  const [mandateAuthenticated, setMandateAuthenticated] = useState(false);
  const [isInitiatingMandate, setIsInitiatingMandate] = useState(false);
  const [mandateError, setMandateError] = useState("");

  // POST /initiate-mandate expects application/x-www-form-urlencoded, not JSON.
  const handleInitiateMandate = async () => {
    if (isInitiatingMandate || mandateAuthenticated) return;

    const kycId = localStorage.getItem("applicant_kyc_id") || "1";
    const empId = localStorage.getItem("emp_id") || "1";

    setMandateError("");
    setIsInitiatingMandate(true);

    try {
      const body = new URLSearchParams({
        kyc_id: kycId,
        emp_id: empId,
      });

      const res = await fetch(API.INITIATE_MANDATE_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const data = await res.json();

      if (!res.ok || data?.status === false || data?.success === false || data?.status === "ERROR") {
        throw new Error(data?.message || `Mandate initiation failed (HTTP ${res.status})`);
      }

      setMandateAuthenticated(true);
    } catch (err) {
      setMandateError(err.message || "Something went wrong while initiating the mandate.");
    } finally {
      setIsInitiatingMandate(false);
    }
  };

  // Step 2 state
  const [applicantSigned, setApplicantSigned] = useState(true); // already signed
  const [coApplicantSigned, setCoApplicantSigned] = useState(false);
  const [isSendingSign, setIsSendingSign] = useState(false);

  const handleSendSignRequest = () => {
    if (isSendingSign) return;
    setIsSendingSign(true);
    // Simulate sending e-Sign request
    setTimeout(() => {
      setIsSendingSign(false);
      setCoApplicantSigned(true);
      alert("e-Sign request sent to Co-applicant. They have signed.");
    }, 1500);
  };

  // Check if all steps are complete
  const isComplete = mandateAuthenticated && coApplicantSigned;

  const handleComplete = () => {
    if (isComplete) {
      alert("All signatures and mandate complete. Moving to Disbursement.");
      // navigate("/disbursement");
    } else {
      alert("Please complete all steps first.");
    }
  };

  return (
    <div className="loan-execution-page">
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
              <h1>Loan execution · e-Mandate & e-Sign</h1>
            </div>
          </div>
          <div className="lead-info">
            <span>Lead ID</span>
            <strong>VED-7185-2826</strong>
          </div>
        </div>
      </div>

      <div className="execution-content">
        {/* Step 1 – e-NACH Mandate */}
        <div className="execution-card">
          <div className="step-header">
            <span className="step-number">1</span>
            <h2>e-NACH mandate</h2>
          </div>

          <div className="mandate-details">
            <div className="mandate-row">
              <span className="label">Bank</span>
              <span className="value">HDFC Bank</span>
            </div>
            <div className="mandate-row">
              <span className="label">Account</span>
              <span className="value">XXXX291</span>
            </div>
            <div className="mandate-row">
              <span className="label">Max amount</span>
              <span className="value">₹8,000</span>
            </div>
            <div className="mandate-row">
              <span className="label">UMRN</span>
              <span className="value">HDFC68842201</span>
            </div>
          </div>

          <div className="mandate-auth">
            {mandateAuthenticated ? (
              <div className="mandate-status success">
                <span className="sign-icon">✓</span>
                <span>Mandate authenticated via net-banking / debit card · NPCI confirmed</span>
              </div>
            ) : (
              <button
                className="send-sign-btn"
                onClick={handleInitiateMandate}
                disabled={isInitiatingMandate}
              >
                {isInitiatingMandate ? "Initiating..." : "Initiate mandate"}
              </button>
            )}
            {mandateError && <p className="mandate-error">{mandateError}</p>}
          </div>
        </div>

        {/* Step 2 – e-Sign loan agreement (Aadhaar OTP) */}
        <div className="execution-card">
          <div className="step-header">
            <span className="step-number">2</span>
            <h2>e-Sign loan agreement (Aadhaar OTP)</h2>
          </div>

          <div className="sign-section">
            <div className="sign-status applicant">
              <div className="sign-icon">✓</div>
              <div>
                <strong>Applicant</strong>
                <p>Suresh Kumar</p>
                <p className="sign-detail">Signed via Aadhaar e-Sign · 12 May, 16:22</p>
                <p className="sign-hash">Doc hash: 7f3a...c941</p>
              </div>
            </div>

            <div className="sign-status co-applicant">
              <div className="sign-icon">
                {coApplicantSigned ? "✓" : "⏳"}
              </div>
              <div>
                <strong>Co-applicant</strong>
                <p>Sunita Devi</p>
                {coApplicantSigned ? (
                  <p className="sign-detail">Signed via Aadhaar e-Sign · Just now</p>
                ) : (
                  <p className="sign-pending">Awaiting Aadhaar OTP signature</p>
                )}
              </div>
            </div>

            {!coApplicantSigned && (
              <button
                className="send-sign-btn"
                onClick={handleSendSignRequest}
                disabled={isSendingSign}
              >
                {isSendingSign ? "Sending..." : "Send e-Sign request"}
              </button>
            )}
          </div>

          <div className="sign-note">
            <p>
              Loan agreement is locked once both parties sign. Both signatures are mandatory for disbursement.
              Signed PDF is stored with audit hash and shared to applicant’s registered mobile/email.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="execution-footer">
          <p>
            <strong>On both signatures + e-NACH active → case moves to Disbursement</strong>
            <br />
            Dealer can track final status on the Sourcing Pipeline screen.
          </p>
          <button
            className="complete-btn"
            onClick={handleComplete}
            disabled={!isComplete}
          >
            {isComplete ? "Complete (All done)" : `Complete (${!mandateAuthenticated ? 'Mandate pending' : coApplicantSigned ? '' : '1 pending'})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanExecution;