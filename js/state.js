/* ==========================================================================
   STATE.JS — game state shape, persistence, and pure helper calculations.
   ========================================================================== */

const SAVE_KEY = "ib_sim_save_v1";

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

function newGame(name) {
  const minMonthly = calcMonthlyLoanPayment(DATA.STARTING_DEBT, DATA.LOAN_APR, DATA.LOAN_TERM_MONTHS);

  Object.assign(STATE, {
    name: name || "Alex Ward",
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

    employment: null, // {firmId, track, titleIndex, monthsInTitle, monthsAtFirm, perfAccum:[], strikes}
    ibExperienceMonths: 0,
    careerMonthsWorked: 0,

    education: { inMBA: false, mbaMonthsLeft: 0, hasMBA: false, mbaOfferMade: false },

    dating: { pool: generateDatingPool(), partnerId: null, married: false },

    log: [],
    gameOver: false,
    gameOverReason: "",
    legendShown: false,
    mbaEligibleShown: false
  });

  logEvent("You graduated with a finance degree, $450,000 in student debt, and a dream: become the best investment banker who ever lived.");
  save();
}

function logEvent(text) {
  STATE.log.unshift({ month: STATE.totalMonths, text });
  if (STATE.log.length > 200) STATE.log.length = 200;
}

/* ---------------- Persistence ---------------- */

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(STATE)); } catch (e) { /* storage unavailable */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    Object.assign(STATE, parsed);
    return true;
  } catch (e) { return false; }
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
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
