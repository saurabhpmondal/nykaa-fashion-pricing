import {
  GST_RATE,
  COMMISSION_RATE,
  COMMISSION_GST_RATE,
  FORWARD_TOTAL,
  TCS_RATE,
  TDS_RATE,
  MARKETING_RATE,
  RETURN_CHARGE,
  RETURN_PERCENT,
  DISPATCH_COST,
  MODE_BAU,
  SOLVER_STEP,
  SOLVER_MAX
} from "./config.js";

import { num, round2 } from "./utils.js";

/* ----------------------------- */
/* Target Logic */
/* ----------------------------- */

export function getTargetPercent(mode, status, continueTpDiff = null, nonContinueTpDiff = null) {
  const s = String(status || "")
    .trim()
    .toUpperCase();

  const isContinue = s === "CONTINUE";
  const normalizedMode = String(mode || "BAU").trim().toUpperCase();

  if (isContinue) {
    if (continueTpDiff !== null && continueTpDiff !== undefined && continueTpDiff !== "" && continueTpDiff !== "ALL") {
      const parsed = parseFloat(continueTpDiff);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    if (normalizedMode === "BIG EVENT" || normalizedMode === "BIG_EVENT") {
      return -15;
    }
    if (normalizedMode === "EVENT") {
      return -10;
    }
    return 5; // BAU default
  } else {
    // Non-Continue
    if (nonContinueTpDiff !== null && nonContinueTpDiff !== undefined && nonContinueTpDiff !== "" && nonContinueTpDiff !== "ALL") {
      const parsed = parseFloat(nonContinueTpDiff);
      if (!isNaN(parsed)) {
        return parsed;
      }
    } else if (continueTpDiff !== null && continueTpDiff !== undefined && continueTpDiff !== "" && continueTpDiff !== "ALL" && (nonContinueTpDiff === null || nonContinueTpDiff === undefined)) {
      // If legacy single tpDiff parameter was passed
      const parsed = parseFloat(continueTpDiff);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    if (normalizedMode === "BIG EVENT" || normalizedMode === "BIG_EVENT") {
      return -40;
    }
    if (normalizedMode === "EVENT") {
      return -20;
    }
    return 0; // BAU default
  }
}

export function getTargetValue(tp, mode, status, continueTpDiff = null, nonContinueTpDiff = null) {
  const diff = getTargetPercent(mode, status, continueTpDiff, nonContinueTpDiff);

  return tp * (1 + diff / 100);
}

/* ----------------------------- */
/* Commercials */
/* ----------------------------- */

export function computeFromSP(sp, tp, mrp) {
  sp = num(sp);
  tp = num(tp);
  mrp = num(mrp);

  const taxableValue =
    sp / (1 + GST_RATE);

  const gst =
    sp - taxableValue;

  const commission =
    sp * COMMISSION_RATE;

  const gstComm =
    commission * COMMISSION_GST_RATE;

  const commInvoice =
    commission + gstComm;

  const forward =
    FORWARD_TOTAL;

  const tcs =
    taxableValue * TCS_RATE;

  const bankSettlement =
    sp -
    commission -
    gstComm -
    forward -
    tcs;

  const tds =
    taxableValue * TDS_RATE;

  const finalPayout =
    bankSettlement - tds;

  const marketing =
    sp * MARKETING_RATE;

  const returnCharge =
    RETURN_CHARGE;

  const returnPct =
    RETURN_PERCENT;

  const returnCODB =
    (returnCharge * returnPct) /
    (100 - returnPct);

  const dispatch =
    DISPATCH_COST;

  const payoutAfterCODB =
    finalPayout -
    marketing -
    forward -
    returnCODB -
    dispatch;

  const tdRaw =
    mrp > 0
      ? ((mrp - sp) / mrp) * 100
      : 0;

  /* FLOOR ROUND DOWN */
  const td =
    Math.floor(tdRaw);

  const tpProfitRs =
    payoutAfterCODB - tp;

  const tpProfitPct =
    tp > 0
      ? (tpProfitRs / tp) * 100
      : 0;

  return {
    sp: round2(sp),
    td: td,

    taxableValue: round2(taxableValue),
    gst: round2(gst),

    commission: round2(commission),
    gstComm: round2(gstComm),
    commInvoice: round2(commInvoice),

    forward: round2(forward),
    tcs: round2(tcs),

    bankSettlement: round2(bankSettlement),
    tds: round2(tds),

    finalPayout: round2(finalPayout),

    marketing: round2(marketing),

    returnCharge: round2(returnCharge),
    returnPct: round2(returnPct),
    returnCODB: round2(returnCODB),

    dispatch: round2(dispatch),

    payoutAfterCODB:
      round2(payoutAfterCODB),

    tpProfitRs:
      round2(tpProfitRs),

    tpProfitPct:
      round2(tpProfitPct)
  };
}

/* ----------------------------- */
/* Reverse Solve */
/* ----------------------------- */

export function solveSP(
  tp,
  mrp,
  mode,
  status,
  continueTpDiff = null,
  nonContinueTpDiff = null
) {
  tp = num(tp);
  mrp = num(mrp);

  const targetPct = getTargetPercent(mode, status, continueTpDiff, nonContinueTpDiff);
  const target = getTargetValue(tp, mode, status, continueTpDiff, nonContinueTpDiff);

  let best = null;
  let gapMin = Infinity;

  const maxSP =
    mrp > 0
      ? mrp
      : SOLVER_MAX;

  for (
    let sp = 1;
    sp <= maxSP;
    sp += SOLVER_STEP
  ) {
    const row =
      computeFromSP(
        sp,
        tp,
        mrp
      );

    const gap = Math.abs(
      row.payoutAfterCODB -
      target
    );

    if (gap < gapMin) {
      gapMin = gap;
      best = row;
    }
  }

  return {
    target: round2(target),
    targetPercent: targetPct,
    ...best
  };
}