/* ==========================================================================
   STATE.JS — game state shape, persistence, and pure helper calculations.
   ========================================================================== */

const LEGACY_SAVE_KEY = "ib_sim_save_v1";
const SAVE_SLOT_COUNT = 5;
const SAVE_KEY_PREFIX = "ib_sim_save_slot_";
const ACTIVE_SLOT_KEY = "ib_sim_active_slot";

const STATE = {};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pickRandom(arr) { return arr[randInt(0, arr.length - 1)]; }
function fmtMoney(n) {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toLocaleString("en-US");
  return (neg ? "-$" : "$") + s;
}

/* ---------------- Loan amortization ---------------- */

function calcMonthlyLoanPayment(principal, apr, termMonths) {
  const r = apr / 12;
  const factor = Math.pow(1 + r, termMonths);
  return principal * r * factor / (factor - 1);
}

/* ---------------- New game ---------------- */

function generateDatingPool() {
  const pool = [];
  const usedNames = new Set();
  const count = 7;
  for (let i = 0; i < count; i++) {
    let name = pickRandom(DATA.DATING_NAMES);
    while (usedNames.has(name)) name = pickRandom(DATA.DATING_NAMES);
    usedNames.add(name);
    pool.push({
      id: "d" + i,
      name,
      job: pickRandom(DATA.DATING_JOBS),
      bio: pickRandom(DATA.DATING_BIOS),
      compatibility: randInt(40, 95),
      relationship: 0,
      status: "unmet" // unmet -> talking -> dating -> partner -> married
    });
  }
  return pool;
}

// The canonical default shape for a brand-new character. Also used as a
// merge base when loading saves, so any fields missing from an older save
// (the schema has changed across versions) fall back to safe defaults
// instead of leaving STATE with undefined properties that crash renders.
function freshStateDefaults() {
  const minMonthly = calcMonthlyLoanPayment(DATA.STARTING_DEBT, DATA.LOAN_APR, DATA.LOAN_TERM_MONTHS);
  return {
    name: "Alex Ward",
    activeSlot: 1,
    uiMode: "desktop",
    ageYears: 22,
    ageMonths: 0,
    totalMonths: 0,
    cash: DATA.STARTING_CASH,
    savings: 0,
    investment: 0,
    debt: DATA.STARTING_DEBT,
    loanAPR: DATA.LOAN_APR,
    loanMinPayment: minMonthly,
    loanPaymentDue: false,
    loanMissedPayments: 0,

    energy: 150,
    maxEnergy: 150,
    stress: 20,
    happiness: 55,
    reputation: 0,

    skills: { networking: 5, communication: 5, sales: 5, discipline: 5 },

    connections: {}, // firmId -> number

    apartmentId: null,
    evictionWarnings: 0,

    car: { id: "none", balance: 0, missedPayments: 0 },

    employment: null, // {firmId, track, titleIndex, monthsInTitle, monthsAtFirm, perfAccum:[], strikes, hireMonth}
    ibExperienceMonths: 0,
    careerMonthsWorked: 0,

    firmCooldowns: {}, // firmId -> month number you can reapply
    interviewsThisMonth: 0,
    jobHopCount: 0,
    jobHopPenaltyUntil: 0, // month number; reputation/hire-chance stigma from quitting too soon

    education: { inMBA: false, mbaMonthsLeft: 0, hasMBA: false, mbaOfferMade: false },

    dating: { pool: generateDatingPool(), partnerId: null, married: false },

    log: [],
    gameOver: false,
    gameOverReason: "",
    legendShown: false,
    mbaEligibleShown: false
  };
}

function newGame(name, slot) {
  Object.keys(STATE).forEach(k => delete STATE[k]);
  Object.assign(STATE, freshStateDefaults(), {
    name: name || "Alex Ward",
    activeSlot: slot || 1
  });

  logEvent("You graduated with a finance degree, $450,000 in student debt, and a dream: become the best investment banker who ever lived.");
  save();
}

function logEvent(text) {
  STATE.log.unshift({ month: STATE.totalMonths, text });
  if (STATE.log.length > 200) STATE.log.length = 200;
}

/* ---------------- Persistence (5 save slots) ---------------- */

function slotKey(slot) { return SAVE_KEY_PREFIX + slot; }

function getActiveSlot() {
  try {
    const v = Number(localStorage.getItem(ACTIVE_SLOT_KEY));
    return v >= 1 && v <= SAVE_SLOT_COUNT ? v : null;
  } catch (e) { return null; }
}

function setActiveSlot(slot) {
  STATE.activeSlot = slot;
  try { localStorage.setItem(ACTIVE_SLOT_KEY, String(slot)); } catch (e) { /* ignore */ }
}

// One-time migration: bring an old single-save-file player into slot 1,
// and make it the active slot so their game still resumes automatically.
function migrateLegacySave() {
  try {
    const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!legacy) return;
    if (!localStorage.getItem(slotKey(1))) {
      localStorage.setItem(slotKey(1), legacy);
    }
    if (!localStorage.getItem(ACTIVE_SLOT_KEY)) {
      localStorage.setItem(ACTIVE_SLOT_KEY, "1");
    }
    localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch (e) { /* ignore */ }
}

function save() {
  const slot = STATE.activeSlot || getActiveSlot() || 1;
  try { localStorage.setItem(slotKey(slot), JSON.stringify(STATE)); } catch (e) { /* storage unavailable */ }
}

function load(slot) {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    Object.keys(STATE).forEach(k => delete STATE[k]);
    // Merge onto fresh defaults first so fields missing from an older save
    // (schema drift across versions) don't leave STATE with undefined spots.
    Object.assign(STATE, freshStateDefaults(), parsed);
    STATE.activeSlot = slot;
    return true;
  } catch (e) { return false; }
}

function hasSaveInSlot(slot) {
  try { return !!localStorage.getItem(slotKey(slot)); } catch (e) { return false; }
}

function deleteSlot(slot) {
  try { localStorage.removeItem(slotKey(slot)); } catch (e) { /* ignore */ }
}

// Wipes only the currently active slot (used by "start a new career" after game over).
function wipeSave() {
  const slot = STATE.activeSlot || getActiveSlot() || 1;
  deleteSlot(slot);
}

function getSlotSummary(slot) {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const s = JSON.parse(raw);
    let status = "Unemployed";
    if (s.education && s.education.inMBA) {
      status = "MBA Student";
    } else if (s.employment) {
      const titles = s.employment.track === "IB" ? DATA.TITLES_IB : DATA.TITLES_PE;
      const firm = DATA.FIRMS.find(f => f.id === s.employment.firmId);
      status = `${titles[s.employment.titleIndex]}${firm ? " @ " + firm.name : ""}`;
    }
    const car = s.car && s.car.id !== "none" ? DATA.CARS.find(c => c.id === s.car.id) : null;
    const carValue = car ? car.cashPrice * 0.55 : 0;
    const netWorth = Math.round((s.cash || 0) + (s.savings || 0) + (s.investment || 0) + carValue - (s.debt || 0) - (s.car ? s.car.balance || 0 : 0));
    return {
      name: s.name, ageYears: s.ageYears, ageMonths: s.ageMonths,
      status, netWorth, gameOver: !!s.gameOver
    };
  } catch (e) { return null; }
}

/* ---------------- Derived helpers ---------------- */

function currentTitleTrackName() {
  if (!STATE.employment) return null;
  return STATE.employment.track === "IB" ? DATA.TITLES_IB[STATE.employment.titleIndex] : DATA.TITLES_PE[STATE.employment.titleIndex];
}

function currentFirm() {
  if (!STATE.employment) return null;
  return DATA.FIRMS.find(f => f.id === STATE.employment.firmId);
}

function currentBaseSalary() {
  if (!STATE.employment) return 0;
  const firm = currentFirm();
  const base = STATE.employment.track === "IB" ? DATA.BASE_IB[STATE.employment.titleIndex] : DATA.BASE_PE[STATE.employment.titleIndex];
  return Math.round(base * firm.mult);
}

function titleSeniorityLabel() {
  // Used for gating apartments/cars ("VP" / "Associate" tier and above)
  if (!STATE.employment) return "None";
  const idx = STATE.employment.titleIndex;
  if (STATE.employment.track === "IB") {
    if (idx >= 6) return "VP";
    if (idx >= 3) return "Associate";
    return "Analyst";
  } else {
    if (idx >= 2) return "VP";
    return "Associate";
  }
}

function meetsSeniority(reqTrack) {
  const order = ["Analyst", "Associate", "VP"];
  const cur = titleSeniorityLabel();
  if (cur === "None") return false;
  return order.indexOf(cur) >= order.indexOf(reqTrack);
}

function netWorth() {
  const carValue = STATE.car.id !== "none" ? (DATA.CARS.find(c => c.id === STATE.car.id).cashPrice * 0.55) : 0;
  return Math.round(STATE.cash + STATE.savings + STATE.investment + carValue - STATE.debt - STATE.car.balance);
}

function ageString() {
  return STATE.ageYears + "y " + STATE.ageMonths + "m";
}
