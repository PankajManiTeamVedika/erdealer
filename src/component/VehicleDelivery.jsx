import React, { useState, useRef } from "react";
import "../../src/assets/css/VehicleDelivery.css";
import logo from "../../src/assets/image/logo.png";
import { useNavigate } from "react-router-dom";

const VehicleDelivery = () => {
  const navigate = useNavigate();
  
  // Vehicle Identification State
  const [vehicleNo, setVehicleNo] = useState("JH01XX0000");
  const [engineNo, setEngineNo] = useState("TM-EP-884512");
  const [chassisNo, setChassisNo] = useState("MD2TM884512K");
  const [batteryNo, setBatteryNo] = useState("BAT-LFP-77120");
  const [batteryMake, setBatteryMake] = useState("Exide LFP 51.2V");
  
  // Delivery Evidence State
  const [deliveryPhoto, setDeliveryPhoto] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [insuranceFile, setInsuranceFile] = useState(null);
  const [rcApplicationFile, setRcApplicationFile] = useState(null);
  
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
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
        default:
          break;
      }
    }
  };
  
  const handleSubmit = () => {
    if (!isFormComplete) {
      alert("Please complete all required fields and capture delivery photo");
      return;
    }
    alert("Delivery details submitted for HO verification!");
  };
  
  const handleBack = () => {
    navigate("/sanction-review");
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
            <strong>VED-7185-2826</strong>
          </div>
        </div>
      </div>

      <div className="delivery-content">
        {/* Sanction Approved Banner */}
        <div className="sanction-banner">
          <div className="sanction-icon">✓</div>
          <div className="sanction-text">
            <strong>Sanction approved · ₹1,50,000 @ 24 months</strong>
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
              />
            </div>
            <div className="form-group">
              <label>Engine no.</label>
              <input 
                type="text" 
                value={engineNo} 
                onChange={(e) => setEngineNo(e.target.value)}
                className="form-input"
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
              />
            </div>
            <div className="form-group">
              <label>Battery no.</label>
              <input 
                type="text" 
                value={batteryNo} 
                onChange={(e) => setBatteryNo(e.target.value)}
                className="form-input"
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
            </div>
            <p className="field-note">Invoice, insurance, RC application</p>
          </div>
        </div>

        {/* Info Note */}
        <div className="info-note">
          <p>On submit, this goes to HO for delivery verification before disbursement.</p>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="back-btn" onClick={handleBack}>← Back</button>
          <button className="submit-btn" onClick={handleSubmit}>Submit for HO verification →</button>
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