import React, { useEffect, useState } from "react";
import "../assets/css/style.css";
import logo from "../assets/image/logowhite.png";
import { useNavigate } from "react-router-dom";
import { API } from "../component/api/apiRoutes"; // You can replace this if needed
import { getStatusInfo } from "./utils/leadStatus";

const HoDashboard = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("dealers"); // "dealers" | "customers"
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [allDealers, setAllDealers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Fetch dealers from API. Customers are also fetched upfront (not just
  // lazily on tab switch) so the FI-approved notification badge is accurate
  // even before HO opens the Customers tab.
  useEffect(() => {
    fetchDealers();
    fetchCustomers();
  }, []);

  const fetchDealers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API.DEALERS}?_=${Date.now()}`);
      const data = await res.json();

      if (data.status === true) {
        setAllDealers(data.data);
      } else {
        alert(data.message || "Failed to fetch dealers");
      }
    } catch (error) {
      console.error("Dealer API Error:", error);
      alert("Error fetching dealer list");
    } finally {
      setLoading(false);
    }
  };

  // Same Stage 3 customer list FIDashboard.jsx shows — fetched lazily, the
  // first time HO switches to the Customers tab.
  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      const res = await fetch(`${API.CUSTOMERS_STAGE3}?_=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setAllCustomers(data.data);
      } else {
        alert(data.message || "Failed to fetch customers");
      }
    } catch (error) {
      console.error("Customer API Error:", error);
      alert("Error fetching customer list");
    } finally {
      setCustomersLoading(false);
    }
  };

  const switchView = (view) => {
    setActiveView(view);
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
    if (view === "customers" && allCustomers.length === 0) fetchCustomers();
  };

  // Filter dealers based on search and status
  const filteredDealers = allDealers.filter((dealer) => {
    const matchesSearch =
      dealer.login_user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dealer.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dealer.created_at.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || dealer.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // HO's Customers tab shows every customer regardless of stage — FI pending,
  // awaiting sanction, sanctioned-but-not-delivered, or delivered (awaiting HO's
  // delivery verification) — so HO can see exactly where each case is stuck.
  const filteredCustomers = allCustomers.filter((cust) => {
    const matchesSearch =
      cust.application_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.applicant_mobile.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || getStatusInfo(cust).key === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    totalDealers: allDealers.length,
    pendingApproval: allDealers.filter(d => d.status.toLowerCase() === "pending").length,
    approved: allDealers.filter(d => d.status.toLowerCase() === "active").length,
    rejected: allDealers.filter(d => d.status.toLowerCase() === "rejected").length,
    pendingVerification: 12,
    liveApplications: 47
  };

  // Counts of customers needing HO action right now — awaiting a sanction
  // decision, or delivered by the dealer and awaiting HO's delivery verification.
  // Shown as a combined notification badge on the Customers tab.
  const sanctionPendingCount = allCustomers.filter((cust) => getStatusInfo(cust).key === "sanction_pending").length;
  const deliveredPendingCount = allCustomers.filter((cust) => getStatusInfo(cust).key === "delivered").length;
  const fiApprovedCount = sanctionPendingCount + deliveredPendingCount;

  // Pagination — driven by whichever list (dealers/customers) is active
  const activeList = activeView === "dealers" ? filteredDealers : filteredCustomers;
  const totalPages = Math.ceil(activeList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDealers = activeView === "dealers" ? activeList.slice(startIndex, endIndex) : [];
  const currentCustomers = activeView === "customers" ? activeList.slice(startIndex, endIndex) : [];

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="dealer-dashboard">
      <div className="top-header">
        <div className="brand">
          <img src={logo} alt="Vedika Logo" className="brand-logo" />
        </div>
        <div className="user-area">
          <span>HO</span>
          <span>Head Office · Admin</span>
          <button onClick={() => navigate('/')}>Sign out</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="welcome-row">
          <div>
            <h2>Good afternoon, Admin</h2>
            <p>
              <span>Head Office Dashboard</span> ·{" "}
              <span>Total dealers: {stats.totalDealers}</span> ·{" "}
              <span>Last login: Today, 09:15 AM</span>
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="filter-bar">
          <button
            className={`page-btn ${activeView === "dealers" ? "active" : ""}`}
            onClick={() => switchView("dealers")}
          >
            Dealers
          </button>
          <button
            className={`page-btn tab-with-badge ${activeView === "customers" ? "active" : ""}`}
            onClick={() => switchView("customers")}
          >
            Customers
            {fiApprovedCount > 0 && (
              <span className="notification-badge">{fiApprovedCount}</span>
            )}
          </button>
        </div>

        {/* Stats Cards */}
        {activeView === "dealers" && (
          <div className="stats-row">
            <div className="stat-card"><p>Total Dealers</p><h3>{stats.totalDealers}</h3></div>
            <div className="stat-card"><p>Pending Approval</p><h3 className="orange">{stats.pendingApproval}</h3></div>
            <div className="stat-card"><p>Active</p><h3 style={{color:"green"}}>{stats.approved}</h3></div>
            <div className="stat-card"><p>Rejected</p><h3 style={{color:"red"}}>{stats.rejected}</h3></div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="filter-bar">
          <input
            type="text"
            placeholder={activeView === "dealers" ? "🔍 Search by ID, name, or date" : "🔍 Search by ID, name, or mobile"}
            value={searchTerm}
            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            className="search-input"
          />
          {activeView === "dealers" ? (
            <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1);}} className="status-filter">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          ) : (
            <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1);}} className="status-filter">
              <option value="all">All Status</option>
              <option value="fi_pending">FI Pending</option>
              <option value="sanction_pending">Sanction Pending</option>
              <option value="mandate_pending">Mandate Pending</option>
              <option value="post_sanction_pending">Post Sanction Pending</option>
              <option value="delivered">Delivered · verify</option>
            </select>
          )}
        </div>

        {/* Dealer Table */}
        {activeView === "dealers" && (
        <div className="recent-table">
          <h3>Dealer Applications {filteredDealers.length > 0 && `(${filteredDealers.length})`}</h3>

          {loading ? <p>Loading dealers...</p> : filteredDealers.length === 0 ? (
            <div className="no-results">No dealers match your filters.</div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Dealer Name</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDealers.map((dealer) => (
                    <tr key={dealer.id}>
                      <td>{dealer.login_user_id}</td>
                      <td>{dealer.owner_name}</td>
                      <td>{dealer.created_at}</td>
                      <td>
                        <span className={`status-badge ${dealer.status.toLowerCase()}`}>
                          {dealer.status.charAt(0).toUpperCase() + dealer.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <button className="view-btn" onClick={() => navigate(`/dealer-details/${dealer.id}`)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="pagination">
                <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="page-btn">« First</button>
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="page-btn">‹ Previous</button>
                <span className="page-info">Page {currentPage} of {totalPages}</span>
                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="page-btn">Next ›</button>
                <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="page-btn">Last »</button>
              </div>
            </>
          )}
        </div>
        )}

        {/* Customer Table */}
        {activeView === "customers" && (
        <div className="recent-table">
          <h3> Customers {filteredCustomers.length > 0 && `(${filteredCustomers.length})`}</h3>

          {customersLoading ? <p>Loading customers...</p> : filteredCustomers.length === 0 ? (
            <div className="no-results">No customers match your filters.</div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Applicant Name</th>
                    <th>Mobile</th>
                    <th>Manufacturer</th>
                    <th>LTV Ratio</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCustomers.map((cust) => (
                    <tr key={cust.id}>
                      <td>{cust.application_id}</td>
                      <td>{cust.applicant_name}</td>
                      <td>{cust.applicant_mobile}</td>
                      <td>{cust.manufacturer_name}</td>
                      <td>{cust.ltv_ratio}%</td>
                      <td>
                        <span className={`status-badge ${getStatusInfo(cust).badge}`}>
                          {getStatusInfo(cust).label}
                        </span>
                      </td>
                      <td>
                        {getStatusInfo(cust).key === "sanction_pending" && (
                          <button className="view-btn" onClick={() => navigate(`/sanction-review/${cust.id}`)}>
                            Go to Sanction
                          </button>
                        )}
                        {getStatusInfo(cust).key === "delivered" && (
                          <button className="view-btn" onClick={() => navigate(`/ho-delivery-verification/${cust.id}`)}>
                            Verify Delivery
                          </button>
                        )}
                        {getStatusInfo(cust).key === "mandate_approved" && (
                          <button className="view-btn" onClick={() => navigate(`/final-review/${cust.id}`)}>
                            Final Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="pagination">
                <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="page-btn">« First</button>
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="page-btn">‹ Previous</button>
                <span className="page-info">Page {currentPage} of {totalPages}</span>
                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="page-btn">Next ›</button>
                <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="page-btn">Last »</button>
              </div>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default HoDashboard;