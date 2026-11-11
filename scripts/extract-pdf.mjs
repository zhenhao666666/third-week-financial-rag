import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config', 'companies.json'), 'utf8'));
const reports = path.join(root, 'data', 'reports');
const outDir = path.join(root, 'data', 'text');
fs.mkdirSync(outDir, { recursive: true });

for (const company of config) {
  const pdfPath = path.join(reports, company.reportFile);
  const outPath = path.join(outDir, `${company.code}.json`);
  if (!fs.existsSync(pdfPath)) throw new Error(`找不到 PDF：${pdfPath}`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs >= fs.statSync(pdfPath).mtimeMs) {
    console.log(`skip ${company.name}`);
    continue;
  }
  console.log(`extract ${company.name}`);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent({ disableCombineTextItems: false });
    const text = content.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
    if (text) pages.push({ page: pageNo, text });
    if (pageNo % 25 === 0) console.log(`  ${pageNo}/${pdf.numPages}`);
  }
  fs.writeFileSync(outPath, JSON.stringify({ company, pdfPages: pdf.numPages, pages }, null, 2));
}
console.log('文字抽取完成');
