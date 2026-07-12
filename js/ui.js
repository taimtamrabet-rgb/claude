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

/* ---------------- Master render ---------------- */

UI.renderAll = function () {
  if (!STATE.characterCreated) { UI.showCharacterCreation(); return; }
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
  const year = Math.floor(STATE.totalWeeks / 52) + 1;
  const week = (STATE.totalWeeks % 52) + 1;
  let statusLine;
  if (STATE.education.inMBA) statusLine = `MBA Student (Year ${Math.ceil((104 - STATE.education.mbaWeeksLeft + 1) / 52)})`;
  else if (STATE.employment) statusLine = `${currentTitleTrackName()} @ ${currentFirm().name}`;
  else statusLine = "Unemployed — job hunting";

  el("header").innerHTML = `
    <div class="hdr-row1">
      <div class="hdr-name">${STATE.name}</div>
      <div class="hdr-age">Age ${ageString()} · Career Year ${year}, Week ${week}</div>
      <div class="hdr-status">${statusLine}</div>
    </div>
    <div class="hdr-row2">
      <div class="chip">Cash <b>${fmtMoney(STATE.cash)}</b></div>
      <div class="chip">Savings <b>${fmtMoney(STATE.savings)}</b></div>
      <div class="chip debt">Debt <b>${fmtMoney(STATE.debt)}</b>${STATE.loanPaymentDue ? ' <span class="due-badge">DUE</span>' : ""}</div>
      <div class="chip">Net Worth <b class="${netWorth() >= 0 ? "pos" : "neg"}">${fmtMoney(netWorth())}</b></div>
    </div>
    <div class="hdr-bars">
      <div class="bar-wrap"><span>Energy</span><div class="bar"><div class="bar-fill energy" style="width:${STATE.energy}%"></div></div></div>
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
  ).join("") + `<button class="tab-btn end-week-btn" onclick="UI.endWeek()">End Week &rarr;</button>`;
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
    const pct = Math.round((104 - STATE.education.mbaWeeksLeft) / 104 * 100);
    careerCard = `<div class="card"><h3>Business School</h3><p>Full-time MBA program in progress.</p><div class="progress-outer"><div class="progress-inner" style="width:${pct}%"></div></div><p class="muted">${STATE.education.mbaWeeksLeft} weeks remaining. Recruiting for: ${STATE.education.recruitTarget}</p></div>`;
  } else if (STATE.employment) {
    const e = STATE.employment;
    const titles = e.track === "IB" ? DATA.TITLES_IB : DATA.TITLES_PE;
    const weeksArr = e.track === "IB" ? DATA.WEEKS_PER_TITLE_IB : DATA.WEEKS_PER_TITLE_PE;
    const need = weeksArr[e.titleIndex];
    const pct = clamp(Math.round(e.weeksInTitle / need * 100), 0, 100);
    const avgPerf = e.perfAccum.length ? Math.round(e.perfAccum.reduce((a, b) => a + b, 0) / e.perfAccum.length * 100) : null;
    careerCard = `<div class="card">
      <h3>${currentFirm().name}</h3>
      <p>${titles[e.titleIndex]} · Base ${fmtMoney(currentBaseSalary())}/yr</p>
      <div class="progress-outer" title="Promotion progress"><div class="progress-inner" style="width:${pct}%"></div></div>
      <p class="muted">Promotion track: ${e.weeksInTitle}/${need} weeks · Avg performance: ${avgPerf === null ? "—" : avgPerf + "/100"} · Strikes: ${e.strikes}/3</p>
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
        <p>${apt ? apt.name : "No apartment"} ${apt ? `— ${fmtMoney(apt.weeklyRent)}/week` : ""}</p>
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

  if (STATE.employment) {
    html += UI.renderCurrentJobCard();
  } else if (STATE.education.inMBA) {
    html += `<div class="card"><h3>Currently enrolled full-time in an MBA program.</h3><p class="muted">${STATE.education.mbaWeeksLeft} weeks left. Advance the week to keep studying.</p></div>`;
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
  return `<div class="card highlight">
    <h3>${firm.name} — ${titles[e.titleIndex]}</h3>
    <p>${firm.blurb}</p>
    <p>Base Salary: <b>${fmtMoney(currentBaseSalary())}</b>/yr</p>
    <p class="muted">Weeks at firm: ${e.weeksAtFirm} · Strikes: ${e.strikes}/3</p>
    <div class="btn-row">
      <button class="btn btn-danger" onclick="UI.resign()">Resign</button>
    </div>
  </div>`;
};

UI.firmCardHTML = function (f) {
  const elig = ENGINE.firmEligibility(f.id);
  const isCurrent = STATE.employment && STATE.employment.firmId === f.id;
  return `<div class="card firm-card ${isCurrent ? "current" : ""}">
    <h4>${f.name}</h4>
    <p class="muted">${f.tier}</p>
    <p>${f.blurb}</p>
    <p class="muted">Req: Networking ${f.reqNetworking}+, Communication ${f.reqComm}+${f.minIBWeeks ? `, ${Math.round(f.minIBWeeks / 52 * 10) / 10}+ yrs IB` : ""}</p>
    ${isCurrent ? '<p class="muted">Your current employer</p>' :
      elig.eligible
        ? `<button class="btn" onclick="UI.applyToFirm('${f.id}','${f.type}')">Interview</button>`
        : `<p class="locked">${elig.reasons.join(" ")}</p>`}
  </div>`;
};

UI.applyToFirm = function (firmId, track) {
  if (!hasEnergy(20)) { UI.toast("Too exhausted for an interview right now.", true); return; }
  spendEnergy(20);
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
        <p class="muted">Fluctuates weekly with the market.</p>
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
          <p class="muted">Rent ${fmtMoney(a.weeklyRent)}/week · Move-in cost ${fmtMoney(a.moveInCost)}</p>
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
  return `<div class="card"><ul class="log-list full">${STATE.log.map(l => `<li><span class="muted">Wk ${l.week}</span> ${l.text}</li>`).join("") || "<li>Nothing yet.</li>"}</ul></div>`;
};

/* ---------------- Week advance ---------------- */

UI.endWeek = function () {
  if (STATE.gameOver) return;
  if (ENGINE.needsMinigameThisWeek()) {
    const kind = STATE.education.inMBA ? "study" : "work";
    MINIGAMES.launch(kind, (score) => { ENGINE.finishWeek(score); UI.renderAll(); });
  } else {
    ENGINE.finishWeek(null);
    UI.renderAll();
  }
};

/* ---------------- Character creation ---------------- */

UI.showCharacterCreation = function () {
  openModalHTML(`
    <div class="modal-box">
      <h2>Welcome to Wall Street</h2>
      <p>You're 22, fresh out of college with a finance degree — and $450,000 in student debt. No job. No apartment. Just ambition.</p>
      <p>Your goal: become the greatest investment banker who ever lived.</p>
      <label class="field-label">Your name</label>
      <input type="text" id="char-name" class="num-input" placeholder="Alex Ward" value="Alex Ward">
      <button class="btn btn-primary" id="char-start">Begin Your Career</button>
    </div>
  `);
  el("char-start").onclick = () => {
    const name = el("char-name").value.trim() || "Alex Ward";
    STATE.characterCreated = true;
    newGame(name);
    STATE.characterCreated = true;
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
