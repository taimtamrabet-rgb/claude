/* ==========================================================================
   INTERVIEW.JS — the interview modal flow for landing a job offer.
   ========================================================================== */

const INTERVIEW = {};

INTERVIEW.start = function (firmId, track, onDone) {
  const firm = DATA.FIRMS.find(f => f.id === firmId);
  const pool = DATA.INTERVIEW_QUESTIONS.slice();
  // Fisher-Yates shuffle, take 6
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const questions = pool.slice(0, 6);
  let idx = 0, correct = 0;

  function nextQuestion() {
    if (idx >= questions.length) return finish();
    const q = questions[idx];
    let timeLeft = 20;
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
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "btn option-btn";
      btn.textContent = opt;
      btn.onclick = () => answer(i === q.correct);
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
      if (fill) fill.style.width = clamp(timeLeft / 20 * 100, 0, 100) + "%";
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
