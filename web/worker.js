/**
 * Worker de chiffrement : la dérivation de clé et le chiffrement tournent ici
 * pour ne jamais figer la page.
 *
 * Messages reçus : { file, password, mode: 'encrypt' | 'decrypt', format }
 * Messages émis :
 *   { type: 'phase', phase: 'key' | 'process' }
 *   { type: 'progress', done, total }
 *   { type: 'done', blob, format }
 *   { type: 'error', code, message }
 */
import { CadenasError, decrypt, encrypt } from '../src/core.js';

self.onmessage = async ({ data }) => {
  const { file, password, mode, format } = data;
  try {
    self.postMessage({ type: 'phase', phase: 'key' });
    const input = withProgress(file.stream(), file.size);

    let output;
    let outputFormat = format;
    if (mode === 'encrypt') {
      output = await encrypt(input, password, { format });
    } else {
      ({ stream: output, format: outputFormat } = await decrypt(input, password));
    }

    self.postMessage({ type: 'phase', phase: 'process' });
    const parts = [];
    const reader = output.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }
    const blob = new Blob(parts, { type: 'application/octet-stream' });
    self.postMessage({ type: 'progress', done: file.size, total: file.size });
    self.postMessage({ type: 'done', blob, format: outputFormat });
  } catch (err) {
    if (err instanceof CadenasError) {
      self.postMessage({ type: 'error', code: err.code, message: err.message });
    } else {
      console.error(err);
      self.postMessage({
        type: 'error',
        code: 'INTERNAL',
        message: 'Une erreur inattendue est survenue. Le fichier est peut-être trop volumineux pour ce navigateur.',
      });
    }
  }
};

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
