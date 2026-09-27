import { DETECT_SIZE, detectFormat } from '../src/detect.js';
import { EXTENSIONS, archiveName, decryptedName, encryptedName } from '../src/names.js';
import { version } from '../package.json';
import { collectDrop, collectInput, entriesFromDrop } from './files.js';
import { applyTranslations, getLanguage, setLanguage, t } from './i18n.js';
import { assess } from './strength.js';

const $ = (id) => document.getElementById(id);

// Au-delà de cette taille, le résultat est écrit directement sur le disque
// quand le navigateur le permet (File System Access), plutôt qu'en mémoire.
const LARGE_FILE = 256 * 1024 * 1024;
const canSaveDirectly = typeof window.showSaveFilePicker === 'function';

const ui = {
  form: $('form'),
  dropzone: $('dropzone'),
  fileInput: $('file'),
  folderInput: $('folder'),
  pickFolder: $('pick-folder'),
  altPick: $('alt-pick'),
  emptyView: document.querySelector('.dropzone-empty'),
  fileView: document.querySelector('.dropzone-file'),
  fileBadge: $('file-badge'),
  fileName: $('file-name'),
  fileInfo: $('file-info'),
  options: $('options'),
  password: $('password'),
  reveal: $('reveal'),
  generate: $('generate'),
  generated: $('generated'),
  copy: $('copy'),
  strength: $('strength'),
  strengthFill: $('strength-fill'),
  strengthLabel: $('strength-label'),
  confirmField: $('confirm-field'),
  confirm: $('confirm'),
  formatField: $('format-field'),
  hint: $('password-hint'),
  largeHint: $('large-hint'),
  submit: $('submit'),
  progress: $('progress'),
  progressBar: $('progress-bar'),
  progressFill: $('progress-fill'),
  progressLabel: $('progress-label'),
  progressDetail: $('progress-detail'),
  cancel: $('cancel'),
  result: $('result'),
  resultTitle: $('result-title'),
  resultDetail: $('result-detail'),
  resultHint: $('result-hint'),
  download: $('download'),
  restart: $('restart'),
  error: $('error'),
  lang: $('lang'),
  update: $('update'),
  updateReload: $('update-reload'),
};

const state = {
  items: [], // [{ file, path }] choisis
  folder: null, // nom du dossier choisi, s'il n'y en a qu'un
  archive: false, // plusieurs fichiers (ou un dossier) → archive .zip
  file: null, // le fichier, s'il n'y en a qu'un
  mode: 'encrypt', // 'encrypt' | 'decrypt'
  sourceFormat: null, // format détecté si le fichier est déjà chiffré
  worker: null,
  downloadUrl: null,
  downloaded: false,
  result: null, // { encrypting, name, size } du dernier résultat affiché
  error: null, // { key, params } de l'erreur affichée, pour la retraduire
  copyKey: 'generated.copy',
};

ui.fileInput.value = '';
$('version').textContent = `v${version}`;
render();

// ---------------------------------------------------------------------------
// Hors ligne (service worker, uniquement sur le site construit)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let waiting = null;
  let updating = false;
  // Une nouvelle version s'installe en arrière-plan, mais ne prend la main
  // qu'avec l'accord de l'utilisateur : jamais au milieu d'un chiffrement.
  const offerUpdate = (worker) => {
    if (!worker || !navigator.serviceWorker.controller) return;
    waiting = worker;
    ui.update.hidden = false;
  };
  navigator.serviceWorker
    .register('./sw.js')
    .then((registration) => {
      offerUpdate(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') offerUpdate(worker);
        });
      });
    })
    .catch(() => {
      // Hors ligne indisponible (navigation privée…) : le site marche quand même.
    });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updating) location.reload();
  });
  ui.updateReload.addEventListener('click', () => {
    if (isBusy() || !waiting) return;
    updating = true;
    waiting.postMessage('SKIP_WAITING');
  });
}

// ---------------------------------------------------------------------------
// Langue

ui.lang.addEventListener('click', () => {
  setLanguage(getLanguage() === 'fr' ? 'en' : 'fr');
  render();
});

/** Réapplique tous les textes (statiques et dépendant de l'état). */
function render() {
  applyTranslations();
  ui.lang.lang = getLanguage() === 'fr' ? 'en' : 'fr';
  setRevealed(ui.password.type === 'text');
  updateStrength();
  ui.copy.textContent = t(state.copyKey);
  if (state.items.length > 0) renderFile();
  if (state.result) renderResult();
  if (state.error) ui.error.textContent = t(state.error.key, state.error.params);
}

// ---------------------------------------------------------------------------
// Choix du fichier

ui.fileInput.addEventListener('change', () => {
  if (ui.fileInput.files.length > 0) selectItems(collectInput(ui.fileInput.files));
});
ui.pickFolder.addEventListener('click', () => ui.folderInput.click());
ui.folderInput.addEventListener('change', () => {
  // Un dossier vide ne déclenche parfois aucun fichier : on le signale.
  selectItems(collectInput(ui.folderInput.files));
});

for (const type of ['dragenter', 'dragover']) {
  ui.dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    ui.dropzone.classList.add('is-dragging');
  });
}
for (const type of ['dragleave', 'drop']) {
  ui.dropzone.addEventListener(type, () => ui.dropzone.classList.remove('is-dragging'));
}
// Un fichier lâché n'importe où sur la page (zone comprise) est pris en compte,
// et ne doit jamais remplacer la page.
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => {
  event.preventDefault();
  if (isBusy() || !ui.result.hidden || !event.dataTransfer) return;
  const dropped = entriesFromDrop(event.dataTransfer); // synchrone, avant tout await
  collectDrop(dropped).then(selectItems);
});

async function selectItems({ items, folder }) {
  hideError();
  if (items.length === 0) return showError('error.emptySelection');

  const archive = items.length > 1 || folder !== null;
  // Plusieurs fichiers chiffrés déposés ensemble : on ne les archive pas.
  const encryptedExts = Object.values(EXTENSIONS);
  if (archive && items.every(({ file }) => encryptedExts.some((ext) => file.name.toLowerCase().endsWith(ext)))) {
    return showError('error.multipleEncrypted');
  }

  Object.assign(state, { items, folder, archive, file: archive ? null : items[0].file });
  if (archive) {
    state.sourceFormat = null;
  } else {
    const head = new Uint8Array(await state.file.slice(0, DETECT_SIZE).arrayBuffer());
    state.sourceFormat = detectFormat(head);
  }
  state.mode = state.sourceFormat ? 'decrypt' : 'encrypt';
  ui.password.value = '';
  ui.confirm.value = '';
  ui.generated.hidden = true;
  renderFile();
  updateStrength();
  ui.password.focus();
}

function renderFile() {
  const { file, items, archive, folder, mode, sourceFormat } = state;
  const encrypting = mode === 'encrypt';
  const total = totalSize();
  const size = formatSize(total);
  ui.largeHint.hidden = canSaveDirectly || total < LARGE_FILE;

  ui.dropzone.classList.add('has-file');
  ui.emptyView.hidden = true;
  ui.fileView.hidden = false;
  ui.altPick.hidden = true;
  if (archive) {
    ui.fileName.textContent = archiveName(folder);
    ui.fileBadge.textContent = 'zip';
    ui.fileInfo.textContent = t('file.willArchive', { count: items.length, size });
  } else {
    ui.fileName.textContent = file.name;
    ui.fileBadge.textContent = encrypting ? extensionOf(file.name) : '🔒';
    ui.fileInfo.textContent = encrypting
      ? t('file.willEncrypt', { size })
      : t('file.willDecrypt', { size, format: sourceFormat });
  }

  ui.options.disabled = false;
  ui.confirmField.hidden = !encrypting;
  ui.formatField.hidden = !encrypting;
  ui.hint.hidden = !encrypting;
  ui.strength.hidden = !encrypting;
  ui.generate.hidden = !encrypting;
  ui.password.autocomplete = encrypting ? 'new-password' : 'current-password';
  ui.submit.textContent = t(encrypting ? 'action.encrypt' : 'action.decrypt');
}

// ---------------------------------------------------------------------------
// Mot de passe

ui.reveal.addEventListener('click', () => setRevealed(ui.password.type === 'password'));

function setRevealed(show) {
  for (const input of [ui.password, ui.confirm]) input.type = show ? 'text' : 'password';
  ui.reveal.setAttribute('aria-pressed', String(show));
  ui.reveal.setAttribute('aria-label', t(show ? 'password.hide' : 'password.show'));
}

ui.password.addEventListener('input', () => {
  updateStrength();
  clearInvalid();
  ui.generated.hidden = true;
});
ui.confirm.addEventListener('input', clearInvalid);

// La liste de mots (~60 Ko) n'est chargée qu'au premier clic, dans la langue de l'interface.
ui.generate.addEventListener('click', async () => {
  const { generatePassphrase } = await import('../src/passphrase.js');
  const { passphrase } = await generatePassphrase({ lang: getLanguage() });
  ui.password.value = passphrase;
  ui.confirm.value = passphrase;
  setRevealed(true);
  updateStrength();
  clearInvalid();
  setCopyLabel('generated.copy');
  ui.generated.hidden = false;
});

ui.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ui.password.value);
    setCopyLabel('generated.copied');
  } catch {
    ui.password.select();
    setCopyLabel('generated.selected');
  }
});

function setCopyLabel(key) {
  state.copyKey = key;
  ui.copy.textContent = t(key);
}

function updateStrength() {
  const value = ui.password.value;
  const { ratio, level, color } = assess(value);
  ui.strength.style.setProperty('--strength-color', color);
  ui.strengthFill.style.width = value ? `${Math.max(6, ratio * 100)}%` : '0';
  ui.strengthLabel.textContent = value ? t(`strength.${level}`) : '';
}

function clearInvalid() {
  ui.password.removeAttribute('aria-invalid');
  ui.confirm.removeAttribute('aria-invalid');
  hideError();
}

// ---------------------------------------------------------------------------
// Chiffrement / déchiffrement

ui.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.items.length === 0 || isBusy()) return;
  const password = ui.password.value;
  const encrypting = state.mode === 'encrypt';

  if (!password) {
    ui.password.setAttribute('aria-invalid', 'true');
    ui.password.focus();
    return showError('error.noPassword');
  }
  if (encrypting && password !== ui.confirm.value) {
    ui.confirm.setAttribute('aria-invalid', 'true');
    ui.confirm.focus();
    return showError('error.mismatch');
  }

  const format = encrypting ? ui.form.elements.format.value : null;
  const sourceName = state.archive ? archiveName(state.folder) : state.file.name;
  const outputName = encrypting ? encryptedName(sourceName, format) : decryptedName(sourceName);

  // Gros volume : on demande où enregistrer avant de commencer (le dialogue
  // doit s'ouvrir tant que le clic de l'utilisateur est « récent »).
  let handle;
  if (canSaveDirectly && totalSize() >= LARGE_FILE) {
    try {
      handle = await window.showSaveFilePicker({ suggestedName: outputName });
    } catch (err) {
      if (err.name === 'AbortError') return; // l'utilisateur a fermé le dialogue
      handle = undefined; // refusé (politique, iframe…) : on garde le résultat en mémoire
    }
  }

  run({ files: state.items, archive: state.archive, password, mode: state.mode, format, handle }, outputName);
});

const totalSize = () => state.items.reduce((sum, item) => sum + item.file.size, 0);

function run(job, outputName) {
  hideError();
  ui.form.hidden = true;
  ui.progress.hidden = false;
  setProgress(null, t('progress.key'), t('progress.keyDetail'));

  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  state.worker = worker;
  const verb = t(job.mode === 'encrypt' ? 'progress.encrypting' : 'progress.decrypting');

  worker.onmessage = ({ data }) => {
    switch (data.type) {
      case 'phase':
        if (data.phase === 'process') setProgress(0, verb, '');
        break;
      case 'progress':
        if (!ui.progressBar.classList.contains('is-indeterminate')) {
          const ratio = data.total ? data.done / data.total : 1;
          setProgress(
            ratio,
            `${verb} ${t('progress.percent', { n: Math.floor(ratio * 100) })}`,
            t('progress.of', { done: formatSize(data.done), total: formatSize(data.total) }),
          );
        }
        break;
      case 'done':
        stopWorker();
        showResult(job, outputName, data);
        break;
      case 'error':
        stopWorker();
        showFailure(data.code);
        break;
    }
  };
  worker.onerror = (event) => {
    event.preventDefault();
    stopWorker();
    showFailure('INTERNAL');
  };
  worker.postMessage(job);
}

function setProgress(ratio, label, detail) {
  const indeterminate = ratio === null;
  ui.progressBar.classList.toggle('is-indeterminate', indeterminate);
  ui.progressFill.style.width = indeterminate ? '' : `${ratio * 100}%`;
  if (indeterminate) ui.progressBar.removeAttribute('aria-valuenow');
  else ui.progressBar.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  ui.progressLabel.textContent = label;
  ui.progressDetail.textContent = detail;
}

function showResult(job, name, { blob, saved, size }) {
  const encrypting = job.mode === 'encrypt';
  // Déjà sur le disque : rien à télécharger, rien à perdre en quittant la page.
  state.downloadUrl = saved ? null : URL.createObjectURL(blob);
  state.downloaded = Boolean(saved);
  state.result = { encrypting, name, size, saved: Boolean(saved) };

  ui.progress.hidden = true;
  ui.result.hidden = false;
  ui.download.hidden = Boolean(saved);
  if (!saved) {
    ui.download.href = state.downloadUrl;
    ui.download.download = name;
  }
  renderResult();
  ui.password.value = '';
  ui.confirm.value = '';
  setRevealed(false);
  ui.generated.hidden = true;
  updateStrength();
  (saved ? ui.restart : ui.download).focus();
}

function renderResult() {
  const { encrypting, name, size, saved } = state.result;
  ui.resultTitle.textContent = t(encrypting ? 'result.encrypted' : 'result.decrypted');
  ui.resultDetail.textContent = saved
    ? t('result.saved', { name, size: formatSize(size) })
    : `${name} · ${formatSize(size)}`;
  ui.download.textContent = t('result.download', { name });
  ui.resultHint.hidden = encrypting || !name.toLowerCase().endsWith('.zip');
  ui.resultHint.textContent = t('result.zipHint');
}

function showFailure(code) {
  ui.progress.hidden = true;
  ui.form.hidden = false;
  showError(`error.${code}`);
  if (code === 'WRONG_PASSWORD') {
    ui.password.setAttribute('aria-invalid', 'true');
    ui.password.select();
  }
  ui.password.focus();
}

ui.restart.addEventListener('click', reset);

// Annuler : le worker est arrêté net, rien n'est conservé.
ui.cancel.addEventListener('click', () => {
  stopWorker();
  ui.progress.hidden = true;
  ui.form.hidden = false;
  ui.password.focus();
});

ui.download.addEventListener('click', () => {
  state.downloaded = true;
});

// Prévient avant de quitter la page pendant un traitement, ou si le résultat
// n'a pas encore été téléchargé : il serait perdu.
window.addEventListener('beforeunload', (event) => {
  if (isBusy() || (state.downloadUrl && !state.downloaded)) {
    event.preventDefault();
    event.returnValue = '';
  }
});

function reset() {
  stopWorker();
  if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
  Object.assign(state, {
    items: [],
    folder: null,
    archive: false,
    file: null,
    mode: 'encrypt',
    sourceFormat: null,
    downloadUrl: null,
    downloaded: false,
    result: null,
  });
  ui.fileInput.value = '';
  ui.folderInput.value = '';
  ui.password.value = '';
  ui.confirm.value = '';
  setRevealed(false);
  ui.generated.hidden = true;
  ui.altPick.hidden = false;
  ui.download.hidden = false;
  ui.largeHint.hidden = true;
  ui.dropzone.classList.remove('has-file');
  ui.emptyView.hidden = false;
  ui.fileView.hidden = true;
  ui.options.disabled = true;
  ui.result.hidden = true;
  ui.progress.hidden = true;
  ui.form.hidden = false;
  hideError();
  ui.fileInput.focus();
}

function stopWorker() {
  state.worker?.terminate();
  state.worker = null;
}

const isBusy = () => state.worker !== null;

// ---------------------------------------------------------------------------
// Utilitaires

function showError(key, params) {
  state.error = { key, params };
  ui.error.textContent = t(key, params);
  ui.error.hidden = false;
}

function hideError() {
  state.error = null;
  ui.error.hidden = true;
  ui.error.textContent = '';
}

function extensionOf(name) {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name);
  return match ? match[1] : t('file.badge');
}

function formatSize(bytes) {
  const units = t('units');
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  const number = new Intl.NumberFormat(getLanguage(), { maximumFractionDigits: 1 }).format(value);
  return `${number} ${units[unit]}`;
}
