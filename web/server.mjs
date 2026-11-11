import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { answer, stats } from '../scripts/rag.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8787);
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function page() {
  const s = stats();
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>食品饮料财报问答知识库</title><style>
  body{margin:0;background:#f5f7fb;color:#172033;font-family:Segoe UI,Microsoft YaHei,sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:34px}.hero{background:linear-gradient(135deg,#153b68,#247a91);color:#fff;padding:30px 34px;border-radius:20px;box-shadow:0 10px 30px #0c315a33}.hero h1{margin:0 0 8px;font-size:30px}.hero p{margin:0;color:#dbeaf4}.stats{display:flex;gap:14px;margin:20px 0}.stat{background:#fff;border:1px solid #e5eaf2;border-radius:14px;padding:14px 18px;min-width:140px}.stat b{font-size:24px;color:#1b6385;display:block}.panel{background:#fff;border:1px solid #e5eaf2;border-radius:16px;padding:22px;margin-top:18px}.row{display:flex;gap:10px}input{flex:1;border:1px solid #c9d4e2;border-radius:10px;padding:14px;font-size:16px}button{background:#167c80;color:#fff;border:0;border-radius:10px;padding:0 22px;font-size:16px;cursor:pointer}.hint{color:#68758a;font-size:13px;margin-top:10px}.answer{white-space:pre-wrap;line-height:1.65}.hit{border-top:1px solid #edf0f5;padding:15px 0}.tag{display:inline-block;background:#e7f4f2;color:#176b69;padding:4px 8px;border-radius:6px;margin-right:6px;font-size:12px}.source{color:#52657b;font-size:13px}.empty{color:#758196}.footer{color:#7a8797;font-size:12px;margin-top:24px}</style></head><body><main class="wrap"><section class="hero"><h1>食品饮料上市公司财报问答知识库</h1><p>方向 A · 2024 年 10 家上市公司年报 · BM25 + 本地向量特征混合检索 · 每条证据带公司、章节和 PDF 页码</p></section><section class="stats"><div class="stat"><b>${s.companies}</b>家公司</div><div class="stat"><b>${s.chunks.toLocaleString()}</b>个文本块</div><div class="stat"><b>${s.dims}</b>维向量</div><div class="stat"><b>${s.avgdl.toFixed(0)}</b>平均词项/块</div></section><section class="panel"><div class="row"><input id="q" placeholder="例如：五粮液 2024 年营业收入同比增长多少？"><button onclick="ask()">检索并回答</button></div><div class="hint">回答只展示检索到的原文证据；点击/查看出处中的公司与页码即可回到 PDF。</div><div id="out" class="empty" style="margin-top:18px">请输入问题开始检索。</div></section><div class="footer">索引生成：本项目 scripts/build-index.mjs · 资料来源：巨潮资讯网官方 PDF</div></main><script>
async function ask(){const q=document.getElementById('q').value.trim();if(!q)return;const o=document.getElementById('out');o.innerHTML='正在检索…';const r=await fetch('/api/search?q='+encodeURIComponent(q));const d=await r.json();let h='<h2>回答</h2><div class="answer">'+d.answer.replaceAll('\\n','<br>')+'</div><h2>召回证据</h2>';for(const [i,x] of d.citations.entries()){h+='<div class="hit"><span class="tag">C'+(i+1)+'</span><span class="tag">'+x.company+'</span><span class="source">第 '+x.page+' 页 · '+x.section+' · '+x.chunkId+'</span><div style="margin-top:8px">'+x.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'</div></div>'}o.innerHTML=h}document.getElementById('q').addEventListener('keydown',e=>{if(e.key==='Enter')ask()});const init=new URLSearchParams(location.search).get('q');if(init){document.getElementById('q').value=init;ask();}</script></body></html>`;
}
http.createServer((req,res)=>{
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (u.pathname === '/api/search') { const q=u.searchParams.get('q')||''; res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(answer(q,6))); return; }
  if (u.pathname === '/' || u.pathname === '/index.html') { res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); res.end(page()); return; }
  res.writeHead(404); res.end('Not found');
}).listen(port,()=>console.log(`问答页面已启动：http://localhost:${port}`));
