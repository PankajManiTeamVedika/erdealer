import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../assets/css/LoanExecution.css";
import logo from "../assets/image/logowhite.png";
import { API, DEALER_API_BASE } from "./api/apiRoutes";

const baseURL = DEALER_API_BASE;

const LoanExecution = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [mandateAuthenticated, setMandateAuthenticated] = useState(false);
  const [mandateAwaitingConfirmation, setMandateAwaitingConfirmation] = useState(false);
  const [isInitiatingMandate, setIsInitiatingMandate] = useState(false);
  const [isCheckingMandateStatus, setIsCheckingMandateStatus] = useState(false);
  const [mandateError, setMandateError] = useState("");
  const [mandateResult, setMandateResult] = useState(null);

  // Step 2 state
  const [applicantSigned, setApplicantSigned] = useState(true); // already signed
  const [coApplicantSigned, setCoApplicantSigned] = useState(false);
  const [isSendingSign, setIsSendingSign] = useState(false);
  const [signError, setSignError] = useState("");

  // Same customer record used across SanctionReview.jsx/LeadDetails.jsx/VehicleDelivery.jsx —
  // fetched here so this page works for the specific lead the dealer clicked into from
  // the Sourcing Pipeline, instead of only whatever happened to be in localStorage.
  useEffect(() => {
    if (!customerId) return;

    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${baseURL}/public/api/customer/${customerId}?_=${Date.now()}`);
        const result = await res.json();
        if (result.success) {
          setCustomer(result.data);

          // If the backend already shows the mandate as verified (e.g. dealer
          // reloaded the page, or the applicant completed authentication in
          // another tab/session already), reflect that immediately instead
          // of showing "Initiate mandate" again.
          if (String(result.data?.mandate_status).toUpperCase() === "SUCCESS") {
            setMandateAuthenticated(true);
            setMandateAwaitingConfirmation(false);
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

  // mandate_page_url comes back relative (e.g. "/vmfi/api/er-loan/mandate-page?...") but the
  // "/vmfi" segment is a broken/staging prefix — the real page lives at "/api/er-loan/mandate-page".
  // Resolve against the mandate API's own origin, not the dealer app's origin.
  const resolveMandatePageUrl = (mandatePageUrl) => {
    if (!mandatePageUrl) return null;
    const cleanedPath = mandatePageUrl.replace("/vmfi/", "/");
    try {
      return new URL(cleanedPath, API.INITIATE_MANDATE_API).toString();
    } catch {
      return cleanedPath;
    }
  };

  const openMandatePage = () => {
    const url = resolveMandatePageUrl(mandateResult?.mandate_page_url);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  // POST /initiate-mandate expects application/x-www-form-urlencoded, not JSON.
  // Response shape: { status, message, data: { mandate_id, mandate_page_url, ... } }.
  const handleInitiateMandate = async () => {
    if (isInitiatingMandate || mandateAuthenticated) return;

    const kycId = customer?.kyc_id || localStorage.getItem("applicant_kyc_id") || "1";
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

      const mandateData = data?.data || data;
      setMandateResult(mandateData);
      setMandateAwaitingConfirmation(true);

      const url = resolveMandatePageUrl(mandateData?.mandate_page_url);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setMandateError(err.message || "Something went wrong while initiating the mandate.");
    } finally {
      setIsInitiatingMandate(false);
    }
  };

  // POST /er-loan/check-mandate-status — asks NPCI (via our backend) whether the mandate
  // is actually done, instead of just trusting the dealer's confirmation click.
  // Response: { success, message, log_id, mandate_status, external_response: { mandate_id, mandate_complete, status, ... } }.
  const handleCheckMandateStatus = async () => {
    if (isCheckingMandateStatus || mandateAuthenticated) return;

    const custId = parseInt(customerId, 10) || customer?.id || null;
    const kycId = parseInt(customer?.kyc_id, 10) || parseInt(localStorage.getItem("applicant_kyc_id"), 10) || 1;

    setMandateError("");
    setIsCheckingMandateStatus(true);

    try {
      const res = await fetch(API.CHECK_MANDATE_STATUS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cust_id: custId, kyc_id: kycId }),
      });

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Mandate status check failed (HTTP ${res.status})`);
      }

      const external = data?.external_response || {};

      if (external.mandate_complete && String(data?.mandate_status).toUpperCase() === "SUCCESS") {
        setMandateResult((prev) => ({ ...prev, ...external }));
        setMandateAwaitingConfirmation(false);
        setMandateAuthenticated(true);
      } else {
        setMandateError("Mandate authentication isn't complete yet. Ask the applicant to finish it on the mandate page, then check again.");
      }
    } catch (err) {
      setMandateError(err.message || "Something went wrong while checking the mandate status.");
    } finally {
      setIsCheckingMandateStatus(false);
    }
  };

  // POST /initiate-esign expects application/x-www-form-urlencoded, not JSON —
  // same shape as initiate-mandate above.
  const handleSendSignRequest = async () => {
    if (isSendingSign || coApplicantSigned) return;

    const kycId = customer?.kyc_id || localStorage.getItem("applicant_kyc_id") || "1";
    const empId = localStorage.getItem("emp_id") || "1";

    setSignError("");
    setIsSendingSign(true);

    try {
      const body = new URLSearchParams({
        kyc_id: kycId,
        emp_id: empId,
      });

      const res = await fetch(API.INITIATE_ESIGN_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const data = await res.json();

      if (!res.ok || data?.status === false || data?.success === false || data?.status === "ERROR") {
        throw new Error(data?.message || `e-Sign initiation failed (HTTP ${res.status})`);
      }

      setCoApplicantSigned(true);
      alert("e-Sign request sent to Co-applicant. They have signed.");
    } catch (err) {
      setSignError(err.message || "Something went wrong while sending the e-Sign request.");
    } finally {
      setIsSendingSign(false);
    }
  };

  // Check if all steps are complete
  const isComplete = mandateAuthenticated && coApplicantSigned;

  // e-Mandate + e-Sign now gates Vehicle Delivery instead of following it — once both
  // are done here, hand off straight to adding the vehicle details.
  const handleComplete = () => {
    if (isComplete) {
      alert("Mandate and e-Sign complete. Proceeding to vehicle delivery.");
      navigate(`/vehicle-delivery/${customerId}`);
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
            <strong>{customer?.application_id || "—"}</strong>
          </div>
        </div>
      </div>

      {loading && <div className="loading-msg">Loading customer details...</div>}

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
              <span className="value">{customer?.bank_name || "—"}</span>
            </div>
            <div className="mandate-row">
              <span className="label">Account</span>
              <span className="value">
                {customer?.bank_account_number
                  ? `XXXX${String(customer.bank_account_number).slice(-4)}`
                  : "—"}
              </span>
            </div>
            <div className="mandate-row">
              <span className="label">Max amount</span>
              <span className="value">
                {customer?.loan_amount ? `₹${customer.loan_amount}` : "—"}
              </span>
            </div>
            <div className="mandate-row">
              <span className="label">Mandate ID</span>
              <span className="value">{mandateResult?.mandate_id || "Pending mandate initiation"}</span>
            </div>
          </div>

          <div className="mandate-auth">
            {mandateAuthenticated ? (
              <div className="mandate-status success">
                <span className="sign-icon">✓</span>
                <span>Mandate authenticated via net-banking / debit card · NPCI confirmed</span>
              </div>
            ) : mandateAwaitingConfirmation ? (
              <div className="mandate-status pending">
                <p className="sign-pending">
                  Mandate page opened in a new tab. Ask the applicant to complete authentication there
                  (net-banking / debit card), then confirm below.
                </p>
                <div className="mandate-auth-actions">
                  <button className="send-sign-btn secondary" onClick={openMandatePage}>
                    Reopen mandate page
                  </button>
                  <button
                    className="send-sign-btn"
                    onClick={handleCheckMandateStatus}
                    disabled={isCheckingMandateStatus}
                  >
                    {isCheckingMandateStatus ? "Checking status..." : "Check mandate status"}
                  </button>
                </div>
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
                <p>{customer?.applicant_name || "—"}</p>
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
                <p>{customer?.co_applicant_name || "—"}</p>
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
            {signError && <p className="mandate-error">{signError}</p>}
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
            <strong>On both signatures + e-NACH active → proceed to vehicle delivery</strong>
            <br />
            Dealer can track final status on the Sourcing Pipeline screen.
          </p>
          <button
            className="complete-btn"
            onClick={handleComplete}
            disabled={!isComplete}
          >
            {isComplete ? "Continue to vehicle delivery →" : `Complete (${!mandateAuthenticated ? 'Mandate pending' : coApplicantSigned ? '' : '1 pending'})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanExecution;
