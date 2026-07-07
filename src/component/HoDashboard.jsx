import React, { useEffect, useState } from "react";
import "../assets/css/style.css";
import logo from "../assets/image/logowhite.png";
import { useNavigate } from "react-router-dom";
import { API } from "../component/api/apiRoutes"; // You can replace this if needed

const HoDashboard = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [allDealers, setAllDealers] = useState([]);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);

  // Fetch dealers from API
  useEffect(() => {
    fetchDealers();
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

  // Filter dealers based on search and status
  const filteredDealers = allDealers.filter((dealer) => {
    const matchesSearch =
      dealer.login_user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dealer.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dealer.created_at.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || dealer.status.toLowerCase() === statusFilter;
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

  // Pagination
  const totalPages = Math.ceil(filteredDealers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDealers = filteredDealers.slice(startIndex, endIndex);

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

        {/* Stats Cards */}
        <div className="stats-row">
          <div className="stat-card"><p>Total Dealers</p><h3>{stats.totalDealers}</h3></div>
          <div className="stat-card"><p>Pending Approval</p><h3 className="orange">{stats.pendingApproval}</h3></div>
          <div className="stat-card"><p>Active</p><h3 style={{color:"green"}}>{stats.approved}</h3></div>
          <div className="stat-card"><p>Rejected</p><h3 style={{color:"red"}}>{stats.rejected}</h3></div>
        </div>
        {/* <div className="stats-row">
          <div className="stat-card"><p>Pending Verification</p><h3 className="orange">{stats.pendingVerification}</h3></div>
          <div className="stat-card"><p>Live Applications</p><h3>{stats.liveApplications}</h3></div>
        </div> */}

        {/* Filter Bar */}
        <div className="filter-bar">
          <input
            type="text"
            placeholder="🔍 Search by ID, name, or date"
            value={searchTerm}
            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            className="search-input"
          />
          <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1);}} className="status-filter">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Dealer Table */}
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
      </div>
    </div>
  );
};

export default HoDashboard;