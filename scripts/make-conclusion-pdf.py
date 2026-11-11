import json
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'artifacts', 'third-week-conclusion.pdf')
pdfmetrics.registerFont(TTFont('SimHei', r'C:\Windows\Fonts\simhei.ttf'))
W, H = A4
c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle('第三周作业结论 - 上市公司财报问答知识库')

def text(x, y, s, size=9, color=colors.HexColor('#1f2937')):
    c.setFont('SimHei', size)
    c.setFillColor(color)
    c.drawString(x, y, str(s))

def wrap(s, width):
    out, line = [], ''
    for ch in str(s):
        if ch == '\\n' or len(line) >= width:
            if line: out.append(line)
            line = '' if ch == '\\n' else ch
        else:
            line += ch
    if line: out.append(line)
    return out

def paragraph(x, y, s, width=74, size=8.7, leading=13, color=colors.HexColor('#334155')):
    for line in wrap(s, width):
        text(x, y, line, size, color)
        y -= leading
    return y

with open(os.path.join(ROOT, 'data', 'evaluation.json'), encoding='utf-8') as f:
    report = json.load(f)

margin = 38
c.setFillColor(colors.HexColor('#f5f7fb'))
c.rect(0, 0, W, H, stroke=0, fill=1)
c.setFillColor(colors.HexColor('#17436f'))
c.roundRect(margin, H-105, W-2*margin, 70, 12, stroke=0, fill=1)
text(margin+18, H-65, '第三周作业：上市公司财报问答知识库', 19, colors.white)
text(margin+18, H-84, '方向 A · 食品饮料相关上市公司 2024 年年度报告 · 真实运行结果', 9, colors.HexColor('#dceaf5'))
text(margin, H-126, '数据源：巨潮资讯网官方 PDF（10 家）   |   代码仓库：third-week-financial-rag   |   原始 PDF 不提交仓库', 8, colors.HexColor('#64748b'))

metrics = [('10', '家公司'), (str(report['chunks']), '文本块'), (str(report['dims']), '维向量'), (f"{report['correct']}/{report['total']}", '题目答对')]
card_y = H-190
card_w = (W-2*margin-24)/4
for i, (value, label) in enumerate(metrics):
    x = margin + i*(card_w+8)
    c.setFillColor(colors.white); c.setStrokeColor(colors.HexColor('#d8e1ec'))
    c.roundRect(x, card_y, card_w, 48, 8, stroke=1, fill=1)
    text(x+10, card_y+27, value, 15, colors.HexColor('#176b89'))
    text(x+10, card_y+11, label, 8, colors.HexColor('#475569'))

text(margin, card_y-24, '实现链路', 11, colors.HexColor('#17436f'))
flow = ['下载脚本\\n官方 URL', 'PDF 页级\\n文字抽取', '900 字切块\\n保留页码', 'BM25 + 256 维\\n本地向量', '网页问答\\nC1/C2 出处']
fy = card_y-70
for i, label in enumerate(flow):
    x = margin + i*103
    c.setFillColor(colors.HexColor('#e7f4f2')); c.setStrokeColor(colors.HexColor('#a8d8d3'))
    c.roundRect(x, fy, 84, 30, 6, stroke=1, fill=1)
    parts = label.split('\\n')
    text(x+8, fy+17, parts[0], 7.5, colors.HexColor('#176b69'))
    text(x+8, fy+7, parts[1], 7.5, colors.HexColor('#176b69'))
    if i < len(flow)-1: text(x+87, fy+11, '→', 11, colors.HexColor('#7b8ea4'))

box_y = fy-106
c.setFillColor(colors.white); c.setStrokeColor(colors.HexColor('#d8e1ec'))
c.roundRect(margin, box_y, W-2*margin, 98, 10, stroke=1, fill=1)
text(margin+14, box_y+69, '一句话结论', 11, colors.HexColor('#17436f'))
paragraph(margin+14, box_y+52, '同一批财报，单公司事实题适合建库：只要按页切块并把 BM25 与向量检索混合，较容易召回带出处的原文；跨公司全景题不适合直接用一个固定 top-k，容易被某一家公司“霸榜”，应增加公司路由、分组检索和结果汇总。财报事实需要最新原文和页码，因此这里优先选择知识库而不是把知识写进模型权重。', width=57, size=8.3, leading=12)

text(margin, box_y-24, '10 道题逐题记录（召回块、页码和错误原因见 data/evaluation.csv）', 11, colors.HexColor('#17436f'))
table_top = box_y-38
colx = [margin, margin+34, margin+91, margin+235, W-margin]
row_h = 16
c.setFillColor(colors.HexColor('#e8eef6')); c.rect(margin, table_top-row_h, W-2*margin, row_h, stroke=0, fill=1)
for x, h in zip(colx[:-1], ['题号','类型','判断','召回/错误摘要']): text(x+4, table_top-11, h, 7.2, colors.HexColor('#334155'))
for i, row in enumerate(report['rows']):
    y = table_top-(i+2)*row_h
    if i % 2 == 1:
        c.setFillColor(colors.HexColor('#fbfcfe')); c.rect(margin, y, W-2*margin, row_h, stroke=0, fill=1)
    text(colx[0]+4, y+4, row['id'], 6.7)
    text(colx[1]+4, y+4, '跨公司' if row['type']=='跨公司全景' else '单公司', 6.7)
    status_color = {'答对':colors.HexColor('#18794e'),'部分覆盖':colors.HexColor('#a16207'),'翻车':colors.HexColor('#b42318')}[row['status']]
    text(colx[2]+4, y+4, row['status'], 6.7, status_color)
    summary = row['error'] if row['status'] != '答对' else row['retrieved'].split('；')[0]
    text(colx[3]+4, y+4, summary[:52], 6.2, colors.HexColor('#475569'))

footer_y = 48
text(margin, footer_y+18, '评测统计：单公司 8 题中 6 题答对、2 题翻车；跨公司 2 题均为部分覆盖，说明全景召回是当前主要瓶颈。', 8, colors.HexColor('#334155'))
text(margin, footer_y+4, '仓库不含 API key、密码、个人账号或原始 PDF；重新运行 npm run all 可下载、抽取、建索引并复现实验。', 7.5, colors.HexColor('#64748b'))
c.save()
print(OUT)
