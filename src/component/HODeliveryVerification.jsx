import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../assets/css/HODeliveryVerification.css";
import logo from "../assets/image/logowhite.png";
import { API, DEALER_API_BASE } from "./api/apiRoutes";

const baseURL = DEALER_API_BASE;

const HODeliveryVerification = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();

  // State for verification remarks and selected action
  const [remarks, setRemarks] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  const [delivery, setDelivery] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null); // { feature, url } | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Confirmed via curl: GET ?cust_id=<id> — the vehicle_no/engine_no/chassis_no/
  // battery_no/battery_make the dealer entered, plus the 4 delivery document paths.
  useEffect(() => {
    if (!customerId) return;

    const fetchDelivery = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API.VEHICLE_DELIVERY_GET_API}?cust_id=${customerId}&_=${Date.now()}`);
        const result = await res.json();
        if (result.success) {
          setDelivery(result.data);
        } else {
          setError(result.message || "Vehicle delivery details not found");
        }
      } catch (err) {
        console.error("Vehicle delivery fetch error:", err);
        setError("Error fetching vehicle delivery details");
      } finally {
        setLoading(false);
      }
    };

    // Same customer record used by SanctionReview.jsx/LeadDetails.jsx — fetched
    // here only for its sanctioned `model`, to compare against the delivered vehicle.
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`${baseURL}/public/api/customer/${customerId}?_=${Date.now()}`);
        const result = await res.json();
        if (result.success) {
          setCustomer(result.data);
        }
      } catch (err) {
        console.error("Customer fetch error:", err);
      }
    };

    fetchDelivery();
    fetchCustomer();
  }, [customerId]);

  const getFullUrl = (path) => {
    if (!path) return null;
    return path.startsWith("http") ? path : `${baseURL}/${path}`;
  };

  const renderDocValue = (feature, path) => {
    const fullUrl = getFullUrl(path);
    if (!fullUrl) return <span className="description pending">Not uploaded</span>;
    return (
      <button
        type="button"
        className="description doc-value-link"
        onClick={() => setPreviewDoc({ feature, url: fullUrl })}
      >
        View →
      </button>
    );
  };

  const isPdf = (url) => url?.toLowerCase().endsWith(".pdf");

  // What HO manually cross-checks against the OEM invoice/sanction record — this
  // API only returns the dealer-entered values, not a computed match result, so
  // the actual comparison is left to HO (tick the row once they've verified it).
  // "Engine/chassis dedupe" has no backing API yet — shown as a pending placeholder
  // rather than a fabricated result until a real duplicate-check endpoint exists.
  const vehicleData = delivery ? [
    { feature: "Vehicle no.", value: delivery.vehicle_no },
    { feature: "Engine no.", value: delivery.engine_no },
    { feature: "Chassis no.", value: delivery.chassis_no },
    { feature: "Battery no.", value: delivery.battery_no },
    { feature: "Battery make", value: delivery.battery_make },
    { feature: "Engine/chassis dedupe", value: "Pending backend check" },
    { feature: "Model vs sanctioned model", value: customer?.model || "—" },
  ] : [];

  // "Photo geo-tag vs dealer addr" and "Customer face vs live image" also have no
  // backing API — shown as pending placeholders, not fabricated distances/scores.
  const evidenceData = delivery ? [
    { feature: "Delivery photo", file: delivery.delivery_photo },
    { feature: "Photo geo-tag vs dealer addr", value: "Pending backend check" },
    { feature: "Customer face vs live image", value: "Pending backend check" },
    { feature: "Insurance doc", file: delivery.insurance },
    { feature: "Invoice copy", file: delivery.invoice },
    { feature: "RC application", file: delivery.rc_application },
  ] : [];

  // Per-row HO confirmation checkboxes, plus a "select all" toggle per section.
  // Re-sized whenever the fetched delivery record (and therefore row count) changes.
  const [vehicleChecks, setVehicleChecks] = useState([]);
  const [evidenceChecks, setEvidenceChecks] = useState([]);

  useEffect(() => {
    setVehicleChecks(vehicleData.map(() => false));
    setEvidenceChecks(evidenceData.map(() => false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery, customer]);

  const allVehicleChecked = vehicleChecks.length > 0 && vehicleChecks.every(Boolean);
  const allEvidenceChecked = evidenceChecks.length > 0 && evidenceChecks.every(Boolean);

  const toggleVehicleCheck = (idx) => {
    setVehicleChecks((prev) => prev.map((checked, i) => (i === idx ? !checked : checked)));
  };

  const toggleEvidenceCheck = (idx) => {
    setEvidenceChecks((prev) => prev.map((checked, i) => (i === idx ? !checked : checked)));
  };

  const toggleSelectAllVehicle = () => {
    setVehicleChecks(vehicleData.map(() => !allVehicleChecked));
  };

  const toggleSelectAllEvidence = () => {
    setEvidenceChecks(evidenceData.map(() => !allEvidenceChecked));
  };

  // Confirmed via curl: JSON body { cust_id, verified_by, remarks, action, vehicle_checks[], evidence_checks[] }.
  const handleSubmit = async () => {
    if (!selectedAction) {
      alert("Please select a verification action.");
      return;
    }

    const loginData = JSON.parse(localStorage.getItem("user") || "null");
    const verifiedBy = parseInt(loginData?.user_id, 10) || parseInt(localStorage.getItem("emp_id"), 10) || 1;
    const custId = parseInt(customerId, 10) || customer?.id || null;

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const res = await fetch(API.HO_DELIVERY_VERIFICATION_SAVE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cust_id: custId,
          verified_by: verifiedBy,
          remarks,
          action: selectedAction,
          vehicle_checks: vehicleChecks,
          evidence_checks: evidenceChecks,
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Save failed (HTTP ${res.status})`);
      }

      alert(data.message || "Delivery verification saved successfully!");
      navigate("/ho-dashboard");
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || "Something went wrong while saving the delivery verification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ho-delivery-page">
      {/* Corner Bubbles – reuse from other components */}
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
              <h1>HO · Delivery verification</h1>
            </div>
          </div>
          <div className="lead-info">
            <div>
              {/* <span>Customer ID</span>
              <strong>{customerId || "—"}</strong> */}
            </div>
            <div style={{ marginTop: "6px" }}>
              <span>Customer ID</span>
              <strong>{customer?.application_id || "—"}</strong>
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="loading-msg">Loading vehicle delivery details...</div>}
      {error && <div className="insurance-note"><p>{error}</p></div>}

      <div className="ho-delivery-content">
        {/* Vehicle vs. Sanction & Invoice */}
        <div className="info-card">
          <div className="card-header-flex">
            <h2>Vehicle vs. Sanction & Invoice</h2>
            <label className="select-all-label">
              <input type="checkbox" checked={allVehicleChecked} onChange={toggleSelectAllVehicle} />
              Select all
            </label>
          </div>
          <div className="hodv-table">
            {vehicleData.map((item, idx) => (
              <div className={`hodv-row ${item.value === "Pending backend check" ? "hodv-row-flagged" : ""}`} key={idx}>
                <label className="row-checkbox">
                  <input
                    type="checkbox"
                    checked={vehicleChecks[idx] || false}
                    onChange={() => toggleVehicleCheck(idx)}
                  />
                </label>
                <span className="feature">{item.feature}</span>
                <span className="description">{item.value || "—"}</span>
                <span className={`match-status ${vehicleChecks[idx] ? "confirmed" : "pending"}`}>
                  {vehicleChecks[idx] ? "✓ Confirmed" : "Pending review"}
                </span>
              </div>
            ))}
            {!loading && vehicleData.length === 0 && (
              <div className="hodv-row"><span className="feature">No vehicle delivery record found yet.</span></div>
            )}
          </div>
        </div>

        {/* Delivery Evidence */}
        <div className="info-card">
          <div className="card-header-flex">
            <h2>Delivery Evidence</h2>
            <label className="select-all-label">
              <input type="checkbox" checked={allEvidenceChecked} onChange={toggleSelectAllEvidence} />
              Select all
            </label>
          </div>
          <div className="hodv-table">
            {evidenceData.map((item, idx) => (
              <div className={`hodv-row ${item.value === "Pending backend check" ? "hodv-row-flagged" : ""}`} key={idx}>
                <label className="row-checkbox">
                  <input
                    type="checkbox"
                    checked={evidenceChecks[idx] || false}
                    onChange={() => toggleEvidenceCheck(idx)}
                  />
                </label>
                <span className="feature">{item.feature}</span>
                {"file" in item ? (
                  renderDocValue(item.feature, item.file)
                ) : (
                  <span className="description">{item.value}</span>
                )}
                <span className={`match-status ${evidenceChecks[idx] ? "confirmed" : "pending"}`}>
                  {evidenceChecks[idx] ? "✓ Verified" : "Pending review"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Insurance Pending Note */}
        {delivery && !delivery.insurance && (
          <div className="insurance-note">
            <p>
              Insurance document is pending. HO can <strong>approve with condition</strong> (insurance to be uploaded within 48 hrs, auto-flagged) or <strong>refer back</strong> to dealer. Disbursement will be held until insurance is cleared.
            </p>
          </div>
        )}

        {/* HO verification remark */}
        <div className="info-card">
          <h2>HO verification remark</h2>
          <textarea
            className="remark-textarea"
            placeholder="Verification observations / conditions"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows="3"
          />
          <div className="action-options">
            <label className="radio-option">
              <input
                type="radio"
                name="hoAction"
                value="referBack"
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <span>Refer back to dealer</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="hoAction"
                value="verifyRelease"
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <span>Verify & release</span>
            </label>
          </div>
        </div>

        {submitError && <div className="insurance-note"><p>{submitError}</p></div>}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="back-btn" onClick={() => navigate(-1)} disabled={isSubmitting}>← Back</button>
          <button className="submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Submit"}
          </button>
        </div>
      </div>

      {/* Delivery Evidence Preview Popup */}
      {previewDoc && (
        <div className="doc-preview-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="doc-preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="doc-preview-header">
              <h3>{previewDoc.feature}</h3>
              <button type="button" className="doc-preview-close" onClick={() => setPreviewDoc(null)}>✕</button>
            </div>
            <div className="doc-preview-body">
              {isPdf(previewDoc.url) ? (
                <iframe src={previewDoc.url} title={previewDoc.feature} />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.feature} />
              )}
            </div>
            <div className="doc-preview-footer">
              <a href={previewDoc.url} target="_blank" rel="noopener noreferrer">Open in new tab →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODeliveryVerification;
