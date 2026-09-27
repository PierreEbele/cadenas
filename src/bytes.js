/**
 * File d'octets : accumule des morceaux de taille arbitraire venant d'un flux
 * et permet d'en retirer des blocs de taille fixe sans recopier tout le tampon
 * à chaque ajout.
 */
export class ByteQueue {
  #chunks = [];
  #length = 0;

  get length() {
    return this.#length;
  }

  push(chunk) {
    if (chunk.length === 0) return;
    this.#chunks.push(chunk);
    this.#length += chunk.length;
  }

  /** Retire et renvoie exactement `n` octets (n <= length). */
  take(n) {
    if (n > this.#length) throw new RangeError('ByteQueue: pas assez d’octets');
    const out = new Uint8Array(n);
    let offset = 0;
    while (offset < n) {
      const head = this.#chunks[0];
      const needed = n - offset;
      if (head.length <= needed) {
        out.set(head, offset);
        offset += head.length;
        this.#chunks.shift();
      } else {
        out.set(head.subarray(0, needed), offset);
        this.#chunks[0] = head.subarray(needed);
        offset += needed;
      }
    }
    this.#length -= n;
    return out;
  }

  /** Retire et renvoie tout le contenu. */
  takeAll() {
    return this.take(this.#length);
  }
}

/** Lit un ReadableStream entier dans un seul Uint8Array. */
export async function readAll(stream) {
  // getReader() plutôt que `for await` : Safari ne sait pas itérer un ReadableStream.
  const reader = stream.getReader();
  const queue = new ByteQueue();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    queue.push(value);
  }
  return queue.takeAll();
}

/** Crée un ReadableStream qui émet un unique Uint8Array. */
export function streamFromBytes(bytes) {
  return new ReadableStream({
    start(controller) {
      if (bytes.length > 0) controller.enqueue(bytes);
      controller.close();
    },
  });
}
