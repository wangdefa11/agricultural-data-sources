/**
 * 生产构建后的最小页面检查。
 *
 * 修改布局通常无需改测试；如果删改了页面上的关键标题或模块，再同步调整断言。
 * 运行方式：npm test。
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the commodity relationship map", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>农产品研究 Wiki｜品种关系与研究框架<\/title>/);
  assert.match(html, /从品种关系进入 Wiki/);
  assert.match(html, /压榨/);
  assert.match(html, /蛋白替代/);
  assert.match(html, /养殖需求/);
  assert.match(html, /国内上市品种/);
  assert.match(html, />油脂</);
  assert.match(html, /玉米淀粉/);
  assert.match(html, /白糖/);
  assert.doesNotMatch(html, /CBOT|外盘|棉花|棉纱|短纤|PTA|乙二醇/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders the sugar, red-date, and apple research pages", async () => {
  for (const slug of ["sugar", "red-date", "apple"]) {
    const response = await render(`/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /品种与合约/);
    assert.match(html, /交割标准/);
    assert.match(html, /郑州商品交易所/);
    assert.match(html, /每日跟踪/);
    assert.match(html, new RegExp(`/commodities/${slug}/images/hero\\.jpg`));
    if (slug === "red-date" || slug === "apple") {
      assert.match(html, new RegExp(`/commodities/${slug}/production\\.html\\?v=`));
    }
  }
});

test("generated pages do not contain update-date fields or labels", async () => {
  const generated = await readFile(
    new URL("../content/generated/site-content.json", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(generated, /updatedAt|updatedPrefix|updated_at/);
  const response = await render("/apple");
  assert.equal(response.status, 200);
  assert.doesNotMatch(await response.text(), /数据框架更新于|内容框架更新于/);
});

test("tables directly under section headings render as table blocks", async () => {
  const generated = JSON.parse(await readFile(
    new URL("../content/generated/site-content.json", import.meta.url),
    "utf8",
  ));
  for (const page of Object.values(generated.pages)) {
    for (const section of page.sections) {
      assert.doesNotMatch(section.description, /\|\s*:?-{3,}/);
    }
  }
  const production = generated.pages.apple.sections.find(
    section => section.id === "production",
  );
  assert.ok(production);
  assert.deepEqual(production.blocks[0].columns, [
    "从统计产量到可交割量",
    "主要筛选",
  ]);
  assert.match(production.blocks[1].paragraphs[0], /国家统计局公开资料/);
});

test("cost and conversion sections render tables instead of raw Markdown", async () => {
  const generated = JSON.parse(await readFile(
    new URL("../content/generated/site-content.json", import.meta.url),
    "utf8",
  ));
  const expectations = [
    ["hog", "demand", "饲料与原料参考参数", "生猪原料换算公式"],
    ["egg", "demand", "料蛋比与配方参考参数", "鸡蛋饲料换算公式"],
    ["soybean", "pricing", "大豆压榨参考出率", "压榨价值与毛利公式"],
  ];

  for (const [slug, sectionId, parameterTitle, formulaTitle] of expectations) {
    const section = generated.pages[slug].sections.find(
      item => item.id === sectionId,
    );
    assert.ok(section);
    for (const title of [parameterTitle, formulaTitle]) {
      const block = section.blocks.find(item => item.title === title);
      assert.equal(block?.kind, "table");
    }
    assert.doesNotMatch(JSON.stringify(section), /```text/);
  }
});

test("apple and red-date production charts keep official data boundaries", async () => {
  const apple = await readFile(
    new URL("../content/commodities/apple/charts/production.html", import.meta.url),
    "utf8",
  );
  assert.match(apple, /2013—2022年全国苹果产量/);
  assert.match(apple, /4757/);
  assert.match(apple, /国家统计局/);
  assert.match(apple, /commodity-chart-height/);

  const redDate = await readFile(
    new URL("../content/commodities/red-date/charts/production.html", import.meta.url),
    "utf8",
  );
  assert.match(redDate, /新疆红枣产量与全国占比/);
  assert.match(redDate, /337/);
  assert.match(redDate, /45\.2%/);
  assert.match(redDate, /不反推全国总量/);
  assert.match(redDate, /commodity-chart-height/);
});

test("server-renders the soybean macro and daily sections", async () => {
  const response = await render("/soybean");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /宏观数据/);
  assert.match(html, /日报数据/);
  assert.match(html, /commodities\/soybean\/four-charts\.html/);
  assert.match(html, /巴西产量/);
  assert.match(html, /全球供需阅读顺序/);
  assert.match(html, /全国豆粕现货均价/);
  assert.match(html, /每日日报检查顺序/);
  assert.match(html, /关联品种/);
});

test("server-renders USDA four-chart embeds on internationally linked pages", async () => {
  for (const slug of [
    "soybean-no2",
    "soymeal",
    "soybean-oil",
    "rapeseed",
    "rapeseed-meal",
    "rapeseed-oil",
    "palm-oil",
    "sugar",
  ]) {
    const response = await render(`/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(`commodities/${slug}/four-charts\\.html`));
  }
});

test("USDA four-chart files include the producing-country world map", async () => {
  for (const slug of [
    "soybean",
    "soybean-no2",
    "soymeal",
    "soybean-oil",
    "rapeseed",
    "rapeseed-meal",
    "rapeseed-oil",
    "palm-oil",
    "sugar",
  ]) {
    const chartUrl = new URL(
      `../content/commodities/${slug}/charts/four-charts.html`,
      import.meta.url,
    );
    const html = await readFile(chartUrl, "utf8");
    assert.match(html, /id="world-map"/);
    assert.match(html, /主产国地图/);
    assert.match(html, /底图：Natural Earth 1:110m；产量：USDA PSD。/);
    assert.match(html, /function drawMap\(\)/);
    assert.match(html, /commodity-chart-height/);
    assert.match(html, /id="crop-calendar-title"/);
    assert.match(html, /id="industry-note-title"/);
    assert.doesNotMatch(html, /id="soybean-cost"|id="chain-grid"/);
    assert.equal((html.match(/class="season-row"/g) ?? []).length, 3);
    assert.match(html, /viewBox="0 0 960 360"/);
    assert.match(html, /中国台湾/);
    assert.doesNotMatch(html, /"id":"TWN"|"id":"ATA"/);
    if (slug === "soybean" || slug === "soybean-no2") {
      assert.match(html, /id="china-demand-title"/);
      assert.match(html, /中国国内消费结构与趋势/);
      assert.match(html, /农业农村部市场预警专家委员会/);
      assert.match(html, /const CHINA_CONSUMPTION = \{/);
      assert.doesNotMatch(html, /来源：USDA PSD；单位/);
    } else {
      assert.doesNotMatch(html, /id="china-demand-title"/);
    }
    assert.match(html, /function drawChinaDemand\(\)/);
  }
});

test("server-renders domestic production maps for hogs and eggs", async () => {
  for (const slug of ["hog", "egg"]) {
    const response = await render(`/${slug}`);
    assert.equal(response.status, 200);
    const page = await response.text();
    assert.match(page, new RegExp(`/commodities/${slug}/china-production\\.html\\?v=`));
    const chart = await readFile(
      new URL(`../content/commodities/${slug}/charts/china-production.html`, import.meta.url),
      "utf8",
    );
    assert.match(chart, /2024年主产省分布/);
    assert.match(chart, /国家统计局《中国统计年鉴2025》表12-14/);
    assert.match(chart, /china-standard-map-gs2016-2893\.jpg/);
    assert.match(chart, /class="pie"/);
    assert.match(chart, /主产省产量占比/);
    assert.match(chart, />其他</);
    assert.doesNotMatch(chart, /class="share-list"/);
    assert.match(chart, /commodity-chart-height/);
  }
});
