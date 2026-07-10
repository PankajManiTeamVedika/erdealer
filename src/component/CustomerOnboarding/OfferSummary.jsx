import React, { useState, useEffect } from "react";
import "../../assets/css/OfferSummary.css";
import logo from "../../assets/image/logo.png";
import { useNavigate } from "react-router-dom";
import { API } from "../api/apiRoutes";

// Dealer subvention slabs by loan amount (₹) — each upper bound is inclusive, the next
// slab starts one rupee above it.
const DEALER_SUBVENTION_SLABS = [
  { min: 60000, max: 150000, amount: 5900 },
  { min: 150001, max: 175000, amount: 8260 },
  { min: 175001, max: 185000, amount: 11800 },
  { min: 185001, max: 220000, amount: 12980 },
];

const getDealerSubventionForLoanAmount = (loanAmount) => {
  const amount = parseInt(loanAmount, 10);
  if (!amount) return "";

  const slab = DEALER_SUBVENTION_SLABS.find(
    ({ min, max }) => amount >= min && amount <= max
  );

  return slab ? slab.amount : "";
};

// Used only to estimate the EMI shown to the dealer here — the backend determines and
// stores the actual applicable interest rate, so this isn't displayed or sent in the payload.
const INTEREST_RATE_ANNUAL = 30;
// Threshold above which the EMI gets a warning style — informational only, doesn't block submission.
const EMI_WARNING_THRESHOLD = 9400;

const OfferSummary = () => {
  const navigate = useNavigate();
  const [isAccepted, setIsAccepted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // From previous stage (read-only)
  const manufacturer = localStorage.getItem("manufacturer") || "N/A";
const model = localStorage.getItem("model") || "N/A";
const storedApp = localStorage.getItem("application_id");
  // Editable fields
  const [vehicleType, setVehicleType] = useState("");
  const [batteryCapacity, setBatteryCapacity] = useState("");
  const [exShowroomPrice, setExShowroomPrice] = useState("");
  const [onRoadPrice, setOnRoadPrice] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [tenure, setTenure] = useState("");
  const [processingFee, setProcessingFee] = useState("");
  const [dealerSubvention, setDealerSubvention] = useState("");
  const [documentCharge, setDocumentCharge] = useState("");
  const [insuranceAmount, setInsuranceAmount] = useState("");

  // Auto calculated
  const minDownPayment = Math.ceil(parseInt(onRoadPrice || 0) * 0.20);
  const customerDownPayment = parseInt(onRoadPrice || 0) - parseInt(loanAmount || 0);
  const totalDownPayment = customerDownPayment > 0 ? customerDownPayment : 0;
  const isDownPaymentValid = totalDownPayment >= minDownPayment;

  const ltvRatio = onRoadPrice && loanAmount
    ? ((parseInt(loanAmount) / parseInt(onRoadPrice)) * 100).toFixed(1)
    : "0.0";
  const isLtvValid = parseFloat(ltvRatio) <= 80;

  // Monthly EMI, auto-calculated from loan amount, tenure and the fixed policy interest rate.
  const principal = parseInt(loanAmount || 0, 10);
  const tenureMonths = parseInt(tenure || 0, 10);
  const monthlyRate = INTEREST_RATE_ANNUAL / 12 / 100;
  const monthlyEmi = principal && tenureMonths
    ? Math.round(
        (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
          (Math.pow(1 + monthlyRate, tenureMonths) - 1)
      )
    : 0;
  const isEmiHigh = monthlyEmi > EMI_WARNING_THRESHOLD;

  // Auto-fill dealer subvention from the loan amount slab; dealer can still override it.
  useEffect(() => {
    setDealerSubvention(getDealerSubventionForLoanAmount(loanAmount));
  }, [loanAmount]);

const handleAccept = async () => {
  if (!isAccepted) { alert("Please accept the terms and conditions"); return; }
  if (!exShowroomPrice || !onRoadPrice || !loanAmount || !tenure) { alert("Please fill all required fields"); return; }
  if (!isDownPaymentValid) { alert(`Minimum 20% down payment required: ₹${minDownPayment.toLocaleString('en-IN')}`); return; }
  if (!isLtvValid) { alert("Loan cannot be processed. LTV ratio exceeds 80% policy cap."); return; }

  const applicationId = localStorage.getItem("application_id");
  const kyc_id = localStorage.getItem("applicant_kyc_id");
  const storedUser = localStorage.getItem("user");
    const dealerData = storedUser ? JSON.parse(storedUser) : null;
    const dealerID = dealerData ? dealerData.user_id : null;
  if (!applicationId) { alert("Application ID missing. Go back to Stage 1."); return; }

  try {
    const payload = {
      application_id:        applicationId,
      vehicle_type:          vehicleType,
      battery_capacity:      batteryCapacity,
      ex_showroom_price:     exShowroomPrice,
      on_road_price:         onRoadPrice,
      loan_amount:           loanAmount,
      tenure:                tenure,
      monthly_emi:           monthlyEmi,
      processing_fee:        processingFee,
      document_charge:       documentCharge,
      insurance_amount:      insuranceAmount,
      dealer_subvention:     dealerSubvention,
      customer_down_payment: totalDownPayment,
      total_down_payment:    totalDownPayment,
      ltv_ratio:             ltvRatio,
      consent_accepted:      1,
      employee_id:           dealerID,
      kyc_id: kyc_id
    };

    const res = await fetch(`${API.CUSTOMERSTAGE_THIRD}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      setShowSuccess(true);
      // setTimeout(() => navigate("/sourcing-pipeline"), 2000);
    } else {
      alert(`Failed: ${result.message || "Unknown error"}`);
    }

  } catch (err) {
    console.error(err);
    alert("Error submitting Stage 3");
  }
};

  return (
    <div className="offer-summary-page">
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
              <h1>Offer summary - Dealer acceptance</h1>
              <p>Review loan offer, charges, and accept terms to proceed</p>
            </div>
          </div>
          <div className="lead-info">
            <span>Lead ID</span>
            <strong>VED-7185-2826</strong>
          </div>
        </div>
      </div>

      {/* Success Overlay */}
      {showSuccess && (
        <div className="success-overlay">
          <div className="success-modal">
            <div className="success-icon">✓</div>
            <h3>Offer Accepted Successfully!</h3>
            <p>Your application has been submitted to pipeline</p>
          </div>
        </div>
      )}

      <div className="offer-content">

        {/* Vehicle & Loan Section */}
        <div className="summary-card">
          <div className="card-header">
            <h2>Vehicle & Loan</h2>
          </div>
          <div className="details-table">

            {/* Read-only */}
            <div className="table-row">
              <div className="row-label">Manufacturer</div>
              <div className="row-value">{manufacturer}</div>
            </div>
            <div className="table-row">
              <div className="row-label">Model</div>
              <div className="row-value">{model}</div>
            </div>

            {/* Editable */}
            <div className="table-row">
              <div className="row-label">Type of vehicle</div>
              <div className="row-value">
                <select
                  className="offer-input"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                >
                  <option value="">Select vehicle type</option>
                  <option value="Passenger">Passenger</option>
                  <option value="E Cart">E Cart</option>
                </select>
              </div>
            </div>
            <div className="table-row">
              <div className="row-label">Battery capacity</div>
              <div className="row-value">
                <input
                  type="text"
                  className="offer-input"
                  placeholder="e.g. 3.5 kWh"
                  value={batteryCapacity}
                  onChange={(e) => setBatteryCapacity(e.target.value)}
                />
              </div>
            </div>
            <div className="table-row">
              <div className="row-label">Ex-showroom price (₹)</div>
              <div className="row-value">
                <input
                  type="number"
                  className="offer-input"
                  placeholder="Enter ex-showroom price"
                  value={exShowroomPrice}
                  onChange={(e) => setExShowroomPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="table-row">
              <div className="row-label">On-road price (₹)</div>
              <div className="row-value">
                <input
                  type="number"
                  className="offer-input"
                  placeholder="Enter on-road price"
                  value={onRoadPrice}
                  onChange={(e) => setOnRoadPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="table-row">
              <div className="row-label">Loan amount (₹)</div>
              <div className="row-value">
                <input
                  type="number"
                  className="offer-input"
                  placeholder="Enter loan amount"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                />
                {onRoadPrice && loanAmount && !isLtvValid && (
                  <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0' }}>
                    ⚠ Reduce loan amount — LTV exceeds 80%
                  </p>
                )}
              </div>
            </div>
            <div className="table-row">
              <div className="row-label">Margin money (₹)</div>
              <div className="row-value">
                <strong>₹{totalDownPayment.toLocaleString('en-IN')}</strong>
              </div>
            </div>
            <div className="table-row">
              <div className="row-label">Tenure (months)</div>
              <div className="row-value">
                <select
                  className="offer-input"
                  value={tenure}
                  onChange={(e) => setTenure(e.target.value)}
                >
                  <option value="">Select tenure</option>
                  <option value="12">12</option>
                  <option value="15">15</option>
                  <option value="18">18</option>
                  <option value="21">21</option>
                  <option value="24">24</option>
                  <option value="30">30</option>
                  <option value="36">36</option>
                </select>
              </div>
            </div>
            <div className="table-row">
              <div className="row-label">Monthly EMI (₹)</div>
              <div className="row-value">
                <strong style={{ color: isEmiHigh ? 'red' : 'green' }}>
                  ₹{monthlyEmi.toLocaleString('en-IN')}
                </strong>
                {monthlyEmi > 0 && isEmiHigh && (
                  <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0' }}>
                    ⚠ EMI exceeds ₹{EMI_WARNING_THRESHOLD.toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charges & Payout Section */}
        <div className="summary-card">
          <div className="card-header">
            <h2>Charges & Payout</h2>
          </div>
          <div className="charges-list">
            <div className="charge-item">
              <span>Processing fee (₹)</span>
              <input
                type="number"
                className="offer-input"
                placeholder="Enter processing fee"
                value={processingFee}
                onChange={(e) => setProcessingFee(e.target.value)}
              />
            </div>
            <div className="charge-item">
              <span>Document charge (₹)</span>
              <input
                type="number"
                className="offer-input"
                placeholder="Enter document charge"
                value={documentCharge}
                onChange={(e) => setDocumentCharge(e.target.value)}
              />
            </div>
            <div className="charge-item">
              <span>Insurance amount (₹)</span>
              <input
                type="number"
                className="offer-input"
                placeholder="Enter insurance amount"
                value={insuranceAmount}
                onChange={(e) => setInsuranceAmount(e.target.value)}
              />
            </div>
            <div className="charge-item">
              <span>Customer down payment (₹)</span>
              <div>
                <strong style={{ color: isDownPaymentValid ? 'green' : 'red' }}>
                  ₹{totalDownPayment.toLocaleString('en-IN')}
                </strong>
                {onRoadPrice && loanAmount && !isDownPaymentValid && (
                  <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0' }}>
                    ⚠ Minimum 20% required (₹{minDownPayment.toLocaleString('en-IN')})
                  </p>
                )}
                {onRoadPrice && loanAmount && isDownPaymentValid && (
                  <p style={{ color: 'green', fontSize: '12px', margin: '4px 0 0' }}>
                    ✓ Meets minimum 20% requirement
                  </p>
                )}
              </div>
            </div>
            <div className="charge-item">
              <span>Dealer subvention (₹)</span>
              <input
                type="number"
                className="offer-input"
                placeholder="Enter dealer subvention"
                value={dealerSubvention}
                onChange={(e) => setDealerSubvention(e.target.value)}
              />
            </div>
            <div className="charge-item total">
              <span>Total down payment</span>
              <strong>₹{totalDownPayment.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Net Payment to Dealer */}
        <div className="summary-card highlight">
          <div className="card-header">
            <h2>Net payment to dealer</h2>
          </div>
          <div className="net-payment">
            <p>
              Loan ₹{parseInt(loanAmount || 0).toLocaleString('en-IN')} – Processing
              ₹{parseInt(processingFee || 0).toLocaleString('en-IN')} + Subvention adj.
            </p>
            <p className="net-amount">Net of applicable deductions</p>
          </div>
        </div>

        {/* LTV Ratio */}
        <div className="ltv-card">
          <div className="ltv-header">
            <span>LOAN-TO-VALUE (AUTO-CALCULATED)</span>
            <span className="ltv-badge" style={{ color: isLtvValid ? 'green' : 'red' }}>
              {ltvRatio}%
            </span>
          </div>
          <div className="ltv-details">
            <span>Loan ₹{parseInt(loanAmount || 0).toLocaleString('en-IN')}</span>
            <span>÷</span>
            <span>On-road ₹{parseInt(onRoadPrice || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="ltv-progress">
            <div
              className="ltv-progress-fill"
              style={{
                width: `${Math.min(parseFloat(ltvRatio), 100)}%`,
                backgroundColor: isLtvValid ? '#22c55e' : '#ef4444'
              }}
            ></div>
          </div>
          <div className={`ltv-status ${isLtvValid ? 'approved' : 'warning'}`}>
            {isLtvValid
              ? <span>✓ Within policy cap (≤ 80%)</span>
              : <span>⚠ LTV exceeds 80% — loan cannot be processed</span>
            }
          </div>
        </div>

        {/* Warning Note */}
        <div className="warning-note">
          <strong>⚠️ THIS IS NOT THE FINAL APPROVAL</strong>
          <p>
            These figures are indicative and subject to change. Final loan terms will be confirmed ONLY after
            Field Investigation and Sanction approval. Do not deliver the vehicle or collect any amount from
            the customer until you receive the sanction confirmation.
          </p>
        </div>

        {/* Acceptance Checkbox */}
        <div className="acceptance-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isAccepted}
              onChange={(e) => setIsAccepted(e.target.checked)}
            />
            <span>
              I have explained the above indicative terms to the customer. I understand these are provisional,
              subject to FI and sanction, and I will not commit delivery or collect money from the customer
              until sanction is approved. I accept the dealer payout terms shown.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="back-btn" onClick={() => navigate("/document-collection")}>
            ← Back
          </button>
          <button
            className={`accept-btn ${isAccepted ? 'active' : 'disabled'}`}
            onClick={handleAccept}
            disabled={!isAccepted}
          >
            Accept & submit to pipeline →
          </button>
        </div>

        <div className="helper-text">
          <small>🔑 This is a legally binding acceptance of terms</small>
        </div>
      </div>
    </div>
  );
};

export default OfferSummary;