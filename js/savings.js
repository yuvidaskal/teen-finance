// ════════════════════════════════
// MULTI-SAVINGS SYSTEM
// ════════════════════════════════

let savings = []; // [{ id, name, principal, monthly, rate, years }]

// ── CALCULATE ──────────────────
function calcOneSaving(principal, monthly, rate, years) {
  const mr = (rate / 100) / 12;
  let bal = principal, dep = principal;
  for (let i = 0; i < years * 12; i++) { bal = bal * (1 + mr) + monthly; dep += monthly; }
  return { total: bal, interest: bal - dep, deposited: dep, perYear: (bal - dep) / years };
}

function calcYearTable(principal, monthly, rate, years) {
  const mr = (rate / 100) / 12;
  const rows = [];
  let b = principal;
  const { total } = calcOneSaving(principal, monthly, rate, years);
  for (let y = 1; y <= years; y++) {
    const start = b;
    for (let mo = 0; mo < 12; mo++) b = b * (1 + mr) + monthly;
    rows.push({ year: y, balance: b, interest: b - start - monthly * 12, pct: Math.round((b / total) * 100) });
  }
  return rows;
}

// ── ADD / REMOVE ───────────────
function addSaving() {
  const name = document.getElementById('savingName').value.trim();
  const principal = parseFloat(document.getElementById('savingPrincipal').value) || 0;
  const monthly = parseFloat(document.getElementById('savingMonthly').value) || 0;
  const rate = parseFloat(document.getElementById('savingRate').value) || 0;
  const years = parseInt(document.getElementById('savingYears').value) || 1;
  if (!name) { alert('נא להזין שם לחיסכון'); return; }
  if (rate <= 0) { alert('נא להזין ריבית חיובית'); return; }

  const saving = { id: Date.now(), name, principal, monthly, rate, years };
  savings.push(saving);

  // Clear form
  document.getElementById('savingName').value = '';
  document.getElementById('savingPrincipal').value = '1000';
  document.getElementById('savingMonthly').value = '200';
  document.getElementById('savingRate').value = '4';
  document.getElementById('savingYears').value = '5';

  saveSavingsLocal();
  saveSavingsToDB(saving);
  renderSavingsList();
  updateHome();
}

function removeSaving(id) {
  savings = savings.filter(s => s.id !== id);
  saveSavingsLocal();
  deleteSavingFromDB(id);
  renderSavingsList();
  updateHome();
}

// ── RENDER CARDS ───────────────
function renderSavingsList() {
  const wrap = document.getElementById('savingsList');
  if (savings.length === 0) {
    wrap.innerHTML = `<div class="card" style="text-align:center;color:var(--muted);padding:2rem 1rem;">
      <div style="font-size:2rem;margin-bottom:.5rem;">🏦</div>
      <div style="font-size:.9rem;">עדיין אין חסכונות — הוסף את הראשון למעלה!</div>
    </div>`;
    return;
  }
  wrap.innerHTML = savings.map(s => {
    const { total, interest, deposited, perYear } = calcOneSaving(s.principal, s.monthly, s.rate, s.years);
    const growthPct = deposited > 0 ? Math.round((interest / deposited) * 100) : 0;
    return `<div class="card" style="position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--teal),var(--teal-dark));"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.85rem;">
        <div>
          <div style="font-size:1rem;font-weight:900;color:var(--text);">🏦 ${s.name}</div>
          <div style="font-size:.72rem;color:var(--muted);margin-top:.15rem;">${s.rate}% ריבית · ${s.years} שנים · הפקדה ${fmt(s.monthly)}/חודש</div>
        </div>
        <button class="exp-del" onclick="removeSaving(${s.id})" title="מחק">✕</button>
      </div>

      <div class="result-box" style="padding:1rem;margin-top:0;margin-bottom:.85rem;">
        <div class="result-label">סך הכל בתום התקופה</div>
        <div class="result-num" style="font-size:2rem;">${fmt(total)}</div>
        <div class="result-sub">בעוד ${s.years} שנים · רווח של ${growthPct}%</div>
      </div>

      <div class="stats-row" style="margin-top:0;margin-bottom:.85rem;">
        <div class="stat"><div class="stat-val">${fmt(interest)}</div><div class="stat-lbl">ריבית שהרווחת</div></div>
        <div class="stat"><div class="stat-val">${fmt(deposited)}</div><div class="stat-lbl">סה״כ הפקדות</div></div>
        <div class="stat"><div class="stat-val">${fmt(perYear)}</div><div class="stat-lbl">ריבית לשנה</div></div>
      </div>

      <button onclick="openSavingDetail(${s.id})" class="btn btn-outline" style="width:100%;font-size:.8rem;">
        📈 פתח טבלת ריבית דריבית
      </button>
    </div>`;
  }).join('');
}

// ── DETAIL MODAL ───────────────
function openSavingDetail(id) {
  const s = savings.find(x => x.id === id);
  if (!s) return;
  const rows = calcYearTable(s.principal, s.monthly, s.rate, s.years);
  const { total, interest, deposited } = calcOneSaving(s.principal, s.monthly, s.rate, s.years);

  document.getElementById('detailTitle').textContent = `📈 ${s.name} — ריבית דריבית`;
  document.getElementById('detailContent').innerHTML = `
    <div class="result-box" style="margin-bottom:1rem;">
      <div class="result-label">סך הכל בתום ${s.years} שנים</div>
      <div class="result-num">${fmt(total)}</div>
      <div class="result-sub">${fmt(s.principal)} התחלתי + ${fmt(s.monthly)}/חודש · ${s.rate}% ריבית</div>
    </div>
    <div class="stats-row" style="margin-bottom:1rem;">
      <div class="stat"><div class="stat-val">${fmt(interest)}</div><div class="stat-lbl">ריבית שהרווחת</div></div>
      <div class="stat"><div class="stat-val">${fmt(deposited)}</div><div class="stat-lbl">סה״כ הפקדות</div></div>
      <div class="stat"><div class="stat-val">${Math.round((interest/deposited)*100)}%</div><div class="stat-lbl">תשואה כוללת</div></div>
    </div>
    <div class="card" style="padding:.75rem;margin-bottom:0;">
      <div class="card-title" style="margin-bottom:.6rem;">טבלת צמיחה שנתית</div>
      <div style="overflow-x:auto;">
        <table class="year-table">
          <thead><tr><th>שנה</th><th>סך חיסכון</th><th>ריבית שנתית</th><th>צמיחה</th></tr></thead>
          <tbody>
            ${rows.map(r => `<tr>
              <td>שנה ${r.year}</td>
              <td style="font-weight:800;">${fmt(r.balance)}</td>
              <td style="color:var(--teal);">${fmt(r.interest)}</td>
              <td style="width:80px;"><div class="bar-bg"><div class="bar-fill" style="width:${r.pct}%"></div></div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('savingDetailOverlay').style.display = 'flex';
}

function closeSavingDetail(e) {
  if (!e || e.target === document.getElementById('savingDetailOverlay')) {
    document.getElementById('savingDetailOverlay').style.display = 'none';
  }
}

// ── PERSISTENCE ────────────────
function saveSavingsLocal() {
  if (!currentUser) return;
  try { localStorage.setItem(`kc_${currentUser.id}_savings`, JSON.stringify(savings)); } catch(e) {}
}

function loadSavingsLocal() {
  if (!currentUser) return;
  try {
    const raw = localStorage.getItem(`kc_${currentUser.id}_savings`);
    if (raw) savings = JSON.parse(raw);
  } catch(e) {}
}

async function loadSavingsFromDB() {
  if (!currentUser) return;
  try {
    const rows = await sbFetch(`savings_plans?user_db_id=eq.${currentUser.id}&order=created_at.asc`);
    if (rows && rows.length > 0) {
      savings = rows.map(r => ({ id: r.id, name: r.name, principal: r.principal, monthly: r.monthly, rate: r.rate, years: r.years }));
      saveSavingsLocal();
      renderSavingsList();
    }
  } catch(e) {}
}

async function saveSavingsToDB(saving) {
  if (!currentUser) return;
  try {
    await sbFetch('savings_plans', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ id: saving.id, name: saving.name, principal: saving.principal, monthly: saving.monthly, rate: saving.rate, years: saving.years, user_db_id: currentUser.id, user_id: `user_${currentUser.id}` })
    });
  } catch(e) {}
}

async function deleteSavingFromDB(id) {
  if (!currentUser) return;
  try {
    await sbFetch(`savings_plans?id=eq.${id}&user_db_id=eq.${currentUser.id}`, { method: 'DELETE' });
  } catch(e) {}
}

// ── BACKWARDS COMPAT for home panel ──
function calcSavings() {
  // used by updateHome to get total savings for display
  // no-op now — home reads from savings array
}

// Keep old slider functions in case called from elsewhere
function updateRate() {}
function updateYears() {}
