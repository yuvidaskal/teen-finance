// ════════════════════════════════
// STATE & CONSTANTS
// ════════════════════════════════
const SUPABASE_URL = 'https://onxwmsptviungelbqsco.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vqBk62C4Jwop9jboO9Skyw_yibpz3ZV';
const CAT_COLORS = ['#3dbdb5','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6','#f97316','#6366f1'];

let currentUser = null;
let expenses = [];
let budgetCategories = [];
let watchlist = [];
let selectedEmoji = '🍕';
let selectedCatEmoji = '🍕';

// ════════════════════════════════
// SUPABASE HELPER
// ════════════════════════════════
async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...opts.headers
    }
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

// ════════════════════════════════
// LOCAL BACKUP
// ════════════════════════════════
function userKey(k) { return `kc_${currentUser?.id}_${k}`; }

function saveLocal() {
  if (!currentUser) return;
  try {
    localStorage.setItem(userKey('data'), JSON.stringify({
      expenses, budgetCategories, watchlist,
      income: document.getElementById('income')?.value,
      principal: document.getElementById('principal')?.value,
      monthly: document.getElementById('monthly')?.value,
      rate: document.getElementById('rate')?.value,
      years: document.getElementById('years')?.value
    }));
  } catch(e) {}
}

function loadLocal() {
  if (!currentUser) return;
  try {
    const s = JSON.parse(localStorage.getItem(userKey('data')));
    if (!s) return;
    if (s.expenses) expenses = s.expenses;
    if (s.budgetCategories) budgetCategories = s.budgetCategories;
    if (s.watchlist) watchlist = s.watchlist;
    applyInputValues(s);
  } catch(e) {}
}

function applyInputValues(s) {
  if (s.income) document.getElementById('income').value = s.income;
  if (s.principal) document.getElementById('principal').value = s.principal;
  if (s.monthly) document.getElementById('monthly').value = s.monthly;
  if (s.rate) { document.getElementById('rate').value = s.rate; updateRate(); }
  if (s.years) { document.getElementById('years').value = s.years; updateYears(); }
}

// ════════════════════════════════
// SYNC FROM SUPABASE
// ════════════════════════════════
async function loadFromSupabase() {
  if (!currentUser) return;
  showSync('מסנכרן... ☁️');
  try {
    const uid = currentUser.id;
    const [expRows, catRows, settRows, prefRows] = await Promise.all([
      sbFetch(`expenses?user_db_id=eq.${uid}&order=created_at.asc`),
      sbFetch(`budget_categories?user_db_id=eq.${uid}&order=created_at.asc`),
      sbFetch(`settings?user_db_id=eq.${uid}`),
      sbFetch(`user_preferences?user_db_id=eq.${uid}`)
    ]);

    // תמיד טען מ-Supabase — גם אם ריק
    expenses = expRows.map(r => ({ id: r.id, icon: r.icon, name: r.name, amount: r.amount, catId: r.cat_id }));
    budgetCategories = catRows.map(r => ({ id: r.id, icon: r.icon, name: r.name, amount: r.amount, color: r.color }));

    if (settRows.length > 0) {
      applyInputValues(settRows[0]);
      if (settRows[0].watchlist) {
        try { watchlist = JSON.parse(settRows[0].watchlist || '[]'); } catch(e) { watchlist = []; }
      }
    }
    if (prefRows.length > 0) {
      const p = prefRows[0];
      const nc = document.getElementById('showNavCards');
      const sc = document.getElementById('showSummaryCards');
      const st = document.getElementById('showTip');
      if (nc) nc.checked = p.show_nav_cards !== false;
      if (sc) sc.checked = p.show_summary_cards !== false;
      if (st) st.checked = p.show_tip !== false;
      applyHomePrefs({ showNavCards: p.show_nav_cards, showSummaryCards: p.show_summary_cards, showTip: p.show_tip });
    }

    saveLocal();
    // טען חסכונות בנפרד
    await loadSavingsFromDB();
    renderAll(); renderWatchlist(); updateHome();
    showSync('מסונכרן ✅', true);
  } catch(e) {
    console.error('Sync error:', e);
    showSync('מצב לא מקוון 📴', true);
  }
}

async function saveSettings() {
  saveLocal();
  if (!currentUser) return;
  try {
    await sbFetch('settings', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_db_id: currentUser.id,
        id: `user_${currentUser.id}`,
        user_id: `user_${currentUser.id}`,
        income: document.getElementById('income')?.value || '1200',
        principal: document.getElementById('principal')?.value || '5000',
        monthly: document.getElementById('monthly')?.value || '200',
        rate: document.getElementById('rate')?.value || '4',
        years: document.getElementById('years')?.value || '5',
        watchlist: JSON.stringify(watchlist)
      })
    });
  } catch(e) { console.error('saveSettings error:', e); }
}

function showSync(msg, fade = false) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = msg; el.style.opacity = '1';
  if (fade) setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

// סנכרון אוטומטי כל 30 שניות
setInterval(() => {
  if (currentUser) loadFromSupabase();
}, 30000);

function fmt(n) { return '₪' + Math.round(n).toLocaleString('he-IL'); }
