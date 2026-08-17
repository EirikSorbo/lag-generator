// Kjører alle testsuitene. Bruk: node tests/run.js
const { execFileSync } = require('child_process');
const path = require('path');

require('./extract.js');

const SUITER = [
  ['regr.js',    'bindinger holder'],
  ['apart.js',   'skal ikke spille sammen'],
  ['oppmote.js', 'oppmøtejustering og stokking'],
  ['fire.js',    'navnebytte, kategorier, fravær, aldring'],
  ['rest.js',    'ytelse, lagring, arkiv'],
  ['swtest.js',  'service worker'],
  ['probe.js',   'kanttilfeller'],
  ['farger.js',  'kategorifarger']
];

let bestått = 0, feilet = 0, funn = 0;
for (const [fil, hva] of SUITER) {
  let ut;
  try {
    ut = execFileSync(process.execPath, [path.join(__dirname, fil)], { encoding: 'utf8' });
  } catch (e) {
    console.log(`\n${fil} (${hva}): KRASJET\n${e.stdout || ''}${e.stderr || ''}`);
    feilet++;
    continue;
  }
  const siste = ut.trim().split('\n').pop();
  const m = siste.match(/(\d+) bestått, (\d+) feilet/);
  if (m) {
    bestått += +m[1]; feilet += +m[2];
    console.log(`${(fil + ':').padEnd(13)} ${m[1]} bestått, ${m[2]} feilet   ${hva}`);
    if (+m[2]) console.log(ut.split('\n').filter(l => l.includes('FEIL')).join('\n'));
  } else {
    const f = (siste.match(/(\d+) funn/) || [])[1];
    funn += f ? +f : 0;
    console.log(`${(fil + ':').padEnd(13)} ${siste}   ${hva}`);
    if (f) console.log(ut.split('\n').filter(l => l.includes('FUNN')).join('\n'));
  }
}

console.log(`\n${bestått} bestått, ${feilet} feilet, ${funn} funn`);
process.exit(feilet || funn ? 1 : 0);
