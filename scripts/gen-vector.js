// Régénère test/fixtures/vector-v1.json. À ne relancer que si le format change
// (ce qui impose une nouvelle version du format, pas une modification de v1).
import { writeFileSync } from 'node:fs';
import { encrypt } from '../src/format-cadenas.js';
import { readAll, streamFromBytes } from '../src/bytes.js';

const vector = {
  password: 'cadenas',
  plaintext: 'Bonjour cadenas !',
  salt: '01'.repeat(16),
  noncePrefix: '02'.repeat(16),
  params: { m: 256, t: 1, p: 1 },
};

const sealed = await readAll(
  await encrypt(streamFromBytes(new TextEncoder().encode(vector.plaintext)), vector.password, {
    params: vector.params,
    salt: Buffer.from(vector.salt, 'hex'),
    noncePrefix: Buffer.from(vector.noncePrefix, 'hex'),
  }),
);
vector.ciphertext = Buffer.from(sealed).toString('hex');

const target = new URL('../test/fixtures/vector-v1.json', import.meta.url);
writeFileSync(target, JSON.stringify(vector, null, 2) + '\n');
console.log(`Écrit ${target.pathname}`);
