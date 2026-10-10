import React, { useEffect, useMemo, useState } from "react";
import "../assets/css/style.css";
import { useNavigate } from "react-router-dom";
import { API } from "./api/apiRoutes";
import { getStatusInfo, POST_SANCTION_STAGE_KEYS } from "./utils/leadStatus";

const itemsPerPage = 10;

const SourcingPipeline = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API.CUSTOMERS_STAGE3}?_=${Date.now()}`);
        const data = await res.json();
        if (data.success) {
          setCustomers(data.data || []);
        } else {
          alert(data.message || "Failed to fetch customer list");
        }
      } catch (err) {
        console.error("Customer list API error:", err);
        alert("Error fetching customer list");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const stats = useMemo(() => {
    const fiPending = customers.filter((c) => getStatusInfo(c).key === "fi_pending").length;
    const sanctionPending = customers.filter((c) => getStatusInfo(c).key === "sanction_pending").length;
    const postSanctionPending = customers.filter((c) => POST_SANCTION_STAGE_KEYS.includes(getStatusInfo(c).key)).length;
    const delivered = customers.filter((c) => getStatusInfo(c).key === "delivered").length;

    return [
      { label: "TOTAL LEADS", count: customers.length, color: "#0b5ca8" },
      { label: "FI PENDING", count: fiPending, color: "#555" },
      { label: "SANCTION PENDING", count: sanctionPending, color: "#1d4ed8" },
      { label: "POST SANCTION PENDING", count: postSanctionPending, color: "#5b21b6" },
      { label: "DELIVERED", count: delivered, color: "#166534" },
    ];
  }, [customers]);

  const filteredCustomers = customers.filter((cust) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (cust.application_id || "").toLowerCase().includes(term) ||
      (cust.applicant_name || "").toLowerCase().includes(term) ||
      (cust.applicant_mobile || "").includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "post_sanction_pending"
        ? POST_SANCTION_STAGE_KEYS.includes(getStatusInfo(cust).key)
        : getStatusInfo(cust).key === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleView = (cust) => {
    navigate(`/lead-details/${cust.id}`);
  };

  // Post-sanction is one continuous process for the dealer: e-Mandate & e-Sign
  // (LoanExecution.jsx) must complete first; only then does LoanExecution hand off
  // to Vehicle Delivery. So this button always opens Loan Execution first, not
  // Vehicle Delivery directly.
  const handleAddVehicleDetails = (cust) => {
    navigate(`/loan-execution/${cust.id}`);
  };

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <h3>Sourcing pipeline</h3>
        <p>Rajesh Auto Services</p>
      </div>

      <div className="pipeline-content">
        <div className="pipeline-stats" style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
          {stats.map((item) => (
            <div className="stat-card" key={item.label}>
              <div className="stat-line" style={{ backgroundColor: item.color }}></div>
              <span>{item.label}</span>
              <h2>{item.count}</h2>
            </div>
          ))}
        </div>

        <div className="pipeline-filters">
          <input
            type="text"
            placeholder="Search by Lead ID, customer name, mobile"
            value={searchTerm}
            onChange={handleSearch}
          />

          <select value={statusFilter} onChange={handleStatusFilter}>
            <option value="all">All status</option>
            <option value="fi_pending">FI Pending</option>
            <option value="sanction_pending">Sanction Pending</option>
            <option value="mandate_pending">Mandate Pending</option>
            <option value="post_sanction_pending">Post Sanction Pending</option>
            <option value="delivered">Delivered</option>
          </select>

          <button type="button" onClick={() => alert("Export coming soon")}>
            Export
          </button>
        </div>

        <div className="pipeline-table-box">
          <table className="pipeline-table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Logged</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Loading customers...</td>
                </tr>
              ) : currentCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6}>No leads match your filters.</td>
                </tr>
              ) : (
                currentCustomers.map((cust) => {
                  const status = getStatusInfo(cust);
                  return (
                    <tr key={cust.id}>
                      <td>{cust.application_id}</td>
                      <td>
                        <strong>{cust.applicant_name}</strong>
                        <br />
                        <span>{cust.applicant_mobile}</span>
                      </td>
                      <td>
                        <strong>{cust.manufacturer_name}</strong>
                        <br />
                        <span>{cust.model}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${status.badge}`}>● {status.label}</span>
                      </td>
                      <td>{cust.created_at}</td>
                      <td>
                        <button className="view-btn" onClick={() => handleView(cust)}>
                          View
                        </button>
                        {POST_SANCTION_STAGE_KEYS.includes(status.key) && (
                          <button
                            className="view-btn"
                            style={{ marginLeft: "8px" }}
                            onClick={() => handleAddVehicleDetails(cust)}
                          >
                            Add vehicle details
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="table-footer">
            <p>
              Showing {filteredCustomers.length === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length}
            </p>
            <div className="pagination">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                ‹
              </button>
              <button className="active">{currentPage}</button>
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourcingPipeline;
