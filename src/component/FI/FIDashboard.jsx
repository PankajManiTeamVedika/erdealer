import React, { useEffect, useState } from "react";
import "../../assets/css/style.css";
import logo from "../../assets/image/logowhite.png";
import { useNavigate } from "react-router-dom";
import { API } from "../api/apiRoutes";
import { getStatusInfo } from "../utils/leadStatus";

const FIDashboard = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  // Fetch customers from Stage 3 API
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // Use your API route or the full URL
      const res = await fetch(`${API.CUSTOMERS_STAGE3}?_=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      } else {
        alert(data.message || "Failed to fetch customers");
      }
    } catch (error) {
      console.error("Customer API Error:", error);
      alert("Error fetching customer list");
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search and funnel stage (fi_status + sanction_status +
  // vehicle_delevery_status + mandate_status, via the shared getStatusInfo helper)
  const filteredCustomers = customers.filter((cust) => {
    const matchesSearch =
      cust.application_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.applicant_mobile.includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" || getStatusInfo(cust).key === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: customers.length,
    submitted: customers.filter(c => c.application_status === "SUBMITTED").length,
    // You can add more stats based on other fields if needed
  };

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Reset page on filter change
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="dealer-dashboard">
      {/* Header */}
      <div className="top-header">
        <div className="brand">
          <img src={logo} alt="Vedika Logo" className="brand-logo" />
        </div>
        <div className="user-area">
          <span>FI</span>
          <span>Field Investigation · Stage 3</span>
          <button onClick={() => navigate('/')}>Sign out</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="welcome-row">
          <div>
            <h2>Good afternoon, FI</h2>
            <p>
              <span>Stage 3 Customers Dashboard</span> ·{" "}
              <span>Total customers: {stats.total}</span> ·{" "}
              <span>Last login: Today, 09:15 AM</span>
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-row">
          <div className="stat-card">
            <p>Total Customers</p>
            <h3>{stats.total}</h3>
          </div>
          <div className="stat-card">
            <p>Submitted</p>
            <h3 >{stats.submitted}</h3>
          </div>
          {/* Add more stats if needed */}
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <input
            type="text"
            placeholder="🔍 Search by ID, name, or mobile"
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          <select value={statusFilter} onChange={handleStatusFilter} className="status-filter">
            <option value="all">All Status</option>
            <option value="fi_pending">FI Pending</option>
            <option value="sanction_pending">Sanction Pending</option>
            <option value="mandate_pending">Mandate Pending</option>
            <option value="post_sanction_pending">Post Sanction Pending</option>
            <option value="delivered">Vehicle Added - Pending HO Approval</option>
            <option value="mandate_approved">Mandate Approved</option>
          </select>
        </div>

        {/* Customer Table */}
        <div className="recent-table">
          <h3>Stage 3 Customers {filteredCustomers.length > 0 && `(${filteredCustomers.length})`}</h3>

          {loading ? (
            <p>Loading customers...</p>
          ) : filteredCustomers.length === 0 ? (
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
                  {currentCustomers.map((cust) => {
                    const stage = getStatusInfo(cust);
                    return (
                      <tr key={cust.id}>
                        <td>{cust.application_id}</td>
                        <td>{cust.applicant_name}</td>
                        <td>{cust.applicant_mobile}</td>
                        <td>{cust.manufacturer_name}</td>
                        <td>{cust.ltv_ratio}%</td>
                        <td>
                          <span className={`status-badge ${stage.badge}`}>{stage.label}</span>
                        </td>
                        <td>
                          <button
                            className="view-btn"
                            onClick={() => navigate(`/customer-details/${cust.id}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="pagination">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  « First
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  ‹ Previous
                </button>
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  Next ›
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  Last »
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FIDashboard;