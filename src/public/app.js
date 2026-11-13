// pingboard front-end.
//
// Note the UI only ever lets you edit your OWN profile and only exposes the
// legitimate fields (displayName, bio, location). The role/verified/secretNote
// fields are never shown here — reaching them is the whole point of the lab and
// requires crafting the request yourself (e.g. with Burp). The server is what
// fails to enforce that boundary.
const $ = (sel) => document.querySelector(sel);

const loginCard = $('#login-card');
const profileCard = $('#profile-card');
const who = $('#who');

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function loadMe() {
  const { status, body } = await api('/api/users/me');
  if (status !== 200) return false;
  const u = body.user;
  who.textContent = `@${u.username}`;
  $('#profile-form').displayName.value = u.displayName ?? '';
  $('#profile-form').bio.value = u.bio ?? '';
  $('#profile-form').location.value = u.location ?? '';
  loginCard.classList.add('hidden');
  profileCard.classList.remove('hidden');
  return { id: u.id };
}

let session = null;

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  const f = e.target;
  const { status, body } = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: f.username.value, password: f.password.value }),
  });
  if (status !== 200) {
    $('#login-error').textContent = body.message || 'Login failed';
    return;
  }
  session = await loadMe();
});

$('#profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!session) return;
  const f = e.target;
  const { status, body } = await api(`/api/users/${session.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      displayName: f.displayName.value,
      bio: f.bio.value,
      location: f.location.value,
    }),
  });
  $('#profile-msg').textContent = status === 200 ? 'Saved.' : body.message || 'Could not save.';
});

$('#logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  profileCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
  who.textContent = '';
  session = null;
});

// Try to resume an existing session on load.
loadMe().then((s) => {
  if (s) session = s;
});
