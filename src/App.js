import React from "react";
import Login from "./component/Login";
import { Route, Routes } from "react-router-dom";
import DealerOnboardingForm from "./component/DealerOnboardingForm";
import OtpVerify from "./component/OtpVerify";
import DealerDashboard from "./component/DealerDashboard";
import SourcingPipeline from "./component/SourcingPipeline";
import LeadDetails from "./component/LeadDetails";
import ApplicationStatus from "./component/ApplicationStatus";
import ApplicantVerification from "./component/CustomerOnboarding/ApplicantVerification";
import DocumentCollection from "./component/CustomerOnboarding/DocumentCollection";
import OfferSummary from "./component/CustomerOnboarding/OfferSummary";
import SanctionReview from "./component/FI/SanctionReview";
import VehicleDelivery from "./component/VehicleDelivery";
import HoDashboard from "./component/HoDashboard";
import DealerDetails from "./component/DealerDetails";
import FIDashboard from "./component/FI/FIDashboard";
import CustomerDetails from "./component/FI/CustomerDetails";
import LoanExecution from "./component/LoanExecution";
import HODeliveryVerification from "./component/HODeliveryVerification";
import FinalReview from "./component/FI/FinalReview";
import DealerRoute from "./component/utils/DealerRoute";
import RoleRoute from "./component/utils/RoleRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dealer-onboarding" element={<DealerOnboardingForm />} />
      <Route path="/otp-verify" element={<OtpVerify />} />
      <Route path="/dealer-dashboard" element={<RoleRoute roles={["dealer"]}><DealerDashboard /></RoleRoute>} />
      <Route path="/ho-dashboard" element={<RoleRoute roles={["HO"]}><HoDashboard /></RoleRoute>} />
      <Route path="/sourcing-pipeline" element={<RoleRoute roles={["dealer"]}><SourcingPipeline /></RoleRoute>} />
      <Route path="/lead-details/:customerId" element={<RoleRoute roles={["dealer"]}><LeadDetails /></RoleRoute>} />
      <Route path="/application-status" element={<RoleRoute roles={["dealer"]}><ApplicationStatus /></RoleRoute>} />
      <Route path="/applicant-verification" element={<DealerRoute><ApplicantVerification /></DealerRoute>} />
      <Route path="/document-collection" element={<DealerRoute><DocumentCollection /></DealerRoute>} />
      <Route path="/offer-summary" element={<DealerRoute><OfferSummary /></DealerRoute>} />
      <Route path="/sanction-review/:customerId?" element={<RoleRoute roles={["HO", "FI"]}><SanctionReview /></RoleRoute>} />
      <Route path="/vehicle-delivery/:customerId?" element={<RoleRoute roles={["dealer"]}><VehicleDelivery /></RoleRoute>} />
      <Route path="/dealer-details/:dealerId" element={<RoleRoute roles={["HO"]}><DealerDetails /></RoleRoute>} />
      <Route path="/fi-dashboard" element={<RoleRoute roles={["FI"]}><FIDashboard /></RoleRoute>} />
      <Route path="/customer-details/:customerId" element={<RoleRoute roles={["FI"]}><CustomerDetails /></RoleRoute>} />
      <Route path="/loan-execution/:customerId?" element={<RoleRoute roles={["dealer"]}><LoanExecution/></RoleRoute>} />
      <Route path="/ho-delivery-verification/:customerId?" element={<RoleRoute roles={["HO"]}><HODeliveryVerification/></RoleRoute>} />
      <Route path="/final-review/:customerId?" element={<RoleRoute roles={["HO", "FI"]}><FinalReview/></RoleRoute>} />
    </Routes>
  );
}

export default App;
