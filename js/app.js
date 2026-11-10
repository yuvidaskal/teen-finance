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
  if (name === 'home' && typeof updateHome === 'function') updateHome();
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
