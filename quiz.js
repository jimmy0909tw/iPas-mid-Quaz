let quiz = [];
let current = 0;

async function startQuiz() {
  const questions = await loadCSV("L1_1.csv");
  quiz = pickRandom(questions, 5); // 測試用只抽 5 題
  current = 0;
  renderQuestion();
}

async function loadCSV(file) {
  try {
    const res = await fetch(file);
    const text = await res.text();
    const lines = text.trim().split('\n');
    const parsed = lines.slice(1).map(parseCSVLine);
    return parsed;
  } catch (e) {
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
    explanation: cells[8]
  };
}

function renderQuestion() {
  const q = quiz[current];
  const container = document.getElementById('quiz-container');
  container.innerHTML = `
    <div class="question">(${current + 1}/${quiz.length}) ${q.question}</div>
    <form id="options-form" class="options">
      ${q.options.map((opt, i) => `
        <label>
          <input type="radio" name="option" value="${i}" required>
          ${String.fromCharCode(65 + i)}. ${opt}
        </label>
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
  exp.style.display = 'block';
  exp.innerHTML = isCorrect
    ? "✔️ 答對了！<br>" + q.explanation
    : `❌ 答錯了！<br>正確答案：${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}<br>${q.explanation}`;

  const btn = document.createElement('button');
  btn.innerText = current < quiz.length - 1 ? '下一題' : '重新開始';
  btn.onclick = () => {
    if (current < quiz.length - 1) {
      current++;
      renderQuestion();
    } else {
      startQuiz();
    }
  };
  exp.parentElement.appendChild(btn);
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
