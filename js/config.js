export const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkNC483NRAy-kqGlTTMqvq4GsqNgqcxfzj5QkBA77T_8nXTpHhI3V2MQ3LM3A8m79dOeYBKXndNlzF/pub?gid=0&single=true&output=csv";

/* Commercials */
export const GST_RATE = 0.05;

export const COMMISSION_RATE = 0.33;
export const COMMISSION_GST_RATE = 0.18;

export const FORWARD_BASE = 75;
export const FORWARD_GST = 0.18;

export const TCS_RATE = 0.005;
export const TDS_RATE = 0.01;

export const MARKETING_RATE = 0.03;

export const RETURN_CHARGE = 177;
export const RETURN_PERCENT = 45;

export const DISPATCH_COST = 35;

/* Derived */
export const FORWARD_TOTAL =
  FORWARD_BASE + (FORWARD_BASE * FORWARD_GST);

/* Reverse Solve */
export const SOLVER_STEP = 1;
export const SOLVER_MAX = 50000;

/* Pricing Modes */
export const MODE_BAU = "BAU";
export const MODE_EVENT = "EVENT";