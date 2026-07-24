const BASE = 'http://localhost:8848';
 
// ── TOKEN ──
function getToken()         { return sessionStorage.getItem('accessToken'); }
function setToken(t)        { sessionStorage.setItem('accessToken', t); }
function clearToken()       { sessionStorage.removeItem('accessToken'); sessionStorage.removeItem('userRole'); }
function getRole()          { return sessionStorage.getItem('userRole'); }
function setRole(r)         { sessionStorage.setItem('userRole', r); }
 
function parseToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch { return null; }
}
 
// ── GUARDS ──
function requireAuth() {
  if (!getToken()) { window.location.href = 'login.html'; return false; }
  return true;
}
function requireAdmin() {
  if (!getToken() || getRole() !== 'ADMIN') { window.location.href = 'home.html'; return false; }
  return true;
}
function redirectIfAuthed() {
  if (getToken()) { window.location.href = 'home.html'; }
}
 
// ── API ──
async function api(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers['Authorization'] = `Bearer ${getToken()}`;
  const opts = { method, headers, credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);
 
  let res;
  try { res = await fetch(BASE + path, opts); }
  catch { throw new Error('Cannot reach server. Is the backend running?'); }
 
  // auto-refresh on 401
  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      res = await fetch(BASE + path, { method, headers, credentials: 'include', body: body ? JSON.stringify(body) : undefined });
    } else {
      clearToken();
      window.location.href = 'login.html';
      return;
    }
  }
  return res;
}
 
async function tryRefresh() {
  try {
    const res = await fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'include' });
    if (res.ok) { const d = await res.json(); setToken(d.accessToken); return true; }
    return false;
  } catch { return false; }
}
 
// ── ALERTS ──
function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.classList.remove('show'), 5000);
}
 
// ── NAV ──
function buildNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const token = getToken();
  const role  = getRole();
  const page  = location.pathname.split('/').pop();
 
  // if token, show nav with home, admin(if role==ADMIN), user, logout, else login, register
  nav.innerHTML = `
    <a class="brand" href="${token ? 'home.html' : 'login.html'}">
      AuthBackend
    </a>
    ${token ? `
      <a href="home.html" class="${page === 'home.html' ? 'active' : ''}">Home</a>
      ${role === 'ADMIN' ? `
        <a href="admin.html" class="${page === 'admin.html' ? 'active' : ''}">Admin</a>
      ` : ''}
      <span id="nav-user"></span>
      <a href="#" onclick="doLogout(); return false;">Logout</a>
    ` : `
      <a href="login.html" class="${page === 'login.html' ? 'active' : ''}">Login</a>
      <a href="register.html" class="${page === 'register.html' ? 'active' : ''}">Register</a>
    `}
  `;
 
  if (token) {
    const payload = parseToken(token);
    const navUser = document.getElementById('nav-user');
    if (navUser && payload) {
      navUser.textContent = `${payload.role || 'user'} · id:${payload.id}`;
    }
  }
}
 
async function doLogout() {
  await api('POST', '/auth/logout');
  clearToken();
  window.location.href = 'login.html';
}
 