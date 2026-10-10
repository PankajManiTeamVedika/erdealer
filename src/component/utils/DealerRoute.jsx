import React from "react";
import { Navigate } from "react-router-dom";

// Guards customer-onboarding pages (Applicant Verification, Document Collection,
// Offer Summary) so they only render for a logged-in Dealer — not HO/FI, and not
// via a direct URL hit with no session at all.
const DealerRoute = ({ children }) => {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user || (user.role || "").toLowerCase() !== "dealer") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default DealerRoute;
