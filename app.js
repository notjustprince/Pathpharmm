import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, set, update, get, onValue, child } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = { databaseURL: "https://pathpharmm-default-rtdb.firebaseio.com/" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const roomCode = new URLSearchParams(location.search).get('room') || localStorage.getItem('roomCode');
localStorage.setItem('roomCode', roomCode);
const roomRef = ref(db, `rooms/${roomCode}`);

let isHost = localStorage.getItem("isHost") === "true";
let playerId = localStorage.getItem('playerId') || ('guest_' + Math.random().toString(36).substr(2, 6).toUpperCase());
localStorage.setItem('playerId', playerId);
let score = 0, currentIndex = 0, timerInterval = null, questionSet = [];

const catPath = document.getElementById('catPath'), catPharm = document.getElementById('catPharm');
const statusMsg = document.getElementById('status');
const questionText = document.getElementById('question-text');
const answersDiv = document.getElementById('answers');
const timeLeft = document.getElementById('time-left');
const scoreEl = document.getElementById('score');
const finalScore = document.getElementById('final-score');
const resultTitle = document.getElementById('result-title');
const resultOutcome = document.getElementById('result-outcome');
const playAgainBtn = document.getElementById('play-again-btn');

const allQuestions = {
  pathology: [
    { q: "What cell type proliferates in acute inflammation?", opts: ["Neutrophil", "Lymphocyte", "Macrophage", "Basophil"], correct: 0 },
    { q: "Which mediator causes vasodilation in inflammation?", opts: ["Histamine", "Bradykinin", "Serotonin", "IL-1"], correct: 0 },
  ],
  pharmacology: [
    { q: "Which drug is a β‑blocker?", opts: ["Propranolol", "Lisinopril", "Losartan", "Verapamil"], correct: 0 },
    { q: "Which is a loop diuretic?", opts: ["Furosemide", "Hydrochlorothiazide", "Spironolactone", "Acetazolamide"], correct: 0 },
  ]
};

function shuffle(a) { return a.sort(() => Math.random() - 0.5); }
function showScene(id) { ['scene‑lobby','scene‑game','scene‑result'].forEach(s => { document.getElementById(s).style.display = (s === id ? 'block' : 'none'); }); }

async function initGame() {
  await update(child(roomRef, 'players/' + playerId), { id: playerId, score: 0 });
  if (isHost) {
    showScene('scene‑lobby');
    statusMsg.textContent = "You're host. Choose category.";
    catPath.onclick = () => chooseCategory('pathology');
    catPharm.onclick = () => chooseCategory('pharmacology');
  } else {
    showScene('scene‑lobby');
    statusMsg.textContent = "Waiting for host to choose category...";
  }
  onValue(child(roomRef, 'questions'), snap => { if (snap.exists()) questionSet = snap.val(); });
  onValue(child(roomRef, 'gameStarted'), snap => { if (snap.val()) { statusMsg.style.display = 'none'; showScene('scene‑game'); } });
  onValue(child(roomRef, 'currentQuestion'), snap => { if (snap.exists()) currentIndex = snap.val(); });
  onValue(child(roomRef, 'questionStartTime'), snap => { if (snap.exists()) startQuestionLoop(snap.val()); });
  onValue(child(roomRef, 'quizEnded'), snap => { if (snap.val()) showEnd(); });

  playAgainBtn.onclick = async () => {
    await update(child(roomRef, 'players/' + playerId), { score: 0 });
    if (isHost) {
      await set(child(roomRef, 'gameStarted'), false);
      await set(child(roomRef, 'quizEnded'), false);
      await set(child(roomRef, 'questions'), null);
      await set(child(roomRef, 'currentQuestion'), 0);
      statusMsg.textContent = "You're host. Choose category.";
      showScene('scene‑lobby');
    } else {
      statusMsg.textContent = "Waiting for host to choose category...";
      showScene('scene‑lobby');
    }
    score = 0; scoreEl.textContent = '0';
  };
}

async function chooseCategory(cat) {
  const questions = shuffle([...allQuestions[cat]]).slice(0, 10);
  await set(child(roomRef, 'chosenCategory'), cat);
  await set(child(roomRef, 'questions'), questions);
  await set(child(roomRef, 'gameStarted'), true);
  await set(child(roomRef, 'currentQuestion'), 0);
  await set(child(roomRef, 'questionStartTime'), Date.now());
}

function startQuestionLoop(ts) {
  clearInterval(timerInterval);
  displayQuestion();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - ts) / 1000);
    const rem = 10 - elapsed;
    timeLeft.textContent = rem > 0 ? rem : 0;
    if (rem <= 0) {
      clearInterval(timerInterval);
      lockButtons();
      if (isHost) goNextQuestion();
    }
  }, 200);
}

function displayQuestion() {
  const q = questionSet[currentIndex];
  if (!q) return showEnd();
  questionText.textContent = q.q;
  answersDiv.innerHTML = '';
  scoreEl.textContent = score;
  const labels = ['A.', 'B.', 'C.', 'D.'];
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.textContent = `${labels[i]} ${opt}`;
    btn.onclick = () => answerQuestion(i);
    answersDiv.appendChild(btn);
  });
}

async function answerQuestion(i) {
  if (answersDiv.querySelector('button:disabled')) return;
  lockButtons();
  const q = questionSet[currentIndex];
  const btns = answersDiv.querySelectorAll('button');
  btns[i].classList.add(i === q.correct ? 'correct' : 'incorrect');
  if (i === q.correct) {
    score += 10;
    scoreEl.textContent = score;
    await update(child(roomRef, `players/${playerId}`), { score });
  }
}

function lockButtons() { answersDiv.querySelectorAll('button').forEach(b => b.disabled = true); }

async function goNextQuestion() {
  currentIndex++;
  if (currentIndex < questionSet.length) {
    await set(child(roomRef, 'currentQuestion'), currentIndex);
    await set(child(roomRef, 'questionStartTime'), Date.now());
  } else {
    await set(child(roomRef, 'quizEnded'), true);
  }
}

function showEnd() {
  clearInterval(timerInterval);
  showScene('scene‑result');
  finalScore.textContent = score;
  get(child(roomRef, 'players')).then(snap => {
    const players = Object.values(snap.val() || {});
    const maxScore = Math.max(...players.map(p => p.score));
    const winners = players.filter(p => p.score === maxScore);
    if (winners.length > 1 && winners.some(p => p.id === playerId)) {
      resultTitle.textContent = "🤝 It's a Tie!";
      resultOutcome.textContent = `You tied for 1st with ${maxScore} points.`;
    } else if (winners[0].id === playerId) {
      resultTitle.textContent = "🎉 You Won!";
      resultOutcome.textContent = `You scored ${score} points and won!`;
    } else {
      resultTitle.textContent = "😞 You Lost!";
      resultOutcome.textContent = `You scored ${score}. Winner: ${winners[0].id} with ${maxScore} points.`;
    }
  });
  statusMsg.style.display = 'block';
  statusMsg.textContent = "Thanks for playing!";
}

initGame();