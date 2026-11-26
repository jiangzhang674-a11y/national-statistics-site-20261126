# 中国国家统计 · China National Statistics

[![make.fun](https://make.fun/badge/best-national-statistics-site-20261126-0539.svg)](https://make.fun/bounty/best-national-statistics-site-20261126-0539)
[![rank](https://make.fun/badge/best-national-statistics-site-20261126-0539/jiangzhang674-a11y/national-statistics-site-20261126/rank.svg)](https://make.fun/bounty/best-national-statistics-site-20261126-0539)
[![reward](https://make.fun/badge/best-national-statistics-site-20261126-0539/jiangzhang674-a11y/national-statistics-site-20261126/reward.svg)](https://make.fun/bounty/best-national-statistics-site-20261126-0539)

make.fun 比赛作品：**Make the best national statistics site**
（best-national-statistics-site-20261126-0539，$50 由前 10 名分，截止 2026-11-29）。

本站覆盖 2024 年的中国：经济、人口、就业、物价、贸易，另加一张
2021–2024 年主要指标总表。图表全部由本站代码在浏览器本地手绘，
表格可排序、可搜索、可下载 CSV。纯静态文件，不发任何网络请求，
桌面与手机均可打开。

## 本轮重建（2026-11-26，比赛开赛后新会话重写）

审核员指出的硬伤已修，并把总表 GDP 改成以 `app/data.js` 的
`gdpTotals` 为唯一来源，避免两处数字打架：

- 总表 GDP：2021 年 1173823 亿元（+8.6%）、2022 年 1234029 亿元
  （+3.1%）、2023 年 1294272 亿元（+5.4%），均为第五次全国经济
  普查修订后数；2024 年 1349084 亿元（+5.0%）为初步核算数。
  与 `data.js` 的 GDP 增速图口径一致。
- 总表脚注改为：“2021–2023 年为第五次全国经济普查修订后数，
  2024 年为初步核算数。”
- 搜索框占位文案不再举搜不到的“CPI”例子，改为
  “搜索年份或数字，如：2024…”（搜索是按行文本子串匹配）。
- “点柱子看精确数值”改为准确说法：鼠标悬停查看精确数值，
  手机上点一下同样可以查看；`charts.js` 已补上点按显示提示。
- 首页 GDP 图改矮（230px），让 1280×860 的封面截图能完整看到
  年份横轴，不再裁掉。

## 运行

```sh
python3 -m http.server 8000 --directory app
# 打开 http://localhost:8000/
```

投稿入口：`MAKEFUN_OUTPUT_DIR=out node main.ts`（Node 22），
用 `vendor/makefun-frontend.ts`（kit 原样）生成 `dossier.json`。

## 结构

```
main.ts            投稿入口（Node 22，只用标准库）：拷 app/ 与
                   screenshots/ 到输出目录，用 buildDossier 写 dossier.json
main.py            同样的工作（Python 3），dossier 一步调 node main.ts
vendor/            makefun-frontend.ts —— kit 原样，未改动
app/
  index.html       8 个页面（hash 路由：#/home #/economy #/population
                   #/employment #/prices #/trade #/tables #/about）
  styles.css       本地样式表，系统字体
  data.js          全部数字与来源（含 gdpTotals 修订后 GDP 总量）
  charts.js        手绘 canvas 图表（柱、折线、堆叠、环形、横条），悬停/点按看精确值
  app.js           路由、图表接线、总表排序/搜索/CSV 下载
screenshots/      4 张本站实拍图（3 张桌面、1 张手机）
```

## 数据来源

全部数字来自官方发布：

1. 国家统计局《中华人民共和国2024年国民经济和社会发展统计公报》，2025-02-28
2. 国家统计局 2021 / 2022 / 2023 年统计公报
3. 海关总署 2024 年货物贸易进出口数据，2025-01-13；2023 年数据，2024-01-12
4. 国家统计局《2024年我国研究与试验发展（R&D）经费超过3.6万亿元》，2025-01-23
5. 各省（自治区、直辖市）统计局 2024 年地区生产总值初步核算数

 headline（2024 年）：GDP 1,349,084 亿元（+5.0%）；年末人口
1,408.28 万人（−139 万）；CPI +0.2%；货物贸易 438,468 亿元
（+5.0%），出口 254,545 亿元，进口 183,923 亿元。

## License

MIT — 见 `LICENSE`。
