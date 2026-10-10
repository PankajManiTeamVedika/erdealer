// Post-sanction order: e-Mandate + e-Sign (LoanExecution.jsx) now happens FIRST, and only
// once that's done does the dealer add vehicle details (VehicleDelivery.jsx) — reversed
// from the old order where vehicle delivery came before mandate/eSign.
//
// Six-stage funnel driven by fi_status + sanction_status + mandate_status + vehicle_delevery_status
// (vehicle_delevery_status is genuinely misspelled "delevery" in the API, confirmed via curl):
// fi_status 0/missing                              -> FI not done yet
// fi_status truthy (1 approved, or 3 = Video PD Completed) + sanction_status != 1 -> FI done, HO sanction decision pending
// sanction_status 1 + mandate not SUCCESS + vehicle_delevery_status 0/missing -> Mandate Pending (e-Mandate/e-Sign not done yet)
// sanction_status 1 + mandate SUCCESS + vehicle_delevery_status 0/missing     -> Post Sanction Pending (vehicle not added yet)
// sanction_status 1 + vehicle_delevery_status == 1       -> vehicle added by dealer, awaiting HO's delivery approval
// sanction_status 1 + vehicle_delevery_status == 2       -> HO approved delivery (mandate/eSign already done by this point)

// Every consumer should read the delivery status through this helper, not the raw field
// directly — if the backend ever corrects the "delevery" typo to "delivery", only this
// one line needs updating instead of every dashboard/page that reads the field.
export const getVehicleDeliveryStatus = (cust) =>
  Number(cust?.vehicle_delivery_status ?? cust?.vehicle_delevery_status);

// Confirmed shape (CHECK_MANDATE_STATUS_API / INITIATE_ESIGN_API in apiRoutes.js):
// mandate_status is the string "SUCCESS", not a 1/0 flag — read it through this helper
// instead of a raw Number()/=== 1 check (that comparison never matches the real value).
export const isMandateComplete = (cust) =>
  String(cust?.mandate_status ?? "").toUpperCase() === "SUCCESS";

// mandate_pending and post_sanction_pending both need the same dealer action (open
// LoanExecution.jsx, which gates internally on whether mandate is done) — anything that
// treated this as one bucket before the mandate_pending split can check membership here.
export const POST_SANCTION_STAGE_KEYS = ["mandate_pending", "post_sanction_pending"];

export const getStatusInfo = (cust) => {
  const fiStatus = Number(cust.fi_status);

  if (!fiStatus) {
    return { key: "fi_pending", label: "FI Pending", badge: "draft" };
  }
  if (Number(cust.sanction_status) !== 1) {
    return { key: "sanction_pending", label: "Sanction Pending", badge: "bureau" };
  }

  const deliveryStatus = getVehicleDeliveryStatus(cust);
  if (deliveryStatus === 2) {
    return { key: "mandate_approved", label: "Mandate Approved", badge: "approved" };
  }
  if (deliveryStatus === 1) {
    return { key: "delivered", label: "Vehicle Added - Pending HO Approval", badge: "ekyc" };
  }
  if (!isMandateComplete(cust)) {
    return { key: "mandate_pending", label: "Mandate Pending", badge: "swatah" };
  }
  return { key: "post_sanction_pending", label: "Post Sanction Pending", badge: "swatah" };
};
