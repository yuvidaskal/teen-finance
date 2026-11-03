// ════════════════════════════════
// TIP TABS
// ════════════════════════════════
function switchTipTab(tab) {
  const isInvest = tab === 'invest';
  document.getElementById('tipSectionGeneral').style.display = isInvest ? 'none' : 'block';
  document.getElementById('tipSectionInvest').style.display = isInvest ? 'block' : 'none';
  document.getElementById('tipTabGeneral').className = isInvest ? 'btn btn-outline' : 'btn btn-primary';
  document.getElementById('tipTabInvest').className = isInvest ? 'btn btn-primary' : 'btn btn-outline';
  localStorage.setItem('kc_tipTab', tab);
}

// ════════════════════════════════
// TABS
// ════════════════════════════════
function switchTab(name) {
  const names = ['home', 'savings', 'budget', 'tips'];
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', names[i] === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  if (name === 'home') updateHome();
}

// ════════════════════════════════
// HOME
// ════════════════════════════════
const tips = [
  'שלם לעצמך ראשון — בכל פעם שמגיע כסף, העבר 20% לחיסכון לפני כל הוצאה.',
  'ריבית דריבית היא הפלא השמיני של העולם — ₪5,000 בגיל 16 יכולים להפוך ל-₪21,000 בגיל 46!',
  'לפני קנייה של יותר מ-₪100 — המתן 24 שעות. 80% מהפעמים תגלה שלא באמת צריך.',
  'השווה מחירים לפני כל קנייה — 5 דקות חיפוש יכולות לחסוך לך עשרות שקלים.',
  'הגדר יעד חיסכון ספציפי — עדיף "חוסך ₪3,500 בתוך 8 חודשים" על "אני רוצה לחסוך".',
  'בדוק מדי חודש לאן הלך הכסף — רוב הצעירים מופתעים מכמה הולך על קפה ומנויים.'
];

function updateHome() {
  const income = parseFloat(document.getElementById('income').value) || 0;
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  document.getElementById('homeRemainder').textContent = income > 0 ? fmt(income - total) : '—';

  const homeYearsEl = document.getElementById('homeYears');
  if (savings.length > 0) {
    const grandTotal = savings.reduce((sum, s) => {
      return sum + calcOneSaving(s.principal, s.monthly, s.rate, s.years).total;
    }, 0);
    document.getElementById('homeSavings').textContent = fmt(grandTotal);
    if (homeYearsEl) homeYearsEl.textContent = Math.max(...savings.map(s => s.years));
  } else {
    document.getElementById('homeSavings').textContent = '—';
    if (homeYearsEl) homeYearsEl.textContent = '—';
  }

  document.getElementById('dailyTip').textContent = tips[Math.floor(Date.now() / 86400000) % tips.length];
  renderExpensesChart();
}

// ════════════════════════════════
// HOME CHART — Cumulative monthly expenses
// ════════════════════════════════
let expensesChart = null;

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
    const dayNum = i + 1;
    if (dayNum === today) forecast[i] = sum;
    else if (dayNum > today) forecast[i] = sum + avgDaily * (dayNum - today) * 0.85;
  }

  if (expensesChart) { expensesChart.destroy(); expensesChart = null; }

  expensesChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'בפועל',
          data: cumulative,
          borderColor: '#3dbdb5',
          backgroundColor: 'rgba(61,189,181,0.12)',
          fill: true, tension: 0.3,
          pointRadius: 3, pointBackgroundColor: '#3dbdb5',
          borderWidth: 2.5,
        },
        {
          label: 'תחזית',
          data: forecast,
          borderColor: '#9ab5ba',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          fill: false, tension: 0.3,
          pointRadius: 0, borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          rtl: true, textDirection: 'rtl',
          callbacks: { label: (c) => `${c.dataset.label}: ₪${Math.round(c.parsed.y).toLocaleString('he-IL')}` }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => '₪' + v.toLocaleString('he-IL'), font: { size: 10 } },
          grid: { color: 'rgba(61,189,181,0.08)' }
        },
        x: {
          title: { display: true, text: 'יום בחודש', font: { size: 10 } },
          ticks: { font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 },
          grid: { display: false }
        }
      }
    }
  });
}

// ════════════════════════════════
// INIT
// ════════════════════════════════
const savedSession = localStorage.getItem('kc_session');
if (savedSession) {
  try {
    currentUser = JSON.parse(savedSession);
    enterApp();
  } catch(e) {
    localStorage.removeItem('kc_session');
  }
}

// Service worker disabled — file sw.js doesn't exist in this repo.
// Offline sync is handled by pendingWrites queue in supabase.js.

// Stub — watchlist UI not present in this version.
function renderWatchlist() { /* no-op */ }
