import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { loadWordlist } from '../src/passphrase.js';

const BIN = fileURLToPath(new URL('../bin/cadenas.js', import.meta.url));
let dir;

// Messages en français, quelle que soit la langue de la machine de test.
const FRENCH = { ...process.env, LC_ALL: 'fr_FR.UTF-8' };
const ENGLISH = { ...process.env, LC_ALL: 'en_US.UTF-8' };

/** Lance la CLI dans le dossier de test, mot de passe éventuel sur stdin. */
function cadenas(args, password, env = FRENCH) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd: dir,
    env,
    input: password === undefined ? undefined : `${password}\n`,
    encoding: 'utf8',
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** Variante binaire : `input` envoyé tel quel sur stdin, stdout récupéré en octets. */
function cadenasRaw(args, input) {
  const result = spawnSync(process.execPath, [BIN, ...args], { cwd: dir, env: FRENCH, input, maxBuffer: 64 * 1024 * 1024 });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr.toString() };
}

const today = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const file = (name) => join(dir, name);

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'cadenas-cli-'));
});
after(() => rmSync(dir, { recursive: true, force: true }));

describe('lock / unlock', () => {
  test('aller-retour au format .cadenas', () => {
    const content = Buffer.from('contenu secret ✓');
    writeFileSync(file('a.txt'), content);

    const locked = cadenas(['lock', '--password-stdin', 'a.txt'], 'pwd');
    assert.equal(locked.code, 0, locked.stderr);
    assert.equal(readFileSync(file('a.txt.cadenas')).subarray(0, 7).toString(), 'CADENAS');

    rmSync(file('a.txt'));
    const unlocked = cadenas(['unlock', '--password-stdin', 'a.txt.cadenas'], 'pwd');
    assert.equal(unlocked.code, 0, unlocked.stderr);
    assert.deepEqual(readFileSync(file('a.txt')), content);
  });

  test('aller-retour au format age, avec -o', () => {
    writeFileSync(file('b.txt'), 'age !');
    assert.equal(cadenas(['lock', '--age', '--password-stdin', '-o', 'b.age', 'b.txt'], 'pwd').code, 0);
    assert.match(readFileSync(file('b.age'), 'utf8'), /^age-encryption\.org\/v1\n/);
    assert.equal(cadenas(['unlock', '--password-stdin', '-o', 'b-out.txt', 'b.age'], 'pwd').code, 0);
    assert.equal(readFileSync(file('b-out.txt'), 'utf8'), 'age !');
  });

  test('les alias encrypt / decrypt fonctionnent', () => {
    writeFileSync(file('c.txt'), 'alias');
    assert.equal(cadenas(['encrypt', '--password-stdin', 'c.txt'], 'pwd').code, 0);
    assert.equal(cadenas(['decrypt', '--password-stdin', '-o', 'c2.txt', 'c.txt.cadenas'], 'pwd').code, 0);
    assert.equal(readFileSync(file('c2.txt'), 'utf8'), 'alias');
  });
});

describe('sécurité des fichiers', () => {
  test('mauvais mot de passe : erreur et aucun fichier écrit', () => {
    writeFileSync(file('d.txt'), 'x');
    cadenas(['lock', '--password-stdin', 'd.txt'], 'bon');
    rmSync(file('d.txt'));
    const before = readdirSync(dir).sort();

    const result = cadenas(['unlock', '--password-stdin', 'd.txt.cadenas'], 'mauvais');
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Mot de passe incorrect/);
    assert.deepEqual(readdirSync(dir).sort(), before);
  });

  test('fichier altéré : erreur et aucun fichier écrit', () => {
    writeFileSync(file('e.txt'), Buffer.alloc(200_000, 7));
    cadenas(['lock', '--password-stdin', 'e.txt'], 'pwd');
    const sealed = readFileSync(file('e.txt.cadenas'));
    sealed[sealed.length - 10] ^= 1;
    writeFileSync(file('e.txt.cadenas'), sealed);

    const result = cadenas(['unlock', '--password-stdin', '-o', 'e-out.txt', 'e.txt.cadenas'], 'pwd');
    assert.equal(result.code, 1);
    assert.match(result.stderr, /endommagé|modifié/);
    assert.equal(existsSync(file('e-out.txt')), false);
    assert.equal(readdirSync(dir).some((name) => name.endsWith('.tmp')), false);
  });

  test('-f écrase aussi un fichier en lecture seule', () => {
    writeFileSync(file('ro.txt'), 'nouveau');
    writeFileSync(file('ro.cadenas'), 'ancien');
    chmodSync(file('ro.cadenas'), 0o444);
    const result = cadenas(['lock', '-f', '--password-stdin', '-o', 'ro.cadenas', 'ro.txt'], 'pwd');
    assert.equal(result.code, 0, result.stderr);
    assert.equal(readFileSync(file('ro.cadenas')).subarray(0, 7).toString(), 'CADENAS');
  });

  test('fichier produit lisible par son seul propriétaire', { skip: process.platform === 'win32' }, () => {
    writeFileSync(file('perm.txt'), 'secret');
    cadenas(['lock', '--password-stdin', 'perm.txt'], 'pwd');
    rmSync(file('perm.txt'));
    cadenas(['unlock', '--password-stdin', 'perm.txt.cadenas'], 'pwd');
    assert.equal(statSync(file('perm.txt')).mode & 0o777, 0o600);
  });

  test('Ctrl+C pendant l’écriture : fichier temporaire supprimé', { skip: process.platform === 'win32' }, async () => {
    writeFileSync(file('sig-pwd.txt'), 'pwd');
    const child = spawn(process.execPath, [BIN, 'lock', '-', '--password-file', 'sig-pwd.txt', '-o', 'sig.cadenas'], {
      cwd: dir,
      env: FRENCH,
    });
    child.stdin.write(Buffer.alloc(200_000, 1)); // données envoyées, entrée laissée ouverte
    const temp = () => readdirSync(dir).find((name) => name.startsWith('.sig.cadenas.') && name.endsWith('.tmp'));
    for (let i = 0; i < 200 && !temp(); i++) await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(temp(), 'fichier temporaire créé');
    const code = new Promise((resolve) => child.on('exit', resolve));
    child.kill('SIGINT');
    assert.equal(await code, 130);
    assert.equal(temp(), undefined);
    assert.equal(existsSync(file('sig.cadenas')), false);
  });

  test('refuse d’écraser sans -f, accepte avec -f', () => {
    writeFileSync(file('f.txt'), 'v1');
    assert.equal(cadenas(['lock', '--password-stdin', 'f.txt'], 'pwd').code, 0);
    const refused = cadenas(['lock', '--password-stdin', 'f.txt'], 'pwd');
    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /existe déjà/);
    assert.equal(cadenas(['lock', '-f', '--password-stdin', 'f.txt'], 'pwd').code, 0);
  });
});

describe('plusieurs fichiers et dossiers', () => {
  test('un dossier devient dossier.zip.cadenas, arborescence préservée', () => {
    mkdirSync(file('photos/été'), { recursive: true });
    mkdirSync(file('photos/vide'), { recursive: true });
    writeFileSync(file('photos/a.jpg'), 'image a');
    writeFileSync(file('photos/été/b.jpg'), 'image b');

    const locked = cadenas(['lock', '--password-stdin', 'photos'], 'pwd');
    assert.equal(locked.code, 0, locked.stderr);
    assert.match(locked.stderr, /2 fichiers chiffrés/);
    assert.ok(existsSync(file('photos.zip.cadenas')));

    const unlocked = cadenas(['unlock', '--password-stdin', 'photos.zip.cadenas'], 'pwd');
    assert.equal(unlocked.code, 0, unlocked.stderr);
    const files = unzipSync(readFileSync(file('photos.zip')));
    assert.deepEqual(Object.keys(files).sort(), ['photos/a.jpg', 'photos/été/b.jpg']);
    assert.equal(new TextDecoder().decode(files['photos/été/b.jpg']), 'image b');
  });

  test('plusieurs fichiers : archive datée par défaut, ou nom choisi avec -o', () => {
    writeFileSync(file('m1.txt'), 'un');
    writeFileSync(file('m2.txt'), 'deux');
    assert.equal(cadenas(['lock', '--password-stdin', 'm1.txt', 'm2.txt'], 'pwd').code, 0);
    assert.ok(existsSync(file(`cadenas-${today()}.zip.cadenas`)));

    assert.equal(cadenas(['lock', '--password-stdin', '-o', 'lot.zip.cadenas', 'm1.txt', 'm2.txt', 'photos'], 'pwd').code, 0);
    cadenas(['unlock', '--password-stdin', 'lot.zip.cadenas'], 'pwd');
    assert.deepEqual(Object.keys(unzipSync(readFileSync(file('lot.zip')))).sort(), [
      'm1.txt',
      'm2.txt',
      'photos/a.jpg',
      'photos/été/b.jpg',
    ]);
  });

  test('--hide-name : fichier seul ou dossier dans une archive au nom neutre', () => {
    mkdirSync(file('cache'), { recursive: true });
    writeFileSync(file('cache/bilan-confidentiel.pdf'), 'secret');
    const neutral = `cadenas-${today()}.zip.cadenas`;

    const locked = cadenas(['lock', '--hide-name', '--password-stdin', 'cache/bilan-confidentiel.pdf'], 'pwd');
    assert.equal(locked.code, 0, locked.stderr);
    assert.deepEqual(readdirSync(file('cache')).sort(), ['bilan-confidentiel.pdf', neutral]);

    const unlocked = cadenas(['unlock', '--password-stdin', `cache/${neutral}`], 'pwd');
    assert.equal(unlocked.code, 0, unlocked.stderr);
    const files = unzipSync(readFileSync(file(`cache/cadenas-${today()}.zip`)));
    assert.deepEqual(Object.keys(files), ['bilan-confidentiel.pdf']);

    rmSync(file(`cache/${neutral}`));
    rmSync(file(neutral), { force: true }); // laissé par un test précédent
    assert.equal(cadenas(['lock', '--hide-name', '--password-stdin', 'cache'], 'pwd').code, 0);
    assert.ok(existsSync(file(neutral)));
  });

  test('--hide-name refusé hors de lock ou avec l’entrée standard', () => {
    assert.equal(cadenas(['unlock', '--hide-name', 'a.cadenas']).code, 2);
    assert.equal(cadenas(['lock', '--hide-name', '-', '--password-file', 'x']).code, 2);
  });

  test('dossier vide refusé', () => {
    mkdirSync(file('rien'), { recursive: true });
    const result = cadenas(['lock', '--password-stdin', 'rien'], 'pwd');
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Aucun fichier/);
  });

  test('un seul fichier à la fois au déchiffrement', () => {
    assert.equal(cadenas(['unlock', 'a.cadenas', 'b.cadenas']).code, 2);
  });
});

describe('entrée et sortie standard', () => {
  test('stdin → stdout, dans les deux sens, avec --password-file', () => {
    writeFileSync(file('secret.txt'), 'motdepasse\n');
    const data = Buffer.alloc(300_000);
    for (let i = 0; i < data.length; i += 65536) crypto.getRandomValues(data.subarray(i, i + 65536));

    const locked = cadenasRaw(['lock', '-', '--password-file', 'secret.txt'], data);
    assert.equal(locked.code, 0, locked.stderr);
    assert.equal(locked.stdout.subarray(0, 7).toString(), 'CADENAS');

    const unlocked = cadenasRaw(['unlock', '-', '--password-file', 'secret.txt'], locked.stdout);
    assert.equal(unlocked.code, 0, unlocked.stderr);
    assert.deepEqual(unlocked.stdout, data);
  });

  test('-o - : un fichier vers la sortie standard', () => {
    writeFileSync(file('o.txt'), 'vers stdout');
    cadenas(['lock', '--password-stdin', 'o.txt'], 'pwd');
    const result = cadenasRaw(['unlock', '--password-file', 'secret.txt', '-o', '-', 'o.txt.cadenas'], undefined);
    assert.equal(result.code, 1); // mauvais mot de passe dans secret.txt
    writeFileSync(file('pwd.txt'), 'pwd');
    const ok = cadenasRaw(['unlock', '--password-file', 'pwd.txt', '-o', '-', 'o.txt.cadenas'], undefined);
    assert.equal(ok.code, 0, ok.stderr);
    assert.equal(ok.stdout.toString(), 'vers stdout');
  });

  test('stdin chiffré mais altéré : code d’erreur non nul', () => {
    const locked = cadenasRaw(['lock', '-', '--password-file', 'secret.txt'], Buffer.alloc(200_000, 1));
    locked.stdout[locked.stdout.length - 5] ^= 1;
    const result = cadenasRaw(['unlock', '-', '--password-file', 'secret.txt'], locked.stdout);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /endommagé|modifié/);
  });

  test('combinaisons interdites : code 2', () => {
    assert.equal(cadenas(['lock', '-', '--password-stdin']).code, 2);
    assert.equal(cadenas(['lock', '-', 'a.txt']).code, 2);
    assert.equal(cadenas(['lock', '--password-stdin', '--password-file', 'secret.txt', 'a.txt']).code, 2);
  });
});

describe('verify', () => {
  test('bon mot de passe : code 0, taille déchiffrée, aucun fichier écrit', () => {
    writeFileSync(file('v.txt'), Buffer.alloc(150_000, 3));
    cadenas(['lock', '--password-stdin', 'v.txt'], 'pwd');
    rmSync(file('v.txt'));
    const before = readdirSync(dir).sort();

    const result = cadenas(['verify', '--password-stdin', 'v.txt.cadenas'], 'pwd');
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stderr, /intact.*format cadenas, 150,0 ko/);
    assert.deepEqual(readdirSync(dir).sort(), before);
  });

  test('fichier age et entrée standard', () => {
    writeFileSync(file('va.txt'), 'age');
    cadenas(['lock', '--age', '--password-stdin', 'va.txt'], 'pwd');
    writeFileSync(file('pwd.txt'), 'pwd');
    const result = cadenasRaw(['verify', '-', '--password-file', 'pwd.txt'], readFileSync(file('va.txt.age')));
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stderr, /format age, 3 octets/);
  });

  test('mauvais mot de passe ou fichier altéré : code 1', () => {
    const wrong = cadenas(['verify', '--password-stdin', 'v.txt.cadenas'], 'mauvais');
    assert.equal(wrong.code, 1);
    assert.match(wrong.stderr, /Mot de passe incorrect/);

    const sealed = readFileSync(file('v.txt.cadenas'));
    sealed[sealed.length - 10] ^= 1;
    writeFileSync(file('v-altere.cadenas'), sealed);
    const altered = cadenas(['verify', '--password-stdin', 'v-altere.cadenas'], 'pwd');
    assert.equal(altered.code, 1);
    assert.match(altered.stderr, /endommagé|modifié/);
  });

  test('options qui écrivent un fichier refusées : code 2', () => {
    assert.equal(cadenas(['verify', '-o', 'x.txt', 'v.txt.cadenas']).code, 2);
    assert.equal(cadenas(['verify', '-f', 'v.txt.cadenas']).code, 2);
    assert.equal(cadenas(['verify', '--age', 'v.txt.cadenas']).code, 2);
    assert.equal(cadenas(['verify', 'a.cadenas', 'b.cadenas']).code, 2);
  });
});

describe('passphrase', () => {
  test('5 mots français par défaut, sur stdout', () => {
    const result = cadenas(['passphrase']);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout.trim().split(' ').length, 5);
  });

  test('--words et --lang', () => {
    const result = cadenas(['passphrase', '--words', '7', '--lang', 'en']);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout.trim().split(' ').length, 7);
  });

  test('valeurs invalides : code 2', () => {
    assert.equal(cadenas(['passphrase', '--words', '2']).code, 2);
    assert.equal(cadenas(['passphrase', '--words', 'dix']).code, 2);
    assert.equal(cadenas(['passphrase', '--lang', 'de']).code, 2);
    assert.equal(cadenas(['passphrase', 'fichier.txt']).code, 2);
  });
});

describe('messages en anglais', () => {
  test('aide, erreurs et résultats suivent la langue du système', () => {
    assert.match(cadenas(['--help'], undefined, ENGLISH).stdout, /^cadenas .* — encrypt a file with a password\n\nUsage:/);

    const usage = cadenas(['inconnue', 'x'], undefined, ENGLISH);
    assert.equal(usage.code, 2);
    assert.match(usage.stderr, /^Error: Unknown command: inconnue\.[\s\S]*Help: cadenas --help/);

    writeFileSync(file('en.txt'), 'english');
    const locked = cadenas(['lock', '--password-stdin', 'en.txt'], 'pwd', ENGLISH);
    assert.equal(locked.code, 0, locked.stderr);
    assert.match(locked.stderr, /✔ File encrypted: en\.txt\.cadenas/);

    const wrong = cadenas(['unlock', '--password-stdin', '-o', 'en-out.txt', 'en.txt.cadenas'], 'wrong', ENGLISH);
    assert.equal(wrong.code, 1);
    assert.equal(wrong.stderr, 'Error: Wrong password.\n');

    const verified = cadenas(['verify', '--password-stdin', 'en.txt.cadenas'], 'pwd', ENGLISH);
    assert.match(verified.stderr, /intact and password correct \(cadenas format, 7 bytes once decrypted\)/);
  });

  test('la phrase de passe suit la langue de l’interface, sauf --lang', async () => {
    const lists = { en: new Set(await loadWordlist('en')), fr: new Set(await loadWordlist('fr')) };
    const words = (env, args = []) => cadenas(['passphrase', '--words', '8', ...args], undefined, env).stdout.trim().split(' ');
    assert.ok(words(ENGLISH).every((word) => lists.en.has(word)));
    assert.ok(words(FRENCH).every((word) => lists.fr.has(word)));
    assert.ok(words(ENGLISH, ['--lang', 'fr']).every((word) => lists.fr.has(word)));
  });
});

describe('erreurs et aide', () => {
  test('fichier introuvable', () => {
    const result = cadenas(['unlock', '--password-stdin', 'absent.cadenas'], 'pwd');
    assert.equal(result.code, 1);
    assert.match(result.stderr, /introuvable/i);
  });

  test('fichier non chiffré passé à unlock', () => {
    writeFileSync(file('g.txt'), 'pas chiffré');
    const result = cadenas(['unlock', '--password-stdin', 'g.txt'], 'pwd');
    assert.equal(result.code, 1);
    assert.match(result.stderr, /ni un fichier \.cadenas ni un fichier \.age/);
  });

  test('mot de passe vide refusé', () => {
    writeFileSync(file('h.txt'), 'x');
    const result = cadenas(['lock', '--password-stdin', 'h.txt'], '');
    assert.equal(result.code, 1);
    assert.match(result.stderr, /vide/);
    assert.equal(existsSync(file('h.txt.cadenas')), false);
  });

  test('sans terminal ni --password-stdin : message explicite', () => {
    writeFileSync(file('i.txt'), 'x');
    const result = cadenas(['lock', 'i.txt'], '');
    assert.equal(result.code, 1);
    assert.match(result.stderr, /--password-stdin/);
  });

  test('erreurs d’utilisation : code 2', () => {
    assert.equal(cadenas(['inconnue', 'x']).code, 2);
    assert.equal(cadenas(['lock']).code, 2);
    assert.equal(cadenas(['unlock', '--age', 'x.age']).code, 2);
    assert.equal(cadenas(['lock', '--option-inconnue', 'x']).code, 2);
  });

  test('--help et --version', () => {
    const help = cadenas(['--help']);
    assert.equal(help.code, 0);
    assert.match(help.stdout, /cadenas lock <fichier/);
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(cadenas(['--version']).stdout.trim(), version);
  });
});
