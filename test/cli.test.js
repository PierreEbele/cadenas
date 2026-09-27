import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/cadenas.js', import.meta.url));
let dir;

/** Lance la CLI dans le dossier de test, mot de passe éventuel sur stdin. */
function cadenas(args, password) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd: dir,
    input: password === undefined ? undefined : `${password}\n`,
    encoding: 'utf8',
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

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

  test('refuse d’écraser sans -f, accepte avec -f', () => {
    writeFileSync(file('f.txt'), 'v1');
    assert.equal(cadenas(['lock', '--password-stdin', 'f.txt'], 'pwd').code, 0);
    const refused = cadenas(['lock', '--password-stdin', 'f.txt'], 'pwd');
    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /existe déjà/);
    assert.equal(cadenas(['lock', '-f', '--password-stdin', 'f.txt'], 'pwd').code, 0);
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

describe('erreurs et aide', () => {
  test('fichier introuvable', () => {
    const result = cadenas(['unlock', '--password-stdin', 'absent.cadenas'], 'pwd');
    assert.equal(result.code, 1);
    assert.match(result.stderr, /introuvable/);
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
    assert.equal(cadenas(['lock', 'a', 'b']).code, 2);
    assert.equal(cadenas(['unlock', '--age', 'x.age']).code, 2);
    assert.equal(cadenas(['lock', '--option-inconnue', 'x']).code, 2);
  });

  test('--help et --version', () => {
    const help = cadenas(['--help']);
    assert.equal(help.code, 0);
    assert.match(help.stdout, /cadenas lock <fichier>/);
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(cadenas(['--version']).stdout.trim(), version);
  });
});
