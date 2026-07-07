import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "../assets/css/style.css";
import logo from "../assets/image/logo.png";
import { API } from "../component/api/apiRoutes";

const DealerOnboardingForm = () => {
  const location = useLocation();
  const selectedManufacturers = location.state?.selectedManufacturers || [];

   const getValue = (item, key) => {
    if (typeof item === "string") return item;
    return item[key] || item.name || item.value || "";
  };

  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [branches, setBranches] = useState([]);

  const [form, setForm] = useState({
    state: "",
    district: "",
    branch: "",
    owner_name: "",
    showroom_name: "",
    firm_type: "",
    year_of_business: "",
    firm_pan: "",
    gst_number: "",
    showroom_address: "",
    owner_aadhaar: "",
    owner_pan: "",
    owner_contact: "",
    owner_email: "",
    bank_account: "",
    ifsc_code: "",
    bank_name: "",
  });

  const [verifyStatus, setVerifyStatus] = useState({
    firm_pan_verify_status: "pending",
    owner_pan_verify_status: "pending",
    gstin_verify_status: "pending",
    aadhaar_ekyc_status: "pending",
    mobile_otp_verified: "pending",
    bank_penny_drop_verified: "pending",
    cibil_commercial: "on_submit",
    blacklist_scrub: "on_submit",
  });

  useEffect(() => {
    fetchStates();
  }, []);

  useEffect(() => {
    if (form.state) fetchDistricts(form.state);
  }, [form.state]);

  useEffect(() => {
    if (form.district) fetchBranches(form.district);
  }, [form.district]);

  const fetchStates = async () => {
    try {
      const res = await fetch(API.LOCATION_STATES);
      const json = await res.json();
      const allowedStates = ["Jharkhand","Bihar","Uttar Pradesh","West Bengal","Assam","Tripura","Odisha"];
      const filteredStates = (json.data || []).filter(item => allowedStates.includes(typeof item==="string"?item:item.state||item.name||""));
      setStates(filteredStates);
    } catch (err) { console.error("State API Error:", err); setStates([]); }
  };

  const fetchDistricts = async (state) => {
    try {
      const res = await fetch(API.LOCATION_DISTRICTS(state));
      const json = await res.json();
      const cleanDistricts = (json.data || []).filter(item => {
        const districtName = typeof item==="string"?item:item.district||item.name||"";
        return districtName.trim()!=="";
      });
      setDistricts(cleanDistricts);
      setForm(prev => ({ ...prev, district:"", branch:"" }));
      setBranches([]);
    } catch (err) { console.error("District API Error:", err); setDistricts([]); }
  };

  const fetchBranches = async (district) => {
    try {
      const res = await fetch(API.LOCATION_BRANCHES(district));
      const json = await res.json();
      const cleanBranches = (json.data || []).filter(item => {
        const branchName = typeof item==="string"?item:item.branch||item.name||"";
        return branchName.trim()!=="";
      });
      setBranches(cleanBranches);
      setForm(prev => ({ ...prev, branch:"" }));
    } catch (err) { console.error("Branch API Error:", err); setBranches([]); }
  };

  const handleChange = (e) => { const { name, value } = e.target; setForm(prev => ({ ...prev, [name]: value })); };

  // ----------------- Verification Function (PAN + Aadhaar integrated) -----------------
const [loadingField, setLoadingField] = useState(null);
const [aadhaarTransactionId, setAadhaarTransactionId] = useState(null);

const verifyField = async (type, value = "") => {
  let payload = {}, statusKey = "", apiUrl = "";

  try {
    setLoadingField(type); // start loader

    switch(type){
      case "pan":
        if (value === form.owner_pan) statusKey = "owner_pan_verify_status";
        else if (value === form.firm_pan) statusKey = "firm_pan_verify_status";

        payload = { id_no: value };
        apiUrl = `${API.DEALERS}/verify/pan`;
        break;

      case "aadhaar":
        statusKey = "aadhaar_ekyc_status";
        apiUrl = `${API.DEALERS}/verify/aadhaar`;

        if(!aadhaarTransactionId){ 
          // First click: generate link
          payload = { id_no: form.owner_aadhaar };
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
          });
          const result = await res.json();

          if(result.status && result.data?.model?.url){
            setVerifyStatus(prev => ({ ...prev, [statusKey]: "in_process" }));
            setAadhaarTransactionId(result.data.model.unifiedTransactionId);
            window.open(result.data.model.url, "_blank");
            alert("Aadhaar KYC link generated. Complete in new tab, then click 'In Process' to verify.");
          } else {
            setVerifyStatus(prev => ({ ...prev, [statusKey]: "failed" }));
            alert("Failed to generate Aadhaar KYC link ❌");
          }
          return;
        } else { 
          // Second click: hit details API
          const detailsUrl = `${API.DEALERS}/verify/aadhaar/details/${aadhaarTransactionId}`;
          const res = await fetch(detailsUrl, {
            method: "POST", // match your backend
            headers: { "Content-Type": "application/json" }
          });
          const result = await res.json();

          if(result.status && result.data?.model?.referenceId){
            setVerifyStatus(prev => ({ ...prev, [statusKey]: "verified" }));
            alert("Aadhaar verification completed ✅");
          } else {
            alert("Aadhaar verification still in progress ⏳");
          }
        }
        break;

      case "gst":
        payload = { gst_number: form.gst_number };
        statusKey = "gstin_verify_status";
        apiUrl = `${API.DEALERS}/verify/gst`;
        break;

      case "mobile":
        payload = { mobile: form.owner_contact };
        statusKey = "mobile_otp_verified";
        apiUrl = `${API.DEALERS}/verify/mobile`;
        break;

      case "cibil":
        payload = { pan: form.owner_pan };
        statusKey = "cibil_commercial";
        apiUrl = `${API.DEALERS}/verify/cibil`;
        break;

      default: return;
    }

    if(type !== "aadhaar"){ 
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if(type==="pan" && result.status && result.data?.status === "INVALID"){
        setVerifyStatus(prev => ({ ...prev, [statusKey]: "failed" }));
        alert(`${type.toUpperCase()} verification failed ❌ (Invalid PAN)`);
      } else {
        setVerifyStatus(prev => ({ ...prev, [statusKey]: result.status ? "verified" : "failed" }));
        if(result.status) alert(`${type.toUpperCase()} verification successful ✅`);
        else alert(`${type.toUpperCase()} verification failed ❌`);
      }
    }

  } catch(err){
    console.error(err);
    alert(`Error verifying ${type}`);
  } finally {
    setLoadingField(null); // stop loader
  }
};





  // ----------------- Submit Dealer -----------------
 const handleSubmit = async (e) => {
    e.preventDefault();
    if (!e.target.checkValidity()){ e.target.reportValidity(); return; }
    if(selectedManufacturers.length===0){ alert("Please select manufacturer"); return; }

    try {
      setSubmitting(true);
      const formData = new FormData();
      Object.entries(form).forEach(([key,value])=>formData.append(key,value));
      selectedManufacturers.forEach(item=>formData.append("manufacturer_ids[]",item.id));
      formData.append("manufacturer_name",selectedManufacturers.map(item=>item.manufacturer_name).join(","));
      formData.append("consents",JSON.stringify({pan:true,gst:true,dpdp:true}));
      formData.append("declarations",JSON.stringify({
        pan:verifyStatus.owner_pan_verify_status==="verified",
        gst:verifyStatus.gstin_verify_status==="verified",
        dpdp:true,
        kcyc:verifyStatus.aadhaar_ekyc_status==="verified",
        bank_verified:verifyStatus.bank_penny_drop_verified==="verified"
      }));
      Object.keys(verifyStatus).forEach(key=>formData.append(key,verifyStatus[key]));

      const fileInputs=document.querySelectorAll("input[type=file]");
      fileInputs.forEach(input=>{
        const docType=input.previousElementSibling?.querySelector("h4")?.innerText.replace("●","").trim();
        if(input.files.length>0 && docType){
          formData.append("documents[]",input.files[0]);
          formData.append("document_types[]",docType);
        }
      });

      if(capturedImage){
        const blob = await (await fetch(capturedImage)).blob();
        formData.append("documents[]",blob,"live_selfie.png");
        formData.append("document_types[]","Live Selfie From Showroom");
      }

      const res = await fetch(API.DEALERS,{method:"POST",body:formData});
      const result = await res.json();
      if(result.status){ setSuccess(true); } else { alert(result.message || "Dealer save failed"); }

    } catch(err){ console.error(err); alert("Something went wrong while saving dealer"); }
    finally{ setSubmitting(false); }
  };

 // ----------------- Camera -----------------
  const openCamera = async ()=>{
    try {
      setCapturedImage(null); setCameraReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      streamRef.current=stream; setCameraOpen(true);
      setTimeout(()=>{ if(videoRef.current){ videoRef.current.srcObject=stream; videoRef.current.play(); setCameraReady(true); } },300);
    } catch{ alert("Camera not available"); }
  };
   const capturePhoto = ()=>{
    const video=videoRef.current, canvas=canvasRef.current;
    if(!video||!canvas||!streamRef.current){ alert("Camera not ready"); return; }
    canvas.width=video.videoWidth||640; canvas.height=video.videoHeight||480;
    canvas.getContext("2d").drawImage(video,0,0,canvas.width,canvas.height);
    setCapturedImage(canvas.toDataURL("image/png"));
    streamRef.current.getTracks().forEach(track=>track.stop());
    streamRef.current=null; setCameraOpen(false); setCameraReady(false);
  };

 // ----------------- Verification Button -----------------
  const InputVerifyButton = ({statusKey,label})=>{
    const handleClick=async ()=>{
      switch(statusKey){
        case "owner_pan_verify_status": case "firm_pan_verify_status":
          await verifyField("pan"); break;
        case "gstin_verify_status": await verifyField("gst"); break;
        case "aadhaar_ekyc_status": await verifyField("aadhaar"); break;
        case "mobile_otp_verified": await verifyField("mobile"); break;
        case "cibil_commercial": await verifyField("cibil"); break;
        default: return;
      }
    };
    return <button type="button" className={`input-verify-btn ${verifyStatus[statusKey]==="verified"?"verified":""}`} onClick={handleClick}>
      {verifyStatus[statusKey]==="verified"?"Verified":verifyStatus[statusKey]==="link_generated"?"Link Generated":"Verify"}
    </button>;
  };

  return (
    <div className="customer-page">
      <div className="customer-header">
        <div className="customer-brand"><img src={logo} alt="Vedika"/><span>Dealer Onboarding</span></div>
        <span className="app-no">DLR-APP-2026-0142 · Draft</span>
      </div>

        <div className="customer-layout">
        <form className="customer-form-card" onSubmit={handleSubmit}>
          <section className="form-section">
            <h3>Step 1 · Dealer Location Details</h3>

            <div className="customer-grid">
              <div className="form-group">
                <label>State *</label>
                <select
                  required
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                >
                  <option value="">Select State</option>
                  {states.map((item, index) => {
                    const value = getValue(item, "state");
                    return (
                      <option key={index} value={value}>
                        {value}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>District *</label>
                <select
                  required
                  name="district"
                  disabled={!form.state}
                  value={form.district}
                  onChange={handleChange}
                >
                  <option value="">Select District</option>
                  {districts.map((item, index) => {
                    const value =
                      typeof item === "string"
                        ? item
                        : item.district || item.name || "";

                    if (!value.trim()) return null;

                    return (
                      <option key={index} value={value.trim()}>
                        {value.trim()}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>Branch *</label>
                <select
                  required
                  name="branch"
                  disabled={!form.district}
                  value={form.branch}
                  onChange={handleChange}
                >
                  <option value="">Select Branch</option>
                  {branches.map((item, index) => {
                    const value = getValue(item, "branch");
                    return (
                      <option key={index} value={value}>
                        {value}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>Manufacturer Name *</label>
                <input
                  type="text"
                  readOnly
                  value={selectedManufacturers
                    .map((item) => item.manufacturer_name)
                    .join(", ")}
                  placeholder="Selected Manufacturer"
                  required
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>Step 2 · Firm & Owner Details</h3>

            <div className="customer-grid">
              <div className="form-group">
                <label>Owner Name *</label>
                <input
                  type="text"
                  name="owner_name"
                  value={form.owner_name}
                  onChange={handleChange}
                  placeholder="Enter owner name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Showroom Name as per GST *</label>
                <input
                  type="text"
                  name="showroom_name"
                  value={form.showroom_name}
                  onChange={handleChange}
                  placeholder="Enter Showroom name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Firm Type *</label>
                <select
                  name="firm_type"
                  value={form.firm_type}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Firm Type</option>
                  <option value="Proprietorship">Proprietorship</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Private Limited">Private Limited</option>
                  <option value="LLP">LLP</option>
                </select>
              </div>

              <div className="form-group">
                <label>Year Of Business *</label>
                <input
                  type="text"
                  name="year_of_business"
                  value={form.year_of_business}
                  onChange={handleChange}
                  placeholder="Enter year of business"
                  required
                />
              </div>

              <div className="form-group">
                <label>Firm PAN</label>
                <div className="verify-input-row">
                  <input
                    type="text"
                    name="firm_pan"
                    value={form.firm_pan}
                    onChange={handleChange}
                    placeholder="Enter firm PAN"
                  />
                  <button
                      type="button"
                      className={`input-verify-btn ${
                        verifyStatus.firm_pan_verify_status === "verified" ? "verified" : ""
                      }`}
                      onClick={() => verifyField("pan", form.firm_pan)}
                      disabled={loadingField === "pan"}
                    >
                      {loadingField === "pan"
                        ? "Verifying..."
                        : verifyStatus.firm_pan_verify_status === "verified"
                          ? "Verified"
                          : "Verify"}
                    </button>
                </div>
              </div>

              <div className="form-group">
                <label>GST Number *</label>
                <div className="verify-input-row">
                  <input
                    type="text"
                    name="gst_number"
                    value={form.gst_number}
                    onChange={handleChange}
                    placeholder="Enter GST number"
                    required
                  />
                 
                    <InputVerifyButton
                      statusKey="gstin_verify_status"
                      onClick={() => verifyField("gst")}
                      loading={loadingField === "gst"}
                    />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Showroom Address *</label>
                <textarea
                  name="showroom_address"
                  value={form.showroom_address}
                  onChange={handleChange}
                  placeholder="Enter full showroom address"
                  required
                />
              </div>

              <div className="form-group">
                <label>Owner Aadhar No *</label>
                <div className="verify-input-row">
                  <input
                    type="text"
                    name="owner_aadhaar"
                    maxLength="12"
                    value={form.owner_aadhaar}
                    onChange={handleChange}
                    placeholder="Enter owner Aadhar number"
                    required
                  />
                  <InputVerifyButton
                      statusKey="aadhaar_ekyc_status"
                      onClick={() => verifyField("aadhaar")}
                      loading={loadingField === "aadhaar"}
                    />
                </div>
              </div>

              <div className="form-group">
                <label>Owner PAN Number *</label>
                <div className="verify-input-row">
                  <input
                    type="text"
                    name="owner_pan"
                    id="owner-pan-input"
                    value={form.owner_pan}
                    onChange={handleChange}
                    placeholder="Enter owner PAN number"
                    required
                  />
                  <button
                        type="button"
                        className={`input-verify-btn ${
                          verifyStatus.owner_pan_verify_status === "verified" ? "verified" : ""
                        }`}
                        onClick={() => verifyField("pan", form.owner_pan)}
                        disabled={loadingField === "pan"}
                      >
                        {loadingField === "pan"
                          ? "Verifying..."
                          : verifyStatus.owner_pan_verify_status === "verified"
                            ? "Verified"
                            : "Verify"}
                      </button>
                </div>
              </div>

              <div className="form-group">
                  <label>Owner Contact Number *</label>

                  <div className="verify-input-row">
                    <input
                      type="tel"
                      name="owner_contact"
                      value={form.owner_contact}
                      onChange={handleChange}
                      placeholder="Enter Mobile Number"
                      maxLength="10"
                      required
                    />

                    {verifyStatus.mobile_otp_verified !== "verified" && (
                      <button
                        type="button"
                        className="input-verify-btn"
                        onClick={() => {
                          if (form.owner_contact.length !== 10) {
                            alert("Enter valid mobile number");
                            return;
                          }

                          // Call OTP API Here
                          setOtpSent(true);
                          alert("OTP Sent Successfully");
                        }}
                      >
                        Send OTP
                      </button>
                    )}

                    {verifyStatus.mobile_otp_verified === "verified" && (
                      <button
                        type="button"
                        className="input-verify-btn verified"
                      >
                        Verified
                      </button>
                    )}
                  </div>

                  {otpSent &&
                    verifyStatus.mobile_otp_verified !== "verified" && (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginTop: "10px",
                        }}
                      >
                        <input
                          type="text"
                          value={mobileOtp}
                          onChange={(e) => setMobileOtp(e.target.value)}
                          placeholder="Enter OTP"
                          maxLength="6"
                        />

                        <button
                          type="button"
                          className="input-verify-btn"
                          onClick={() => {
                            // Verify OTP API Call Here

                            if (mobileOtp === "123456") {
                              setVerifyStatus((prev) => ({
                                ...prev,
                                mobile_otp_verified: "verified",
                              }));
                            } else {
                              alert("Invalid OTP");
                            }
                          }}
                        >
                          Verify OTP
                        </button>
                      </div>
                    )}
                </div>

              <div className="form-group">
                <label>Email ID of Owner *</label>
                <input
                  type="email"
                  name="owner_email"
                  value={form.owner_email}
                  onChange={handleChange}
                  placeholder="Enter email ID"
                  required
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="section-top">
              <div>
                <h3>Step 3 · Document Upload Checklist</h3>
                <p className="upload-note">
                  PDF / JPG / PNG · Max 5 MB per file · All marked ● are
                  mandatory.
                </p>
              </div>

              <span className="upload-count">0 of 11 uploaded</span>
            </div>

            <div className="document-checklist">
              <label className="upload-card success-card">
                <div>
                  <h4>● Trade Certificate *</h4>
                  <p>Trade certificate / dealership proof</p>
                </div>
                <input type="file" required />
              </label>

              <label className="upload-card success-card">
                <div>
                  <h4>● GST Registration *</h4>
                  <p>Upload GST certificate</p>
                </div>
                <input type="file" required />
              </label>

              <label className="upload-card success-card">
                <div>
                  <h4>● Firm PAN Card</h4>
                  <p>PAN card of proprietor / owner</p>
                </div>
                <input type="file" required />
              </label>

              <label className="upload-card success-card">
                <div>
                  <h4>● Latest OEM Invoice *</h4>
                  <p>Latest manufacturer invoice copy</p>
                </div>
                <input type="file" required />
              </label>

              <label className="upload-card success-card">
                <div>
                  <h4>● Owner Aadhaar Card *</h4>
                  <p>Aadhaar front & back side</p>
                </div>
                <input type="file" required />
              </label>

              <label className="upload-card success-card">
                <div>
                  <h4>● Owner PAN Card *</h4>
                  <p>PAN card of proprietor / owner</p>
                </div>
                <input type="file" required />
              </label>

              <label className="upload-card">
                <div>
                  <h4>● Letter of Intent</h4>
                  <p>Per empanelled manufacturer</p>
                </div>
                <input type="file" />
              </label>

              <label className="upload-card">
                <div>
                  <h4>● Cancelled Cheque *</h4>
                  <p>Used for penny-drop verification</p>
                </div>
                <input type="file" required />
              </label>

              <label className="upload-card warning-card">
                <div>
                  <h4>● GSTR-9</h4>
                  <p>Used for turnover verification</p>
                </div>
                <input type="file" />
              </label>

              <label className="upload-card">
                <div>
                  <h4>● Showroom Front Photo *</h4>
                  <p>Geo-tag enabled showroom image</p>
                </div>
                <input type="file" required />
              </label>

              <label className="upload-card">
                <div>
                  <h4>Service Centre Photo</h4>
                  <p>Optional · Adds additional verification</p>
                </div>
                <input type="file" />
              </label>

              <div className="upload-card">
                <div>
                  <h4>● Live Selfie From Showroom *</h4>
                  <p>Take live selfie for identity verification</p>
                </div>

                {!cameraOpen && !capturedImage && (
                  <button
                    type="button"
                    className="camera-btn"
                    onClick={openCamera}
                  >
                    Open Camera
                  </button>
                )}

                {cameraOpen && (
                  <div className="camera-box">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="camera-video"
                    />

                    <button
                      type="button"
                      className="capture-btn"
                      onClick={capturePhoto}
                      disabled={!cameraReady}
                    >
                      {cameraReady ? "Capture Selfie" : "Camera Loading..."}
                    </button>
                  </div>
                )}

                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="captured-image"
                  />
                )}

                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>Step 4 · Bank Verification</h3>

            <div className="customer-grid">
              <div className="form-group">
                <label>Dealer Bank Account Number *</label>
                <input
                  type="text"
                  name="bank_account"
                  value={form.bank_account}
                  onChange={handleChange}
                  placeholder="Enter account number"
                  required
                />
              </div>

              <div className="form-group">
                <label>IFSC Code *</label>
                <input
                  type="text"
                  name="ifsc_code"
                  value={form.ifsc_code}
                  onChange={handleChange}
                  placeholder="Enter IFSC code"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Bank Name *</label>
                <input
                  type="text"
                  name="bank_name"
                  value={form.bank_name}
                  onChange={handleChange}
                  placeholder="Enter bank name"
                  required
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h3>Step 5 · Declaration & Consent</h3>

            <label className="check-line">
              <input type="checkbox" required />
              I confirm all uploaded documents are genuine, current and belong to
              the applicant firm.
            </label>

            <label className="check-line">
              <input type="checkbox" required />
              I authorize Vedika to verify KYC, conduct CIBIL commercial bureau
              pull and perform penny-drop on the bank account.
            </label>

            <label className="check-line">
              <input type="checkbox" required />I agree to source only the
              manufacturer and models for which I have valid empanelment with
              Vedika.
            </label>

            <label className="check-line">
              <input type="checkbox" required />I consent to Vedika dealer code
              of conduct, data privacy terms and field re-verification at any
              time.
            </label>
          </section>

          <div className="form-actions">
            <button type="button" className="save-exit-btn">
              Save & Exit
            </button>

            <button type="button" className="save-draft-btn">
              Save Draft
            </button>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>

        <aside className="progress-card">
          <h3>APPLICATION PROGRESS</h3>

          <ul>
            <li>
              <span className="green"></span> Dealer details
            </li>
            <li>
              <span className="amber"></span> Documents upload
            </li>
            <li>
              <span className="amber"></span> Bank verification
            </li>
            <li>
              <span className="gray"></span> Declaration
            </li>
            <li>
              <span className="gray"></span> Final approval
            </li>
          </ul>

          <div className="progress-bar">
            <div style={{ width: "52%" }}></div>
          </div>

          <div className="auto-verif-card">
            <div className="auto-verif-header">
              <div>
                <h3>Auto-Verifications</h3>
                <p>Live verification status</p>
              </div>
              <span className="live-badge">● LIVE</span>
            </div>

            <div className="auto-verif-list">
             <InputVerifyButton label="Firm PAN" statusKey="firm_pan_verify_status" />
              <InputVerifyButton label="Owner PAN" statusKey="owner_pan_verify_status" />
              <InputVerifyButton label="GSTIN" statusKey="gstin_verify_status" />
              <InputVerifyButton label="Aadhaar EKYC" statusKey="aadhaar_ekyc_status" />
              <InputVerifyButton label="Mobile OTP" statusKey="mobile_otp_verified" />
              <InputVerifyButton label="Bank Penny-drop" statusKey="bank_penny_drop_verified" />

              <div className="verif-item">
                <span className="verif-name">CIBIL Commercial</span>
                <span className="verif-status submit">On Submit</span>
              </div>

              <div className="verif-item">
                <span className="verif-name">Blacklist Scrub</span>
                <span className="verif-status submit">On Submit</span>
              </div>
            </div>
          </div>

          <p className="progress-percent">Completion 52%</p>

          <div className="routing-box">
            <h4>Predicted Routing</h4>
            <p>Maker - Checker</p>
            <p>
              If PAN, GST, bank details and documents are verified, dealer
              application will move for approval. Otherwise manual review needed.
            </p>
          </div>
        </aside>
      </div>

      {success && <div className="success-overlay"><div className="success-popup">
        <div className="success-icon">✓</div>
        <h3>Application Received</h3>
        <p>Your dealer onboarding form has been successfully received. Please wait, your application is under processing.</p>
        <button className="success-btn" onClick={()=>setSuccess(false)}>OK</button>
      </div></div>}
    </div>
  );
};

export default DealerOnboardingForm;