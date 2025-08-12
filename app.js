/* app.js - Multiplayer Quiz (full) */
/* IMPORTANT: put your Firebase config values below */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getDatabase,
  ref,
  child,
  set,
  update,
  get,
  onValue
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

/* ===== REPLACE THESE WITH YOUR FIREBASE VALUES ===== */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "pathpharmm.firebaseapp.com",
  projectId: "pathpharmm",
  storageBucket: "pathpharmm.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://pathpharmm-default-rtdb.firebaseio.com/"
};
/* =================================================== */

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* URL / Room / Host handling */
const params = new URLSearchParams(location.search);
const roomParam = params.get('room');
const hostParam = params.get('host');

const roomCode = roomParam || localStorage.getItem('roomCode') || 'main-room';
localStorage.setItem('roomCode', roomCode);
const roomRef = ref(db, `rooms/${roomCode}`);

// host flag: either ?host=true or previously set in localStorage
let isHost = (hostParam === 'true') || (localStorage.getItem('isHost') === 'true');
if (hostParam === 'true') localStorage.setItem('isHost', 'true');

let playerId = localStorage.getItem('playerId') || ('guest_' + Math.random().toString(36).substr(2, 6).toUpperCase());
localStorage.setItem('playerId', playerId);

const QUESTION_SECONDS = 10;

let score = 0;
let currentIndex = 0;
let timerInterval = null;
let questionSet = [];

/* ===== DOM refs ===== */
const statusMsg = document.getElementById('status');

const nameEntryScene = document.getElementById('nameEntry');
const nicknameInput = document.getElementById('nicknameInput');
const saveNameBtn = document.getElementById('saveNameBtn');
const avatarPicker = document.getElementById('avatarPicker');

const sceneLobby = document.getElementById('scene-lobby');
const questionCountSelect = document.getElementById('questionCount');
const questionCountContainer = document.getElementById('questionCountContainer');
const catPath = document.getElementById('catPath');
const catPharm = document.getElementById('catPharm');
const chosenInfo = document.getElementById('chosenInfo');
const chosenCategorySpan = document.getElementById('chosenCategory');
const chosenCountSpan = document.getElementById('chosenCount');
const playersList = document.getElementById('playersList');

const sceneGame = document.getElementById('scene-game');
const questionText = document.getElementById('question-text');
const answersDiv = document.getElementById('answers');
const timeLeft = document.getElementById('time-left');
const scoreEl = document.getElementById('score');

const sceneResult = document.getElementById('scene-result');
const resultTitle = document.getElementById('result-title');
const resultDetails = document.getElementById('result-details');
const finalScore = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again-btn');

/* ===== Questions Bank (copied & complete from your provided set) ===== */
const allQuestions = {
  pathology: [
    { q: "What cell type proliferates in acute inflammation?", opts: ["Neutrophil", "Lymphocyte", "Macrophage", "Basophil"], correct: 0 },
    { q: "Which mediator causes vasodilation in inflammation?", opts: ["Histamine", "Bradykinin", "Serotonin", "IL-1"], correct: 0 },
    { q: "Which type of necrosis is most often seen in the brain?", opts: ["Liquefactive", "Coagulative", "Caseous", "Fat"], correct: 0 },
    { q: "What is the most common cause of myocardial infarction?", opts: ["Atherosclerosis", "Hypertension", "Myocarditis", "Coronary artery spasm"], correct: 0 },
    { q: "Which stain is used for amyloid deposits?", opts: ["Congo red", "PAS", "Silver stain", "H&E"], correct: 0 },
    { q: "Which white blood cell is elevated in parasitic infections?", opts: ["Eosinophil", "Neutrophil", "Basophil", "Monocyte"], correct: 0 },
    { q: "What is the hallmark of reversible cell injury?", opts: ["Cell swelling", "Nuclear fragmentation", "Karyolysis", "Apoptosis"], correct: 0 },
    { q: "Which type of hypersensitivity is mediated by IgE?", opts: ["Type I", "Type II", "Type III", "Type IV"], correct: 0 },
    { q: "What is the main protein in Mallory bodies?", opts: ["Keratin", "Actin", "Collagen", "Elastin"], correct: 0 },
    { q: "Which virus is linked to Burkitt lymphoma?", opts: ["EBV", "HBV", "HCV", "HPV"], correct: 0 },
    { q: "What is the most common primary bone tumor in children?", opts: ["Osteosarcoma", "Ewing sarcoma", "Chondrosarcoma", "Multiple myeloma"], correct: 0 },
    { q: "Which cytokine is most associated with fever?", opts: ["IL-1", "IL-2", "TNF-alpha", "IFN-gamma"], correct: 0 },
    { q: "What is the hallmark microscopic feature of granulomas?", opts: ["Epithelioid cells", "Neutrophils", "Necrosis", "Fibrosis"], correct: 0 },
    { q: "Which tumor marker is used in hepatocellular carcinoma?", opts: ["AFP", "CEA", "CA-125", "PSA"], correct: 0 },
    { q: "Which cancer is associated with asbestos exposure?", opts: ["Mesothelioma", "Lung adenocarcinoma", "Squamous cell carcinoma", "Small cell carcinoma"], correct: 0 },
    { q: "Which artery is most often affected in polyarteritis nodosa?", opts: ["Renal artery", "Coronary artery", "Carotid artery", "Pulmonary artery"], correct: 0 },
    { q: "What is the most common cause of chronic liver disease?", opts: ["Alcohol", "Viral hepatitis", "NAFLD", "Hemochromatosis"], correct: 0 },
    { q: "Which stain is used for fungi?", opts: ["Gomori methenamine silver", "Congo red", "PAS", "Ziehl-Neelsen"], correct: 0 },
    { q: "Which protein accumulates in Alzheimer disease plaques?", opts: ["Beta-amyloid", "Tau", "Alpha-synuclein", "Prion protein"], correct: 0 },
    { q: "Which type of necrosis is seen in tuberculosis?", opts: ["Caseous", "Coagulative", "Liquefactive", "Fat"], correct: 0 },
    { q: "What is the most common cause of anemia worldwide?", opts: ["Iron deficiency", "Vitamin B12 deficiency", "Folate deficiency", "Chronic disease"], correct: 0 },
    { q: "Which condition is marked by Reed–Sternberg cells?", opts: ["Hodgkin lymphoma", "Non-Hodgkin lymphoma", "Multiple myeloma", "Leukemia"], correct: 0 }
  ],
  pharmacology: [
    { q: "Which drug is a β-blocker?", opts: ["Propranolol", "Lisinopril", "Losartan", "Verapamil"], correct: 0 },
    { q: "Which is a loop diuretic?", opts: ["Furosemide", "Hydrochlorothiazide", "Spironolactone", "Acetazolamide"], correct: 0 },
    { q: "What is the antidote for benzodiazepine overdose?", opts: ["Flumazenil", "Naloxone", "Atropine", "Physostigmine"], correct: 0 },
    { q: "Which drug is used for chronic gout?", opts: ["Allopurinol", "Colchicine", "NSAIDs", "Prednisone"], correct: 0 },
    { q: "Which class of drugs ends with ‘-pril’?", opts: ["ACE inhibitors", "Beta-blockers", "ARBs", "Calcium channel blockers"], correct: 0 },
    { q: "Which drug is an antiplatelet agent?", opts: ["Aspirin", "Heparin", "Warfarin", "Alteplase"], correct: 0 },
    { q: "Which insulin has the fastest onset?", opts: ["Lispro", "Regular", "NPH", "Glargine"], correct: 0 },
    { q: "Which antibiotic causes ototoxicity?", opts: ["Gentamicin", "Amoxicillin", "Azithromycin", "Ceftriaxone"], correct: 0 },
    { q: "Which drug is used in opioid overdose?", opts: ["Naloxone", "Flumazenil", "Atropine", "Epinephrine"], correct: 0 },
    { q: "Which drug is a calcium channel blocker?", opts: ["Amlodipine", "Lisinopril", "Metoprolol", "Losartan"], correct: 0 },
    { q: "Which antiarrhythmic drug causes pulmonary fibrosis?", opts: ["Amiodarone", "Lidocaine", "Flecainide", "Verapamil"], correct: 0 },
    { q: "Which antibiotic inhibits DNA gyrase?", opts: ["Ciprofloxacin", "Erythromycin", "Penicillin", "Vancomycin"], correct: 0 },
    { q: "Which drug is a proton pump inhibitor?", opts: ["Omeprazole", "Ranitidine", "Sucralfate", "Misoprostol"], correct: 0 },
    { q: "Which drug is a selective β1 blocker?", opts: ["Metoprolol", "Propranolol", "Carvedilol", "Labetalol"], correct: 0 },
    { q: "Which drug is used to treat malaria?", opts: ["Chloroquine", "Metronidazole", "Ivermectin", "Rifampin"], correct: 0 },
    { q: "Which drug is a statin?", opts: ["Atorvastatin", "Gemfibrozil", "Niacin", "Ezetimibe"], correct: 0 },
    { q: "Which drug causes gingival hyperplasia?", opts: ["Phenytoin", "Valproate", "Carbamazepine", "Gabapentin"], correct: 0 },
    { q: "Which antibiotic binds 50S ribosomal subunit?", opts: ["Clindamycin", "Tetracycline", "Gentamicin", "Amikacin"], correct: 0 },
    { q: "Which drug is an α1 blocker used in BPH?", opts: ["Tamsulosin", "Propranolol", "Lisinopril", "Furosemide"], correct: 0 },
    { q: "Which drug is a direct thrombin inhibitor?", opts: ["Dabigatran", "Warfarin", "Heparin", "Aspirin"], correct: 0 },
    { q: "Which drug is an H1 receptor antagonist?", opts: ["Diphenhydramine", "Ranitidine", "Loratadine", "Famotidine"], correct: 0 },
    { q: "Which drug is used as a muscarinic antagonist in asthma?", opts: ["Ipratropium", "Albuterol", "Epinephrine", "Montelukast"], correct: 0 }
  ]
};

/* ===== Helpers ===== */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showScene(id) {
  ['nameEntry', 'scene-lobby', 'scene-game', 'scene-result'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = (s === id ? 'block' : 'none');
  });
}

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ===== Nickname & Avatar handling ===== */
function setNicknameAndAvatarHandlers() {
  // avatar selector
  avatarPicker.querySelectorAll('.avatar').forEach(btn => {
    btn.onclick = () => {
      avatarPicker.querySelectorAll('.avatar').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });

  saveNameBtn.onclick = () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) {
      alert('Please enter a nickname.');
      return;
    }
    const selectedAvatar = avatarPicker.querySelector('.avatar.selected');
    const avatar = selectedAvatar ? selectedAvatar.textContent : '🧠';
    localStorage.setItem('nickname', nickname);
    localStorage.setItem('avatar', avatar);

    registerPlayerAndSetup().catch(err => {
      console.error('Error registering player:', err);
      alert('Could not join room (see console).');
    });
  };
}

/* ===== Register player in DB and set app listeners ===== */
async function registerPlayerAndSetup() {
  // write player's basic info to DB
  const playerRef = child(roomRef, `players/${playerId}`);
  await update(playerRef, {
    id: playerId,
    score: 0,
    nickname: localStorage.getItem('nickname') || playerId,
    avatar: localStorage.getItem('avatar') || '🧠',
    joinedAt: Date.now()
  });

  // UI: show lobby
  if (isHost) {
    questionCountContainer.style.display = 'block';
    showScene('scene-lobby');
    statusMsg.textContent = "You're the host. Pick category & start the quiz.";
    catPath.onclick = () => chooseCategory('pathology');
    catPharm.onclick = () => chooseCategory('pharmacology');
  } else {
    questionCountContainer.style.display = 'none';
    showScene('scene-lobby');
    statusMsg.textContent = "Waiting for host to choose category...";
  }

  // show current chosen category / count live
  onValue(child(roomRef, 'chosenCategory'), snap => {
    if (snap.exists()) {
      chosenCategorySpan.textContent = snap.val();
      chosenInfo.style.display = 'block';
    }
  });
  onValue(child(roomRef, 'chosenCount'), snap => {
    if (snap.exists()) {
      chosenCountSpan.textContent = snap.val();
      chosenInfo.style.display = 'block';
    }
  });

  // questions array live
  onValue(child(roomRef, 'questions'), snap => {
    if (snap.exists()) {
      questionSet = normalizeQuestions(snap.val());
    } else {
      questionSet = [];
    }
  });

  // game flow listeners
  onValue(child(roomRef, 'gameStarted'), snap => {
    if (snap.exists() && snap.val()) {
      statusMsg.style.display = 'none';
      showScene('scene-game');
    }
  });

  onValue(child(roomRef, 'currentQuestion'), snap => {
    if (snap.exists()) {
      currentIndex = Number(snap.val()) || 0;
      displayQuestion();
    }
  });

  onValue(child(roomRef, 'questionStartTime'), snap => {
    if (snap.exists()) startQuestionLoop(Number(snap.val()));
  });

  onValue(child(roomRef, 'quizEnded'), snap => {
    if (snap.exists() && snap.val()) showEnd();
  });

  // players list update
  onValue(child(roomRef, 'players'), snap => {
    renderPlayersList(snap.val() || {});
  });

  // final: if game already started when we joined, get questions & show game
  const startedSnap = await get(child(roomRef, 'gameStarted'));
  if (startedSnap.exists() && startedSnap.val()) {
    const qSnap = await get(child(roomRef, 'questions'));
    if (qSnap.exists()) {
      questionSet = normalizeQuestions(qSnap.val());
      showScene('scene-game');
    }
  }

  playAgainBtn.onclick = resetGame;
}

/* Normalize questions returned from Firebase (array or object) */
function normalizeQuestions(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  const keys = Object.keys(val).sort((a, b) => Number(a) - Number(b));
  return keys.map(k => val[k]);
}

/* ===== Host chooses category & number of questions ===== */
async function chooseCategory(cat) {
  if (!isHost) return;
  const questionCount = Number(questionCountSelect?.value || 10);
  const raw = allQuestions[cat] || [];
  const selectedRaw = shuffle(raw).slice(0, questionCount);

  const selected = selectedRaw.map(q => {
    const originalOptions = [...q.opts];
    const correctText = originalOptions[q.correct];
    const shuffledOptions = shuffle(originalOptions);
    const newCorrectIndex = shuffledOptions.indexOf(correctText);
    return {
      q: q.q,
      opts: shuffledOptions,
      correct: newCorrectIndex
    };
  });

  // persist chosen count & category + questions + start flag + start time atomically-ish
  await set(child(roomRef, 'questions'), selected);
  await set(child(roomRef, 'chosenCategory'), cat);
  await set(child(roomRef, 'chosenCount'), questionCount);
  await set(child(roomRef, 'currentQuestion'), 0);
  await set(child(roomRef, 'quizEnded'), false);
  await set(child(roomRef, 'gameStarted'), true);
  await set(child(roomRef, 'questionStartTime'), Date.now());

  // local cache
  questionSet = selected;
  statusMsg.style.display = 'none';
}

/* ===== Timer loop (driven by questionStartTime stored in DB) ===== */
function startQuestionLoop(startTs) {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTs) / 1000);
    const rem = QUESTION_SECONDS - elapsed;
    timeLeft.textContent = rem > 0 ? rem : 0;
    if (rem <= 0) {
      clearInterval(timerInterval);
      lockButtons();
      // only host advances the question (avoids races)
      if (isHost) goNextQuestion().catch(err => console.error('goNextQuestion error', err));
    }
  }, 200);
}

/* ===== Render current question ===== */
function displayQuestion() {
  const q = questionSet[currentIndex];
  if (!q) return showEnd();
  questionText.textContent = q.q || '';
  answersDiv.innerHTML = '';
  scoreEl.textContent = score;
  const labels = ['A.', 'B.', 'C.', 'D.'];
  (q.opts || []).forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.textContent = `${labels[i] || ''} ${opt}`;
    btn.onclick = () => answerQuestion(i);
    answersDiv.appendChild(btn);
  });
}

/* ===== Answer handling ===== */
async function answerQuestion(i) {
  // disallow double answers
  if (answersDiv.querySelector('button:disabled')) return;
  lockButtons();
  const q = questionSet[currentIndex];
  if (!q) return;

  const btns = answersDiv.querySelectorAll('button');
  btns[i].classList.add(i === q.correct ? 'correct' : 'incorrect');

  if (i === q.correct) {
    score += 10;
    scoreEl.textContent = score;
    try {
      await update(child(roomRef, `players/${playerId}`), { score });
    } catch (err) {
      console.error('Error updating score:', err);
    }
  }
}

/* disable answer buttons */
function lockButtons() {
  answersDiv.querySelectorAll('button').forEach(b => b.disabled = true);
}

/* ===== Advance question (host only) ===== */
async function goNextQuestion() {
  currentIndex++;
  if (currentIndex < (questionSet?.length || 0)) {
    await set(child(roomRef, 'currentQuestion'), currentIndex);
    await set(child(roomRef, 'questionStartTime'), Date.now());
  } else {
    // end quiz
    // small delay to give last-score writes time to propagate
    await new Promise(r => setTimeout(r, 500));
    await set(child(roomRef, 'quizEnded'), true);
    await set(child(roomRef, 'gameStarted'), false);
  }
}

/* ===== Show end screen & results (reads DB scores) ===== */
function showEnd() {
  clearInterval(timerInterval);
  showScene('scene-result');

  get(child(roomRef, 'players')).then(snap => {
    const playersObj = snap.val() || {};
    const playersKeys = Object.keys(playersObj);

    const meRaw = playersObj[playerId] || {};
    const meScore = Number(meRaw.score) || 0;
    const meNickname = meRaw.nickname || playerId;
    const me = { id: playerId, score: meScore, nickname: meNickname };

    // pick one opponent for comparison (works for 2-player simple layout)
    const otherKey = playersKeys.find(k => k !== playerId);
    const otherRaw = otherKey ? playersObj[otherKey] : null;
    const other = otherRaw ? { id: otherKey, score: Number(otherRaw.score) || 0, nickname: otherRaw.nickname || otherKey } : null;

    finalScore.textContent = me.score;
    resultTitle.classList.remove('win', 'lose', 'tie');

    if (!other) {
      resultTitle.textContent = "Quiz Finished!";
      resultDetails.innerHTML = "<div>Waiting for other player...</div>";
      return;
    }

    if (me.score > other.score) {
      resultTitle.textContent = "🎉 You Won!";
      resultTitle.classList.add('win');
    } else if (me.score < other.score) {
      resultTitle.textContent = "😞 You Lost!";
      resultTitle.classList.add('lose');
    } else {
      resultTitle.textContent = "🤝 It's a Tie!";
      resultTitle.classList.add('tie');
    }

    resultDetails.innerHTML = `
      <div style="font-weight:700;">
        ${escapeHtml(me.nickname || me.id)}: ${me.score} points<br>
        ${escapeHtml(other.nickname || other.id)}: ${other.score} points
      </div>
    `;
  }).catch(err => {
    console.error('Error fetching players for results:', err);
    resultTitle.textContent = "Quiz Finished!";
    resultDetails.innerHTML = "Could not load final results.";
    finalScore.textContent = score; // fallback
  });

  statusMsg.style.display = 'block';
  statusMsg.textContent = "Thanks for playing!";
}

/* ===== Reset game (host resets room & all player scores) ===== */
async function resetGame() {
  // reset our local
  await update(child(roomRef, `players/${playerId}`), { score: 0 });
  if (isHost) {
    // reset every player's score to 0 and clear room settings
    const playersSnap = await get(child(roomRef, 'players'));
    if (playersSnap.exists()) {
      const playersObj = playersSnap.val();
      const updates = {};
      Object.keys(playersObj).forEach(pid => {
        updates[`players/${pid}/score`] = 0;
      });
      // perform multi-path update
      await update(roomRef, updates).catch(err => console.error('Error resetting players', err));
    }
    await set(child(roomRef, 'gameStarted'), false);
    await set(child(roomRef, 'quizEnded'), false);
    await set(child(roomRef, 'questions'), null);
    await set(child(roomRef, 'currentQuestion'), 0);
    await set(child(roomRef, 'chosenCount'), null);
    await set(child(roomRef, 'chosenCategory'), null);

    statusMsg.textContent = "You're host. Choose category.";
    showScene('scene-lobby');
  } else {
    statusMsg.textContent = "Waiting for host to choose category...";
    showScene('scene-lobby');
  }

  score = 0;
  scoreEl.textContent = '0';
  resultDetails.innerHTML = "";
}

/* ===== Players UI render ===== */
function renderPlayersList(playersObj) {
  playersList.innerHTML = '';
  const keys = Object.keys(playersObj || {});
  if (!keys.length) {
    playersList.innerHTML = `<li>No players yet</li>`;
    return;
  }
  keys.forEach(k => {
    const p = playersObj[k] || {};
    const li = document.createElement('li');
    li.innerHTML = `<span style="font-size:1.1rem;">${escapeHtml(p.avatar || '🧠')}</span>
                    <div style="flex:1;">
                      <div style="font-weight:700;">${escapeHtml(p.nickname || k)}</div>
                      <div style="font-size:0.9rem; opacity:0.9;">Score: ${Number(p.score || 0)}</div>
                    </div>`;
    playersList.appendChild(li);
  });
}

/* ===== Init flow ===== */
function initGame() {
  // handlers for nickname & avatar
  setNicknameAndAvatarHandlers();

  // If user already has nickname, register immediately
  const storedNickname = localStorage.getItem('nickname');
  if (!storedNickname) {
    // show name entry scene
    showScene('nameEntry');
    statusMsg.textContent = "Please enter your nickname to join the room.";
    // user will click Continue -> registerPlayerAndSetup called from saveNameBtn handler
    return;
  } else {
    // register and go
    registerPlayerAndSetup().catch(err => {
      console.error('initGame register error', err);
      statusMsg.textContent = 'Could not join room.';
    });
  }
}

/* start the app */
initGame();
