import React, { useEffect, useRef, useState } from "react";
import "../assets/css/style.css";
import { useNavigate } from "react-router-dom";

const OtpVerify = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);

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

 const handleVerify = () => {
  const finalOtp = otp.join("");

  if (finalOtp.length !== 6) {
    setError("Please enter complete 6 digit OTP");
    return;
  }

  setError("");

  // Success Alert
  alert("OTP verified successfully");

  // Redirect to Dashboard
  navigate("/dealer-dashboard");
};

  const handleResendOtp = () => {
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

        <button type="button" className="otp-verify-btn" onClick={handleVerify}>
          Verify OTP
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