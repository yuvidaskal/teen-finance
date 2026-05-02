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
    li.innerHTML = `<div class="expense-cat"><span class="exp-icon">${e.icon}</span><div><div class="exp-name">${e.name}</div>${cat ? `<div style="font-size:.62rem;color:${cat.color};font-weight:700;">${cat.icon} ${cat.name}</div>` : '<div style="font-size:.62rem;color:var(--muted);">ללא תקציב</div>'}</div></div><div style="display:flex;align-items:center;gap:.5rem;"><span class="exp-amount">${fmt(e.amount)}</span><button class="exp-del" onclick="removeExpense(${i})">✕</button></div>`;
    list.appendChild(li);
  });
}
