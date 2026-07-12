/* ==========================================================================
   MINIGAMES.JS — the "actually do the work" mandatory weekly minigames.
   Two variants (Model Crunch, All-Nighter Reflex) alternate/roll randomly.
   Both resolve to a 0..1 performance score fed back into ENGINE.finishWeek.
   ========================================================================== */

const MINIGAMES = {};

function modalRoot() { return document.getElementById("modal-root"); }

function clearModal() { modalRoot().innerHTML = ""; modalRoot().classList.remove("open"); }

function openModalHTML(html) {
  const root = modalRoot();
  root.innerHTML = html;
  root.classList.add("open");
}

/* ---------------- Question generators for "Model Crunch" ---------------- */

function genQ_multiple() {
  const ebitda = randInt(15, 85);
  const mult = randInt(45, 135) / 10;
  const ev = Math.round(ebitda * mult);
  const opts = shuffleOptions(ev, [
    Math.round(ev * 0.85), Math.round(ev * 1.15), Math.round(ev * 1.3)
  ]);
  return {
    text: `EBITDA is $${ebitda}M. The comp set trades at ${mult.toFixed(1)}x. Implied Enterprise Value?`,
    options: opts.options, correctIndex: opts.correctIndex, fmt: v => "$" + v + "M"
  };
}

function genQ_growth() {
  const a = randInt(80, 400);
  const growthPct = randInt(5, 40);
  const b = Math.round(a * (1 + growthPct / 100));
  const opts = shuffleOptions(growthPct, [growthPct - 6, growthPct + 5, growthPct + 12].map(v => Math.max(1, v)));
  return {
    text: `Revenue grew from $${a}M to $${b}M. What's the approximate % growth?`,
    options: opts.options, correctIndex: opts.correctIndex, fmt: v => v + "%"
  };
}

function genQ_wacc() {
  const coe = randInt(9, 16);
  const cod = randInt(4, 8);
  const weq = randInt(40, 70);
  const wacc = Math.round((coe * weq + cod * (100 - weq)) / 100);
  const opts = shuffleOptions(wacc, [wacc - 4, wacc + 4, wacc + 8]);
  return {
    text: `Cost of equity ${coe}%, after-tax cost of debt ${cod}%, equity is ${weq}% of capital. Approx. WACC?`,
    options: opts.options, correctIndex: opts.correctIndex, fmt: v => v + "%"
  };
}

function genQ_eps() {
  const before = randInt(150, 400) / 100;
  const changePct = randInt(-25, 25);
  const after = Math.round(before * (1 + changePct / 100) * 100) / 100;
  const opts = shuffleOptions(changePct, [changePct - 8, changePct + 7, changePct + 15]);
  return {
    text: `Pro-forma EPS moves from $${before.toFixed(2)} to $${after.toFixed(2)}. Is this deal accretive or dilutive, and by roughly what %?`,
    options: opts.options.map(v => (v >= 0 ? `Accretive, +${v}%` : `Dilutive, ${v}%`)),
    correctIndex: opts.correctIndex,
    fmt: null
  };
}

// Plain office-arithmetic questions -- no finance jargon required.
function genQ_timeSum() {
  const a = randInt(15, 60), b = randInt(15, 60), c = randInt(15, 60);
  const total = a + b + c;
  const opts = shuffleOptions(total, [total - 15, total + 10, total + 25]);
  return {
    text: `You have three calls today lasting ${a}, ${b}, and ${c} minutes. How much total time is that?`,
    options: opts.options, correctIndex: opts.correctIndex, fmt: v => v + " min"
  };
}

function genQ_budgetSplit() {
  const people = randInt(3, 6);
  const perPerson = randInt(15, 60);
  const total = perPerson * people;
  const opts = shuffleOptions(perPerson, [perPerson - 5, perPerson + 5, perPerson + 10].map(v => Math.max(1, v)));
  return {
    text: `The team orders $${total} of lunch, split evenly ${people} ways. How much does each person owe?`,
    options: opts.options, correctIndex: opts.correctIndex, fmt: v => "$" + v
  };
}

function genQ_emailPace() {
  const emails = randInt(12, 40);
  const perTenMin = randInt(2, 5);
  const minutes = Math.round((emails / perTenMin) * 10);
  const opts = shuffleOptions(minutes, [Math.round(minutes * 0.6), Math.round(minutes * 1.4), Math.round(minutes * 1.7)]);
  return {
    text: `You need to send ${emails} follow-up emails and can do about ${perTenMin} per 10 minutes. Roughly how long will that take?`,
    options: opts.options, correctIndex: opts.correctIndex, fmt: v => v + " min"
  };
}

function shuffleOptions(correctVal, distractors) {
  const vals = [correctVal, ...distractors];
  // Fisher-Yates
  for (let i = vals.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  return { options: vals, correctIndex: vals.indexOf(correctVal) };
}

const CRUNCH_EASY_GENERATORS = [genQ_timeSum, genQ_budgetSplit, genQ_emailPace, genQ_growth];
const CRUNCH_HARD_GENERATORS = [genQ_multiple, genQ_wacc, genQ_eps];
const MODEL_CRUNCH_TIMER_SECONDS = 20;

function crunchDifficultyWeights() {
  if (!STATE.employment) return { easy: 0.8, hard: 0.2 }; // MBA study / unemployed practice
  const s = titleSeniorityLabel();
  if (s === "Analyst") return { easy: 0.9, hard: 0.1 };
  if (s === "Associate") return { easy: 0.65, hard: 0.35 };
  return { easy: 0.45, hard: 0.55 }; // VP+
}

function pickCrunchGenerator() {
  const w = crunchDifficultyWeights();
  const pool = Math.random() < w.easy ? CRUNCH_EASY_GENERATORS : CRUNCH_HARD_GENERATORS;
  return pickRandom(pool);
}

/* ---------------- Model Crunch minigame ---------------- */

function launchModelCrunch(title, onDone) {
  const TOTAL = 5;
  let idx = 0, correct = 0, timer = null;
  const startEnergy = STATE.energy;

  function nextQuestion() {
    if (idx >= TOTAL) return finish();
    const gen = pickCrunchGenerator();
    const q = gen();
    let timeLeft = MODEL_CRUNCH_TIMER_SECONDS;
    openModalHTML(`
      <div class="modal-box minigame-box">
        <div class="minigame-header">${title} <span class="minigame-progress">Question ${idx + 1}/${TOTAL}</span></div>
        <div class="minigame-timerbar"><div class="minigame-timerfill" id="mg-timer" style="width:100%"></div></div>
        <div class="minigame-question">${q.text}</div>
        <div class="minigame-options" id="mg-options"></div>
      </div>
    `);
    const optsEl = document.getElementById("mg-options");
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "btn option-btn";
      btn.textContent = q.fmt ? q.fmt(opt) : opt;
      btn.onclick = () => answer(i === q.correctIndex);
      optsEl.appendChild(btn);
    });

    function answer(isCorrect) {
      clearInterval(timer);
      if (isCorrect) correct++;
      idx++;
      setTimeout(nextQuestion, 250);
    }

    timer = setInterval(() => {
      timeLeft -= 0.2;
      const fill = document.getElementById("mg-timer");
      if (fill) fill.style.width = clamp(timeLeft / MODEL_CRUNCH_TIMER_SECONDS * 100, 0, 100) + "%";
      if (timeLeft <= 0) { answer(false); }
    }, 200);
  }

  function finish() {
    clearModal();
    const raw = correct / TOTAL;
    const energyFactor = clamp(0.7 + (startEnergy / STATE.maxEnergy) * 0.5, 0.7, 1.15);
    const disciplineNudge = (STATE.skills.discipline - 50) / 300;
    const score = clamp(raw * energyFactor + disciplineNudge + 0.08, 0, 1);
    spendEnergy(20);
    onDone(score, raw, correct, TOTAL);
  }

  nextQuestion();
}

/* ---------------- All-Nighter Reflex minigame ---------------- */

function launchReflex(title, onDone) {
  const ROUNDS = 5;
  let round = 0;
  let scores = [];
  const startEnergy = STATE.energy;

  function nextRound() {
    if (round >= ROUNDS) return finish();
    round++;
    openModalHTML(`
      <div class="modal-box minigame-box">
        <div class="minigame-header">${title} <span class="minigame-progress">Round ${round}/${ROUNDS}</span></div>
        <div class="minigame-sub">Wait for the box to turn green, then click it as fast as you can. Click too early and it's a whiff.</div>
        <div class="reflex-box waiting" id="reflex-box">Wait...</div>
      </div>
    `);
    const box = document.getElementById("reflex-box");
    let goTime = null;
    let resolved = false;
    const delay = rand(700, 2400);
    const earlyTimer = setTimeout(() => {
      box.classList.remove("waiting");
      box.classList.add("go");
      box.textContent = "CLICK!";
      goTime = performance.now();
    }, delay);

    box.onclick = () => {
      if (resolved) return;
      if (goTime === null) {
        resolved = true;
        clearTimeout(earlyTimer);
        box.classList.add("early");
        box.textContent = "Too early!";
        scores.push(0.2);
        setTimeout(nextRound, 500);
        return;
      }
      resolved = true;
      const rt = performance.now() - goTime;
      let s;
      if (rt <= 350) s = 1.0;
      else if (rt <= 520) s = 0.85;
      else if (rt <= 750) s = 0.68;
      else if (rt <= 1100) s = 0.5;
      else s = 0.35;
      box.textContent = Math.round(rt) + " ms";
      scores.push(s);
      setTimeout(nextRound, 450);
    };
  }

  function finish() {
    clearModal();
    const raw = scores.reduce((a, b) => a + b, 0) / scores.length;
    const energyFactor = clamp(0.7 + (startEnergy / STATE.maxEnergy) * 0.5, 0.7, 1.15);
    const disciplineNudge = (STATE.skills.discipline - 50) / 300;
    const score = clamp(raw * energyFactor + disciplineNudge + 0.08, 0, 1);
    spendEnergy(20);
    onDone(score, raw);
  }

  nextRound();
}

/* ---------------- Public entry point ---------------- */

MINIGAMES.launch = function (kind, onComplete) {
  const title = kind === "study" ? "Study Session" : (currentFirm() ? currentFirm().name + " — This Week's Grind" : "This Week's Grind");
  const useReflex = Math.random() < 0.5;
  const wrapUp = (score, raw, correct, total) => {
    let verdict;
    if (score >= 0.75) verdict = "Excellent work this week.";
    else if (score >= 0.5) verdict = "Solid, steady performance.";
    else if (score >= 0.3) verdict = "A shaky week — mistakes crept in.";
    else verdict = "A brutal week. Your work was sloppy.";
    showMinigameResult(title, verdict, score, () => onComplete(score));
  };
  if (useReflex) launchReflex(title, wrapUp);
  else launchModelCrunch(title, wrapUp);
};

function showMinigameResult(title, verdict, score, cont) {
  openModalHTML(`
    <div class="modal-box minigame-box">
      <div class="minigame-header">${title} — Results</div>
      <div class="minigame-result-score">${Math.round(score * 100)}/100</div>
      <div class="minigame-sub">${verdict}</div>
      <button class="btn btn-primary" id="mg-continue">Continue</button>
    </div>
  `);
  document.getElementById("mg-continue").onclick = () => { clearModal(); cont(); };
}
