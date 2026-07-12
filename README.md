# Wall Street Grind — Investment Banker Sim

A browser-based life/career sim. You're 22, fresh out of college with a finance
degree and $450,000 in student debt. The goal: become the best investment
banker who ever lived.

Open `index.html` in a browser to play (or serve the folder with any static
file server). No build step, no dependencies — plain HTML/CSS/JS. Progress
autosaves to `localStorage`.

## What's in the game

- **Time**: the clock advances one week at a time; your character ages every week.
- **Career**: network your way into interviews, answer real IB/PE technical
  and behavioral questions, and climb the ladder from Analyst through
  Managing Director (or Private Equity Partner) at realistically-paid firms.
- **Weekly work minigames**: every week you're employed (or in school), you
  actually do the work — a quick-fire "Model Crunch" finance math sprint or
  an "All-Nighter Reflex" timing game. Your performance drives bonuses,
  promotions, and whether you get fired.
- **Debt**: a real amortizing $450,000 student loan at 6.8% APR with a
  monthly minimum payment you have to make yourself from the Bank tab —
  miss enough and you default.
- **MBA path**: after 3 years of work, option to quit, take on $220,000 more
  debt, and go back to school for 2 years, recruiting back into IB or PE.
- **Skills**: Networking, Communication, Sales, and Discipline, trained
  through actions and events, gating job offers, interview odds, and pay.
- **Life**: find an apartment (mandatory before you can start working),
  buy a car (cash or financed), date, get married, and manage a Savings /
  Investment account alongside your checking balance.

## Files

- `index.html` — page shell / layout
- `css/style.css` — theme and layout styling
- `js/data.js` — static game data (salaries, firms, questions, events)
- `js/state.js` — game state shape, persistence, derived stat helpers
- `js/engine.js` — all game actions and the weekly simulation tick
- `js/minigames.js` — the weekly work minigames
- `js/interview.js` — job interview modal flow
- `js/ui.js` — rendering for every tab and modal
- `js/main.js` — boot sequence
