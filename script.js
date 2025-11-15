const STORAGE_KEY = 'diario_bordo_entries';
let entries = [];
let deferredPrompt = null;

const form = document.getElementById('entryForm');
const list = document.getElementById('entriesList');
const emptyState = document.getElementById('emptyState');
const clearAllBtn = document.getElementById('clearAllBtn');
const installBtn = document.getElementById('installBtn');
const titleInput = document.getElementById('title');
const dateInput = document.getElementById('date');
const descInput = document.getElementById('description');

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
  } catch (_) {
    entries = [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return iso; }
}

function renderList() {
  list.innerHTML = '';
  if (!entries.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  const sorted = [...entries].sort((a,b) => (a.date < b.date ? 1 : -1));
  for (const e of sorted) {
    const li = document.createElement('li');
    li.className = 'entry';
    li.innerHTML = `
      <div class="entry-title">
        <h3>${e.title}</h3>
        <div style="display:flex; gap:6px;">
          <button class="secondary small" data-id="${e.id}" data-action="copy">Copiar</button>
          <button class="danger small" data-id="${e.id}" data-action="delete">Remover</button>
        </div>
      </div>
      <div class="entry-meta">${formatDate(e.date)}</div>
      <div class="entry-desc">${escapeHtml(e.description)}</div>
    `;
    list.appendChild(li);
  }
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function resetForm() {
  form.reset();
  setToday();
  titleInput.focus();
}

function setToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const date = dateInput.value;
  if (!title || !description || !date) return;
  const entry = { id: Date.now().toString(36), title, description, date };
  entries.push(entry);
  saveEntries();
  renderList();
  resetForm();
});

clearAllBtn.addEventListener('click', () => {
  if (!entries.length) return;
  const ok = confirm('Remover todas as entradas? Esta ação não pode ser desfeita.');
  if (!ok) return;
  entries = [];
  saveEntries();
  renderList();
});

list.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  const action = btn.getAttribute('data-action');
  if (!id || !action) return;
  if (action === 'delete') {
    entries = entries.filter(e => e.id !== id);
    saveEntries();
    renderList();
  } else if (action === 'copy') {
    const e = entries.find(x => x.id === id);
    if (!e) return;
    const text = `${e.title}\n${formatDate(e.date)}\n\n${e.description}`;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copiado';
      setTimeout(() => (btn.textContent = 'Copiar'), 1200);
    } catch (_) { /* ignore */ }
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  installBtn.disabled = true;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
  installBtn.disabled = false;
  console.log('Install choice:', outcome);
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  installBtn.hidden = true;
});

(function init() {
  setToday();
  loadEntries();
  renderList();
})();
