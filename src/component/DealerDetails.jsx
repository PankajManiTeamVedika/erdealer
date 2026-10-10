import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../assets/css/DealerDetails.css";
import logo from "../assets/image/logowhite.png";
import { API, DEALER_API_BASE } from "../component/api/apiRoutes";
import { parseStoredJson } from "./utils/parseStoredJson";
import { buildDealerAgreementHtml, withStampPaperPage } from "./utils/dealerAgreement";

const baseURL = DEALER_API_BASE;
const DEALER_QUERIES_API = `${baseURL}/public/api/dealer-queries`;
const DEALER_QUERY_STATUS_API = `${baseURL}/public/api/dealer/queries`;

const DealerDetails = () => {
  const { dealerId } = useParams();
  const navigate = useNavigate();
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState({});
  const [cancelDocIdx, setCancelDocIdx] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelledDocs, setCancelledDocs] = useState({});
  const [docStatusMap, setDocStatusMap] = useState({}); // { [idx]: "pending" | "rejected" | "resolved" }
  const [stampPaperDataUrl, setStampPaperDataUrl] = useState(null);
  const [stampPaperName, setStampPaperName] = useState("");
  const [agreementMessage, setAgreementMessage] = useState(null); // { type: "success" | "error", text }
  // Gates the Approve button — HO must generate the Dealer Agreement at least once
  // before a dealer can be approved.
  const [agreementGenerated, setAgreementGenerated] = useState(false);

  useEffect(() => {
    const fetchDealer = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API.DEALERS}/${dealerId}`);
        const result = await res.json();
        console.log("Dealer API response:", result);
        if (result.status) {
          setDealer(result.data);
        } else {
          alert(result.message || "Dealer not found");
        }
      } catch (err) {
        console.error("Dealer fetch error:", err);
        alert("Failed to fetch dealer details");
      } finally {
        setLoading(false);
      }
    };
    fetchDealer();
  }, [dealerId]);

  // Fetch existing document verification statuses and initialize checkbox/cancel state
  useEffect(() => {
    const fetchDocStatuses = async () => {
      if (!dealer?.documents?.length) return;
      try {
        // cache: "no-store" + a timestamp query param stop the browser from
        // serving a stale cached response for this GET request. We deliberately
        // do NOT add Cache-Control/Pragma as request headers here — those
        // trigger a CORS preflight (OPTIONS) request that this backend
        // doesn't allow, which breaks the fetch entirely with
        // "TypeError: Failed to fetch".
        const res = await fetch(`${DEALER_QUERY_STATUS_API}/${dealerId}?_ts=${Date.now()}`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const result = await res.json();

        const statusByDocId = {};
        if (result.status && Array.isArray(result.data)) {
          result.data.forEach((item) => {
            statusByDocId[item.doc_id] = { status: item.status, query: item.query };
          });
        }

        const newChecked = {};
        const newCancelled = {};
        const newStatusMap = {};

        dealer.documents.forEach((doc, idx) => {
          const entry = statusByDocId[doc.id];
          const status = entry?.status || "pending";
          newStatusMap[idx] = status;

          if (status === "resolved") {
            newChecked[idx] = true;
          } else if (status === "rejected") {
            newCancelled[idx] = { reason: entry?.query || "" };
          }
        });

        setCheckedDocs(newChecked);
        setCancelledDocs(newCancelled);
        setDocStatusMap(newStatusMap);
      } catch (err) {
        console.error("Doc status fetch error:", err);
      }
    };
    fetchDocStatuses();
  }, [dealer, dealerId]);

  const handleApprove = async () => {
    if (!dealer) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API.DEALERS}/${dealer.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      const data = await res.json();
      if (data.status) {
        alert(`Dealer approved successfully`);
        setDealer(prev => ({ ...prev, status: 'ACTIVE' }));
      } else {
        alert(data.message || "Approval failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!dealer) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`${API.DEALERS}/${dealer.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' })
      });
      const data = await res.json();
      if (data.status) {
        alert(`Dealer rejected successfully`);
        setDealer(prev => ({ ...prev, status: 'REJECTED' }));
      } else {
        alert(data.message || "Rejection failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleBlock = () => {
    setActionInProgress(true);
    setTimeout(() => {
      alert(`Dealer ${dealer.login_user_id} has been blocked.`);
      setActionInProgress(false);
      navigate("/ho-dashboard");
    }, 1000);
  };

  // Reads the manually-uploaded stamp paper (the government e-Stamp receipt — has to be
  // purchased per-agreement, can't be generated here) into a data URL, entirely
  // client-side. Nothing is uploaded to any backend — no confirmed endpoint exists for
  // storing it, and it's only needed for this one generation.
  const handleStampPaperUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAgreementMessage(null);
    setStampPaperName(file.name);
    const reader = new FileReader();
    reader.onload = () => setStampPaperDataUrl(reader.result);
    reader.onerror = () => setAgreementMessage({ type: "error", text: "Could not read the stamp paper file." });
    reader.readAsDataURL(file);
  };

  // Opens the Business Tie-Up Agreement (dealer's name/address/entity type filled in
  // dynamically) in a new tab, with the uploaded stamp paper as its first page if one
  // was provided, then triggers the print dialog so HO can "Save as PDF" — same
  // no-extra-dependency approach as the sanction letter in SanctionReview.jsx.
  // Stamp paper is optional: GALAXY_VISION.pdf (a real, previously-generated agreement)
  // is the pure 11-page agreement with no stamp page at all — a valid document on its
  // own, e.g. for review before the e-Stamp is purchased. RUDRA TRADERS_merged
  // Agreement.pdf shows the other case, stamp page merged in as page 1.
  const handleGenerateAgreement = () => {
    setAgreementMessage(null);

    const agreementHtml = buildDealerAgreementHtml(dealer);
    const fullHtml = withStampPaperPage(agreementHtml, stampPaperDataUrl);

    const win = window.open("", "_blank");
    if (!win) {
      setAgreementMessage({ type: "error", text: "Please allow pop-ups for this site to generate the agreement." });
      return;
    }
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
    setAgreementGenerated(true);
  };

  // No WhatsApp Business API is wired up anywhere in this app (adding one from the
  // browser would mean shipping the API secret in client-side JS, which is unsafe) —
  // this opens a wa.me chat with the dealer's own contact number pre-filled with a
  // message, same pattern as the sanction letter's "Share on WhatsApp" in
  // SanctionReview.jsx. The PDF just generated above must be attached manually — wa.me
  // links can't auto-attach a file without a backend WhatsApp API integration.
  const handleShareAgreement = () => {
    setAgreementMessage(null);
    const rawMobile = (dealer?.owner_contact || "").replace(/\D/g, "");
    if (!rawMobile) {
      setAgreementMessage({ type: "error", text: "Dealer's mobile number not found." });
      return;
    }
    const phone = rawMobile.length === 10 ? `91${rawMobile}` : rawMobile;
    const dealerName = dealer?.legal_name || dealer?.showroom_name || "Dealer";
    const message = `Business Tie-Up Agreement for ${dealerName} is ready. Please attach the PDF you just saved from "Generate agreement" to this chat.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const getHoId = () => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw).profile_id;
    } catch (e) {
      return null;
    }
  };

  const hasDocActivity =
    Object.values(checkedDocs).some(Boolean) ||
    Object.keys(cancelledDocs).length > 0;

  // Sends the doc verification/cancel state for every document in one request
  const handleAssignToDealer = async () => {
    if (!dealer?.documents?.length) {
      navigate(`/ho-dashboard`);
      return;
    }

    if (!hasDocActivity) {
      alert("Please verify or cancel at least one document before assigning.");
      return;
    }

    const hoId = getHoId();

    if (!hoId) {
      console.log("localStorage contents:", { ...localStorage });
      alert("HO user id not found. Please log in again.");
      return;
    }

    const payload = dealer.documents.map((doc, idx) => {
      const isCancelled = !!cancelledDocs[idx];
      const isVerified = !!checkedDocs[idx];
      return {
        doc_id: doc.id,
        ho_id: Number(hoId),
        dealer_id: Number(dealerId),
        status: isCancelled ? "rejected" : isVerified ? "resolved" : "pending",
        query: isCancelled ? cancelledDocs[idx].reason : "",
      };
    });

    setActionInProgress(true);
    try {
      const res = await fetch(DEALER_QUERIES_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // अय्यर… वेणुगोपाल अय्यर… मुथुस्वामी वेणुगोपl अय्यर… चिन्नास्वामी मुथुस्वामी वेणुगोपl अय्यर… पेरम्बदूर चिन्नास्वामी मुथुस्वामी वेणुगोपl अय्यर।
      const data = await res.json();
      if (data.status) {
        alert(data.message || "Queries saved successfully");
        navigate(`/ho-dashboard`);
      } else {
        alert(data.message || "Failed to save document queries");
      }
    } catch (err) {
      console.error("Dealer queries save error:", err);
      alert("Server error while saving document queries");
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) return <div className="loading">Loading dealer details...</div>;
  if (!dealer) return <div className="error">Dealer not found.</div>;

  // *_verify_status / *_verified columns come back as booleans or as the
  // "true"/"false" strings the onboarding form submits them as — normalize both.
  const isVerifiedFlag = (value) => value === true || value === "true" || value === 1 || value === "1";

  const gstVerified = isVerifiedFlag(dealer.gstin_verify_status);
  const gstResult = parseStoredJson(dealer.gstin_verify_response)?.result || {};
  const gstTaxpayer = gstResult.taxpayerDetails || {};
  const gstAddress = gstResult.business_places?.pradr?.adr || "";
  const gstGoods = gstResult.goods_service?.bzgddtls || [];
  const gstLatestFiling = gstResult.taxpayerReturnDetails?.filingStatus?.[0];

  const pennyDropVerified = isVerifiedFlag(dealer.bank_penny_drop_verified);
  const pennyDropData = parseStoredJson(dealer.bank_penny_drop_response)?.data || {};

  let displayStatus = dealer.status?.toLowerCase();
  if (displayStatus === "active") displayStatus = "approved";
  const statusClass = displayStatus || "pending";
  const isPending = displayStatus === "pending";

  const uploadedCount = dealer.documents?.length || 0;

  const getFullUrl = (url) => {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    return `${baseURL}/${url}`;
  };

  const toggleDocChecked = (idx) => {
    setCheckedDocs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const openCancelModal = (idx) => {
    setCancelReason(cancelledDocs[idx]?.reason || "");
    setCancelDocIdx(idx);
  };

  const closeCancelModal = () => {
    setCancelDocIdx(null);
    setCancelReason("");
  };

  const confirmCancelDoc = () => {
    if (!cancelReason.trim()) return;
    setCancelledDocs((prev) => ({ ...prev, [cancelDocIdx]: { reason: cancelReason.trim() } }));
    setCheckedDocs((prev) => ({ ...prev, [cancelDocIdx]: false }));
    setDocStatusMap((prev) => ({ ...prev, [cancelDocIdx]: "rejected" }));
    closeCancelModal();
  };

  return (
    <div className="dealer-details-page">
      <div className="corner-bubbles">
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
        <div className="bubble bubble-4"></div>
        <div className="bubble bubble-5"></div>
        <div className="bubble bubble-6"></div>
      </div>

      <div className="page-header">
        <div className="header-content">
          <div className="logo-area">
            <img src={logo} alt="Vedika" className="header-logo" />
            <div>
              <h1>Dealer Details</h1>
              <p>Application ID: {dealer.login_user_id}</p>
            </div>
          </div>
          <div className="status-badge large">
            Status:{" "}
            <strong className={statusClass}>
              {displayStatus === "approved" ? "APPROVED" : displayStatus?.toUpperCase()}
            </strong>
          </div>
        </div>
      </div>

      <div className="details-layout">
        <div className="details-left">
          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">1</span><h3>Dealer Location Details</h3></div>
            <div className="info-row"><span className="label">State:</span><span>{dealer.state || "—"}</span></div>
            <div className="info-row"><span className="label">District:</span><span>{dealer.district || "—"}</span></div>
            <div className="info-row"><span className="label">Branch:</span><span>{dealer.branch || "—"}</span></div>
            <div className="info-row"><span className="label">Manufacturer Name:</span><span>{dealer.manufacturer_name || "—"}</span></div>
          </div>

          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">2</span><h3>Firm & Owner Details</h3></div>
            <div className="info-row"><span className="label">Legal Name:</span><span>{dealer.legal_name || dealer.showroom_name || "—"}</span></div>
            <div className="info-row"><span className="label">Entity Type:</span><span>{dealer.firm_type || "—"}</span></div>
            <div className="info-row"><span className="label">Year of Business:</span><span>{dealer.year_of_business || "—"}</span></div>
            <div className="info-row"><span className="label">Firm PAN:</span><span>{dealer.firm_pan || "—"}</span></div>
            <div className="info-row"><span className="label">GST Number:</span><span>{dealer.gst_number || "—"}</span></div>
            <div className="info-row"><span className="label">Showroom Address:</span><span>{dealer.showroom_address || dealer.address || "—"}</span></div>
            <div className="info-row"><span className="label">Owner Name:</span><span>{dealer.owner_name || "—"}</span></div>
            <div className="info-row"><span className="label">Owner PAN:</span><span>{dealer.owner_pan || "—"}</span></div>
            <div className="info-row"><span className="label">Owner Contact:</span><span>+91 {dealer.owner_contact || "—"}</span></div>
            <div className="info-row"><span className="label">Owner Email:</span><span>{dealer.owner_email || "—"}</span></div>
            <div className="info-row"><span className="label">Owner Aadhaar:</span><span>{dealer.owner_aadhaar || "—"}</span></div>
          </div>

          <div className="info-card compact-card">
            <div className="step-header"><h3>GST Verification (GSTN)</h3></div>
            {gstVerified && gstTaxpayer.gstin ? (
              <>
                <div className="info-row"><span className="label">Legal Name:</span><span>{gstTaxpayer.lgnm || "—"}</span></div>
                <div className="info-row"><span className="label">Trade Name:</span><span>{gstTaxpayer.tradeNam || "—"}</span></div>
                <div className="info-row"><span className="label">GSTIN:</span><span>{gstTaxpayer.gstin || "—"}</span></div>
                <div className="info-row"><span className="label">Constitution:</span><span>{gstTaxpayer.ctb || "—"}</span></div>
                <div className="info-row">
                  <span className="label">GST Status:</span>
                  <span className={gstTaxpayer.sts === "Active" ? "approved-badge" : "cancelled-badge"}>
                    {gstTaxpayer.sts || "—"}
                  </span>
                </div>
                <div className="info-row"><span className="label">Registration Date:</span><span>{gstTaxpayer.rgdt || "—"}</span></div>
                <div className="info-row"><span className="label">Aadhaar Linked:</span><span>{gstTaxpayer.adhrVFlag || "—"}</span></div>
                <div className="info-row"><span className="label">Nature of Business:</span><span>{(gstTaxpayer.nba || []).join(", ") || "—"}</span></div>
                <div className="info-row">
                  <span className="label">Aggregate Turnover:</span>
                  <span>
                    {gstTaxpayer.aggreTurnOver || gstTaxpayer.gti || "—"}
                    {(gstTaxpayer.aggreTurnOverFY || gstTaxpayer.gtiFY) &&
                      ` (FY ${gstTaxpayer.aggreTurnOverFY || gstTaxpayer.gtiFY})`}
                  </span>
                </div>
                <div className="info-row"><span className="label">Registered Address:</span><span>{gstAddress || "—"}</span></div>
                {gstLatestFiling && (
                  <div className="info-row">
                    <span className="label">Latest Return Filed:</span>
                    <span>{gstLatestFiling.rtntype} · {gstLatestFiling.taxp} {gstLatestFiling.fy} · {gstLatestFiling.status}</span>
                  </div>
                )}
                {gstGoods.length > 0 && (
                  <div className="info-row">
                    <span className="label">Goods/Services:</span>
                    <ul className="gst-goods-list">
                      {gstGoods.slice(0, 3).map((g, idx) => (
                        <li key={idx}>{g.gdes} {g.hsncd && `(HSN ${g.hsncd})`}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="no-docs">GST not verified</p>
            )}
          </div>

          <div className="info-card">
            <div className="step-header"><span className="step-num">3</span><h3>Document Upload Checklist</h3></div>
            {dealer.documents && dealer.documents.length > 0 ? (
              <>
                <div className="doc-verify-summary">
                  {Object.values(checkedDocs).filter(Boolean).length} of {dealer.documents.length} documents verified
                </div>
                <div className="doc-list">
                {dealer.documents.map((doc, idx) => {
                  const status = docStatusMap[idx] || "pending";
                  const isResolved = status === "resolved";
                  const isRejected = status === "rejected";

                  return (
                    <div key={idx} className={`doc-item ${!checkedDocs[idx] ? "doc-unverified" : ""}`}>
                      <label className={`check-line doc-check ${isRejected ? "doc-check-disabled" : ""}`}>
                        <input
                          type="checkbox"
                          checked={!!checkedDocs[idx]}
                          onChange={() => toggleDocChecked(idx)}
                          disabled={isRejected || isResolved}
                        />
                        <span>{doc.document_type}:</span>
                      </label>
                      <div className="doc-item-right">
                        {isRejected ? (
                          <span className="cancelled-badge" title={cancelledDocs[idx]?.reason}>Cancelled</span>
                        ) : isResolved ? (
                          <span className="approved-badge">Approved</span>
                        ) : (
                          !checkedDocs[idx] && <span className="not-verified-badge">Not Verified</span>
                        )}
                        {doc.document_url?.endsWith(".pdf") ? (
                          <a href={getFullUrl(doc.document_url)} target="_blank" rel="noopener noreferrer" className="doc-link">
                            📄 View PDF
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="image-preview-btn"
                            onClick={() => {
                              setImageLoading(true);
                              setPreviewImage(getFullUrl(doc.document_url));
                            }}
                          >
                            🖼️ View Image
                          </button>
                        )}
                        {status === "pending" && !checkedDocs[idx] && (
                          <button
                            type="button"
                            className="doc-cancel-btn"
                            onClick={() => openCancelModal(idx)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </>
            ) : (
              <p className="no-docs">No documents uploaded</p>
            )}
          </div>

          <div className="info-card compact-card">
            <div className="step-header"><span className="step-num">4</span><h3>Bank Verification</h3></div>
            <div className="info-row"><span className="label">Account Number:</span><span>{dealer.bank_account || "—"}</span></div>
            <div className="info-row"><span className="label">IFSC Code:</span><span>{dealer.ifsc_code || "—"}</span></div>
            <div className="info-row"><span className="label">Bank Name:</span><span>{dealer.bank_name || "—"}</span></div>
            {pennyDropVerified && pennyDropData.verified ? (
              <>
                <div className="info-row">
                  <span className="label">Penny Drop Status:</span>
                  <span className="approved-badge">Verified</span>
                </div>
                <div className="info-row"><span className="label">Beneficiary Name:</span><span>{pennyDropData.beneficiary_name_with_bank || "—"}</span></div>
                <div className="info-row"><span className="label">Verified At:</span><span>{pennyDropData.verified_at || "—"}</span></div>
                <div className="info-row"><span className="label">Validation Mode:</span><span>{pennyDropData.validation_mode || "—"}</span></div>
              </>
            ) : (
              <div className="info-row">
                <span className="label">Penny Drop Status:</span>
                <span className="not-verified-badge">Not Verified</span>
              </div>
            )}
          </div>

          <div className="info-card">
            <div className="step-header"><span className="step-num">5</span><h3>Declaration & Consent</h3></div>
            <div className="consent-list">
              <div className="consent-item">✓ I confirm all uploaded documents are genuine, current and belong to the applicant firm.</div>
              <div className="consent-item">✓ I authorize Vedika to verify KYC, conduct CIBIL commercial bureau pull and perform penny-drop on the bank account.</div>
              <div className="consent-item">✓ I agree to source only the manufacturer and models for which I have valid employment with Vedika.</div>
              <div className="consent-item">✓ I consent to Vedika dealer code of conduct, data privacy terms and field re-verification at any time.</div>
            </div>
          </div>
        </div>

        <div className="details-right">
          <div className="progress-card">
            <h3>APPLICATION PROGRESS</h3>
            <ul>
              <li><span className="green"></span> Dealer details</li>
              <li><span className={uploadedCount > 0 ? "green" : "amber"}></span> Documents uploaded</li>
              <li><span className={dealer.bank_account ? "green" : "gray"}></span> Bank verification</li>
              <li><span className="green"></span> Declaration</li>
              <li><span className={!isPending ? "green" : "gray"}></span> Final approval</li>
            </ul>
          </div>

          <div className="info-card">
              <h3>Dealer Agreement</h3>
              <p className="field-note">
                Business Tie-Up Agreement for {dealer.legal_name || dealer.showroom_name || "this dealer"}, generated with
                the dealer's current details. Stamp paper is optional — upload it to include as the agreement's first
                page, or generate without it (e.g. for review before the e-Stamp is purchased). The new tab opens the
                print dialog so you can "Save as PDF".
              </p>
              <div className="info-row">
                <span className="label">Stamp paper:</span>
                <span>
                  <input type="file" accept="image/*,application/pdf" onChange={handleStampPaperUpload} />
                  {stampPaperName && <span style={{ marginLeft: "8px" }}>✓ {stampPaperName}</span>}
                </span>
              </div>
              <div className="action-buttons" style={{ marginTop: "8px" }}>
                <button type="button" className="approve-btn" onClick={handleGenerateAgreement}>
                  Generate agreement (PDF)
                </button>
                <button type="button" className="approve-btn" onClick={handleShareAgreement}>
                  Share agreement (WhatsApp)
                </button>
              </div>
              {agreementMessage && (
                <small
                  className="field-note"
                  style={{ color: agreementMessage.type === "success" ? "#1e7e34" : "#c0392b", display: "block", marginTop: "8px" }}
                >
                  {agreementMessage.text}
                </small>
              )}
          </div>

          <div className="action-buttons">
            <button
              className="back-btn"
              onClick={handleAssignToDealer}
              disabled={actionInProgress || !hasDocActivity}
              title={!hasDocActivity ? "Verify or cancel at least one document first" : ""}
            >
              {actionInProgress ? "Saving..." : "← Assign to Dealer"}
            </button>

            {dealer.status.toLowerCase() === 'pending' ? (
              <>
                <div className="approve-reject">
                  <button
                    className="reject-btn"
                    onClick={handleReject}
                    disabled={actionInProgress}
                  >
                    Reject
                  </button>
                  <button
                    className="approve-btn"
                    onClick={handleApprove}
                    disabled={actionInProgress || !agreementGenerated}
                    title={!agreementGenerated ? "Generate the Dealer Agreement first" : ""}
                  >
                    Approve
                  </button>
                </div>
                {!agreementGenerated && (
                  <p className="field-note" style={{ color: "#c0392b" }}>
                    Generate the Dealer Agreement above before this dealer can be approved.
                  </p>
                )}
              </>
            ) : (
              <button
                className="block-btn"
                onClick={() => alert("Block action placeholder")}
                disabled={actionInProgress}
              >
                Block Dealer
              </button>
            )}
          </div>
        </div>
      </div>

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

      {cancelDocIdx !== null && (
        <div className="modal-overlay" onClick={closeCancelModal}>
          <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeCancelModal}>✕</button>
            <h3>Cancel Document</h3>
            <p className="cancel-doc-name">{dealer.documents[cancelDocIdx]?.document_type}</p>
            <textarea
              className="cancel-reason-input"
              placeholder="Enter reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="modal-buttons">
              <button className="modal-cancel" onClick={closeCancelModal}>Close</button>
              <button
                className="modal-submit"
                onClick={confirmCancelDoc}
                disabled={!cancelReason.trim()}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerDetails;
