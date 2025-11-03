let quiz = [];
let current = 0;
let allQuestions = [];
let wrongAnswers = [];

const fileMap = {
  L1: ["L1_1.csv", "L1_2.csv", "L1_3.csv", "L1_A1.csv", "L1_A2.csv", "L1_A3.csv"],
  L3: ["L3_1.csv", "L3_2.csv", "L3_3.csv", "L3_A1.csv", "L3_A2.csv", "L3_A3.csv"]
};

async function startQuiz() {
  const level = document.getElementById("level").value;
  const files = fileMap[level];
  allQuestions = await loadMultipleCSVs(files);
  quiz = pickRandom(allQuestions, 30);
  current = 0;
  wrongAnswers = [];
  document.getElementById("result-container").style.display = "none";
  document.getElementById("quiz-container").style.display = "block";
  renderQuestion();
}

async function loadMultipleCSVs(files) {
  const all = [];
  for (const file of files) {
    const questions = await loadCSV(file);
    all.push(...questions);
  }
  return all;
}

async function loadCSV(file) {
  try {
    const res = await fetch(file);
    const text = await res.text();
    const lines = text.trim().split('\n');
    return lines.slice(1).map((line, index) => {
      const q = parseCSVLine(line);
      q.source = file;
      q.sourceIndex = index + 2;
      return q;
    });
  } catch (e) {
    console.error("❌ 載入失敗：" + file, e);
    alert("❌ 無法載入題庫：" + file);
    return [];
  }
}

function parseCSVLine(line) {
  const cells = line.split(',');
  return {
    question: cells[2],
    options: [cells[3], cells[4], cells[5], cells[6]],
    answer: parseInt(cells[7], 10) - 1,
    explanation: cells[8]?.replace(/\\n/g, '\n') || ""
  };
}

function renderQuestion() {
  const q = quiz[current];
  const container = document.getElementById('quiz-container');
  container.innerHTML = `
    <div class="question">第 ${current + 1} 題（共 ${quiz.length} 題）</div>
    <div class="question-text">${q.question}</div>
    <div class="source">📄 來源：${q.source}（第 ${q.sourceIndex} 題）</div>
    <form id="options-form" class="options">
      ${q.options.map((opt, i) => `
        <div>
          <label>
            <input type="radio" name="option" value="${i}" required>
            ${String.fromCharCode(65 + i)}. ${opt}
          </label>
        </div>
      `).join('')}
      <div class="button-area">
        <button type="submit">提交答案</button>
      </div>
    </form>
    <div class="explanation" id="explanation" style="display:none;"></div>
  `;
  document.getElementById('options-form').onsubmit = function(e) {
    e.preventDefault();
    const ans = parseInt(e.target.option.value, 10);
    showAnswer(q, ans);
  };
}

function showAnswer(q, ans) {
  const exp = document.getElementById('explanation');
  const isCorrect = ans === q.answer;
  const allOptions = q.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('<br>');
  exp.style.display = 'block';
  exp.innerHTML = isCorrect
    ? `✔️ 答對了！<br><br>${allOptions}<br><br>${q.explanation}`
    : `❌ 答錯了！<br>正確答案：${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}<br><br>${allOptions}<br><br>${q.explanation}`;

  if (!isCorrect) {
    wrongAnswers.push({
      question: q.question,
      options: q.options,
      correct: q.answer,
      explanation: q.explanation,
      source: q.source,
      sourceIndex: q.sourceIndex
    });
  }

  const btn = document.createElement('button');
  btn.innerText = current < quiz.length - 1 ? '下一題' : '看成績';
  btn.onclick = () => {
    if (current < quiz.length - 1) {
      current++;
      renderQuestion();
    } else {
      showResult();
    }
  };
  exp.parentElement.appendChild(btn);
}

function showResult() {
  const container = document.getElementById('quiz-container');
  container.style.display = 'none';

  const result = document.getElementById('result-container');
  result.style.display = 'block';

  const score = quiz.length - wrongAnswers.length;
  result.innerHTML = `
    <div class="score">🎉 成績：${score} / ${quiz.length}</div>
    <h3>❌ 錯題記錄：</h3>
    ${wrongAnswers.length === 0 ? '<p>太棒了！你全都答對了！</p>' : wrongAnswers.map((w, i) => `
      <div class="wrong-list">
        <div><strong>(${i + 1}) ${w.question}</strong></div>
        <div>正確答案：${String.fromCharCode(65 + w.correct)}. ${w.options[w.correct]}</div>
        <div class="source">📄 來源：${w.source}（第 ${w.sourceIndex} 題）</div>
        <div class="explanation">${w.options.map((opt, j) => `${String.fromCharCode(65 + j)}. ${opt}`).join('<br>')}<br><br>${w.explanation}</div>
      </div>
    `).join('')}
    <div class="button-area">
      <button onclick="restartQuiz()">再挑戰一次</button>
    </div>
  `;
}

function restartQuiz() {
  wrongAnswers = [];
  document.getElementById('result-container').style.display = 'none';
  document.getElementById('quiz-container').style.display = 'block';
  startQuiz();
}

function pickRandom(arr, n) {
  const res = [];
  const used = new Set();
  while (res.length < n && res.length < arr.length) {
    const idx = Math.floor(Math.random() * arr.length);
    if (!used.has(idx)) {
      res.push(arr[idx]);
      used.add(idx);
    }
  }
  return res;
}
