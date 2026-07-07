import React, { useState, useRef } from "react";
import "../../assets/css/DocumentCollection.css";
import logo from "../../assets/image/logo.png";
import { useNavigate } from "react-router-dom";
import { API } from "../api/apiRoutes";

const DocumentCollection = () => {
  const navigate = useNavigate();
  // State for form fields
  const [houseType, setHouseType] = useState("");
  const [proofType, setProofType] = useState("");
  const [accountNumber, setAccountNumber] = useState("5010XXXXXXX291");
  const [ifsc, setIfsc] = useState("HDFC0001234");
  const [bank, setBank] = useState("HDFC Bank");
  const [pennyDropStatus, setPennyDropStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // File upload states
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [houseProofFile, setHouseProofFile] = useState(null);
const [pennyDropLoading, setPennyDropLoading] = useState(false); // NEW
const [pennyDropResult, setPennyDropResult] = useState(null);
  
  // Reference states
  const [reference1, setReference1] = useState({
    name: "Ram Prasad",
    relationship: "Neighbour",
    mobile: "97XXXX2210",
    otpVerified: false,
    otpSent: false,
    otpValue: ""
  });
  
  const [reference2, setReference2] = useState({
    name: "Mohan Lal",
    relationship: "Relative",
    mobile: "98XXXX7781",
    otpVerified: false,
    otpSent: false,
    otpValue: ""
  });
  
  // Live image states - FIXED: Added applicantImage state
  const [applicantImage, setApplicantImage] = useState(null);
  const [applicantLiveness, setApplicantLiveness] = useState(false);
  const [applicantFaceMatch, setApplicantFaceMatch] = useState(null);
  const [coApplicantImage, setCoApplicantImage] = useState(null);
  const [showApplicantCamera, setShowApplicantCamera] = useState(false);
  const [showCoApplicantCamera, setShowCoApplicantCamera] = useState(false);
  
  // Quotation states
  const [onRoadPrice, setOnRoadPrice] = useState("185000");
  const [downPayment, setDownPayment] = useState("35000");
  const [quotationFile, setQuotationFile] = useState(null);
  
  // UI State
  const [activeSection, setActiveSection] = useState("kyc");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Refs for file inputs
  const aadhaarInputRef = useRef(null);
  const panInputRef = useRef(null);
  const houseProofInputRef = useRef(null);
  const quotationInputRef = useRef(null);
  
  // Video ref for camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // File upload handlers
  const handleFileUpload = (type, event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setError(`Please upload valid file (JPEG, PNG, or PDF) for ${type}`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`File size should be less than 5MB for ${type}`);
        return;
      }
      
      switch(type) {
        case 'aadhaar':
          setAadhaarFile(file);
          break;
        case 'pan':
          setPanFile(file);
          break;
        case 'houseProof':
          setHouseProofFile(file);
          break;
        case 'quotation':
          setQuotationFile(file);
          break;
        default:
          break;
      }
      setSuccess(`${type} uploaded successfully!`);
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  // Camera functions for Applicant - FIXED: Store and display image
  const startApplicantCamera = async () => {
    setShowApplicantCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
      setShowApplicantCamera(false);
    }
  };
  const base64ToBlob = (base64, mimeType = 'image/jpeg') => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  };

  const captureApplicantImage = () => {
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
      setShowApplicantCamera(false);
      
      // Store the captured image
      setApplicantImage(imageData);
      
      // Simulate liveness check and face match
      setApplicantLiveness(true);
      const matchScore = Math.floor(Math.random() * (98 - 85 + 1) + 85);
      setApplicantFaceMatch(matchScore);
      setSuccess(`Liveness detected! Face match score: ${matchScore}%`);
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const cancelApplicantCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowApplicantCamera(false);
  };

  // Camera functions for Co-applicant
  const startCoApplicantCamera = async () => {
    setShowCoApplicantCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
      setShowCoApplicantCamera(false);
    }
  };

  const captureCoApplicantImage = () => {
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
      setShowCoApplicantCamera(false);
      setCoApplicantImage(imageData);
      setSuccess("Co-applicant image captured successfully!");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handlePennyDrop = async () => {
    if (!accountNumber || !ifsc) {
      setError("Please enter valid account number and IFSC");
      return;
    }

    const kycId = localStorage.getItem("applicant_kyc_id");
    if (!kycId) {
      setError("KYC ID missing. Please complete applicant CB verification in Stage 1 first.");
      return;
    }

    setPennyDropLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("kyc_id", kycId);
      params.append("emp_id", "1"); // static as instructed

      const res = await fetch("http://20.219.130.232:8080/er_web/api/er-loan/penny-drop", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const rawText = await res.text();
      console.log("Penny-drop raw response:", rawText);

      let result;
      try {
        result = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error("Non-JSON response from penny-drop service");
      }

      // NOTE: adjust these field names once you see the real response shape
      const isSuccess = result.success === true || result.success === "true" || result.status === "success";

      if (isSuccess) {
        setPennyDropStatus(true);
        setPennyDropResult(result);
        setSuccess("Penny-drop verification successful!");
      } else {
        setPennyDropStatus(false);
        setError(result.message || "Penny-drop verification failed. Please check account details.");
      }
    } catch (err) {
      console.error("Penny-drop error:", err);
      setError("Error processing penny-drop verification. Please try again.");
    } finally {
      setPennyDropLoading(false);
    }
  };

  const cancelCoApplicantCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCoApplicantCamera(false);
  };

  // Retake applicant image
  const retakeApplicantImage = () => {
    setApplicantImage(null);
    setApplicantLiveness(false);
    setApplicantFaceMatch(null);
    startApplicantCamera();
  };

  // Retake co-applicant image
  const retakeCoApplicantImage = () => {
    setCoApplicantImage(null);
    startCoApplicantCamera();
  };

  // Penny drop handler
  // const handlePennyDrop = () => {
  //   if (!accountNumber || !ifsc) {
  //     setError("Please enter valid account number and IFSC");
  //     return;
  //   }
  //   setPennyDropStatus(true);
  //   setSuccess("Penny-drop successful! Account name 'SURESH KUMAR' matches applicant name (97%)");
  //   setTimeout(() => setSuccess(""), 5000);
  // };

  // Reference OTP handlers
  const sendReferenceOtp = (refNum) => {
    const ref = refNum === 1 ? reference1 : reference2;
    const mobileNumber = ref.mobile.replace(/X/g, '');
    
    if (!mobileNumber || mobileNumber.length < 10) {
      setError("Please enter valid 10-digit mobile number");
      return;
    }
    
    if (refNum === 1) {
      setReference1({ ...reference1, otpSent: true, otpValue: "" });
    } else {
      setReference2({ ...reference2, otpSent: true, otpValue: "" });
    }
    
    alert(`Dummy OTP sent to ${ref.mobile}: 123456`);
    setSuccess(`OTP sent to reference ${refNum}`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const verifyReferenceOtp = (refNum) => {
    const ref = refNum === 1 ? reference1 : reference2;
    
    if (!ref.otpValue) {
      setError(`Please enter OTP for reference ${refNum}`);
      return;
    }
    
    if (ref.otpValue !== "123456") {
      setError("Invalid OTP. Please enter 123456");
      return;
    }
    
    if (refNum === 1) {
      setReference1({ 
        ...reference1, 
        otpVerified: true, 
        otpSent: false, 
        otpValue: "" 
      });
    } else {
      setReference2({ 
        ...reference2, 
        otpVerified: true, 
        otpSent: false, 
        otpValue: "" 
      });
    }
    
    setSuccess(`Reference ${refNum} verified successfully!`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleReferenceChange = (refNum, field, value) => {
    if (refNum === 1) {
      setReference1({ 
        ...reference1, 
        [field]: value, 
        otpVerified: false,
        otpSent: false,
        otpValue: ""
      });
    } else {
      setReference2({ 
        ...reference2, 
        [field]: value, 
        otpVerified: false,
        otpSent: false,
        otpValue: ""
      });
    }
  };

  const handleOtpValueChange = (refNum, value) => {
    if (refNum === 1) {
      setReference1({ ...reference1, otpValue: value });
    } else {
      setReference2({ ...reference2, otpValue: value });
    }
  };

  // Get application_id from localStorage (saved at end of Stage 1)
const storedApp = localStorage.getItem("application_id");


const saveStage2 = async () => {
  
  // --- Validations (keep your existing handleSubmit checks) ---
  if (!aadhaarFile)          { alert("Please upload Aadhaar copy");           return; }
  if (!panFile)              { alert("Please upload PAN copy");               return; }
  if (!houseProofFile)       { alert("Please upload House proof");            return; }
  if (!houseType)            { alert("Please select house type");             return; }
  if (houseType === "owned" && !proofType) { alert("Please select proof type"); return; }
  if (!applicantImage)       { alert("Please capture applicant live image");  return; }
  if (!applicantLiveness)    { alert("Please complete liveness check");       return; }
  // if (!pennyDropStatus)      { alert("Please complete penny-drop");           return; }
  if (!quotationFile)        { alert("Please upload quotation PDF");          return; }
  // if (!storedApp)            { alert("Application ID missing. Go back to Stage 1."); return; }
  setLoading(true);
  try {
    // Use FormData because we have actual file uploads
    const formData = new FormData();

    // application_id
    formData.append("application_id", storedApp);

    // Actual file uploads
    formData.append("aadhaar_copy_file", aadhaarFile);
    formData.append("pan_copy_file",     panFile);
    formData.append("house_proof_file",  houseProofFile);
    formData.append("quotation_image",   quotationFile);

    // Base64 camera images (stored as strings in state)
    if (applicantImage) {
      const blob = base64ToBlob(applicantImage);
      formData.append("applicant_image", blob, "applicant_image.jpg");
    }
    if (coApplicantImage) {
      const blob = base64ToBlob(coApplicantImage);
      formData.append("co_applicant_image", blob, "co_applicant_image.jpg");
    }

    // House info
    formData.append("house_type",           houseType);
    formData.append("house_ownership_type", houseType === "owned" ? "owned" : "rented");
    formData.append("house_proof_type",     proofType || "");

    // Bank details
    formData.append("bank_account_number", accountNumber);
    formData.append("ifsc_code",           ifsc);
    formData.append("bank_name",           bank);

    // References
    formData.append("ref1_name",         reference1.name);
    formData.append("ref1_relationship", reference1.relationship);
    formData.append("ref1_mobile",       reference1.mobile);
    formData.append("ref2_name",         reference2.name);
    formData.append("ref2_relationship", reference2.relationship);
    formData.append("ref2_mobile",       reference2.mobile);

    const res = await fetch(`${API.CUSTOMERSTAGE_SECOND}`, {
      method: "POST",
      // ⚠️ DO NOT set Content-Type header — browser sets it automatically with boundary for FormData
      body: formData
    });

    const rawText = await res.text();
    console.log("Raw response:", rawText);

    const result = JSON.parse(rawText);

    if (result.success === true || result.success === "true") {
      alert("Stage 2 saved successfully ✅");
      navigate("/offer-summary");
    } else {
      setError(`Failed: ${result.message || "Unknown error"}`);
    }

  } catch (err) {
    console.error("saveStage2 error:", err);
    setError("Error saving Stage 2. Check console.");
  }finally {
    setLoading(false); // ADD THIS
  }
};

  // Price validation
  const validatePrice = (price) => {
    const numPrice = parseInt(price.replace(/,/g, ''));
    if (numPrice < 178000 || numPrice > 192000) {
      setError("On-road price is outside the price band (₹1.78–1.92 L)");
      return false;
    }
    return true;
  };

  const handlePriceChange = (value) => {
    setOnRoadPrice(value);
    if (validatePrice(value)) {
      setError("");
    }
  };

  // Submit handler with validations
  const handleSubmit = () => {
    if (!aadhaarFile) {
      setError("Please upload Aadhaar copy");
      return;
    }
    if (!panFile) {
      setError("Please upload PAN copy");
      return;
    }
    if (!houseProofFile) {
      setError("Please upload House proof");
      return;
    }
    if (!houseType) {
      setError("Please select house type");
      return;
    }
    if (houseType === "owned" && !proofType) {
      setError("Please select owned-house proof type");
      return;
    }
    if (!applicantImage) {
      setError("Please capture applicant live image");
      return;
    }
    if (!applicantLiveness) {
      setError("Please complete applicant liveness check");
      return;
    }
    if (!pennyDropStatus) {
      setError("Please complete penny-drop verification");
      return;
    }
    if (!reference1.otpVerified) {
      setError("Please verify OTP for Reference 1");
      return;
    }
    if (!reference2.otpVerified) {
      setError("Please verify OTP for Reference 2");
      return;
    }
    if (!quotationFile) {
      setError("Please upload quotation PDF");
      return;
    }
    if (!validatePrice(onRoadPrice)) {
      return;
    }
    
    alert("Document collection completed successfully! Proceeding to next stage...");
  };

  return (
    <div className="doc-collection-page">
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
              <h1>Document collection & KYC</h1>
              <p>Complete KYC document upload, bank verification & reference checks</p>
            </div>
          </div>
          <div className="lead-info">
            <span>Lead ID</span>
            <strong>VED-7185-2026</strong>
          </div>
        </div>
      </div>

      <div className="doc-content">
        {/* Error and Success Messages */}
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {/* KYC Documents Section */}
        <div className="collapse-card">
          <div 
            className="collapse-header"
            onClick={() => setActiveSection(activeSection === "kyc" ? "" : "kyc")}
          >
            <div className="header-left">
              <span className="collapse-icon">{activeSection === "kyc" ? "▼" : "▶"}</span>
              <h3>KYC document</h3>
            </div>
            <div className="status-badge success">
              <span className="checkmark">✓</span> In Progress
            </div>
          </div>

          {activeSection === "kyc" && (
            <div className="collapse-body">
              <div className="docs-grid">
                <div className="doc-card">
                  <div className="doc-icon">📄</div>
                  <div className="doc-info">
                    <strong>Aadhaar copy</strong>
                    <p>Upload front & back</p>
                    <input 
                      type="file" 
                      ref={aadhaarInputRef}
                      style={{ display: 'none' }}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('aadhaar', e)}
                    />
                    <button className="upload-btn" onClick={() => aadhaarInputRef.current.click()}>
                      {aadhaarFile ? "✓ Uploaded" : "Upload →"}
                    </button>
                  </div>
                </div>
                <div className="doc-card">
                  <div className="doc-icon">📋</div>
                  <div className="doc-info">
                    <strong>PAN copy</strong>
                    <p>Upload PAN card</p>
                    <input 
                      type="file" 
                      ref={panInputRef}
                      style={{ display: 'none' }}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('pan', e)}
                    />
                    <button className="upload-btn" onClick={() => panInputRef.current.click()}>
                      {panFile ? "✓ Uploaded" : "Upload →"}
                    </button>
                  </div>
                </div>
                <div className="doc-card">
                  <div className="doc-icon">🏠</div>
                  <div className="doc-info">
                    <strong>House proof</strong>
                    <p>Electricity bill/Rent agreement</p>
                    <input 
                      type="file" 
                      ref={houseProofInputRef}
                      style={{ display: 'none' }}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('houseProof', e)}
                    />
                    <button className="upload-btn" onClick={() => houseProofInputRef.current.click()}>
                      {houseProofFile ? "✓ Uploaded" : "Upload →"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="house-type-section">
                <label className="section-label">House type</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="houseType" 
                      value="owned"
                      onChange={(e) => setHouseType(e.target.value)}
                    />
                    <span>Owned</span>
                  </label>
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="houseType" 
                      value="rented"
                      onChange={(e) => setHouseType(e.target.value)}
                    />
                    <span>Rented</span>
                  </label>
                </div>
                
                {houseType === "owned" && (
                  <div className="proof-type-section">
                    <label className="section-label">Owned-house proof type</label>
                    <select 
                      value={proofType} 
                      onChange={(e) => setProofType(e.target.value)}
                      className="form-select"
                    >
                      <option value="">Select proof type</option>
                      <option value="property-tax">Property tax receipt</option>
                      <option value="sale-deed">Sale deed</option>
                      <option value="registry">Registry document</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Image Capture Section - FIXED: Shows both images */}
        <div className="collapse-card">
          <div 
            className="collapse-header"
            onClick={() => setActiveSection(activeSection === "liveimage" ? "" : "liveimage")}
          >
            <div className="header-left">
              <span className="collapse-icon">{activeSection === "liveimage" ? "▼" : "▶"}</span>
              <h3>Live image capture (liveness + face match)</h3>
            </div>
            {applicantImage && applicantLiveness && <div className="status-badge success">✓ Completed</div>}
          </div>

          {activeSection === "liveimage" && (
            <div className="collapse-body">
              {/* Camera Modal for Applicant */}
              {showApplicantCamera && (
                <div className="camera-modal">
                  <div className="camera-content">
                    <video ref={videoRef} className="camera-video" autoPlay playsInline />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div className="camera-buttons">
                      <button className="capture-btn" onClick={captureApplicantImage}>Capture</button>
                      <button className="cancel-btn" onClick={cancelApplicantCamera}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera Modal for Co-applicant */}
              {showCoApplicantCamera && (
                <div className="camera-modal">
                  <div className="camera-content">
                    <video ref={videoRef} className="camera-video" autoPlay playsInline />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div className="camera-buttons">
                      <button className="capture-btn" onClick={captureCoApplicantImage}>Capture</button>
                      <button className="cancel-btn" onClick={cancelCoApplicantCamera}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="live-image-grid">
                {/* Applicant Card - FIXED: Shows captured image */}
                <div className="live-image-card">
                  <div className="card-title">Applicant</div>
                  <div className="image-preview">
                    {applicantImage ? (
                      <img src={applicantImage} alt="Applicant" className="captured-image" />
                    ) : (
                      <div className="preview-icon">📸</div>
                    )}
                  </div>
                  {!applicantImage ? (
                    <button className="capture-btn" onClick={startApplicantCamera}>
                      Capture Live Image
                    </button>
                  ) : (
                    <>
                      <div className="verification-status">
                        <div className="status-item">
                          <span className="tick-icon green-tick-small">✓</span>
                          <span>Liveness Detected</span>
                        </div>
                        <div className="status-item">
                          <span className="tick-icon green-tick-small">✓</span>
                          <span>Aadhaar face match {applicantFaceMatch}%</span>
                        </div>
                      </div>
                      <button className="recapture-btn" onClick={retakeApplicantImage}>
                        Retake Image
                      </button>
                    </>
                  )}
                </div>
                
                {/* Co-applicant Card - Shows captured image */}
                <div className="live-image-card">
                  <div className="card-title">Co-applicant</div>
                  <div className="image-preview">
                    {coApplicantImage ? (
                      <img src={coApplicantImage} alt="Co-applicant" className="captured-image" />
                    ) : (
                      <div className="preview-icon empty">📷</div>
                    )}
                  </div>
                  {!coApplicantImage ? (
                    <button className="capture-btn" onClick={startCoApplicantCamera}>
                      Capture Live Image
                    </button>
                  ) : (
                    <>
                      <div className="verification-status">
                        <div className="status-item">
                          <span className="tick-icon green-tick-small">✓</span>
                          <span>Image Captured</span>
                        </div>
                      </div>
                      <button className="recapture-btn" onClick={retakeCoApplicantImage}>
                        Retake Image
                      </button>
                    </>
                  )}
                  <p className="camera-note">Camera only - no gallery upload</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bank Account Section */}
        <div className="collapse-card">
          <div 
            className="collapse-header"
            onClick={() => setActiveSection(activeSection === "bank" ? "" : "bank")}
          >
            <div className="header-left">
              <span className="collapse-icon">{activeSection === "bank" ? "▼" : "▶"}</span>
              <h3>Bank Details</h3>
            </div>
            {pennyDropStatus && <div className="status-badge success">✓ Penny-drop successful</div>}
          </div>

          {activeSection === "bank" && (
            <div className="collapse-body">
              <div className="bank-details">
                <div className="bank-field">
                  <label>Account number</label>
                  <input 
                    type="text" 
                    value={accountNumber} 
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="form-input"
                    placeholder="Enter account number"
                  />
                </div>
                <div className="bank-field">
                  <label>IFSC</label>
                  <input 
                    type="text" 
                    value={ifsc} 
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    className="form-input"
                    placeholder="Enter IFSC code"
                  />
                </div>
                <div className="bank-field">
                  <label>Bank</label>
                  <input 
                    type="text" 
                    value={bank} 
                    onChange={(e) => setBank(e.target.value)}
                    className="form-input"
                    placeholder="Enter bank name"
                  />
                </div>
              </div>
              
              {!pennyDropStatus ? (
                  <button className="penny-drop-btn" onClick={handlePennyDrop} disabled={pennyDropLoading}>
                    {pennyDropLoading ? "Verifying..." : "Initiate Penny-drop"}
                  </button>
                ) : (
                  <div className="penny-drop-result">
                    <div className="result-icon">✓</div>
                    <div className="result-text">
                      <strong>Penny-drop successful</strong>
                      <p>
                        {pennyDropResult?.account_holder_name
                          ? `Account name "${pennyDropResult.account_holder_name}"${pennyDropResult.match_percentage ? ` — matches applicant name (${pennyDropResult.match_percentage}%)` : ""}`
                          : "Bank account verified."}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Reference Details Section */}
        <div className="collapse-card">
          <div 
            className="collapse-header"
            onClick={() => setActiveSection(activeSection === "reference" ? "" : "reference")}
          >
            <div className="header-left">
              <span className="collapse-icon">{activeSection === "reference" ? "▼" : "▶"}</span>
              <h3>Reference details</h3>
            </div>
          </div>

          {activeSection === "reference" && (
            <div className="collapse-body">
              {/* Reference 1 */}
              <div className="reference-card">
                <div className="reference-header">
                  <span className="ref-num">Reference 1</span>
                  {reference1.otpVerified && <div className="otp-status">✓ OTP Verified</div>}
                </div>
                <div className="reference-details">
                  <div className="ref-field">
                    <label>Name</label>
                    <input 
                      type="text" 
                      value={reference1.name} 
                      onChange={(e) => handleReferenceChange(1, 'name', e.target.value)}
                      className="form-input"
                      placeholder="Enter name"
                    />
                  </div>
                  <div className="ref-field">
                    <label>Relationship</label>
                    <input 
                      type="text" 
                      value={reference1.relationship} 
                      onChange={(e) => handleReferenceChange(1, 'relationship', e.target.value)}
                      className="form-input"
                      placeholder="Enter relationship"
                    />
                  </div>
                  <div className="ref-field">
                    <label>Mobile</label>
                    <div className="mobile-field">
                      <input 
                        type="text" 
                        value={reference1.mobile} 
                        onChange={(e) => handleReferenceChange(1, 'mobile', e.target.value)}
                        className="form-input"
                        placeholder="10-digit mobile"
                        maxLength="10"
                      />
                    {/* {!reference1.otpVerified && (
                        <>
                          {!reference1.otpSent ? (
                            <button className="verify-otp-btn" onClick={() => sendReferenceOtp(1)}>
                              Send OTP
                            </button>
                          ) : (
                            <>
                              { <input 
                                type="text" 
                                value={reference1.otpValue}
                                onChange={(e) => handleOtpValueChange(1, e.target.value)}
                                className="otp-input"
                                placeholder="OTP"
                                maxLength="6"
                              />
                              <button className="verify-otp-btn" onClick={() => verifyReferenceOtp(1)}>
                                Verify
                              </button> }
                            </>
                          )}
                        </>
                      )} */}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference 2 */}
              <div className="reference-card">
                <div className="reference-header">
                  <span className="ref-num">Reference 2</span>
                  {reference2.otpVerified && <div className="otp-status">✓ OTP Verified</div>}
                </div>
                <div className="reference-details">
                  <div className="ref-field">
                    <label>Name</label>
                    <input 
                      type="text" 
                      value={reference2.name} 
                      onChange={(e) => handleReferenceChange(2, 'name', e.target.value)}
                      className="form-input"
                      placeholder="Enter name"
                    />
                  </div>
                  <div className="ref-field">
                    <label>Relationship</label>
                    <input 
                      type="text" 
                      value={reference2.relationship} 
                      onChange={(e) => handleReferenceChange(2, 'relationship', e.target.value)}
                      className="form-input"
                      placeholder="Enter relationship"
                    />
                  </div>
                  <div className="ref-field">
                    <label>Mobile</label>
                    <div className="mobile-field">
                      <input 
                        type="text" 
                        value={reference2.mobile} 
                        onChange={(e) => handleReferenceChange(2, 'mobile', e.target.value)}
                        className="form-input"
                        placeholder="10-digit mobile"
                        maxLength="10"
                      />
                      {/* {!reference2.otpVerified && (
                        <>
                          {!reference2.otpSent ? (
                            <button className="verify-otp-btn" onClick={() => sendReferenceOtp(2)}>
                              Send OTP
                            </button>
                          ) : (
                            <>
                              <input 
                                type="text" 
                                value={reference2.otpValue}
                                onChange={(e) => handleOtpValueChange(2, e.target.value)}
                                className="otp-input"
                                placeholder="OTP"
                                maxLength="6"
                              />
                              <button className="verify-otp-btn" onClick={() => verifyReferenceOtp(2)}>
                                Verify
                              </button>
                            </>
                          )}
                        </>
                      )} */}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedupe Alert */}
              {reference1.otpVerified && (
                <div className="dedupe-alert">
                  <div className="alert-icon">⚠️</div>
                  <div className="alert-text">
                    <strong>Dedupe alert:</strong> Reference 1 mobile {reference1.mobile} is already linked as a reference on 2 other live loans. Flagged for FI verification.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quotation & Pricing Section */}
        <div className="collapse-card">
          <div 
            className="collapse-header"
            onClick={() => setActiveSection(activeSection === "quotation" ? "" : "quotation")}
          >
            <div className="header-left">
              <span className="collapse-icon">{activeSection === "quotation" ? "▼" : "▶"}</span>
              <h3>Quotation & pricing</h3>
            </div>
          </div>

          {activeSection === "quotation" && (
            <div className="collapse-body">
              <div className="quotation-section">
                <div className="quotation-file">
                  <span className="file-icon">📄</span>
                  <span>{quotationFile ? quotationFile.name : "quotation_terra.pdf"}</span>
                  <input 
                    type="file" 
                    ref={quotationInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf"
                    onChange={(e) => handleFileUpload('quotation', e)}
                  />
                  <button className="download-btn" onClick={() => quotationInputRef.current.click()}>
                    {quotationFile ? "✓ Uploaded" : "Upload PDF →"}
                  </button>
                </div>
                
                <div className="pricing-fields">
                  <div className="price-field">
                    <label>On-road price (₹)</label>
                    <input 
                      type="text" 
                      value={onRoadPrice} 
                      onChange={(e) => handlePriceChange(e.target.value.replace(/,/g, ''))}
                      className="form-input"
                      placeholder="Enter on-road price"
                    />
                  </div>
                  <div className="price-field">
                    <label>Down payment (₹)</label>
                    <input 
                      type="text" 
                      value={downPayment} 
                      onChange={(e) => setDownPayment(e.target.value.replace(/,/g, ''))}
                      className="form-input"
                      placeholder="Enter down payment"
                    />
                  </div>
                </div>
                
                <div className="validation-note">
                  <span className="check-icon">✓</span>
                  On-road price cross-checked against quotation PDF and Terra Power Plus price band (₹1.78–1.92 L). Within range.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        {/* <button className="submit-btn" 
           onClick={() => navigate("/offer-summary")}
        >
          
        </button> */}
        <button className="submit-btn" onClick={saveStage2} disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner"></span> Submitting...
              </>
            ) : (
              "Submit Document Collections →"
            )}
          </button>

        {/* Helper Text */}
        <div className="helper-text">
          <small>🔑 All documents will be verified within 24 hours | Demo OTP: 123456</small>
        </div>
      </div>
    </div>
  );
};

export default DocumentCollection;