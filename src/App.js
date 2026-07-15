import React from "react";
import Login from "./component/Login";
import { Route, Routes } from "react-router-dom";
import DealerOnboardingForm from "./component/DealerOnboardingForm";
import OtpVerify from "./component/OtpVerify";
import DealerDashboard from "./component/DealerDashboard";
import SourcingPipeline from "./component/SourcingPipeline";
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dealer-onboarding" element={<DealerOnboardingForm />} />
      <Route path="/otp-verify" element={<OtpVerify />} />
      <Route path="/dealer-dashboard" element={<DealerDashboard />} />
       <Route path="/ho-dashboard" element={<HoDashboard />} />
      <Route path="/sourcing-pipeline" element={<SourcingPipeline />} />  
      <Route path="/application-status" element={<ApplicationStatus />} />
      <Route path="/applicant-verification" element={<ApplicantVerification />} />
      <Route path="/document-collection" element={<DocumentCollection />} />
      <Route path="/offer-summary" element={<OfferSummary />} />
      <Route path="/sanction-review" element={<SanctionReview />} />
      <Route path="/vehicle-delivery" element={<VehicleDelivery />} />
      <Route path="/dealer-details/:dealerId" element={<DealerDetails />} />
      <Route path="/fi-dashboard" element={<FIDashboard />} />
      <Route path="/customer-details/:customerId" element={<CustomerDetails />} />
      <Route path="/loan-execution" element={<LoanExecution/>} />
    </Routes>
  );
}

export default App;
