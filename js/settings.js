// ════════════════════════════════
// SETTINGS
// ════════════════════════════════

function openSettings() {
  document.getElementById('settingsOverlay').classList.add('open');
}
function closeSettings(e) {
  if (!e || e.target === document.getElementById('settingsOverlay')) {
    document.getElementById('settingsOverlay').classList.remove('open');
  }
}

function toggleDarkMode() {
  const dark = document.getElementById('darkModeToggle').checked;
  document.body.classList.toggle('dark', dark);
  localStorage.setItem('kc_dark', dark ? '1' : '0');
}

function saveHomePrefs() {
  const prefs = {
    showNavCards: document.getElementById('showNavCards').checked,
    showSummaryCards: document.getElementById('showSummaryCards').checked,
    showTip: document.getElementById('showTip').checked
  };
  localStorage.setItem('kc_homeprefs', JSON.stringify(prefs));
  applyHomePrefs(prefs);
  if (currentUser) {
    sbFetch('user_preferences', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_db_id: currentUser.id, ...prefs })
    }).catch(() => {});
  }
}

function applyHomePrefs(prefs) {
  document.getElementById('homeNavCards').style.display = prefs.showNavCards ? 'grid' : 'none';
  document.getElementById('homeSummaryCards').style.display = prefs.showSummaryCards ? 'grid' : 'none';
  document.getElementById('homeTipCard').style.display = prefs.showTip ? 'flex' : 'none';
}

function loadLocalPrefs() {
  // Dark mode
  const dark = localStorage.getItem('kc_dark') === '1';
  document.getElementById('darkModeToggle').checked = dark;
  document.body.classList.toggle('dark', dark);
  // Home prefs
  try {
    const raw = localStorage.getItem('kc_homeprefs');
    if (raw) {
      const prefs = JSON.parse(raw);
      document.getElementById('showNavCards').checked = prefs.showNavCards !== false;
      document.getElementById('showSummaryCards').checked = prefs.showSummaryCards !== false;
      document.getElementById('showTip').checked = prefs.showTip !== false;
      applyHomePrefs(prefs);
    }
  } catch(e) {}
}
