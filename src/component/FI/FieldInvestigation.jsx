import React, { useState } from "react";
import "../../assets/css/FieldInvestigation.css";
import logo from "../../assets/image/logo.png";
import { useNavigate } from "react-router-dom";
import { API } from "../api/apiRoutes";

// TODO: move this into apiRoutes.js as API.SAVE_FIELD_INVESTIGATION,
// replacing the placeholder, per your existing pattern.


// ---- Enum/code mappings guessed from your dropdown copy ----
// ASSUMPTION: confirm these numeric codes against the actual backend enum.
const ACCOMMODATION_TYPE_MAP = {
  "Pucca (Owned > 3 yrs)": 1,
  "Pucca (Owned < 3 yrs)": 2,
  "Kutcha": 3,
  "Rented": 4,
};

const YEAR_KNOWN_MAP = {
  "> 3 years": 1,
  "1-3 years": 2,
  "< 1 year": 3,
};

const NATURE_OF_WORK_MAP = {
  "Fixed / semi-fixed job": 1,
  "Self-employed": 2,
  "Daily wage": 3,
  "Business": 4,
};

// ASSUMPTION: yearly income approximated as slab-midpoint * 12.
// Recommend replacing these slabs with a direct numeric income input
// if the backend needs an accurate figure rather than an estimate.
const APPLICANT_INCOME_SLAB_ANNUAL = {
  "₹5k–10k": 90000,
  "₹10k–15k": 150000,
  "₹15k–25k": 240000,
  "₹25k–40k": 390000,
  "₹40k+": 480000,
};

const OTHER_EARNER_INCOME_SLAB_ANNUAL = {
  "₹5k–15k": 120000,
  "₹15k–25k": 240000,
  "₹25k–40k": 390000,
  "₹40k+": 480000,
};

const FieldInvestigation = () => {
  const navigate = useNavigate();

  // Residence & Household State
  const [houseType, setHouseType] = useState("Pucca (Owned > 3 yrs)");
  const [addressDuration, setAddressDuration] = useState("> 3 years");
  const [familyMembers, setFamilyMembers] = useState(4);
  const [dependents, setDependents] = useState(2);
  const [totalEarning, setTotalEarning] = useState("₹10k–15k");
  const [smartphoneAvailable, setSmartphoneAvailable] = useState("Yes");

  // Income & Earners State
  const [hasOtherEarner, setHasOtherEarner] = useState("Yes");
  const [otherEarnerOccupation, setOtherEarnerOccupation] = useState("Fixed / semi-fixed job");
  // BUG FIX: this used to be the same state (`otherEarnerIncome`) as the slab
  // select below, so picking one silently overwrote the other's value.
  // New state added, nothing renamed.
  const [otherEarnerIncomeType, setOtherEarnerIncomeType] = useState("Regular Income Source");
  const [otherEarnerIncome, setOtherEarnerIncome] = useState("₹5k–15k");

  // E-rickshaw operating viability State
  const [drivingStatus, setDrivingStatus] = useState("Will drive full-time");
  const [priorExperience, setPriorExperience] = useState("Yes, relevant experience");
  const [plannedRoute, setPlannedRoute] = useState("Specific, commercially viable");
  const [expectedRunning, setExpectedRunning] = useState("> 80 km/day");

  // NEW: fields required by /fi/save that had no corresponding input yet
  const [erExistYn, setErExistYn] = useState("No");
  const [pointA, setPointA] = useState("");
  const [pointB, setPointB] = useState("");
  const [expectedDailyEarning, setExpectedDailyEarning] = useState("");

  // Video PD State
  const [videoLink, setVideoLink] = useState("");
  const [transcriptionFile, setTranscriptionFile] = useState(null);

  // LIVE GAR Score State (Auto-calculated from backend)
  const [garData] = useState({
    score: 75,
    color: "GREEN",
    stability: "Strong",
    income: "Moderate",
    viability: "Strong",
    experience: "Strong",
  });

  // UI State
  const [activeSection, setActiveSection] = useState("residence");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setTranscriptionFile(file);
      setSuccess("Transcription file uploaded successfully!");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  // Handle video link
  const handleVideoLink = () => {
    if (!videoLink) {
      setError("Please enter a valid video link");
      return;
    }
    setSuccess("Video PD link saved!");
    setTimeout(() => setSuccess(""), 3000);
  };

  // Build the /fi/save payload from form state
  const buildPayload = () => {
    
    const kycId = parseInt(localStorage.getItem("applicant_kyc_id"), 10) || 1;
    const empId = parseInt(localStorage.getItem("emp_id"), 10) || 1;

    return {
      kyc_id: kycId,
      emp_id: empId,
      accomodation_type: ACCOMMODATION_TYPE_MAP[houseType] ?? null,
      year_of_known: YEAR_KNOWN_MAP[addressDuration] ?? null,
      total_family_member: parseInt(familyMembers, 10) || 0,
      non_earning_member: parseInt(dependents, 10) || 0,
      member1_self_declared_yearly_income:
        APPLICANT_INCOME_SLAB_ANNUAL[totalEarning] ?? 0,
      member1_smartphone_yn: smartphoneAvailable === "Yes" ? 1 : 0,
      earning_member: hasOtherEarner === "Yes" ? 1 : 0,
      member2_nature_of_work: NATURE_OF_WORK_MAP[otherEarnerOccupation] ?? null,
      er_ownership_status: otherEarnerIncomeType,
      member2_self_declared_yearly_income:
        hasOtherEarner === "Yes"
          ? OTHER_EARNER_INCOME_SLAB_ANNUAL[otherEarnerIncome] ?? 0
          : 0,
      driver_name: drivingStatus,
      er_exist_yn: erExistYn === "Yes" ? 1 : 0,
      new_pointA: pointA,
      new_pointB: pointB,
      expected_daily_earning: parseInt(expectedDailyEarning, 10) || 0,
    };
  };

  // Handle submit
  const handleSubmit = async () => {
   

    if (!videoLink) {
      setError("Please add Video PD / G-Meet link");
      return;
    }
    if (!pointA || !pointB) {
      setError("Please enter both route points (A and B)");
      return;
    }
    if (!expectedDailyEarning) {
      setError("Please enter expected daily earning");
      return;
    }
    if (garData.color === "RED") {
      setError(`Application auto-declined due to GAR Score (${garData.score}%)`);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(API.FI_SAVE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(buildPayload()),
      });

      const data = await response.json();

      if (!response.ok || data?.status === false) {
        throw new Error(data?.message || `Save failed (HTTP ${response.status})`);
      }

      setSuccess(`FI Completed! Status: ${garData.color} - Score: ${garData.score}%`);
      setTimeout(() => {
        if (garData.color === "GREEN") {
          navigate("/offer-summary");
        }
      }, 2000);
    } catch (err) {
      setError(err.message || "Something went wrong while saving FI details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/document-collection");
  };

  return (
    <div className="fi-page">
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
              <h1>Field investigation</h1>
              <p>Complete residence verification, income assessment & viability check</p>
            </div>
          </div>
          <div className="lead-info">
            <span>Lead ID</span>
            <strong>VED-7185-2826</strong>
          </div>
        </div>
      </div>

      <div className="fi-layout">
        {/* LEFT SIDE - Collapsible Form Sections */}
        <div className="fi-left">
          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}

          {/* Residence & Household Section */}
          <div className="collapse-card">
            <div
              className="collapse-header"
              onClick={() => setActiveSection(activeSection === "residence" ? "" : "residence")}
            >
              <div className="header-left">
                <span className="collapse-icon">{activeSection === "residence" ? "▼" : "▶"}</span>
                <h3>Residence & household</h3>
              </div>
              <div className="status-badge success">✓ Completed</div>
            </div>

            {activeSection === "residence" && (
              <div className="collapse-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Type of house / living</label>
                    <select
                      value={houseType}
                      onChange={(e) => setHouseType(e.target.value)}
                      className="form-select"
                    >
                      <option>Pucca (Owned &gt; 3 yrs)</option>
                      <option>Pucca (Owned {"<"} 3 yrs)</option>
                      <option>Kutcha</option>
                      <option>Rented</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>At this address since</label>
                    <select
                      value={addressDuration}
                      onChange={(e) => setAddressDuration(e.target.value)}
                      className="form-select"
                    >
                      <option>&gt; 3 years</option>
                      <option>1-3 years</option>
                      <option>&lt; 1 year</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Family members</label>
                    <input
                      type="number"
                      value={familyMembers}
                      onChange={(e) => setFamilyMembers(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Dependents</label>
                    <input
                      type="number"
                      value={dependents}
                      onChange={(e) => setDependents(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Total earning (slab)</label>
                    <select
                      value={totalEarning}
                      onChange={(e) => setTotalEarning(e.target.value)}
                      className="form-select"
                    >
                      <option>₹5k–10k</option>
                      <option>₹10k–15k</option>
                      <option>₹15k–25k</option>
                      <option>₹25k–40k</option>
                      <option>₹40k+</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Smartphone available</label>
                    <select
                      value={smartphoneAvailable}
                      onChange={(e) => setSmartphoneAvailable(e.target.value)}
                      className="form-select"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Income & Earners Section */}
          <div className="collapse-card">
            <div
              className="collapse-header"
              onClick={() => setActiveSection(activeSection === "income" ? "" : "income")}
            >
              <div className="header-left">
                <span className="collapse-icon">{activeSection === "income" ? "▼" : "▶"}</span>
                <h3>Income & earners</h3>
              </div>
            </div>

            {activeSection === "income" && (
              <div className="collapse-body">
                <div className="form-group">
                  <label>Other earner in family?</label>
                  <select
                    value={hasOtherEarner}
                    onChange={(e) => setHasOtherEarner(e.target.value)}
                    className="form-select"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {hasOtherEarner === "Yes" && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Occupation of other earner</label>
                        <select
                          value={otherEarnerOccupation}
                          onChange={(e) => setOtherEarnerOccupation(e.target.value)}
                          className="form-select"
                        >
                          <option>Fixed / semi-fixed job</option>
                          <option>Self-employed</option>
                          <option>Daily wage</option>
                          <option>Business</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Current Source of Income</label>
                        <select
                          value={otherEarnerIncomeType}
                          onChange={(e) => setOtherEarnerIncomeType(e.target.value)}
                          className="form-select"
                        >
                          <option>Regular Income Source</option>
                          <option>Irregular Income Source</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Total earning from it (slab)</label>
                      <select
                        value={otherEarnerIncome}
                        onChange={(e) => setOtherEarnerIncome(e.target.value)}
                        className="form-select"
                      >
                        <option>₹5k–15k</option>
                        <option>₹15k–25k</option>
                        <option>₹25k–40k</option>
                        <option>₹40k+</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* E-rickshaw operating viability Section */}
          <div className="collapse-card">
            <div
              className="collapse-header"
              onClick={() => setActiveSection(activeSection === "viability" ? "" : "viability")}
            >
              <div className="header-left">
                <span className="collapse-icon">{activeSection === "viability" ? "▼" : "▶"}</span>
                <h3>E-rickshaw operating viability</h3>
              </div>
            </div>

            {activeSection === "viability" && (
              <div className="collapse-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Driving status after buy</label>
                    <select
                      value={drivingStatus}
                      onChange={(e) => setDrivingStatus(e.target.value)}
                      className="form-select"
                    >
                      <option>Will drive full-time</option>
                      <option>Will drive part-time</option>
                      <option>Will hire driver</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Prior e-rickshaw experience</label>
                    <select
                      value={priorExperience}
                      onChange={(e) => setPriorExperience(e.target.value)}
                      className="form-select"
                    >
                      <option>Yes, relevant experience</option>
                      <option>Some experience</option>
                      <option>No experience</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Planned route / Expected daily running</label>
                    <select
                      value={plannedRoute}
                      onChange={(e) => setPlannedRoute(e.target.value)}
                      className="form-select"
                    >
                      <option>Specific, commercially viable</option>
                      <option>Vague, needs validation</option>
                      <option>Not planned</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Expected daily running</label>
                    <select
                      value={expectedRunning}
                      onChange={(e) => setExpectedRunning(e.target.value)}
                      className="form-select"
                    >
                      <option>&gt; 80 km/day</option>
                      <option>50-80 km/day</option>
                      <option>&lt; 50 km/day</option>
                    </select>
                  </div>
                </div>

                {/* NEW: fields required by /fi/save */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Route Point A</label>
                    <input
                      type="text"
                      value={pointA}
                      onChange={(e) => setPointA(e.target.value)}
                      className="form-input"
                      placeholder="e.g. Sector 10"
                    />
                  </div>
                  <div className="form-group">
                    <label>Route Point B</label>
                    <input
                      type="text"
                      value={pointB}
                      onChange={(e) => setPointB(e.target.value)}
                      className="form-input"
                      placeholder="e.g. Railway Station"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Expected daily earning (₹)</label>
                    <input
                      type="number"
                      value={expectedDailyEarning}
                      onChange={(e) => setExpectedDailyEarning(e.target.value)}
                      className="form-input"
                      placeholder="e.g. 800"
                    />
                  </div>
                  <div className="form-group">
                    <label>Currently owns an e-rickshaw?</label>
                    <select
                      value={erExistYn}
                      onChange={(e) => setErExistYn(e.target.value)}
                      className="form-select"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video PD & Transcription Section */}
          <div className="collapse-card">
            <div
              className="collapse-header"
              onClick={() => setActiveSection(activeSection === "video" ? "" : "video")}
            >
              <div className="header-left">
                <span className="collapse-icon">{activeSection === "video" ? "▼" : "▶"}</span>
                <h3>Video PD & transcription</h3>
              </div>
            </div>

            {activeSection === "video" && (
              <div className="collapse-body">
                <div className="form-group">
                  <label>Video PD / G-Meet link</label>
                  <div className="input-group">
                    <input
                      type="text"
                      value={videoLink}
                      onChange={(e) => setVideoLink(e.target.value)}
                      className="form-input"
                      placeholder="https://meet.google.com/..."
                    />
                    <button className="btn-primary" onClick={handleVideoLink}>
                      Save Link
                    </button>
                  </div>
                  <small className="field-note">Geo + time stamped</small>
                </div>

                <div className="form-group">
                  <label>Transcription</label>
                  <div className="file-upload">
                    <input
                      type="file"
                      id="transcription"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                    <button className="upload-btn" onClick={() => document.getElementById("transcription").click()}>
                      {transcriptionFile ? "✓ Uploaded" : "Auto / manual upload →"}
                    </button>
                    {transcriptionFile && <span className="file-name">{transcriptionFile.name}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            className={`submit-fi-btn desktop-btn ${garData.color !== "RED" && !isSubmitting ? "active" : "disabled"}`}
            onClick={handleSubmit}
            disabled={garData.color === "RED" || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Submit FI →"}
          </button>
        </div>

        {/* RIGHT SIDE - LIVE GAR SCORE Card */}
        <div className="fi-right">
          <div className="gar-card">
            <div className="gar-card-header">
              <h3>LIVE GAR SCORE</h3>
              <div className={`gar-score-badge ${garData.color.toLowerCase()}`}>
                {garData.color}
              </div>
            </div>

            <div className="gar-score-circle">
              <div className="circle-chart">
                <svg viewBox="0 0 100 100" className="progress-ring">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={garData.color === "GREEN" ? "#10b981" : garData.color === "AMBER" ? "#f59e0b" : "#ef4444"}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - garData.score / 100)}`}
                    transform="rotate(-90 50 50)"
                    className="progress-ring-circle"
                  />
                </svg>
                <div className="chart-center">
                  <span className="chart-value">{garData.score}%</span>
                </div>
              </div>
            </div>

            <div className="gar-metrics">
              <div className="metric-item">
                <span className="metric-label">Stability</span>
                <span className={`metric-value ${garData.stability.toLowerCase()}`}>{garData.stability}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Income</span>
                <span className={`metric-value ${garData.income.toLowerCase()}`}>{garData.income}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Viability</span>
                <span className={`metric-value ${garData.viability.toLowerCase()}`}>{garData.viability}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Experience</span>
                <span className={`metric-value ${garData.experience.toLowerCase()}`}>{garData.experience}</span>
              </div>
            </div>
          </div>

          <div className="info-card">
            <div className="info-title">ON SUBMIT</div>
            <p>Score ≥ 65 (Green) → auto-moves to Sanction.</p>
            <p>Amber → credit review. Red → auto-decline.</p>
          </div>

          <div className="flags-card">
            <div className="flags-header">
              <span className="flags-icon">⚠️</span>
              <h3>OPEN FLAGS</h3>
            </div>
            <div className="flags-list">
              <div className="flag-item">
                <span className="flag-dot"></span>
                <span>Reference dedupe hit → verify in PD</span>
              </div>
            </div>
          </div>

          <div className="officer-card">
            <div className="officer-icon">👤</div>
            <div className="officer-details">
              <strong>FI by: Sunil Verma · Field Officer</strong>
              <span>Geo-tagged at customer address</span>
            </div>
          </div>

          <button
            className={`submit-fi-btn mobile-btn ${garData.color !== "RED" && !isSubmitting ? "active" : "disabled"}`}
            onClick={handleSubmit}
            disabled={garData.color === "RED" || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Submit FI →"}
          </button>
        </div>
      </div>

      <div className="bottom-actions">
        <button className="back-btn-bottom" onClick={handleBack}>
          ← Back
        </button>
      </div>

      <div className="helper-text">
        <small>🔑 GAR Score auto-calculated based on backend data</small>
      </div>
    </div>
  );
};

export default FieldInvestigation;