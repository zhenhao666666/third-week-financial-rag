import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'data', 'index', 'index.json'), 'utf8'));
const stop = new Set('的 了 和 是 在 与 及 以 对 为 按 将 由 中 其 公司 本 报告 以及 相关 主要 进行 具体 一个 一项 其中 通过 该项 以上 以下 说明'.split(' '));
function tokens(text) {
  const out = [];
  for (const m of String(text).toLowerCase().replace(/\s+/g, '').matchAll(/[\u4e00-\u9fff]|[a-z0-9%\.]+/g)) if (!stop.has(m[0])) out.push(m[0]);
  return out;
}
function vector(ts, dims = 256) {
  const v = new Float32Array(dims);
  for (const t of ts) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
    v[(h >>> 0) % dims] += (h & 1) ? 1 : -1;
  }
  const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return Array.from(v, x => x / norm);
}
function cosine(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function bm25(qts, d) {
  const k1 = 1.2, b = 0.75, N = index.docs.length;
  let score = 0;
  for (const t of qts) {
    const n = index.df[t] || 0;
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
    const f = d.tf[t] || 0;
    if (!f) continue;
    score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.dl / index.avgdl));
  }
  return score;
}
export function search(query, k = 6) {
  const qts = tokens(query);
  const qv = vector(qts);
  const scored = index.docs.map(d => ({ doc: d, bm25: bm25(qts, d), vector: cosine(qv, d.vector) }));
  const maxBm = Math.max(...scored.map(x => x.bm25), 1);
  const ranked = scored.map(x => ({ ...x, score: 0.55 * (x.bm25 / maxBm) + 0.45 * Math.max(0, x.vector) }))
    .sort((a, b) => b.score - a.score).slice(0, k);
  return ranked.map((x, i) => ({ rank: i + 1, score: Number(x.score.toFixed(4)), bm25: Number(x.bm25.toFixed(4)), vector: Number(x.vector.toFixed(4)), ...x.doc }));
}
export function answer(query, k = 6) {
  const hits = search(query, k);
  const citations = hits.map((h, i) => ({ id: `C${i + 1}`, company: h.company, page: h.page, section: h.section, chunkId: h.id, text: h.text }));
  const lines = citations.slice(0, 4).map(c => `- ${c.text.slice(0, 260)} [${c.id}]`);
  return { query, answer: `检索到与问题最相关的原文证据如下。页面只做证据摘录，不补写财报未明确给出的数字；请点击出处回看原文。\n${lines.join('\n')}`, citations, hits };
}
export function stats() { return { companies: index.companies.length, chunks: index.docs.length, avgdl: index.avgdl, dims: index.dims }; }
