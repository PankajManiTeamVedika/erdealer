import React from "react";
import "../assets/css/ApplicationStatus.css";

const ApplicationStatus = () => {
  const journey = [
    { title: "Submitted", time: "12 May · 14:08", status: "done" },
    { title: "Documents Verified", time: "12 May · 14:12", status: "done" },
    { title: "Bureau & Scrub", time: "12 May · 14:24", status: "done" },
    { title: "Under Review", time: "In progress", status: "active" },
    { title: "Decision", time: "ETA: 6 hrs", status: "pending" },
  ];

  const documents = [
    { name: "Trade Certificate", value: "Verified", type: "success" },
    { name: "GST Registration (3P)", value: "Active", type: "success" },
    { name: "OEM Invoice", value: "Verified", type: "success" },
    { name: "Owner Aadhaar (EKYC)", value: "Verified", type: "success" },
    { name: "Owner PAN", value: "NSDL Match", type: "success" },
    { name: "LOI (Terra, Mahindra)", value: "2/2 Done", type: "success" },
    { name: "Cancelled Cheque", value: "Name Query", type: "warning" },
    { name: "GSTR-9 Turnover", value: "₹52 L", type: "success" },
    { name: "Showroom + Geo-tag", value: "Match", type: "success" },
    { name: "Owner Selfie (Liveness)", value: "96%", type: "success" },
  ];

  const activities = [
    {
      title: "Risk team raised query on bank account name",
      desc: "Today, 08:14 · by Priya Mehta",
      type: "warning",
    },
    {
      title: "Assigned to Risk reviewer",
      desc: "Today, 07:40 · auto-assignment",
      type: "info",
    },
    {
      title: "CIBIL Commercial pulled: 748",
      desc: "12 May, 14:24 · system",
      type: "success",
    },
    {
      title: "All 10 mandatory documents verified",
      desc: "12 May, 14:12 · auto",
      type: "success",
    },
    {
      title: "Application submitted",
      desc: "12 May, 14:08 · by you",
      type: "neutral",
    },
  ];

  return (
    <div className="app-status-page">
      <div className="as-container">
        {/* Header */}
        <div className="as-header">
          <div>
            <p className="as-eyebrow">Dealer Application</p>
            <h1>Application Status</h1>
          </div>

          <div className="as-header-right">
            <span className="as-app-id">DLR-APP-2026-0142</span>
            <button className="as-profile-btn">View Profile</button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="as-summary-grid">
          <div className="as-summary-card">
            <p>Current Stage</p>
            <h3>Under Review</h3>
            <span className="as-orange-text">Risk verification pending</span>
          </div>

          <div className="as-summary-card">
            <p>Application Age</p>
            <h3>18 Hours</h3>
            <span className="as-green-text">Within 24-hour SLA</span>
          </div>

          <div className="as-summary-card">
            <p>CIBIL Commercial</p>
            <h3>748</h3>
            <span className="as-green-text">Good bureau score</span>
          </div>

          <div className="as-summary-card">
            <p>Documents</p>
            <h3>9 / 10</h3>
            <span className="as-orange-text">1 query open</span>
          </div>
        </div>

        {/* Query alert */}
        <div className="as-query-alert">
          <div className="as-alert-icon">!</div>

          <div className="as-alert-content">
            <div className="as-alert-top">
              <span>ACTION NEEDED</span>
              <small>1 of 1 query open</small>
            </div>

            <h2>Bank account name needs your confirmation</h2>

            <p>
              Penny-drop on your cancelled cheque returned account name{" "}
              <b>"RAJESH AUTO SERV"</b>. We need this to match the firm name on
              PAN before we can proceed.
            </p>
          </div>

          <button className="as-primary-btn">Respond Now</button>
        </div>

        {/* Journey */}
        <div className="as-journey-card">
          <div className="as-section-title">
            <h3>Your Application Journey</h3>
            <span>Live tracking</span>
          </div>

          <div className="as-journey">
            {journey.map((item, index) => (
              <div className="as-step" key={index}>
                <div className={`as-step-circle ${item.status}`}>
                  {item.status === "done" ? "✓" : index + 1}
                </div>

                {index !== journey.length - 1 && (
                  <div className={`as-step-line ${item.status}`}></div>
                )}

                <h4>{item.title}</h4>
                <p>{item.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Documents + Activity */}
        <div className="as-main-grid">
          <div className="as-card">
            <div className="as-section-title">
              <h3>Document Verification</h3>
              <span>10 checks</span>
            </div>

            <div className="as-doc-list">
              {documents.map((doc, index) => (
                <div className="as-doc-item" key={index}>
                  <div className="as-doc-item-left">
                    <span className={`as-dot ${doc.type}`}></span>
                    <p>{doc.name}</p>
                  </div>

                  <span className={`as-doc-value ${doc.type}`}>{doc.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="as-card">
            <div className="as-section-title">
              <h3>Activity Log</h3>
              <span>Latest updates</span>
            </div>

            <div className="as-activity-list">
              {activities.map((item, index) => (
                <div className="as-activity-row" key={index}>
                  <span className={`as-activity-dot ${item.type}`}></span>

                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Support footer */}
        <div className="as-support-card">
          <div>
            <h3>Need help with this application?</h3>
            <p>Branch: Ranchi Main · RM: Anil Kumar · +91 9XXX-XXX-201</p>
          </div>

          <button>Call Branch</button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationStatus;
