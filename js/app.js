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
// פונקציה לייצוא הנתונים
function exportToExcel(data, fileName) {
    if (!data || data.length === 0) {
        alert("אין נתונים לייצוא");
        return;
    }

    // הגדרת הכותרות (Headers)
    const headers = Object.keys(data[0]).join(",");
    
    // הפיכת הנתונים לשורות
    const rows = data.map(item => {
        return Object.values(item).map(value => `"${value}"`).join(",");
    });

    // הוספת BOM כדי שאקסל יזהה עברית כמו שצריך
    const csvContent = "\uFEFF" + headers + "\n" + rows.join("\n");

    // יצירת קובץ להורדה
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// חיבור הכפתור לפעולה
document.getElementById('export-btn').addEventListener('click', () => {
    // כאן עליך להעביר את המערך של התקציבים או ההוצאות שלך
    // לדוגמה, אם הנתונים שלך שמורים במשתנה בשם allExpenses:
    exportToExcel(allExpenses, "תקציב_והוצאות_נוער");
});
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
