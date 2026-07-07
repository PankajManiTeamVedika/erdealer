import React from "react";
import "../assets/css/style.css";
import logo from "../assets/image/logowhite.png";
import { useNavigate } from "react-router-dom";

const DealerDashboard = () => {
  const navigator = useNavigate();
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
          <span>3</span>
          <span>Rajesh Auto Services</span>
          <button onClick={() => navigator('/')}>Sign out</button>
        </div>
      </div>

      {/* Content */}
      <div className="dashboard-content">

        <div className="welcome-row">
          <div>
            <h2>Good afternoon, Rajesh</h2>
            <p>
              <span>Dealer code: RAJ-AUT-00214</span> ·{" "}
              <span>Branch: Ranchi Main</span> ·{" "}
              <span>Last login: Today, 10:42 AM</span>
            </p>
          </div>

          <div className="brand-tags">
            <span>Terra Motors ✓</span>
            <span>Mahindra Treo ✓</span>
            <span>YC Electric ✓</span>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <p>Today</p>
            <h3>7</h3>
          </div>

          <div className="stat-card">
            <p>This month</p>
            <h3>142</h3>
          </div>

          <div className="stat-card">
            <p>In pipeline</p>
            <h3 className="orange">18</h3>
          </div>

          <div className="stat-card">
            <p>Disbursed (MTD)</p>
            <h3 style={{color:"green"}}>98</h3>
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
            <h3>Sourcing pipeline status</h3>
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