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
  SOLVER_MAX,
  NYRI_GST_RATE,
  NYRI_COMMISSION_RATE,
  NYRI_COMMISSION_GST_RATE,
  NYRI_TCS_RATE,
  NYRI_DISPATCH_COST,
  NYRI_BAU_TD,
  NYRI_EVENT_TD,
  NYRI_BIG_EVENT_CONTINUE_TARGET_PCT,
  NYRI_BIG_EVENT_NON_CONTINUE_TARGET_PCT
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

export function computeFromSP(sp, tp, mcp) {
  sp = num(sp);
  tp = num(tp);
  mcp = num(mcp);

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
    mcp > 0
      ? ((mcp - sp) / mcp) * 100
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
  mcp,
  mode,
  status,
  continueTpDiff = null,
  nonContinueTpDiff = null
) {
  tp = num(tp);
  mcp = num(mcp);

  const targetPct = getTargetPercent(mode, status, continueTpDiff, nonContinueTpDiff);
  const target = getTargetValue(tp, mode, status, continueTpDiff, nonContinueTpDiff);

  const A = 1 - COMMISSION_RATE - (COMMISSION_RATE * COMMISSION_GST_RATE) - (TCS_RATE / (1 + GST_RATE)) - (TDS_RATE / (1 + GST_RATE)) - MARKETING_RATE;
  const returnCODB_const = (RETURN_CHARGE * RETURN_PERCENT) / (100 - RETURN_PERCENT);
  const B = (2 * FORWARD_TOTAL) + returnCODB_const + DISPATCH_COST;

  let solvedSP = (target + B) / A;

  if (mcp > 0 && solvedSP > mcp) {
    solvedSP = mcp;
  }

  if (solvedSP < 1) {
    solvedSP = 1;
  }

  const sp = Math.round(solvedSP);
  const best = computeFromSP(sp, tp, mcp);

  return {
    target: round2(target),
    targetPercent: targetPct,
    ...best
  };
}

/* ----------------------------- */
/* Nyri Brand Pricing Engine */
/* ----------------------------- */

export function computeNyriFromSP(sp, tp, mcp, fixedTd = null) {
  sp = num(sp);
  tp = num(tp);
  mcp = num(mcp);

  const taxableValue = sp / (1 + NYRI_GST_RATE);
  const gst = sp - taxableValue;

  const commission = sp * NYRI_COMMISSION_RATE;
  const gstComm = commission * NYRI_COMMISSION_GST_RATE;
  const commInvoice = commission + gstComm;

  const forward = 0;
  const tcs = taxableValue * NYRI_TCS_RATE;

  const finalPayout = sp - commission - gstComm - tcs;
  const bankSettlement = finalPayout;
  const tds = 0;

  const marketing = 0;
  const returnCharge = 0;
  const returnPct = 0;
  const returnCODB = 0;

  const dispatch = NYRI_DISPATCH_COST;
  const payoutAfterCODB = finalPayout - dispatch;

  const tdRaw =
    mcp > 0
      ? ((mcp - sp) / mcp) * 100
      : 0;

  const td =
    fixedTd !== null && fixedTd !== undefined
      ? fixedTd
      : Math.round(tdRaw);

  const tpProfitRs = payoutAfterCODB - tp;
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

    payoutAfterCODB: round2(payoutAfterCODB),

    tpProfitRs: round2(tpProfitRs),
    tpProfitPct: round2(tpProfitPct)
  };
}

export function solveNyriSP(tp, mcp, mode, status = "") {
  tp = num(tp);
  mcp = num(mcp);

  const normalizedMode = String(mode || "BAU").trim().toUpperCase();

  // BAU: Fixed 55% TD on MRP
  if (normalizedMode === "BAU") {
    const sp = mcp > 0 ? Math.round(mcp * (1 - NYRI_BAU_TD / 100)) : 0;
    const calc = computeNyriFromSP(sp, tp, mcp, NYRI_BAU_TD);
    return {
      target: calc.payoutAfterCODB,
      targetPercent: null,
      targetRuleLabel: `Fixed TD ${NYRI_BAU_TD}%`,
      ...calc
    };
  }

  // EVENT: Fixed 57% TD on MRP
  if (normalizedMode === "EVENT") {
    const sp = mcp > 0 ? Math.round(mcp * (1 - NYRI_EVENT_TD / 100)) : 0;
    const calc = computeNyriFromSP(sp, tp, mcp, NYRI_EVENT_TD);
    return {
      target: calc.payoutAfterCODB,
      targetPercent: null,
      targetRuleLabel: `Fixed TD ${NYRI_EVENT_TD}%`,
      ...calc
    };
  }

  // BIG EVENT: Continue -> -19% TP Profit %, Non-Continue -> -40% TP Profit %, derive rounded TD%
  const isContinue = String(status || "").trim().toUpperCase() === "CONTINUE";
  const targetPct = isContinue
    ? NYRI_BIG_EVENT_CONTINUE_TARGET_PCT
    : NYRI_BIG_EVENT_NON_CONTINUE_TARGET_PCT;
  const target = tp * (1 + targetPct / 100);

  const A =
    1 -
    NYRI_COMMISSION_RATE -
    (NYRI_COMMISSION_RATE * NYRI_COMMISSION_GST_RATE) -
    (NYRI_TCS_RATE / (1 + NYRI_GST_RATE));

  let solvedSP = (target + NYRI_DISPATCH_COST) / A;

  if (mcp > 0 && solvedSP > mcp) {
    solvedSP = mcp;
  }

  if (solvedSP < 1) {
    solvedSP = 1;
  }

  const sp = Math.round(solvedSP);
  const calc = computeNyriFromSP(sp, tp, mcp, null);

  return {
    target: round2(target),
    targetPercent: targetPct,
    targetRuleLabel: `${isContinue ? "Continue" : "Non-Continue"} TP${targetPct}% (Derived TD%)`,
    ...calc
  };
}