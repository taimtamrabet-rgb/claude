/* ==========================================================================
   DATA.JS — static game data: titles, pay scales, firms, apartments, cars,
   interview questions, networking events, dating pool, random life events.
   ========================================================================== */

const DATA = {};

/* ---------------- Career ladders ---------------- */

DATA.TITLES_IB = [
  "Analyst I", "Analyst II", "Analyst III",
  "Associate I", "Associate II", "Associate III",
  "Vice President", "Senior VP / Director", "Managing Director"
];
DATA.BASE_IB = [110000, 125000, 140000, 175000, 195000, 215000, 250000, 300000, 400000];
DATA.BONUS_RANGE_IB = [
  [0.15, 0.70], [0.15, 0.70], [0.20, 0.80],
  [0.40, 1.20], [0.45, 1.30], [0.50, 1.40],
  [0.60, 1.50], [0.80, 2.00], [1.00, 4.00]
];
DATA.MONTHS_PER_TITLE_IB = [12, 12, 12, 18, 18, 18, 24, 36, 999999];

DATA.TITLES_PE = [
  "PE Associate", "Senior Associate", "Vice President", "Principal", "Partner / MD"
];
DATA.BASE_PE = [150000, 175000, 225000, 275000, 350000];
DATA.BONUS_RANGE_PE = [
  [0.30, 0.80], [0.40, 1.00], [0.60, 1.30], [0.80, 1.80], [1.20, 3.00]
];
DATA.MONTHS_PER_TITLE_PE = [24, 24, 24, 36, 999999];

/* ---------------- Firms ---------------- */

DATA.FIRMS = [
  {
    id: "kessler", name: "Kessler Harbor & Co.", type: "IB", tier: "Middle Market",
    mult: 0.80, reqNetworking: 5, reqComm: 5, prestige: 35, competitiveness: 0.10,
    interviewWeights: { easy: 1.0, medium: 0, hard: 0 },
    blurb: "A scrappy regional M&A shop. Long hours, thinner deals, easier door in."
  },
  {
    id: "ashford", name: "Ashford & Cole", type: "IB", tier: "Elite Boutique",
    mult: 1.05, reqNetworking: 30, reqComm: 30, prestige: 72, competitiveness: 0.55,
    interviewWeights: { easy: 0.60, medium: 0.30, hard: 0.10 },
    blurb: "Elite boutique advisory. Small teams, huge deals, brutal interviews."
  },
  {
    id: "blackrose", name: "Blackrose Stanton", type: "IB", tier: "Bulge Bracket",
    mult: 1.15, reqNetworking: 50, reqComm: 45, prestige: 90, competitiveness: 0.62,
    interviewWeights: { easy: 0.45, medium: 0.35, hard: 0.20 },
    blurb: "A household-name global bank. The classic Wall Street grind."
  },
  {
    id: "continental", name: "Continental Vance", type: "IB", tier: "Bulge Bracket",
    mult: 1.20, reqNetworking: 58, reqComm: 52, prestige: 96, competitiveness: 0.75,
    interviewWeights: { easy: 0.35, medium: 0.40, hard: 0.25 },
    blurb: "The most prestigious address in banking. Everyone wants in."
  },
  {
    id: "ironbridge", name: "Ironbridge Capital", type: "PE", tier: "Middle Market PE",
    mult: 0.90, reqNetworking: 25, reqComm: 20, prestige: 60, minIBMonths: 24, competitiveness: 0.45,
    interviewWeights: { easy: 0.45, medium: 0.35, hard: 0.20 },
    blurb: "Mid-market buyout shop. Wants ex-banking analysts who can model."
  },
  {
    id: "summit", name: "Summit Crown Partners", type: "PE", tier: "Mega Fund",
    mult: 1.30, reqNetworking: 65, reqComm: 55, prestige: 99, minIBMonths: 24, competitiveness: 0.85,
    interviewWeights: { easy: 0.30, medium: 0.40, hard: 0.30 },
    blurb: "A legendary mega-fund. The most coveted seat in all of finance."
  }
];

/* ---------------- Apartments ---------------- */

DATA.APARTMENTS = [
  {
    id: "basement", name: "Parents' Basement", monthlyRent: 0, moveInCost: 0,
    reputation: -8, networking: -10, dating: -20, stressRelief: 4,
    blurb: "Free rent. Your mom still does your laundry. Recruiters can smell it."
  },
  {
    id: "roommates", name: "Shared Studio, Outer Borough", monthlyRent: 1400, moveInCost: 650,
    reputation: -2, networking: 0, dating: -5, stressRelief: 0,
    blurb: "Three roommates, one bathroom, a 55-minute commute."
  },
  {
    id: "onebr", name: "1BR, Midtown-Adjacent", monthlyRent: 2800, moveInCost: 1950,
    reputation: 4, networking: 4, dating: 6, stressRelief: 2,
    blurb: "Your own place. Walkable to the office. Actually feels like adulthood."
  },
  {
    id: "luxury", name: "Luxury High-Rise 1BR", monthlyRent: 5000, moveInCost: 4600,
    reputation: 12, networking: 8, dating: 16, stressRelief: 6,
    blurb: "Doorman, gym, rooftop. The kind of address that impresses a date."
  },
  {
    id: "penthouse", name: "Penthouse Suite", monthlyRent: 12000, moveInCost: 13750,
    reputation: 25, networking: 12, dating: 28, stressRelief: 10,
    minTitleTrack: "VP",
    blurb: "Skyline views from every room. You've made it, and everyone knows it."
  }
];

/* ---------------- Cars ---------------- */

DATA.CARS = [
  { id: "none", name: "No Car (Subway/Uber)", cashPrice: 0, downPayment: 0, monthlyPayment: 0, reputation: 0, dating: 0 },
  { id: "civic", name: "Used Honda Civic", cashPrice: 8000, downPayment: 1500, monthlyPayment: 180, reputation: 1, dating: 0 },
  { id: "bmw", name: "Certified Pre-Owned BMW 3-Series", cashPrice: 28000, downPayment: 4000, monthlyPayment: 520, reputation: 6, dating: 8 },
  { id: "merc", name: "New Mercedes-Benz / Tesla", cashPrice: 55000, downPayment: 8000, monthlyPayment: 950, reputation: 12, dating: 16 },
  { id: "exotic", name: "Porsche 911", cashPrice: 130000, downPayment: 20000, monthlyPayment: 2200, reputation: 24, dating: 30, minTitleTrack: "Associate" }
];

/* ---------------- Interview question bank ---------------- */

DATA.INTERVIEW_QUESTIONS = [
  { q: "Why do investment banking?", options: [
      "For the free coffee.",
      "I want the steepest learning curve in finance — deal exposure, technical rigor, and mentorship from the best in the industry.",
      "I couldn't get a job anywhere else.",
      "I heard the hours are light."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "Tell me about a time you worked under intense pressure.", options: [
      "I've never been under pressure before.",
      "I stayed organized, prioritized ruthlessly, communicated early with my team, and delivered on time.",
      "I asked someone else to do it for me.",
      "I gave up and asked for an extension."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "What is your greatest weakness?", options: [
      "I have no weaknesses.",
      "I used to over-index on perfectionism on low-stakes tasks, so I've built a habit of triaging effort by what actually matters.",
      "I'm always late to everything.",
      "I don't work well with others."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "How do you handle receiving harsh feedback on a deliverable?", options: [
      "Argue with the VP until they back down.",
      "Take it in, ask clarifying questions, fix the model, and use it to calibrate for next time.",
      "Ignore it and resubmit the same file.",
      "Quit on the spot."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "Tell me about a time you worked on a team with conflict.", options: [
      "I avoided the team entirely.",
      "I listened to both sides, focused the discussion on the shared goal, and helped find a workable compromise.",
      "I escalated it publicly to embarrass a colleague.",
      "I let the conflict resolve itself without ever engaging."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "Why private equity instead of staying in banking?", options: [
      "PE has shorter hours guaranteed, always.",
      "I want to sit on the principal side of deals — driving value creation and strategy post-close, not just advising on the transaction.",
      "I just want a change of scenery, no real reason.",
      "Banking was too easy for me."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "Describe your ideal team culture.", options: [
      "Everyone works alone and never talks to each other.",
      "High ownership, direct feedback, and people who cover for each other when the workload spikes.",
      "No deadlines, ever.",
      "Whoever yells loudest wins the argument."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "Where do you see yourself in five years?", options: [
      "Doing the exact same entry-level tasks, unchanged.",
      "Having grown into a role with more deal ownership and client responsibility — whether that's a senior banking seat or the buy-side.",
      "Retired.",
      "I haven't thought about it at all."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "Your boss asks you to redo a report by tomorrow morning. What do you do?", options: [
      "Ignore it until you feel like doing it.",
      "Prioritize it tonight, get it done, and confirm with your boss before the deadline.",
      "Tell your boss it's impossible.",
      "Do it halfway and hope no one notices."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "You spot a typo in a client-facing document minutes before it's sent out. What do you do?", options: [
      "Say nothing, it's probably fine.",
      "Flag it immediately so it can be fixed before it goes out.",
      "Send it anyway and mention it later.",
      "Blame whoever wrote it."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "A coworker takes credit for your idea in a meeting. What's the best response?", options: [
      "Yell at them in front of everyone.",
      "Calmly clarify your contribution afterward and move on professionally.",
      "Start taking credit for their work too.",
      "Quit on the spot."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "You're given two urgent tasks due at the same time. What do you do?", options: [
      "Panic and do neither well.",
      "Quickly check with your manager on which one should come first.",
      "Guess and hope it works out.",
      "Do whichever one is more fun."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "How do you stay organized when your to-do list piles up?", options: [
      "I don't, I just wing it.",
      "I write everything down and tackle it by priority and deadline.",
      "I ignore anything that isn't due today.",
      "I ask someone else to keep track for me."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "Your team missed a deadline because of a scheduling mix-up. What now?", options: [
      "Blame a teammate publicly.",
      "Own the mistake, fix the timeline, and put a process in place to avoid it again.",
      "Pretend it didn't happen.",
      "Quit the project."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "What matters most to you in a first job out of college?", options: [
      "The shortest possible commute.",
      "Learning as much as I can and proving I can be trusted with more responsibility.",
      "Doing the least amount of work possible.",
      "Free snacks in the break room."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "How would a close friend describe your work ethic?", options: [
      "Unreliable and easily distracted.",
      "Reliable — I show up, do the work, and follow through.",
      "They wouldn't know, I never talk about work.",
      "Lazy but charming."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "You realize you made a mistake on a project after handing it in. What's the right move?", options: [
      "Hope nobody notices.",
      "Tell your manager right away and offer to fix it.",
      "Wait for someone else to catch it.",
      "Quietly redo it and pretend it was always right."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "A client is frustrated on a call and raising their voice. What do you do?", options: [
      "Hang up on them.",
      "Stay calm, listen, and focus on actually solving their problem.",
      "Match their tone and argue back.",
      "Transfer them to someone else without explanation."
    ], correct: 1, category: "behavioral", tier: "easy" },
  { q: "What does it mean to \'diversify\' your investments?", options: [
      "Put all your money in one stock you really believe in.",
      "Spread your money across different assets so one bad investment doesn't wipe you out.",
      "Only invest in companies whose name you like.",
      "Keep all your money in cash under your mattress."
    ], correct: 1, category: "finance", tier: "medium" },
  { q: "Why do people keep an emergency fund?", options: [
      "Because banks require it by law.",
      "So an unexpected expense doesn't force them into high-interest debt.",
      "To impress their accountant.",
      "It earns a higher return than any investment."
    ], correct: 1, category: "finance", tier: "medium" },
  { q: "What is compound interest?", options: [
      "A one-time fee your bank charges you.",
      "Interest calculated on both the original amount and the interest it's already earned.",
      "Interest that only applies to loans, never savings.",
      "A tax on interest income."
    ], correct: 1, category: "finance", tier: "medium" },
  { q: "What's a credit score mainly used for?", options: [
      "It determines your salary.",
      "It signals to lenders how likely you are to repay borrowed money.",
      "It's just your bank account balance.",
      "It sets how much cash you can carry."
    ], correct: 1, category: "finance", tier: "medium" },
  { q: "What does APR stand for on a loan or credit card?", options: [
      "Automatic Payment Requirement.",
      "Annual Percentage Rate — the yearly cost of borrowing, including interest.",
      "Average Purchase Rate.",
      "Approved Payment Record."
    ], correct: 1, category: "finance", tier: "medium" },
  { q: "What's the main difference between a stock and a bond?", options: [
      "They're two names for the same thing.",
      "A stock is ownership in a company; a bond is a loan you make to a company or government.",
      "Bonds are always riskier than stocks.",
      "Stocks always pay a fixed interest rate."
    ], correct: 1, category: "finance", tier: "medium" },
  { q: "Why might someone use a monthly budget?", options: [
      "It's only useful for people already in debt.",
      "To track income and expenses so spending doesn't outpace earning.",
      "To avoid ever spending money on anything.",
      "Budgets are just for businesses, not individuals."
    ], correct: 1, category: "finance", tier: "medium" },
  { q: "What does it mean when a stock market index goes up?", options: [
      "Every single stock in the world went up.",
      "The overall value of the group of stocks it tracks increased, on average.",
      "Interest rates went up.",
      "The government printed more money."
    ], correct: 1, category: "finance", tier: "medium" },
  { q: "What's a 401(k)?", options: [
      "A type of checking account.",
      "A retirement savings account, often offered through an employer, with tax advantages.",
      "A government tax form.",
      "A credit card rewards program."
    ], correct: 1, category: "finance", tier: "medium" },
  { q: "Why do lenders care about your debt-to-income ratio?", options: [
      "It tells them your favorite bank.",
      "It shows how much of your income is already committed to debt payments, signaling repayment risk.",
      "It's used to calculate your card's PIN.",
      "It has no real use, it's just paperwork."
    ], correct: 1, category: "finance", tier: "medium" },
  { q: "Inflation is running at 5% and your savings account pays 1% interest. What's happening to your money's purchasing power?", options: [
      "It's growing by 6%.",
      "It's shrinking — you're losing purchasing power in real terms even as the balance grows.",
      "Nothing changes, interest and inflation cancel out exactly.",
      "Purchasing power only depends on your salary."
    ], correct: 1, category: "finance", tier: "hard" },
  { q: "What's the general idea behind the 'debt avalanche' payoff method?", options: [
      "Pay off your smallest debt first no matter the interest rate.",
      "Pay minimums on everything, then throw extra money at the debt with the highest interest rate first.",
      "Only pay debts on your birthday.",
      "Ignore small debts and only pay large ones."
    ], correct: 1, category: "finance", tier: "hard" },
  { q: "Why is a Roth IRA often attractive compared to a regular taxable savings account?", options: [
      "It has no rules or restrictions at all.",
      "You contribute after-tax money, but qualified withdrawals in retirement are tax-free.",
      "It guarantees a fixed 10% annual return.",
      "It's the same as a checking account, just renamed."
    ], correct: 1, category: "finance", tier: "hard" },
  { q: "Why do financial advisors often recommend low-cost index funds over picking individual stocks?", options: [
      "Index funds are guaranteed to never lose money.",
      "Broad diversification and low fees tend to beat most people's attempts at picking individual winners over time.",
      "Picking individual stocks is illegal for beginners.",
      "Index funds pay you a fixed salary."
    ], correct: 1, category: "finance", tier: "hard" },
  { q: "What does it mean for a loan to be 'amortizing'?", options: [
      "The interest rate doubles every year.",
      "Each payment covers some interest and some principal, so the balance gradually shrinks to zero over the term.",
      "You only pay interest until the very last payment, then the whole balance at once.",
      "The lender forgives the loan automatically after 5 years."
    ], correct: 1, category: "finance", tier: "hard" },
  { q: "Two people earn the same salary. One starts saving 20% at age 25, the other at age 35. Why does the early saver likely end up with much more by retirement?", options: [
      "The government gives bonus money to early savers.",
      "Extra years of compounding growth make an outsized difference, even at the same savings rate.",
      "There's no real difference, timing doesn't matter.",
      "The later saver's money automatically grows faster to compensate."
    ], correct: 1, category: "finance", tier: "hard" },
];

/* ---------------- Networking events ---------------- */

DATA.NETWORKING_EVENTS = [
  { id: "coffee", name: "Coffee Chat with an Alum", cost: 0, energy: 6, networkingGain: [1, 3], commGain: [0, 1], blurb: "Low-key, low-cost. Everyone starts here." },
  { id: "mixer", name: "Industry Happy Hour", cost: 40, energy: 10, networkingGain: [2, 5], commGain: [1, 2], blurb: "Business cards, small talk, and overpriced drinks." },
  { id: "conference", name: "Finance Conference", cost: 250, energy: 16, networkingGain: [4, 8], commGain: [1, 3], blurb: "A full day of panels and hallway networking." },
  { id: "gala", name: "Charity Gala", cost: 600, energy: 14, networkingGain: [6, 10], commGain: [2, 4], blurb: "Black tie. This is where the Managing Directors actually show up." },
  { id: "golf", name: "Golf Outing with Senior Bankers", cost: 350, energy: 20, networkingGain: [7, 12], commGain: [1, 2], blurb: "Four hours to make a lasting impression on a Partner." }
];

/* ---------------- Skill-training actions ---------------- */

DATA.TRAINING_ACTIONS = [
  { id: "network_train", skill: "networking", name: "Work the Room", cost: 0, energy: 8, gain: [1, 3] },
  { id: "comm_train", skill: "communication", name: "Toastmasters Session", cost: 40, energy: 6, gain: [1, 3] },
  { id: "sales_train", skill: "sales", name: "Shadow a Senior Banker's Pitch", cost: 0, energy: 10, gain: [1, 3] },
  { id: "discipline_train", skill: "discipline", name: "Morning Routine & Journaling", cost: 0, energy: 5, gain: [1, 3] }
];

/* ---------------- Dating pool ---------------- */

DATA.DATING_NAMES = [
  "Jordan", "Alexis", "Morgan", "Taylor", "Casey", "Riley", "Sam", "Avery",
  "Devon", "Reese", "Peyton", "Quinn", "Rowan", "Blair", "Skyler", "Emerson"
];
DATA.DATING_JOBS = [
  "Corporate Lawyer", "Nurse Practitioner", "UX Designer", "High School Teacher",
  "Marketing Manager", "Consultant", "Med Student", "Startup Founder",
  "Architect", "Graphic Designer", "PR Associate", "Data Scientist"
];
DATA.DATING_BIOS = [
  "Loves hiking and terrible reality TV in equal measure.",
  "Will absolutely judge you for checking your phone at dinner.",
  "Runs marathons for fun. Actual fun, apparently.",
  "Has strong opinions about pizza toppings.",
  "Reads two books a week and will quiz you on yours.",
  "Thinks your work stories are either fascinating or a red flag, undecided.",
  "Plays in an amateur soccer league on weekends.",
  "Makes a mean cocktail and an even meaner comeback."
];

/* ---------------- Random monthly life events ---------------- */

DATA.LIFE_EVENTS = [
  { text: "Your phone screen cracks. An annoying, unavoidable cost.", cash: -180, stress: 3 },
  { text: "A friend's wedding this weekend — gift, travel, the works.", cash: -350, stress: 4, happiness: 5 },
  { text: "You caught a nasty cold going around the office.", stress: 6, energy: -15 },
  { text: "Your rewards card posts a surprise cashback bonus.", cash: 120, stress: -2 },
  { text: "The subway/commute was hell all week.", stress: 4 },
  { text: "You found $20 in an old jacket pocket. Small win.", cash: 20, stress: -1 },
  { text: "A parking ticket / traffic camera fine shows up.", cash: -150, stress: 2 },
  { text: "Your family calls, worried you're working too hard.", stress: -3, happiness: 3 },
  { text: "Unexpected medical co-pay bill arrives.", cash: -220, stress: 3 },
  { text: "You treated yourself to a nice dinner out.", cash: -90, stress: -4, happiness: 4 }
];

DATA.STARTING_DEBT = 450000;
DATA.LOAN_APR = 0.068;
DATA.LOAN_TERM_MONTHS = 240; // 20-year amortization schedule
DATA.SAVINGS_APY = 0.045;
DATA.STARTING_CASH = 900;
