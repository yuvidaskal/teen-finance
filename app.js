// ════════════════════════════════
// TABS
// ════════════════════════════════
function switchTab(name) {
  const names = ['home', 'savings', 'budget', 'stocks', 'tips'];
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
  document.getElementById('homeSavings').textContent = document.getElementById('totalResult').textContent;
  document.getElementById('homeYears').textContent = document.getElementById('years').value;
  document.getElementById('dailyTip').textContent = tips[Math.floor(Date.now() / 86400000) % tips.length];
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/teen-finance/sw.js').catch(() => {});
  });
}
