import React from "react";
import "../assets/css/style.css";

const SourcingPipeline = () => {
  const stats = [
    { label: "DRAFT", count: 4, color: "#555" },
    { label: "EKYC PENDING", count: 3, color: "#d28a22" },
    { label: "BUREAU", count: 2, color: "#0b5ca8" },
    { label: "IN SWATAH", count: 9, color: "#4b2fad" },
    { label: "APPROVED", count: 98, color: "#008060" },
    { label: "REJECTED", count: 26, color: "#c62828" },
  ];

  const leads = [
    {
      id: "VED-7184-2026",
      customer: "Suresh Kumar",
      mobile: "98XXXX4521",
      vehicle: "Terra Motors",
      model: "Power Plus",
      status: "Approved",
      badge: "approved",
      logged: "Today, 11:24",
    },
    {
      id: "VED-7183-2026",
      customer: "Anita Devi",
      mobile: "99XXXX7812",
      vehicle: "Mahindra Treo",
      model: "Zor Plus",
      status: "In Swatah · UW",
      badge: "swatah",
      logged: "Today, 10:08",
    },
    {
      id: "VED-7181-2026",
      customer: "Mohd. Imran",
      mobile: "97XXXX1190",
      vehicle: "YC Electric",
      model: "Yatri Super",
      status: "Bureau check",
      badge: "bureau",
      logged: "Today, 09:52",
    },
    {
      id: "VED-7179-2026",
      customer: "Rakesh Mahto",
      mobile: "88XXXX3344",
      vehicle: "Terra Motors",
      model: "Power Plus",
      status: "EKYC pending",
      badge: "ekyc",
      logged: "Yesterday, 17:30",
    },
    {
      id: "VED-7176-2026",
      customer: "Priya Singh",
      mobile: "96XXXX5577",
      vehicle: "Mahindra Treo",
      model: "Treo Plus",
      status: "Rejected · Scrub",
      badge: "rejected",
      logged: "Yesterday, 14:12",
    },
    {
      id: "VED-7174-2026",
      customer: "Vinod Yadav",
      mobile: "90XXXX2233",
      vehicle: "Terra Motors",
      model: "Power Plus",
      status: "Draft",
      badge: "draft",
      logged: "Yesterday, 11:05",
    },
  ];

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <h3>Sourcing pipeline</h3>
        <p>Rajesh Auto Services</p>
      </div>

      <div className="pipeline-content">
        <div className="pipeline-stats">
          {stats.map((item) => (
            <div className="stat-card" key={item.label}>
              <div
                className="stat-line"
                style={{ backgroundColor: item.color }}
              ></div>
              <span>{item.label}</span>
              <h2>{item.count}</h2>
            </div>
          ))}
        </div>

        <div className="pipeline-filters">
          <input
            type="text"
            placeholder="Search by Lead ID, customer name, mobile"
          />

          <select>
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>This month</option>
          </select>

          <select>
            <option>All status</option>
            <option>Approved</option>
            <option>Rejected</option>
            <option>Draft</option>
          </select>

          <button>Export</button>
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
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.id}</td>
                  <td>
                    <strong>{lead.customer}</strong>
                    <br />
                    <span>{lead.mobile}</span>
                  </td>
                  <td>
                    <strong>{lead.vehicle}</strong>
                    <br />
                    <span>{lead.model}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${lead.badge}`}>
                      ● {lead.status}
                    </span>
                  </td>
                  <td>{lead.logged}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="table-footer">
            <p>Showing 1–6 of 142</p>
            <div className="pagination">
              <button>‹</button>
              <button className="active">1</button>
              <button>2</button>
              <button>›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourcingPipeline;