import fs from "node:fs/promises";
import path from "node:path";

const configArgument = process.argv[2];
if (!configArgument) {
  throw new Error("用法：node scripts/build-dashboard.mjs <config.json>");
}

const configPath = path.resolve(configArgument);
const configDir = path.dirname(configPath);
const config = JSON.parse(await fs.readFile(configPath, "utf8"));
const dataPath = path.resolve(configDir, config.dataFile);
const outputPath = path.resolve(configDir, config.outputFile);

const metricLabels = {
  production: "产量",
  exports: "出口量",
  imports: "进口量",
  consumption: "消费量",
};
const metricKeys = Object.keys(metricLabels);

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  fields.push(field.replace(/\r$/, ""));
  return fields;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

const csvText = await fs.readFile(dataPath, "utf8");
const lines = csvText.split("\n");
const header = parseCsvLine(lines[0].replace(/^\uFEFF/, ""));
const requiredColumns = ["product", "country", "market_year", "metric", "value"];
const column = Object.fromEntries(header.map((name, index) => [name, index]));
for (const name of requiredColumns) {
  if (column[name] === undefined) throw new Error(`CSV 缺少列：${name}`);
}

const rows = [];
for (let index = 1; index < lines.length; index += 1) {
  if (!lines[index]) continue;
  const fields = parseCsvLine(lines[index]);
  const product = fields[column.product];
  const country = fields[column.country];
  const year = fields[column.market_year];
  const metric = fields[column.metric];
  const value = Number(fields[column.value]);
  if (!product || !country || !year || !metricKeys.includes(metric)) continue;
  if (!Number.isFinite(value)) continue;
  rows.push({ product, country, year, metric, value });
}

const products = config.products?.length
  ? config.products.filter(product => rows.some(row => row.product === product))
  : [...new Set(rows.map(row => row.product))];
if (!products.length) throw new Error("配置中的产品在 CSV 中没有数据");

const years = [...new Set(rows.map(row => row.year))].sort((a, b) =>
  Number(a.slice(0, 4)) - Number(b.slice(0, 4))
);
const data = {};
for (const product of products) data[product] = {};
for (const row of rows) {
  if (!data[row.product]) continue;
  data[row.product][row.country] ??= {};
  data[row.product][row.country][row.metric] ??= {};
  data[row.product][row.country][row.metric][row.year] = row.value;
}

const defaultProduct = products.includes(config.defaultProduct)
  ? config.defaultProduct
  : products[0];
const defaultYear = years.includes(config.defaultYear)
  ? config.defaultYear
  : years.at(-1);
const topCount = Math.max(3, Math.min(10, Number(config.topCount || 6)));
const title = config.title || "商品全球供需结构";
const unit = config.unit || "万吨";

const productOptions = products
  .map(product => `<option value="${escapeHtml(product)}">${escapeHtml(product)}</option>`)
  .join("");
const yearOptions = years
  .map(year => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`)
  .join("");
const metricOptions = metricKeys
  .map(metric => `<option value="${metric}">${metricLabels[metric]}</option>`)
  .join("");

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: light-dark(rgb(255 255 255), rgb(24 24 24));
      --fg: light-dark(rgb(28 30 33), rgb(245 245 245));
      --muted: light-dark(rgb(110 114 120), rgb(170 174 180));
      --border: light-dark(rgb(28 30 33 / 12%), rgb(255 255 255 / 14%));
      --input: light-dark(rgb(255 255 255), rgb(38 38 38));
      --s1: light-dark(rgb(51 156 255), rgb(131 195 255));
      --s2: light-dark(rgb(243 136 59), rgb(245 154 86));
      --s3: light-dark(rgb(93 201 119), rgb(116 213 139));
      --s4: light-dark(rgb(235 119 177), rgb(240 143 192));
      --s5: light-dark(rgb(155 121 236), rgb(170 145 239));
      --s6: light-dark(rgb(58 185 177), rgb(90 203 194));
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--fg);
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--fg); }
    main { width: min(1440px, 100%); margin: 0 auto; padding: 16px; }
    h1 { margin: 0 0 14px; font-size: 24px; font-weight: 600; }
    h2 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
    .controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    label { display: grid; gap: 5px; font-weight: 600; }
    select {
      width: 100%;
      min-height: 40px;
      padding: 7px 34px 7px 10px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--input);
      color: var(--fg);
      font: inherit;
    }
    .pie-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 22px 28px;
    }
    .pie-panel { min-width: 0; }
    .pie-body {
      display: grid;
      grid-template-columns: minmax(170px, 210px) minmax(170px, 1fr);
      gap: 10px;
      align-items: center;
    }
    .pie { width: 100%; height: auto; display: block; overflow: visible; }
    .legend {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 7px;
    }
    .legend li {
      display: grid;
      grid-template-columns: 10px minmax(0, 1fr) auto;
      align-items: center;
      gap: 7px;
    }
    .swatch { width: 9px; height: 9px; border-radius: 50%; }
    .legend-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .legend-value { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .center-total { fill: var(--fg); font-weight: 600; font-size: 15px; }
    .center-unit, .axis-label { fill: var(--muted); font-size: 11px; }
    .trend-section { margin-top: 24px; position: relative; }
    .trend-head {
      display: flex;
      gap: 12px;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .selected-value { color: var(--muted); }
    .trend { width: 100%; height: auto; display: block; overflow: visible; }
    .grid-line { stroke: var(--border); stroke-width: 1; }
    .year-line { stroke: var(--fg); stroke-width: 1.5; opacity: 0.55; }
    .hit { fill: transparent; cursor: crosshair; }
    .tooltip {
      position: absolute;
      z-index: 3;
      pointer-events: none;
      padding: 7px 9px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--input);
      color: var(--fg);
      box-shadow: 0 4px 18px rgb(0 0 0 / 12%);
      font-size: 13px;
    }
    .note { margin-top: 8px; color: var(--muted); font-size: 12px; }
    @media (max-width: 760px) {
      .pie-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 520px) {
      main { padding: 10px; }
      .controls { grid-template-columns: 1fr; }
      .pie-body { grid-template-columns: 130px minmax(0, 1fr); }
      .trend-head { align-items: flex-start; flex-direction: column; }
    }
  </style>
</head>
<body>
<main id="dashboard">
  <h1>${escapeHtml(title)}</h1>
  <div class="controls">
    <label>产品
      <select id="product">${productOptions}</select>
    </label>
    <label>市场年度
      <select id="year">${yearOptions}</select>
    </label>
  </div>

  <div class="pie-grid">
    ${metricKeys.map(metric => `
    <section class="pie-panel" aria-labelledby="title-${metric}">
      <h2 id="title-${metric}">${metricLabels[metric]}分布</h2>
      <div class="pie-body">
        <svg id="pie-${metric}" class="pie" viewBox="0 0 180 180" role="img"></svg>
        <ul id="legend-${metric}" class="legend"></ul>
      </div>
    </section>`).join("")}
  </div>

  <section class="trend-section">
    <div class="controls">
      <label>国家或地区
        <select id="country"></select>
      </label>
      <label>具体条目
        <select id="metric">${metricOptions}</select>
      </label>
    </div>
    <div class="trend-head">
      <h2>多年走势</h2>
      <span id="selected-value" class="selected-value"></span>
    </div>
    <svg id="trend" class="trend" viewBox="0 0 760 210" role="img"></svg>
    <div id="tooltip" class="tooltip" hidden></div>
  </section>
  <div class="note">上方饼图显示所选年度前 ${topCount} 个国家或地区；下方竖线对应同一市场年度。单位：${escapeHtml(unit)}。</div>
</main>

<script>
(() => {
  const DATA = ${safeJson(data)};
  const YEARS = ${safeJson(years)};
  const PRODUCTS = ${safeJson(products)};
  const IMPORTANT = ${safeJson(config.importantCountries || {})};
  const COLOR_ORDER = ${safeJson(config.countryColorOrder || [])};
  const METRICS = ${safeJson(metricLabels)};
  const UNIT = ${safeJson(unit)};
  const TOP_COUNT = ${topCount};
  const DEFAULT_PRODUCT = ${safeJson(defaultProduct)};
  const DEFAULT_YEAR = ${safeJson(defaultYear)};
  const COLORS = [
    "var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)",
    "color-mix(in oklab, var(--s3) 72%, var(--fg))",
    "color-mix(in oklab, var(--s1) 62%, var(--s5))",
    "color-mix(in oklab, var(--s2) 58%, var(--s4))",
    "color-mix(in oklab, var(--s5) 62%, var(--s2))",
    "color-mix(in oklab, var(--s5) 58%, var(--s3))",
    "color-mix(in oklab, var(--s1) 58%, var(--s6))",
    "color-mix(in oklab, var(--s6) 58%, var(--s2))",
    "color-mix(in oklab, var(--s6) 68%, var(--s3))",
    "color-mix(in oklab, var(--s3) 52%, var(--s6))",
    "color-mix(in oklab, var(--s6) 58%, var(--s4))"
  ];

  const root = document.getElementById("dashboard");
  const productSelect = root.querySelector("#product");
  const yearSelect = root.querySelector("#year");
  const countrySelect = root.querySelector("#country");
  const metricSelect = root.querySelector("#metric");
  const trendSvg = root.querySelector("#trend");
  const selectedValue = root.querySelector("#selected-value");
  const tooltip = root.querySelector("#tooltip");

  const format = value => Number(value || 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  });
  const svgNode = (name, attrs = {}) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  const valueAt = (product, country, metric, year) =>
    DATA[product]?.[country]?.[metric]?.[year] ?? null;
  const countryColor = country => {
    const configured = COLOR_ORDER.indexOf(country);
    if (configured >= 0) return COLORS[configured % COLORS.length];
    const hash = [...country].reduce(
      (sum, character) => (sum * 31 + character.codePointAt(0)) >>> 0,
      0
    );
    return COLORS[hash % COLORS.length];
  };

  function countriesForProduct(product) {
    return Object.keys(DATA[product] || {}).sort((a, b) =>
      a.localeCompare(b, "zh-CN")
    );
  }

  function syncCountries() {
    const product = productSelect.value;
    const available = new Set(countriesForProduct(product));
    const configured = (IMPORTANT[product] || []).filter(country => available.has(country));
    const countries = configured.length ? configured : [...available];
    const current = countrySelect.value;
    countrySelect.replaceChildren();
    for (const country of countries) {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      countrySelect.appendChild(option);
    }
    countrySelect.value = countries.includes(current)
      ? current
      : countries.includes("中国") ? "中国" : countries[0];
  }

  function topCountries(metric) {
    const product = productSelect.value;
    const year = yearSelect.value;
    return countriesForProduct(product)
      .map(country => [country, Number(valueAt(product, country, metric, year) || 0)])
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_COUNT);
  }

  function polar(radius, angle) {
    return [90 + radius * Math.cos(angle), 88 + radius * Math.sin(angle)];
  }

  function arcPath(start, end) {
    const inner = 38;
    const outer = 66;
    const [x1, y1] = polar(outer, start);
    const [x2, y2] = polar(outer, end);
    const [x3, y3] = polar(inner, end);
    const [x4, y4] = polar(inner, start);
    const large = end - start > Math.PI ? 1 : 0;
    return [
      "M", x1, y1,
      "A", outer, outer, 0, large, 1, x2, y2,
      "L", x3, y3,
      "A", inner, inner, 0, large, 0, x4, y4,
      "Z"
    ].join(" ");
  }

  function drawPie(metric) {
    const svg = root.querySelector("#pie-" + metric);
    const legend = root.querySelector("#legend-" + metric);
    const items = topCountries(metric);
    const total = items.reduce((sum, [, value]) => sum + value, 0);
    svg.replaceChildren();
    legend.replaceChildren();
    const label =
      yearSelect.value + productSelect.value + METRICS[metric] +
      "主要国家分布，前" + TOP_COUNT + "合计" + format(total) + UNIT;
    svg.setAttribute("aria-label", label);
    const title = svgNode("title");
    title.textContent = label;
    svg.appendChild(title);

    let angle = -Math.PI / 2;
    for (const [country, value] of items) {
      const span = total ? value / total * Math.PI * 2 : 0;
      const color = countryColor(country);
      const path = svgNode("path", {
        d: arcPath(angle, angle + span),
        fill: color
      });
      const pathTitle = svgNode("title");
      pathTitle.textContent =
        country + " " + format(value) + UNIT + "，" +
        (value / total * 100).toFixed(1) + "%";
      path.appendChild(pathTitle);
      svg.appendChild(path);
      angle += span;

      const item = document.createElement("li");
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = color;
      const name = document.createElement("span");
      name.className = "legend-name";
      name.textContent = country;
      const amount = document.createElement("span");
      amount.className = "legend-value";
      amount.textContent =
        format(value) + " · " + (value / total * 100).toFixed(0) + "%";
      item.append(swatch, name, amount);
      legend.appendChild(item);
    }

    const totalText = svgNode("text", {
      x: 90, y: 84, "text-anchor": "middle", class: "center-total"
    });
    totalText.textContent = format(total);
    const unitText = svgNode("text", {
      x: 90, y: 103, "text-anchor": "middle", class: "center-unit"
    });
    unitText.textContent = "前" + TOP_COUNT + "合计";
    svg.append(totalText, unitText);
  }

  function niceCeiling(value) {
    if (value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    const scaled = value / power;
    const step =
      scaled <= 1 ? 1 :
      scaled <= 1.5 ? 1.5 :
      scaled <= 2 ? 2 :
      scaled <= 3 ? 3 :
      scaled <= 4 ? 4 :
      scaled <= 5 ? 5 :
      scaled <= 6 ? 6 :
      scaled <= 8 ? 8 : 10;
    return step * power;
  }

  function linePath(points) {
    return points.map((point, index) =>
      (index ? "L" : "M") + " " + point[0].toFixed(2) + " " + point[1].toFixed(2)
    ).join(" ");
  }

  function drawTrend() {
    const product = productSelect.value;
    const country = countrySelect.value;
    const metric = metricSelect.value;
    const series = YEARS.map(year => valueAt(product, country, metric, year));
    const width = 760;
    const height = 210;
    const margin = { left: 52, right: 42, top: 14, bottom: 32 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const ceiling = niceCeiling(Math.max(1, ...series.map(value => Number(value || 0))));
    const x = index => margin.left + index / Math.max(1, YEARS.length - 1) * plotWidth;
    const y = value =>
      margin.top + plotHeight - Number(value || 0) / ceiling * plotHeight;
    trendSvg.replaceChildren();
    const label = country + product + METRICS[metric] + "多年走势，单位" + UNIT;
    trendSvg.setAttribute("aria-label", label);
    const title = svgNode("title");
    title.textContent = label;
    trendSvg.appendChild(title);

    for (let tick = 0; tick <= 4; tick += 1) {
      const value = ceiling / 4 * tick;
      const yy = y(value);
      trendSvg.appendChild(svgNode("line", {
        x1: margin.left, x2: width - margin.right,
        y1: yy, y2: yy, class: "grid-line"
      }));
      const tickLabel = svgNode("text", {
        x: margin.left - 7, y: yy + 4,
        "text-anchor": "end", class: "axis-label"
      });
      tickLabel.textContent = format(value);
      trendSvg.appendChild(tickLabel);
    }

    const tickIndexes = [...new Set([
      0,
      Math.round((YEARS.length - 1) * 0.2),
      Math.round((YEARS.length - 1) * 0.4),
      Math.round((YEARS.length - 1) * 0.6),
      Math.round((YEARS.length - 1) * 0.8),
      YEARS.length - 1
    ])];
    for (const index of tickIndexes) {
      const tickLabel = svgNode("text", {
        x: x(index), y: height - 6,
        "text-anchor": "middle", class: "axis-label"
      });
      tickLabel.textContent = YEARS[index];
      trendSvg.appendChild(tickLabel);
    }

    const points = series.map((value, index) => [x(index), y(value)]);
    trendSvg.appendChild(svgNode("path", {
      d: linePath(points),
      fill: "none",
      stroke: "var(--s1)",
      "stroke-width": 2.5
    }));

    const guideLine = svgNode("line", {
      y1: margin.top, y2: margin.top + plotHeight, class: "year-line"
    });
    const guideDot = svgNode("circle", {
      r: 4, fill: "var(--s1)", stroke: "var(--bg)", "stroke-width": 2
    });
    trendSvg.append(guideLine, guideDot);

    function setGuide(index) {
      guideLine.setAttribute("x1", x(index));
      guideLine.setAttribute("x2", x(index));
      guideDot.setAttribute("cx", x(index));
      guideDot.setAttribute("cy", y(series[index]));
      selectedValue.textContent =
        YEARS[index] + "　" + country + "　" + METRICS[metric] +
        " " + format(series[index]) + " " + UNIT;
    }

    const selectedIndex = Math.max(0, YEARS.indexOf(yearSelect.value));
    setGuide(selectedIndex);
    const hit = svgNode("rect", {
      x: margin.left, y: margin.top, width: plotWidth,
      height: plotHeight, class: "hit"
    });
    const indexFromEvent = event => {
      const point = trendSvg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const local = point.matrixTransform(trendSvg.getScreenCTM().inverse());
      return Math.max(0, Math.min(
        YEARS.length - 1,
        Math.round((local.x - margin.left) / plotWidth * (YEARS.length - 1))
      ));
    };
    hit.addEventListener("pointermove", event => {
      const index = indexFromEvent(event);
      setGuide(index);
      const bounds = root.getBoundingClientRect();
      tooltip.innerHTML =
        "<strong>" + YEARS[index] + "</strong><br>" +
        country + " · " + METRICS[metric] + "：" +
        format(series[index]) + " " + UNIT;
      tooltip.hidden = false;
      tooltip.style.left =
        Math.min(bounds.width - 190, Math.max(8, event.clientX - bounds.left + 12)) + "px";
      tooltip.style.top =
        Math.max(8, event.clientY - bounds.top - 24) + "px";
    });
    hit.addEventListener("pointerleave", () => {
      tooltip.hidden = true;
      setGuide(Math.max(0, YEARS.indexOf(yearSelect.value)));
    });
    hit.addEventListener("click", event => {
      const index = indexFromEvent(event);
      yearSelect.value = YEARS[index];
      drawPies();
      setGuide(index);
    });
    trendSvg.appendChild(hit);
  }

  function drawPies() {
    for (const metric of Object.keys(METRICS)) drawPie(metric);
  }

  function updateAll() {
    drawPies();
    drawTrend();
  }

  productSelect.value = DEFAULT_PRODUCT;
  yearSelect.value = DEFAULT_YEAR;
  syncCountries();
  updateAll();

  productSelect.addEventListener("change", () => {
    syncCountries();
    updateAll();
  });
  yearSelect.addEventListener("change", updateAll);
  countrySelect.addEventListener("change", drawTrend);
  metricSelect.addEventListener("change", drawTrend);
})();
</script>
</body>
</html>
`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, html, "utf8");
console.log(JSON.stringify({
  configPath,
  dataPath,
  outputPath,
  rows: rows.length,
  products,
  years: [years[0], years.at(-1)],
}));
