import React, { useEffect, useState } from "react";
import "../../assets/css/ApplicantVerification.css";
import logo from "../../assets/image/logo.png";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { API } from "../api/apiRoutes";




const ApplicantVerification = () => {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("user");
  const dealerData = storedUser ? JSON.parse(storedUser) : null;
  const dealerId = dealerData ? dealerData.dealer_id : null;
  const customerId = dealerData ? dealerData.user_id : null;

   // Debugging alert
  // Main Applicant State
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  
  const [otpSent, setOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [bureauStatus, setBureauStatus] = useState("pending");

  // Co-applicant State
  const [coMobile, setCoMobile] = useState("");
  const [coOtp, setCoOtp] = useState("");
  const [coAadhaar, setCoAadhaar] = useState("");
  const [coPan, setCoPan] = useState("");

  const [coOtpSent, setCoOtpSent] = useState(false);
  const [coMobileVerified, setCoMobileVerified] = useState(false);
  const [coAadhaarVerified, setCoAadhaarVerified] = useState(false);
  const [coPanVerified, setCoPanVerified] = useState(false);
  const [coBureauStatus, setCoBureauStatus] = useState("pending");
  const [applicationId, setApplicationId] = useState(null); // to store application ID after Aadhaar KYC initiation
  const [loadingField, setLoadingField] = useState(null);
  const [applicantName, setApplicantName] = useState("");
  const [coApplicantName, setCoApplicantName] = useState("");

  // Raw third-party responses (Aadhaar/PAN/CB hit, applicant + co-applicant) kept
  // alongside the derived verifyStatus flags so the full response can be submitted
  // with Stage 1 for audit/record.
  const [thirdPartyResponses, setThirdPartyResponses] = useState({});
  const saveThirdPartyResponse = (key, data) =>
    setThirdPartyResponses(prev => ({ ...prev, [key]: data }));


  // Vehicle State
const [manufacturerList, setManufacturerList] = useState([]);
const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [aadhaarTransactionId, setAadhaarTransactionId] = useState(null);
  const [otpSessionId, setOtpSessionId] = useState(null);
  const [aadhaarSessionId, setAadhaarSessionId] = useState(null);
  const [authToken, setAuthToken] = useState(null); // store auth token after OTP verification
  const [leadNo, setLeadNo] = useState(null); // store lead number after PAN verification
  const [coAadhaarSessionId, setCoAadhaarSessionId] = useState(null);

  // UI State
  const [activeSection, setActiveSection] = useState("applicant");
  const [error, setError] = useState("");

  // Verification status for applicant and co-applicant
const [verifyStatus, setVerifyStatus] = useState({
  applicant_pan: "",
  applicant_aadhaar: "",
  applicant_mobile_otp: "",
   applicant_cibil: "",
  applicant_cibil_score: null,
  applicant_cibil_name: "",

  co_mobile_otp: "",
  co_aadhaar: "",
  co_pan: "",
  co_cibil: "verified",
   co_applicant_cibil_score: null,
});

const [form, setForm] = useState({
  manufacturer_name: "",
  model: "",
  applicant_name: "",
  applicant_mobile: "",
  applicant_aadhaar: "",
  applicant_pan: "",
  applicant_cibil_score: null,
  co_applicant_name: "",
  co_applicant_mobile: "",
  co_applicant_aadhaar: "",
  co_applicant_pan: "",
  co_applicant_cibil_score: null,
  consent_accepted: false
});

  const modelsByManufacturer = {
    "Terra Motors": ["Power Plus", "Super Power", "E-Rickshaw Plus"],
    "Mahindra": ["Treo Zor", "Treo Plus", "e-Alfa Mini"],
    "Piaggio": ["Ape E-City", "Ape E-Xtra", "Ape E-FX"]
  };

useEffect(() => {
  if (!dealerId) return;

  const fetchManufacturers = async () => {
    try {
      const res = await fetch(`${API.MANUFACTURERS_DEALER}/${dealerId}`);
      const data = await res.json();

      if (data.status && data.data.length > 0) {
        setManufacturerList(data.data); // full list
        setManufacturer(data.data[0].manufacturer_name); // set first as default
      }
    } catch (err) {
      console.error("Manufacturer API Error:", err);
    }
  };

  fetchManufacturers();
}, [dealerId]);

useEffect(() => {
  if (verifyStatus.co_aadhaar !== "in_process") return;

  const interval = setInterval(() => {
    checkCoAadhaarStatus();   // 🔥 auto hit API
  }, 5000);

  return () => clearInterval(interval);
}, [verifyStatus.co_aadhaar]);

// ------------------- API Verification Function -------------------
const verifyField = async (type, value = "") => {
  let payload = {}, statusKey = "", apiUrl = "";

  try {
    setLoadingField(type); // show loader

    switch(type){
      case "aadhaar":
        statusKey = "applicant_aadhaar";
        apiUrl = `${API.ekycLinkGenerate}`;

        try {
          setLoadingField("aadhaar");

          // STEP 1: INITIATE KYC (FIRST CLICK)
          if (!aadhaarSessionId) {
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json",   "Authorization": `Bearer ${authToken}` },
              body: JSON.stringify({
                mobile: mobile,
                applicantType: "applicant",
                termsAccepted: true,
                loan_type_id:5,
                aadhar_no: aadhaar
              })
            });

            const result = await res.json();
            saveThirdPartyResponse("applicant_aadhaar_initiate_response", result);

            if (result.success) {
              setAadhaarSessionId(result.ekyc_session_id);

              setVerifyStatus(prev => ({
                ...prev,
                [statusKey]: "in_process"
              }));

              window.open(result.digitap_link, "_blank");

              alert("KYC link generated. Complete verification in new tab.");
            } else {
              setVerifyStatus(prev => ({
                ...prev,
                [statusKey]: "failed"
              }));

              alert("Failed to initiate Aadhaar KYC");
            }

            return;
          }

          // STEP 2: CHECK STATUS (SECOND CLICK)
          const res = await fetch(`${API.ekycVerify}`, {
            method: "POST",
            headers: { "Content-Type": "application/json",   "Authorization": `Bearer ${authToken}` },
            body: JSON.stringify({
              mobile: mobile,
              sessionId: aadhaarSessionId,
              eventType: "kyc_completed"
            })
          });

          const result = await res.json();
          saveThirdPartyResponse("applicant_aadhaar_response", result);

          if (result.success) {
            setApplicationId(result.applicationId);
            setVerifyStatus(prev => ({
              ...prev,
              [statusKey]: "verified"
            }));

            alert("Aadhaar KYC completed successfully ✅");
          } else {
            alert("KYC still in progress ⏳");
          }

        } catch (err) {
          console.error(err);
          alert("Aadhaar verification error");
        }
        return; 
        break;

      case "pan": {
      statusKey = "applicant_pan";

      const res = await fetch(`${API.verifyPan}`, {
        method: "POST",
        headers: { "Content-Type": "application/json",   "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({
          applicationId: applicationId,   // 🔥 from Aadhaar step
          pan: pan
        })
      });

      const result = await res.json();
      saveThirdPartyResponse("applicant_pan_response", result);

      // `pan_status` is the authoritative signal for PAN validity. `result.success` also
      // reflects unrelated downstream steps (CB pre-hit, DB insert) bundled into the same
      // response, so a valid PAN can still come back with success:false — don't gate on it.
      if (result.pan_status === "VALID") {

          setVerifyStatus(prev => ({
            ...prev,
            applicant_pan: "verified"
          }));

          // OPTIONAL: store PAN name
          setApplicantName(result?.digio_response?.full_name);
          const leadId = result?.post_pan_processing?.insert?.lead_id;
          setLeadNo(leadId);

          if (result.success) {
            alert("PAN verified successfully ✅");
          } else {
            alert(`PAN verified ✅, but ${result.message || "a background check failed"} — you can continue.`);
          }

        } else {
          setVerifyStatus(prev => ({
            ...prev,
            applicant_pan: "failed"
          }));
           alert(result.message || "PAN verification failed ❌");
        }
        return;
      }

     case "cibil":
        statusKey = "applicant_cibil";

        try {
          setVerifyStatus(prev => ({
            ...prev,
            applicant_cibil: "running"
          }));

          const preRes = await fetch(
            `https://uat.teamvedika.com/processWebCbHits`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                leadNo: leadNo,
                custTypeId: 1
              })
            }
          );

          const preResult = await preRes.json();
          console.log("processWebCbHits response:", preResult);
          saveThirdPartyResponse("applicant_cibil_prehit_response", preResult);

          if (preResult.status !== "accepted") {  // ✅ fixed
            setVerifyStatus(prev => ({
              ...prev,
              applicant_cibil: "failed"
            }));
            alert("CB hit initiation failed ❌");
            break;
          }

          // STEP 2: Now hit checkCbStatusForSweb
          const res = await fetch(
            `https://uat.teamvedika.com/checkCbStatusForSweb?leadNo=${leadNo}&custTypeId=1`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" }
            }
          );

          const result = await res.json();
          console.log("checkCbStatusForSweb response:", result);
          saveThirdPartyResponse("applicant_cibil_response", result);

          if (result?.success === true) {
             if (result?.kyc_id) localStorage.setItem("applicant_kyc_id", result.kyc_id);
          if (result?.lead_no) localStorage.setItem("lead_no", result.lead_no); 
            setVerifyStatus(prev => ({
              ...prev,
              applicant_cibil: result?.cbStatusText || "verified",
              applicant_cibil_score: result?.cb_score || result?.cibilScore || "--",
              applicant_cibil_name: result?.cust_name || "",
              applicant_cibil_hit_status: result?.cbHitStatus  // ✅ save this
            }));
          } else {
            setVerifyStatus(prev => ({
              ...prev,
              applicant_cibil: "failed"
            }));
          }

        } catch (err) {
          console.error(err);
          setVerifyStatus(prev => ({
            ...prev,
            applicant_cibil: "failed"
          }));
        }
        return;
        
        
        case "copan": {
  statusKey = "co_applicant_pan";

  const coRes = await fetch(`${API.coverifyPan}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
    body: JSON.stringify({
      applicationId: applicationId,
      pan: coPan                        // co-applicant PAN field
    })
  });

  const coResult = await coRes.json();
  saveThirdPartyResponse("co_applicant_pan_response", coResult);

  // `pan_status` is the authoritative signal for PAN validity, same as the main
  // applicant's PAN case — `success` also reflects unrelated post-processing
  // (CB pre-hit, VMFI) bundled into the same response.
  if (coResult.pan_status === "VALID") {
    setVerifyStatus(prev => ({
      ...prev,
      co_applicant_pan: "verified"
    }));

    setCoApplicantName(coResult?.digio_response?.full_name);  // co-applicant name setter

    if (coResult.success) {
      alert("Co-applicant PAN verified successfully ✅");
    } else {
      alert(`Co-applicant PAN verified ✅, but ${coResult.message || "a background check failed"} — you can continue.`);
    }

  } else {
    setVerifyStatus(prev => ({
      ...prev,
      co_applicant_pan: "failed"
    }));
    alert(coResult.message || "Co-applicant PAN verification failed ❌");
  }
  return;
  }
  case "coaadhaar":
        statusKey = "co_aadhaar";
        apiUrl = `${API.ekycCoApplicantLinkGenerate}`;

        try {
          setLoadingField("coaadhaar");

          // STEP 1: INITIATE KYC
         if (!coAadhaarSessionId) {

              const res = await fetch(apiUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${authToken}`
                },
                body: JSON.stringify({
                  co_applicant_name: applicantName,
                  relation_with_applicant: "Spouse",
                  aadhar_no: coAadhaar,
                  mobile: mobile,
                  co_app_mobile: coMobile,
                  applicantType: "coApplicant",
                  termsAccepted: true,
                  applicationId: applicationId
                })
              });

              const result = await res.json();
              saveThirdPartyResponse("co_applicant_aadhaar_initiate_response", result);

              if (result.success) {

                setCoAadhaarSessionId(result.ekyc_session_id);

                setVerifyStatus(prev => ({
                  ...prev,
                  co_aadhaar: "in_process"
                }));

                window.open(result.digitap_link, "_blank");

                alert("KYC link generated");

                return; // 🔥 IMPORTANT FIX (STOP HERE)
              }

              setVerifyStatus(prev => ({
                ...prev,
                co_aadhaar: "failed"
              }));

              return; // 🔥 STOP
            }

       
          // const res = await fetch(`${API.coApplicantEkycVerify}`, {
          //   method: "POST",
          //   headers: {
          //     "Content-Type": "application/json",
          //     "Authorization": `Bearer ${authToken}`
          //   },
          //   body: JSON.stringify({
          //     mobile: mobile,  
          //     sessionId: coAadhaarSessionId, 
          //     eventType: "kyc_completed",
          //      applicationId: applicationId
          //   })
          // });

          // const result = await res.json();
          // console.log("Co-Aadhaar verification result:", result);

          // if (result.success) {

          //   setApplicationId(result.applicationId);

          //   setVerifyStatus(prev => ({
          //     ...prev,
          //     [statusKey]: "verified"
          //   }));

          //   alert("Co-Applicant Aadhaar KYC completed ✅");

          // } else {
          //   alert("Co-Aadhaar still in progress ⏳");
          // }

        } catch (err) {
          console.error(err);
          alert("Co-Aadhaar verification error");
        }

        break;default: return;
    
    case "cocibil":

      try {
        setVerifyStatus(prev => ({
          ...prev,
          co_applicant_cibil: "running"
        }));

        const preRes = await fetch(
          `http://20.219.130.232:8080/lead_gen/processWebCbHits`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadNo: leadNo,
              custTypeId: 2
            })
          }
        );

        const preResult = await preRes.json();
        console.log("Co processWebCbHits response:", preResult);
        saveThirdPartyResponse("co_applicant_cibil_prehit_response", preResult);

         if (preResult.status !== "accepted") {  // ✅ fixed
            setVerifyStatus(prev => ({
              ...prev,
              co_applicant_cibil: "failed"
            }));
            alert("Co-applicant CB hit initiation failed ❌");
            break;
          }

        const res = await fetch(
          `https://uat.teamvedika.com/checkCbStatusForSweb?leadNo=${leadNo}&custTypeId=2`,
          {
            method: "POST"
          }
        );

        const result = await res.json();
        console.log("Co checkCbStatusForSweb response:", result);
        saveThirdPartyResponse("co_applicant_cibil_response", result);

        if (result?.success === true) {
         
          setVerifyStatus(prev => ({
            ...prev,
            co_applicant_cibil: result?.cbStatusText || "Approved",
            co_applicant_cibil_score: result?.cb_score || result?.cibilScore || "--",
            co_applicant_cibil_name: result?.cust_name || "",
            co_applicant_cibil_hit_status: result?.cbHitStatus  // ✅ save this
          }));
        } else {
          setVerifyStatus(prev => ({
            ...prev,
            co_applicant_cibil: "failed"
          }));
        }

      } catch (err) {
        console.error(err);
        setVerifyStatus(prev => ({
          ...prev,
          co_applicant_cibil: "failed"
        }));
      }
      return;
      break;
}

    // For all types except Aadhaar
    if(type !== "aadhaar") {
      const res = await fetch(apiUrl, {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if(type === "pan" && result.status && result.data?.status === "INVALID"){
        setVerifyStatus(prev => ({ ...prev, [statusKey]: "failed" }));
        alert("PAN verification failed ❌ (Invalid PAN)");
      } else {
        setVerifyStatus(prev => ({ ...prev, [statusKey]: result.status ? "verified" : "failed" }));
        if(result.status) alert(`${type.toUpperCase()} verification successful ✅`);
        else alert(`${type.toUpperCase()} verifications failed ❌`);
      }
    }

  } catch(err){
    console.error(err);
    alert(`Error verifying ${type}`);
  } finally {
    setLoadingField(null); // stop loader
  }
};

const checkCoAadhaarStatus = async () => {

  const res = await fetch(`${API.coApplicantEkycVerify}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`
    },
    body: JSON.stringify({
      mobile: coMobile,   // ⚠️ IMPORTANT FIX
      sessionId: coAadhaarSessionId,
      eventType: "kyc_completed",
      applicationId: applicationId
    })
  });

  const result = await res.json();
  saveThirdPartyResponse("co_applicant_aadhaar_response", result);

  if (result.success || result.ekycStatus === "SUCCESS") {

    setVerifyStatus(prev => ({
      ...prev,
      co_aadhaar: "verified"
    }));

  } else {

    setVerifyStatus(prev => ({
      ...prev,
      co_aadhaar: "in_process"
    }));
  }
};

  // Main Applicant Functions
const sendOtp = async () => {
  try {
    const res = await fetch(`${API.generateOtp}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Mobile: mobile,
        Name: "ER Customer",
        Loan_Amount: "0",
        State: "Jharkhand",
        Dist: "Ranchi",
        Pincode: "834001"
      })
    });

    const result = await res.json();

    if (result.success) {
      setOtpSent(true);

      // 🔥 IMPORTANT: store session id for future OTP verification
      setOtpSessionId(result.otp_session_id);

      setVerifyStatus(prev => ({
        ...prev,
        applicant_mobile_otp: "pending"
      }));

      alert("OTP sent successfully ✔");
    } else {
      alert(result.message || "Failed to send OTP");
    }

  } catch (err) {
    console.error("OTP Send Error:", err);
    alert("Something went wrong while sending OTP");
  }
};

const verifyOtp = async () => {
  if (otp.length !== 6) {
    alert("Enter valid 6 digit OTP");
    return;
  }

  try {
    const res = await fetch(`${API.verifyOtp}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile: mobile,
        otp: otp,
        otp_session_id: otpSessionId
      })
    });

    const result = await res.json();

    if (result.success) {
      setVerifyStatus(prev => ({
        ...prev,
        applicant_mobile_otp: "verified"
      }));

      alert("OTP Verified Successfully ✅");

      // OPTIONAL (IMPORTANT for future API calls)
      setAuthToken(result.auth_token);

    } else {
      alert(result.message || "OTP verification failed ❌");
    }

  } catch (err) {
    console.error("OTP Verify Error:", err);
    alert("Something went wrong while verifying OTP");
  }
};


const sendCoOtp = async () => {
  try {
    const res = await fetch(`${API.SEND_OTP}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: coMobile })
    });

    const result = await res.json();

    if (result.status) {
      setCoOtpSent(true);

      setVerifyStatus(prev => ({
        ...prev,
        co_mobile_otp: "pending"
      }));
    }
  } catch (err) {
    console.error(err);
  }
};

const verifyCoOtp = () => {
  if (coOtp.length !== 6) return;

  setVerifyStatus(prev => ({
    ...prev,
    co_mobile_otp: "verified"
  }));
};





// const verifyOtp_pending = async () => {
//   try {
//     // call your OTP verification API
//     const res = await fetch(`${API.DEALERS}/verify/mobile/confirm`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ mobile, otp })
//     });
//     const result = await res.json();

//     if (result.status) {
//       setVerifyStatus(prev => ({
//         ...prev,
//         applicant_mobile_otp: "verified"
//       }));
//     } else {
//       alert("OTP verification failed ❌");
//       setVerifyStatus(prev => ({
//         ...prev,
//         applicant_mobile_otp: "failed"
//       }));
 //     }
//   } catch (err) {
//     console.error(err);
//   }
// };

  // const verifyAadhaar = () => {
  //   if (aadhaar.length !== 12) {
  //     setError("Enter valid 12 digit Aadhaar number");
  //     return;
  //   }
  //   setError("");
  //   setAadhaarVerified(true);
  // };

  const verifyPan = () => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan)) {
      setError("Enter valid PAN like ABCDE1234F");
      return;
    }
    setError("");
    setPanVerified(true);
  };

  const runBureauCheck = () => {
    setBureauStatus("running");
    setError("");
    
    setTimeout(() => {
      setBureauStatus("approved");
    }, 2000);
  };

  // -------------------------
// Stage 1 Save Function
// -------------------------
const saveStage1 = async () => {
  if (!isMainComplete || !isCoComplete) {
    alert("Complete all verifications first");
    return;
  }

  try {
    const payload = {
      application_id:           applicationId || "",
      lead_id:                  leadNo || "",
      manufacturer_name:        manufacturer,          // ← state variable, not form.*
      model:                    model,                  // ← state variable

      applicant_name:           applicantName || "",   // ← set after PAN verify
      applicant_mobile:         mobile,                // ← state variable
      applicant_aadhaar:        aadhaar,               // ← state variable
      applicant_pan:            pan,                   // ← state variable
      applicant_cibil_score:    verifyStatus.applicant_cibil_score || null,  // ← from verifyStatus

      co_applicant_mobile:      coMobile,              // ← state variable
      co_applicant_aadhaar:     coAadhaar,             // ← state variable
      co_applicant_pan:         coPan,                 // ← state variable
      co_applicant_cibil_score: verifyStatus.co_applicant_cibil_score || null,  // ← from verifyStatus

      consent_accepted:         1,
      dealer_id:                customerId,             // ← always useful to send

      // Raw third-party responses (Aadhaar/PAN/CB hit) for applicant + co-applicant,
      // for audit/record on the backend.
      third_party_responses:    thirdPartyResponses,
    };

    const res = await fetch(`${API.CUSTOMERSTAGE_FIRST}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`   // ← authToken set after OTP verify
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    console.log("Stage 1 Save Result:", result);

    if (result.success) {
      alert("Stage 1 saved successfully ✅");
      setApplicationId(result.application_id);
      localStorage.setItem("application_id", result.application_id);
      localStorage.setItem("manufacturer", manufacturer); // ADD
      localStorage.setItem("model", model);
      navigate("/document-collection");
    } else {
      alert(`Failed to save Stage 1: ${result.message || "Unknown error"}`);
    }

  } catch (err) {
    console.error(err);
    alert("Error saving Stage 1");
  }
};

  // Co-applicant Functions
  // const sendCoOtp = () => {
  //   if (coMobile.length !== 10) {
  //     setError("Enter valid 10 digit co-applicant mobile number");
  //     return;
  //   }
  //   setError("");
  //   setCoOtpSent(true);
  //   alert("Dummy OTP: 123456");
  // };

  // const verifyCoOtp = () => {
  //   if (coOtp !== "123456") {
  //     setError("Enter dummy OTP 123456");
  //     return;
  //   }
  //   setError("");
  //   setCoMobileVerified(true);
  //   setCoOtpSent(false);
  // };

const verifyCoAadhaar = async () => {
  const res = await fetch(`${API.DEALERS}/verify/aadhaar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_no: coAadhaar })
  });

  const result = await res.json();

  if (result.status) {
    setVerifyStatus(prev => ({
      ...prev,
      co_aadhaar: "verified"
    }));
  }
};

const verifyCoPan = async () => {
  const res = await fetch(`${API.DEALERS}/verify/pan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_no: coPan })
  });

  const result = await res.json();

  if (result.status) {
    setVerifyStatus(prev => ({
      ...prev,
      co_pan: "verified"
    }));
  }
};

const runCoBureauCheck = () => {
  setVerifyStatus(prev => ({
    ...prev,
    co_cibil: "running"
  }));

  setTimeout(() => {
    setVerifyStatus(prev => ({
      ...prev,
      co_cibil: "verified"   // or "approved"
    }));
  }, 500);
};
//  && bureauStatus && coBureauStatus

  // const isMainComplete = mobileVerified && aadhaarVerified && panVerified === "approved";
  // const isCoComplete = coMobileVerified && coAadhaarVerified && coPanVerified  === "approved";

  const isMainComplete =  "approved";
  const isCoComplete = "approved";

  return (
    <div className="verification-page">
      {/* Corner Bubbles */}
      <div className="corner-bubbles">
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
        <div className="bubble bubble-4"></div>
        <div className="bubble bubble-5"></div>
        <div className="bubble bubble-6"></div>
      </div>

      {/* Header - Full Width with New Color */}
      <div className="page-header">
        <div className="header-content">
          <div className="logo-area">
            <img src={logo} alt="Vedika" className="header-logo" />
            <div>
              <h1>New lead - Applicant verification</h1>
              <p>Complete KYC & verification for loan processing</p>
            </div>
          </div>
          <div className="lead-info">
            <span>Lead ID</span>
            <strong>VED-7185-2026</strong>
          </div>
        </div>
      </div>

      <div className="verification-content">
        {/* Vehicle Selection Card */}
        <div className="vehicle-card">
          <div className="card-header">
            <h2>Vehicle selection</h2>
            {/* <span className="badge">2 empanelled - only these are selectable</span> */}
          </div>
          <div className="vehicle-fields">
              {/* Manufacturer input (typeable) */}
               <div className="field-group">
          <label>Manufacturer</label>
         <div className="field-group">
                  <select
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select Manufacturer</option>
                    {manufacturerList.map((m) => (
                      <option key={m.id} value={m.manufacturer_name}>
                        {m.manufacturer_name}
                      </option>
                    ))}
                  </select>
                </div>
                </div>

                {/* Model input box */}
                <div className="field-group">
                  <label>Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Enter vehicle model"
                    className="form-input"
                  />
                </div>
            </div>
        </div>

        {/* Main Applicant Section - Collapsible with Padding */}
        <div className="collapse-card">
          <div 
            className="collapse-header"
            onClick={() => setActiveSection(activeSection === "applicant" ? "" : "applicant")}
          >
            <div className="header-left">
              <span className="collapse-icon">{activeSection === "applicant" ? "▼" : "▶"}</span>
              <h3>Applicant verification</h3>
            </div>
            {isMainComplete && (
              <div className="status-badge success">
                <span className="checkmark">✓</span> Complete
              </div>
            )}
          </div>

          {activeSection === "applicant" && (
            <div className="collapse-body">
              {error && <div className="error-msg">{error}</div>}
              
              {/* Step 1 - Mobile */}
              <div className="verification-row">
                <div className="step-info">
                  <span className="step-num">1</span>
                  <div>
                    <strong>Mobile Number</strong>
                    {mobileVerified && (
                      <div className="step-detail">+91 {mobile} · Verified</div>
                    )}
                  </div>
                </div>
              <div className="step-action">
                {verifyStatus.applicant_mobile_otp === "verified" ? (
                  <div className="tick-icon green-tick">✓</div>
                ) : (
                  <div className="input-group">

                    <input
                      type="text"
                      value={mobile}
                      maxLength={10}
                      placeholder="Enter mobile number"
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, ""))
                      }
                      className="form-input"
                    />

                    {!otpSent ? (
                      <button onClick={sendOtp} className="btn-primary">
                        Send OTP
                      </button>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={otp}
                          maxLength={6}
                          placeholder="Enter OTP"
                          onChange={(e) =>
                            setOtp(e.target.value.replace(/\D/g, ""))
                          }
                          className="form-input"
                        />

                        <button onClick={verifyOtp} className="btn-success">
                          Verify OTP
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              </div>

              {/* Step 2 - Aadhaar */}
              <div className="verification-row">
                <div className="step-info">
                  <span className="step-num">2</span>
                  <div>
                    <strong>Aadhaar Number</strong>
                    {aadhaarVerified && (
                      <div className="step-detail">
                        XXXX-XXXX-{aadhaar.slice(-4)} · Verified
                      </div>
                    )}
                  </div>
                </div>
             <div className="step-action">
                {verifyStatus.applicant_mobile_otp === "verified" ? (
                  verifyStatus.applicant_aadhaar === "verified" ? (
                    <div className="tick-icon green-tick">✓</div> // show tick if Aadhaar verified
                  ) : (
                    <div className="input-group">
                      <input
                        type="text"
                        value={aadhaar}
                        maxLength={12}
                        placeholder="Enter 12-digit Aadhaar number"
                        onChange={(e) =>
                          setAadhaar(e.target.value.replace(/\D/g, ""))
                        }
                        className="form-input"
                      />
                      <button
                        onClick={() => verifyField("aadhaar")}
                        className="btn-primary"
                        disabled={loadingField === "aadhaar"}
                      >
                        {loadingField === "aadhaar"
                          ? "Processing..."
                          : verifyStatus.applicant_aadhaar === "in_process"
                          ? "In Process"
                          : "Verify"}
                      </button>
                    </div>
                  )
                ) : (
                  <div className="locked-badge">🔒 Locked</div>
                )}
              </div>
              </div>

              {/* Step 3 - PAN */}
              <div className="verification-row">
                <div className="step-info">
                  <span className="step-num">3</span>
                  <div>
                    <strong>PAN Number</strong>
                    {panVerified && (
                      <div className="step-detail">
                        {pan} · Verified
                      </div>
                    )}
                  </div>
                </div>
                <div className="step-action">
                  {verifyStatus.applicant_pan === "verified" ? (
                    <div className="tick-icon green-tick">✓</div>
                  ) : verifyStatus.applicant_aadhaar === "verified" ? (
                    <div className="input-group">
                      <input
                        type="text"
                        value={pan}
                        maxLength={10}
                        placeholder="Enter PAN number (ABCDE1234F)"
                        onChange={(e) =>
                          setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                        }
                        className="form-input"
                      />
                      <button
                        onClick={() => verifyField("pan", pan)}
                        className="btn-primary"
                        disabled={loadingField === "pan"}
                      >
                        {loadingField === "pan"
                          ? "Processing..."
                          : "Verify PAN"}
                      </button>
                    </div>
                  ) : (
                    <div className="locked-badge">🔒 Locked</div>
                  )}
                </div>
              </div>

              {/* Step 4 - Bureau */}
             <div className="verification-row">
  <div className="step-info">
    <span className="step-num">4</span>
    <div>
      <strong>Credit bureau pull</strong>

      {verifyStatus.applicant_cibil === "running" && (
        <div className="step-detail">Consent captured · pulling CIBIL...</div>
      )}

      {/* Show status text when we have a response but not final yet */}
      {verifyStatus.applicant_cibil &&
       verifyStatus.applicant_cibil !== "running" &&
       verifyStatus.applicant_cibil !== "failed" &&
       verifyStatus.applicant_cibil_hit_status !== 5 && (
        <div className="step-detail" style={{ color: "#f59e0b" }}>
          ⏳ {verifyStatus.applicant_cibil}
        </div>
      )}

      {/* Only show score when truly approved */}
      {verifyStatus.applicant_cibil_hit_status === 5 && (
        <div className="step-detail">
          CIBIL Score: {verifyStatus.applicant_cibil_score || "--"}
        </div>
      )}
    </div>
  </div>

  <div className="step-action">
    {verifyStatus.applicant_pan !== "verified" ? (
      <div className="locked-badge">🔒 Locked</div>

    ) : verifyStatus.applicant_cibil_hit_status === 5 ? (  // ✅ only tick on final approval
      <div className="tick-icon green-tick">✓</div>

    ) : (
      <button
        onClick={() => verifyField("cibil")}
        disabled={verifyStatus.applicant_cibil === "running"}
        className="btn-primary"
      >
        {verifyStatus.applicant_cibil === "running"
          ? "⟳ Running..."
          : verifyStatus.applicant_cibil === "In Process"
          ? "⟳ Check Again"        // ✅ re-check label when in process
          : "Run Bureau Check"}
      </button>
    )}
  </div>
              </div>

              {/* Bureau Result Card — only on final approval */}
              {verifyStatus.applicant_cibil_hit_status === 5 && (
                <div className="bureau-result">
                  <div className="result-header">
                    <strong>BUREAU RESULT</strong>
                    <div className="tick-icon green-tick">✓</div>
                  </div>
                  <p className="result-detail">
                    {verifyStatus.applicant_cibil_name && (
                      <span>{verifyStatus.applicant_cibil_name} · </span>
                    )}
                    {verifyStatus.applicant_cibil} · CIBIL {verifyStatus.applicant_cibil_score || "--"} · Positive
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Co-applicant Section - Collapsible with Padding */}
        <div className="collapse-card">
          <div 
            className="collapse-header"
            onClick={() => setActiveSection(activeSection === "coapplicant" ? "" : "coapplicant")}
          >
            <div className="header-left">
              <span className="collapse-icon">{activeSection === "coapplicant" ? "▼" : "▶"}</span>
              <h3>Co-applicant verification </h3>
            </div>
            {isCoComplete && (
              <div className="status-badge success">
                <span className="checkmark">✓</span> Complete
              </div>
            )}
          </div>

          {activeSection === "coapplicant" && (
            <div className="collapse-body">
              {/* Co-applicant Mobile */}
              <div className="verification-row">
                <div className="step-info">
                  <span className="step-num">1</span>
                  <div>
                    <strong>Mobile Number</strong>
                    {coMobileVerified && (
                      <div className="step-detail">+91 {coMobile} · Verified</div>
                    )}
                  </div>
                </div>
                <div className="step-action">
                  {verifyStatus.co_mobile_otp === "verified" ? (
                      <div className="tick-icon green-tick">✓</div>
                    ) : (
                      <div className="input-group">
                        <input
                          type="text"
                          value={coMobile}
                          maxLength={10}
                          placeholder="Enter mobile number"
                          onChange={(e) => setCoMobile(e.target.value.replace(/\D/g, ""))}
                          className="form-input"
                        />

                        {!coOtpSent ? (
                          <button onClick={sendCoOtp} className="btn-primary">
                            Send OTP
                          </button>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={coOtp}
                              maxLength={6}
                              placeholder="Enter OTP"
                              onChange={(e) => setCoOtp(e.target.value.replace(/\D/g, ""))}
                              className="form-input"
                            />

                            <button onClick={verifyCoOtp} className="btn-success">
                              Verify
                            </button>
                          </>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {/* Co-applicant Aadhaar */}
              <div className="verification-row">
                <div className="step-info">
                  <span className="step-num">2</span>
                  <div>
                    <strong>Aadhaar Number</strong>
                    {coAadhaarVerified && (
                      <div className="step-detail">
                        XXXX-XXXX-{coAadhaar.slice(-4)} · Verified
                      </div>
                    )}
                  </div>
                </div>
             <div className="step-action">

                {verifyStatus.co_mobile_otp !== "verified" ? (
                  <div className="locked-badge">🔒 Locked</div>

                ) : verifyStatus.co_aadhaar === "verified" ? (
                  <div className="tick-icon green-tick">✓ </div>

                ) : verifyStatus.co_aadhaar === "in_process" ? (
                  <div className="running-badge">⟳ In Process</div>

                ) : (
                  <div className="input-group">

                    <input
                      type="text"
                      value={coAadhaar}
                      maxLength={12}
                      placeholder="Enter 12-digit Aadhaar number"
                      onChange={(e) =>
                        setCoAadhaar(e.target.value.replace(/\D/g, ""))
                      }
                      className="form-input"
                    />

                    <button
                      onClick={() => verifyField("coaadhaar")}
                      className="btn-primary"
                      disabled={loadingField === "coaadhaar"}
                    >
                      {loadingField === "coaadhaar"
                        ? "Processing..."
                        : "Verify Aadhaar"}
                    </button>

                  </div>
                )}

              </div>
              </div>

              {/* Co-applicant PAN */}
            <div className="verification-row">
              <div className="step-info">
                <span className="step-num">3</span>
                <div>
                  <strong>PAN Number</strong>
                  {verifyStatus.co_applicant_pan === "verified" && (
                    <div className="step-detail">
                      {coPan} · Verified
                    </div>
                  )}
                </div>
              </div>
              <div className="step-action">
                {verifyStatus.co_applicant_pan === "verified" ? (
                  <div className="tick-icon green-tick">✓</div>

                ) : verifyStatus.co_aadhaar === "verified" ? (  // ✅ fixed key
                  <div className="input-group">
                    <input
                      type="text"
                      value={coPan}
                      maxLength={10}
                      placeholder="Enter PAN number (ABCDE1234F)"
                      onChange={(e) =>
                        setCoPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                      }
                      className="form-input"
                    />
                    <button
                      onClick={() => verifyField("copan", coPan)}
                      className="btn-primary"
                      disabled={loadingField === "copan"}
                    >
                      {loadingField === "copan"
                        ? "Processing..."
                        : "Verify PAN"}
                    </button>
                  </div>

                ) : (
                  <div className="locked-badge">🔒 Locked</div>
                )}
              </div>
            </div>

              {/* Co-applicant Bureau */}
              <div className="verification-row">
  <div className="step-info">
    <span className="step-num">4</span>
    <div>
      <strong>Credit bureau pull</strong>

      {verifyStatus.co_applicant_cibil === "running" && (
        <div className="step-detail">Consent captured · pulling CIBIL...</div>
      )}

      {/* Show status text when in process but not final */}
      {verifyStatus.co_applicant_cibil &&
       verifyStatus.co_applicant_cibil !== "running" &&
       verifyStatus.co_applicant_cibil !== "failed" &&
       verifyStatus.co_applicant_cibil_hit_status !== 5 && (
        <div className="step-detail" style={{ color: "#f59e0b" }}>
          ⏳ {verifyStatus.co_applicant_cibil}
        </div>
      )}

      {/* Only show score when truly approved */}
      {verifyStatus.co_applicant_cibil_hit_status === 5 && (
        <div className="step-detail">
          CIBIL Score: {verifyStatus.co_applicant_cibil_score || "--"}
        </div>
      )}
    </div>
  </div>

  <div className="step-action">
    {verifyStatus.co_applicant_pan !== "verified" ? (  // ✅ was co_pan
      <div className="locked-badge">🔒 Locked</div>

    ) : verifyStatus.co_applicant_cibil_hit_status === 5 ? (  // ✅ cbHitStatus check
      <div className="tick-icon green-tick">✓</div>

    ) : (
      <button
        onClick={() => verifyField("cocibil")}
        disabled={verifyStatus.co_applicant_cibil === "running"}
        className="btn-primary"
      >
        {verifyStatus.co_applicant_cibil === "running"
          ? "⟳ Running..."
          : verifyStatus.co_applicant_cibil === "In Process"
          ? "⟳ Check Again"
          : "Run Bureau Check"}
      </button>
    )}
  </div>
              </div>

              {/* Bureau Result Card — only on final approval */}
              {verifyStatus.co_applicant_cibil_hit_status === 5 && (
                <div className="bureau-result">
                  <div className="result-header">
                    <strong>BUREAU RESULT</strong>
                    <div className="tick-icon green-tick">✓</div>
                  </div>
                  <p className="result-detail">
                    {verifyStatus.co_applicant_cibil_name && (
                      <span>{verifyStatus.co_applicant_cibil_name} · </span>
                    )}
                    {verifyStatus.co_applicant_cibil} · CIBIL {verifyStatus.co_applicant_cibil_score || "--"} · Positive
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="warning-note">
          <strong>⚠️ THIS IS NOT THE FINAL APPROVAL</strong>
          <p>This is a provisional bureau outcome only. Final approval will be granted ONLY after the sanction stage is approved. Do not commit delivery or collect down payment from the customer based on this screen.</p>
        </div>

        {/* Verification Trail */}
        <div className="trail-info">
          <span>✓ Verification trail logged · audit ID VED-7185-LOG</span>
        </div>

        {/* Action Button */}
        {/* <button 
          className={`proceed-btn ${isMainComplete && isCoComplete ? 'active' : 'disabled'}`}
          // disabled={!isMainComplete || !isCoComplete}
          onClick={() => navigate("/document-collection ")}
          
        >
          Proceed to document collection {isMainComplete && isCoComplete ? "→" : "(Complete all verifications first)"}
        </button> */}
        <button 
            className={`proceed-btn ${isMainComplete && isCoComplete ? 'active' : 'disabled'}`}
            onClick={saveStage1}   // just call the function here
          >
            Proceed to document collection {isMainComplete && isCoComplete ? "→" : "(Complete all verifications first)"}
          </button>

        {/* Helper Text */}
        <div className="helper-text">
          <small>🔑 Demo: OTP: 123456 | Aadhaar: 123456789012 | PAN: ABCDE1234F</small>
        </div>
      </div>
    </div>
  );
};

export default ApplicantVerification;