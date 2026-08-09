import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const wikiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapSource = path.join(
  wikiRoot,
  "content/commodities/soybean-no1/charts/china-standard-map-gs2016-2893.jpg",
);

const provinces = [
  "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
  "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南",
  "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州",
  "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆",
];

const charts = [
  {
    slug: "hog",
    title: "中国生猪生产区域与产能周期",
    metric: "猪肉产量",
    unit: "万吨",
    total: 5706,
    values: [
      1.8, 16.8, 268, 109.2, 80.6, 235.7, 159.3, 196.2, 11.1, 187.4,
      82.6, 251.1, 134, 252.9, 356, 470.9, 351.2, 455.2, 305.2, 287.4,
      40.4, 152.2, 479.4, 186.3, 380.4, 1.7, 99, 73.9, 4.2, 9.1, 66.9,
    ],
    trend: [
      [2019, 4255.3], [2020, 4113.3], [2021, 5295.9],
      [2022, 5541.4], [2023, 5794.3], [2024, 5706],
    ],
    subtitle: "省级地图使用2024年猪肉产量。猪肉产量比生猪存栏更接近实际供给，但仍不等于期货可交割量。",
    cycleTitle: "生猪产能传导时间轴",
    cycleNote: "能繁母猪变化通常领先商品猪出栏约10个月，期间还会受到配种率、仔猪成活、育肥增重、疫病和压栏影响。",
    cycle: [
      ["母猪配种与妊娠", "约4个月", 4, "s1"],
      ["哺乳、保育", "约2个月", 2, "s2"],
      ["育肥", "约4—5个月", 5, "s3"],
      ["出栏与屠宰", "供给兑现", 1, "s4"],
    ],
    pins: {
      四川: [52, 49], 河南: [69, 38.5], 湖南: [68, 50.5], 云南: [54, 58.5],
      山东: [77.5, 33.7, "left"], 湖北: [65, 45],
    },
  },
  {
    slug: "egg",
    title: "中国禽蛋生产区域与蛋鸡产能周期",
    metric: "禽蛋产量",
    unit: "万吨",
    total: 3588.5,
    values: [
      9.6, 21.9, 425.6, 132.6, 64, 284.4, 102.3, 110.4, 5.4, 196.1,
      39.4, 212.9, 75, 89.3, 438.2, 418.2, 251.6, 125.2, 51.2, 40.8,
      9, 53.7, 175.5, 52.8, 51.1, 1.8, 65.5, 29.6, 1.9, 12.2, 41.4,
    ],
    trend: [
      [2019, 3309], [2020, 3467.8], [2021, 3408.8],
      [2022, 3456.4], [2023, 3563], [2024, 3588.5],
    ],
    subtitle: "国家统计局公开分省口径为禽蛋，包含鸡蛋及其他禽蛋；这里作为鸡蛋供给的官方区域代理，不等同于商品鸡蛋产量。",
    cycleTitle: "蛋鸡产能传导时间轴",
    cycleNote: "鸡苗补栏通常约4—5个月后转为新开产蛋鸡，之后的产蛋率、蛋重和淘汰日龄共同决定鸡蛋供应。",
    cycle: [
      ["育雏", "0—6周龄", 2, "s1"],
      ["育成", "7—17周龄", 3, "s2"],
      ["新开产", "约18周龄", 1, "s3"],
      ["高峰与持续产蛋", "约6—17月龄", 5, "s4"],
      ["淘汰", "日龄随利润变化", 1, "s5"],
    ],
    pins: {
      山东: [77.5, 33.7, "left"], 河北: [74.5, 29.6, "left"], 河南: [69, 38.5],
      辽宁: [84, 22.3, "left"], 湖北: [65, 45], 安徽: [73, 42, "left"],
    },
  },
];

const sourceUrl = "https://www.stats.gov.cn/sj/ndsj/2025/html/C12-14.jpg";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderTrend(rows, unit) {
  const width = 620;
  const height = 300;
  const margin = { left: 58, right: 20, top: 34, bottom: 42 };
  const values = rows.map(([, value]) => value);
  const minimum = Math.floor(Math.min(...values) / 500) * 500;
  const maximum = Math.ceil(Math.max(...values) / 500) * 500;
  const x = index => margin.left + index / (rows.length - 1) * (width - margin.left - margin.right);
  const y = value => margin.top + (maximum - value) / (maximum - minimum) * (height - margin.top - margin.bottom);
  const points = rows.map(([, value], index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: 4 }, (_, index) => minimum + (maximum - minimum) / 3 * index);
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="全国${unit}多年走势">
    ${ticks.map(value => `<line x1="${margin.left}" x2="${width - margin.right}" y1="${y(value)}" y2="${y(value)}" class="grid-line"/><text x="${margin.left - 8}" y="${y(value) + 4}" class="axis" text-anchor="end">${Math.round(value)}</text>`).join("")}
    <polyline points="${points}" fill="none" stroke="var(--s1)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${rows.map(([year, value], index) => `<circle cx="${x(index)}" cy="${y(value)}" r="5" fill="var(--bg)" stroke="var(--s1)" stroke-width="3"/><text x="${x(index)}" y="${y(value) - 12}" class="value" text-anchor="middle">${value}</text><text x="${x(index)}" y="${height - 14}" class="axis" text-anchor="middle">${year}</text>`).join("")}
  </svg>`;
}

function renderSharePie(rows, total, unit) {
  const topTotal = rows.reduce((sum, row) => sum + row.value, 0);
  const segments = [
    ...rows,
    { province: "其他", value: Math.max(0, total - topTotal) },
  ];
  let start = 0;
  const stops = segments.map((row, index) => {
    const end = index === segments.length - 1
      ? 100
      : start + row.value / total * 100;
    const stop = `var(--s${index + 1}) ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    start = end;
    return stop;
  }).join(",");
  return `<div class="pie-layout"><div class="pie" role="img" aria-label="前8个主产省和其他省份的产量占比" style="background:conic-gradient(${stops})"><div class="pie-center"><b>${total}</b><span>${escapeHtml(unit)}</span></div></div><div class="pie-legend">${segments.map((row, index) => `<div class="pie-row"><i style="background:var(--s${index + 1})"></i><span>${row.province}</span><b>${(row.value / total * 100).toFixed(1)}%</b></div>`).join("")}</div></div>`;
}

function renderChart(config) {
  const data = provinces.map((province, index) => ({
    province,
    value: config.values[index],
  })).sort((a, b) => b.value - a.value);
  const top = data.slice(0, 8);
  const topTotal = top.reduce((sum, row) => sum + row.value, 0);
  const pinRows = top.filter(row => config.pins[row.province]);
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(config.title)}</title>
<style>
:root{color-scheme:light dark;--bg:light-dark(#fff,#181818);--fg:light-dark(#1c1e21,#f5f5f5);--muted:light-dark(#6e7278,#aaafb4);--border:light-dark(#1c1e211f,#ffffff24);--s1:light-dark(#339cff,#83c3ff);--s2:light-dark(#f3883b,#f59a56);--s3:light-dark(#5dc977,#74d58b);--s4:light-dark(#eb77b1,#f08fc0);--s5:light-dark(#9b79ec,#aa91ef);--s6:light-dark(#3ab9b1,#62d1c9);--s7:light-dark(#d0a92b,#dfc15b);--s8:light-dark(#6e8fd5,#91abe1);--s9:light-dark(#c9d2d9,#646d74);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg)}main{padding:18px}h1{font-size:22px;margin:0 0 5px}h2{font-size:17px;margin:0 0 5px}.sub,.source{color:var(--muted);font-size:11px;line-height:1.65}.grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;margin-top:18px}.card{min-width:0;padding:16px;border:1px solid var(--border);border-radius:12px}.wide{grid-column:1/-1}.map-layout{display:grid;grid-template-columns:minmax(360px,1.25fr) minmax(240px,.75fr);gap:16px;align-items:center}.map{position:relative;max-width:620px;margin:auto}.map img{display:block;width:100%;height:auto}.pin{position:absolute;transform:translate(-50%,-50%);width:16px;height:16px;border:3px solid white;border-radius:50%;background:var(--s2);box-shadow:0 1px 5px #0008}.pin.top{width:27px;height:27px;background:var(--s1)}.pin span{position:absolute;left:17px;top:-5px;white-space:nowrap;padding:1px 4px;border-radius:4px;background:light-dark(#fffffff0,#181818e8);font-size:10px;font-weight:700}.pin.label-left span{left:auto;right:17px}.rank{display:grid;gap:7px}.rank-row{display:grid;grid-template-columns:44px 1fr 64px;gap:8px;align-items:center;font-size:11px}.bar{height:8px;border-radius:8px;background:var(--border);overflow:hidden}.bar i{display:block;height:100%;border-radius:inherit;background:var(--s1)}.rank-row b{text-align:right}.grid-line{stroke:var(--border);stroke-width:1}.axis{fill:var(--muted);font-size:10px}.value{fill:var(--s1);font-size:10px;font-weight:700}svg{display:block;width:100%;height:auto}.share-total{margin:12px 0;font-size:14px;font-weight:700}.pie-layout{display:grid;grid-template-columns:minmax(150px,210px) 1fr;gap:18px;align-items:center;margin-top:14px}.pie{position:relative;width:100%;aspect-ratio:1;border-radius:50%}.pie::after{content:"";position:absolute;inset:29%;border-radius:50%;background:var(--bg)}.pie-center{position:absolute;inset:30%;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.pie-center b{font-size:18px}.pie-center span{color:var(--muted);font-size:10px}.pie-legend{display:grid;gap:6px}.pie-row{display:grid;grid-template-columns:10px 1fr 42px;gap:7px;align-items:center;font-size:11px}.pie-row i{width:9px;height:9px;border-radius:50%}.pie-row b{text-align:right}.cycle{display:flex;min-height:74px;margin-top:14px;overflow:hidden;border-radius:10px}.phase{display:flex;flex-direction:column;justify-content:center;min-width:44px;padding:8px;color:#17212b;text-align:center}.phase b{font-size:11px}.phase span{font-size:9px;margin-top:3px}.phase.s1{background:var(--s1)}.phase.s2{background:var(--s2)}.phase.s3{background:var(--s3)}.phase.s4{background:var(--s4)}.phase.s5{background:var(--s5)}.source{margin-top:11px;padding-top:8px;border-top:1px solid var(--border)}.source a{color:inherit;text-underline-offset:2px}
@media(max-width:760px){main{padding:10px}.grid,.map-layout{grid-template-columns:1fr}.wide{grid-column:auto}.map{max-width:520px}.pin span{display:none}.cycle{overflow-x:auto}.phase{flex:0 0 110px!important}}
</style></head><body><main>
<h1>${escapeHtml(config.title)}</h1><p class="sub">${escapeHtml(config.subtitle)}</p>
<div class="grid">
  <section class="card wide"><h2>2024年主产省分布</h2><div class="map-layout"><div class="map" role="img" aria-label="中国标准地图上的${escapeHtml(config.metric)}主产省"><img src="china-standard-map-gs2016-2893.jpg" alt="中国标准地图，审图号GS（2016）2893号">${pinRows.map((row, index) => { const [left, topPos, labelSide] = config.pins[row.province]; return `<i class="pin ${index === 0 ? "top" : ""} ${labelSide === "left" ? "label-left" : ""}" style="left:${left}%;top:${topPos}%"><span>${row.province} ${row.value}</span></i>`; }).join("")}</div><div class="rank">${top.map((row, index) => `<div class="rank-row"><span>${index + 1}. ${row.province}</span><div class="bar"><i style="width:${(row.value / top[0].value * 100).toFixed(1)}%"></i></div><b>${row.value}</b></div>`).join("")}</div></div><p class="source">数据：<a href="${sourceUrl}" target="_blank" rel="noreferrer">国家统计局《中国统计年鉴2025》表12-14</a>，单位：${config.unit}，自然年。地图：自然资源部标准地图服务，审图号 GS（2016）2893号；仅叠加数据标记，未修改地图边界。</p></section>
  <section class="card"><h2>全国${escapeHtml(config.metric)}走势</h2>${renderTrend(config.trend, config.metric)}<p class="source">来源同上；年度值采用国家统计局修订口径。</p></section>
  <section class="card"><h2>主产省产量占比</h2><div class="share-total">前8省合计 ${topTotal.toFixed(1)} ${config.unit}，占全国 ${(topTotal / config.total * 100).toFixed(1)}%</div>${renderSharePie(top, config.total, config.unit)}<p class="source">全国合计 ${config.total} ${config.unit}；“其他”为全国总量扣除前8省，分省数据可能因四舍五入与全国值略有差异。</p></section>
  <section class="card wide"><h2>${escapeHtml(config.cycleTitle)}</h2><p class="sub">${escapeHtml(config.cycleNote)}</p><div class="cycle">${config.cycle.map(([label, note, span, color]) => `<div class="phase ${color}" style="flex:${span}"><b>${escapeHtml(label)}</b><span>${escapeHtml(note)}</span></div>`).join("")}</div></section>
</div></main><script>(()=>{const root=document.querySelector("main");const send=()=>parent.postMessage({type:"commodity-chart-height",height:Math.ceil(root.getBoundingClientRect().height)+2},location.origin);new ResizeObserver(send).observe(root);addEventListener("load",send);addEventListener("resize",send);addEventListener("message",event=>{if(event.source===parent&&event.data?.type==="commodity-chart-measure")send()});requestAnimationFrame(send)})()</script></body></html>`;
}

for (const config of charts) {
  const outputDir = path.join(wikiRoot, "content", "commodities", config.slug, "charts");
  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputDir, "china-production.html"), renderChart(config), "utf8"),
    fs.copyFile(mapSource, path.join(outputDir, "china-standard-map-gs2016-2893.jpg")),
  ]);
}

console.log(`已生成 ${charts.length} 个国内生产图表页面`);
