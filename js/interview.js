/* ==========================================================================
   INTERVIEW.JS — the interview modal flow for landing a job offer.
   ========================================================================== */

const INTERVIEW = {};

const IV_TIMER_SECONDS = 30;
const IV_QUESTION_COUNT = 5;
const DEFAULT_IV_WEIGHTS = { easy: 0.6, medium: 0.3, hard: 0.1 };

function pickInterviewQuestions(weights, count) {
  const byTier = { easy: [], medium: [], hard: [] };
  DATA.INTERVIEW_QUESTIONS.forEach(q => byTier[q.tier || "medium"].push(q));
  Object.keys(byTier).forEach(t => {
    const arr = byTier[t];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  });
  const tiers = ["easy", "medium", "hard"];
  const picks = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let cum = 0, chosen = tiers[0];
    for (const t of tiers) {
      cum += weights[t] || 0;
      if (r <= cum) { chosen = t; break; }
    }
    let q = byTier[chosen].pop();
    if (!q) {
      for (const t2 of tiers) { if (byTier[t2].length) { q = byTier[t2].pop(); break; } }
    }
    if (q) picks.push(q);
  }
  return picks;
}

INTERVIEW.start = function (firmId, track, onDone) {
  const firm = DATA.FIRMS.find(f => f.id === firmId);
  const weights = firm.interviewWeights || DEFAULT_IV_WEIGHTS;
  const questions = pickInterviewQuestions(weights, IV_QUESTION_COUNT);
  let idx = 0, correct = 0;

  function nextQuestion() {
    if (idx >= questions.length) return finish();
    const q = questions[idx];

    // Shuffle option order (and track the new correct index) fresh each time,
    // so the right answer's position isn't a fixed, memorizable spot.
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [order[i], order[j]] = [order[j], order[i]];
    }
    const shuffledOptions = order.map(i => q.options[i]);
    const shuffledCorrectIndex = order.indexOf(q.correct);

    let timeLeft = IV_TIMER_SECONDS;
    let timer = null;
    openModalHTML(`
      <div class="modal-box interview-box">
        <div class="minigame-header">Interview at ${firm.name} <span class="minigame-progress">Q${idx + 1}/${questions.length}</span></div>
        <div class="minigame-timerbar"><div class="minigame-timerfill" id="iv-timer" style="width:100%"></div></div>
        <div class="minigame-question">${q.q}</div>
        <div class="minigame-options" id="iv-options"></div>
      </div>
    `);
    const optsEl = document.getElementById("iv-options");
    shuffledOptions.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "btn option-btn";
      btn.textContent = opt;
      btn.onclick = () => answer(i === shuffledCorrectIndex);
      optsEl.appendChild(btn);
    });

    function answer(isCorrect) {
      clearInterval(timer);
      if (isCorrect) correct++;
      idx++;
      setTimeout(nextQuestion, 200);
    }

    timer = setInterval(() => {
      timeLeft -= 0.2;
      const fill = document.getElementById("iv-timer");
      if (fill) fill.style.width = clamp(timeLeft / IV_TIMER_SECONDS * 100, 0, 100) + "%";
      if (timeLeft <= 0) answer(false);
    }, 200);
  }

  function finish() {
    const scorePct = correct / questions.length;
    const result = ENGINE.resolveInterview(firmId, track, scorePct);
    let headline, sub;
    if (result.hired) {
      headline = "You got the offer!";
      sub = `${firm.name} extended you an offer as ${track === "IB" ? currentTitleTrackName() : currentTitleTrackName()}. Score: ${Math.round(scorePct * 100)}/100.`;
    } else {
      headline = "No offer this time.";
      sub = `Score: ${Math.round(scorePct * 100)}/100. Build your network and skills, then try again.`;
    }
    openModalHTML(`
      <div class="modal-box minigame-box">
        <div class="minigame-header">${headline}</div>
        <div class="minigame-sub">${sub}</div>
        <button class="btn btn-primary" id="iv-continue">Continue</button>
      </div>
    `);
    document.getElementById("iv-continue").onclick = () => { clearModal(); onDone(result); };
  }

  nextQuestion();
};
