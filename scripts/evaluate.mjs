import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { search, stats } from './rag.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const questions = JSON.parse(fs.readFileSync(path.join(root, 'data', 'questions.json'), 'utf8'));
const rows = [];
for (const q of questions) {
  const hits = search(q.question, 6);
  const companyText = hits.map(h => h.company).join('、');
  const keywordText = hits.map(h => h.text).join(' ').replace(/\s+/g, '');
  const missingCompanies = q.mustCompanies.filter(c => !hits.some(h => h.company === c));
  const missingKeywords = q.mustKeywords.filter(k => !keywordText.includes(k.replace(/\s+/g, '')));
  const ok = missingCompanies.length === 0 && missingKeywords.length === 0;
  const partial = !ok && missingCompanies.length < q.mustCompanies.length && missingKeywords.length === 0;
  rows.push({ id:q.id, type:q.type, question:q.question, retrieved:hits.map(h=>`${h.company}｜p.${h.page}｜${h.section}｜${h.id}`).join('；'), topCompanies:companyText, status:ok?'答对':(partial?'部分覆盖':'翻车'), error:ok?'无':`缺少公司：${missingCompanies.join('、')||'无'}；缺少关键词：${missingKeywords.join('、')||'无'}` });
}
const header = ['题号','类型','问题','召回块（公司｜页码｜章节｜ID）','Top 公司','判断','错误记录'];
const csv = [header, ...rows.map(r=>[r.id,r.type,r.question,r.retrieved,r.topCompanies,r.status,r.error])].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
fs.writeFileSync(path.join(root, 'data', 'evaluation.csv'), '\ufeff' + csv);
const summary = { ...stats(), total: rows.length, correct: rows.filter(r=>r.status==='答对').length, partial: rows.filter(r=>r.status==='部分覆盖').length, failed: rows.filter(r=>r.status==='翻车').length, rows };
fs.writeFileSync(path.join(root, 'data', 'evaluation.json'), JSON.stringify(summary, null, 2));
console.log(`评测完成：${summary.correct} 答对，${summary.partial} 部分覆盖，${summary.failed} 翻车；共 ${summary.total} 题`);
