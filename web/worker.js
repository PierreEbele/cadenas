/**
 * Worker de chiffrement : la dérivation de clé et le chiffrement tournent ici
 * pour ne jamais figer la page.
 *
 * Message reçu :
 *   { mode: 'encrypt' | 'decrypt', password, format,
 *     files: [{ file, path }],   // un seul fichier, ou plusieurs à archiver
 *     archive: boolean,          // regrouper les fichiers dans un .zip avant chiffrement
 *     handle? }                  // FileSystemFileHandle : écrire directement sur le disque
 * Messages émis :
 *   { type: 'phase', phase: 'key' | 'process' }
 *   { type: 'progress', done, total }
 *   { type: 'done', blob | saved: true, size, format }
 *   { type: 'error', code }
 */
import { CadenasError, archiveSize, createArchive, decrypt, encrypt, prepareEntries } from '../src/core.js';

self.onmessage = async ({ data: job }) => {
  try {
    self.postMessage({ type: 'phase', phase: 'key' });
    const { stream: source, size } = openInput(job);
    const input = withProgress(source, size);

    let output;
    let format = job.format;
    if (job.mode === 'encrypt') {
      output = await encrypt(input, job.password, { format });
    } else {
      ({ stream: output, format } = await decrypt(input, job.password));
    }

    self.postMessage({ type: 'phase', phase: 'process' });
    if (job.handle) {
      // Écriture directe sur le disque (File System Access) : mémoire constante,
      // quelle que soit la taille. En cas d'erreur, pipeTo annule l'écriture et
      // le navigateur supprime le fichier temporaire.
      let written = 0;
      const counter = new TransformStream({
        transform(chunk, controller) {
          written += chunk.length;
          controller.enqueue(chunk);
        },
      });
      await output.pipeThrough(counter).pipeTo(await job.handle.createWritable());
      self.postMessage({ type: 'progress', done: size, total: size });
      self.postMessage({ type: 'done', saved: true, size: written, format });
      return;
    }

    const parts = [];
    const reader = output.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }
    const blob = new Blob(parts, { type: 'application/octet-stream' });
    self.postMessage({ type: 'progress', done: size, total: size });
    self.postMessage({ type: 'done', blob, size: blob.size, format });
  } catch (err) {
    if (!(err instanceof CadenasError)) console.error(err);
    self.postMessage({ type: 'error', code: err instanceof CadenasError ? err.code : 'INTERNAL' });
  }
};

/** Flux d'entrée : le fichier seul, ou l'archive .zip de tous les fichiers. */
function openInput({ files, archive }) {
  if (!archive) return { stream: files[0].file.stream(), size: files[0].file.size };
  const entries = prepareEntries(
    files.map(({ file, path }) => ({
      path,
      size: file.size,
      lastModified: new Date(file.lastModified),
      open: () => file.stream(),
    })),
  );
  return { stream: createArchive(entries), size: archiveSize(entries) };
}

/** Relaie un flux en signalant régulièrement le nombre d'octets lus. */
function withProgress(stream, total) {
  let done = 0;
  let lastReport = 0;
  return stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        done += chunk.length;
        const now = performance.now();
        if (now - lastReport > 80) {
          lastReport = now;
          self.postMessage({ type: 'progress', done, total });
        }
        controller.enqueue(chunk);
      },
    }),
  );
}
