// Convertit les listes de mots sources en modules JS (src/wordlists/*.js).
// Usage : node scripts/build-wordlists.js <wordlist_fr_8192.txt> <eff_large_wordlist.txt>
//
// Sources :
// - fr : liste française de Tango pour Tails (8192 mots, CC0)
//        https://theworld.com/~reinhold/wordlist_fr_8192.txt
// - en : EFF Large Wordlist (7776 mots, CC BY 3.0 US)
//        https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt
import { readFileSync, writeFileSync } from 'node:fs';

const [frPath, enPath] = process.argv.slice(2);

function parse(path) {
  const words = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/).pop()?.toLowerCase()) // retire les numéros de dés éventuels
    .filter(Boolean);
  // La liste française contient « internet » et « Internet » : un seul est gardé.
  return [...new Set(words)];
}

function check(name, words, expected) {
  const unique = new Set(words);
  if (words.length !== expected) throw new Error(`${name} : ${words.length} mots au lieu de ${expected}`);
  if (unique.size !== words.length) throw new Error(`${name} : doublons`);
  // Minuscules ASCII et tirets (EFF : « t-shirt », « yo-yo »…) : jamais d'espace.
  const bad = words.filter((w) => !/^[a-z]+(-[a-z]+)*$/.test(w));
  if (bad.length) throw new Error(`${name} : mots invalides : ${bad.slice(0, 5).join(', ')}`);
}

function write(file, header, words) {
  const body = `${header}\nexport default ${JSON.stringify(words.join(' '))};\n`;
  writeFileSync(new URL(`../src/wordlists/${file}`, import.meta.url), body);
}

const fr = parse(frPath);
const en = parse(enPath);
check('fr', fr, 8191);
check('en', en, 7776);

write(
  'fr.js',
  '// Liste française de Tango pour Tails OS (projet Tor) : 8192 mots, 8191 après\n' +
    '// passage en minuscules (« Internet » faisait doublon avec « internet »).\n' +
    '// Domaine public (CC0 1.0). Source : https://theworld.com/~reinhold/wordlist_fr_8192.txt',
  fr,
);
write(
  'en.js',
  '// EFF Large Wordlist (7776 words), by the Electronic Frontier Foundation.\n' +
    '// Licensed under CC BY 3.0 US: https://creativecommons.org/licenses/by/3.0/us/\n' +
    '// Source: https://www.eff.org/dice',
  en,
);
console.log(`fr : ${fr.length} mots, en : ${en.length} mots`);
