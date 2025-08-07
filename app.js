import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, set, update, get, onValue, child } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = { databaseURL:"https://pathpharmm-default-rtdb.firebaseio.com/" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const roomCode = new URLSearchParams(location.search).get('room') || localStorage.getItem('roomCode');
localStorage.setItem('roomCode', roomCode);
const roomRef = ref(db, `rooms/${roomCode}`);

let isHost = localStorage.getItem("isHost") === "true";
let playerId = localStorage.getItem('playerId') || ('guest_' + Math.random().toString(36).substr(2, 6).toUpperCase());
localStorage.setItem('playerId', playerId);
let score = 0, currentIndex = 0, timerInterval = null;
let questionSet = [];

const catPath = document.getElementById('catPath');
const catPharm = document.getElementById('catPharm');
const statusMsg = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const questionText = document.getElementById('question-text');
const answersDiv = document.getElementById('answers');
const timeLeft = document.getElementById('time-left');
const scoreEl = document.getElementById('score');
const finalScore = document.getElementById('final-score');
const finalLeaderboard = document.getElementById('final-leaderboard');
const resultTitle = document.getElementById('result-title');
const winnerSummary = document.getElementById('winner-summary');

const allQuestions = {
  pathology: [
    { q: "What cell type proliferates in acute inflammation?", opts: ["Neutrophil", "Lymphocyte", "Macrophage", "Basophil"], correct: 0 },
    { q: "Which mediator causes vasodilation in inflammation?", opts: ["Histamine", "Bradykinin", "Serotonin", "IL-1"], correct: 0 },
    // Add 8 more...
  ],
  pharmacology: [
    { q: "Which drug is a β‑blocker?", opts: ["Propranolol", "Lisinopril", "Losartan", "Verapamil"], correct: 0 },
    { q: "Which is a loop diuretic?", opts: ["Furosemide", "Hydrochlorothiazide", "Spironolactone", "Acetazolamide"], correct: 0 },
    // Add 8 more...
  ]
};

function shuffle(a) {
  return a.sort(() => Math.random() - 0.5);
}

function showScene(id) {
  ['scene-lobby', 'scene-game', 'scene-result'].forEach(s => {
    document.getElementById(s).style.display = (s === id ? 'block' : 'none');
  });
}

async function initGame() {
  const playerRef = child(roomRef, 'players/' + playerId);
  await update(playerRef, { id: playerId, score: 0 });

  onValue(child(roomRef, 'players'), snap => {
    const players = Object.values(snap.val() || {});
    const topPlayer = players.reduce((max, p) => (p.score > max.score ? p : max), { score: -1 });

    finalLeaderboard.innerHTML = "<h3>Leaderboard:</h3>" +
      players.sort((a, b) => b.score - a.score)
        .map(p => `<div>${p.id === playerId ? '🧍 ' : ''}${p.id}${p.id === topPlayer.id ? ' 🥇' : ''}: ${p.score}</div>`)
        .join('');
  });
if (isHost) {
  // Defer category button setup until DOM is visible
  showScene('scene-lobby');
  statusMsg.textContent = "You're host. Choose category.";
  
  // Rebind click events after showing scene
  setTimeout(() => {
    document.getElementById('catPath').onclick = () => chooseCategory('pathology');
    document.getElementById('catPharm').onclick = () => chooseCategory('pharmacology');
  }, 100); // Small delay ensures the buttons are visible
} else {
  statusMsg.textContent = "Waiting for host to choose category...";
}

  onValue(child(roomRef, 'questions'), snap => {
    if (snap.exists()) questionSet = snap.val();
  });

  onValue(child(roomRef, 'gameStarted'), snap => {
    if (snap.val()) {
      statusMsg.style.display = 'none';
      showScene('scene-game');
    }
  });

  onValue(child(roomRef, 'currentQuestion'), snap => {
    if (snap.exists()) currentIndex = snap.val();
  });

  onValue(child(roomRef, 'questionStartTime'), snap => {
    if (snap.exists()) startQuestionLoop(snap.val());
  });

  onValue(child(roomRef, 'quizEnded'), snap => {
    if (snap.val()) showEnd();
  });
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
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.textContent = opt;
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

function lockButtons() {
  answersDiv.querySelectorAll('button').forEach(b => b.disabled = true);
}

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
  showScene('scene-result');
  finalScore.textContent = score;

  get(child(roomRef, 'players')).then(snap => {
    const players = Object.values(snap.val() || {});
    const topPlayer = players.reduce((max, p) => (p.score > max.score ? p : max), { score: -1 });

    if (topPlayer.id === playerId) {
      resultTitle.textContent = "🎉 You Won!";
    } else {
      resultTitle.textContent = "😞 You Lost!";
    }

    winnerSummary.innerHTML = `🏆 Winner: <strong>${topPlayer.id}</strong> with <strong>${topPlayer.score} points</strong>`;
  });

  statusMsg.style.display = 'block';
  statusMsg.textContent = "Thanks for playing!";
}

initGame();
const nameEntry = document.getElementById('nameEntry');
const nicknameInput = document.getElementById('nicknameInput');
const saveNameBtn = document.getElementById('saveNameBtn');
