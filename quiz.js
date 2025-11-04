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
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);

  if (cells.length < 11) {
    console.warn("⚠️ CSV 格式錯誤，欄位不足：", line);
    return {
      id: "⚠️ 格式錯誤",
      question: "⚠️ 題目讀取失敗",
      options: ["undefined", "undefined", "undefined", "undefined"],
      answer: 0,
      explanation: "",
      wrongExplanation: ""
    };
  }

  return {
    id: cells[0],
    question: cells[2],
    options: [cells[3], cells[4], cells[5], cells[6]],
    answer: parseInt(cells[7], 10) - 1,
    explanation: cells[8] || "",
    wrongExplanation: cells[9] || ""
  };
}

function formatExplanation(text) {
  return text
    .split(/(\r\n|\r|\n)/)
    .filter(line => !/^\r?$/.test(line))
    .map(line =>
      line.includes('?') || line.includes('✅')
        ? `<strong>${line.trim()}</strong>`
        : line.trim()
    )
    .join('<br>');
}

function renderQuestion() {
  const q = quiz[current];
  const container = document.getElementById('quiz-container');
  container.innerHTML = `
    <div class="source">📄 來源：${q.source}（題號：${q.id}）</div>
    <div class="question">第 ${current + 1} 題（共 ${quiz.length} 題）</div>
    <div class="question-text">${q.question}</div>
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
  let html = ans === q.answer
    ? `✔️ 答對了！`
    : `❌ 答錯了！`;

  html += `<br>正確答案：${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}`;

  if (q.wrongExplanation.trim()) {
    html += `<br><br>${formatExplanation(q.wrongExplanation)}`;
  }

  exp.style.display = 'block';
  exp.innerHTML = html;

  if (ans !== q.answer) {
    wrongAnswers.push({
      id: q.id,
      question: q.question,
      options: q.options,
      correct: q.answer,
      explanation: q.explanation,
      wrongExplanation: q.wrongExplanation,
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
        <div class="source">📄 來源：${w.source}（題號：${w.id}）</div>
        <div><strong>(${i + 1}) ${w.question}</strong></div>
        <div>正確答案：${String.fromCharCode(65 + w.correct)}. ${w.options[w.correct]}</div>
        ${w.explanation.trim() ? `<div class="explanation">${formatExplanation(w.explanation)}</div>` : ''}
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
