/**
 * ReviseSphere - Flashcard Engine & Spaced Repetition Logic
 * 
 * BUG FIX SUMMARY:
 * - Fixed Blue Square Indicator Bug by explicitly tracking `selectedDifficulty` state.
 * - Dynamically updates CSS classes (adding `border-2 border-blue-600 ring-4 ring-blue-500/30 scale-105 bg-blue-50`)
 *   to visually move the blue highlight square to whichever difficulty button was clicked.
 * - Added a 300ms lock (`isProcessingClick`) to prevent spam/double-clicking while the highlight animation plays.
 * - Integrated Spaced Repetition scheduling (need=3, pass=5, know=15) and saved progress to localStorage.
 */

// 1. Initial State & Spaced Repetition Deck Data
const STORAGE_KEY = 'rs_flashcard_progress_v2';

const DEFAULT_CARDS = [
  {
    id: 'c1',
    subject: 'BIOLOGY',
    front: 'What biological structure translates messenger RNA (mRNA) into amino acid sequences?',
    back: 'Ribosomes',
    explanation: 'Ribosomes bind to mRNA and transfer RNA (tRNA) to synthesize polypeptide chains during protein translation in cellular biology.',
    interval: 0,
    status: 'learning'
  },
  {
    id: 'c2',
    subject: 'BIOLOGY',
    front: 'What is the primary function of the Mitochondria?',
    back: 'Generates cellular ATP via aerobic respiration & Krebs cycle.',
    explanation: 'Mitochondria function as the powerhouse of the cell by maintaining a proton gradient across the inner membrane for ATP Synthase.',
    interval: 0,
    status: 'learning'
  },
  {
    id: 'c3',
    subject: 'BIOLOGY',
    front: 'Where within the eukaryotic cell does the Krebs cycle (Citric Acid Cycle) exclusively take place?',
    back: 'Mitochondrial Matrix',
    explanation: 'Soluble enzymes inside the mitochondrial matrix break down Acetyl-CoA to produce NADH, FADH₂, and ATP.',
    interval: 0,
    status: 'learning'
  },
  {
    id: 'c4',
    subject: 'CHEMISTRY',
    front: 'What functional group contains a carbon double-bonded to oxygen (-C=O)?',
    back: 'Carbonyl group',
    explanation: 'Carbonyl groups are electrophilic functional groups found in aldehydes, ketones, esters, and carboxylic acids.',
    interval: 0,
    status: 'learning'
  },
  {
    id: 'c5',
    subject: 'CHEMISTRY',
    front: 'What is the mathematical formula used to calculate percent yield in stoichiometry?',
    back: '(Actual Yield / Theoretical Yield) × 100%',
    explanation: 'Percent yield measures chemical reaction efficiency by comparing recovered product mass to theoretical stoichiometry.',
    interval: 0,
    status: 'learning'
  },
  {
    id: 'c6',
    subject: 'BIOLOGY',
    front: 'What is the net gain of ATP molecules per glucose molecule during glycolysis?',
    back: '2 ATP (Net)',
    explanation: 'Glycolysis consumes 2 ATP in its investment phase and synthesizes 4 ATP in the payoff phase, resulting in a net yield of 2 ATP.',
    interval: 0,
    status: 'learning'
  },
  {
    id: 'c7',
    subject: 'CHEMISTRY',
    front: 'What is the molar mass of Calcium Carbonate (CaCO₃)?',
    back: '100.09 g/mol',
    explanation: 'Atomic weights: Ca = 40.08, C = 12.01, 3 × O = 48.00 g/mol. Sum = 100.09 g/mol.',
    interval: 0,
    status: 'learning'
  },
  {
    id: 'c8',
    subject: 'COGNITIVE SCIENCE',
    front: 'What active learning technique yields >40% higher memory retention than passive re-reading?',
    back: 'Active Recall & Spaced Repetition',
    explanation: 'Retrieving concepts from memory without looking at notes strengthens neural pathways and long-term consolidation.',
    interval: 0,
    status: 'learning'
  }
];

// App State
let deck = [];
let currentIndex = 0;
let isFlipped = false;
let sessionSeconds = 0;
let timerInterval = null;

// PART 1 FIX: Difficulty selection state & debounce lock
let selectedDifficulty = null; // Stores 'need' | 'pass' | 'know'
let isProcessingClick = false; // Prevents double clicking during 300ms transition

// DOM Elements
const cardElement = document.getElementById('flashcard');
const cardFrontText = document.getElementById('cardFrontText');
const cardBackText = document.getElementById('cardBackText');
const cardExplanation = document.getElementById('cardExplanation');
const cardBadge = document.getElementById('cardBadge');
const cardStateIndicator = document.getElementById('cardStateIndicator');
const flipBtn = document.getElementById('flipBtn');
const prevCardBtn = document.getElementById('prevCardBtn');
const nextCardBtn = document.getElementById('nextCardBtn');

// Difficulty Buttons
const btnNeed = document.getElementById('btnNeed');
const btnPass = document.getElementById('btnPass');
const btnKnow = document.getElementById('btnKnow');

// Progress & Sidebar Elements
const cardCounterText = document.getElementById('cardCounterText');
const progressBarFill = document.getElementById('progressBarFill');
const statTotal = document.getElementById('statTotal');
const statMastered = document.getElementById('statMastered');
const statLearning = document.getElementById('statLearning');
const statNeed = document.getElementById('statNeed');
const timerDisplay = document.getElementById('timerDisplay');
const toastNotification = document.getElementById('toastNotification');

// View Containers
const studyContainer = document.getElementById('studyContainer');
const endSummaryContainer = document.getElementById('endSummaryContainer');
const restartBtn = document.getElementById('restartBtn');
const endSummaryStats = document.getElementById('endSummaryStats');

// 2. Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadProgress();
  renderCard();
  updateStats();
  startTimer();
  setupKeyboardShortcuts();
});

// Load state from localStorage
function loadProgress() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      deck = JSON.parse(saved);
    } catch (e) {
      deck = [...DEFAULT_CARDS];
    }
  } else {
    deck = [...DEFAULT_CARDS];
  }
}

// Save state to localStorage
function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
}

// 3. Render Active Card UI
function renderCard() {
  if (currentIndex >= deck.length) {
    showEndSummary();
    return;
  }

  studyContainer.classList.remove('hidden');
  endSummaryContainer.classList.add('hidden');

  const currentCard = deck[currentIndex];

  // Reset flip state
  isFlipped = false;
  cardElement.style.transform = 'rotateY(0deg)';
  cardStateIndicator.innerText = 'FRONT (QUESTION)';
  cardStateIndicator.className = 'text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider';

  // Populate card fields
  cardBadge.innerText = currentCard.subject || 'GENERAL';
  cardFrontText.innerText = currentCard.front;
  cardBackText.innerText = currentCard.back;
  cardExplanation.innerText = currentCard.explanation || 'No additional notes provided.';

  // Hide back side initially for Active Recall
  document.getElementById('cardFrontSide').classList.remove('hidden');
  document.getElementById('cardBackSide').classList.add('hidden');

  // Update Top Progress Bar & Counter
  cardCounterText.innerText = `Card ${currentIndex + 1} of ${deck.length}`;
  const pct = Math.round(((currentIndex + 1) / deck.length) * 100);
  progressBarFill.style.width = `${pct}%`;

  // Reset Blue Square Highlight on All Difficulty Buttons
  resetDifficultySquareHighlight();
}

// 4. Flip Card Action
function flipCard() {
  if (window.ReviseFX) window.ReviseFX.playSound('flip');
  isFlipped = !isFlipped;
  if (isFlipped) {
    cardElement.style.transform = 'rotateY(180deg)';
    document.getElementById('cardFrontSide').classList.add('hidden');
    document.getElementById('cardBackSide').classList.remove('hidden');
    cardStateIndicator.innerText = 'BACK (ANSWER & EXPLANATION)';
    cardStateIndicator.className = 'text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider';
  } else {
    cardElement.style.transform = 'rotateY(0deg)';
    document.getElementById('cardFrontSide').classList.remove('hidden');
    document.getElementById('cardBackSide').classList.add('hidden');
    cardStateIndicator.innerText = 'FRONT (QUESTION)';
    cardStateIndicator.className = 'text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider';
  }
}

// Card Flip Listeners
cardElement.addEventListener('click', (e) => {
  // Prevent flip when clicking difficulty buttons inside
  if (e.target.closest('.difficulty-btn')) return;
  flipCard();
});
if (flipBtn) flipBtn.addEventListener('click', (e) => { e.stopPropagation(); flipCard(); });

// 5. PART 1 FIX: Difficulty Button Handling + Moving Blue Square Indicator
function handleDifficultyClick(type) {
  // PART 1 (4): Prevent Double Click / Spamming
  if (isProcessingClick) return;
  isProcessingClick = true;

  if (window.ReviseFX) {
    window.ReviseFX.playSound(type === 'know' ? 'success' : 'click');
  }

  // PART 1 (1 & 2a): Set selectedDifficulty state
  selectedDifficulty = type;

  // PART 1 (2b): Move the blue square indicator to clicked button
  applyDifficultySquareHighlight(type);

  // Disable buttons UI during 300ms transition
  setButtonsDisabled(true);

  // PART 2 (6): Feedback Toast
  showToast(type);

  // PART 1 (2c & 3): Wait 300ms -> Process Spaced Repetition -> Next Card -> Reset State
  setTimeout(() => {
    processSpacedRepetition(type);
    saveProgress();
    updateStats();

    // Advance to next card
    currentIndex++;

    // PART 1 (2c): Reset selectedDifficulty state & remove highlight
    selectedDifficulty = null;
    resetDifficultySquareHighlight();

    // Unlock double-click guard
    isProcessingClick = false;
    setButtonsDisabled(false);

    // Render next card
    renderCard();
  }, 300);
}

// Move Blue Square Highlight to the Selected Button
function applyDifficultySquareHighlight(type) {
  resetDifficultySquareHighlight();

  let targetBtn = null;
  if (type === 'need') targetBtn = btnNeed;
  if (type === 'pass') targetBtn = btnPass;
  if (type === 'know') targetBtn = btnKnow;

  if (targetBtn) {
    // Add blue square border & shadow highlight
    targetBtn.classList.add(
      'border-2',
      'border-blue-600',
      'dark:border-blue-400',
      'ring-4',
      'ring-blue-500/30',
      'scale-105',
      'bg-blue-50',
      'dark:bg-blue-900/50',
      'shadow-lg'
    );
  }
}

// Reset Blue Square Highlight on all 3 buttons
function resetDifficultySquareHighlight() {
  [btnNeed, btnPass, btnKnow].forEach(btn => {
    if (!btn) return;
    btn.classList.remove(
      'border-2',
      'border-blue-600',
      'dark:border-blue-400',
      'ring-4',
      'ring-blue-500/30',
      'scale-105',
      'bg-blue-50',
      'dark:bg-blue-900/50',
      'shadow-lg'
    );
  });
}

// Disable/Enable difficulty buttons during 300ms transition
function setButtonsDisabled(disabled) {
  [btnNeed, btnPass, btnKnow].forEach(btn => {
    if (!btn) return;
    if (disabled) {
      btn.classList.add('opacity-75', 'cursor-not-allowed');
      btn.setAttribute('disabled', 'true');
    } else {
      btn.classList.remove('opacity-75', 'cursor-not-allowed');
      btn.removeAttribute('disabled');
    }
  });
}

// 6. PART 1 (3): Spaced Repetition Logic (need=3, pass=5, know=15)
function processSpacedRepetition(type) {
  const currentCard = deck[currentIndex];
  if (!currentCard) return;

  if (type === 'need') {
    currentCard.status = 'need';
    currentCard.interval = 3;
    // Re-insert card 3 positions later in queue if not at end
    reinsertCard(currentCard, 3);
  } else if (type === 'pass') {
    currentCard.status = 'learning';
    currentCard.interval = 5;
    reinsertCard(currentCard, 5);
  } else if (type === 'know') {
    currentCard.status = 'mastered';
    currentCard.interval = 15;
  }
}

// Helper to reinsert card N steps ahead in current study queue
function reinsertCard(card, offset) {
  const targetIdx = Math.min(currentIndex + offset, deck.length);
  const cardCopy = { ...card };
  deck.splice(targetIdx, 0, cardCopy);
}

// 7. Toast Notification Feedback
function showToast(type) {
  if (!toastNotification) return;

  let message = 'Nice! 🔥';
  let badgeColor = 'bg-blue-600';

  if (type === 'need') {
    message = 'Added to Review! 💡';
    badgeColor = 'bg-red-500';
  } else if (type === 'pass') {
    message = 'Keep Going! ⚡';
    badgeColor = 'bg-amber-500';
  } else if (type === 'know') {
    message = 'Mastered! 🔥';
    badgeColor = 'bg-emerald-600';
  }

  toastNotification.innerText = message;
  toastNotification.className = `fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full text-white text-xs font-extrabold shadow-2xl transition-all duration-300 z-50 transform translate-y-0 opacity-100 ${badgeColor}`;

  setTimeout(() => {
    toastNotification.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full text-white text-xs font-extrabold shadow-2xl transition-all duration-300 z-50 transform translate-y-4 opacity-0 pointer-events-none';
  }, 1000);
}

// 8. Event Listeners for Difficulty Buttons
btnNeed.addEventListener('click', (e) => { e.stopPropagation(); handleDifficultyClick('need'); });
btnPass.addEventListener('click', (e) => { e.stopPropagation(); handleDifficultyClick('pass'); });
btnKnow.addEventListener('click', (e) => { e.stopPropagation(); handleDifficultyClick('know'); });

// Navigation Buttons
prevCardBtn.addEventListener('click', () => {
  if (currentIndex > 0) {
    if (window.ReviseFX) window.ReviseFX.playSound('click');
    currentIndex--;
    renderCard();
  }
});
nextCardBtn.addEventListener('click', () => {
  if (currentIndex < deck.length - 1) {
    if (window.ReviseFX) window.ReviseFX.playSound('click');
    currentIndex++;
    renderCard();
  }
});

// 9. Update Sidebar Stats Live
function updateStats() {
  const total = deck.length;
  const mastered = deck.filter(c => c.status === 'mastered').length;
  const need = deck.filter(c => c.status === 'need').length;
  const learning = deck.filter(c => c.status === 'learning').length;

  if (statTotal) statTotal.innerText = total;
  if (statMastered) statMastered.innerText = mastered;
  if (statLearning) statLearning.innerText = learning;
  if (statNeed) statNeed.innerText = need;
}

// 10. Session Timer
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    sessionSeconds++;
    const mins = Math.floor(sessionSeconds / 60).toString().padStart(2, '0');
    const secs = (sessionSeconds % 60).toString().padStart(2, '0');
    if (timerDisplay) timerDisplay.innerText = `${mins}:${secs}`;
  }, 1000);
}

// 11. Keyboard Shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      flipCard();
    } else if (e.key === '1') {
      handleDifficultyClick('need');
    } else if (e.key === '2') {
      handleDifficultyClick('pass');
    } else if (e.key === '3') {
      handleDifficultyClick('know');
    }
  });
}

// 12. PART 2 (8): End Session Summary View
function showEndSummary() {
  studyContainer.classList.add('hidden');
  endSummaryContainer.classList.remove('hidden');

  if (window.ReviseFX) {
    window.ReviseFX.playSound('celebrate');
    window.ReviseFX.triggerConfetti();
  }

  const total = deck.length;
  const mastered = deck.filter(c => c.status === 'mastered').length;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  endSummaryStats.innerHTML = `
    <div class="text-center space-y-3">
      <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl shadow-md animate-bounce">
        🎉
      </div>
      <h2 class="text-3xl font-extrabold text-primary dark:text-white">You did it!</h2>
      <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mx-auto">
        Reviewed <strong>${total}</strong> cards. <strong>${mastered}</strong> Mastered (<span class="text-emerald-600 dark:text-emerald-400 font-bold">${pct}%</span> mastery rate).
      </p>
    </div>
  `;
}

// Study Again Button Handler
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    deck = [...DEFAULT_CARDS].map(c => ({ ...c, status: 'learning', interval: 0 }));
    currentIndex = 0;
    saveProgress();
    updateStats();
    renderCard();
  });
}
