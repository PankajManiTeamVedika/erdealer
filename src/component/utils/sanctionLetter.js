// Builds the "Letter of Offer" (DO — Delivery Order) sanction letter, matching the
// layout/wording of the sample provided (ER-DO-<id>-<timestamp>.pdf). Rendered as a
// standalone HTML document opened in a new tab, then printed via window.print() so HO
// can "Save as PDF" — same no-extra-dependency approach already used for the
// FinalReview.jsx "Generate PDF" feature, kept consistent rather than adding a client
// PDF library (jsPDF) just for this one letter.
//
// FIELD AVAILABILITY — read before trusting the output for a real dealer payout:
//   - S/o, W/o, D/o (applicant's father's/husband's name) and the applicant's full
//     current address (with landmark/city/state/pincode) are NOT captured anywhere in
//     the onboarding flow (ApplicantVerification.jsx / DocumentCollection.jsx) — these
//     always render as "—" until those fields are added to onboarding.
//   - GPS charge (3) has no source field anywhere in the app — always renders as 0,
//     same as the sample letter's example row.
//   - Payable Bank Name/A/C/IFSC/E-Mail are the DEALER's own settlement bank details,
//     fetched separately from the dealer record (ASSUMPTION: customer.dealer_id round-
//     trips on the customer GET response, and the dealer record's fields are named
//     bank_account/ifsc_code/owner_email — inferred from DealerOnboardingForm.jsx's
//     submit payload, not confirmed via curl). Renders "—" if unavailable.
//   - Dealer/Sub-Dealer Address: same dealer-record fetch, ASSUMPTION field name
//     showroom_address (also inferred from DealerOnboardingForm.jsx, not curl-confirmed).

const pad2 = (n) => String(n).padStart(2, "0");

const formatDate = (d) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;

const formatTimestampForFilename = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`;

const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-IN") : "0";
};

const esc = (v) => (v == null ? "" : String(v).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])));

// Same naming convention as the sample document: ER-DO-<lead id>-<generated timestamp>.pdf
export const buildSanctionLetterFilename = (leadId, now = new Date()) =>
  `ER-DO-${leadId || "0"}-${formatTimestampForFilename(now)}.pdf`;

export const buildSanctionLetterRefNo = (leadId, now = new Date()) =>
  `${pad2(now.getMonth() + 1)}${now.getFullYear()}-${leadId || "0"}`;

export const buildSanctionLetterHtml = (data, now = new Date()) => {
  const {
    leadId,
    applicantName,
    applicantMobile,
    dealerName,
    dealerAddress,
    onRoadPrice,
    exShowroomPrice,
    loanAmount,
    tenure,
    monthlyEmi,
    processingFee,
    insuranceAmount,
    gpsCharge = 0,
    downPayment,
    dealerSubvention,
    payableBankName,
    payableAccountNumber,
    payableIfsc,
    payableEmail,
  } = data;

  const marginMoney = downPayment;
  const totalCharges =
    Number(processingFee || 0) + Number(insuranceAmount || 0) + Number(gpsCharge || 0) + Number(dealerSubvention || 0);
  const netAmountPayable = Number(loanAmount || 0) - totalCharges;
  const refNo = buildSanctionLetterRefNo(leadId, now);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Letter of Offer - ${esc(refNo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
  h2 { font-size: 13px; text-align: center; margin: 0 0 16px; text-decoration: underline; }
  .meta-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
  .block { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10px; }
  th, td { border: 1px solid #333; padding: 4px; text-align: center; }
  ol { padding-left: 18px; font-size: 10px; }
  ol li { margin-bottom: 4px; }
  .footer { font-size: 10px; text-align: center; margin-top: 16px; }
  @media print { body { margin: 10mm; } }
</style>
</head>
<body>
  <h1>VEDIKA CREDIT CAPITAL LIMITED</h1>
  <h2>LETTER OF OFFER</h2>
  <div class="meta-row">
    <span>Ref. No - ${esc(refNo)}</span>
    <span>Date: ${formatDate(now)}</span>
  </div>
  <div class="block">To,</div>
  <div class="block">Dealer/Sub-Dealer Name: ${esc(dealerName) || "—"}</div>
  <div class="block">Dealer/Sub-Dealer Address: ${esc(dealerAddress) || "—"}</div>
  <div class="block">Mr./Mrs./Miss: ${esc(applicantName) || "—"}</div>
  <div class="block">S/o, W/o, D/o: —</div>
  <div class="block">Current Add: —</div>
  <div class="block">CONTACT: ${esc(applicantMobile) || "—"}</div>
  <p>We are pleased to inform you that the application of above customer has been approved as per terms and conditions listed below.</p>
  <p><em>*All figures in the table are stated in INR</em></p>

  <table>
    <thead>
      <tr>
        <th>On Road Price</th>
        <th>Ex-showroom Price</th>
        <th>Loan Amount</th>
        <th>Tenure</th>
        <th>Monthly EMI</th>
        <th>Margin Money</th>
        <th>PF with GST (1)</th>
        <th>Insurance (2)</th>
        <th>GPS (3)</th>
        <th>Down Payment</th>
        <th>DEALER SUBVENTION (4)</th>
        <th>Total Charges (1+2+3+4)</th>
        <th>NET Amount Payable</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${money(onRoadPrice)}</td>
        <td>${money(exShowroomPrice)}</td>
        <td>${money(loanAmount)}</td>
        <td>${esc(tenure) || "—"}</td>
        <td>${money(monthlyEmi)}</td>
        <td>${money(marginMoney)}</td>
        <td>${money(processingFee)}</td>
        <td>${money(insuranceAmount)}</td>
        <td>${money(gpsCharge)}</td>
        <td>${money(downPayment)}</td>
        <td>${money(dealerSubvention)}</td>
        <td>${money(totalCharges)}</td>
        <td>${money(netAmountPayable)}</td>
      </tr>
    </tbody>
  </table>

  <p>Thanking You<br/>For Vedika Credit Capital Ltd.</p>

  <p><strong>Notes:</strong></p>
  <ol>
    <li>This Approval Letter is valid for 7 days from the date of issue. For whatever reason, if the loan is not disbursed within 7 days of issuance of the letter, then VCCL will not be liable to pay any partial amount or disbursement amount to the Dealer.</li>
    <li>Kindly note this is only a conditional approval document. The vehicle may be delivered on the basis of document, solely on the basis of Dealers own risk, but actual disbursement is conditional to dealer/customer providing requisite documents, e.g. Agreement, PDC, ECS, KYC, Insurance, Invoice, RC, Approval, etc, as may be notified by the financier from time to time.</li>
    <li>If the customer had taken different vehicle from the dealer other than the one specified in the invoice provided, then VCCL will not be liable to pay for that case. In case amount is transferred already, VCCL is allowed to adjust the same from subsequent disbursals or by notifying the dealer to refund the amount back to the financier. Financier reserves the right to proceed legally to recover the amount from the dealer in case the same is not provided.</li>
    <li>If there are any changes to the scheme after issuance of the Delivery Order(DO) letter then only a fresh Delivery Order(DO) letter incorporating the impact of the changes will be valid and the disbursement amount may change accordingly.</li>
    <li>If any discrepancy is found in RC, Insurance and Invoice then dealer will be solely responsible to get it rectified and provide the same to VCCL within 7 days.</li>
    <li>In case of any Service Issue/Manufacturing Defect with the product or/and in cases where RC is not provided by the dealer to the customer, Dealer shall be legally liable for the whole Principal Outstanding amount standing against that customer in VCCLs books.</li>
    <li>Dealer is excepted to endorse HPA in favour of "Vedika Credit Capital Limited" on RC, Insurance, Invoice, and deposit original papers to us.</li>
    <li>Actual first EMI of the Customer may vary from the EMI stated in repayment schedule due to gaps between disbursement &amp; demand date.</li>
    <li>Dealer shall be solely responsible for receiving the down-payment from the customer before delivery. Financier shall not be liable, under any circumstances, to make good any pending dues between Customer &amp; Dealer, Customer to the Dealer or vice-versa.</li>
    <li>This is a computer generated letter and does not require any signature.</li>
  </ol>

  <div class="block">Payable Bank Name : ${esc(payableBankName) || "—"}</div>
  <div class="block">Payable A/C Number : ${esc(payableAccountNumber) || "—"}</div>
  <div class="block">Payable Bank IFSC Code : ${esc(payableIfsc) || "—"}</div>
  <div class="block">Payable E-Mail ID : ${esc(payableEmail) || "—"}</div>

  <div class="footer">
    Vedika Credit Capital Ltd.<br/>
    406, Srilok Complex, H.B. Road, Ranchi - 834001, India<br/>
    FOR ANY QUERY PLEASE CALL TO 9431710000
  </div>
</body>
</html>`;
};
