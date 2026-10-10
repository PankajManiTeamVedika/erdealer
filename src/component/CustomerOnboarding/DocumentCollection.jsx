import React, { useState, useRef } from "react";
import "../../assets/css/DocumentCollection.css";
import logo from "../../assets/image/logo.png";
import { useNavigate } from "react-router-dom";
import { API } from "../api/apiRoutes";

const INDIAN_BANKS = [
  "State Bank of India",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Bank of India",
  "Indian Bank",
  "Central Bank of India",
  "Indian Overseas Bank",
  "UCO Bank",
  "Bank of Maharashtra",
  "Punjab & Sind Bank",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "IndusInd Bank",
  "Yes Bank",
  "IDFC FIRST Bank",
  "Federal Bank",
  "South Indian Bank",
  "Karnataka Bank",
  "Karur Vysya Bank",
  "City Union Bank",
  "Tamilnad Mercantile Bank",
  "DCB Bank",
  "RBL Bank",
  "Bandhan Bank",
  "CSB Bank",
  "Dhanlaxmi Bank",
  "Jammu & Kashmir Bank",
  "Nainital Bank",
  "AU Small Finance Bank",
  "Equitas Small Finance Bank",
  "Ujjivan Small Finance Bank",
  "ESAF Small Finance Bank",
  "Suryoday Small Finance Bank",
  "Utkarsh Small Finance Bank",
  "Jana Small Finance Bank",
  "North East Small Finance Bank",
  "Shivalik Small Finance Bank",
  "Unity Small Finance Bank",
  "Airtel Payments Bank",
  "India Post Payments Bank",
  "Paytm Payments Bank",
  "Fino Payments Bank",
  "Jio Payments Bank",
  "HSBC Bank",
  "Standard Chartered Bank",
  "Citibank",
  "Deutsche Bank",
  "Bank of America",
].sort();

// Normalizes a name for comparison: lowercase, strips punctuation, collapses whitespace.
const normalizeName = (str = "") =>
  str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const REFERENCE_RELATIONS = [
  "Father",
  "Mother",
  "Spouse",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Friend",
  "Relative",
  "Neighbour",
  "Colleague",
  "Employer",
  "Other",
];

const OCCUPATIONS = [
  "Salaried (Government)",
  "Salaried (Private)",
  "Self-Employed",
  "E-Rickshaw Driver",
  "House Wife",
];

// Penny-drop returns the bank's name for the account (often reordered/abbreviated),
// so match on whether every word of the shorter name appears in the longer one
// rather than requiring an exact string match.
const namesMatch = (nameA, nameB) => {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const tokensA = normA.split(" ").filter(Boolean);
  const tokensB = normB.split(" ").filter(Boolean);
  const [shorterTokens, longerTokens] =
    tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];

  return shorterTokens.length > 0 && shorterTokens.every((tok) => longerTokens.includes(tok));
};

// Finds the first pair of matching mobile numbers among applicant, co-applicant,
// and the two references — none of these four should share the same mobile number.
// Only compares full 10-digit numbers so partially-typed input isn't flagged.
const findDuplicateMobile = (contacts) => {
  const entries = contacts.filter((c) => c.value && c.value.replace(/\D/g, "").length === 10);

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (entries[i].value === entries[j].value) {
        return `${entries[i].label} and ${entries[j].label} mobile numbers cannot be the same`;
      }
    }
  }
  return null;
};

const DocumentCollection = () => {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("user");
  const dealerData = storedUser ? JSON.parse(storedUser) : null;
  const dealerId = dealerData ? dealerData.dealer_id : null;
  const customerId = dealerData ? dealerData.user_id : null;
  // Applicant / co-applicant names captured during Stage 1 (ApplicantVerification),
  // used to match against the penny-drop bank account holder name.
  const applicantName = localStorage.getItem("applicant_name") || "";
  const coApplicantName = localStorage.getItem("co_applicant_name") || "";
  // Applicant / co-applicant mobile numbers captured during Stage 1, used to make sure
  // neither reference reuses the applicant's, co-applicant's, or the other reference's mobile.
  const applicantMobile = localStorage.getItem("applicant_mobile") || "";
  const coApplicantMobile = localStorage.getItem("co_applicant_mobile") || "";
  // State for form fields
  const [houseType, setHouseType] = useState("");
  const [proofType, setProofType] = useState("");
  const [occupation, setOccupation] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bank, setBank] = useState("");
  const [showOtherBank, setShowOtherBank] = useState(false);
  const [pennyDropStatus, setPennyDropStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // File upload states
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [houseProofFile, setHouseProofFile] = useState(null);

  // Co-applicant file upload states
  const [coAadhaarFrontFile, setCoAadhaarFrontFile] = useState(null);
  const [coAadhaarBackFile, setCoAadhaarBackFile] = useState(null);
  // Mirrors the PAN/Voter ID choice from ApplicantVerification: "3" = PAN Card, "2" = Voter ID.
  const [coSecondaryIdType, setCoSecondaryIdType] = useState("3");
  const [coPanFile, setCoPanFile] = useState(null);
  const [coVoterFrontFile, setCoVoterFrontFile] = useState(null);
  const [coVoterBackFile, setCoVoterBackFile] = useState(null);
const [pennyDropLoading, setPennyDropLoading] = useState(false); // NEW
const [pennyDropResult, setPennyDropResult] = useState(null);
// Raw penny-drop API response (success or failure), saved as-is with Stage 2 for audit/record.
const [pennyDropApiResponse, setPennyDropApiResponse] = useState(null);
  
  // Reference states
  const [reference1, setReference1] = useState({
    name: "",
    relationship: "",
    mobile: "",
    otpVerified: false,
    otpSent: false,
    otpValue: ""
  });

  const [reference2, setReference2] = useState({
    name: "",
    relationship: "",
    mobile: "",
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
  const [onRoadPrice, setOnRoadPrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [quotationFile, setQuotationFile] = useState(null);
  
  // UI State
  const [activeSection, setActiveSection] = useState("kyc");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Refs for file inputs
  const aadhaarFrontInputRef = useRef(null);
  const aadhaarBackInputRef = useRef(null);
  const panInputRef = useRef(null);
  const houseProofInputRef = useRef(null);
  const quotationInputRef = useRef(null);
  const coAadhaarFrontInputRef = useRef(null);
  const coAadhaarBackInputRef = useRef(null);
  const coPanInputRef = useRef(null);
  const coVoterFrontInputRef = useRef(null);
  const coVoterBackInputRef = useRef(null);
  
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
        case 'aadhaarFront':
          setAadhaarFrontFile(file);
          break;
        case 'aadhaarBack':
          setAadhaarBackFile(file);
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
        case 'coAadhaarFront':
          setCoAadhaarFrontFile(file);
          break;
        case 'coAadhaarBack':
          setCoAadhaarBackFile(file);
          break;
        case 'coPan':
          setCoPanFile(file);
          break;
        case 'coVoterFront':
          setCoVoterFrontFile(file);
          break;
        case 'coVoterBack':
          setCoVoterBackFile(file);
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

  // Switching between PAN/Voter ID clears whichever file(s) were already uploaded
  // for the previous type, so a stale PAN file doesn't get submitted after switching
  // to Voter ID (or vice versa).
  const handleCoSecondaryIdTypeChange = (e) => {
    setCoSecondaryIdType(e.target.value);
    setCoPanFile(null);
    setCoVoterFrontFile(null);
    setCoVoterBackFile(null);
  };

  const handleBankSelect = (e) => {
    const value = e.target.value;
    if (value === "__other__") {
      setShowOtherBank(true);
      setBank("");
    } else {
      setShowOtherBank(false);
      setBank(value);
    }
  };

  const handlePennyDrop = async () => {
    if (!accountNumber || !ifsc) {
      setError("Please enter valid account number and IFSC");
      return;
    }

    setPennyDropLoading(true);
    setError("");

    try {
      const res = await fetch(API.BANK_PENNY_DROP_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber, ifsc }),
      });

      const result = await res.json();
      console.log("Penny-drop response:", result);
      // Saved with Stage 2 regardless of outcome, so a failed/mismatched attempt is
      // still on record for audit.
      setPennyDropApiResponse(result);

      // `success` is unreliable here — a confirmed penny-drop can still come back with
      // success:false, so gate on data.verified instead (same as Dealer Onboarding).
      if (!result.data?.verified) {
        setPennyDropStatus(false);
        setPennyDropResult(null);
        setError(result.message || "Penny-drop verification failed. Please check account details.");
        return;
      }

      const beneficiaryName = result.data.beneficiary_name_with_bank || "";
      const matchedWith = namesMatch(beneficiaryName, applicantName)
        ? "applicant"
        : namesMatch(beneficiaryName, coApplicantName)
        ? "co-applicant"
        : null;

      if (!matchedWith) {
        setPennyDropStatus(false);
        setPennyDropResult({ account_holder_name: beneficiaryName });
        setError(
          `Penny-drop account name "${beneficiaryName}" does not match the applicant or co-applicant name. Please recheck the account details.`
        );
        return;
      }

      setPennyDropStatus(true);
      setPennyDropResult({ account_holder_name: beneficiaryName, matched_with: matchedWith });
      setSuccess(`Penny-drop verification successful! Name matches ${matchedWith}.`);
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

    if (field === 'mobile') {
      const conflict = findDuplicateMobile([
        { label: "Applicant", value: applicantMobile },
        { label: "Co-applicant", value: coApplicantMobile },
        { label: "Reference 1", value: refNum === 1 ? value : reference1.mobile },
        { label: "Reference 2", value: refNum === 2 ? value : reference2.mobile },
      ]);
      setError(conflict || "");
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
  if (!aadhaarFrontFile)     { alert("Please upload Aadhaar front side");     return; }
  if (!aadhaarBackFile)      { alert("Please upload Aadhaar back side");      return; }
  if (!panFile)              { alert("Please upload PAN copy");               return; }
  if (!houseProofFile)       { alert("Please upload House proof");            return; }
  if (!coAadhaarFrontFile)   { alert("Please upload co-applicant Aadhaar front side"); return; }
  if (!coAadhaarBackFile)    { alert("Please upload co-applicant Aadhaar back side");  return; }
  if (coSecondaryIdType === "2") {
    if (!coVoterFrontFile)   { alert("Please upload co-applicant Voter ID front side"); return; }
    if (!coVoterBackFile)    { alert("Please upload co-applicant Voter ID back side");  return; }
  } else {
    if (!coPanFile)          { alert("Please upload co-applicant PAN copy");            return; }
  }
  if (!houseType)            { alert("Please select house type");             return; }
  if (houseType === "owned" && !proofType) { alert("Please select proof type"); return; }
  if (!occupation)           { alert("Please select occupation");             return; }
  if (!applicantImage)       { alert("Please capture applicant live image");  return; }
  if (!applicantLiveness)    { alert("Please complete liveness check");       return; }
  // if (!pennyDropStatus)      { alert("Please complete penny-drop");           return; }
  if (!quotationFile)        { alert("Please upload quotation PDF");          return; }
  // if (!storedApp)            { alert("Application ID missing. Go back to Stage 1."); return; }
  const mobileConflict = findDuplicateMobile([
    { label: "Applicant", value: applicantMobile },
    { label: "Co-applicant", value: coApplicantMobile },
    { label: "Reference 1", value: reference1.mobile },
    { label: "Reference 2", value: reference2.mobile },
  ]);
  if (mobileConflict) { alert(mobileConflict); return; }
  setLoading(true);
  try {
    // Use FormData because we have actual file uploads
    const formData = new FormData();

    // application_id
    formData.append("application_id", storedApp);

    // Actual file uploads
    formData.append("aadhaar_front_file", aadhaarFrontFile);
    formData.append("aadhaar_back_file",  aadhaarBackFile);
    formData.append("pan_copy_file",     panFile);
    formData.append("house_proof_file",  houseProofFile);
    formData.append("quotation_image",   quotationFile);

    // Co-applicant KYC documents
    formData.append("co_applicant_aadhaar_front_file", coAadhaarFrontFile);
    formData.append("co_applicant_aadhaar_back_file",  coAadhaarBackFile);
    formData.append("co_applicant_secondary_id_type",  coSecondaryIdType);
    if (coSecondaryIdType === "2") {
      formData.append("co_applicant_voter_front_file", coVoterFrontFile);
      formData.append("co_applicant_voter_back_file",  coVoterBackFile);
    } else {
      formData.append("co_applicant_pan_file", coPanFile);
    }

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
    formData.append("occupation",           occupation);

    // Bank details
    formData.append("bank_account_number", accountNumber);
    formData.append("ifsc_code",           ifsc);
    formData.append("bank_name",           bank);
    // Raw penny-drop API response (success or failure), for audit/record on the backend.
    formData.append("penny_drop_response", JSON.stringify(pennyDropApiResponse || {}));

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
    if (!aadhaarFrontFile) {
      setError("Please upload Aadhaar front side");
      return;
    }
    if (!aadhaarBackFile) {
      setError("Please upload Aadhaar back side");
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
            <span>Dealer ID</span>
            <strong>{customerId || dealerId || "—"}</strong>
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
                    <strong>Aadhaar front side</strong>
                    <p>Upload front of Aadhaar card</p>
                    <input
                      type="file"
                      ref={aadhaarFrontInputRef}
                      style={{ display: 'none' }}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('aadhaarFront', e)}
                    />
                    <button className="upload-btn" onClick={() => aadhaarFrontInputRef.current.click()}>
                      {aadhaarFrontFile ? "✓ Uploaded" : "Upload →"}
                    </button>
                  </div>
                </div>
                <div className="doc-card">
                  <div className="doc-icon">📄</div>
                  <div className="doc-info">
                    <strong>Aadhaar back side</strong>
                    <p>Upload back of Aadhaar card</p>
                    <input
                      type="file"
                      ref={aadhaarBackInputRef}
                      style={{ display: 'none' }}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('aadhaarBack', e)}
                    />
                    <button className="upload-btn" onClick={() => aadhaarBackInputRef.current.click()}>
                      {aadhaarBackFile ? "✓ Uploaded" : "Upload →"}
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

                <div className="proof-type-section">
                  <label className="section-label">Occupation</label>
                  <select
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select occupation</option>
                    {OCCUPATIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Co-applicant KYC Documents Section */}
        <div className="collapse-card">
          <div
            className="collapse-header"
            onClick={() => setActiveSection(activeSection === "cokyc" ? "" : "cokyc")}
          >
            <div className="header-left">
              <span className="collapse-icon">{activeSection === "cokyc" ? "▼" : "▶"}</span>
              <h3>Co-applicant KYC document</h3>
            </div>
            <div className="status-badge success">
              <span className="checkmark">✓</span> In Progress
            </div>
          </div>

          {activeSection === "cokyc" && (
            <div className="collapse-body">
              <div className="docs-grid">
                <div className="doc-card">
                  <div className="doc-icon">📄</div>
                  <div className="doc-info">
                    <strong>Co-applicant Aadhaar front side</strong>
                    <p>Upload front of Aadhaar card</p>
                    <input
                      type="file"
                      ref={coAadhaarFrontInputRef}
                      style={{ display: 'none' }}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('coAadhaarFront', e)}
                    />
                    <button className="upload-btn" onClick={() => coAadhaarFrontInputRef.current.click()}>
                      {coAadhaarFrontFile ? "✓ Uploaded" : "Upload →"}
                    </button>
                  </div>
                </div>
                <div className="doc-card">
                  <div className="doc-icon">📄</div>
                  <div className="doc-info">
                    <strong>Co-applicant Aadhaar back side</strong>
                    <p>Upload back of Aadhaar card</p>
                    <input
                      type="file"
                      ref={coAadhaarBackInputRef}
                      style={{ display: 'none' }}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload('coAadhaarBack', e)}
                    />
                    <button className="upload-btn" onClick={() => coAadhaarBackInputRef.current.click()}>
                      {coAadhaarBackFile ? "✓ Uploaded" : "Upload →"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="proof-type-section">
                <label className="section-label">Co-applicant secondary ID type</label>
                <select
                  value={coSecondaryIdType}
                  onChange={handleCoSecondaryIdTypeChange}
                  className="form-select"
                >
                  <option value="3">PAN Card</option>
                  <option value="2">Voter ID</option>
                </select>
              </div>

              <div className="docs-grid co-secondary-docs">
                {coSecondaryIdType === "2" ? (
                  <>
                    <div className="doc-card">
                      <div className="doc-icon">🪪</div>
                      <div className="doc-info">
                        <strong>Co-applicant Voter ID front side</strong>
                        <p>Upload front of Voter ID card</p>
                        <input
                          type="file"
                          ref={coVoterFrontInputRef}
                          style={{ display: 'none' }}
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload('coVoterFront', e)}
                        />
                        <button className="upload-btn" onClick={() => coVoterFrontInputRef.current.click()}>
                          {coVoterFrontFile ? "✓ Uploaded" : "Upload →"}
                        </button>
                      </div>
                    </div>
                    <div className="doc-card">
                      <div className="doc-icon">🪪</div>
                      <div className="doc-info">
                        <strong>Co-applicant Voter ID back side</strong>
                        <p>Upload back of Voter ID card</p>
                        <input
                          type="file"
                          ref={coVoterBackInputRef}
                          style={{ display: 'none' }}
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload('coVoterBack', e)}
                        />
                        <button className="upload-btn" onClick={() => coVoterBackInputRef.current.click()}>
                          {coVoterBackFile ? "✓ Uploaded" : "Upload →"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="doc-card">
                    <div className="doc-icon">📋</div>
                    <div className="doc-info">
                      <strong>Co-applicant PAN copy</strong>
                      <p>Upload PAN card</p>
                      <input
                        type="file"
                        ref={coPanInputRef}
                        style={{ display: 'none' }}
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileUpload('coPan', e)}
                      />
                      <button className="upload-btn" onClick={() => coPanInputRef.current.click()}>
                        {coPanFile ? "✓ Uploaded" : "Upload →"}
                      </button>
                    </div>
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
                  <select
                    value={showOtherBank ? "__other__" : bank}
                    onChange={handleBankSelect}
                    className="form-input"
                  >
                    <option value="">Select Bank</option>
                    {INDIAN_BANKS.map((bankName) => (
                      <option key={bankName} value={bankName}>{bankName}</option>
                    ))}
                    <option value="__other__">Other (specify below)</option>
                  </select>

                  {showOtherBank && (
                    <input
                      type="text"
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className="form-input"
                      placeholder="Enter bank name"
                      style={{ marginTop: "8px" }}
                    />
                  )}
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
                          ? `Account name "${pennyDropResult.account_holder_name}" — matches ${pennyDropResult.matched_with === "co-applicant" ? "co-applicant" : "applicant"} name`
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
                    <select
                      value={reference1.relationship}
                      onChange={(e) => handleReferenceChange(1, 'relationship', e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select relationship</option>
                      {REFERENCE_RELATIONS.map((relation) => (
                        <option key={relation} value={relation}>{relation}</option>
                      ))}
                    </select>
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
                    <select
                      value={reference2.relationship}
                      onChange={(e) => handleReferenceChange(2, 'relationship', e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select relationship</option>
                      {REFERENCE_RELATIONS.map((relation) => (
                        <option key={relation} value={relation}>{relation}</option>
                      ))}
                    </select>
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
                  <span>{quotationFile ? quotationFile.name : "No file selected"}</span>
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
                  {/* <div className="price-field">
                    <label>On-road price (₹)</label>
                    <input 
                      type="text" 
                      value={onRoadPrice} 
                      onChange={(e) => handlePriceChange(e.target.value.replace(/,/g, ''))}
                      className="form-input"
                      placeholder="Enter on-road price"
                    />
                  </div> */}
                  {/* <div className="price-field">
                    <label>Down payment (₹)</label>
                    <input 
                      type="text" 
                      value={downPayment} 
                      onChange={(e) => setDownPayment(e.target.value.replace(/,/g, ''))}
                      className="form-input"
                      placeholder="Enter down payment"
                    />
                  </div> */}
                </div>
                
                {/* <div className="validation-note">
                  <span className="check-icon">✓</span>
                  On-road price cross-checked against quotation PDF and Terra Power Plus price band (₹1.78–1.92 L). Within range.
                </div> */}
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