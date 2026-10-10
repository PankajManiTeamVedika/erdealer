import React, { useEffect, useState } from "react";
import "../assets/css/ApplicationStatus.css";
import { DEALER_API_BASE } from "./api/apiRoutes";

const baseURL = DEALER_API_BASE;
const DEALER_QUERY_STATUS_API = `${baseURL}/public/api/dealer/queries`;
// Backend saves the uploaded file and builds file_url internally.
// Confirm the multipart field name below ("file") with backend dev if this fails.
const DOC_REUPLOAD_API = `${baseURL}/public/api/dealer/document/update`;

const ApplicationStatus = () => {
  const journey = [
    { title: "Submitted", time: "12 May · 14:08", status: "done" },
    { title: "Documents Verified", time: "12 May · 14:12", status: "done" },
    { title: "Bureau & Scrub", time: "12 May · 14:24", status: "done" },
    { title: "Under Review", time: "In progress", status: "active" },
    { title: "Decision", time: "ETA: 6 hrs", status: "pending" },
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

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const [reasonModalDoc, setReasonModalDoc] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null); // { type: "success" | "error", text }

  // ⚠️ Confirm this matches how the dealer's own id is stored after login
  const getDealerId = () => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed.dealer_id || parsed.id || null;
    } catch (e) {
      return null;
    }
  };

  const fetchDocs = async (silent = false) => {
    const dealerId = getDealerId();
    if (!dealerId) {
      console.error("Dealer id not found in localStorage");
      setDocsLoading(false);
      return;
    }
    try {
      if (!silent) setDocsLoading(true);
      const res = await fetch(`${DEALER_QUERY_STATUS_API}/${dealerId}?_ts=${Date.now()}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const result = await res.json();
      if (result.status && Array.isArray(result.data)) {
        const mapped = result.data.map((item) => ({
          doc_id: item.doc_id,
          name: item.document_type,
          document_url: item.document_url,
          reason: item.query,
          status: item.status, // "pending" | "rejected" | "resolved"
          req_status: item.req_status,
          value:
            item.status === "resolved"
              ? "Verified"
              : item.status === "rejected"
              ? "Query"
              : "Pending",
          type:
            item.status === "resolved"
              ? "success"
              : item.status === "rejected"
              ? "warning"
              : "neutral",
        }));
        setDocuments(mapped);
      }
    } catch (err) {
      console.error("Document status fetch error:", err);
    } finally {
      if (!silent) setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Poll while any document is sitting in "Uploaded · Pending Approval" state,
  // so the status updates live once the backend actually approves/rejects it —
  // instead of requiring a manual page reload to see the change.
  useEffect(() => {
    const hasPendingApproval = documents.some(
      (d) => d.req_status === 2 && d.status !== "resolved"
    );
    if (!hasPendingApproval) return;

    const intervalId = setInterval(() => {
      fetchDocs(true); // silent — no loading flash for a background poll
    }, 20000); // 20s

    return () => clearInterval(intervalId);
  }, [documents]);

  const openReasonModal = (doc) => {
    setUploadFile(null);
    setUploadMessage(null);
    setReasonModalDoc(doc);
  };

  const closeReasonModal = () => {
    setReasonModalDoc(null);
    setUploadFile(null);
    setUploadMessage(null);
  };

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0] || null);
  };

  const handleReupload = async () => {
    if (!uploadFile || !reasonModalDoc) return;

    const dealerId = getDealerId();
    if (!dealerId) {
      setUploadMessage({ type: "error", text: "Dealer id not found. Please log in again." });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("dealer_id", dealerId);
      formData.append("doc_id", reasonModalDoc.doc_id);
      // Field name "file" is a guess — confirm with backend (could be "document"/"image").
      formData.append("file", uploadFile);

      const res = await fetch(DOC_REUPLOAD_API, {
        method: "POST",
        body: formData, // no Content-Type header — browser sets multipart boundary
      });

      const data = await res.json();

      if (res.ok && (data.status === true || data.status === "true" || data.success)) {
        // Optimistic update: reflect "uploaded, pending approval" immediately.
        // We don't refetch here — the backend's dealer/queries endpoint may
        // still return the pre-upload req_status for a short window, and a
        // refetch would just overwrite this correct local state with stale data.
        setDocuments((prev) =>
          prev.map((d) =>
            d.doc_id === reasonModalDoc.doc_id ? { ...d, req_status: 2 } : d
          )
        );

        setUploadMessage({
          type: "success",
          text: data.message || "Document re-uploaded successfully",
        });

        // Non-blocking auto-close, instead of alert() which freezes repaint
        // in some browsers until a manual interaction (e.g. DevTools) forces one.
        setTimeout(() => {
          closeReasonModal();
        }, 1200);
      } else {
        console.error("Reupload response:", data);
        setUploadMessage({
          type: "error",
          text: data.message || "Re-upload failed. Check console for backend response.",
        });
      }
    } catch (err) {
      console.error("Document re-upload error:", err);
      setUploadMessage({ type: "error", text: "Server error while uploading document" });
    } finally {
      setUploading(false);
    }
  };

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
            <h3>
              {documents.filter((d) => d.status === "resolved").length} / {documents.length || "—"}
            </h3>
            <span className="as-orange-text">
              {documents.filter((d) => d.status === "rejected").length} query open
            </span>
          </div>
        </div>

        {/* Query alert */}
        <div className="as-query-alert">
          <div className="as-alert-icon">!</div>

          <div className="as-alert-content">
            <div className="as-alert-top">
              <span>ACTION NEEDED</span>
              <small>{documents.filter((d) => d.status === "rejected").length} query open</small>
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
              <span>{documents.length ? `${documents.length} checks` : ""}</span>
            </div>

            <div className="as-doc-list">
              {docsLoading ? (
                <p>Loading documents...</p>
              ) : documents.length === 0 ? (
                <p>No document data available</p>
              ) : (
                documents.map((doc, index) => (
                  <div className="as-doc-item" key={doc.doc_id ?? index}>
                    <div className="as-doc-item-left">
                      <span className={`as-dot ${doc.type}`}></span>
                      <p>{doc.name}</p>
                    </div>

                    <div
                      className="as-doc-item-right"
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      <span className={`as-doc-value ${doc.type}`}>{doc.value}</span>
                      {doc.req_status === 2 && doc.status !== "resolved" ? (
                        <span className="as-doc-value info" style={{ whiteSpace: "nowrap" }}>
                          Uploaded · Pending Approval
                        </span>
                      ) : (
                        <>
                          {doc.status === "rejected" && (
                            <button
                              type="button"
                              className="as-view-reason-btn"
                              onClick={() => openReasonModal(doc)}
                            >
                              View Reason
                            </button>
                          )}
                          {doc.status === "pending" && (
                            <button
                              type="button"
                              className="as-view-reason-btn"
                              onClick={() => openReasonModal(doc)}
                            >
                              Upload
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
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

      {/* Reason + Re-upload Modal */}
      {reasonModalDoc && (
        <div className="modal-overlay" onClick={closeReasonModal}>
          <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeReasonModal}>✕</button>
            <h3>Document Query</h3>
            <p className="cancel-doc-name">{reasonModalDoc.name}</p>
            <p
              style={{
                margin: "12px 0",
                color: reasonModalDoc.status === "pending" ? "#b8860b" : "#c0392b",
              }}
            >
              {reasonModalDoc.status === "pending"
                ? "Your this file is pending. Please upload the document."
                : reasonModalDoc.reason || "No reason provided."}
            </p>

            <div style={{ marginTop: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                Upload corrected document
              </label>
              <input type="file" accept="image/*,.pdf" onChange={handleFileChange} disabled={uploading} />
            </div>

            {uploadMessage && (
              <p
                style={{
                  marginTop: "12px",
                  color: uploadMessage.type === "success" ? "#1e7e34" : "#c0392b",
                  fontWeight: 500,
                }}
              >
                {uploadMessage.text}
              </p>
            )}

            <div className="modal-buttons">
              <button className="modal-cancel" onClick={closeReasonModal}>Close</button>
              <button
                className="modal-submit"
                onClick={handleReupload}
                disabled={!uploadFile || uploading || uploadMessage?.type === "success"}
              >
                {uploading ? "Uploading..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationStatus;
