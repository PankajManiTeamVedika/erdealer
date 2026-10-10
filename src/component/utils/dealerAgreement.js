// Builds the "BUSINESS TIE-UP AGREEMENT" (Referral Associate Agreement) between Vedika
// Credit Capital Limited and a dealer — legal text transcribed verbatim from a real,
// already-executed sample (RUDRA TRADERS_merged Agreement.pdf), with only the
// dealer-specific fields made dynamic. Do NOT edit the clause wording without legal
// sign-off — this is a binding contract, not a UI copy string.
//
// The sample PDF's first page is a government e-Stamp receipt (Jharkhand
// "jharnibandhan" NON-JUDICIAL stamp, purchased per-agreement) — that can't be
// generated here, it has to be bought through the government portal for each
// agreement. So this module only builds pages 2–12 (the agreement text); the stamp
// paper page is a manually-uploaded image (see DealerDetails.jsx) merged in as the
// literal first page, same as the sample document's own "_merged" filename implies.
//
// ASSUMPTION (not curl-confirmed, inferred from fields already displayed on
// DealerDetails.jsx): dealer.legal_name/showroom_name, dealer.gst_number,
// dealer.showroom_address/address, dealer.district, dealer.state, dealer.owner_name,
// dealer.firm_type. No pincode field exists anywhere in dealer onboarding, so the
// address block omits it (same as several other fields, e.g. GPS charge in the
// sanction letter, that simply aren't captured anywhere in this app).

const REPRESENTATIVE_TITLE_BY_FIRM_TYPE = {
  proprietorship: "Proprietor",
  partnership: "Partner",
  "private limited": "Director",
  "public limited": "Director",
  llp: "Designated Partner",
};

const pad2 = (n) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Matches the sample's date style: "20-Jul-2026"
const formatAgreementDate = (d) => `${pad2(d.getDate())}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;

const esc = (v) => (v == null ? "" : String(v).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])));

// Inserts the manually-uploaded stamp paper (image or PDF — government e-Stamp
// receipts are usually downloaded as PDF) as its own first printed page, ahead of the
// agreement text — matching the sample document's own page order (e-Stamp receipt on
// page 1, agreement text from page 2 onward). Whether an embedded PDF actually shows up
// in the print/"Save as PDF" output depends on the browser — worth checking the printed
// result once, not just the on-screen preview.
export const withStampPaperPage = (agreementHtml, stampPaperDataUrl) => {
  if (!stampPaperDataUrl) return agreementHtml;
  const isPdf = stampPaperDataUrl.startsWith("data:application/pdf");
  const media = isPdf
    ? `<embed src="${stampPaperDataUrl}" type="application/pdf" style="width:100%; height:100vh;" />`
    : `<img src="${stampPaperDataUrl}" alt="Stamp paper" style="max-width:100%; max-height:100vh;" />`;
  const stampPage = `<div class="page" style="text-align:center; padding:0;">${media}</div>`;
  return agreementHtml.replace("<body>", `<body>\n  ${stampPage}`);
};

export const buildDealerAgreementHtml = (dealer, now = new Date()) => {
  const dealerName = dealer?.legal_name || dealer?.showroom_name || "—";
  const dealerGstin = dealer?.gst_number || "";
  const dealerAddressParts = [dealer?.showroom_address || dealer?.address, dealer?.branch, dealer?.district, dealer?.state]
    .filter(Boolean);
  const dealerAddress = dealerAddressParts.join(", ") || "—";
  const proprietorName = dealer?.owner_name || "—";
  const firmType = dealer?.firm_type || "Proprietorship";
  const repTitle = REPRESENTATIVE_TITLE_BY_FIRM_TYPE[firmType.toLowerCase()] || "Authorized Representative";
  const concernType = /concern|company|firm|entity/i.test(firmType) ? firmType : `${firmType} concern`;
  const executionDate = formatAgreementDate(now);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Business Tie-Up Agreement - ${esc(dealerName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.5; color: #111; margin: 0; }
  .page { padding: 24px 28px; }
  .page + .page { page-break-before: always; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 16px; }
  h2 { font-size: 12px; margin: 18px 0 6px; text-transform: uppercase; }
  p { margin: 0 0 10px; text-align: justify; }
  ol.clauses { padding-left: 20px; margin: 0 0 10px; }
  ol.clauses li { margin-bottom: 8px; text-align: justify; }
  .page-no { text-align: center; font-size: 9px; color: #666; margin-bottom: 8px; }
  .sign-block { display: flex; justify-content: space-between; margin-top: 60px; }
  .sign-block div { text-align: center; font-weight: bold; }
  @media print { .page { padding: 10mm 12mm; } }
</style>
</head>
<body>

  <div class="page">
    <div class="page-no">1 | Page</div>
    <h1>BUSINESS TIE-UP AGREEMENT</h1>
    <p>This BUSINESS TIE-UP AGREEMENT is made and executed on this the ${executionDate}, at Ranchi</p>
    <p style="text-align:center"><strong>BETWEEN</strong></p>
    <p>VEDIKA CREDIT CAPITAL LIMITED, a company incorporated under the Companies Act, 1956/2013 and having License of NBFC from RBI, its Registered Office at Chhota Kanthalia, North 24 Parganas, West Bengal- 700121, India and its Head Office at 406, 4th Floor, Shrilok Complex, H.B. Road, Ranchi, Jharkhand - 834001 hereinafter referred to as &ldquo;VEDIKA CREDIT CAPITAL LIMITED&rdquo; engaged in Financial Services which expression shall include its legal heirs, permitted assignees, administrators, etc. represented by its Authorized Signatory Mr. Rajeev Ranjan Kumar,</p>
    <p style="text-align:center"><strong>AND</strong></p>
    <p>${esc(dealerName)}${dealerGstin ? ` ( ${esc(dealerGstin)} )` : ""}, a ${esc(concernType)} having its principal place of business at ${esc(dealerAddress)}, hereinafter referred to as &ldquo;DEALER&rdquo; engaged in Trading &amp; Servicing of E-Rickshaw which expression shall include its legal heirs, permitted assignees, administrators, etc. represented by its ${esc(repTitle)} Mr./Mrs. ${esc(proprietorName)}.</p>
    <p>The VEDIKA CREDIT CAPITAL LIMITED, MANUFACTURER and DEALER are hereinafter collectively referred to as &ldquo;the Parties&rdquo; and individually as &ldquo;Party&rdquo; wherever the context so permits.</p>
    <p><strong>WHEREAS:</strong></p>
    <ol class="clauses" type="A">
      <li>VEDIKA CREDIT CAPITAL LIMITED is a Non-Banking Financial Company engaged in the Business of providing financial and extending various loan facilities.</li>
      <li>${esc(dealerName)} is exclusive Dealer of E-Rickshaw which is manufactured by Manufacturers/Brands mentioned in the Dealer Enrollment Documents (mainly LOI or Letter of Intent) or the Delivery Order provided by the financier to the Dealer mentioning that Manufacturer's name.</li>
      <li>Dealer has expressed its desire to avail the financial services from the VEDIKA CREDIT CAPITAL LIMITED for smooth sale of Electric Vehicles to the Customers which are more fully described in the Schedule &ldquo;A&rdquo; hereto;</li>
      <li>Based on the representations and assurances made by DEALER; the VEDIKA CREDIT CAPITAL LIMITED has accepted their proposals for extending its Financial Products to Borrowers identified, screened and referred by Dealer in order to enable them to avail VEDIKA CREDIT CAPITAL LIMITED Financial Products from VEDIKA CREDIT CAPITAL LIMITED and Dealer has agreed to the aforesaid Agreement;</li>
      <li>In the above context, the Parties wish to record the understanding between them in this regard in the form of this legally binding Agreement.</li>
    </ol>
    <p>NOW THEREFORE, in consideration of the mutual covenants and promises contained herein, it is agreed as follows:</p>
    <h2>Definitions</h2>
    <p>In this Agreement, in addition to the terms defined above, and in the text of this Agreement, unless repugnant to the meaning and context, the following words (capitalised or otherwise), shall have the meaning set forth below.</p>
  </div>

  <div class="page">
    <div class="page-no">2 | Page</div>
    <p>&ldquo;Agreement&rdquo; shall mean this Agreement and shall include all Annexures appended to this Agreement which may at present or from time to time be attached with the consent of the Parties and shall be regarded and construed as an integral part of this Agreement and accordingly, the Parties shall be governed by the terms of this Agreement and the said Annexure(s).</p>
    <p>&ldquo;Authorised Dealership and or Distributorship&rdquo; shall mean Dealership and or Distributorship (herein called the Dealer) wherein Vehicles are sold &amp; to whom the delivery order (DO) will be issued, and with respect to which the Parties have jointly agreed that the Dealer will carry out its operations as per the terms of this Agreement.</p>
    <p>&ldquo;Lender&rdquo; means the issuer of Delivery Order(DO) and the entity who makes the payment against that Delivery Order(DO). That is Vedika Credit Capital Limited.</p>
    <p>&ldquo;Manufacturer&rdquo; means the entity whose product has been sold by the Dealer representing their model/brand/company name in the Delivery Order(DO) provided to them.</p>
    <p>&ldquo;Borrower(s) and or Customer(s)&rdquo; shall mean persons who avail of the Loan and or financing from the Lender and shall include &ldquo;Co-Borrowers&rdquo; and &ldquo;Guarantor(s)&rdquo; who would stand to guarantee for the loan extended to the Borrower(s).</p>
    <p>&ldquo;Product Price&rdquo; means the price of a Product charged by the dealer as per the bill/invoice which shall not exceed the maximum retail price as fixed by the Manufacturer together with applicable taxes if any.</p>
    <p>&ldquo;Confidential Information&rdquo; shall have the meaning stated in this agreement.</p>
    <p>&ldquo;Delivery Order/DO&rdquo; shall mean the document issued by Vedika Credit Capital Limited to the Dealer through its official mail for any borrower in that particular dealer point which orders the release of the vehicle to the borrower upon fulfillment of the terms of Delivery Order(DO).</p>
    <p>&ldquo;EMI&rdquo; shall mean Equated Monthly Instalment(s) to be paid each month to the Lender by each individual Borrower(s).</p>
    <p>&ldquo;Law&rdquo; shall mean all applicable statutes, enactments, acts, laws, ordinances, rules, by-laws, regulations, notifications, guidelines, policies, directions, directives, and orders of any Governmental Authority, tribunal, board, court or a recognised stock exchange of India, including but not limited to, any license, permit or other governmental authorisation, in each case as in effect from time to time in India.</p>
    <p>&ldquo;Loan&rdquo; shall mean a lending and or loan Agreement in terms of loan disbursed to an individual Borrower and &ldquo;Loans&rdquo; shall mean all loans disbursed by the Lender to all Borrowers sourced by the Dealer or sourced at that particular Dealer Point by the Financier on guarantee of the Dealer.</p>
    <p>&ldquo;Vehicle(s)&rdquo; shall mean any vehicle against which a Delivery Order has been issued by the VEDIKA CREDIT CAPITAL LIMITED.</p>
    <p>&ldquo;Default(s)/Default&rdquo; shall mean any loan in which any Amount is outstanding namely the Principal, Interest, Bouncing Charges, Penal Charges or any other charge as mentioned in the customer loan agreement which has been executed with the borrower sourced at that Dealer Point, as issued in the Delivery Order(DO), for providing any Loan under this arrangement.</p>
    <h2>Interpretation</h2>
    <ol class="clauses" type="A">
      <li>Apart from the terms defined above, any other terms defined elsewhere in this Agreement, shall have the meanings assigned to them thereunder;</li>
      <li>References in the singular shall include references in the plural and vice-versa;</li>
      <li>Reference to any gender includes a reference to all other genders; and</li>
      <li>Whenever provision is made for the giving of notice, approval or consent under this Agreement, unless otherwise specified, such notice, approval or consent shall be in writing and the words &lsquo;notify&rsquo;, &lsquo;approved&rsquo; and &lsquo;consent&rsquo; shall be construed accordingly. Also, right of approval or consent reserved with Vedika Credit Capital Limited in respect of extending loan facility to any individual borrower.</li>
    </ol>
  </div>

  <div class="page">
    <div class="page-no">3 | Page</div>
    <h2>Term of the Agreement</h2>
    <p>This Agreement shall come into force from the date of execution and shall remain in force until terminated in the manner provided for under this Agreement. This Agreement shall be applicable to the Parties and to all Dealers.</p>
    <h2>Responsibility</h2>
    <p>Dealer shall be responsible to adhere to all the responsibilities mentioned in the agreement and in the delivery order issued by the Lender.</p>
    <h2>Dealer's Responsibility</h2>
    <ol class="clauses">
      <li>The Dealer shall explain the finance schemes, facilities, provided by VEDIKA CREDIT CAPITAL LIMITED for purchase of products to the Customers.</li>
      <li>(A) The Dealer will prominently display and exhibit in his shop or showroom necessary brochures, posters and sale advertising material of VEDIKA CREDIT CAPITAL LIMITED, as provided to the Dealer by VEDIKA CREDIT CAPITAL LIMITED.<br/>(B) VEDIKA CREDIT CAPITAL LIMITED (First party) and Dealer may from time to time, undertake joint publicity or advertising. All expenses in this regard shall be shared by both the Parties on mutual sharing basis as agreed by them.<br/>(C) If the dealer finds that the Customer fulfills eligibility criteria notified by VEDIKA CREDIT CAPITAL LIMITED from time to time, obtains necessary Information/documents from the customer as specified by VEDIKA CREDIT CAPITAL LIMITED from time to time to enable VEDIKA CREDIT CAPITAL LIMITED to process such Loan application and the dealer shall perform following acts.</li>
      <li>Forward the requisite information of a customer for generating lead/enquiry, namely Customer Name, Address, Contact, and Primary Identification(KYC), however it is pertinent to mention here that in any circumstances whatsoever VEDIKA CREDIT CAPITAL LIMITED shall not be compelled/bound to accept any Loan Application. The decision of approval or sanction of any loan is always an absolute and sole discretion of VEDIKA CREDIT CAPITAL LIMITED. No one shall have any right to interfere or challenge the decision of the VEDIKA CREDIT CAPITAL LIMITED. Furthermore, it is hereby made clear that VEDIKA CREDIT CAPITAL LIMITED is not liable to provide any reason for rejection of any Loan Application to the Dealer.</li>
      <li>The Dealer shall not make or give any commitment on behalf of VEDIKA CREDIT CAPITAL LIMITED relating to acceptance/approval of the Loan Application either directly or indirectly.</li>
    </ol>
  </div>

  <div class="page">
    <div class="page-no">4 | Page</div>
    <ol class="clauses" start="5">
      <li>On receipt of confirmation from VEDIKA CREDIT CAPITAL LIMITED for the acceptance of Loan Application the Dealer shall provide requisite vehicle Registration details from the applicable government authority, Money Receipt, Invoice, RC Challan, Battery Warranty Details, and Vehicle Warranty details.</li>
      <li>In case of Vehicle loan, it is Dealer's responsibility that he will recover the expenses of registration from the borrower before handing over the vehicles. Dealer shall also ensure that before delivery of any document or copy thereof to the Customer, Vehicle must be hypothecated in the name of VEDIKA CREDIT CAPITAL LIMITED and the same shall be endorsed in the Registration Book of the vehicle. Copy of Registration Book with endorsement in favour of VEDIKA CREDIT CAPITAL LIMITED, Invoice duly endorsed in favour of VEDIKA CREDIT CAPITAL LIMITED and the copy of the Insurance policy shall be delivered to VEDIKA CREDIT CAPITAL LIMITED within 15 days of the date of Sanction of loan in the favour of the customer on the basis of the recommendation of dealer. In case the dealer fails to comply with the aforementioned prerequisite; VEDIKA CREDIT CAPITAL LIMITED shall have the right to take all or any legal action against the Dealer to make good the failure of responsibility. And the dealer, by signing this agreement, gives a commitment to fulfill all the terms within 2 weeks notice given by the financier in Post or in email to the dealer.</li>
      <li>The Dealer shall be liable to observe all written instructions issued from time to time by VEDIKA CREDIT CAPITAL LIMITED about the terms and conditions of finance and the duty of the dealer is to give such information to his customers without fail.</li>
      <li>The Dealer shall collect from the Customers the balance amount which shall be the sale price of the product less the amount of loan granted by VEDIKA CREDIT CAPITAL LIMITED, as a down payment, only after the sanction of a Loan and shall provide adequate proof thereof to VEDIKA CREDIT CAPITAL LIMITED. However, prior to sanction of the loan the dealer may at his discretion collect the margin money in his favour and subsequently if the said loan application is rejected by VEDIKA CREDIT CAPITAL LIMITED the dealer shall keep VEDIKA CREDIT CAPITAL LIMITED and its officers, employees indemnified of any consequences arising thereafter.</li>
      <li>The Dealer shall provide to VEDIKA CREDIT CAPITAL LIMITED copy of the Delivery Challan of the Product duly acknowledged by the Customer together with all necessary invoice of the Product.</li>
      <li>The Dealer shall submit books of accounts and statements of its operation pertaining to this Agreement on regular basis to VEDIKA CREDIT CAPITAL LIMITED in proper form and manner and in such intervals as advised/demanded by VEDIKA CREDIT CAPITAL LIMITED from time to time. VEDIKA CREDIT CAPITAL LIMITED shall be entitled to inspect the books of the Dealer at any time or to authorize any competent person to audit the account for ensuring compliance of the agreement.</li>
      <li>Vedika Credit Capital Limited may appoint an Employee or Agent from time to time on request of the Dealer or in cases it deems fit, for the sourcing of customers, however dealer hereby assures that all such files sourced are on his behalf, and Vedika Credit Capital Limited or their employees are not liable for any responsibilities towards collection or guarantees mentioned in this agreement, as they are solely guaranteed by the Dealer.</li>
      <li>Every vehicle financed under this arrangement shall be GPS installed, and for this Vedika shall facilitate training of the service executive present/working/appointed at the Dealer Point or of the Dealer itself. Dealer agrees that every vehicle financed by Vedika Credit Capital Ltd, shall have a GPS installation, and installation of this GPS device shall be whole and sole responsibility of the Dealer Point (being installed either by the Dealer as an individual or any other competent Person/Agency/Professional appointed by the Dealer). If at any point it is found out that the dealer has charged any fee/amount in lieu of GPS from the customer, the same shall be treated as Breach of Agreement, and consequently all Business shall cease for the Dealer till the remedy of the situation.</li>
    </ol>
    <h2>Responsibilities Towards Services/Product Defects</h2>
    <ol class="clauses">
      <li>VEDIKA CREDIT CAPITAL LIMITED shall be entitled to deduct the charges mentioned in the Delivery Order (DO) from the Loan amount which has been disbursed to the dealer and VEDIKA CREDIT CAPITAL LIMITED will pay to the Dealer only the balance Loan amount.</li>
      <li>The dealer shall be responsible to comply with all the terms and conditions specifically described in schedule A of this agreement.</li>
      <li>By signing of this agreement the dealer hereby agrees that in case of default of any amount by the customer because of a service or technical issue or a manufacturing defect, the whole of amount pending against that customer accruing to Vedika Credit Capital Ltd shall be paid by the dealer within 15 days of such written, email or textual communication by any of the officials represented by Vedika Credit Capital Ltd.</li>
    </ol>
  </div>

  <div class="page">
    <div class="page-no">5 | Page</div>
    <h2>Term and Termination</h2>
    <ol class="clauses">
      <li>This Agreement shall be effective from ${executionDate} and shall be valid for such period as agreed between the parties unless terminated earlier in accordance with the terms and conditions mentioned hereto.</li>
      <li>It is agreed that VEDIKA CREDIT CAPITAL LIMITED shall be entitled to terminate this Agreement at any point of time by giving 30 (Thirty) days advance notice, with or without assigning any reason thereof.</li>
      <li>In the event of breach of any of the terms of this Agreement by either party, the party not in breach shall issue a notice of 15 days calling upon the other party to remedy such breach. If the other party fails to remedy such breach to the satisfaction of the party issuing the notice, such party not in breach shall be entitled to terminate this Agreement forthwith.</li>
    </ol>
    <h2>Relationship Between the Parties</h2>
    <p>The relationship of the parties in this Agreement shall be on a principal-principal basis. Nothing in this Agreement or the provision of any services shall render either party as an agent, broker or other intermediary of insurance products, nor there exists a relationship of agency-principal between the VEDIKA CREDIT CAPITAL LIMITED and Dealer.</p>
    <h2>Representation and Warranties</h2>
    <p>Either party represents and warrants to the other that (i) it has the requisite corporate power and authority to enter into this Agreement and to perform its obligations hereunder; (ii) it is not a party to any Agreement and knows of no law, regulation or order that would prohibit it from entering into and performing its obligations under this Agreement, or that would conflict with the terms of this Agreement; and (iii) this Agreement constitutes a legal, valid and binding of it, enforceable against it in accordance with the terms of this Agreement.</p>
    <h2>Confidentiality</h2>
    <p>For the purpose of this Agreement, &ldquo;Confidential Information&rdquo; means any information that either Party considers confidential, which includes all tangible and intangible information obtained or disclosed, whether stored on paper, in computer memory or other electronic devices and/or on magnetic tape or disks, on optical disks or on other recording media, all technical and other information all documents, data, papers, statement, any business or customer information, trade secrets, or information in connection with all economics, customer, marketing, cost, pricing, financial and other information and process of the party relating to its business practices and/or in connection with the services required to be performed under this Agreement or otherwise all information deemed by a party to be confidential and proprietary information, whether it exists on the date of this Agreement or is developed after the date of this Agreement, including any and all information comprised in the records as may be handed over to the other party from time to time pursuant to this Agreement. However, confidential information does not include information already known to the public or those revealed or which have to be revealed by due process of law.</p>
  </div>

  <div class="page">
    <div class="page-no">6 | Page</div>
    <p>Either party shall ensure that the confidential information is not used or permitted to be used in any manner incompatible or inconsistent with the terms of this Agreement. Either party shall take all reasonable and necessary precautions to protect such information of the other party against misuse, loss or destruction. Either party expressly agrees and undertakes not to handover, permit copies of or otherwise deal with any and all records handed over to the party by the other pursuant to this Agreement to any third party under any circumstances whatsoever without the prior express written instructions received from the other party in this regard.</p>
    <p>Notwithstanding the above, if either party is directed by a court order or other legal or regulatory requirement or similar process to disclose confidential information, such party shall notify the other party in writing, along with the copy of such order or other legal or regulatory request.</p>
    <h2>Indemnification</h2>
    <p>The VEDIKA CREDIT CAPITAL LIMITED (Indemnifier) hereby agrees to indemnify and hold the (Indemnified) harmless from any and all costs, expenses, including reasonable outside attorneys' fees, claims, suits and liability by third parties (Collectively, &ldquo;Claims&rdquo;) that the indemnified may suffer or incur by reason of the indemnifier's breach of representations and warranties stipulated in this Agreement.</p>
    <h2>Limitation of Liability</h2>
    <p>In no event or under any circumstance shall either party be liable to the other, in contract, tort or otherwise, for indirect, special, incidental, exemplary, punitive or consequential damages of any kind whatsoever even if advised of the possibility of such damages.</p>
    <h2>Law and Arbitration</h2>
    <p>The provisions of this Agreement shall be governed by and constructed in accordance with Indian Law.</p>
    <p>Any dispute or difference arising out of or related to this Agreement shall be finally settled by arbitration in accordance with the provision of the Arbitration and Conciliation Act 1996. The Arbitration Tribunal shall be composed of one Arbitrator by each party and a third arbitrator appointed by such arbitrators. The place of arbitration shall be Ranchi, Kolkata, and Mumbai and language of such proceedings shall be English. The parties agree to submit to the jurisdiction of the Laws of India and courts in Ranchi, Kolkata and Mumbai.</p>
  </div>

  <div class="page">
    <div class="page-no">7 | Page</div>
    <h2>Miscellaneous</h2>
    <p><strong>Amendments:</strong> Any provision of this Agreement may be amended only if such amendment is in writing and signed by each party.</p>
    <p><strong>No Waiver:</strong> No failure or delay by any Party in exercising any right, power or privilege nor shall any single or partial exercise of any other right, power or privilege hereunder operate as waiver thereof and the rights and remedies herein provided shall be cumulative and not exclusive of any rights or remedies provided by law.</p>
    <p><strong>Notices:</strong> Notices under this Agreement shall be in writing signed by a duly authorized officer of the party issuing notice and the same shall be addressed to and served at the registered office of the addressee. Such notice will be deemed to have been served on the addressee: (i) On the date of delivery, if delivered by hand, (ii) On the fifth day after posting through Registered A D or Courier, (iii) On the fifth day of posting if posted through Courier or Speed Post.</p>
    <p><strong>Entire Agreement:</strong> This Agreement consists the entire Agreement between the Parties with respect to the subject matter hereof, and supersedes all prior Agreement, understanding and negotiations, both written and oral between the Parties with respect to the subject matter of this Agreement. It is understood between the parties that with the execution of this agreement, any past business relationship between the parties, namely Delivery Orders (DOs)/official email communication, is also included under the code of conduct and terms of this agreement and the parties are required to honour the respective liabilities without any further recourse. It shall not be a defence in any proceedings that this agreement has been executed after carrying on the earlier business, so the clauses of this agreement would not apply. The Dealer has no right to terminate this agreement unless the terms of this agreement have been successfully redeemed.</p>
    <p><strong>Further Assurances:</strong> In connection with this Agreement, as well as all transactions contemplated by this Agreement, each party agrees to execute and deliver such additional documents and to perform such additional action as may be necessary, appropriate or reasonably required.</p>
    <p><strong>Jurisdictions:</strong> This Agreement and the transactions contemplated herein shall be subject to the exclusive jurisdiction of the Competent Courts in Ranchi, Kolkata and Mumbai only.</p>
    <p><strong>Severability:</strong> The invalidity or unenforceability of any provisions of this Agreement in any jurisdiction shall not affect the validity, legality or enforceability of the remainder of this Agreement in such jurisdiction or validity, legality or enforceability of this Agreement, including any such provision, in any other jurisdiction, it being intended that all rights and obligations of the Parties hereunder shall be enforceable to the fullest extent permitted by Law.</p>
  </div>

  <div class="page">
    <div class="page-no">8 | Page</div>
    <h2>Schedule &ndash; A</h2>
    <h2>Terms &amp; Conditions</h2>
    <ol class="clauses">
      <li>Any issue pertaining to the financed product is the whole and sole responsibility of the Dealer. This includes Registration of the Vehicle. In case dealership ceases to operate, dealer shall pay a 20,000 fine to VEDIKA CREDIT CAPITAL LIMITED for every vehicle against which any Registration is pending.</li>
      <li>VEDIKA CREDIT CAPITAL LIMITED reserves the right to approve the files at its own discretion.</li>
      <li>Payment against a file Delivery Order (DO) will only be done upon receipt of Registration Number (RC Number) from the applicable Government Transport Authority. Business will cease for the Dealer if RC is not received within 30 days from the issuance of the Delivery Order(DO). In case of closure of the dealer point, the financier reserves the right to proceed legally on the dealer to recover the losses arising for not providing the RC by the dealer.</li>
      <li>In addition to the points mentioned herewith, the terms and conditions mentioned in the Delivery Order(DO) shall be applicable and the same shall be forming an integral part of this agreement.</li>
      <li>This Agreement may be modified only by a written instrument signed by the Parties.</li>
      <li>Dealers shall be liable for terms mentioned here until all cases of customers' outstanding dues are paid on time.</li>
      <li>If at any time the financier charges a Subvention on the financed amount from the dealer, it shall be paid wholly and solely by the Dealer. Dealer shall treat any such Subvention/Charge as non refundable, and shall never claim to Vedika Credit Capital Ltd for any kind of refund against any such Subvention/Charge. Further details, like refundability, of these subvention charges may be found in the Delivery Order, which forms an integral part of this agreement. If at any point it is found out that the dealer took from/charged the customer for any such subvention/Charge, it shall be treated as a breach of agreement, and further Business/sourcing shall cease immediately.</li>
    </ol>
    <p style="margin-top: 40px;">IN WITNESS whereof the parties knowing the contents of this memorandum of understanding have put their hands on the day and year first above mentioned in presence of witnesses: -</p>
    <p><strong>WITNESSES: -</strong></p>
    <div class="sign-block">
      <div>______________________<br/>VEDIKA CREDIT CAPITAL LIMITED</div>
      <div>______________________<br/>DEALER${dealerName !== "—" ? ` (${esc(dealerName)})` : ""}</div>
    </div>
  </div>

</body>
</html>`;
};
