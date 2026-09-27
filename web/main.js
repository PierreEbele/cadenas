import { DETECT_SIZE, detectFormat } from '../src/detect.js';
import { decryptedName, encryptedName } from '../src/names.js';
import { version } from '../package.json';
import { assess } from './strength.js';

const $ = (id) => document.getElementById(id);

const ui = {
  form: $('form'),
  dropzone: $('dropzone'),
  fileInput: $('file'),
  emptyView: document.querySelector('.dropzone-empty'),
  fileView: document.querySelector('.dropzone-file'),
  fileBadge: $('file-badge'),
  fileName: $('file-name'),
  fileInfo: $('file-info'),
  options: $('options'),
  password: $('password'),
  reveal: $('reveal'),
  strength: $('strength'),
  strengthFill: $('strength-fill'),
  strengthLabel: $('strength-label'),
  confirmField: $('confirm-field'),
  confirm: $('confirm'),
  formatField: $('format-field'),
  hint: $('password-hint'),
  submit: $('submit'),
  progress: $('progress'),
  progressBar: $('progress-bar'),
  progressFill: $('progress-fill'),
  progressLabel: $('progress-label'),
  progressDetail: $('progress-detail'),
  result: $('result'),
  resultTitle: $('result-title'),
  resultDetail: $('result-detail'),
  download: $('download'),
  restart: $('restart'),
  error: $('error'),
};

const state = {
  file: null,
  mode: 'encrypt', // 'encrypt' | 'decrypt'
  sourceFormat: null, // format détecté si le fichier est déjà chiffré
  worker: null,
  downloadUrl: null,
};

ui.fileInput.value = '';
$('version').textContent = `v${version}`;

// ---------------------------------------------------------------------------
// Choix du fichier

ui.fileInput.addEventListener('change', () => {
  const [file] = ui.fileInput.files;
  if (file) selectFile(file);
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
ui.dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  const [file] = event.dataTransfer.files;
  if (file && !isBusy()) selectFile(file);
});
// Un fichier lâché à côté de la zone ne doit pas remplacer la page.
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => {
  event.preventDefault();
  const [file] = event.dataTransfer?.files ?? [];
  if (file && !isBusy() && ui.result.hidden) selectFile(file);
});

async function selectFile(file) {
  hideError();
  const head = new Uint8Array(await file.slice(0, DETECT_SIZE).arrayBuffer());
  state.file = file;
  state.sourceFormat = detectFormat(head);
  state.mode = state.sourceFormat ? 'decrypt' : 'encrypt';
  renderFile();
  ui.password.value = '';
  ui.confirm.value = '';
  updateStrength();
  ui.password.focus();
}

function renderFile() {
  const { file, mode, sourceFormat } = state;
  const encrypting = mode === 'encrypt';

  ui.dropzone.classList.add('has-file');
  ui.emptyView.hidden = true;
  ui.fileView.hidden = false;
  ui.fileName.textContent = file.name;
  ui.fileBadge.textContent = encrypting ? extensionOf(file.name) : '🔒';
  ui.fileInfo.textContent = encrypting
    ? `${formatSize(file.size)} · sera chiffré`
    : `${formatSize(file.size)} · fichier ${sourceFormat === 'age' ? 'age' : 'cadenas'} chiffré, sera déchiffré`;

  ui.options.disabled = false;
  ui.confirmField.hidden = !encrypting;
  ui.formatField.hidden = !encrypting;
  ui.hint.hidden = !encrypting;
  ui.strength.hidden = !encrypting;
  ui.password.autocomplete = encrypting ? 'new-password' : 'current-password';
  ui.submit.textContent = encrypting ? 'Chiffrer' : 'Déchiffrer';
}

// ---------------------------------------------------------------------------
// Mot de passe

ui.reveal.addEventListener('click', () => {
  const show = ui.password.type === 'password';
  for (const input of [ui.password, ui.confirm]) input.type = show ? 'text' : 'password';
  ui.reveal.setAttribute('aria-pressed', String(show));
  ui.reveal.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
});

ui.password.addEventListener('input', () => {
  updateStrength();
  clearInvalid();
});
ui.confirm.addEventListener('input', clearInvalid);

function updateStrength() {
  const value = ui.password.value;
  const { ratio, label, color } = assess(value);
  ui.strength.style.setProperty('--strength-color', color);
  ui.strengthFill.style.width = value ? `${Math.max(6, ratio * 100)}%` : '0';
  ui.strengthLabel.textContent = value ? label : '';
}

function clearInvalid() {
  ui.password.removeAttribute('aria-invalid');
  ui.confirm.removeAttribute('aria-invalid');
  hideError();
}

// ---------------------------------------------------------------------------
// Chiffrement / déchiffrement

ui.form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!state.file || isBusy()) return;
  const password = ui.password.value;
  const encrypting = state.mode === 'encrypt';

  if (!password) {
    ui.password.setAttribute('aria-invalid', 'true');
    ui.password.focus();
    return showError('Saisissez un mot de passe.');
  }
  if (encrypting && password !== ui.confirm.value) {
    ui.confirm.setAttribute('aria-invalid', 'true');
    ui.confirm.focus();
    return showError('Les deux mots de passe ne correspondent pas.');
  }

  const format = encrypting ? ui.form.elements.format.value : null;
  run({ file: state.file, password, mode: state.mode, format });
});

function run(job) {
  hideError();
  ui.form.hidden = true;
  ui.progress.hidden = false;
  setProgress(null, 'Préparation de la clé…', 'Cette étape prend volontairement une à quelques secondes.');

  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  state.worker = worker;
  const verb = job.mode === 'encrypt' ? 'Chiffrement' : 'Déchiffrement';

  worker.onmessage = ({ data }) => {
    switch (data.type) {
      case 'phase':
        if (data.phase === 'process') setProgress(0, `${verb}…`, '');
        break;
      case 'progress':
        if (!ui.progressBar.classList.contains('is-indeterminate')) {
          const ratio = data.total ? data.done / data.total : 1;
          setProgress(ratio, `${verb}… ${Math.floor(ratio * 100)} %`,
            `${formatSize(data.done)} sur ${formatSize(data.total)}`);
        }
        break;
      case 'done':
        stopWorker();
        showResult(job, data);
        break;
      case 'error':
        stopWorker();
        showFailure(data);
        break;
    }
  };
  worker.onerror = (event) => {
    event.preventDefault();
    stopWorker();
    showFailure({ code: 'INTERNAL', message: 'Une erreur inattendue est survenue.' });
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

function showResult(job, { blob, format }) {
  const encrypting = job.mode === 'encrypt';
  const name = encrypting ? encryptedName(job.file.name, format) : decryptedName(job.file.name);
  state.downloadUrl = URL.createObjectURL(blob);

  ui.progress.hidden = true;
  ui.result.hidden = false;
  ui.resultTitle.textContent = encrypting ? 'Fichier chiffré' : 'Fichier déchiffré';
  ui.resultDetail.textContent = `${name} · ${formatSize(blob.size)}`;
  ui.download.href = state.downloadUrl;
  ui.download.download = name;
  ui.download.textContent = `Télécharger ${name}`;
  ui.password.value = '';
  ui.confirm.value = '';
  updateStrength();
  ui.download.focus();
}

function showFailure({ code, message }) {
  ui.progress.hidden = true;
  ui.form.hidden = false;
  showError(message);
  if (code === 'WRONG_PASSWORD') {
    ui.password.setAttribute('aria-invalid', 'true');
    ui.password.select();
  }
  ui.password.focus();
}

ui.restart.addEventListener('click', reset);

function reset() {
  stopWorker();
  if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
  Object.assign(state, { file: null, mode: 'encrypt', sourceFormat: null, downloadUrl: null });
  ui.fileInput.value = '';
  ui.password.value = '';
  ui.confirm.value = '';
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

function showError(message) {
  ui.error.textContent = message;
  ui.error.hidden = false;
}

function hideError() {
  ui.error.hidden = true;
  ui.error.textContent = '';
}

function extensionOf(name) {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name);
  return match ? match[1] : 'fichier';
}

const sizeFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
function formatSize(bytes) {
  const units = ['octets', 'Ko', 'Mo', 'Go', 'To'];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${sizeFormat.format(value)} ${units[unit]}`;
}
