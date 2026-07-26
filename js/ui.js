/* ==========================================================================
   UI.JS — rendering for header, tabs, and all modals.
   ========================================================================== */

const UI = { activeTab: "dashboard" };

function el(id) { return document.getElementById(id); }

UI.toast = function (msg, isError) {
  const t = el("toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  clearTimeout(UI._toastTimer);
  UI._toastTimer = setTimeout(() => { t.className = "toast"; }, 2600);
};

UI.setTab = function (tab) { UI.activeTab = tab; UI.renderAll(); };

UI.applyUIMode = function () {
  const mobile = STATE.uiMode === "mobile";
  document.documentElement.classList.toggle("ui-mobile", mobile);
};

UI.toggleUIMode = function () {
  STATE.uiMode = STATE.uiMode === "mobile" ? "desktop" : "mobile";
  save();
  UI.renderAll();
};

/* ---------------- Master render ---------------- */

UI.renderAll = function () {
  if (!STATE.characterCreated) { UI.showCharacterCreation(); return; }
  UI.applyUIMode();
  clearModal();
  if (!STATE.apartmentId) { UI.showApartmentGate(); }
  UI.renderHeader();
  UI.renderTabs();
  UI.renderTabContent();
  if (STATE.gameOver) UI.showGameOver();
  else if (STATE.pendingLegend) UI.showLegend();
};

/* ---------------- Header ---------------- */

UI.renderHeader = function () {
  const year = Math.floor(STATE.totalMonths / 12) + 1;
  const month = (STATE.totalMonths % 12) + 1;
  let statusLine;
  if (STATE.education.inMBA) statusLine = `MBA Student (Year ${Math.ceil((24 - STATE.education.mbaMonthsLeft + 1) / 12)})`;
  else if (STATE.employment) statusLine = `${currentTitleTrackName()} @ ${currentFirm().name}`;
  else statusLine = "Unemployed — job hunting";

  el("header").innerHTML = `
    <div class="hdr-row1">
      <div class="hdr-name">${STATE.name}</div>
      <div class="hdr-age">Age ${ageString()} · Career Year ${year}, Month ${month}</div>
      <div class="hdr-status">${statusLine}</div>
      <button class="layout-toggle save-toggle" onclick="UI.showSlotPicker({forced:false})" title="Switch save" aria-label="Switch save">💾</button>
      <button class="layout-toggle" onclick="UI.toggleUIMode()" title="Switch layout" aria-label="Switch layout">${STATE.uiMode === "mobile" ? "🖥️" : "📱"}</button>
    </div>
    <div class="hdr-row2">
      <div class="chip">Cash <b>${fmtMoney(STATE.cash)}</b></div>
      <div class="chip">Savings <b>${fmtMoney(STATE.savings)}</b></div>
      <div class="chip debt">Debt <b>${fmtMoney(STATE.debt)}</b>${STATE.loanPaymentDue ? ' <span class="due-badge">DUE</span>' : ""}</div>
      <div class="chip">Net Worth <b class="${netWorth() >= 0 ? "pos" : "neg"}">${fmtMoney(netWorth())}</b></div>
    </div>
    <div class="hdr-bars">
      <div class="bar-wrap"><span>Energy ${Math.round(STATE.energy)}/${STATE.maxEnergy}</span><div class="bar"><div class="bar-fill energy" style="width:${clamp(STATE.energy / STATE.maxEnergy * 100, 0, 100)}%"></div></div></div>
      <div class="bar-wrap"><span>Stress</span><div class="bar"><div class="bar-fill stress" style="width:${STATE.stress}%"></div></div></div>
      <div class="bar-wrap"><span>Happiness</span><div class="bar"><div class="bar-fill happy" style="width:${STATE.happiness}%"></div></div></div>
      <div class="bar-wrap"><span>Reputation</span><div class="bar"><div class="bar-fill rep" style="width:${clamp(STATE.reputation + 20, 0, 100)}%"></div></div></div>
    </div>
  `;
};

/* ---------------- Tabs ---------------- */

const TAB_LIST = [
  ["dashboard", "Dashboard"], ["career", "Career"], ["skills", "Skills"],
  ["networking", "Networking"], ["bank", "Bank"], ["housing", "Housing"],
  ["garage", "Garage"], ["dating", "Dating"], ["journal", "Journal"]
];

UI.renderTabs = function () {
  el("tabs").innerHTML = TAB_LIST.map(([id, label]) =>
    `<button class="tab-btn ${UI.activeTab === id ? "active" : ""}" onclick="UI.setTab('${id}')">${label}</button>`
  ).join("") + `<button class="tab-btn end-month-btn" onclick="UI.endMonth()">End Month &rarr;</button>`;
};

UI.renderTabContent = function () {
  const map = {
    dashboard: UI.renderDashboard, career: UI.renderCareer, skills: UI.renderSkills,
    networking: UI.renderNetworking, bank: UI.renderBank, housing: UI.renderHousing,
    garage: UI.renderGarage, dating: UI.renderDating, journal: UI.renderJournal
  };
  el("tab-content").innerHTML = map[UI.activeTab]();
};

/* ---------------- Dashboard ---------------- */

UI.renderDashboard = function () {
  const apt = STATE.apartmentId ? DATA.APARTMENTS.find(a => a.id === STATE.apartmentId) : null;
  const car = STATE.car.id !== "none" ? DATA.CARS.find(c => c.id === STATE.car.id) : null;
  const partner = STATE.dating.partnerId ? STATE.dating.pool.find(p => p.id === STATE.dating.partnerId) : null;
  const recent = STATE.log.slice(0, 6);

  let careerCard;
  if (STATE.education.inMBA) {
    const pct = Math.round((24 - STATE.education.mbaMonthsLeft) / 24 * 100);
    careerCard = `<div class="card"><h3>Business School</h3><p>Full-time MBA program in progress.</p><div class="progress-outer"><div class="progress-inner" style="width:${pct}%"></div></div><p class="muted">${STATE.education.mbaMonthsLeft} months remaining. Recruiting for: ${STATE.education.recruitTarget}</p></div>`;
  } else if (STATE.employment) {
    const e = STATE.employment;
    const titles = e.track === "IB" ? DATA.TITLES_IB : DATA.TITLES_PE;
    const monthsArr = e.track === "IB" ? DATA.MONTHS_PER_TITLE_IB : DATA.MONTHS_PER_TITLE_PE;
    const need = monthsArr[e.titleIndex];
    const pct = clamp(Math.round(e.monthsInTitle / need * 100), 0, 100);
    const avgPerf = e.perfAccum.length ? Math.round(e.perfAccum.reduce((a, b) => a + b, 0) / e.perfAccum.length * 100) : null;
    careerCard = `<div class="card">
      <h3>${currentFirm().name}</h3>
      <p>${titles[e.titleIndex]} · Base ${fmtMoney(currentBaseSalary())}/yr</p>
      <div class="progress-outer" title="Promotion progress"><div class="progress-inner" style="width:${pct}%"></div></div>
      <p class="muted">Promotion track: ${e.monthsInTitle}/${need} months · Avg performance: ${avgPerf === null ? "—" : avgPerf + "/100"} · Strikes: ${e.strikes}/3</p>
    </div>`;
  } else {
    careerCard = `<div class="card"><h3>Unemployed</h3><p>Head to the Career tab to network your way into interviews.</p></div>`;
  }

  return `
    <div class="grid-2">
      ${careerCard}
      <div class="card">
        <h3>Student Loans</h3>
        <p>Balance: <b>${fmtMoney(STATE.debt)}</b> at ${(STATE.loanAPR * 100).toFixed(1)}% APR</p>
        <p class="muted">Minimum payment: ${fmtMoney(STATE.loanMinPayment)}/month ${STATE.loanPaymentDue ? '<span class="due-badge">PAYMENT DUE — visit the Bank tab</span>' : "(current)"}</p>
      </div>
      <div class="card">
        <h3>Living Situation</h3>
        <p>${apt ? apt.name : "No apartment"} ${apt ? `— ${fmtMoney(apt.monthlyRent)}/month` : ""}</p>
        <p>${car ? car.name + (STATE.car.balance > 0 ? ` (balance ${fmtMoney(STATE.car.balance)})` : " (paid off)") : "No car"}</p>
      </div>
      <div class="card">
        <h3>Relationship</h3>
        <p>${partner ? `${partner.name} (${partner.status}) — Relationship ${partner.relationship}/100` : "Single"}</p>
      </div>
      <div class="card">
        <h3>Skills</h3>
        ${UI.skillBarsHTML()}
      </div>
      <div class="card">
        <h3>Recent Events</h3>
        <ul class="log-list">${recent.map(l => `<li>${l.text}</li>`).join("") || "<li>Nothing yet.</li>"}</ul>
      </div>
    </div>
  `;
};

UI.skillBarsHTML = function () {
  const s = STATE.skills;
  return ["networking", "communication", "sales", "discipline"].map(k => `
    <div class="skill-row">
      <span class="skill-label">${k[0].toUpperCase() + k.slice(1)}</span>
      <div class="bar"><div class="bar-fill skill" style="width:${s[k]}%"></div></div>
      <span class="skill-val">${s[k]}</span>
    </div>`).join("");
};

/* ---------------- Career ---------------- */

UI.renderCareer = function () {
  let html = "";

  const usedInterviews = STATE.interviewsThisMonth || 0;
  html += `<p class="muted">Interviews this month: ${usedInterviews}/${INTERVIEWS_PER_MONTH_CAP}${STATE.jobHopPenaltyUntil > STATE.totalMonths ? " · Firms have heard you don't stick around — hiring is tougher for you right now." : ""}</p>`;

  if (STATE.employment) {
    html += UI.renderCurrentJobCard();
  } else if (STATE.education.inMBA) {
    html += `<div class="card"><h3>Currently enrolled full-time in an MBA program.</h3><p class="muted">${STATE.education.mbaMonthsLeft} months left. Advance the month to keep studying.</p></div>`;
    return html;
  }

  if (ENGINE.canStartMBA()) {
    html += `<div class="card highlight">
      <h3>Business School</h3>
      <p>You've put in 3+ years of grinding. An MBA could reset your trajectory — at a steep cost.</p>
      <p class="muted">Cost: $220,000 (added to debt) · Duration: 2 years, no salary · You must resign first.</p>
      <div class="btn-row">
        <button class="btn" onclick="UI.startMBA('IB')">Enroll — Recruit for IB Associate</button>
        <button class="btn" onclick="UI.startMBA('PE')">Enroll — Recruit for PE Associate</button>
      </div>
    </div>`;
  }

  html += `<h3 class="section-title">Investment Banks</h3><div class="firm-grid">`;
  DATA.FIRMS.filter(f => f.type === "IB").forEach(f => { html += UI.firmCardHTML(f); });
  html += `</div>`;

  html += `<h3 class="section-title">Private Equity</h3><div class="firm-grid">`;
  DATA.FIRMS.filter(f => f.type === "PE").forEach(f => { html += UI.firmCardHTML(f); });
  html += `</div>`;

  return html;
};

UI.renderCurrentJobCard = function () {
  const e = STATE.employment;
  const firm = currentFirm();
  const titles = e.track === "IB" ? DATA.TITLES_IB : DATA.TITLES_PE;
  const tenure = STATE.totalMonths - (e.hireMonth || 0);
  const wouldHop = tenure < JOB_HOP_TENURE_THRESHOLD_MONTHS;
  return `<div class="card highlight">
    <h3>${firm.name} — ${titles[e.titleIndex]}</h3>
    <p>${firm.blurb}</p>
    <p>Base Salary: <b>${fmtMoney(currentBaseSalary())}</b>/yr</p>
    <p class="muted">Months at firm: ${e.monthsAtFirm} · Strikes: ${e.strikes}/3</p>
    ${wouldHop ? `<p class="locked">Quitting before ${JOB_HOP_TENURE_THRESHOLD_MONTHS} months hurts your reputation and makes hiring elsewhere harder for a while.</p>` : ""}
    <div class="btn-row">
      <button class="btn btn-danger" onclick="UI.resign()">Resign</button>
    </div>
  </div>`;
};

function competitivenessLabel(c) {
  if (c >= 0.8) return "Extremely High";
  if (c >= 0.6) return "High";
  if (c >= 0.35) return "Medium";
  return "Low";
}

UI.firmCardHTML = function (f) {
  const elig = ENGINE.firmEligibility(f.id);
  const isCurrent = STATE.employment && STATE.employment.firmId === f.id;
  const competitiveness = f.competitiveness != null ? f.competitiveness : 0.3;
  return `<div class="card firm-card ${isCurrent ? "current" : ""}">
    <h4>${f.name}</h4>
    <p class="muted">${f.tier} · Competitiveness: ${competitivenessLabel(competitiveness)}</p>
    <p>${f.blurb}</p>
    <p class="muted">Req: Networking ${f.reqNetworking}+, Communication ${f.reqComm}+${f.minIBMonths ? `, ${Math.round(f.minIBMonths / 12 * 10) / 10}+ yrs IB` : ""}</p>
    ${isCurrent ? '<p class="muted">Your current employer</p>' :
      elig.eligible
        ? `<button class="btn" onclick="UI.applyToFirm('${f.id}','${f.type}')">Interview</button>`
        : `<p class="locked">${elig.reasons.join(" ")}</p>`}
  </div>`;
};

UI.applyToFirm = function (firmId, track) {
  const capCheck = ENGINE.canInterviewThisMonth();
  if (!capCheck.ok) { UI.toast(capCheck.msg, true); return; }
  if (!hasEnergy(20)) { UI.toast("Too exhausted for an interview right now.", true); return; }
  spendEnergy(20);
  STATE.interviewsThisMonth = (STATE.interviewsThisMonth || 0) + 1;
  save();
  INTERVIEW.start(firmId, track, () => UI.renderAll());
};

UI.resign = function () { ENGINE.resign(); UI.renderAll(); };

UI.startMBA = function (target) {
  const r = ENGINE.startMBA(target);
  if (!r.ok) UI.toast(r.msg, true);
  UI.renderAll();
};

/* ---------------- Skills ---------------- */

UI.renderSkills = function () {
  return `<div class="card">
    <h3>Your Skills</h3>
    ${UI.skillBarsHTML()}
  </div>
  <div class="grid-2">
    ${DATA.TRAINING_ACTIONS.map(a => `
      <div class="card">
        <h4>${a.name}</h4>
        <p class="muted">Builds ${a.skill[0].toUpperCase() + a.skill.slice(1)} · Cost ${fmtMoney(a.cost)} · Energy ${a.energy}</p>
        <button class="btn" onclick="UI.doTraining('${a.id}')">Do It</button>
      </div>`).join("")}
  </div>`;
};

UI.doTraining = function (id) {
  const r = ENGINE.doTraining(id);
  if (!r.ok) UI.toast(r.msg, true);
  UI.renderAll();
};

/* ---------------- Networking ---------------- */

UI.renderNetworking = function () {
  return `<div class="grid-2">
    ${DATA.NETWORKING_EVENTS.map(ev => `
      <div class="card">
        <h4>${ev.name}</h4>
        <p>${ev.blurb}</p>
        <p class="muted">Cost ${fmtMoney(ev.cost)} · Energy ${ev.energy} · Networking +${ev.networkingGain[0]}-${ev.networkingGain[1]}</p>
        <button class="btn" onclick="UI.doNetworking('${ev.id}')">Attend</button>
      </div>`).join("")}
  </div>`;
};

UI.doNetworking = function (id) {
  const r = ENGINE.doNetworkingEvent(id);
  if (!r.ok) UI.toast(r.msg, true);
  UI.renderAll();
};

/* ---------------- Bank ---------------- */

UI.renderBank = function () {
  return `
    <div class="grid-2">
      <div class="card">
        <h3>Checking</h3>
        <p class="big-num">${fmtMoney(STATE.cash)}</p>
      </div>
      <div class="card">
        <h3>Savings <span class="muted">(${(DATA.SAVINGS_APY * 100).toFixed(1)}% APY)</span></h3>
        <p class="big-num">${fmtMoney(STATE.savings)}</p>
        <div class="btn-row">
          <input type="number" id="save-amt" class="num-input" placeholder="Amount" min="0">
          <button class="btn" onclick="UI.bankAction('toSavings')">Deposit</button>
          <button class="btn" onclick="UI.bankAction('toChecking')">Withdraw</button>
        </div>
      </div>
      <div class="card">
        <h3>Index Fund Investment</h3>
        <p class="big-num">${fmtMoney(STATE.investment)}</p>
        <p class="muted">Fluctuates monthly with the market.</p>
        <div class="btn-row">
          <input type="number" id="invest-amt" class="num-input" placeholder="Amount" min="0">
          <button class="btn" onclick="UI.bankAction('invest')">Invest</button>
          <button class="btn" onclick="UI.bankAction('divest')">Sell</button>
        </div>
      </div>
      <div class="card">
        <h3>Student Loans</h3>
        <p>Balance: <b>${fmtMoney(STATE.debt)}</b></p>
        <p class="muted">APR ${(STATE.loanAPR * 100).toFixed(1)}% · Minimum ${fmtMoney(STATE.loanMinPayment)}/month</p>
        ${STATE.loanPaymentDue ? '<p class="due-badge">PAYMENT DUE THIS CYCLE</p>' : '<p class="muted">Current</p>'}
        <div class="btn-row">
          <button class="btn" onclick="UI.payLoanMin()">Pay Minimum</button>
          <input type="number" id="loan-amt" class="num-input" placeholder="Extra amount" min="0">
          <button class="btn" onclick="UI.payLoanExtra()">Pay Amount</button>
        </div>
      </div>
    </div>
  `;
};

UI.bankAction = function (kind) {
  let amt, r;
  if (kind === "toSavings") { amt = Number(el("save-amt").value); r = ENGINE.transferToSavings(amt); }
  if (kind === "toChecking") { amt = Number(el("save-amt").value); r = ENGINE.transferToChecking(amt); }
  if (kind === "invest") { amt = Number(el("invest-amt").value); r = ENGINE.investFunds(amt); }
  if (kind === "divest") { amt = Number(el("invest-amt").value); r = ENGINE.divestFunds(amt); }
  if (r && !r.ok) UI.toast(r.msg, true);
  UI.renderAll();
};

UI.payLoanMin = function () {
  const r = ENGINE.payLoan(Math.min(STATE.loanMinPayment, STATE.cash));
  if (!r.ok) UI.toast(r.msg || "Insufficient funds.", true);
  UI.renderAll();
};

UI.payLoanExtra = function () {
  const amt = Number(el("loan-amt").value);
  const r = ENGINE.payLoan(amt);
  if (!r.ok) UI.toast(r.msg, true);
  UI.renderAll();
};

/* ---------------- Housing ---------------- */

UI.renderHousing = function (forced) {
  const current = STATE.apartmentId;
  return `
    ${forced ? '<p class="muted">You need somewhere to live before you can start your career.</p>' : ""}
    <div class="grid-2">
      ${DATA.APARTMENTS.map(a => {
        const locked = a.minTitleTrack && !meetsSeniority(a.minTitleTrack);
        const isCurrent = a.id === current;
        return `<div class="card ${isCurrent ? "current" : ""}">
          <h4>${a.name}</h4>
          <p>${a.blurb}</p>
          <p class="muted">Rent ${fmtMoney(a.monthlyRent)}/month · Move-in cost ${fmtMoney(a.moveInCost)}</p>
          ${isCurrent ? '<p class="muted">Current residence</p>' :
            locked ? `<p class="locked">Requires ${a.minTitleTrack}+ title</p>` :
            `<button class="btn" onclick="UI.moveApartment('${a.id}')">Move In</button>`}
        </div>`;
      }).join("")}
    </div>
  `;
};

UI.moveApartment = function (id) {
  const r = ENGINE.moveApartment(id);
  if (!r.ok) UI.toast(r.msg, true);
  UI.renderAll();
};

/* ---------------- Garage ---------------- */

UI.renderGarage = function () {
  return `
    <div class="grid-2">
      ${DATA.CARS.map(c => {
        const locked = c.minTitleTrack && !meetsSeniority(c.minTitleTrack);
        const isCurrent = c.id === STATE.car.id;
        return `<div class="card ${isCurrent ? "current" : ""}">
          <h4>${c.name}</h4>
          ${c.cashPrice ? `<p class="muted">Cash price ${fmtMoney(c.cashPrice)} · Finance: ${fmtMoney(c.downPayment)} down, ${fmtMoney(c.monthlyPayment)}/month</p>` : ""}
          ${isCurrent ? `<p class="muted">${STATE.car.balance > 0 ? "Balance: " + fmtMoney(STATE.car.balance) : "Owned outright"}</p>` :
            locked ? `<p class="locked">Requires ${c.minTitleTrack}+ title</p>` :
            `<div class="btn-row">
              ${c.cashPrice ? `<button class="btn" onclick="UI.buyCar('${c.id}',false)">Buy Cash</button><button class="btn" onclick="UI.buyCar('${c.id}',true)">Finance</button>` :
              `<button class="btn" onclick="UI.buyCar('${c.id}',false)">Switch</button>`}
            </div>`}
        </div>`;
      }).join("")}
    </div>
  `;
};

UI.buyCar = function (id, financed) {
  const r = ENGINE.buyCar(id, financed);
  if (!r.ok) UI.toast(r.msg, true);
  UI.renderAll();
};

/* ---------------- Dating ---------------- */

UI.renderDating = function () {
  const partner = STATE.dating.partnerId;
  return `<div class="grid-2">
    ${STATE.dating.pool.map(c => `
      <div class="card ${c.id === partner ? "current" : ""}">
        <h4>${c.name} <span class="muted">· ${c.job}</span></h4>
        <p>${c.bio}</p>
        <p class="muted">Compatibility ${c.compatibility}% · Status: ${c.status}</p>
        <div class="progress-outer"><div class="progress-inner" style="width:${c.relationship}%"></div></div>
        <div class="btn-row">
          ${!partner || c.id === partner ? `
            <button class="btn" onclick="UI.dating('message','${c.id}')">Message</button>
            <button class="btn" onclick="UI.dating('date','${c.id}')">Ask on Date</button>
            ${c.status !== "partner" && c.status !== "married" ? `<button class="btn" onclick="UI.dating('official','${c.id}')">Make Official</button>` : ""}
            ${c.status === "partner" ? `<button class="btn" onclick="UI.dating('propose','${c.id}')">Propose</button><button class="btn btn-danger" onclick="UI.dating('breakup','${c.id}')">Break Up</button>` : ""}
          ` : `<p class="locked">You're seeing someone else.</p>`}
        </div>
      </div>`).join("")}
  </div>`;
};

UI.dating = function (action, id) {
  let r;
  if (action === "message") r = ENGINE.messageCandidate(id);
  if (action === "date") r = ENGINE.goOnDate(id);
  if (action === "official") r = ENGINE.defineRelationship(id);
  if (action === "propose") r = ENGINE.propose();
  if (action === "breakup") { ENGINE.breakUp(); r = { ok: true }; }
  if (r && !r.ok) UI.toast(r.msg, true);
  UI.renderAll();
};

/* ---------------- Journal ---------------- */

UI.renderJournal = function () {
  return `<div class="card"><ul class="log-list full">${STATE.log.map(l => `<li><span class="muted">Mo ${l.month}</span> ${l.text}</li>`).join("") || "<li>Nothing yet.</li>"}</ul></div>`;
};

/* ---------------- Month advance ---------------- */

UI.endMonth = function () {
  if (STATE.gameOver) return;
  if (ENGINE.needsMinigameThisMonth()) {
    const kind = STATE.education.inMBA ? "study" : "work";
    MINIGAMES.launch(kind, (score) => { ENGINE.finishMonth(score); UI.renderAll(); });
  } else {
    ENGINE.finishMonth(null);
    UI.renderAll();
  }
};

/* ---------------- Save slots ---------------- */

UI.pendingSlot = null;

UI.showSlotPicker = function (opts) {
  opts = opts || {};
  const forced = !!opts.forced;
  const canCancel = !forced && STATE.characterCreated;
  const cloudUser = (typeof CLOUD !== "undefined" && CLOUD.enabled) ? CLOUD.user : null;
  const cards = [];
  for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
    const summary = getSlotSummary(slot);
    const isActive = STATE.characterCreated && STATE.activeSlot === slot;
    if (summary) {
      cards.push(`
        <div class="card save-slot ${isActive ? "current" : ""}">
          <h4>Slot ${slot}${isActive ? " — Current" : ""}</h4>
          <p>${summary.name} — Age ${summary.ageYears}y ${summary.ageMonths}m</p>
          <p class="muted">${summary.status}${summary.gameOver ? " · Game Over" : ""}</p>
          <p class="muted">Net worth: ${fmtMoney(summary.netWorth)}</p>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="UI.pickSlotContinue(${slot})">Continue</button>
            <button class="btn" onclick="UI.exportSlot(${slot})">Export Code</button>
            <button class="btn btn-danger" onclick="UI.pickSlotDelete(${slot}, ${forced})">Delete</button>
          </div>
          ${cloudUser ? `<div class="btn-row"><button class="btn" onclick="CLOUD.uploadSlot(${slot})">☁ Upload</button><button class="btn" onclick="CLOUD.downloadSlot(${slot})">☁ Download</button></div>` : ""}
        </div>
      `);
    } else {
      cards.push(`
        <div class="card save-slot">
          <h4>Slot ${slot}</h4>
          <p class="muted">Empty</p>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="UI.pickSlotNew(${slot})">New Game</button>
            ${cloudUser ? `<button class="btn" onclick="CLOUD.downloadSlot(${slot})">☁ Download</button>` : ""}
          </div>
        </div>
      `);
    }
  }
  const cloudRow = typeof CLOUD !== "undefined"
    ? (cloudUser
        ? `<p class="muted">Signed in as ${cloudUser.displayName || cloudUser.email} · <a href="#" id="cloud-signout">Sign out</a></p>`
        : `<button class="btn" id="cloud-signin">Sign in with Google (cloud sync)</button>`)
    : "";
  openModalHTML(`
    <div class="modal-box wide">
      <h2>Choose a Save</h2>
      <p class="muted">You have 5 save slots. Continue one, or start a new career in an empty slot.</p>
      ${cloudRow}
      <div class="grid-2">${cards.join("")}</div>
      <div class="btn-row">
        <button class="btn" id="import-code-btn">Import Code</button>
        ${canCancel ? '<button class="btn" id="slot-cancel">Cancel</button>' : ""}
      </div>
    </div>
  `);
  if (canCancel) el("slot-cancel").onclick = () => { clearModal(); };
  el("import-code-btn").onclick = () => UI.showImportCode(forced);
  if (cloudUser) { const so = el("cloud-signout"); if (so) so.onclick = (e) => { e.preventDefault(); CLOUD.signOut(); }; }
  else { const si = el("cloud-signin"); if (si) si.onclick = () => CLOUD.signIn(); }
};

UI.pickSlotContinue = function (slot) {
  load(slot);
  setActiveSlot(slot);
  clearModal();
  UI.renderAll();
};

UI.pickSlotDelete = function (slot, forced) {
  if (!confirm("Delete this save? This can't be undone.")) return;
  if (STATE.activeSlot === slot) STATE.characterCreated = false;
  deleteSlot(slot);
  UI.showSlotPicker({ forced: forced || !STATE.characterCreated });
};

UI.pickSlotNew = function (slot) {
  UI.pendingSlot = slot;
  UI.showCharacterCreation();
};

/* ---------------- Export / Import save codes ---------------- */

function encodeSaveCode(rawJsonString) {
  return btoa(unescape(encodeURIComponent(rawJsonString)));
}

function decodeSaveCode(code) {
  return decodeURIComponent(escape(atob(code.trim())));
}

UI.exportSlot = function (slot) {
  const raw = localStorage.getItem(slotKey(slot));
  if (!raw) return;
  const code = encodeSaveCode(raw);
  openModalHTML(`
    <div class="modal-box">
      <h2>Your Save Code</h2>
      <p class="muted">Copy this code, then use "Import Code" on another device or browser to bring this save over.</p>
      <textarea id="export-code" class="num-input" style="width:100%;height:140px;" readonly>${code}</textarea>
      <div class="btn-row">
        <button class="btn btn-primary" id="export-copy">Copy Code</button>
        <button class="btn" id="export-back">Back</button>
      </div>
    </div>
  `);
  el("export-copy").onclick = () => {
    const ta = el("export-code");
    ta.select();
    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => UI.toast("Copied!")).catch(() => { document.execCommand("copy"); UI.toast("Copied!"); });
      copied = true;
    }
    if (!copied) { document.execCommand("copy"); UI.toast("Copied!"); }
  };
  el("export-back").onclick = () => UI.showSlotPicker({ forced: !STATE.characterCreated });
};

UI.showImportCode = function (forced) {
  openModalHTML(`
    <div class="modal-box">
      <h2>Import a Save Code</h2>
      <p class="muted">Paste a code exported from another device, then choose which slot to load it into.</p>
      <textarea id="import-code" class="num-input" style="width:100%;height:140px;" placeholder="Paste code here"></textarea>
      <label class="field-label">Import into slot</label>
      <select id="import-slot" class="num-input">
        ${[1, 2, 3, 4, 5].map(s => `<option value="${s}">Slot ${s}${hasSaveInSlot(s) ? " (occupied — will overwrite)" : " (empty)"}</option>`).join("")}
      </select>
      <div class="btn-row">
        <button class="btn btn-primary" id="import-go">Import</button>
        <button class="btn" id="import-back">Back</button>
      </div>
    </div>
  `);
  el("import-go").onclick = () => {
    const code = el("import-code").value.trim();
    const slot = Number(el("import-slot").value);
    if (!code) { UI.toast("Paste a code first.", true); return; }
    let parsed;
    try {
      parsed = JSON.parse(decodeSaveCode(code));
    } catch (e) {
      UI.toast("That code looks invalid.", true);
      return;
    }
    if (!parsed || typeof parsed !== "object" || !parsed.name) {
      UI.toast("That code looks invalid.", true);
      return;
    }
    if (hasSaveInSlot(slot) && !confirm(`This will overwrite the existing save in Slot ${slot}. Continue?`)) return;
    localStorage.setItem(slotKey(slot), JSON.stringify(parsed));
    UI.toast(`Imported into Slot ${slot}!`);
    UI.showSlotPicker({ forced: forced || !STATE.characterCreated });
  };
  el("import-back").onclick = () => UI.showSlotPicker({ forced: forced || !STATE.characterCreated });
};

/* ---------------- Character creation ---------------- */

UI.showCharacterCreation = function () {
  let chosenMode = (window.matchMedia && window.matchMedia("(max-width: 700px)").matches) ? "mobile" : "desktop";
  openModalHTML(`
    <div class="modal-box">
      <h2>Welcome to Wall Street</h2>
      <p>You're 22, fresh out of college with a finance degree — and $450,000 in student debt. No job. No apartment. Just ambition.</p>
      <p>Your goal: become the greatest investment banker who ever lived.</p>
      <label class="field-label">Your name</label>
      <input type="text" id="char-name" class="num-input" placeholder="Alex Ward" value="Alex Ward">
      <label class="field-label">Choose your layout</label>
      <div class="layout-choice">
        <button class="layout-btn" id="mode-desktop" data-mode="desktop">🖥️ Desktop</button>
        <button class="layout-btn" id="mode-mobile" data-mode="mobile">📱 Mobile</button>
      </div>
      <p class="muted">You can switch anytime from the icon in the header.</p>
      <button class="btn btn-primary" id="char-start">Begin Your Career</button>
    </div>
  `);
  const modeButtons = [el("mode-desktop"), el("mode-mobile")];
  function refreshModeButtons() {
    modeButtons.forEach(b => b.classList.toggle("active", b.dataset.mode === chosenMode));
  }
  modeButtons.forEach(b => { b.onclick = () => { chosenMode = b.dataset.mode; refreshModeButtons(); }; });
  refreshModeButtons();

  el("char-start").onclick = () => {
    const name = el("char-name").value.trim() || "Alex Ward";
    const slot = UI.pendingSlot || STATE.activeSlot || 1;
    newGame(name, slot);
    setActiveSlot(slot);
    STATE.characterCreated = true;
    STATE.uiMode = chosenMode;
    UI.pendingSlot = null;
    save();
    UI.renderAll();
  };
};

/* ---------------- Forced apartment gate ---------------- */

UI.showApartmentGate = function () {
  openModalHTML(`
    <div class="modal-box wide">
      <h2>Find a Place to Live</h2>
      <p>Before anything else, you need a roof over your head.</p>
      ${UI.renderHousing(true)}
    </div>
  `);
};

/* ---------------- Game over / legend ---------------- */

UI.showGameOver = function () {
  openModalHTML(`
    <div class="modal-box">
      <h2>Game Over</h2>
      <p>${STATE.gameOverReason}</p>
      <p class="muted">You made it to age ${ageString()} with a net worth of ${fmtMoney(netWorth())}.</p>
      <button class="btn btn-primary" id="restart-btn">Start a New Career</button>
    </div>
  `);
  el("restart-btn").onclick = () => {
    wipeSave();
    location.reload();
  };
};

UI.showLegend = function () {
  openModalHTML(`
    <div class="modal-box">
      <h2>You Made It</h2>
      <p>You've reached the very top: <b>${currentTitleTrackName()}</b> at ${currentFirm().name}.</p>
      <p>Net worth: ${fmtMoney(netWorth())}. Few ever get here. Keep going — legacies are built, not given.</p>
      <button class="btn btn-primary" id="legend-continue">Keep Playing</button>
    </div>
  `);
  el("legend-continue").onclick = () => { STATE.pendingLegend = false; save(); clearModal(); };
};
