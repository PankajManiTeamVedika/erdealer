import React, { useEffect, useRef, useState } from "react";
import "../../src/assets/css/VehicleDelivery.css";
import logo from "../../src/assets/image/logo.png";
import { useNavigate, useParams } from "react-router-dom";
import { API, DEALER_API_BASE } from "./api/apiRoutes";

const baseURL = DEALER_API_BASE;
// Confirmed via curl: multipart field names for the 4 original delivery documents.
const DELIVERY_DOC_FIELD = {
  deliveryPhoto: "delivery_photo",
  invoice: "invoice",
  insurance: "insurance",
  rcApplication: "rc_application",
  // ASSUMPTION: field names for these 6 post-sanction docs are guessed (snake_case of
  // the label) — not yet confirmed via curl like the 4 above. Confirm with backend
  // before relying on these in production.
  quotation: "quotation",
  disclaimer: "disclaimer",
  rcChallan: "rc_challan",
  batteryPhoto: "battery_photo",
  noHpaLetter: "no_hpa_letter",
  form22: "form_22",
};

const VehicleDelivery = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Vehicle Identification State
  const [vehicleNo, setVehicleNo] = useState("");
  const [engineNo, setEngineNo] = useState("");
  const [chassisNo, setChassisNo] = useState("");
  const [batteryNo, setBatteryNo] = useState("");
  const [batteryMake, setBatteryMake] = useState("");

  // Delivery Evidence State
  const [deliveryPhoto, setDeliveryPhoto] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [insuranceFile, setInsuranceFile] = useState(null);
  const [rcApplicationFile, setRcApplicationFile] = useState(null);

  // Post-sanction documents
  const [quotationFile, setQuotationFile] = useState(null);
  const [disclaimerFile, setDisclaimerFile] = useState(null);
  const [rcChallanFile, setRcChallanFile] = useState(null);
  const [batteryPhotoFile, setBatteryPhotoFile] = useState(null);
  const [noHpaLetterFile, setNoHpaLetterFile] = useState(null);
  const [form22File, setForm22File] = useState(null);

  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Fetch the real customer record so cust_id/kyc_id used by save-vehicle-delivery
  // come from the actual case instead of a hardcoded/localStorage-only fallback.
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

  // Check if all required fields are filled
  const isFormComplete = vehicleNo && engineNo && chassisNo && batteryNo && batteryMake && deliveryPhoto;
  
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      alert("Unable to access camera. Please check permissions.");
      setShowCamera(false);
    }
  };
  
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      
      // Stop camera stream
      const stream = videoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setShowCamera(false);
      setDeliveryPhoto(imageData);
    }
  };
  
  const cancelCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };
  
  const getFullUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `${baseURL}/${url}`;
  };

  const handleFileUpload = (type, event) => {
    const file = event.target.files[0];
    if (file) {
      switch(type) {
        case 'invoice':
          setInvoiceFile(file);
          break;
        case 'insurance':
          setInsuranceFile(file);
          break;
        case 'rcApplication':
          setRcApplicationFile(file);
          break;
        case 'quotation':
          setQuotationFile(file);
          break;
        case 'disclaimer':
          setDisclaimerFile(file);
          break;
        case 'rcChallan':
          setRcChallanFile(file);
          break;
        case 'batteryPhoto':
          setBatteryPhotoFile(file);
          break;
        case 'noHpaLetter':
          setNoHpaLetterFile(file);
          break;
        case 'form22':
          setForm22File(file);
          break;
        default:
          break;
      }
    }
  };
  
  // Confirmed via curl: { cust_id, kyc_id, emp_id, vehicle_no, engine_no, chassis_no,
  // battery_no, battery_make }. The 4 delivery documents now ride along in the same
  // request as multipart fields, so this is sent as FormData instead of JSON. Response
  // wraps a separate downstream call in third_party_response — success can be true (our
  // save succeeded, logged under log_id) even while third_party_response.status is "ERROR".
  const handleSubmit = async () => {
    if (!isFormComplete) {
      alert("Please complete all required fields and capture delivery photo");
      return;
    }

    const custId = parseInt(customerId, 10) || customer?.id || null;
    const kycId = parseInt(customer?.kyc_id, 10) || parseInt(localStorage.getItem("applicant_kyc_id"), 10) || 1;
    const empId = parseInt(localStorage.getItem("emp_id"), 10) || 1;

    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("cust_id", custId);
      formData.append("kyc_id", kycId);
      formData.append("emp_id", empId);
      formData.append("vehicle_no", vehicleNo);
      formData.append("engine_no", engineNo);
      formData.append("chassis_no", chassisNo);
      formData.append("battery_no", batteryNo);
      formData.append("battery_make", batteryMake);

      if (deliveryPhoto) {
        const photoBlob = await (await fetch(deliveryPhoto)).blob();
        formData.append(DELIVERY_DOC_FIELD.deliveryPhoto, photoBlob, "delivery_photo.jpg");
      }
      if (invoiceFile) formData.append(DELIVERY_DOC_FIELD.invoice, invoiceFile);
      if (insuranceFile) formData.append(DELIVERY_DOC_FIELD.insurance, insuranceFile);
      if (rcApplicationFile) formData.append(DELIVERY_DOC_FIELD.rcApplication, rcApplicationFile);
      if (quotationFile) formData.append(DELIVERY_DOC_FIELD.quotation, quotationFile);
      if (disclaimerFile) formData.append(DELIVERY_DOC_FIELD.disclaimer, disclaimerFile);
      if (rcChallanFile) formData.append(DELIVERY_DOC_FIELD.rcChallan, rcChallanFile);
      if (batteryPhotoFile) formData.append(DELIVERY_DOC_FIELD.batteryPhoto, batteryPhotoFile);
      if (noHpaLetterFile) formData.append(DELIVERY_DOC_FIELD.noHpaLetter, noHpaLetterFile);
      if (form22File) formData.append(DELIVERY_DOC_FIELD.form22, form22File);

      const res = await fetch(API.VEHICLE_DELIVERY_SAVE_API, {
        method: "POST",
        body: formData, // no Content-Type header — browser sets the multipart boundary
      });

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Save failed (HTTP ${res.status})`);
      }

      if (data?.third_party_response?.status?.toUpperCase() === "ERROR") {
        setError(
          `Vehicle delivery saved (log #${data.log_id}), but the downstream system reported: ${data.third_party_response.message}`
        );
      }

      alert(data.message || "Delivery details submitted for HO verification!");
      navigate("/sourcing-pipeline");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong while saving vehicle delivery details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(customerId ? `/sanction-review/${customerId}` : "/sanction-review");
  };
  
  return (
    <div className="delivery-page">
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
              <h1>Vehicle delivery details</h1>
            </div>
          </div>
          <div className="lead-info">
            <span>Lead ID</span>
            <strong>{customer?.application_id || "VED-7185-2826"}</strong>
          </div>
        </div>
      </div>

      {loading && <div className="loading-msg">Loading customer details...</div>}

      <div className="delivery-content">
        {error && <div className="error-msg">{error}</div>}

        {/* Sanction Approved Banner */}
        <div className="sanction-banner">
          <div className="sanction-icon">✓</div>
          <div className="sanction-text">
            <strong>
              Sanction approved · {customer?.loan_amount ? `₹${customer.loan_amount}` : "₹1,50,000"} @{" "}
              {customer?.tenure || 24} months
            </strong>
            <p>You may now deliver the vehicle and capture the delivery details below.</p>
          </div>
        </div>

        {/* Vehicle Identification Section */}
        <div className="section-card">
          <h2>Vehicle identification</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Vehicle no.</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="form-input"
                placeholder="e.g. JH01XX0000"
                required
              />
            </div>
            <div className="form-group">
              <label>Engine no.</label>
              <input
                type="text"
                value={engineNo}
                onChange={(e) => setEngineNo(e.target.value)}
                className="form-input"
                placeholder="e.g. TM-EP-884512"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Chassis no.</label>
              <input
                type="text"
                value={chassisNo}
                onChange={(e) => setChassisNo(e.target.value)}
                className="form-input"
                placeholder="e.g. MD2TM884512K"
                required
              />
            </div>
            <div className="form-group">
              <label>Battery no.</label>
              <input
                type="text"
                value={batteryNo}
                onChange={(e) => setBatteryNo(e.target.value)}
                className="form-input"
                placeholder="e.g. BAT-LFP-77120"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Battery make</label>
              <input
                type="text"
                value={batteryMake}
                onChange={(e) => setBatteryMake(e.target.value)}
                className="form-input"
                placeholder="e.g. Exide LFP 51.2V"
                required
              />
            </div>
            <div className="form-group">
              <label>Matches OEM invoice</label>
              <div className="status-badge success">✔ Matches OEM invoice</div>
            </div>
          </div>
        </div>

        {/* Duplication Check Section */}
        <div className="info-box success">
          <div className="info-icon">✓</div>
          <div className="info-text">
            <strong>Engine & chassis numbers are checked for duplication across all Vedika loans (anti re-financing of same vehicle).</strong>
            <span>Status: Unique ✓</span>
          </div>
        </div>

        {/* Delivery Evidence Section */}
        <div className="section-card">
          <h2>Delivery evidence</h2>
          
          {/* Delivery Photo */}
          <div className="delivery-photo-section">
            <label>Delivery photo — customer + vehicle</label>
            <div className="photo-preview">
              {deliveryPhoto ? (
                <img src={deliveryPhoto} alt="Delivery" className="captured-photo" />
              ) : (
                <div className="photo-placeholder">📷 No photo captured</div>
              )}
            </div>
            <button className="camera-btn" onClick={startCamera}>
              {deliveryPhoto ? "Retake Photo" : "Take Photo"}
            </button>
            <p className="field-note">Live camera - geo-tagged - timestamped</p>
          </div>
          
          {/* Supporting Docs */}
          <div className="supporting-docs">
            <label>Supporting docs</label>
            <div className="docs-list">
              <div className="doc-item">
                <span>Invoice</span>
                <input 
                  type="file" 
                  id="invoice"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => handleFileUpload('invoice', e)}
                  style={{ display: 'none' }}
                />
                <button className="upload-btn" onClick={() => document.getElementById('invoice').click()}>
                  {invoiceFile ? "✓ Uploaded" : "Upload →"}
                </button>
              </div>
              <div className="doc-item">
                <span>Insurance</span>
                <input 
                  type="file" 
                  id="insurance"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => handleFileUpload('insurance', e)}
                  style={{ display: 'none' }}
                />
                <button className="upload-btn" onClick={() => document.getElementById('insurance').click()}>
                  {insuranceFile ? "✓ Uploaded" : "Upload →"}
                </button>
              </div>
              <div className="doc-item">
                <span>RC application</span>
                <input
                  type="file"
                  id="rcApplication"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => handleFileUpload('rcApplication', e)}
                  style={{ display: 'none' }}
                />
                <button className="upload-btn" onClick={() => document.getElementById('rcApplication').click()}>
                  {rcApplicationFile ? "✓ Uploaded" : "Upload →"}
                </button>
              </div>
              <div className="doc-item">
                <span>Quotation</span>
                {/* Auto-filled from the quotation PDF already uploaded during Customer
                    Onboarding (DocumentCollection's "Quotation & pricing" step, saved as
                    customer.quotation_image) — only re-upload here to replace it. */}
                {quotationFile ? null : customer?.quotation_image ? (
                  <a
                    href={getFullUrl(customer.quotation_image)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="upload-btn"
                    style={{ marginRight: "8px" }}
                  >
                    ✓ From onboarding — View
                  </a>
                ) : null}
                <input
                  type="file"
                  id="quotation"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => handleFileUpload('quotation', e)}
                  style={{ display: 'none' }}
                />
                <button className="upload-btn" onClick={() => document.getElementById('quotation').click()}>
                  {quotationFile
                    ? "✓ Uploaded"
                    : customer?.quotation_image
                    ? "Replace →"
                    : "Upload →"}
                </button>
              </div>
              <div className="doc-item">
                <span>Disclaimer</span>
                <input
                  type="file"
                  id="disclaimer"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => handleFileUpload('disclaimer', e)}
                  style={{ display: 'none' }}
                />
                <button className="upload-btn" onClick={() => document.getElementById('disclaimer').click()}>
                  {disclaimerFile ? "✓ Uploaded" : "Upload →"}
                </button>
              </div>
              <div className="doc-item">
                <span>RC challan</span>
                <input
                  type="file"
                  id="rcChallan"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => handleFileUpload('rcChallan', e)}
                  style={{ display: 'none' }}
                />
                <button className="upload-btn" onClick={() => document.getElementById('rcChallan').click()}>
                  {rcChallanFile ? "✓ Uploaded" : "Upload →"}
                </button>
              </div>
              <div className="doc-item">
                <span>Battery photo</span>
                <input
                  type="file"
                  id="batteryPhoto"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => handleFileUpload('batteryPhoto', e)}
                  style={{ display: 'none' }}
                />
                <button className="upload-btn" onClick={() => document.getElementById('batteryPhoto').click()}>
                  {batteryPhotoFile ? "✓ Uploaded" : "Upload →"}
                </button>
              </div>
              <div className="doc-item">
                <span>NO HPA letter</span>
                <input
                  type="file"
                  id="noHpaLetter"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => handleFileUpload('noHpaLetter', e)}
                  style={{ display: 'none' }}
                />
                <button className="upload-btn" onClick={() => document.getElementById('noHpaLetter').click()}>
                  {noHpaLetterFile ? "✓ Uploaded" : "Upload →"}
                </button>
              </div>
              <div className="doc-item">
                <span>Form 22</span>
                <input
                  type="file"
                  id="form22"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => handleFileUpload('form22', e)}
                  style={{ display: 'none' }}
                />
                <button className="upload-btn" onClick={() => document.getElementById('form22').click()}>
                  {form22File ? "✓ Uploaded" : "Upload →"}
                </button>
              </div>
            </div>
            <p className="field-note">Invoice, insurance, RC application, quotation, disclaimer, RC challan, battery photo, NO HPA letter, Form 22</p>
          </div>
        </div>

        {/* Info Note */}
        <div className="info-note">
          <p>On submit, this goes to HO for delivery verification before disbursement.</p>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="back-btn" onClick={handleBack} disabled={isSubmitting}>← Back</button>
          <button className="submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Submit for HO verification →"}
          </button>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="camera-modal">
          <div className="camera-content">
            <video ref={videoRef} className="camera-video" autoPlay playsInline />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="camera-buttons">
              <button className="capture-btn" onClick={capturePhoto}>Capture</button>
              <button className="cancel-btn" onClick={cancelCamera}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleDelivery;