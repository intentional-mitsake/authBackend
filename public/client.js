const BASE = 'http://localhost:8848';
let accessToken = null;
let auditCurrentPage = 1;
 
// ── NAV ──
function show(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  event?.target?.classList.add('active');
}
 
// ── REQUEST LOG ──
function logRequest(method, path, status) {
  const el = document.createElement('div');
  el.className = 'log-entry';
  const sClass = status >= 500 ? 's5' : status >= 400 ? 's4' : 's2';
  const time = new Date().toTimeString().slice(0, 8);
  el.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-method ${method}">${method}</span>
    <span class="log-path">${path}</span>
    <span class="log-status ${sClass}">${status}</span>
  `;
  const entries = document.getElementById('log-entries');
  entries.appendChild(el);
  entries.scrollTop = entries.scrollHeight;
}
 
function clearLog() {
  document.getElementById('log-entries').innerHTML = '';
}
 
// ── API ──
async function api(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const opts = { method, headers, credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  logRequest(method, path, res.status);
  return res;
}
 
// ── ALERTS ──
function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.classList.remove('show'), 4000);
}
 
// ── USER INFO ──
function setUserInfo(token) {
  if (!token) {
    document.getElementById('user-info').textContent = 'not signed in';
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = new Date(payload.exp * 1000).toLocaleTimeString();
    document.getElementById('user-info').innerHTML =
      `<span>id:${payload.id}</span> &nbsp; <span>role:${payload.role || 'user'}</span> &nbsp; <span>exp:${exp}</span>`;
  } catch {
    document.getElementById('user-info').textContent = 'signed in';
  }
}
 
// ── REGISTER ──
async function doRegister() {
  const email    = document.getElementById('reg-email').value;
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const res  = await api('POST', '/auth/register', { email, username, password }, false);
  const data = await res.json();
  if (res.ok) {
    accessToken = data.accessToken;
    setUserInfo(accessToken);
    showAlert('reg-ok', 'Registered successfully.', 'success');
    document.getElementById('reg-token-display').textContent = data.accessToken;
    document.getElementById('reg-token-card').style.display = 'block';
  } else {
    showAlert('reg-err', data.error || 'Registration failed.', 'error');
  }
}
 
// ── LOGIN ──
async function doLogin() {
  const email    = document.getElementById('log-email').value;
  const password = document.getElementById('log-password').value;
  const res  = await api('POST', '/auth/login', { email, password }, false);
  const data = await res.json();
  if (res.ok) {
    accessToken = data.accessToken;
    setUserInfo(accessToken);
    showAlert('log-ok', 'Logged in.', 'success');
    document.getElementById('log-token-display').textContent = data.accessToken;
    document.getElementById('log-token-card').style.display = 'block';
  } else {
    showAlert('log-err', data.error || 'Login failed.', 'error');
  }
}
 
// ── REFRESH ──
async function doRefresh() {
  const res  = await api('POST', '/auth/refresh', null, false);
  const data = await res.json();
  if (res.ok) {
    accessToken = data.accessToken;
    setUserInfo(accessToken);
    showAlert('ref-ok', 'Tokens rotated.', 'success');
    document.getElementById('ref-token-display').textContent = data.accessToken;
    document.getElementById('ref-token-card').style.display = 'block';
  } else {
    showAlert('ref-err', data.error || 'Refresh failed.', 'error');
  }
}
 
// ── LOGOUT ──
async function doLogout() {
  await api('POST', '/auth/logout');
  accessToken = null;
  setUserInfo(null);
}
 
// ── PROFILE ──
async function loadProfile() {
  const res  = await api('GET', '/user');
  const data = await res.json();
  const el   = document.getElementById('profile-data');
  if (res.ok) {
    const u = data.user;
    el.innerHTML = `
      <div class="profile-row"><span class="profile-key">ID</span><span class="profile-val">${u.id}</span></div>
      <div class="profile-row"><span class="profile-key">Email</span><span class="profile-val">${u.email}</span></div>
      <div class="profile-row"><span class="profile-key">Username</span><span class="profile-val">${u.username}</span></div>
      <div class="profile-row"><span class="profile-key">Role</span><span class="profile-val"><span class="role role-${u.role}">${u.role}</span></span></div>
      <div class="profile-row"><span class="profile-key">Created</span><span class="profile-val">${new Date(u.createdAt).toLocaleString()}</span></div>
    `;
  } else {
    showAlert('profile-err', data.error || 'Failed.', 'error');
    el.textContent = '';
  }
}
 
// ── SESSIONS ──
async function loadSessions() {
  const res  = await api('GET', '/auth/sessions');
  const data = await res.json();
  const el   = document.getElementById('sessions-list');
  if (res.ok && data.activeSessions?.length) {
    el.innerHTML = data.activeSessions.map(s => `
      <div class="session-item">
        <div>
          <div class="session-family">${s.familyId}</div>
          <div class="session-meta">
            created ${new Date(s.createdAt).toLocaleString()}
            &nbsp;·&nbsp;
            last used ${new Date(s.lastUsedAt).toLocaleString()}
          </div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="revokeSession('${s.familyId}')">Revoke</button>
      </div>
    `).join('');
  } else if (res.ok) {
    el.innerHTML = '<span class="empty">No active sessions.</span>';
  } else {
    showAlert('sess-err', data.error || 'Failed.', 'error');
  }
}
 
async function revokeSession(familyId) {
  await api('DELETE', `/auth/sessions/${familyId}`);
  loadSessions();
}
 
async function revokeAll() {
  await api('DELETE', '/auth/sessions');
  accessToken = null;
  setUserInfo(null);
  loadSessions();
}
 
// ── ADMIN USERS ──
async function loadUsers() {
  const res  = await api('GET', '/admin/users');
  const data = await res.json();
  const el   = document.getElementById('users-table');
  if (res.ok && data.users?.length) {
    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Email</th><th>Username</th>
            <th>Role</th><th>Banned</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.users.map(u => `
            <tr>
              <td style="font-family:var(--mono);color:var(--muted)">${u.id}</td>
              <td>${u.email}</td>
              <td>${u.username}</td>
              <td><span class="role role-${u.role}">${u.role}</span></td>
              <td style="color:${u.banned ? 'var(--error)' : 'var(--success)'}">${u.banned ? 'yes' : 'no'}</td>
              <td style="display:flex;gap:6px">
                ${u.banned
                  ? `<button class="btn btn-ghost btn-sm" onclick="doRestore(${u.id})">Restore</button>`
                  : `<button class="btn btn-danger btn-sm" onclick="doBan(${u.id})">Ban</button>`
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (res.ok) {
    el.innerHTML = '<span class="empty">No users found.</span>';
  } else {
    showAlert('adm-err', data.error || 'Failed.', 'error');
  }
}
 
async function doPromote() {
  const id   = document.getElementById('promote-id').value;
  const role = document.getElementById('promote-role').value;
  const res  = await api('PATCH', `/admin/users/${id}/role`, { role });
  const data = await res.json();
  if (res.ok) {
    showAlert('adm-ok', `User ${id} promoted to ${role}.`, 'success');
    loadUsers();
  } else {
    showAlert('adm-err', data.error || 'Failed.', 'error');
  }
}
 
async function doBan(id) {
  const res  = await api('PATCH', `/admin/users/${id}/ban`);
  const data = await res.json();
  if (res.ok) {
    showAlert('adm-ok', `User ${id} banned.`, 'success');
    loadUsers();
  } else {
    showAlert('adm-err', data.error || 'Failed.', 'error');
  }
}
 
async function doRestore(id) {
  const res  = await api('PATCH', `/admin/users/${id}/restore`);
  const data = await res.json();
  if (res.ok) {
    showAlert('adm-ok', `User ${id} restored.`, 'success');
    loadUsers();
  } else {
    showAlert('adm-err', data.error || 'Failed.', 'error');
  }
}
 
// ── AUDIT LOG ──
async function loadAudit(page) {
  auditCurrentPage = page;
  const res  = await api('GET', `/admin/audit-log?page=${page}&limit=15`);
  const data = await res.json();
  const el   = document.getElementById('audit-table');
  if (res.ok) {
    document.getElementById('audit-page-info').textContent =
      `page ${data.page} of ${data.pages} (${data.total} total)`;
    document.getElementById('audit-prev').style.display = page > 1 ? 'inline-block' : 'none';
    document.getElementById('audit-next').style.display = page < data.pages ? 'inline-block' : 'none';
    if (data.logs?.length) {
      el.innerHTML = `
        <table>
          <thead><tr><th>Time</th><th>User ID</th><th>Action</th><th>Data</th></tr></thead>
          <tbody>
            ${data.logs.map(l => `
              <tr>
                <td style="font-family:var(--mono);white-space:nowrap;color:var(--muted)">
                  ${new Date(l.createdAt).toLocaleString()}
                </td>
                <td style="font-family:var(--mono)">${l.userId ?? '—'}</td>
                <td><span style="font-family:var(--mono);font-size:12px">${l.action}</span></td>
                <td style="font-family:var(--mono);font-size:11px;color:var(--muted)">
                  ${l.data ? JSON.stringify(l.data).slice(0, 60) : '—'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      el.innerHTML = '<span class="empty">No logs.</span>';
    }
  } else {
    showAlert('audit-err', data.error || 'Failed.', 'error');
  }
}
 
function auditPage(dir) {
  loadAudit(auditCurrentPage + dir);
}
 
// ── HEALTH ──
async function checkHealth() {
  const res  = await api('GET', '/health', null, false);
  const data = await res.json();
  const dbBadge    = document.getElementById('badge-db');
  const redisBadge = document.getElementById('badge-redis');
  dbBadge.className    = `badge ${data.db === 'up' ? 'up' : 'down'}`;
  dbBadge.textContent  = `DB ${data.db === 'up' ? '↑' : '↓'}`;
  redisBadge.className    = `badge ${data.redis === 'up' ? 'up' : 'down'}`;
  redisBadge.textContent  = `Redis ${data.redis === 'up' ? '↑' : '↓'}`;
  document.getElementById('health-data').innerHTML = `
    <div class="profile-row"><span class="profile-key">Status</span><span class="profile-val" style="color:var(--success)">${data.status}</span></div>
    <div class="profile-row"><span class="profile-key">DB</span><span class="profile-val" style="color:${data.db === 'up' ? 'var(--success)' : 'var(--error)'}">${data.db}</span></div>
    <div class="profile-row"><span class="profile-key">Redis</span><span class="profile-val" style="color:${data.redis === 'up' ? 'var(--success)' : 'var(--error)'}">${data.redis}</span></div>
    <div class="profile-row"><span class="profile-key">Uptime</span><span class="profile-val">${Math.floor(data.uptime)}s</span></div>
    <div class="profile-row"><span class="profile-key">Version</span><span class="profile-val">${data.version}</span></div>
  `;
}
 
// ── METRICS ──
async function loadMetrics() {
  const res  = await api('GET', '/metrics', null, false);
  const data = await res.json();
  document.getElementById('m-requests').textContent = data.requests_total ?? '—';
  document.getElementById('m-failures').textContent = data.auth_failures_total ?? '—';
  document.getElementById('m-tokens').textContent   = data.tokens_issued_total ?? '—';
  document.getElementById('metrics-grid').style.display = 'grid';
}
 
// Auto health check on load
checkHealth();