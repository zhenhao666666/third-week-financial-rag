import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config', 'companies.json'), 'utf8'));
const textDir = path.join(root, 'data', 'text');
const outDir = path.join(root, 'data', 'index');
fs.mkdirSync(outDir, { recursive: true });

const stop = new Set('的 了 和 是 在 与 及 以 对 为 按 将 由 中 其 公司 本 报告 以及 相关 主要 进行 具体 一个 一项 其中 通过 该项 以上 以下 说明'.split(' '));
function tokens(text) {
  const s = String(text).toLowerCase().replace(/\s+/g, '');
  const out = [];
  for (const m of s.matchAll(/[\u4e00-\u9fff]|[a-z0-9%\.]+/g)) {
    const t = m[0];
    if (!stop.has(t)) out.push(t);
  }
  return out;
}
function sectionOf(text) {
  const patterns = ['重要提示','公司简介','主要会计数据','管理层讨论与分析','公司治理','环境和社会责任','重要事项','股份变动','优先股','债券','财务报告','审计报告','会计政策','风险因素','未来发展'];
  for (const p of patterns) if (text.includes(p)) return p;
  return '未标注章节';
}
function vector(ts, dims = 256) {
  const v = new Float32Array(dims);
  for (const t of ts) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
    const idx = (h >>> 0) % dims;
    const sign = (h & 1) ? 1 : -1;
    v[idx] += sign;
  }
  let norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return Array.from(v, x => Number((x / norm).toFixed(6)));
}
function chunkPage(company, pageObj, currentSection) {
  const text = pageObj.text.replace(/\s+/g, ' ').trim();
  const size = 900, overlap = 160, step = size - overlap;
  const chunks = [];
  for (let start = 0; start < text.length; start += step) {
    const body = text.slice(start, start + size).trim();
    if (body.length < 60) continue;
    const ts = tokens(body);
    const tf = {};
    for (const t of ts) tf[t] = (tf[t] || 0) + 1;
    chunks.push({
      id: `${company.code}-p${pageObj.page}-${chunks.length + 1}`,
      companyCode: company.code,
      company: company.name,
      sector: company.sector,
      reportYear: company.year,
      page: pageObj.page,
      section: sectionOf(body) === '未标注章节' ? currentSection : sectionOf(body),
      text: body,
      tokens: ts,
      tf,
      dl: ts.length,
      vector: vector(ts)
    });
  }
  return chunks;
}

const docs = [];
for (const company of cfg) {
  const file = path.join(textDir, `${company.code}.json`);
  if (!fs.existsSync(file)) throw new Error(`缺少文字文件：${file}`);
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  let currentSection = '未标注章节';
  for (const p of parsed.pages) {
    const detected = sectionOf(p.text);
    if (detected !== '未标注章节') currentSection = detected;
    docs.push(...chunkPage(company, p, currentSection));
  }
}
const df = {};
for (const d of docs) for (const t of new Set(d.tokens)) df[t] = (df[t] || 0) + 1;
const avgdl = docs.reduce((s, d) => s + d.dl, 0) / Math.max(1, docs.length);
const index = { version: 1, createdAt: new Date().toISOString(), dims: 256, companies: cfg, avgdl, df, docs };
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index));
console.log(`索引完成：${cfg.length} 家公司，${docs.length} 个文本块，${Object.keys(df).length} 个词项，平均块长 ${avgdl.toFixed(1)}`);
