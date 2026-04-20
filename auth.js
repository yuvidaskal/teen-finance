// ════════════════════════════════
// AUTH
// ════════════════════════════════

function hashPassword(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) { h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0; }
  return 'h_' + Math.abs(h).toString(36) + '_' + pw.length;
}

function showAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active', ['login', 'register'][i] === tab));
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  clearAuthMessages();
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg; el.style.display = 'block';
  document.getElementById('authSuccess').style.display = 'none';
}
function showAuthSuccessMsg(msg) {
  const el = document.getElementById('authSuccess');
  el.textContent = msg; el.style.display = 'block';
  document.getElementById('authError').style.display = 'none';
}
function clearAuthMessages() {
  document.getElementById('authError').style.display = 'none';
  document.getElementById('authSuccess').style.display = 'none';
}

async function doRegister() {
  const username = document.getElementById('regUsername').value.trim();
  const pw = document.getElementById('regPassword').value;
  const pw2 = document.getElementById('regPassword2').value;
  if (!username || username.length < 3) { showAuthError('שם משתמש חייב להיות לפחות 3 תווים'); return; }
  if (!pw || pw.length < 4) { showAuthError('סיסמא חייבת להיות לפחות 4 תווים'); return; }
  if (pw !== pw2) { showAuthError('הסיסמאות לא תואמות'); return; }
  try {
    const existing = await sbFetch(`users?username=eq.${encodeURIComponent(username)}&select=id`);
    if (existing.length > 0) { showAuthError('שם משתמש כבר קיים — בחר אחר'); return; }
    await sbFetch('users', { method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify({ username, password_hash: hashPassword(pw) }) });
    showAuthSuccessMsg('נרשמת בהצלחה! עכשיו התחבר 🎉');
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regPassword2').value = '';
    setTimeout(() => showAuthTab('login'), 1500);
  } catch(e) { showAuthError('שגיאה ברישום. נסה שנית.'); }
}

async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if (!username || !pw) { showAuthError('מלא שם משתמש וסיסמא'); return; }
  try {
    const hash = hashPassword(pw);
    const rows = await sbFetch(`users?username=eq.${encodeURIComponent(username)}&password_hash=eq.${encodeURIComponent(hash)}&select=id,username`);
    if (rows.length === 0) { showAuthError('שם משתמש או סיסמא שגויים'); return; }
    currentUser = { id: rows[0].id, username: rows[0].username };
    localStorage.setItem('kc_session', JSON.stringify(currentUser));
    enterApp();
  } catch(e) { showAuthError('שגיאה בכניסה. נסה שנית.'); }
}

function doLogout() {
  localStorage.removeItem('kc_session');
  currentUser = null;
  expenses = []; budgetCategories = []; watchlist = [];
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('authOverlay').style.display = 'flex';
  closeSettings();
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  clearAuthMessages();
}

function enterApp() {
  document.getElementById('authOverlay').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';
  document.getElementById('headerUsername').textContent = currentUser.username;
  document.getElementById('settingsUsername').textContent = '👤 ' + currentUser.username;
  loadLocalPrefs();
  updateRate(); updateYears();
  loadLocal(); calcSavings(); renderAll(); renderWatchlist(); updateHome();
  loadFromSupabase();
}
