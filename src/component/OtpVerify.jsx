import React, { useEffect, useRef, useState } from "react";
import "../assets/css/style.css";
import { useLocation, useNavigate } from "react-router-dom";
import { API } from "../component/api/apiRoutes";
import { normaliseSession } from "./utils/session";

const OtpVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef([]);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const mobile = location.state?.mobile || storedUser.mobile;
  const dealerId = storedUser.dealer_id;

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleBackspace = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

 const handleVerify = async () => {
  const finalOtp = otp.join("");

  if (finalOtp.length !== 6) {
    setError("Please enter complete 6 digit OTP");
    return;
  }

  if (!mobile) {
    setError("Mobile number not found, please login again");
    return;
  }

  setError("");
  setVerifying(true);

  try {
    const formData = new FormData();
    formData.append("mobile", mobile);
    formData.append("otp", finalOtp);
    if (dealerId) formData.append("dealer_id", dealerId);

    const response = await fetch(API.OTP_VERIFY, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    console.log("VERIFY OTP RESULT:", result);

    if (result.status) {
      alert(result.message || "OTP verified successfully");

      // The verify-otp response returns the full dealer record (id, showroom details,
      // documents, etc.) — merge it into the stored user so later screens (e.g. Customer
      // Onboarding) see it without requiring another login.
      if (result.data) {
        const mergedUser = normaliseSession(storedUser, result.data);
        localStorage.setItem("user", JSON.stringify(mergedUser));
        if (result.data.id != null) localStorage.setItem("dealer_id", result.data.id);
        if (result.data.status) localStorage.setItem("dealer_status", result.data.status);
      }

      // Redirect based on dealer status saved at login
      const dealerStatus = (localStorage.getItem("dealer_status") || "").toUpperCase();
      if (dealerStatus === "PENDING") {
        navigate("/application-status");
      } else {
        navigate("/dealer-dashboard");
      }
    } else {
      setError(result.message || "Invalid OTP");
    }
  } catch (error) {
    console.log("VERIFY OTP ERROR:", error);
    setError("Server error, please try again");
  } finally {
    setVerifying(false);
  }
};

  const handleResendOtp = async () => {
    if (!mobile) {
      setError("Mobile number not found, please login again");
      return;
    }

    try {
      const response = await fetch(API.SEND_OTP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile }),
      });

      const result = await response.json();
      console.log("RESEND OTP RESULT:", result);

      if (!result.status) {
        setError(result.message || "Failed to resend OTP");
      }
    } catch (error) {
      console.log("RESEND OTP ERROR:", error);
      setError("Server error, please try again");
    }

    setOtp(["", "", "", "", "", ""]);
    setTimer(60);
    setError("");
    inputRefs.current[0].focus();
  };

  return (
    <div className="otp-page">
      <div className="otp-card">
        <div className="otp-icon">🔐</div>

        <h2>OTP Verification</h2>

        <p className="otp-subtitle">
          Enter the 6 digit OTP sent to your registered mobile number and email ID.
        </p>

        <div className="otp-inputs">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(e) => handleOtpChange(e.target.value, index)}
              onKeyDown={(e) => handleBackspace(e, index)}
            />
          ))}
        </div>

        {error && <p className="otp-error">{error}</p>}

        <button
          type="button"
          className="otp-verify-btn"
          onClick={handleVerify}
          disabled={verifying}
        >
          {verifying ? "Verifying..." : "Verify OTP"}
        </button>

        <div className="otp-resend">
          {timer > 0 ? (
            <p>
              Resend OTP in <strong>{timer}s</strong>
            </p>
          ) : (
            <button type="button" onClick={handleResendOtp}>
              Resend OTP
            </button>
          )}
        </div>

        <p className="otp-note">
          Please do not share your OTP with anyone. Vedika Finance will never ask
          for your OTP over call.
        </p>
      </div>
    </div>
  );
};

export default OtpVerify;