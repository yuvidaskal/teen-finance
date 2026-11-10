// ════════════════════════════════
// HOME SCREEN
// ════════════════════════════════

const tips = [
  'שלם לעצמך ראשון — בכל פעם שמגיע כסף, העבר 20% לחיסכון לפני כל הוצאה.',
  'ריבית דריבית היא הפלא השמיני של העולם — ₪5,000 בגיל 16 יכולים להפוך ל-₪21,000 בגיל 46!',
  'לפני קנייה של יותר מ-₪100 — המתן 24 שעות. 80% מהפעמים תגלה שלא באמת צריך.',
  'השווה מחירים לפני כל קנייה — 5 דקות חיפוש יכולות לחסוך לך עשרות שקלים.',
  'הגדר יעד חיסכון ספציפי — עדיף "חוסך ₪3,500 בתוך 8 חודשים" על "אני רוצה לחסוך".',
  'בדוק מדי חודש לאן הלך הכסף — רוב הצעירים מופתעים מכמה הולך על קפה ומנויים.'
];

let mainChart = null;

// ════════════════════════════════
// UPDATE HOME
// ════════════════════════════════
function updateHome() {
  updateHomeGreeting();

  const income = parseFloat(document.getElementById('income')?.value) || 0;
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = income - total;
  const pct = income > 0 ? Math.min((total / income) * 100, 100) : 0;

  // Hero balance
  const balanceEl = document.getElementById('homeBalance');
  if (balanceEl) {
    const rounded = Math.round(remaining);
    balanceEl.innerHTML = `₪${rounded.toLocaleString('he-IL')}<sup>00</sup>`;
  }

  // Hero sub
  const subEl = document.getElementById('homeBalanceSub');
  if (subEl) {
    subEl.textContent = income > 0
      ? `מתוך ${fmt(income)} הכנסה · הוצאת ${fmt(total)}`
      : 'הזן הכנסה כדי להתחיל';
  }

  // Progress
  const fillEl = document.getElementById('homeProgressFill');
  if (fillEl) fillEl.style.width = pct + '%';

  const pctEl = document.getElementById('homeUsedPct');
  if (pctEl) pctEl.textContent = `${Math.round(pct)}% מהתקציב נוצל`;

  // Days left
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();
  const daysLeftEl = document.getElementById('homeDaysLeft');
  if (daysLeftEl) daysLeftEl.textContent = `⚡ ${daysLeft} ימים נותרו`;

  // View subtitle
  const subTitleEl = document.getElementById('viewSubtitle');
  if (subTitleEl) {
    const elapsed = now.getDate();
    const avg = elapsed > 0 ? total / elapsed : 0;
    subTitleEl.textContent = `${fmt(total)} · ${elapsed} ימים · ממוצע ${fmt(avg)}/יום`;
  }

  // Daily tip
  const tipEl = document.getElementById('dailyTip');
  if (tipEl) tipEl.textContent = tips[Math.floor(Date.now() / 86400000) % tips.length];

  // Render views
  renderExpensesChart();
  renderHomeCalendar();
}

function updateHomeGreeting() {
  const nameEl = document.getElementById('hUserName');
  if (nameEl) nameEl.textContent = currentUser?.username || 'אורח';

  const avatarEl = document.getElementById('hAvatar');
  if (avatarEl && currentUser) {
    const initial = (currentUser.username || 'א').charAt(0);
    avatarEl.textContent = initial;
  }

  const timeEl = document.getElementById('hTime');
  if (timeEl) {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const now = new Date();
    timeEl.textContent = `יום ${days[now.getDay()]}, ${months[now.getMonth()]}`;
  }
}

// ════════════════════════════════
// CHART
// ════════════════════════════════
function renderExpensesChart() {
  const canvas = document.getElementById('expensesChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dailyTotals = new Array(daysInMonth + 1).fill(0);
  for (const e of expenses) {
    if (!e.date) continue;
    const d = new Date(e.date + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      dailyTotals[d.getDate()] += e.amount;
    }
  }

  const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
  const cumulative = [];
  let sum = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    if (i <= today) { sum += dailyTotals[i]; cumulative.push(sum); }
    else cumulative.push(null);
  }

  const avgDaily = today > 0 ? sum / today : 0;
  const forecast = new Array(daysInMonth).fill(null);
  for (let i = 0; i < daysInMonth; i++) {
    const dn = i + 1;
    if (dn === today) forecast[i] = sum;
    else if (dn > today) forecast[i] = sum + avgDaily * (dn - today) * .85;
  }

  const ctx = canvas.getContext('2d');
  if (mainChart) { mainChart.destroy(); mainChart = null; }

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(20,184,166,.2)');
  gradient.addColorStop(1, 'rgba(20,184,166,.02)');

  mainChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'בפועל', data: cumulative, borderColor: '#14b8a6',
          backgroundColor: gradient, fill: true, tension: .35,
          pointRadius: 0, pointHoverRadius: 5,
          pointHoverBackgroundColor: '#14b8a6', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 3,
          borderWidth: 3
        },
        {
          label: 'תחזית', data: forecast, borderColor: 'rgba(148,163,184,.7)',
          borderDash: [6, 6], fill: false, tension: .35, pointRadius: 0, borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          rtl: true, textDirection: 'rtl',
          backgroundColor: 'rgba(15,23,42,.9)', padding: 10, cornerRadius: 10,
          titleFont: { family: 'Heebo', size: 12, weight: '700' },
          bodyFont: { family: 'Heebo', size: 12 },
          callbacks: { label: c => `${c.dataset.label}: ₪${Math.round(c.parsed.y).toLocaleString('he-IL')}` }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => '₪' + v, font: { size: 10, family: 'Heebo' }, color: '#94a3b8' },
          grid: { color: 'rgba(148,163,184,.08)' }, border: { display: false }
        },
        x: {
          ticks: { font: { size: 10, family: 'Heebo' }, color: '#94a3b8', autoSkip: true, maxTicksLimit: 8 },
          grid: { display: false }, border: { display: false }
        }
      }
    }
  });
}

// ════════════════════════════════
// CALENDAR
// ════════════════════════════════
function renderHomeCalendar() {
  const container = document.getElementById('homeCalendar');
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const dailyTotals = {};
  for (const e of expenses) {
    if (!e.date) continue;
    const d = new Date(e.date + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      dailyTotals[day] = (dailyTotals[day] || 0) + e.amount;
    }
  }

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    let cls = 'cal-cell';
    if (d === today) cls += ' today';

    const amt = dailyTotals[d] || 0;
    if (amt >= 200) cls += ' lvl-4';
    else if (amt >= 100) cls += ' lvl-3';
    else if (amt >= 50) cls += ' lvl-2';
    else if (amt > 0) cls += ' lvl-1';

    const dot = amt > 0 ? '<div class="dot"></div>' : '';
    const onclick = amt > 0 ? `onclick="showDayDetails(${d})"` : '';
    html += `<div class="${cls}" ${onclick}>${d}${dot}</div>`;
  }
  container.innerHTML = html;
}

function switchHomeView(view) {
  const chartBtn = document.getElementById('segChart');
  const calBtn = document.getElementById('segCal');
  const chartPane = document.getElementById('paneChart');
  const calPane = document.getElementById('paneCalendar');

  if (chartBtn) chartBtn.classList.toggle('active', view === 'chart');
  if (calBtn) calBtn.classList.toggle('active', view === 'calendar');
  if (chartPane) chartPane.classList.toggle('active', view === 'chart');
  if (calPane) calPane.classList.toggle('active', view === 'calendar');

  if (view === 'chart' && mainChart) {
    setTimeout(() => { try { mainChart.resize(); } catch(e) {} }, 50);
  }
}

function showDayDetails(day) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const dayExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  if (dayExpenses.length === 0) return;

  const total = dayExpenses.reduce((s, e) => s + e.amount, 0);
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const itemsHtml = dayExpenses.map(e => {
    const cat = budgetCategories.find(c => c.id === e.catId);
    const catTag = cat ? `<div style="margin-top:2px;font-size:.62rem;color:${cat.color};font-weight:700">${cat.icon} ${cat.name}</div>` : '';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.55rem 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:.6rem">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--teal-soft);display:flex;align-items:center;justify-content:center;font-size:1.05rem">${e.icon}</div>
        <div>
          <div style="font-weight:700;font-size:.85rem">${e.name}</div>
          ${catTag}
        </div>
      </div>
      <span style="font-weight:800;color:var(--teal-2);font-size:.9rem">${fmt(e.amount)}</span>
    </div>`;
  }).join('');

  openSheetContent(`
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div>
        <div class="sheet-title">📅 ${day} ב${months[month]}</div>
        <div style="font-size:.72rem;color:var(--text-3);margin-top:.2rem;font-weight:600">סה״כ ${fmt(total)} · ${dayExpenses.length} פריטים</div>
      </div>
      <button class="sheet-close" onclick="closeQuickSheet()">✕</button>
    </div>
    <div>${itemsHtml}</div>
    <button class="sheet-btn sheet-btn-secondary" onclick="closeQuickSheet()" style="margin-top:1rem">סגור</button>
  `);
}

// ════════════════════════════════
// QUICK ACTION SHEETS
// ════════════════════════════════
function openQuickSheet(type) {
  const today = new Date().toISOString().split('T')[0];

  if (type === 'expense') {
    const catOptions = budgetCategories.map(c =>
      `<option value="${c.id}">${c.icon} ${c.name}</option>`
    ).join('');

    openSheetContent(`
      <div class="sheet-handle"></div>
      <div class="sheet-head"><div class="sheet-title">➕ הוצאה חדשה</div><button class="sheet-close" onclick="closeQuickSheet()">✕</button></div>
      <div class="field"><label class="field-label">שם ההוצאה</label><input class="field-input" type="text" id="sheetExpName" placeholder="לדוגמה: פיצה"></div>
      <div class="field-row">
        <div class="field"><label class="field-label">סכום (₪)</label><input class="field-input" type="number" id="sheetExpAmount" placeholder="0"></div>
        <div class="field"><label class="field-label">תאריך</label><input class="field-input" type="date" id="sheetExpDate" value="${today}"></div>
      </div>
      <div class="field"><label class="field-label">תקציב</label><select class="field-input" id="sheetExpCategory"><option value="">— ללא תקציב —</option>${catOptions}</select></div>
      <button class="sheet-btn sheet-btn-primary" onclick="submitSheetExpense()"><span>✓</span><span>הוסף הוצאה</span></button>
      <button class="sheet-btn sheet-btn-secondary" onclick="closeQuickSheet()">ביטול</button>
    `);
  } else if (type === 'income') {
    const currentIncome = document.getElementById('income')?.value || '1200';
    openSheetContent(`
      <div class="sheet-handle"></div>
      <div class="sheet-head"><div class="sheet-title">💰 עדכון הכנסה</div><button class="sheet-close" onclick="closeQuickSheet()">✕</button></div>
      <div class="field"><label class="field-label">הכנסה חודשית (₪)</label><input class="field-input" type="number" id="sheetIncome" value="${currentIncome}"></div>
      <div style="background:linear-gradient(135deg,#fef9ee,#fef3c7);border-radius:var(--radius-sm);padding:.9rem;margin-bottom:.5rem;border-right:3px solid var(--amber)">
        <div style="font-size:.72rem;color:#b45309;font-weight:800;margin-bottom:.2rem">💡 טיפ</div>
        <div style="font-size:.75rem;color:var(--text-2);line-height:1.5">העבר 20% מההכנסה לחיסכון ברגע שהיא מגיעה.</div>
      </div>
      <button class="sheet-btn sheet-btn-primary" onclick="submitSheetIncome()"><span>✓</span><span>עדכן הכנסה</span></button>
      <button class="sheet-btn sheet-btn-secondary" onclick="closeQuickSheet()">ביטול</button>
    `);
  } else if (type === 'goal') {
    openSheetContent(`
      <div class="sheet-handle"></div>
      <div class="sheet-head"><div class="sheet-title">🎯 יעד חיסכון חדש</div><button class="sheet-close" onclick="closeQuickSheet()">✕</button></div>
      <div class="field"><label class="field-label">שם היעד</label><input class="field-input" type="text" id="sheetGoalName" placeholder="לדוגמה: אייפון חדש"></div>
      <div class="field-row">
        <div class="field"><label class="field-label">סכום התחלתי (₪)</label><input class="field-input" type="number" id="sheetGoalPrincipal" value="0" min="0"></div>
        <div class="field"><label class="field-label">הפקדה חודשית (₪)</label><input class="field-input" type="number" id="sheetGoalMonthly" value="200" min="0"></div>
      </div>
      <div class="field-row">
        <div class="field"><label class="field-label">ריבית שנתית (%)</label><input class="field-input" type="number" id="sheetGoalRate" value="4" min="0.1" max="15" step="0.1"></div>
        <div class="field"><label class="field-label">תקופה (שנים)</label><input class="field-input" type="number" id="sheetGoalYears" value="3" min="1" max="30"></div>
      </div>
      <button class="sheet-btn sheet-btn-primary" onclick="submitSheetGoal()"><span>🎯</span><span>צור יעד</span></button>
      <button class="sheet-btn sheet-btn-secondary" onclick="closeQuickSheet()">ביטול</button>
    `);
  } else if (type === 'budget') {
    const budgetsHtml = budgetCategories.length > 0
      ? budgetCategories.map(c => {
          const spent = expenses.filter(e => e.catId === c.id).reduce((s, e) => s + e.amount, 0);
          const pct = c.amount > 0 ? Math.min((spent / c.amount) * 100, 100) : 0;
          const over = spent > c.amount;
          return `<div style="background:var(--bg-2);border-radius:var(--radius-sm);padding:.85rem">
            <div style="display:flex;justify-content:space-between;margin-bottom:.4rem">
              <span style="font-weight:800;font-size:.82rem">${c.icon} ${c.name}</span>
              <span style="font-weight:800;font-size:.8rem;color:${over ? 'var(--coral)' : 'var(--teal-2)'}">${fmt(spent)} / ${fmt(c.amount)}</span>
            </div>
            <div style="height:6px;background:var(--teal-soft);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${over ? 'var(--coral)' : c.color};border-radius:99px"></div>
            </div>
          </div>`;
        }).join('')
      : '<div style="text-align:center;color:var(--text-3);padding:1rem;font-size:.85rem">עדיין אין תקציבים מוגדרים</div>';

    openSheetContent(`
      <div class="sheet-handle"></div>
      <div class="sheet-head"><div class="sheet-title">📊 התקציב שלי</div><button class="sheet-close" onclick="closeQuickSheet()">✕</button></div>
      <div style="display:flex;flex-direction:column;gap:.75rem">${budgetsHtml}</div>
      <button class="sheet-btn sheet-btn-secondary" onclick="closeQuickSheet();switchTab('budget')" style="margin-top:1rem">ערוך תקציבים</button>
    `);
  }
}

function openSheetContent(html) {
  document.getElementById('quickSheetContent').innerHTML = html;
  document.getElementById('quickSheetOverlay').classList.add('open');
}

function closeQuickSheet(e) {
  if (!e || e.target.id === 'quickSheetOverlay' || !e.target) {
    document.getElementById('quickSheetOverlay').classList.remove('open');
  }
}

// ════════════════════════════════
// SHEET SUBMIT HANDLERS
// ════════════════════════════════
function submitSheetExpense() {
  const name = document.getElementById('sheetExpName').value.trim();
  const amount = parseFloat(document.getElementById('sheetExpAmount').value);
  const catId = document.getElementById('sheetExpCategory').value;
  const dateStr = document.getElementById('sheetExpDate').value || new Date().toISOString().split('T')[0];

  if (!name || !amount || amount <= 0) { alert('נא למלא שם וסכום תקין'); return; }

  const exp = {
    id: newId(),
    icon: selectedEmoji || '🍕',
    name,
    amount,
    catId: catId ? parseInt(catId) : null,
    date: dateStr
  };
  expenses.push(exp);
  saveLocal();
  safeWrite({
    type: 'expense', entityId: exp.id,
    method: 'POST', path: 'expenses',
    body: {
      id: exp.id, icon: exp.icon, name: exp.name, amount: exp.amount,
      cat_id: exp.catId, user_db_id: currentUser?.id,
      created_at: dateToCreatedAt(exp.date)
    }
  });
  renderAll();
  updateHome();
  closeQuickSheet();
}

function submitSheetIncome() {
  const val = parseFloat(document.getElementById('sheetIncome').value) || 0;
  if (val <= 0) { alert('נא להזין סכום תקין'); return; }
  const incomeEl = document.getElementById('income');
  if (incomeEl) incomeEl.value = val;
  saveSettings();
  updateHome();
  closeQuickSheet();
}

function submitSheetGoal() {
  const name = document.getElementById('sheetGoalName').value.trim();
  const principal = parseFloat(document.getElementById('sheetGoalPrincipal').value) || 0;
  const monthly = parseFloat(document.getElementById('sheetGoalMonthly').value) || 0;
  const rate = parseFloat(document.getElementById('sheetGoalRate').value) || 4;
  const years = parseInt(document.getElementById('sheetGoalYears').value) || 3;

  if (!name) { alert('נא להזין שם יעד'); return; }
  if (rate <= 0) { alert('נא להזין ריבית חיובית'); return; }

  const saving = { id: newId(), name, principal, monthly, rate, years };
  savings.push(saving);
  saveSavingsLocal();
  saveSavingsToDB(saving);
  renderSavingsList();
  updateHome();
  closeQuickSheet();
}