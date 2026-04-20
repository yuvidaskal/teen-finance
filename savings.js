// ════════════════════════════════
// SAVINGS CALCULATOR
// ════════════════════════════════

function updateRate() {
  const v = document.getElementById('rate').value;
  const lbl = document.getElementById('rateLabel');
  lbl.textContent = v + '%';
  lbl.style.left = ((v - 0.1) / (15 - 0.1) * 100) + '%';
}

function updateYears() {
  const v = document.getElementById('years').value;
  const lbl = document.getElementById('yearsLabel');
  lbl.textContent = v + ' שנים';
  lbl.style.left = ((v - 1) / 19 * 100) + '%';
}

function calcSavings() {
  saveSettings();
  const P = parseFloat(document.getElementById('principal').value) || 0;
  const m = parseFloat(document.getElementById('monthly').value) || 0;
  const r = parseFloat(document.getElementById('rate').value) / 100;
  const n = parseInt(document.getElementById('years').value);
  let bal = P, dep = P;
  const mr = r / 12;
  for (let i = 0; i < n * 12; i++) { bal = bal * (1 + mr) + m; dep += m; }
  const int = bal - dep;

  document.getElementById('totalResult').textContent = fmt(bal);
  document.getElementById('yearsResult').textContent = n;
  document.getElementById('interestEarned').textContent = fmt(int);
  document.getElementById('totalDeposited').textContent = fmt(dep);
  document.getElementById('perYear').textContent = fmt(int / n);

  const tbody = document.getElementById('yearTableBody');
  tbody.innerHTML = '';
  let b = P;
  for (let y = 1; y <= n; y++) {
    const s = b;
    for (let mo = 0; mo < 12; mo++) b = b * (1 + mr) + m;
    const yi = b - s - m * 12;
    const pct = Math.round((b / bal) * 100);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>שנה ${y}</td><td style="font-weight:800;">${fmt(b)}</td><td style="color:var(--teal);">${fmt(yi)}</td><td style="width:80px;"><div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div></td>`;
    tbody.appendChild(tr);
  }
}
