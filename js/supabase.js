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

// ── SYNC STATE ──
let isSyncing = false;
let pendingWrites = [];   // [{ type, entityId, method, path, body, headers }]

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
  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ Supabase error [${path}]:`, errText);
    throw new Error(errText);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

// ════════════════════════════════
// PENDING QUEUE (offline-friendly)
// ════════════════════════════════
function pendingKey() { return currentUser ? `kc_${currentUser.id}_pending` : null; }

function loadPending() {
  if (!currentUser) { pendingWrites = []; return; }
  try {
    const raw = localStorage.getItem(pendingKey());
    pendingWrites = raw ? JSON.parse(raw) : [];
  } catch(e) { pendingWrites = []; }
  updateSyncBadge();
}

function savePending() {
  const k = pendingKey();
  if (!k) return;
  try { localStorage.setItem(k, JSON.stringify(pendingWrites)); } catch(e) {}
}

function addPending(op) {
  // Same entity+type => last write wins
  pendingWrites = pendingWrites.filter(p => !(p.type === op.type && p.entityId === op.entityId));
  pendingWrites.push(op);
  savePending();
  updateSyncBadge();
}

function removePending(type, entityId) {
  const before = pendingWrites.length;
  pendingWrites = pendingWrites.filter(p => !(p.type === type && p.entityId === entityId));
  if (pendingWrites.length !== before) { savePending(); updateSyncBadge(); }
}

function hasPending(type, entityId) {
  return pendingWrites.some(p => p.type === type && p.entityId === entityId);
}

function updateSyncBadge() {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  if (pendingWrites.length > 0) {
    el.textContent = `⏳ ${pendingWrites.length} שינויים ממתינים לסנכרון...`;
    el.style.opacity = '1';
  }
}

// ── Safe write: try DB, queue on failure ──
async function safeWrite(op) {
  try {
    await sbFetch(op.path, {
      method: op.method,
      headers: { 'Prefer': 'return=minimal', 'Content-Type': 'application/json', ...(op.headers || {}) },
      body: op.body !== undefined ? JSON.stringify(op.body) : undefined
    });
    removePending(op.type, op.entityId);
    return true;
  } catch (e) {
    console.warn('⚠️ Write failed, queued for retry:', op.type, op.entityId, e.message);
    addPending(op);
    return false;
  }
}

async function flushPending() {
  if (!pendingWrites.length) return;
  const queue = [...pendingWrites];
  let ok = 0, fail = 0;
  for (const op of queue) {
    try {
      await sbFetch(op.path, {
        method: op.method,
        headers: { 'Prefer': 'return=minimal', 'Content-Type': 'application/json', ...(op.headers || {}) },
        body: op.body !== undefined ? JSON.stringify(op.body) : undefined
      });
      removePending(op.type, op.entityId);
      ok++;
    } catch (e) { fail++; }
  }
  if (ok > 0) console.log(`✅ Flushed ${ok} pending writes (${fail} failed)`);
}

// ── Generate unique ID ──
function newId() {
  return Date.now() + Math.floor(Math.random() * 1000);
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
  const income = document.getElementById('income');
  const principal = document.getElementById('principal');
  const monthly = document.getElementById('monthly');
  const rate = document.getElementById('rate');
  const years = document.getElementById('years');
  if (income && s.income) income.value = s.income;
  if (principal && s.principal) principal.value = s.principal;
  if (monthly && s.monthly) monthly.value = s.monthly;
  if (rate && s.rate) { rate.value = s.rate; updateRate(); }
  if (years && s.years) { years.value = s.years; updateYears(); }
}

// ════════════════════════════════
// MERGE HELPERS
// Local changes (pending) win over DB rows.
// ════════════════════════════════
function mergeExpenses(dbRows) {
  const byId = new Map();
  for (const e of expenses) byId.set(e.id, e);
  for (const r of dbRows) {
    if (hasPending('expense', r.id)) continue;
    if (hasPending('expense_delete', r.id)) continue;
    byId.set(r.id, { id: r.id, icon: r.icon, name: r.name, amount: r.amount, catId: r.cat_id });
  }
  for (const p of pendingWrites) if (p.type === 'expense_delete') byId.delete(p.entityId);
  return Array.from(byId.values()).sort((a,b) => a.id - b.id);
}

function mergeBudgetCategories(dbRows) {
  const byId = new Map();
  for (const c of budgetCategories) byId.set(c.id, c);
  for (const r of dbRows) {
    if (hasPending('budget', r.id)) continue;
    if (hasPending('budget_delete', r.id)) continue;
    byId.set(r.id, { id: r.id, icon: r.icon, name: r.name, amount: r.amount, color: r.color });
  }
  for (const p of pendingWrites) if (p.type === 'budget_delete') byId.delete(p.entityId);
  return Array.from(byId.values()).sort((a,b) => a.id - b.id);
}

// ════════════════════════════════
// SYNC FROM SUPABASE
// ════════════════════════════════
async function loadFromSupabase() {
  if (!currentUser) return;
  if (isSyncing) return;   // prevent overlapping runs
  isSyncing = true;
  showSync('מסנכרן... ☁️');
  try {
    await flushPending();   // retry queued writes first

    const uid = currentUser.id;
    const [expRows, catRows, settRows, prefRows] = await Promise.all([
      sbFetch(`expenses?user_db_id=eq.${uid}&order=created_at.asc`),
      sbFetch(`budget_categories?user_db_id=eq.${uid}&order=created_at.asc`),
      sbFetch(`settings?user_db_id=eq.${uid}`),
      sbFetch(`user_preferences?user_db_id=eq.${uid}`)
    ]);

    if (Array.isArray(expRows)) expenses = mergeExpenses(expRows);
    if (Array.isArray(catRows)) budgetCategories = mergeBudgetCategories(catRows);

    if (settRows && settRows.length > 0 && !hasPending('settings', 'main')) {
      applyInputValues(settRows[0]);
      if (settRows[0].watchlist) {
        try { watchlist = JSON.parse(settRows[0].watchlist || '[]'); } catch(e) { watchlist = []; }
      }
    }
    if (prefRows && prefRows.length > 0) {
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
    await loadSavingsFromDB();
    renderAll(); renderWatchlist(); updateHome();

    if (pendingWrites.length > 0) {
      showSync(`⏳ ${pendingWrites.length} שינויים ממתינים`, true);
    } else {
      showSync('מסונכרן ✅', true);
    }
  } catch(e) {
    console.error('❌ Sync error:', e);
    loadLocal(); renderAll(); updateHome();
    showSync('מצב לא מקוון 📴 — השינויים יסונכרנו בהמשך', true);
  } finally {
    isSyncing = false;
  }
}

// ── Debounced saveSettings (prevents 2 requests per keystroke) ──
let _saveSettingsTimer = null;
function saveSettings() {
  saveLocal();
  if (!currentUser) return;
  clearTimeout(_saveSettingsTimer);
  _saveSettingsTimer = setTimeout(_doSaveSettings, 600);
}

async function _doSaveSettings() {
  if (!currentUser) return;
  const payload = {
    user_db_id: currentUser.id,
    income: document.getElementById('income')?.value || '1200',
    principal: document.getElementById('principal')?.value || '5000',
    monthly: document.getElementById('monthly')?.value || '200',
    rate: document.getElementById('rate')?.value || '4',
    years: document.getElementById('years')?.value || '5',
    watchlist: JSON.stringify(watchlist)
  };
  try {
    // Upsert (requires UNIQUE on user_db_id in settings table)
    await sbFetch('settings', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload)
    });
    removePending('settings', 'main');
  } catch (e) {
    // Fallback: read-then-write
    try {
      const existing = await sbFetch(`settings?user_db_id=eq.${currentUser.id}`);
      if (existing && existing.length > 0) {
        await sbFetch(`settings?user_db_id=eq.${currentUser.id}`, {
          method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(payload)
        });
      } else {
        await sbFetch('settings', {
          method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(payload)
        });
      }
      removePending('settings', 'main');
    } catch (e2) {
      addPending({ type: 'settings', entityId: 'main', method: 'POST', path: 'settings', body: payload });
    }
  }
}

function showSync(msg, fade = false) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = msg; el.style.opacity = '1';
  if (fade) setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

// Periodic sync (skips if one is already running)
setInterval(() => {
  if (currentUser && !isSyncing) loadFromSupabase();
}, 30000);

// Retry when the browser comes back online
window.addEventListener('online', () => {
  if (currentUser) loadFromSupabase();
});

function fmt(n) { return '₪' + Math.round(n).toLocaleString('he-IL'); }
