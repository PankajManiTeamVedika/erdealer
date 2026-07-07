import React, { useEffect, useState } from "react";
import "../assets/css/style.css";
import logo from "../assets/image/logo.png";
import { useNavigate } from "react-router-dom";
import { API } from "../component/api/apiRoutes";

const Login = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const [showPopup, setShowPopup] = useState(false);

  const [manufacturers, setManufacturers] = useState([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

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
        localStorage.setItem("token", result.data.token);
        localStorage.setItem("user", JSON.stringify(result.data));

        if (user.role === "HO") {
          navigate("/ho-dashboard");   // 🚀 direct dashboard
        } else if (user.role === "FI") {
          navigate("/fi-dashboard");   // 🚀 direct dashboard
        }else {
          navigate("/otp-verify");  // others go OTP
        }
      } else {
        alert(result.message || "Login failed");
      }
    } catch (error) {
      console.log("LOGIN ERROR:", error);
      alert("Server error");
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
      state: { selectedManufacturers: selectedManufacturerData },
    });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="customer-brand">
          <img src={logo} alt="logo" className="brand-logo" />
        </div>

        <h3>Welcome back</h3>
        <p className="subtitle">Sign in to continue</p>

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
            onClick={() => setShowPopup(true)}
          >
            ✨ New Join
          </button>
        </div>

        <hr />

        <div className="info">
          <span>ⓘ</span>
          <p>OTP will be sent after login</p>
        </div>
      </div>

      {/* POPUP */}
      {showPopup && (
  <div className="modal-overlay">
    <div className="modal-card">

      <div className="modal-header">
        <h3>Select Manufacturer</h3>
        <button onClick={() => setShowPopup(false)}>✕</button>
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