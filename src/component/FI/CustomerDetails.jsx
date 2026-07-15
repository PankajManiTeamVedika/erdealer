import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../assets/css/DealerDetails.css";
import logo from "../../assets/image/logowhite.png";
import { API, GOOGLE_MAPS_API_KEY } from "../api/apiRoutes";

const baseURL = "https://vfpl.teamvedika.com/dealer-api";

// ---- Field Investigation enum/code mappings (merged in from FieldInvestigation.jsx) ----
// ASSUMPTION: confirm these numeric codes against the actual backend enum.
const ACCOMMODATION_TYPE_MAP = {
  "Owned": 1,
  "Rented": 2,
  "Relative": 3,
  "Company Provided": 4,
  "Government Quarter": 5,
};

const CONSTRUCTION_TYPE_MAP = {
  "Pucca House": 1,
  "Semi-Pucca House": 2,
  "Kutcha-cum-Pucca / Mixed House": 3,
  "Kachha House": 4,
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

// Great-circle distance between two lat/long points, in km.
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const CustomerDetails = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Document image preview popup (PDFs still open in a new tab)
  const [previewImage, setPreviewImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // ---- Field Investigation state (merged in from FieldInvestigation.jsx) ----
  // Residence & Household
  const [houseType, setHouseType] = useState("Owned");
  const [houseConstructionType, setHouseConstructionType] = useState("Pucca House");
  const [addressDuration, setAddressDuration] = useState("> 3 years");
  const [familyMembers, setFamilyMembers] = useState(4);
  const [dependents, setDependents] = useState(2);
  const [totalEarning, setTotalEarning] = useState("₹10k–15k");
  const [smartphoneAvailable, setSmartphoneAvailable] = useState("Yes");

  // Income & Earners
  const [hasOtherEarner, setHasOtherEarner] = useState("Yes");
  const [otherEarnerOccupation, setOtherEarnerOccupation] = useState("Fixed / semi-fixed job");
  const [otherEarnerIncomeType, setOtherEarnerIncomeType] = useState("Regular Income Source");
  const [otherEarnerIncome, setOtherEarnerIncome] = useState("₹5k–15k");

  // E-rickshaw operating viability
  const [drivingStatus, setDrivingStatus] = useState("Will drive full-time");
  const [priorExperience, setPriorExperience] = useState("Yes, relevant experience");
  const [plannedRoute, setPlannedRoute] = useState("Specific, commercially viable");
  const [expectedRunning, setExpectedRunning] = useState("> 80 km/day");
  const [erExistYn, setErExistYn] = useState("No");
  const [pointA, setPointA] = useState("");
  const [pointB, setPointB] = useState("");
  const [expectedDailyEarning, setExpectedDailyEarning] = useState("");
  const [loanAmount, setLoanAmount] = useState("");

  // Fields required by /fi/save with no natural home elsewhere
  const [personMet, setPersonMet] = useState("Applicant");
  // ASSUMPTION: numeric code, confirm exact enum values with backend.
  const [relationId, setRelationId] = useState("1");
  const [residenceAddress, setResidenceAddress] = useState("");
  const [applicantContact, setApplicantContact] = useState("");
  const [modelName, setModelName] = useState(localStorage.getItem("model") || "");
  const [erTotalPrice, setErTotalPrice] = useState("");
  // Distance from branch is auto-calculated (Haversine) from the branch's lat/long
  // (fetched from BRANCH_LAT_LNG_API by branch name) vs the PD's captured GPS point.
  const [branchLatitude, setBranchLatitude] = useState(null);
  const [branchLongitude, setBranchLongitude] = useState(null);
  const [branchLocationLoading, setBranchLocationLoading] = useState(false);
  const [branchLocationError, setBranchLocationError] = useState("");
  // Distance from PD to customer is auto-calculated (Haversine) from the residence
  // address geocoded via Google Maps vs the PD's captured GPS point.
  const [customerLatitude, setCustomerLatitude] = useState(null);
  const [customerLongitude, setCustomerLongitude] = useState(null);
  const [customerLocationLoading, setCustomerLocationLoading] = useState(false);
  const [customerLocationError, setCustomerLocationError] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressFetchError, setAddressFetchError] = useState("");
  // ASSUMPTION: numeric code, confirm exact enum values with backend.
  const [makeHouse, setMakeHouse] = useState("3");
  const [smartphoneMobNo, setSmartphoneMobNo] = useState("");
  const [transcriptionFile, setTranscriptionFile] = useState(null);

  // Think360 Live Video PD — live camera + recording + geo capture
  const [isLiveVideoPD, setIsLiveVideoPD] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [pdLatitude, setPdLatitude] = useState(null);
  const [pdLongitude, setPdLongitude] = useState(null);
  const [locationError, setLocationError] = useState("");
  const pdVideoRef = useRef(null);
  const pdStreamRef = useRef(null);
  const pdRecorderRef = useRef(null);
  const pdChunksRef = useRef([]);

  // FI section accordion — Video PD opens first so it's caught immediately
  const [activeFiSection, setActiveFiSection] = useState("video");

  useEffect(() => {
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
        console.error("Customer fetch error:", err);
        alert("Failed to fetch customer details");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [customerId]);

  // Prefill the FI fields that already exist on the customer record once it loads.
  useEffect(() => {
    if (customer) {
      setApplicantContact(customer.applicant_mobile || "");
      setModelName(customer.model || localStorage.getItem("model") || "");
      // No manual re-entry field for this anymore — reuse the price already on the application.
      setErTotalPrice(customer.on_road_price || customer.ex_showroom_price || "");
      setLoanAmount(customer.loan_amount || "");

      // customer.house_type comes back lowercase (e.g. "rented"); match it
      // case-insensitively against the dropdown's option labels.
      const matchedHouseType = Object.keys(ACCOMMODATION_TYPE_MAP).find(
        (option) => option.toLowerCase() === (customer.house_type || "").toLowerCase()
      );
      if (matchedHouseType) setHouseType(matchedHouseType);
    }
  }, [customer]);

  // Auto-fetch the branch's lat/long by name so "Distance from branch" can be
  // computed automatically against the PD's captured GPS point.
  useEffect(() => {
    const branchName = customer?.dealer_branch || customer?.branch_name;
    if (!branchName) return;

    const fetchBranchLatLng = async () => {
      setBranchLocationLoading(true);
      setBranchLocationError("");
      try {
        const res = await fetch(`${API.BRANCH_LAT_LNG_API}?branch_name=${encodeURIComponent(branchName)}`);
        const result = await res.json();
        const branch = result?.branches?.[0];
        if (result?.status === "SUCCESS" && branch) {
          setBranchLatitude(branch.latitude);
          setBranchLongitude(branch.longitude);
        } else {
          setBranchLocationError(`Could not find coordinates for branch "${branchName}"`);
        }
      } catch (err) {
        console.error(err);
        setBranchLocationError("Failed to fetch branch coordinates");
      } finally {
        setBranchLocationLoading(false);
      }
    };
    fetchBranchLatLng();
  }, [customer]);

  // Auto-fetch the registered residence address by application_id, so the officer
  // doesn't have to retype what the customer already declared.
  useEffect(() => {
    const applicationId = customer?.application_id;
    if (!applicationId) return;

    // Geocode the resolved address text into real lat/long via Google Maps, so
    // "Distance from PD to customer" compares against the customer's actual
    // declared address instead of a second live device tap.
    const geocodeAddress = async (address) => {
      if (!GOOGLE_MAPS_API_KEY) {
        setCustomerLocationError("Google Maps API key not configured (see GOOGLE_MAPS_API_KEY in apiRoutes.js)");
        return;
      }
      setCustomerLocationLoading(true);
      setCustomerLocationError("");
      try {
        const res = await fetch(
          `${API.GEOCODE_API}?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const result = await res.json();
        const location = result?.results?.[0]?.geometry?.location;
        if (result?.status === "OK" && location) {
          setCustomerLatitude(location.lat);
          setCustomerLongitude(location.lng);
        } else {
          setCustomerLocationError(`Could not geocode address (${result?.status || "no results"})`);
        }
      } catch (err) {
        console.error(err);
        setCustomerLocationError("Failed to geocode customer address");
      } finally {
        setCustomerLocationLoading(false);
      }
    };

    const fetchAddress = async () => {
      setAddressLoading(true);
      setAddressFetchError("");
      try {
        const res = await fetch(`${API.APPLICATION_ADDRESS_API}?application_id=${encodeURIComponent(applicationId)}`);
        const result = await res.json();
        if (result?.status === "SUCCESS") {
          const parts = [result.address1, result.address2, result.landmark].filter(Boolean);
          let fullAddress = parts.join(", ");
          if (result.pin) fullAddress += ` - ${result.pin}`;
          setResidenceAddress(fullAddress);
          geocodeAddress(fullAddress);
        } else {
          setAddressFetchError(`Could not find a registered address for application "${applicationId}"`);
        }
      } catch (err) {
        console.error(err);
        setAddressFetchError("Failed to fetch registered address");
      } finally {
        setAddressLoading(false);
      }
    };
    fetchAddress();
  }, [customer]);

  const getFullUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    return `${baseURL}/${url}`;
  };

  // PDFs open in a new tab; everything else (images) opens in the in-page preview popup.
  const renderDocLink = (url) => {
    if (!url) return <span className="no-docs">Not uploaded</span>;
    const fullUrl = getFullUrl(url);
    if (url.endsWith(".pdf")) {
      return (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="doc-link">
          📄 View PDF
        </a>
      );
    }
    return (
      <button
        type="button"
        className="image-preview-btn"
        onClick={() => {
          setImageLoading(true);
          setPreviewImage(fullUrl);
        }}
      >
        🖼️ View Image
      </button>
    );
  };

  const uploadedCount = [
    customer?.aadhaar_copy_file,
    customer?.pan_copy_file,
    customer?.house_proof_file,
    customer?.applicant_image,
    customer?.co_applicant_image,
    customer?.quotation_image,
  ].filter(Boolean).length;

  // ---- Field Investigation handlers (merged in from FieldInvestigation.jsx) ----
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setTranscriptionFile(file);
    }
  };

  // Translate the raw GeolocationPositionError into an actionable message —
  // the browser's own err.message (e.g. "User denied Geolocation") doesn't tell
  // the officer what to actually do about it.
  const describeGeolocationError = (err) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return "Location permission denied — allow Location for this site (click the padlock in the address bar) and reload, then check your device's location settings are on.";
      case err.POSITION_UNAVAILABLE:
        return "Location unavailable — check that Location Services are turned on for this device.";
      case err.TIMEOUT:
        return "Timed out getting location — try again, ideally near a window or outdoors.";
      default:
        return err.message || "Unable to fetch location";
    }
  };

  // Think360 Live Video PD — capture GPS coordinates for the live session
  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported on this device/browser");
      return;
    }
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPdLatitude(position.coords.latitude);
        setPdLongitude(position.coords.longitude);
      },
      (err) => setLocationError(describeGeolocationError(err)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startLiveVideoPD = async () => {
    try {
      setRecordedVideoUrl(null);
      pdChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      pdStreamRef.current = stream;

      if (pdVideoRef.current) {
        pdVideoRef.current.srcObject = stream;
        pdVideoRef.current.muted = true;
        pdVideoRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) pdChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(pdChunksRef.current, { type: "video/webm" });
        setRecordedVideoUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      pdRecorderRef.current = recorder;

      setIsLiveVideoPD(true);
      captureLocation();
    } catch (err) {
      console.error(err);
      alert("Camera/microphone not available for live Video PD");
    }
  };

  const stopLiveVideoPD = () => {
    pdRecorderRef.current?.stop();
    pdStreamRef.current?.getTracks().forEach((track) => track.stop());
    pdStreamRef.current = null;
    setIsLiveVideoPD(false);
  };

  // Build the /fi/save payload from FI form state
  const buildFiPayload = () => {
    const kycId = parseInt(localStorage.getItem("applicant_kyc_id"), 10) || 1;
    const empId = parseInt(localStorage.getItem("emp_id"), 10) || 1;

    return {
      kyc_id: kycId,
      emp_id: empId,
      cycle: 1,
      pd_no: 1,
      person_met: personMet,
      relation_id: parseInt(relationId, 10) || 1,
      residence_dtl_address: residenceAddress,
      contact_no_of_applicant: applicantContact,
      dist_from_dealer:
        pdLatitude != null && pdLongitude != null && branchLatitude != null && branchLongitude != null
          ? Number(haversineDistanceKm(pdLatitude, pdLongitude, branchLatitude, branchLongitude).toFixed(2))
          : null,
      model_name: modelName,
      er_totat_price: parseInt(erTotalPrice, 10) || 0,
      accomodation_type: ACCOMMODATION_TYPE_MAP[houseType] ?? null,
      house_construction_type: CONSTRUCTION_TYPE_MAP[houseConstructionType] ?? null,
      make_house: parseInt(makeHouse, 10) || null,
      year_of_known: YEAR_KNOWN_MAP[addressDuration] ?? null,
      total_family_member: parseInt(familyMembers, 10) || 0,
      non_earning_member: parseInt(dependents, 10) || 0,
      member1_self_declared_yearly_income:
        APPLICANT_INCOME_SLAB_ANNUAL[totalEarning] ?? 0,
      member1_smartphone_yn: smartphoneAvailable === "Yes" ? 1 : 0,
      member1_smartphone_mob_no: smartphoneAvailable === "Yes" ? smartphoneMobNo : "",
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
      loan_amount: parseInt(loanAmount, 10) || 0,
      interest: 0,
      amount: 0,
      family_loan_obligation_monthly: 0,
      migrant_member: 0,
      pd_latitude: pdLatitude,
      pd_longitude: pdLongitude,
      distance_from_pd_to_customer_km:
        pdLatitude != null && pdLongitude != null && customerLatitude != null && customerLongitude != null
          ? Number(haversineDistanceKm(pdLatitude, pdLongitude, customerLatitude, customerLongitude).toFixed(2))
          : null,
    };
  };

  // Verify & Approve now submits the FI payload directly instead of navigating
  // to the separate /field-investigation page.
  const handleVerify = async () => {
    if (!customer) return;
    setActionLoading(true);
    try {
      const response = await fetch(API.FI_SAVE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(buildFiPayload()),
      });

      const data = await response.json();

      if (!response.ok || data?.status === false) {
        throw new Error(data?.message || `Save failed (HTTP ${response.status})`);
      }

      alert(`FI Completed! Status: ${garData.color} - Score: ${garData.score}%`);
      if (garData.color === "GREEN") {
        navigate("/offer-summary");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong while saving FI details.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOpen = () => {
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    if (!customer) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${baseURL}/public/api/customer/${customer.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: rejectReason })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Customer ${customer.application_id} rejected. Reason: ${rejectReason}`);
        setShowRejectModal(false);
        navigate("/fi-dashboard");
      } else {
        alert(data.message || "Rejection failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading customer details...</div>;
  if (!customer) return <div className="error">Customer not found.</div>;

  const displayStatus = customer.application_status || "SUBMITTED";
  const statusClass = displayStatus.toLowerCase();

  // LIVE GAR Score — derived from the FI form fields actually filled in below,
  // instead of a fixed mock value. Recomputed on every render since it just reads
  // the current form state.
  // ASSUMPTION: point weights/thresholds are a reasonable heuristic, not a confirmed
  // credit/risk rubric — confirm with the risk team before relying on this for real decisions.
  const computeGarScore = () => {
    // Stability: owned housing + longer tenure at the address + pucca construction
    let stabilityPoints = 0;
    if (houseType === "Owned") stabilityPoints += 2;
    else if (houseType === "Relative" || houseType === "Company Provided") stabilityPoints += 1;
    if (addressDuration === "> 3 years") stabilityPoints += 2;
    else if (addressDuration === "1-3 years") stabilityPoints += 1;
    if (houseConstructionType === "Pucca House") stabilityPoints += 1;
    const stabilityRatio = stabilityPoints / 5;

    // Income: household income slab, plus a second earner's slab if present
    const incomeSlabRank = { "₹5k–10k": 1, "₹10k–15k": 2, "₹15k–25k": 3, "₹25k–40k": 4, "₹40k+": 5 };
    const otherIncomeSlabRank = { "₹5k–15k": 1, "₹15k–25k": 2, "₹25k–40k": 3, "₹40k+": 4 };
    let incomePoints = incomeSlabRank[totalEarning] || 0;
    if (hasOtherEarner === "Yes") incomePoints += otherIncomeSlabRank[otherEarnerIncome] || 0;
    const incomeRatio = incomePoints / 9;

    // Viability: commercial intent to actually run the e-rickshaw for income
    let viabilityPoints = 0;
    if (drivingStatus === "Will drive full-time") viabilityPoints += 2;
    else if (drivingStatus === "Will drive part-time") viabilityPoints += 1;
    if (plannedRoute === "Specific, commercially viable") viabilityPoints += 2;
    else if (plannedRoute === "Vague, needs validation") viabilityPoints += 1;
    if (expectedRunning === "> 80 km/day") viabilityPoints += 1;
    const viabilityRatio = viabilityPoints / 5;

    // Experience: prior exposure to running an e-rickshaw
    let experiencePoints = 0;
    if (priorExperience === "Yes, relevant experience") experiencePoints += 2;
    else if (priorExperience === "Some experience") experiencePoints += 1;
    if (erExistYn === "Yes") experiencePoints += 1;
    const experienceRatio = experiencePoints / 3;

    const band = (ratio) => (ratio >= 0.65 ? "Strong" : ratio >= 0.4 ? "Moderate" : "Weak");
    const overall = Math.round(
      ((stabilityRatio + incomeRatio + viabilityRatio + experienceRatio) / 4) * 100
    );

    // Policy rule: rented accommodation is an automatic decline regardless of the
    // composite score — the option stays selectable, it just can't pass.
    const isRented = houseType === "Rented";

    return {
      score: overall,
      color: isRented ? "RED" : overall >= 65 ? "GREEN" : overall >= 40 ? "AMBER" : "RED",
      declineReason: isRented ? "Rented accommodation — not eligible for loan" : null,
      stability: band(stabilityRatio),
      income: band(incomeRatio),
      viability: band(viabilityRatio),
      experience: band(experienceRatio),
    };
  };

  const garData = computeGarScore();

  const distanceFromBranchKm =
    pdLatitude != null && pdLongitude != null && branchLatitude != null && branchLongitude != null
      ? haversineDistanceKm(pdLatitude, pdLongitude, branchLatitude, branchLongitude)
      : null;

  const distanceFromPdToCustomerKm =
    pdLatitude != null && pdLongitude != null && customerLatitude != null && customerLongitude != null
      ? haversineDistanceKm(pdLatitude, pdLongitude, customerLatitude, customerLongitude)
      : null;

  // Predicted Routing — derived from the live GAR score and document completeness,
  // instead of a fixed static message.
  const totalDocs = 6;
  const allDocsUploaded = uploadedCount === totalDocs;
  const predictedRouting = !allDocsUploaded
    ? {
        title: "Awaiting Documents",
        detail: `${uploadedCount} of ${totalDocs} documents uploaded — routing decision pending until all are verified.`,
      }
    : garData.color === "GREEN"
    ? {
        title: "Auto-Approve → Sanction",
        detail: `GAR Score ${garData.score}% (Green). Application will move directly to Sanction Review.`,
      }
    : garData.color === "AMBER"
    ? {
        title: "Manual Credit Review",
        detail: `GAR Score ${garData.score}% (Amber). Requires credit team review before sanction.`,
      }
    : {
        title: "Auto-Decline",
        detail: garData.declineReason
          ? garData.declineReason
          : `GAR Score ${garData.score}% (Red). Application does not meet minimum risk criteria.`,
      };

  return (
    <div className="dealer-details-page customer-details-page">
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
              <h1>Customer Details</h1>
              <p>Application ID: {customer.application_id}</p>
            </div>
          </div>
          <div className="status-badge large">
            Status:{" "}
            <strong className={statusClass}>
              {displayStatus}
            </strong>
          </div>
        </div>
      </div>

      <div className="details-layout">
        {/* LEFT COLUMN – Customer Details */}
        <div className="details-left">
          {/* Applicant Details */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">1</span><h3>Applicant Details</h3></div>
            <div className="info-row"><span className="label">Name:</span><span>{customer.applicant_name || "—"}</span></div>
            <div className="info-row"><span className="label">Mobile:</span><span>{customer.applicant_mobile || "—"}</span></div>
            <div className="info-row"><span className="label">Aadhaar:</span><span>{customer.applicant_aadhaar || "—"}</span></div>
            <div className="info-row"><span className="label">PAN:</span><span>{customer.applicant_pan || "—"}</span></div>
            <div className="info-row"><span className="label">CIBIL Score:</span><span>{customer.applicant_cibil_score || "N/A"}</span></div>
            <div className="info-row"><span className="label">House Type:</span><span>{customer.house_type || "—"}</span></div>
            <div className="info-row"><span className="label">House Ownership:</span><span>{customer.house_ownership_type || "—"}</span></div>
            <div className="info-row"><span className="label">House Proof Type:</span><span>{customer.house_proof_type || "—"}</span></div>
          </div>

          {/* Co-Applicant Details */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">2</span><h3>Co-Applicant Details</h3></div>
            <div className="info-row"><span className="label">Name:</span><span>{customer.co_applicant_name || "—"}</span></div>
            <div className="info-row"><span className="label">Mobile:</span><span>{customer.co_applicant_mobile || "—"}</span></div>
            <div className="info-row"><span className="label">Aadhaar:</span><span>{customer.co_applicant_aadhaar || "—"}</span></div>
            <div className="info-row"><span className="label">PAN:</span><span>{customer.co_applicant_pan || "—"}</span></div>
            <div className="info-row"><span className="label">CIBIL Score:</span><span>{customer.co_applicant_cibil_score || "N/A"}</span></div>
          </div>

          {/* Vehicle & Loan Details */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">3</span><h3>Vehicle & Loan Details</h3></div>
            <div className="info-row"><span className="label">Manufacturer:</span><span>{customer.manufacturer_name || "—"}</span></div>
            <div className="info-row"><span className="label">Model:</span><span>{customer.model || "—"}</span></div>
            <div className="info-row"><span className="label">Battery Capacity:</span><span>{customer.battery_capacity || "—"}</span></div>
            <div className="info-row"><span className="label">Ex-Showroom Price:</span><span>₹{customer.ex_showroom_price || "—"}</span></div>
            <div className="info-row"><span className="label">On-Road Price:</span><span>₹{customer.on_road_price || "—"}</span></div>
            <div className="info-row"><span className="label">On-Board Price:</span><span>{customer.on_board_price ? `₹${customer.on_board_price}` : "—"}</span></div>
            <div className="info-row"><span className="label">Loan Amount:</span><span>₹{customer.loan_amount || "—"}</span></div>
            <div className="info-row"><span className="label">Interest Rate:</span><span>{customer.interest_rate ? `${customer.interest_rate}%` : "—"}</span></div>
            <div className="info-row"><span className="label">EMI Amount:</span><span>{customer.emi_amount ? `₹${customer.emi_amount}` : "—"}</span></div>
            <div className="info-row"><span className="label">Tenure:</span><span>{customer.tenure || "—"} months</span></div>
            <div className="info-row"><span className="label">Processing Fee:</span><span>₹{customer.processing_fee || "—"}</span></div>
            <div className="info-row"><span className="label">Dealer Subvention:</span><span>₹{customer.dealer_subvention || "—"}</span></div>
            <div className="info-row"><span className="label">Down Payment:</span><span>{customer.down_payment ? `₹${customer.down_payment}` : "—"}</span></div>
            <div className="info-row"><span className="label">Customer Down Payment:</span><span>₹{customer.customer_down_payment || "—"}</span></div>
            <div className="info-row"><span className="label">Total Down Payment:</span><span>₹{customer.total_down_payment || "—"}</span></div>
            <div className="info-row"><span className="label">LTV Ratio:</span><span>{customer.ltv_ratio || "—"}%</span></div>
          </div>

          {/* Bank Details */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">4</span><h3>Bank Details</h3></div>
            <div className="info-row"><span className="label">Account Number:</span><span>{customer.bank_account_number || "—"}</span></div>
            <div className="info-row"><span className="label">IFSC Code:</span><span>{customer.ifsc_code || "—"}</span></div>
            <div className="info-row"><span className="label">Bank Name:</span><span>{customer.bank_name || "—"}</span></div>
          </div>

          {/* Reference Details */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">5</span><h3>Reference Details</h3></div>
            <div className="info-row"><span className="label">Ref 1 Name:</span><span>{customer.ref1_name || "—"}</span></div>
            <div className="info-row"><span className="label">Relationship:</span><span>{customer.ref1_relationship || "—"}</span></div>
            <div className="info-row"><span className="label">Mobile:</span><span>{customer.ref1_mobile || "—"}</span></div>
            <div className="info-row"><span className="label">Ref 2 Name:</span><span>{customer.ref2_name || "—"}</span></div>
            <div className="info-row"><span className="label">Relationship:</span><span>{customer.ref2_relationship || "—"}</span></div>
            <div className="info-row"><span className="label">Mobile:</span><span>{customer.ref2_mobile || "—"}</span></div>
          </div>

          {/* Dealer & Sourcing Details */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">6</span><h3>Dealer & Sourcing Details</h3></div>
            <div className="info-row"><span className="label">Dealer Name:</span><span>{customer.dealer_name || "—"}</span></div>
            <div className="info-row"><span className="label">Dealer Code:</span><span>{customer.dealer_code || "—"}</span></div>
            <div className="info-row"><span className="label">Branch Name:</span><span>{customer.dealer_branch || customer.branch_name || "—"}</span></div>
            <div className="info-row"><span className="label">Employee ID:</span><span>{customer.employee_id || "—"}</span></div>
            <div className="info-row"><span className="label">Sales Executive:</span><span>{customer.sales_executive_name || "—"}</span></div>
          </div>

          {/* Documents */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">7</span><h3>Uploaded Documents</h3></div>
            <div className="doc-list">
              <div className="doc-item">
                <span>Aadhaar Copy:</span>
                {renderDocLink(customer.aadhaar_copy_file)}
              </div>
              <div className="doc-item">
                <span>PAN Copy:</span>
                {renderDocLink(customer.pan_copy_file)}
              </div>
              <div className="doc-item">
                <span>House Proof:</span>
                {renderDocLink(customer.house_proof_file)}
              </div>
              <div className="doc-item">
                <span>Applicant Image:</span>
                {renderDocLink(customer.applicant_image)}
              </div>
              <div className="doc-item">
                <span>Co-Applicant Image:</span>
                {renderDocLink(customer.co_applicant_image)}
              </div>
              <div className="doc-item">
                <span>Quotation:</span>
                {renderDocLink(customer.quotation_image)}
              </div>
            </div>
          </div>

          {/* Application Meta */}
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">8</span><h3>Application Meta</h3></div>
            <div className="info-row"><span className="label">Stage:</span><span>{customer.stage ?? "—"}</span></div>
            <div className="info-row"><span className="label">Consent Accepted:</span><span>{customer.consent_accepted ? "Yes" : "No"}</span></div>
            <div className="info-row"><span className="label">Consent Date/Time:</span><span>{customer.consent_datetime || "—"}</span></div>
            <div className="info-row"><span className="label">Created At:</span><span>{customer.created_at || "—"}</span></div>
            <div className="info-row"><span className="label">Updated At:</span><span>{customer.updated_at || "—"}</span></div>
            <div className="info-row"><span className="label">Remarks:</span><span>{customer.remarks || "—"}</span></div>
          </div>

          {/* Application Progress */}
          <div className="progress-card">
            <h3>APPLICATION PROGRESS</h3>
            <ul>
              <li><span className="green"></span> Applicant Details</li>
              <li><span className={customer.co_applicant_name ? "green" : "gray"}></span> Co-Applicant</li>
              <li><span className={uploadedCount > 0 ? "green" : "amber"}></span> Documents Uploaded</li>
              <li><span className={customer.bank_account_number ? "green" : "gray"}></span> Bank Details</li>
              <li><span className="green"></span> References</li>
              <li><span className={customer.application_status === "SUBMITTED" ? "green" : "gray"}></span> Final Submission</li>
            </ul>
            <div className="progress-bar"><div style={{ width: "70%" }}></div></div>
            <p className="progress-percent">Completion 70%</p>
          </div>

          {/* Predicted Routing — dynamic, based on GAR score + document completeness */}
          <div className="routing-box">
            <h4>Predicted Routing</h4>
            <p>{predictedRouting.title}</p>
            <p>{predictedRouting.detail}</p>
          </div>
        </div>

        {/* RIGHT COLUMN – Field Investigation */}
        <div className="details-right">
          {/* Think360 Live Video PD — kept first so it's caught immediately */}
          <div className="collapse-card">
            <div
              className="collapse-header"
              onClick={() => setActiveFiSection(activeFiSection === "video" ? "" : "video")}
            >
              <div className="header-left">
                <span className="collapse-icon">{activeFiSection === "video" ? "▼" : "▶"}</span>
                <h3> Video PD & transcription</h3>
              </div>
            </div>

            {activeFiSection === "video" && (
              <div className="collapse-body">
                <div className="form-group">
                  <label>Live Video PD</label>

                  <div className="pd-video-preview">
                    <video
                      ref={pdVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ display: isLiveVideoPD ? "block" : "none" }}
                    />
                    {!isLiveVideoPD && recordedVideoUrl && (
                      <video src={recordedVideoUrl} controls />
                    )}
                    {!isLiveVideoPD && !recordedVideoUrl && (
                      <div className="pd-video-placeholder">No live session recorded yet</div>
                    )}
                  </div>

                  <div className="input-group">
                    {!isLiveVideoPD ? (
                      <button type="button" className="btn-primary" onClick={startLiveVideoPD}>
                        ● Start Live Video PD
                      </button>
                    ) : (
                      <button type="button" className="btn-primary pd-stop-btn" onClick={stopLiveVideoPD}>
                        ■ Stop & Save
                      </button>
                    )}
                  </div>

                  <div className="pd-location-readout">
                    {pdLatitude != null && pdLongitude != null ? (
                      <span>📍 Lat: {pdLatitude.toFixed(6)}, Long: {pdLongitude.toFixed(6)}</span>
                    ) : (
                      <span className="pd-location-pending">Location not captured yet</span>
                    )}
                    {locationError && <span className="pd-location-error"> — {locationError}</span>}
                  </div>
                  <small className="field-note">Geo-tagged at the moment the live session starts</small>
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

          {/* Residence & Household — Field Investigation */}
          <div className="collapse-card">
            <div
              className="collapse-header"
              onClick={() => setActiveFiSection(activeFiSection === "residence" ? "" : "residence")}
            >
              <div className="header-left">
                <span className="collapse-icon">{activeFiSection === "residence" ? "▼" : "▶"}</span>
                <h3>Residence & household</h3>
              </div>
            </div>

            {activeFiSection === "residence" && (
              <div className="collapse-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Type of house / living</label>
                    <select value={houseType} onChange={(e) => setHouseType(e.target.value)} className="form-select">
                      <option>Owned</option>
                      <option>Rented</option>
                      <option>Relative</option>
                      <option>Company Provided</option>
                      <option>Government Quarter</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>House Construction Type</label>
                    <select value={houseConstructionType} onChange={(e) => setHouseConstructionType(e.target.value)} className="form-select">
                      <option>Pucca House</option>
                      <option>Semi-Pucca House</option>
                      <option>Kutcha-cum-Pucca / Mixed House</option>
                      <option>Kachha House</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>At this address since</label>
                    <select value={addressDuration} onChange={(e) => setAddressDuration(e.target.value)} className="form-select">
                      <option>&gt; 3 years</option>
                      <option>1-3 years</option>
                      <option>&lt; 1 year</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Person met</label>
                    <select value={personMet} onChange={(e) => setPersonMet(e.target.value)} className="form-select">
                      <option>Applicant</option>
                      <option>Spouse</option>
                      <option>Other Family Member</option>
                      <option>Neighbour</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Relation with applicant</label>
                    <select value={relationId} onChange={(e) => setRelationId(e.target.value)} className="form-select">
                      <option value="1">Self</option>
                      <option value="2">Wife</option>
                      <option value="3">Mother</option>
                      <option value="4">Father</option>
                      <option value="5">Brother</option>
                      <option value="6">Son</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Residence address</label>
                    <textarea
                      value={residenceAddress}
                      onChange={(e) => setResidenceAddress(e.target.value)}
                      className="form-input"
                      placeholder="Enter full residence address as verified"
                    />
                    {addressLoading && <small className="field-note">Fetching registered address…</small>}
                    {addressFetchError && <small className="field-note field-warning">{addressFetchError}</small>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Applicant contact number</label>
                    <input
                      type="tel"
                      maxLength="10"
                      value={applicantContact}
                      onChange={(e) => setApplicantContact(e.target.value.replace(/\D/g, ""))}
                      className="form-input"
                      placeholder="10-digit mobile number"
                    />
                  </div>

                  <div className="form-group">
                    <label>Distance from branch (km)</label>
                    {branchLocationLoading && (
                      <small className="field-note">Fetching branch location…</small>
                    )}
                    {!branchLocationLoading && distanceFromBranchKm != null && (
                      <p className="pd-location-readout">
                        {distanceFromBranchKm.toFixed(2)} km from PD location
                        {distanceFromBranchKm > 25 && (
                          <span className="field-warning"> — Exceeds 25 km limit, flag for review</span>
                        )}
                      </p>
                    )}
                    {!branchLocationLoading && distanceFromBranchKm == null && !branchLocationError && (
                      <small className="field-note">
                        {pdLatitude == null
                          ? "Start Live Video PD first to capture the PD point"
                          : "Branch location not available yet"}
                      </small>
                    )}
                    {branchLocationError && <small className="field-note field-warning">{branchLocationError}</small>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Distance from PD to customer (km)</label>
                    {customerLocationLoading && (
                      <small className="field-note">Geocoding customer address…</small>
                    )}
                    {!customerLocationLoading && distanceFromPdToCustomerKm != null && (
                      <p className="pd-location-readout">
                        {distanceFromPdToCustomerKm.toFixed(2)} km from PD location
                        {distanceFromPdToCustomerKm > 1 && (
                          <span className="field-warning"> — Exceeds 1 km limit, flag for review</span>
                        )}
                      </p>
                    )}
                    {!customerLocationLoading && distanceFromPdToCustomerKm == null && !customerLocationError && (
                      <small className="field-note">
                        {pdLatitude == null
                          ? "Start Live Video PD first to capture the PD point"
                          : "Customer address location not available yet"}
                      </small>
                    )}
                    {customerLocationError && <small className="field-note field-warning">{customerLocationError}</small>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Family members</label>
                    <input type="number" value={familyMembers} onChange={(e) => setFamilyMembers(e.target.value)} className="form-input" />
                  </div>

                  <div className="form-group">
                    <label>Dependents</label>
                    <input type="number" value={dependents} onChange={(e) => setDependents(e.target.value)} className="form-input" />
                  </div>

                  <div className="form-group">
                    <label>Make of house (code)</label>
                    <input
                      type="number"
                      value={makeHouse}
                      onChange={(e) => setMakeHouse(e.target.value)}
                      className="form-input"
                      placeholder="e.g. 3 (confirm code with backend)"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total earning (slab)</label>
                    <select value={totalEarning} onChange={(e) => setTotalEarning(e.target.value)} className="form-select">
                      <option>₹5k–10k</option>
                      <option>₹10k–15k</option>
                      <option>₹15k–25k</option>
                      <option>₹25k–40k</option>
                      <option>₹40k+</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Smartphone available</label>
                    <select value={smartphoneAvailable} onChange={(e) => setSmartphoneAvailable(e.target.value)} className="form-select">
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {smartphoneAvailable === "Yes" && (
                    <div className="form-group">
                      <label>Smartphone mobile number</label>
                      <input
                        type="tel"
                        maxLength="10"
                        value={smartphoneMobNo}
                        onChange={(e) => setSmartphoneMobNo(e.target.value.replace(/\D/g, ""))}
                        className="form-input"
                        placeholder="10-digit mobile number"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Income & Earners — Field Investigation */}
          <div className="collapse-card">
            <div
              className="collapse-header"
              onClick={() => setActiveFiSection(activeFiSection === "income" ? "" : "income")}
            >
              <div className="header-left">
                <span className="collapse-icon">{activeFiSection === "income" ? "▼" : "▶"}</span>
                <h3>Income & earners</h3>
              </div>
            </div>

            {activeFiSection === "income" && (
              <div className="collapse-body">
                <div className="form-group">
                  <label>Other earner in family?</label>
                  <select value={hasOtherEarner} onChange={(e) => setHasOtherEarner(e.target.value)} className="form-select">
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {hasOtherEarner === "Yes" && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Occupation of other earner</label>
                        <select value={otherEarnerOccupation} onChange={(e) => setOtherEarnerOccupation(e.target.value)} className="form-select">
                          <option>Fixed / semi-fixed job</option>
                          <option>Self-employed</option>
                          <option>Daily wage</option>
                          <option>Business</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Current Source of Income</label>
                        <select value={otherEarnerIncomeType} onChange={(e) => setOtherEarnerIncomeType(e.target.value)} className="form-select">
                          <option>Regular Income Source</option>
                          <option>Irregular Income Source</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Total earning from it (slab)</label>
                      <select value={otherEarnerIncome} onChange={(e) => setOtherEarnerIncome(e.target.value)} className="form-select">
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

          {/* E-rickshaw operating viability — Field Investigation */}
          <div className="collapse-card">
            <div
              className="collapse-header"
              onClick={() => setActiveFiSection(activeFiSection === "viability" ? "" : "viability")}
            >
              <div className="header-left">
                <span className="collapse-icon">{activeFiSection === "viability" ? "▼" : "▶"}</span>
                <h3>E-rickshaw operating viability</h3>
              </div>
            </div>

            {activeFiSection === "viability" && (
              <div className="collapse-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Driving status after buy</label>
                    <select value={drivingStatus} onChange={(e) => setDrivingStatus(e.target.value)} className="form-select">
                      <option>Will drive full-time</option>
                      <option>Will drive part-time</option>
                      <option>Will hire driver</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Prior e-rickshaw experience</label>
                    <select value={priorExperience} onChange={(e) => setPriorExperience(e.target.value)} className="form-select">
                      <option>Yes, relevant experience</option>
                      <option>Some experience</option>
                      <option>No experience</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Planned route / Expected daily running</label>
                    <select value={plannedRoute} onChange={(e) => setPlannedRoute(e.target.value)} className="form-select">
                      <option>Specific, commercially viable</option>
                      <option>Vague, needs validation</option>
                      <option>Not planned</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Expected daily running</label>
                    <select value={expectedRunning} onChange={(e) => setExpectedRunning(e.target.value)} className="form-select">
                      <option>&gt; 80 km/day</option>
                      <option>50-80 km/day</option>
                      <option>&lt; 50 km/day</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Route Point A</label>
                    <input type="text" value={pointA} onChange={(e) => setPointA(e.target.value)} className="form-input" placeholder="e.g. Sector 10" />
                  </div>
                  <div className="form-group">
                    <label>Route Point B</label>
                    <input type="text" value={pointB} onChange={(e) => setPointB(e.target.value)} className="form-input" placeholder="e.g. Railway Station" />
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
                    <select value={erExistYn} onChange={(e) => setErExistYn(e.target.value)} className="form-select">
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Loan Amount (₹)</label>
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="form-input"
                      placeholder="e.g. 220000"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LIVE GAR Score — Field Investigation */}
          <div className="gar-card">
            <div className="gar-card-header">
              <h3>LIVE GAR SCORE</h3>
              <div className={`gar-score-badge ${garData.color.toLowerCase()}`}>{garData.color}</div>
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

          <div className="fi-note-card">
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

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="back-btn" onClick={() => navigate("/fi-dashboard")}>
              ← Back to Dashboard
            </button>
            <div className="approve-reject">
              <button className="reject-btn" onClick={handleRejectOpen} disabled={actionLoading}>
                Reject
              </button>
              <button
                className="approve-btn"
                onClick={handleVerify}
                disabled={actionLoading || garData.color === "RED"}
                title={garData.color === "RED" ? "Blocked: application is auto-declined (see Predicted Routing)" : undefined}
              >
                {actionLoading ? "Processing..." : "Verify & Approve"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Application</h3>
            <p>Please provide the reason for rejection.</p>
            <textarea
              className="modal-textarea"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows="4"
              placeholder="Enter rejection reason..."
            />
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button className="modal-submit" onClick={handleRejectSubmit} disabled={actionLoading}>
                {actionLoading ? "Submitting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Image Preview Popup */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="modal-content image-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setPreviewImage(null)}>✕</button>
            {imageLoading && <div className="image-loader"></div>}
            <img
              src={previewImage}
              alt="Document preview"
              style={{ display: imageLoading ? "none" : "block" }}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;
