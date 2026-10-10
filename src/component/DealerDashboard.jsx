import React, { useEffect, useState } from "react";
import "../assets/css/style.css";
import logo from "../assets/image/logowhite.png";
import { useNavigate } from "react-router-dom";
import { API } from "./api/apiRoutes";
import { getStatusInfo, POST_SANCTION_STAGE_KEYS } from "./utils/leadStatus";

const getGreeting = (hour) => {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const DealerDashboard = () => {
  const navigator = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [dealer, setDealer] = useState(null);
  const [now] = useState(() => new Date());

  const loginData = JSON.parse(localStorage.getItem("user") || "null");
  const dealerId = loginData?.dealer_id || loginData?.id;
  console.log("DealerDashboard: dealerId", dealerId, "loginData", loginData);

  // Login only stores a lean payload (dealer_id, user_id, role, token). The full
  // profile (owner name, branch, manufacturers) lives behind the same dealer
  // profile endpoint DealerDetails.jsx already uses.
  useEffect(() => {
    if (!dealerId) return;

    const fetchDealer = async () => {
      try {
        const res = await fetch(`${API.DEALERS}/${dealerId}`);
        const result = await res.json();
        if (result.status) {
          setDealer(result.data);
        }
      } catch (err) {
        console.error("Dealer profile fetch error:", err);
      }
    };

    fetchDealer();
  }, [dealerId]);

  // Same /customers/stage3 list SourcingPipeline.jsx uses, fetched here to drive
  // the "Post Sanction Pending" notification badge and the stats row below.
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${API.CUSTOMERS_STAGE3}?_=${Date.now()}`);
        const data = await res.json();
        if (data.success) {
          setCustomers(data.data || []);
        }
      } catch (err) {
        console.error("Customer list API error:", err);
      }
    };

    fetchCustomers();
  }, []);

  const postSanctionPendingCount = customers.filter(
    (c) => POST_SANCTION_STAGE_KEYS.includes(getStatusInfo(c).key)
  ).length;

  const ownerName = dealer?.owner_name || "Dealer";
  const ownerFirstName = ownerName.split(" ")[0];
  const businessName = dealer?.legal_name || dealer?.showroom_name || ownerName;
  const dealerCode = dealer?.login_user_id || loginData?.dealer_id || "—";
  const branchName = dealer?.branch || "—";
  const manufacturers = (dealer?.manufacturer_name || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);
  const todayCount = customers.filter((c) => c.created_at?.slice(0, 10) === todayStr).length;
  const monthCount = customers.filter((c) => c.created_at?.slice(0, 7) === monthStr).length;
  const disbursedMtdCount = customers.filter(
    (c) => c.created_at?.slice(0, 7) === monthStr && getStatusInfo(c).key === "delivered"
  ).length;

  const lastLoginLabel = `Today, ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="dealer-dashboard">

      {/* Top Header */}
      <div className="top-header">
        <div className="brand">
            <img src={logo} alt="Vedika Logo" className="brand-logo" />

            {/* <div className="brand-text">
                <span className="logo-text">VEDIKA</span>
                <span className="divider">|</span>
                <span>ER Dealer Portal</span>
            </div> */}
            </div>

        <div className="user-area">
          <span>{ownerFirstName.charAt(0).toUpperCase()}</span>
          <span>{businessName}</span>
          <button onClick={() => navigator('/')}>Sign out</button>
        </div>
      </div>

      {/* Content */}
      <div className="dashboard-content">

        <div className="welcome-row">
          <div>
            <h2>{getGreeting(now.getHours())}, {ownerFirstName}</h2>
            <p>
              <span>Dealer code: {dealerCode}</span> ·{" "}
              <span>Branch: {branchName}</span> ·{" "}
              <span>Last login: {lastLoginLabel}</span>
            </p>
          </div>

          <div className="brand-tags">
            {manufacturers.length > 0 ? (
              manufacturers.map((m) => <span key={m}>{m} ✓</span>)
            ) : (
              <span>—</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <p>Today</p>
            <h3>{todayCount}</h3>
          </div>

          <div className="stat-card">
            <p>This month</p>
            <h3>{monthCount}</h3>
          </div>

          <div className="stat-card">
            <p>In pipeline</p>
            <h3 className="orange">{customers.length}</h3>
          </div>

          <div className="stat-card">
            <p>Disbursed (MTD)</p>
            <h3 style={{color:"green"}}>{disbursedMtdCount}</h3>
          </div>
        </div>

        {/* Action Cards */}
        <div className="action-row">
          <div className="action-card">
            <div className="icon-box blue"></div>
            <h3>New sourcing</h3>
            <p>
              Start a new loan login. Select manufacturer & model, capture
              customer details, run eKYC and bureau scrub.
            </p>
            <button
            className="link-btn"
            onClick={() => navigator("/applicant-verification")}>Start new lead</button>
          </div>

          <div className="action-card">
            <div className="icon-box light-green"></div>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              Sourcing pipeline status
              {postSanctionPendingCount > 0 && (
                <span className="notification-badge" style={{ position: "static" }}>
                  {postSanctionPendingCount}
                </span>
              )}
            </h3>
            <p>
              Track every lead you’ve sourced — eKYC status, bureau outcome,
              Swatah handover, rejections, and final decision.
            </p>
           <button
            className="link-btn"
            onClick={() => navigator("/sourcing-pipeline")}
          >
            View pipeline
          </button>
          </div>
        </div>

        {/* Alert */}
        <div className="alert-box">
          <strong>3 leads pending eKYC completion</strong>
          <br />
          These leads will auto-expire in 48 hours if eKYC is not completed by
          the customer.
        </div>

      </div>
    </div>
  );
};

export default DealerDashboard;
