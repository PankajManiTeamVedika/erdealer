import React, { useEffect, useRef, useState } from "react";
import "../assets/css/style.css";
import logo from "../assets/image/logo.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API } from "../component/api/apiRoutes";
import { setAuthToken } from "./utils/authToken";
import { normaliseSession } from "./utils/session";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("sessionExpired") === "1";

  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  // ================= NEW JOIN FLOW =================
  // Steps: null (closed) -> "mobile" -> "otp" -> "manufacturer"
  const [newJoinStep, setNewJoinStep] = useState(null);
  const [newJoinMobile, setNewJoinMobile] = useState("");
  const [newJoinOtp, setNewJoinOtp] = useState(["", "", "", "", "", ""]);
  const [newJoinError, setNewJoinError] = useState("");
  const [sendingNewJoinOtp, setSendingNewJoinOtp] = useState(false);
  const [verifyingNewJoinOtp, setVerifyingNewJoinOtp] = useState(false);
  const newJoinOtpRefs = useRef([]);

  // generate captcha on load
  useEffect(() => {
    generateCaptcha();
    fetchManufacturers();
  }, []);

  // ================= LOGIN API =================
  const handleLogin = async () => {
    if (!username || !password) {
      alert("Enter username & password");
      return;
    }

    if (!captchaInput) {
      alert("Enter captcha");
      return;
    }

    if (captcha !== captchaInput) {
      alert("Invalid captcha");
      return;
    }

    try {
      const response = await fetch(API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: username,
          password: password,
        }),
      });

      const result = await response.json();
      console.log("LOGIN RESULT:", result);

      if (result.status === true) {
          const user = result.data;
        setAuthToken(result.data.token);
         localStorage.setItem("dealer_status", result.data.status);
        // See utils/session.js — normalises the dealer's primary key (`id`) to
        // `dealer_id`, the field name every other screen reads.
        localStorage.setItem("user", JSON.stringify(normaliseSession({}, result.data)));

        if (user.role === "HO") {
          navigate("/ho-dashboard");   // 🚀 direct dashboard
        } else if (user.role === "FI") {
          navigate("/fi-dashboard");   // 🚀 direct dashboard
        } else {
          // Dealer (and any other role) must verify OTP before proceeding
          const otpResult = await sendOtp(user.mobile);

          if (otpResult && otpResult.status) {
            navigate("/otp-verify", { state: { mobile: user.mobile } });
          } else {
            alert(otpResult?.message || "Failed to send OTP");
          }
        }
      } else {
        alert(result.message || "Login failed");
      }
    } catch (error) {
      console.log("LOGIN ERROR:", error);
      alert("Server error");
    }
  };

  // ================= SEND OTP =================
  const sendOtp = async (mobile) => {
    try {
      const response = await fetch(API.SEND_OTP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile }),
      });

      const result = await response.json();
      console.log("SEND OTP RESULT:", result);
      return result;
    } catch (error) {
      console.log("SEND OTP ERROR:", error);
      return null;
    }
  };

  // ================= MANUFACTURERS =================
  const fetchManufacturers = async () => {
  try {
    console.log("API HIT START");

    const res = await fetch(API.MANUFACTURERS);

    console.log("STATUS:", res.status);

    const result = await res.json();
    console.log("RESULT:", result);

    setManufacturers(result?.data || result);

  } catch (err) {
    console.log("ERROR:", err);
  }
};

  // ================= CAPTCHA =================
  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(code);
  };

  // ================= MANUFACTURER SELECT =================
  const handleManufacturerChange = (id) => {
    if (selectedManufacturers.includes(id)) {
      setSelectedManufacturers(
        selectedManufacturers.filter((i) => i !== id)
      );
    } else {
      setSelectedManufacturers([...selectedManufacturers, id]);
    }
  };

  const filteredManufacturers = [...manufacturers]
    .sort((a, b) => {
      const aSelected = selectedManufacturers.includes(a.id);
      const bSelected = selectedManufacturers.includes(b.id);

      return aSelected === bSelected ? 0 : aSelected ? -1 : 1;
    })
    .filter((item) =>
      item.manufacturer_name
        .toLowerCase()
        .includes(searchText.toLowerCase())
    );

  const handleContinue = () => {
    if (selectedManufacturers.length === 0) {
      alert("Select manufacturer");
      return;
    }

    const selectedManufacturerData = manufacturers.filter((item) =>
      selectedManufacturers.includes(item.id)
    );

    navigate("/dealer-onboarding", {
      state: {
        selectedManufacturers: selectedManufacturerData,
        mobile: newJoinMobile,
        mobileVerified: true,
      },
    });
  };

  // ================= NEW JOIN FLOW =================
  const resetNewJoin = () => {
    setNewJoinStep(null);
    setNewJoinMobile("");
    setNewJoinOtp(["", "", "", "", "", ""]);
    setNewJoinError("");
    setSendingNewJoinOtp(false);
    setVerifyingNewJoinOtp(false);
    setSelectedManufacturers([]);
    setSearchText("");
  };

  const handleSendNewJoinOtp = async () => {
    if (!/^\d{10}$/.test(newJoinMobile)) {
      setNewJoinError("Enter a valid 10 digit mobile number");
      return;
    }

    setNewJoinError("");
    setSendingNewJoinOtp(true);

    try {
      const response = await fetch(API.SEND_OTP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: newJoinMobile }),
      });

      const result = await response.json();

      if (result.status) {
        setNewJoinStep("otp");
        setNewJoinOtp(["", "", "", "", "", ""]);
      } else {
        setNewJoinError(result.message || "Failed to send OTP");
      }
    } catch (error) {
      console.log("NEW JOIN SEND OTP ERROR:", error);
      setNewJoinError("Server error, please try again");
    } finally {
      setSendingNewJoinOtp(false);
    }
  };

  const handleNewJoinOtpChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const updated = [...newJoinOtp];
    updated[index] = value;
    setNewJoinOtp(updated);
    setNewJoinError("");

    if (value && index < 5) {
      newJoinOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleNewJoinOtpBackspace = (e, index) => {
    if (e.key === "Backspace" && !newJoinOtp[index] && index > 0) {
      newJoinOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyNewJoinOtp = async () => {
    const finalOtp = newJoinOtp.join("");

    if (finalOtp.length !== 6) {
      setNewJoinError("Please enter complete 6 digit OTP");
      return;
    }

    setNewJoinError("");
    setVerifyingNewJoinOtp(true);

    try {
      const formData = new FormData();
      formData.append("mobile", newJoinMobile);
      formData.append("otp", finalOtp);

      const response = await fetch(API.VERIFY_MOBILE_OTP, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.status) {
        setNewJoinStep("manufacturer");
      } else {
        setNewJoinError(result.message || "Invalid OTP");
      }
    } catch (error) {
      console.log("NEW JOIN VERIFY OTP ERROR:", error);
      setNewJoinError("Server error, please try again");
    } finally {
      setVerifyingNewJoinOtp(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="customer-brand">
          <img src={logo} alt="logo" className="brand-logo" />
        </div>

        <h3>Welcome back</h3>
        <p className="subtitle">Sign in to continue</p>
        {sessionExpired && (
          <p className="otp-error">Your session has expired — please log in again.</p>
        )}

        {/* USER */}
        <label>Username</label>
        <div className="input-box">
          <span>👤</span>
          <input
          placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
          />
        </div>

        {/* PASSWORD */}
        <label>Password</label>
        <div className="input-box">
          <span>🔒</span>
          <input
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}>
            👁
          </button>
        </div>

        {/* CAPTCHA */}
        <label>Captcha</label>
        <div className="captcha-row">
          <div className="captcha-code">{captcha}</div>
          <input
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            type="text"
          />
          <button
            type="button"
            onClick={generateCaptcha}
            className="captcha-refresh-btn"
          >
            ↻
          </button>
        </div>

        {/* LOGIN */}
        <button className="signin-btn" onClick={handleLogin}>
          Sign in
        </button>

        <div className="links">
          <a href="#">Forgot password?</a>

          <button
            type="button"
            className="new-join-btn"
            onClick={() => setNewJoinStep("mobile")}
          >
            ✨ New Join
          </button>
        </div>

        <hr />

        <div className="info">
          <span>ⓘ</span>
          <p>OTP will be sent after login</p>
           <p>Pilot Version 1.3</p>
        </div>
      </div>

      {/* NEW JOIN - STEP 1: MOBILE NUMBER */}
      {newJoinStep === "mobile" && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Enter Mobile Number</h3>
              <button onClick={resetNewJoin}>✕</button>
            </div>

            <div className="input-box">
              <span>📱</span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Enter 10 digit mobile number"
                maxLength="10"
                value={newJoinMobile}
                onChange={(e) =>
                  setNewJoinMobile(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))
                }
              />
            </div>

            {newJoinError && <p className="otp-error">{newJoinError}</p>}

            <button
              type="button"
              className="otp-verify-btn"
              onClick={handleSendNewJoinOtp}
              disabled={sendingNewJoinOtp}
            >
              {sendingNewJoinOtp ? "Sending OTP..." : "Send OTP"}
            </button>
          </div>
        </div>
      )}

      {/* NEW JOIN - STEP 2: OTP VERIFY */}
      {newJoinStep === "otp" && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Verify OTP</h3>
              <button onClick={resetNewJoin}>✕</button>
            </div>

            <p className="otp-subtitle">
              Enter the 6 digit OTP sent to {newJoinMobile}
            </p>

            <div className="otp-inputs">
              {newJoinOtp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (newJoinOtpRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleNewJoinOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleNewJoinOtpBackspace(e, index)}
                />
              ))}
            </div>

            {newJoinError && <p className="otp-error">{newJoinError}</p>}

            <button
              type="button"
              className="otp-verify-btn"
              onClick={handleVerifyNewJoinOtp}
              disabled={verifyingNewJoinOtp}
            >
              {verifyingNewJoinOtp ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="otp-resend">
              <button type="button" onClick={handleSendNewJoinOtp} disabled={sendingNewJoinOtp}>
                {sendingNewJoinOtp ? "Resending..." : "Resend OTP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW JOIN - STEP 3: SELECT MANUFACTURER */}
      {newJoinStep === "manufacturer" && (
  <div className="modal-overlay">
    <div className="modal-card">

      <div className="modal-header">
        <h3>Select Manufacturer</h3>
        <button onClick={resetNewJoin}>✕</button>
      </div>

      <input
        type="text"
        className="modal-search"
        placeholder="Search manufacturer..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      <div className="modal-list">
        {loading ? (
          <p>Loading...</p>
        ) : (
          filteredManufacturers.map((item) => (
            <label key={item.id} className="modal-item">
              <input
                type="checkbox"
                checked={selectedManufacturers.includes(item.id)}
                onChange={() => handleManufacturerChange(item.id)}
              />
              <span>{item.manufacturer_name}</span>
            </label>
          ))
        )}
      </div>

      <div className="modal-footer">
        <span>{selectedManufacturers.length} selected</span>

        <button
          className="modal-submit"
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>

    </div>
  </div>
)}
    </div>
  );
};

export default Login;