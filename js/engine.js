/* ==========================================================================
   ENGINE.JS — all game actions and the monthly simulation tick.
   ========================================================================== */

const ENGINE = {};

/* ---------------- Generic resource helpers ---------------- */

function canAfford(cost) { return STATE.cash >= cost; }
function spend(cost) { STATE.cash -= cost; }
function hasEnergy(cost) { return STATE.energy >= cost; }
function spendEnergy(cost) { STATE.energy = clamp(STATE.energy - cost, 0, STATE.maxEnergy); }

function addStress(v) { STATE.stress = clamp(STATE.stress + v, 0, 100); }
function addHappiness(v) { STATE.happiness = clamp(STATE.happiness + v, 0, 100); }
function addReputation(v) { STATE.reputation = clamp(STATE.reputation + v, -100, 200); }
function addSkill(skill, v) { STATE.skills[skill] = clamp(STATE.skills[skill] + v, 0, 100); }

/* ---------------- Networking ---------------- */

ENGINE.doNetworkingEvent = function (eventId) {
  const ev = DATA.NETWORKING_EVENTS.find(e => e.id === eventId);
  if (!ev) return { ok: false, msg: "Unknown event." };
  if (!canAfford(ev.cost)) return { ok: false, msg: "You can't afford this event." };
  if (!hasEnergy(ev.energy)) return { ok: false, msg: "You're too exhausted for this." };
  spend(ev.cost);
  spendEnergy(ev.energy);
  const netGain = randInt(ev.networkingGain[0], ev.networkingGain[1]);
  const commGain = randInt(ev.commGain[0], ev.commGain[1]);
  addSkill("networking", netGain);
  addSkill("communication", commGain);
  addHappiness(1);
  logEvent(`Attended "${ev.name}" — Networking +${netGain}, Communication +${commGain}.`);
  save();
  return { ok: true };
};

/* ---------------- Training ---------------- */

ENGINE.doTraining = function (actionId) {
  const a = DATA.TRAINING_ACTIONS.find(x => x.id === actionId);
  if (!a) return { ok: false, msg: "Unknown action." };
  if (!canAfford(a.cost)) return { ok: false, msg: "You can't afford this." };
  if (!hasEnergy(a.energy)) return { ok: false, msg: "You're too exhausted for this." };
  spend(a.cost);
  spendEnergy(a.energy);
  const gain = randInt(a.gain[0], a.gain[1]);
  addSkill(a.skill, gain);
  logEvent(`${a.name} — ${a.skill[0].toUpperCase() + a.skill.slice(1)} +${gain}.`);
  save();
  return { ok: true };
};

/* ---------------- Career: applying & hiring ---------------- */

ENGINE.firmEligibility = function (firmId) {
  const firm = DATA.FIRMS.find(f => f.id === firmId);
  const reasons = [];
  if (firm.type === "PE" && STATE.ibExperienceMonths < firm.minIBMonths) {
    reasons.push(`Requires ${Math.round(firm.minIBMonths / 12 * 10) / 10}+ years of IB experience.`);
  }
  if (STATE.skills.networking < firm.reqNetworking) reasons.push(`Needs Networking ${firm.reqNetworking}+ (you: ${STATE.skills.networking}).`);
  if (STATE.skills.communication < firm.reqComm) reasons.push(`Needs Communication ${firm.reqComm}+ (you: ${STATE.skills.communication}).`);
  return { eligible: reasons.length === 0, reasons };
};

ENGINE.hireAtFirm = function (firmId, track, offerScore) {
  const firm = DATA.FIRMS.find(f => f.id === firmId);
  let titleIndex = 0;
  if (STATE.education.hasMBA && track === "IB") titleIndex = 3; // Associate I
  if (STATE.education.hasMBA && track === "PE") titleIndex = 0; // PE Associate
  if (track === "PE" && !STATE.education.hasMBA) titleIndex = 0;

  STATE.employment = {
    firmId, track, titleIndex,
    monthsInTitle: 0,
    monthsAtFirm: 0,
    perfAccum: [],
    yearPerfAccum: [],
    strikes: 0
  };
  addReputation(5);
  logEvent(`You accepted an offer from ${firm.name} as ${track === "IB" ? DATA.TITLES_IB[titleIndex] : DATA.TITLES_PE[titleIndex]}!`);
  save();
};

ENGINE.resign = function () {
  if (!STATE.employment) return;
  const firm = currentFirm();
  logEvent(`You resigned from ${firm.name}.`);
  STATE.employment = null;
  addStress(10);
  save();
};

/* ---------------- MBA ---------------- */

ENGINE.canStartMBA = function () {
  return (STATE.careerMonthsWorked || 0) >= 36 && !STATE.education.inMBA && !STATE.education.hasMBA;
};

ENGINE.startMBA = function (recruitTarget) {
  if (!ENGINE.canStartMBA()) return { ok: false, msg: "You're not eligible yet." };
  if (STATE.employment) ENGINE.resign();
  STATE.debt += 220000;
  STATE.education.inMBA = true;
  STATE.education.mbaMonthsLeft = 24;
  STATE.education.recruitTarget = recruitTarget;
  STATE.education.perfAccum = [];
  addStress(8);
  logEvent(`You enrolled in a top MBA program. Tuition and living costs added $220,000 to your debt. Two years of full-time study begin now.`);
  save();
  return { ok: true };
};

function graduateMBA() {
  STATE.education.inMBA = false;
  STATE.education.hasMBA = true;
  const acc = STATE.education.perfAccum || [];
  const avg = acc.length ? acc.reduce((a, b) => a + b, 0) / acc.length : 0.4;
  logEvent(`You graduated with your MBA. Recruiting performance score: ${(avg * 100).toFixed(0)}/100.`);

  const target = STATE.education.recruitTarget || "IB";
  let candidates = DATA.FIRMS.filter(f => f.type === target && (target === "IB" || STATE.ibExperienceMonths >= f.minIBMonths));
  if (candidates.length === 0) candidates = DATA.FIRMS.filter(f => f.type === "IB");
  candidates = candidates.slice().sort((a, b) => a.prestige - b.prestige);

  let chosen;
  if (avg >= 0.75) chosen = candidates[candidates.length - 1];
  else if (avg >= 0.5) chosen = candidates[Math.floor(candidates.length / 2)];
  else chosen = candidates[0];

  ENGINE.hireAtFirm(chosen.id, target, avg);
  save();
}

/* ---------------- Housing ---------------- */

ENGINE.moveApartment = function (aptId) {
  const apt = DATA.APARTMENTS.find(a => a.id === aptId);
  if (!apt) return { ok: false, msg: "Unknown apartment." };
  if (apt.minTitleTrack && !meetsSeniority(apt.minTitleTrack)) {
    return { ok: false, msg: `You need to be at least a ${apt.minTitleTrack} to qualify for this address.` };
  }
  if (!canAfford(apt.moveInCost)) return { ok: false, msg: "You can't afford the move-in cost (deposit + fees)." };
  spend(apt.moveInCost);
  STATE.apartmentId = aptId;
  STATE.evictionWarnings = 0;
  logEvent(`You moved into: ${apt.name}.`);
  save();
  return { ok: true };
};

/* ---------------- Cars ---------------- */

ENGINE.buyCar = function (carId, financed) {
  const car = DATA.CARS.find(c => c.id === carId);
  if (!car) return { ok: false, msg: "Unknown car." };
  if (car.minTitleTrack && !meetsSeniority(car.minTitleTrack)) {
    return { ok: false, msg: `You need to be at least a ${car.minTitleTrack} for this car.` };
  }
  if (STATE.car.balance > 0) return { ok: false, msg: "Pay off or sell your current car first." };

  if (carId === "none") {
    STATE.car = { id: "none", balance: 0, missedPayments: 0 };
    logEvent("You sold your car. Back to the subway.");
    save();
    return { ok: true };
  }

  if (financed) {
    if (!canAfford(car.downPayment)) return { ok: false, msg: "You can't afford the down payment." };
    spend(car.downPayment);
    STATE.car = { id: carId, balance: car.cashPrice - car.downPayment, missedPayments: 0 };
    logEvent(`You financed a ${car.name}. Down payment: ${fmtMoney(car.downPayment)}.`);
  } else {
    if (!canAfford(car.cashPrice)) return { ok: false, msg: "You can't afford this car in cash." };
    spend(car.cashPrice);
    STATE.car = { id: carId, balance: 0, missedPayments: 0 };
    logEvent(`You bought a ${car.name} in cash.`);
  }
  addReputation(Math.round(car.reputation / 2));
  save();
  return { ok: true };
};

/* ---------------- Banking ---------------- */

ENGINE.transferToSavings = function (amount) {
  if (amount <= 0 || amount > STATE.cash) return { ok: false, msg: "Invalid amount." };
  STATE.cash -= amount;
  STATE.savings += amount;
  save();
  return { ok: true };
};

ENGINE.transferToChecking = function (amount) {
  if (amount <= 0 || amount > STATE.savings) return { ok: false, msg: "Invalid amount." };
  STATE.savings -= amount;
  STATE.cash += amount;
  save();
  return { ok: true };
};

ENGINE.investFunds = function (amount) {
  if (amount <= 0 || amount > STATE.cash) return { ok: false, msg: "Invalid amount." };
  STATE.cash -= amount;
  STATE.investment += amount;
  save();
  return { ok: true };
};

ENGINE.divestFunds = function (amount) {
  if (amount <= 0 || amount > STATE.investment) return { ok: false, msg: "Invalid amount." };
  STATE.investment -= amount;
  STATE.cash += amount;
  save();
  return { ok: true };
};

ENGINE.payLoan = function (amount) {
  if (amount <= 0 || amount > STATE.cash) return { ok: false, msg: "Invalid amount." };
  const payment = Math.min(amount, STATE.debt);
  STATE.cash -= payment;
  STATE.debt = Math.max(0, STATE.debt - payment);
  if (amount >= STATE.loanMinPayment - 0.01 || STATE.debt === 0) {
    STATE.loanPaymentDue = false;
    STATE.loanMissedPayments = 0;
  }
  addSkill("discipline", 1);
  logEvent(`Paid ${fmtMoney(payment)} toward your student loans. Balance: ${fmtMoney(STATE.debt)}.`);
  save();
  return { ok: true };
};

/* ---------------- Dating ---------------- */

ENGINE.messageCandidate = function (id) {
  const c = STATE.dating.pool.find(p => p.id === id);
  if (!c) return { ok: false };
  if (!hasEnergy(5)) return { ok: false, msg: "Too exhausted to text back." };
  spendEnergy(5);
  if (c.status === "unmet") c.status = "talking";
  const gain = randInt(1, 4) + Math.round(STATE.skills.communication / 25);
  c.relationship = clamp(c.relationship + gain, 0, 100);
  logEvent(`You messaged ${c.name}. Relationship +${gain}.`);
  save();
  return { ok: true };
};

ENGINE.goOnDate = function (id) {
  const c = STATE.dating.pool.find(p => p.id === id);
  if (!c) return { ok: false };
  const cost = 70;
  if (!canAfford(cost)) return { ok: false, msg: "You can't afford a date right now." };
  if (!hasEnergy(14)) return { ok: false, msg: "Too exhausted for a date tonight." };
  spend(cost);
  spendEnergy(14);
  c.status = "dating";
  const commBonus = Math.round(STATE.skills.communication / 15);
  const salesBonus = Math.round(STATE.skills.sales / 20);
  const roll = randInt(-5, 12) + commBonus + salesBonus;
  c.relationship = clamp(c.relationship + roll, 0, 100);
  addHappiness(6);
  addStress(-3);
  logEvent(roll >= 5 ? `Great date with ${c.name}! Relationship +${roll}.` : `A decent date with ${c.name}. Relationship +${roll}.`);
  save();
  return { ok: true };
};

ENGINE.defineRelationship = function (id) {
  const c = STATE.dating.pool.find(p => p.id === id);
  if (!c) return { ok: false };
  if (c.relationship < 40) return { ok: false, msg: "You're not close enough yet." };
  if (STATE.dating.partnerId) return { ok: false, msg: "You're already seeing someone." };
  c.status = "partner";
  STATE.dating.partnerId = id;
  addHappiness(10);
  logEvent(`You and ${c.name} made it official.`);
  save();
  return { ok: true };
};

ENGINE.breakUp = function () {
  const id = STATE.dating.partnerId;
  if (!id) return;
  const c = STATE.dating.pool.find(p => p.id === id);
  if (c) { c.status = "unmet"; c.relationship = 0; }
  STATE.dating.partnerId = null;
  STATE.dating.married = false;
  addHappiness(-15);
  addStress(10);
  logEvent(`You and ${c ? c.name : "your partner"} broke up.`);
  save();
};

ENGINE.propose = function () {
  const id = STATE.dating.partnerId;
  const c = STATE.dating.pool.find(p => p.id === id);
  if (!c || c.relationship < 90) return { ok: false, msg: "Your relationship isn't strong enough yet." };
  const cost = 12000;
  if (!canAfford(cost)) return { ok: false, msg: "You can't afford a ring and wedding right now (~$12,000)." };
  spend(cost);
  c.status = "married";
  STATE.dating.married = true;
  addHappiness(25);
  addStress(-10);
  logEvent(`You married ${c.name}! The wedding cost ${fmtMoney(cost)}, but it was worth it.`);
  save();
  return { ok: true };
};

/* ---------------- Interview resolution ---------------- */

ENGINE.resolveInterview = function (firmId, track, scorePct) {
  const firm = DATA.FIRMS.find(f => f.id === firmId);
  const commBoost = STATE.skills.communication / 250; // up to +0.4
  const finalScore = clamp(scorePct + commBoost + 0.12, 0, 1); // +0.12 base courtesy cushion
  let outcome;
  if (finalScore >= 0.7) outcome = "strong";
  else if (finalScore >= 0.42) outcome = "pass";
  else if (finalScore >= 0.22) outcome = "borderline";
  else outcome = "reject";

  if (outcome === "reject") {
    logEvent(`${firm.name} passed on you this round. Keep networking and sharpen up.`);
    addStress(5);
    save();
    return { hired: false, outcome };
  }

  // Even a good interview doesn't guarantee an offer -- more prestigious firms
  // have far more applicants per seat, independent of how well you did.
  const competitiveness = firm.competitiveness != null ? firm.competitiveness : 0.3;
  const tierBaseChance = { strong: 0.92, pass: 0.72, borderline: 0.45 }[outcome];
  const hireChance = clamp(tierBaseChance - competitiveness * 0.5, 0.04, 0.97);

  if (Math.random() > hireChance) {
    logEvent(`${firm.name} liked what they saw, but the seat went to another candidate — roles at a ${firm.tier} shop are brutally competitive.`);
    addStress(4);
    save();
    return { hired: false, outcome };
  }

  ENGINE.hireAtFirm(firmId, track, finalScore);
  return { hired: true, outcome };
};

/* ---------------- Monthly work performance -> pay math ---------------- */

function performanceToBonusMult(range, score) {
  return range[0] + (range[1] - range[0]) * score;
}

// Rough combined effective rate (federal + state + city + FICA) for a NYC-based banker.
function effectiveTaxRate(annualIncome) {
  if (annualIncome < 60000) return 0.20;
  if (annualIncome < 120000) return 0.26;
  if (annualIncome < 220000) return 0.31;
  if (annualIncome < 450000) return 0.36;
  if (annualIncome < 900000) return 0.40;
  return 0.43;
}

function payMonthlyPaycheck() {
  if (!STATE.employment) return;
  const annual = currentBaseSalary();
  const grossMonthly = annual / 12;
  const netMonthly = grossMonthly * (1 - effectiveTaxRate(annual));
  STATE.cash += netMonthly;
}

function checkPromotion() {
  const e = STATE.employment;
  const track = e.track;
  const titles = track === "IB" ? DATA.TITLES_IB : DATA.TITLES_PE;
  const monthsArr = track === "IB" ? DATA.MONTHS_PER_TITLE_IB : DATA.MONTHS_PER_TITLE_PE;
  const monthsNeeded = monthsArr[e.titleIndex];
  if (e.monthsInTitle < monthsNeeded) return;
  if (e.titleIndex >= titles.length - 1) return; // already at top

  const avg = e.perfAccum.length ? e.perfAccum.reduce((a, b) => a + b, 0) / e.perfAccum.length : 0.4;
  if (avg >= 0.45) {
    e.titleIndex++;
    e.monthsInTitle = 0;
    e.perfAccum = [];
    addReputation(8);
    logEvent(`Promoted to ${titles[e.titleIndex]}! Your hard work paid off.`);
  } else {
    // Not promoted on schedule; gentle reset window, slight morale hit
    e.monthsInTitle = Math.round(monthsNeeded * 0.5);
    addStress(6);
    logEvent(`You were passed over for promotion this cycle. Performance needs to improve.`);
  }
}

const OUTPERFORMANCE_THRESHOLD = 0.6; // performance score above 60/100
const OUTPERFORMANCE_BONUS_RATE = 0.12; // extra % of base salary

function payYearEndBonus() {
  const e = STATE.employment;
  const track = e.track;
  const range = (track === "IB" ? DATA.BONUS_RANGE_IB : DATA.BONUS_RANGE_PE)[e.titleIndex];
  const acc = e.yearPerfAccum && e.yearPerfAccum.length ? e.yearPerfAccum : e.perfAccum;
  const avg = acc.length ? acc.reduce((a, b) => a + b, 0) / acc.length : 0.4;
  const salesBoost = STATE.skills.sales / 500; // up to +0.2
  const mult = performanceToBonusMult(range, clamp(avg + salesBoost, 0, 1));
  const grossBonus = Math.round(currentBaseSalary() * mult);
  const netBonus = Math.round(grossBonus * (1 - effectiveTaxRate(currentBaseSalary() + grossBonus)));
  STATE.cash += netBonus;
  logEvent(`Year-end bonus at ${currentFirm().name}: ${fmtMoney(netBonus)} after tax (gross ${fmtMoney(grossBonus)}, performance ${(avg * 100).toFixed(0)}/100).`);

  if (avg > OUTPERFORMANCE_THRESHOLD) {
    const grossKicker = Math.round(currentBaseSalary() * OUTPERFORMANCE_BONUS_RATE);
    const netKicker = Math.round(grossKicker * (1 - effectiveTaxRate(currentBaseSalary() + grossBonus + grossKicker)));
    STATE.cash += netKicker;
    addReputation(3);
    logEvent(`Outperformance bonus: your ${(avg * 100).toFixed(0)}/100 average this year topped the firm's 60/100 bar, earning an extra ${fmtMoney(netKicker)}.`);
  }
}

/* ---------------- Billing ---------------- */

function billRent() {
  if (!STATE.apartmentId) return;
  const apt = DATA.APARTMENTS.find(a => a.id === STATE.apartmentId);
  STATE.cash -= apt.monthlyRent;
  if (STATE.cash < -1500) {
    STATE.evictionWarnings++;
    addStress(4);
    if (STATE.evictionWarnings >= 4) {
      logEvent(`You fell too far behind on rent and were evicted from ${apt.name}. You're back in your parents' basement.`);
      STATE.apartmentId = "basement";
      STATE.evictionWarnings = 0;
      addReputation(-6);
    }
  } else {
    STATE.evictionWarnings = Math.max(0, STATE.evictionWarnings - 1);
  }
}

function billCarLoan() {
  if (STATE.car.balance <= 0) return;
  const car = DATA.CARS.find(c => c.id === STATE.car.id);
  if (STATE.cash >= car.monthlyPayment) {
    STATE.cash -= car.monthlyPayment;
    STATE.car.balance = Math.max(0, STATE.car.balance - car.monthlyPayment);
    STATE.car.missedPayments = 0;
  } else {
    STATE.car.missedPayments++;
    addStress(6);
    addReputation(-3);
    logEvent(`You missed your car payment on the ${car.name}.`);
    if (STATE.car.missedPayments >= 3) {
      logEvent(`Your ${car.name} was repossessed.`);
      STATE.car = { id: "none", balance: 0, missedPayments: 0 };
      addReputation(-10);
    }
  }
}

function billStudentLoan() {
  if (STATE.debt <= 0) return;

  if (STATE.loanPaymentDue) {
    // Payment was due and never made -> penalty
    const lateFee = 175;
    STATE.debt += lateFee;
    STATE.loanMissedPayments = (STATE.loanMissedPayments || 0) + 1;
    addSkill("discipline", -4);
    addReputation(-4);
    addStress(10);
    logEvent(`You missed your student loan payment! A ${fmtMoney(lateFee)} late fee was added and your credit took a hit.`);
    if (STATE.loanMissedPayments >= 4) {
      STATE.gameOver = true;
      STATE.gameOverReason = "Your student loans went into default. Wages garnished, credit destroyed — your banking career is over.";
    }
  }

  const interest = STATE.debt * (STATE.loanAPR / 12);
  STATE.debt += interest;
  STATE.loanPaymentDue = true;
}

function billSavingsAndInvestments() {
  STATE.savings *= (1 + DATA.SAVINGS_APY / 12);
  if (STATE.investment > 0) {
    STATE.investment *= (1 + rand(-0.06, 0.07));
  }
}

function maybeRandomEvent() {
  if (Math.random() > 0.35) return;
  const ev = pickRandom(DATA.LIFE_EVENTS);
  if (ev.cash) STATE.cash += ev.cash;
  if (ev.stress) addStress(ev.stress);
  if (ev.energy) STATE.energy = clamp(STATE.energy + ev.energy, 0, STATE.maxEnergy);
  if (ev.happiness) addHappiness(ev.happiness);
  logEvent(ev.text);
}

function datingDecay() {
  STATE.dating.pool.forEach(c => {
    if (c.status === "dating" || c.status === "partner" || c.status === "married") {
      const decay = c.status === "married" ? 1 : 2;
      c.relationship = clamp(c.relationship - decay, 0, 100);
      if (c.relationship <= 0 && c.status !== "married" && STATE.dating.partnerId === c.id) {
        ENGINE.breakUp();
      }
    }
  });
}

/* ---------------- Month advance orchestration ---------------- */

ENGINE.needsMinigameThisMonth = function () {
  return !!STATE.employment || STATE.education.inMBA;
};

ENGINE.finishMonth = function (perfScore) {
  if (STATE.gameOver) return;

  // Age up
  STATE.ageMonths++;
  STATE.totalMonths++;
  if (STATE.ageMonths >= 12) {
    STATE.ageMonths = 0;
    STATE.ageYears++;
    addHappiness(5);
    logEvent(`Happy birthday — you're now ${STATE.ageYears}.`);
  }

  // Work / school performance
  if (STATE.employment && perfScore !== null && perfScore !== undefined) {
    payMonthlyPaycheck();
    STATE.employment.perfAccum.push(perfScore);
    STATE.employment.yearPerfAccum = STATE.employment.yearPerfAccum || [];
    STATE.employment.yearPerfAccum.push(perfScore);
    STATE.employment.monthsInTitle++;
    STATE.employment.monthsAtFirm++;
    STATE.careerMonthsWorked = (STATE.careerMonthsWorked || 0) + 1;
    if (STATE.employment.track === "IB") STATE.ibExperienceMonths++;

    if (perfScore < 0.2) {
      STATE.employment.strikes++;
      addStress(8);
      logEvent(`Rough month at the desk. Your MD noticed. (Strike ${STATE.employment.strikes}/3)`);
      if (STATE.employment.strikes >= 3) {
        const firmName = currentFirm().name;
        logEvent(`You were let go from ${firmName} after repeated performance issues.`);
        STATE.employment = null;
        addReputation(-15);
        addStress(15);
      }
    } else if (perfScore >= 0.7) {
      STATE.employment.strikes = Math.max(0, STATE.employment.strikes - 1);
      addSkill("discipline", 1);
    }

    if (STATE.employment) {
      if (STATE.employment.monthsAtFirm > 0 && STATE.employment.monthsAtFirm % 12 === 0) {
        payYearEndBonus();
        STATE.employment.yearPerfAccum = [];
      }
      checkPromotion();
    }
    spendEnergy(0); // energy already spent by minigame itself
  } else if (STATE.education.inMBA && perfScore !== null && perfScore !== undefined) {
    STATE.education.perfAccum = STATE.education.perfAccum || [];
    STATE.education.perfAccum.push(perfScore);
    STATE.education.mbaMonthsLeft--;
    if (STATE.education.mbaMonthsLeft <= 0) {
      graduateMBA();
    }
  }

  // Billing
  billRent();
  billCarLoan();
  billStudentLoan();
  billSavingsAndInvestments();
  datingDecay();
  maybeRandomEvent();

  // Energy & stress natural drift (monthly reset)
  STATE.energy = clamp(STATE.energy + 100, 0, STATE.maxEnergy);
  if (STATE.stress > 60) addHappiness(-2);
  addStress(STATE.happiness > 55 ? -3 : 1);
  if (STATE.debt > 0) addStress(1);

  // Debt payoff win flavor
  if (STATE.debt <= 0 && !STATE.debtFreeLogged) {
    STATE.debtFreeLogged = true;
    logEvent(`You are officially DEBT FREE. $450,000 paid off. Incredible.`);
    addHappiness(20);
    addStress(-15);
  }

  // Legend ending check (does not stop the game, just celebrates once)
  if (!STATE.legendShown && STATE.employment) {
    const topIB = STATE.employment.track === "IB" && STATE.employment.titleIndex === DATA.TITLES_IB.length - 1;
    const topPE = STATE.employment.track === "PE" && STATE.employment.titleIndex === DATA.TITLES_PE.length - 1;
    if (topIB || topPE) {
      STATE.legendShown = true;
      STATE.pendingLegend = true;
    }
  }

  if (STATE.cash < -25000) {
    STATE.gameOver = true;
    STATE.gameOverReason = "You spiraled into unmanageable debt and creditors came calling. Game over.";
  }

  save();
};
