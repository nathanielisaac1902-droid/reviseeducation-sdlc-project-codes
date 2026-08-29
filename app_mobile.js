// GLOBAL STATE FOR FLASHCARDS
let currentIndex = 0;
let isFlipped = false;
let selectedDifficulty = null;
const deckId = "bio_deck_1";
const deck = [
  { id: 1, question: "What biological structure stores genetic information and controls cell activities?", answer: "The Nucleus" },
  { id: 2, question: "What is the powerhouse of the cell?", answer: "Mitochondria" },
  { id: 3, question: "What process do plants use to make food?", answer: "Photosynthesis" }
];

// BUGFIX: Ensures question shows first on every load
function loadCard() {
  isFlipped = false;
  const cardEl = document.querySelector('.card');
  if (cardEl) cardEl.classList.remove('flipped');
  const card = deck[currentIndex];
  
  const frontSide = document.getElementById('cardFrontSide');
  const backSide = document.getElementById('cardBackSide');
  const cardCounter = document.getElementById('cardCounter');

  if (frontSide) {
    frontSide.innerText = card.question;
    frontSide.style.display = 'block';
  }
  if (backSide) {
    backSide.innerText = card.answer;
    backSide.style.display = 'none';
  }
  if (cardCounter) {
    cardCounter.innerText = `Card ${currentIndex + 1} of ${deck.length}`;
  }
}

function flipCard() {
  isFlipped = !isFlipped;
  const cardEl = document.querySelector('.card');
  if (cardEl) cardEl.classList.toggle('flipped');
  
  const frontSide = document.getElementById('cardFrontSide');
  const backSide = document.getElementById('cardBackSide');
  if (frontSide && backSide) {
    if (isFlipped) {
      frontSide.style.display = 'none';
      backSide.style.display = 'block';
    } else {
      frontSide.style.display = 'block';
      backSide.style.display = 'none';
    }
  }
}

function nextCard() {
  currentIndex = (currentIndex + 1) % deck.length;
  loadCard();
}

// BUGFIX: Makes indigo square light up and advance
function handleDifficulty(level, btnElement) {
  resetDifficultySquareHighlight();
  btnElement.classList.add('active'); // This makes it indigo
  const card = deck[currentIndex];
  localStorage.setItem(`rs_${deckId}_${card.id}`, level);
  setTimeout(() => {
    nextCard();
    resetDifficultySquareHighlight();
  }, 300); // 300ms delay for visual feedback
}

function resetDifficultySquareHighlight() {
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.classList.remove('active');
  });
}

// Render Function for Flashcards Component
function renderFlashcards() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="flashcard-container">
      <div id="cardCounter">Card 1 of ${deck.length}</div>
      <div class="perspective">
        <div class="card" onclick="flipCard()">
          <div id="cardFrontSide" class="card-side"></div>
          <div id="cardBackSide" class="card-side"></div>
        </div>
      </div>
      <div class="difficulty-buttons">
        <button class="difficulty-btn bg-red-100" onclick="handleDifficulty('hard', this)">Hard</button>
        <button class="difficulty-btn bg-yellow-100" onclick="handleDifficulty('medium', this)">Medium</button>
        <button class="difficulty-btn bg-green-100" onclick="handleDifficulty('easy', this)">Easy</button>
      </div>
    </div>
  `;

  loadCard();
}

// App Router
function router() {
  renderFlashcards();
}

document.addEventListener('DOMContentLoaded', () => {
  router();
});
