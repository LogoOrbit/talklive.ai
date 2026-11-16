#!/usr/bin/env node
'use strict';
// Lists the labelled speech files the voice model is trained and tested on.
//
//   node scripts/voice/manifest.js <data-dir> > manifest.jsonl
//
// <data-dir> holds two public corpora (scripts/voice/README.md says how to
// fetch them):
//   libri/LibriSpeech/{dev-clean,dev-other,test-clean,test-other}  read English,
//       with each speaker's sex in SPEAKERS.TXT
//   fleurs/<lang>/{train,dev,test}  Google FLEURS, 102 languages, with the
//       speaker's gender per recording in <split>.tsv
// Each line: { path, label: 'F'|'M', set, speaker }.
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) { console.error('usage: manifest.js <data-dir>'); process.exit(1); }

function walk(dir, ext, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

const libri = path.join(root, 'libri', 'LibriSpeech');
if (fs.existsSync(libri)) {
  const sex = {};
  for (const line of fs.readFileSync(path.join(libri, 'SPEAKERS.TXT'), 'utf8').split('\n')) {
    if (line.startsWith(';')) continue;
    const cols = line.split('|').map((s) => s.trim());
    if (cols.length >= 2 && /^[MF]$/.test(cols[1])) sex[cols[0]] = cols[1];
  }
  for (const part of ['dev-clean', 'dev-other', 'test-clean', 'test-other']) {
    const dir = path.join(libri, part);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir, '.flac')) {
      const speaker = path.basename(file).split('-')[0];
      if (sex[speaker]) console.log(JSON.stringify({ path: file, label: sex[speaker], set: `libri:${part}`, speaker: `ls${speaker}` }));
    }
  }
}

const fleurs = path.join(root, 'fleurs');
if (fs.existsSync(fleurs)) {
  for (const lang of fs.readdirSync(fleurs).sort()) {
    for (const split of ['train', 'dev', 'test']) {
      const tsv = path.join(fleurs, lang, `${split}.tsv`);
      const dir = path.join(fleurs, lang, split);
      if (!fs.existsSync(tsv) || !fs.existsSync(dir)) continue;
      const files = new Map(walk(dir, '.wav').map((f) => [path.basename(f), f]));
      for (const line of fs.readFileSync(tsv, 'utf8').split('\n')) {
        const cols = line.split('\t');
        const g = cols[cols.length - 1];
        const file = files.get(cols[1]);
        if (!file || (g !== 'FEMALE' && g !== 'MALE')) continue;
        console.log(JSON.stringify({ path: file, label: g[0], set: `fleurs:${lang}:${split}`, speaker: null }));
      }
    }
  }
}
