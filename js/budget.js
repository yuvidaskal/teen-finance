// ════════════════════════════════
// RECOMMENDED SPLIT (50/30/20)
// ════════════════════════════════
const SPLIT_RULES = [
  { name: 'הכרחי', icon: '🛒', pct: 50, color: '#3dbdb5', desc: 'אוכל, תחבורה, הוצאות חיוניות' },
  { name: 'פנאי ובידור', icon: '🎮', pct: 30, color: '#f59e0b', desc: 'בילויים, קניות, חברים' },
  { name: 'חיסכון', icon: '🏦', pct: 20, color: '#10b981', desc: 'חיסכון והשקעה לעתיד' },
];

function renderSplitPreview() {
  const income = parseFloat(document.getElementById('income').value) || 0;
  const wrap = document.getElementById('splitPreview');
  if (!wrap) return;
  if (income <= 0) { wrap.innerHTML = '<div style="font-size:.78rem;color:var(--muted);text-align:center;padding:.5rem 0;">הזן הכנסה כדי לראות המלצה</div>'; return; }
  wrap.innerHTML = SPLIT_RULES.map(r => {
    const amount = Math.round(income * r.pct / 100);
    return `<div style="display:flex;align-items:center;gap:.6rem;padding:.4rem 0;">
      <span style="font-size:1.1rem;">${r.icon}</span>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;margin-bottom:.18rem;">
          <span style="font-size:.8rem;font-weight:700;">${r.name} <span style="color:var(--muted);font-weight:400;">(${r.pct}%)</span></span>
          <span style="font-size:.8rem;font-weight:800;color:${r.color};">${fmt(amount)}</span>
        </div>
        <div style="height:5px;background:var(--bg2);border-radius:99px;overflow:hidden;">
          <div style="height:5px;width:${r.pct}%;background:${r.color};border-radius:99px;"></div>
        </div>
        <div style="font-size:.65rem;color:var(--muted);margin-top:.1rem;">${r.desc}</div>
      </div>
    </div>`;
  }).join('');
}

async function applyRecommendedSplit() {
  const income = parseFloat(document.getElementById('income').value) || 0;
  if (income <= 0) { alert('הזן הכנסה תחילה'); return; }
  if (budgetCategories.length > 0) {
    if (!confirm('פעולה זו תחליף את התקציבים הקיימים. להמשיך?')) return;
    for (const cat of budgetCategories) {
      await sbFetch(`budget_categories?id=eq.${cat.id}&user_db_id=eq.${currentUser?.id}`, { method: 'DELETE' }).catch(() => {});
    }
    budgetCategories = [];
    expenses.forEach(e => { e.catId = null; });
  }
  for (const r of SPLIT_RULES) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const cat = { id, icon: r.icon, name: r.name, amount: Math.round(income * r.pct / 100), color: r.color };
    budgetCategories.push(cat);
    await sbFetch('budget_categories', { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify({ id: cat.id, icon: cat.icon, name: cat.name, amount: cat.amount, color: cat.color, user_db_id: currentUser?.id, user_id: `user_${currentUser?.id}` }) }).catch(() => {});
  }
  saveLocal();
  renderAll();
}

// ════════════════════════════════
// EDIT BUDGET CATEGORY
// ════════════════════════════════
function openEditCat(id) {
  const cat = budgetCategories.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('editCatId').value = id;
  document.getElementById('editCatName').value = cat.name;
  document.getElementById('editCatAmount').value = cat.amount;
  document.getElementById('editCatOverlay').style.display = 'flex';
}

function closeEditCat(e) {
  if (!e || e.target === document.getElementById('editCatOverlay')) {
    document.getElementById('editCatOverlay').style.display = 'none';
  }
}

async function saveEditCat() {
  const id = parseInt(document.getElementById('editCatId').value);
  const name = document.getElementById('editCatName').value.trim();
  const amount = parseFloat(document.getElementById('editCatAmount').value);
  if (!name || !amount || amount <= 0) { alert('נא למלא שם וסכום תקין'); return; }
  const income = parseFloat(document.getElementById('income').value) || 0;
  const usedExcludingThis = budgetCategories.filter(c => c.id !== id).reduce((s, c) => s + c.amount, 0);
  if (usedExcludingThis + amount > income) { alert('הסכום עולה על ההכנסה!'); return; }
  const cat = budgetCategories.find(c => c.id === id);
  if (!cat) return;
  cat.name = name; cat.amount = amount;
  saveLocal();
  try {
    await sbFetch(`budget_categories?id=eq.${id}&user_db_id=eq.${currentUser?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ name, amount })
    });
  } catch(e) {}
  closeEditCat();
  renderAll();
}

// ════════════════════════════════
// EXPORT TO EXCEL
// ════════════════════════════════
function exportToExcel() {
  if (expenses.length === 0 && budgetCategories.length === 0) {
    const syncEl = document.getElementById('syncStatus');
    if (syncEl && syncEl.textContent.includes('מסנכרן')) {
      alert('הנתונים עדיין נטענים — המתן לסיום הסנכרון ונסה שוב');
    } else {
      alert('אין נתונים לייצוא — הוסף הוצאות או תקציבים תחילה');
    }
    return;
  }
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: הוצאות ──
  const expHeaders = [['אייקון', 'שם הוצאה', 'תקציב', 'סכום (₪)']];
  const expRows = expenses.map(e => {
    const cat = budgetCategories.find(c => c.id === e.catId);
    return [e.icon, e.name, cat ? `${cat.icon} ${cat.name}` : 'ללא תקציב', e.amount];
  });
  expRows.push(['', '', 'סה״כ הוצאות', totalExp]);
  expRows.push(['', '', 'הכנסה', income]);
  expRows.push(['', '', 'נותר', income - totalExp]);

  const wsExp = XLSX.utils.aoa_to_sheet([...expHeaders, ...expRows]);

  // עיצוב עמודות
  wsExp['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsExp, 'הוצאות');

  // ── Sheet 2: תקציבים ──
  const catHeaders = [['אייקון', 'שם תקציב', 'תקציב (₪)', 'הוצאות (₪)', 'נותר (₪)', 'ניצול %']];
  const catRows = budgetCategories.map(c => {
    const spent = expenses.filter(e => e.catId === c.id).reduce((s, e) => s + e.amount, 0);
    const rem = c.amount - spent;
    const pct = c.amount > 0 ? Math.round((spent / c.amount) * 100) : 0;
    return [c.icon, c.name, c.amount, spent, rem, `${pct}%`];
  });

  // חוצאות ללא תקציב
  const uncat = expenses.filter(e => !e.catId).reduce((s, e) => s + e.amount, 0);
  if (uncat > 0) catRows.push(['—', 'ללא תקציב', '—', uncat, '—', '—']);

  const wsCat = XLSX.utils.aoa_to_sheet([...catHeaders, ...catRows]);
  wsCat['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'תקציבים');

  // ── ייצוא ──
  const date = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
  XLSX.writeFile(wb, `כסף_חכם_${date}.xlsx`);
}

function selectEmoji(btn) {
  document.querySelectorAll('#emojiPicker .emoji-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedEmoji = btn.dataset.emoji;
}
function selectCatEmoji(btn) {
  document.querySelectorAll('#catEmojiPicker .emoji-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedCatEmoji = btn.dataset.emoji;
}

function addBudgetCategory() {
  const name = document.getElementById('catName').value.trim();
  const amount = parseFloat(document.getElementById('catAmount').value);
  if (!name || !amount || amount <= 0) return;
  const income = parseFloat(document.getElementById('income').value) || 0;
  const used = budgetCategories.reduce((s, c) => s + c.amount, 0);
  if (used + amount > income) { alert('סכום התקציב עולה על ההכנסה!'); return; }
  const cat = { id: Date.now(), icon: selectedCatEmoji, name, amount, color: CAT_COLORS[budgetCategories.length % CAT_COLORS.length] };
  budgetCategories.push(cat);
  document.getElementById('catName').value = '';
  document.getElementById('catAmount').value = '';
  saveLocal();
  sbFetch('budget_categories', { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify({ id: cat.id, icon: cat.icon, name: cat.name, amount: cat.amount, color: cat.color, user_db_id: currentUser?.id, user_id: `user_${currentUser?.id}` }) }).catch(() => {});
  renderAll();
}

function removeBudgetCategory(id) {
  budgetCategories = budgetCategories.filter(c => c.id !== id);
  expenses.forEach(e => { if (e.catId === id) e.catId = null; });
  saveLocal();
  sbFetch(`budget_categories?id=eq.${id}&user_db_id=eq.${currentUser?.id}`, { method: 'DELETE' }).catch(() => {});
  renderAll();
}

function addExpense() {
  const name = document.getElementById('expName').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const catId = document.getElementById('expCategory').value;
  if (!name || !amount || amount <= 0) return;
  const exp = { id: Date.now(), icon: selectedEmoji, name, amount, catId: catId ? parseInt(catId) : null };
  expenses.push(exp);
  document.getElementById('expName').value = '';
  document.getElementById('expAmount').value = '';
  saveLocal();
  sbFetch('expenses', { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify({ id: exp.id, icon: exp.icon, name: exp.name, amount: exp.amount, cat_id: exp.catId, user_db_id: currentUser?.id, user_id: `user_${currentUser?.id}` }) }).catch(() => {});
  renderAll();
}

function removeExpense(i) {
  const exp = expenses[i];
  expenses.splice(i, 1);
  saveLocal();
  if (exp?.id) sbFetch(`expenses?id=eq.${exp.id}&user_db_id=eq.${currentUser?.id}`, { method: 'DELETE' }).catch(() => {});
  renderAll();
}

function updateBudget() { saveSettings(); renderAll(); }

function renderAll() {
  renderCategorySelector();
  renderBudgetCategories();
  renderBudgetOverviewCards();
  renderExpenses();
}

function renderCategorySelector() {
  const sel = document.getElementById('expCategory');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— ללא תקציב —</option>';
  budgetCategories.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = `${c.icon} ${c.name}`;
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

function renderBudgetCategories() {
  const income = parseFloat(document.getElementById('income').value) || 0;
  const used = budgetCategories.reduce((s, c) => s + c.amount, 0);
  const unalloc = income - used;
  const el = document.getElementById('unallocatedDisplay');
  el.textContent = fmt(unalloc);
  el.style.color = unalloc < 0 ? 'var(--danger)' : 'var(--teal-dark)';
  const wrap = document.getElementById('budgetCategoryList');
  if (!budgetCategories.length) {
    wrap.innerHTML = '<div style="text-align:center;color:var(--muted);padding:.6rem 0;font-size:.82rem;">עדיין אין תקציבים — הוסף את הראשון למטה 👇</div>';
    return;
  }
  wrap.innerHTML = budgetCategories.map(c => {
    const spent = expenses.filter(e => e.catId === c.id).reduce((s, e) => s + e.amount, 0);
    const pct = c.amount > 0 ? Math.min((spent / c.amount) * 100, 100) : 0;
    const rem = c.amount - spent; const over = rem < 0;
    return `<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem 0;border-bottom:1px solid var(--bg2);">
      <span style="font-size:1rem;">${c.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:.18rem;">
          <span style="font-weight:700;font-size:.82rem;">${c.name}</span>
          <span style="font-size:.72rem;font-weight:700;color:${over ? 'var(--danger)' : 'var(--text2)'};">${fmt(spent)} / ${fmt(c.amount)}</span>
        </div>
        <div style="height:5px;background:var(--teal-mid);border-radius:99px;overflow:hidden;">
          <div style="height:5px;border-radius:99px;width:${pct}%;background:${over ? 'var(--danger)' : c.color};transition:width .4s;"></div>
        </div>
      </div>
      <button class="exp-del" style="color:var(--teal);opacity:1;font-size:.8rem;margin-left:.2rem;" onclick="openEditCat(${c.id})" title="ערוך">✏️</button>
      <button class="exp-del" onclick="removeBudgetCategory(${c.id})">✕</button>
    </div>`;
  }).join('');
}

function renderBudgetOverviewCards() {
  const wrap = document.getElementById('budgetOverviewCards');
  if (!budgetCategories.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:.75rem;margin-bottom:1rem;">
    ${budgetCategories.map(c => {
      const spent = expenses.filter(e => e.catId === c.id).reduce((s, e) => s + e.amount, 0);
      const rem = c.amount - spent; const pct = c.amount > 0 ? Math.min((spent / c.amount) * 100, 100) : 0; const over = rem < 0;
      const catExps = expenses.filter(e => e.catId === c.id);
      return `<div style="background:var(--card);border:1.5px solid ${over ? 'rgba(224,112,112,.3)' : c.color + '30'};border-radius:var(--radius);padding:.9rem;position:relative;overflow:hidden;box-shadow:var(--shadow);">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${over ? 'var(--danger)' : c.color};"></div>
        <div style="display:flex;align-items:center;gap:.35rem;margin-bottom:.5rem;">
          <span style="font-size:1.1rem;">${c.icon}</span>
          <span style="font-weight:800;font-size:.8rem;color:var(--text);">${c.name}</span>
          ${over ? '<span style="margin-right:auto;font-size:.58rem;background:#fde8e8;color:#c0392b;border-radius:5px;padding:1px 4px;font-weight:700;">חרגת!</span>' : ''}
        </div>
        <div style="font-size:1.35rem;font-weight:900;color:${over ? 'var(--danger)' : c.color};">${fmt(Math.abs(rem))}</div>
        <div style="font-size:.68rem;color:var(--text2);margin-bottom:.5rem;">${over ? 'חרגת ב' : 'נותר מתוך'} ${fmt(c.amount)}</div>
        <div style="height:5px;background:var(--teal-mid);border-radius:99px;overflow:hidden;margin-bottom:.5rem;">
          <div style="height:5px;border-radius:99px;width:${pct}%;background:${over ? 'var(--danger)' : c.color};transition:width .4s;"></div>
        </div>
        ${!catExps.length ? '<div style="font-size:.68rem;color:var(--muted);text-align:center;">אין הוצאות עדיין</div>'
          : `<div style="font-size:.68rem;color:var(--text2);">${catExps.slice(-2).map(e => `<div style="display:flex;justify-content:space-between;"><span>${e.icon} ${e.name}</span><span style="font-weight:700;">${fmt(e.amount)}</span></div>`).join('')}${catExps.length > 2 ? `<div style="color:var(--teal);font-weight:700;margin-top:2px;">+${catExps.length - 2} עוד</div>` : ''}</div>`}
      </div>`;
    }).join('')}
  </div>`;
}

function renderExpenses() {
  const income = parseFloat(document.getElementById('income').value) || 0;
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const pct = income > 0 ? Math.min((total / income) * 100, 100) : 0;
  document.getElementById('totalExp').textContent = fmt(total);
  document.getElementById('remainderDisplay').textContent = fmt(income - total);
  document.getElementById('incomeDisplay').textContent = fmt(income);
  document.getElementById('budgetPct').textContent = Math.round(pct) + '%';
  const fill = document.getElementById('budgetBarFill');
  fill.style.width = pct + '%';
  fill.style.background = pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warn)' : 'var(--teal)';
  const list = document.getElementById('expenseList');
  list.innerHTML = '';
  expenses.forEach((e, i) => {
    const cat = budgetCategories.find(c => c.id === e.catId);
    const li = document.createElement('li');
    li.className = 'expense-item';
    li.innerHTML = `
      <div class="expense-cat">
        <span class="exp-icon">${e.icon}</span>
        <div>
          <div class="exp-name">${e.name}</div>
          ${cat ? `<div style="font-size:.62rem;color:${cat.color};font-weight:700;">${cat.icon} ${cat.name}</div>` : '<div style="font-size:.62rem;color:var(--muted);">ללא תקציב</div>'}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:.4rem;">
        <span class="exp-amount">${fmt(e.amount)}</span>
        <button class="exp-del" style="color:var(--teal);opacity:1;font-size:.8rem;" onclick="openEditExp(${i})" title="ערוך">✏️</button>
        <button class="exp-del" onclick="removeExpense(${i})">✕</button>
      </div>`;
    list.appendChild(li);
  });
}

// ════════════════════════════════
// EDIT EXPENSE
// ════════════════════════════════
function openEditExp(index) {
  const exp = expenses[index];
  if (!exp) return;
  document.getElementById('editExpIndex').value = index;
  document.getElementById('editExpName').value = exp.name;
  document.getElementById('editExpAmount').value = exp.amount;

  // מלא את רשימת התקציבים
  const sel = document.getElementById('editExpCategory');
  sel.innerHTML = '<option value="">— ללא תקציב —</option>';
  budgetCategories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.name}`;
    if (c.id === exp.catId) opt.selected = true;
    sel.appendChild(opt);
  });

  // סמן האייקון הנוכחי
  document.querySelectorAll('#editExpEmojiPicker .emoji-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.emoji === exp.icon);
  });
  selectedEditExpEmoji = exp.icon;

  document.getElementById('editExpOverlay').style.display = 'flex';
}

function closeEditExp(e) {
  if (!e || e.target === document.getElementById('editExpOverlay')) {
    document.getElementById('editExpOverlay').style.display = 'none';
  }
}

function selectEditExpEmoji(btn) {
  document.querySelectorAll('#editExpEmojiPicker .emoji-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedEditExpEmoji = btn.dataset.emoji;
}

let selectedEditExpEmoji = '🍕';

async function saveEditExp() {
  const index = parseInt(document.getElementById('editExpIndex').value);
  const name = document.getElementById('editExpName').value.trim();
  const amount = parseFloat(document.getElementById('editExpAmount').value);
  const catId = document.getElementById('editExpCategory').value;
  if (!name || !amount || amount <= 0) { alert('נא למלא שם וסכום תקין'); return; }

  const exp = expenses[index];
  if (!exp) return;

  exp.name = name;
  exp.amount = amount;
  exp.icon = selectedEditExpEmoji;
  exp.catId = catId ? parseInt(catId) : null;

  saveLocal();
  try {
    await sbFetch(`expenses?id=eq.${exp.id}&user_db_id=eq.${currentUser?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ name: exp.name, amount: exp.amount, icon: exp.icon, cat_id: exp.catId })
    });
  } catch(e) {}

  closeEditExp();
  renderAll();
}
