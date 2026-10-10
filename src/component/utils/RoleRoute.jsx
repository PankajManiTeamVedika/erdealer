import React from "react";
import { Navigate } from "react-router-dom";

// Guards FI/HO pages so they only render for a logged-in user whose role is in
// the allowed list — same pattern as DealerRoute.jsx, generalized to any role set.
// Anyone hitting the URL directly without a matching session is bounced to "/".
const RoleRoute = ({ roles, children }) => {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userRole = (user?.role || "").toLowerCase();
  const allowedRoles = roles.map((role) => role.toLowerCase());

  if (!user || !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;
