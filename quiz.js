let quiz = [];
let current = 0;
let allQuestions = [];
let wrongAnswers = [];

const fileMap = {
  L1: ["L1_1.csv", "L1_2.csv", "L1_3.csv", "L1_A1.csv", "L1_A2.csv", "L1_A3.csv"],
  L3: ["L3_1.csv", "L3_2.csv", "L3_3.csv", "L3_A1.csv", "L3_A2.csv", "L3_A3.csv"]
};

// ====================================================================
// ✅ 優化 1: 增加載入檢查，並使用 Math.min 確保選題數量不超限
// ====================================================================
async function startQuiz() {
  const level = document.getElementById("level").value;
  const files = fileMap[level];
  allQuestions = await loadMultipleCSVs(files);
  
  // 檢查是否載入到任何題目
  if (allQuestions.length === 0) {
    document.getElementById("quiz-container").innerHTML = `<p class="error">❌ 載入失敗或題庫為空，請檢查 CSV 檔案路徑與內容。</p>`;
    document.getElementById("quiz-container").style.display = "block";
    document.getElementById("result-container").style.display = "none";
    return;
  }
  
  // 確保選取的題目數量不超過題庫總數
  const numQuestions = Math.min(allQuestions.length, 30);
  quiz = pickRandom(allQuestions, numQuestions);
  
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

// ====================================================================
// ✅ 修改 2: 適應 10 欄位，並將 cells[8] 和 cells[9] 合併為 explanation
// ====================================================================
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

  // 檢查欄位數量：現在預期至少 9 欄 (正確解說)
  if (cells.length < 9) {
    console.warn("⚠️ CSV 格式錯誤，欄位不足（預期至少 9 欄）：", line);
    return {
      id: "⚠️ 格式錯誤",
      question: "⚠️ 題目讀取失敗",
      options: ["undefined", "undefined", "undefined", "undefined"],
      answer: 0,
      explanation: "⚠️ 解說欄位缺失或格式錯誤"
    };
  }
  
  // 處理解說欄位 (cells[8] 和 cells[9])
  const correctExplanation = cells[8] ? cells[8].trim() : "";
  // 檢查第 10 欄是否存在 (錯誤答案解說)
  const wrongExplanation = cells[9] ? cells[9].trim() : ""; 
  
  let fullExplanation = correctExplanation;
  
  if (wrongExplanation) {
      // 合併解說：使用分隔線和標題
      fullExplanation += '\n\n---\n\n【錯誤答案說明】\n' + wrongExplanation;
  }

  return {
    id: cells[0],
    question: cells[2],
    options: [cells[3], cells[4], cells[5], cells[6]],
    // ✅ 優化 3: 使用 trim() 處理答案數字，提高相容性
    answer: parseInt(cells[7].trim(), 10) - 1, 
    explanation: fullExplanation // 使用合併後的解說
  };
}

// ====================================================================
// ✅ 修改 4: 強化 formatExplanation，處理合併解說中的分隔線和標題
// ====================================================================
function formatExplanation(text) {
  return text
    .split(/(\r\n|\r|\n)/)
    .filter(line => !/^\r?$/.test(line))
    .map(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '---') {
          return '<hr>'; // 轉換分隔線
      }
      
      // 包含關鍵字或標題的行加粗
      return trimmedLine.includes('?') || trimmedLine.includes('✅') || trimmedLine.includes('【錯誤答案說明】')
        ? `<strong>${trimmedLine}</strong>` 
        : trimmedLine;
    })
    .join('<br>'); // 使用 <br> 連接所有行
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
    // 答案值取用時也確保是數字
    const ans = parseInt(e.target.option.value, 10); 
    showAnswer(q, ans);
  };
}

// ====================================================================
// ✅ 優化 5: 答錯時顯示使用者所選的答案
// ====================================================================
function showAnswer(q, ans) {
  const exp = document.getElementById('explanation');
  const isCorrect = ans === q.answer;
  
  // 顯示使用者和正確答案的選項文字
  const userOptionText = `${String.fromCharCode(65 + ans)}. ${q.options[ans]}`;
  const correctOptionText = `${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}`;

  exp.style.display = 'block';
  exp.innerHTML = isCorrect
    ? `✔️ 答對了！<br><br>${formatExplanation(q.explanation)}`
    : `❌ 答錯了！
       <br>您選擇了：${userOptionText} 
       <br>正確答案：${correctOptionText}
       <br><br>${formatExplanation(q.explanation)}`;

  if (!isCorrect) {
    wrongAnswers.push({
      id: q.id,
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
        <div class="source">📄 來源：${w.source}（題號：${w.id}）</div>
        <div><strong>(${i + 1}) ${w.question}</strong></div>
        <div>正確答案：${String.fromCharCode(65 + w.correct)}. ${w.options[w.correct]}</div>
        <div class="explanation">${formatExplanation(w.explanation)}</div>
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

// ====================================================================
// ✅ 優化 6: 確保選取數量不會超過總數
// ====================================================================
function pickRandom(arr, n) {
  const count = Math.min(arr.length, n); 
  const res = [];
  const used = new Set();
  
  while (res.length < count) { 
    const idx = Math.floor(Math.random() * arr.length);
    if (!used.has(idx)) {
      res.push(arr[idx]);
      used.add(idx);
    }
  }
  return res;
}
