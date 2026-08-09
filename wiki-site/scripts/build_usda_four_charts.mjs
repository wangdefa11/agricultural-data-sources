import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const wikiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = path.resolve(wikiRoot, "..");
const psdRoot = path.join(projectRoot, "data", "raw", "psd");
const worldMapPath = path.join(
  wikiRoot,
  "data",
  "ne_110m_admin_0_countries.geojson",
);
const dashboardBuilder = path.join(
  projectRoot,
  "archive",
  "legacy-web-dashboard",
  "commodity-four-chart-template",
  "scripts",
  "build-dashboard.mjs",
);

const products = {
  "Oilseed, Soybean": "大豆",
  "Meal, Soybean": "豆粕",
  "Oil, Soybean": "豆油",
  "Oilseed, Rapeseed": "菜籽",
  "Meal, Rapeseed": "菜粕",
  "Oil, Rapeseed": "菜籽油",
  "Oil, Palm": "棕榈油",
  "Sugar, Centrifugal": "白糖",
};

const metrics = {
  Production: "production",
  Exports: "exports",
  Imports: "imports",
  "Domestic Consumption": "consumption",
  "Human Dom. Consumption": "consumption",
};

const chinaConsumption = {
  "大豆": {
    "2024/25": { total: 118.56, crush: 98.9, food: 15.6, seedOther: 4.06 },
    "2025/26": { total: 121.35, crush: 101.4, food: 15.85, seedOther: 4.1 },
    "2026/27": { total: 113.96, crush: 94, food: 16, seedOther: 3.96 },
  },
};

const chinaConsumptionNotes = {
  "大豆": "大豆市场年度为当年10月至次年9月；2025/26为估计，2026/27为预测。“种子及其他”为种子用量、损耗及其他之和。",
};

const chinaConsumptionSource = {
  label: "农业农村部市场预警专家委员会《2026年6月中国农产品供需形势分析》",
  url: "https://scs.moa.gov.cn/jcyj/202606/t20260611_6484941.htm",
};

const countries = {
  Argentina: "阿根廷",
  Australia: "澳大利亚",
  Bangladesh: "孟加拉国",
  Belarus: "白俄罗斯",
  Bolivia: "玻利维亚",
  Brazil: "巴西",
  Canada: "加拿大",
  Chile: "智利",
  China: "中国",
  Colombia: "哥伦比亚",
  "Cote d'Ivoire": "科特迪瓦",
  Egypt: "埃及",
  "European Union": "欧盟",
  "EU-15": "欧盟",
  Guatemala: "危地马拉",
  Honduras: "洪都拉斯",
  India: "印度",
  Indonesia: "印度尼西亚",
  Iran: "伊朗",
  Japan: "日本",
  Kazakhstan: "哈萨克斯坦",
  "Korea, South": "韩国",
  Malaysia: "马来西亚",
  Mexico: "墨西哥",
  Moldova: "摩尔多瓦",
  Morocco: "摩洛哥",
  Nigeria: "尼日利亚",
  Norway: "挪威",
  Pakistan: "巴基斯坦",
  Paraguay: "巴拉圭",
  Peru: "秘鲁",
  Philippines: "菲律宾",
  "Papua New Guinea": "巴布亚新几内亚",
  Russia: "俄罗斯",
  Thailand: "泰国",
  Turkey: "土耳其",
  Ukraine: "乌克兰",
  "United Arab Emirates": "阿联酋",
  "United Kingdom": "英国",
  "United States": "美国",
  Uruguay: "乌拉圭",
  Vietnam: "越南",
};

const importantCountries = {
  "大豆": ["中国", "巴西", "美国", "阿根廷", "欧盟", "巴拉圭", "加拿大", "印度"],
  "豆粕": ["中国", "阿根廷", "巴西", "美国", "欧盟", "印度", "越南", "印度尼西亚"],
  "豆油": ["中国", "美国", "巴西", "阿根廷", "印度", "欧盟", "孟加拉国"],
  "菜籽": ["加拿大", "欧盟", "中国", "印度", "澳大利亚", "俄罗斯", "乌克兰", "日本"],
  "菜粕": ["欧盟", "中国", "加拿大", "印度", "美国", "俄罗斯", "孟加拉国"],
  "菜籽油": ["欧盟", "中国", "加拿大", "印度", "美国", "俄罗斯", "日本"],
  "棕榈油": ["印度尼西亚", "马来西亚", "印度", "中国", "欧盟", "泰国", "巴基斯坦", "哥伦比亚"],
  "白糖": ["巴西", "印度", "欧盟", "中国", "泰国", "美国", "墨西哥", "巴基斯坦", "俄罗斯", "澳大利亚"],
};

const countryCodes = {
  "阿根廷": "ARG", "澳大利亚": "AUS", "孟加拉国": "BGD", "白俄罗斯": "BLR",
  "玻利维亚": "BOL", "巴西": "BRA", "加拿大": "CAN", "智利": "CHL", "中国": "CHN",
  "哥伦比亚": "COL", "科特迪瓦": "CIV", "埃及": "EGY", "危地马拉": "GTM",
  "洪都拉斯": "HND", "印度": "IND", "印度尼西亚": "IDN", "伊朗": "IRN", "日本": "JPN",
  "哈萨克斯坦": "KAZ", "韩国": "KOR", "马来西亚": "MYS", "墨西哥": "MEX",
  "摩尔多瓦": "MDA", "摩洛哥": "MAR", "尼日利亚": "NGA", "挪威": "NOR",
  "巴基斯坦": "PAK", "巴拉圭": "PRY", "秘鲁": "PER", "菲律宾": "PHL",
  "巴布亚新几内亚": "PNG", "俄罗斯": "RUS", "泰国": "THA", "土耳其": "TUR",
  "乌克兰": "UKR", "阿联酋": "ARE", "英国": "GBR", "美国": "USA", "乌拉圭": "URY",
  "越南": "VNM",
};

const cropCalendars = {
  soybean: {
    title: "大豆前三大主产国生长季",
    description: "同一月份，南北半球大豆可能分别处于播种、结荚或收获阶段。",
    rows: [
      { country: "巴西", note: "南半球", phases: [
        { start: 9, end: 11, kind: "sow", label: "播种" },
        { start: 12, end: 12, kind: "grow", label: "生长" },
        { start: 1, end: 1, kind: "critical", label: "开花结荚" },
        { start: 2, end: 3, kind: "fill", label: "鼓粒" },
        { start: 4, end: 6, kind: "harvest", label: "收获" },
      ] },
      { country: "美国", note: "北半球", phases: [
        { start: 4, end: 6, kind: "sow", label: "播种" },
        { start: 7, end: 8, kind: "critical", label: "开花结荚" },
        { start: 9, end: 9, kind: "fill", label: "鼓粒成熟" },
        { start: 10, end: 11, kind: "harvest", label: "收获" },
      ] },
      { country: "阿根廷", note: "南半球", phases: [
        { start: 10, end: 12, kind: "sow", label: "播种" },
        { start: 1, end: 2, kind: "critical", label: "开花结荚" },
        { start: 3, end: 3, kind: "fill", label: "鼓粒成熟" },
        { start: 4, end: 6, kind: "harvest", label: "收获" },
      ] },
    ],
    legend: [
      { label: "播种", color: "s1" }, { label: "营养生长", color: "s3" },
      { label: "开花结荚", color: "s2" }, { label: "鼓粒成熟", color: "s4" },
      { label: "收获", color: "s5" },
    ],
    note: "窗口为主产区典型月份，国内区域、品种和当年天气会造成前后偏移。",
    sources: [
      { label: "USDA FAS 巴西", url: "https://ipad.fas.usda.gov/Cropexplorer/cropview/comm_chartview.aspx?cntryid=BRA&cropid=2222000" },
      { label: "美国", url: "https://ipad.fas.usda.gov/Cropexplorer/cropview/comm_chartview.aspx?cntryid=USA&cropid=2222000" },
      { label: "阿根廷", url: "https://ipad.fas.usda.gov/Cropexplorer/cropview/comm_chartview.aspx?cntryid=ARG&cropid=2222000" },
    ],
  },
  rapeseed: {
    title: "菜籽前三大主产国生长季",
    description: "加拿大以春播为主，欧盟和中国主产区以越冬型菜籽为主，年度节奏明显错开。",
    rows: [
      { country: "加拿大", note: "春播菜籽", phases: [
        { start: 5, end: 5, kind: "sow", label: "播种" },
        { start: 6, end: 6, kind: "grow", label: "生长" },
        { start: 7, end: 7, kind: "critical", label: "开花" },
        { start: 8, end: 8, kind: "fill", label: "结荚成熟" },
        { start: 9, end: 10, kind: "harvest", label: "收获" },
      ] },
      { country: "欧盟", note: "冬菜籽为主", phases: [
        { start: 1, end: 2, kind: "dormant", label: "越冬" },
        { start: 3, end: 3, kind: "grow", label: "返青" },
        { start: 4, end: 5, kind: "critical", label: "开花" },
        { start: 6, end: 6, kind: "fill", label: "结荚成熟" },
        { start: 7, end: 7, kind: "harvest", label: "收获" },
        { start: 8, end: 9, kind: "sow", label: "播种" },
        { start: 10, end: 11, kind: "grow", label: "苗期" },
        { start: 12, end: 12, kind: "dormant", label: "越冬" },
      ] },
      { country: "中国", note: "长江流域冬菜籽", phases: [
        { start: 1, end: 1, kind: "grow", label: "越冬" },
        { start: 2, end: 3, kind: "critical", label: "返青开花" },
        { start: 4, end: 4, kind: "fill", label: "结荚成熟" },
        { start: 5, end: 6, kind: "harvest", label: "收获" },
        { start: 9, end: 10, kind: "sow", label: "播种" },
        { start: 11, end: 12, kind: "grow", label: "苗期越冬" },
      ] },
    ],
    legend: [
      { label: "播种", color: "s1" }, { label: "营养生长", color: "s3" },
      { label: "开花", color: "s2" }, { label: "结荚成熟", color: "s4" },
      { label: "收获", color: "s5" }, { label: "越冬", color: "muted" },
    ],
    note: "窗口为主产区典型月份；欧盟内部、加拿大草原省份和中国不同熟制之间存在差异。",
    sources: [
      { label: "USDA FAS 加拿大", url: "https://ipad.fas.usda.gov/cropexplorer/Cropview/comm_chartview.aspx?cntryid=CAN&cropid=2226000" },
      { label: "欧盟", url: "https://ipad.fas.usda.gov/cropexplorer/cropview/comm_chartview.aspx?cntryid=EUE&cropid=2226000" },
      { label: "中国", url: "https://ipad.fas.usda.gov/cropexplorer/Cropview/comm_chartview.aspx?cntryid=CHN&cropid=2226000" },
    ],
  },
  "palm-oil": {
    title: "棕榈油前三大生产国采收季节",
    description: "油棕是多年生作物，成熟种植园全年采收鲜果串，不存在一年一度的统一播种—收获季。",
    rows: [
      { country: "印度尼西亚", note: "多年生油棕", phases: [
        { start: 1, end: 12, kind: "year-round", label: "全年连续采收" },
      ] },
      { country: "马来西亚", note: "12—2月通常偏低，3—9月回升", phases: [
        { start: 1, end: 12, kind: "year-round", label: "全年连续采收" },
      ] },
      { country: "泰国", note: "主产区集中在南部", phases: [
        { start: 1, end: 12, kind: "year-round", label: "全年连续采收" },
      ] },
    ],
    legend: [{ label: "全年采收", color: "s6" }],
    note: "月度产量仍受降雨、前期干旱滞后效应、树龄和劳动力影响；图中不把油棕误画成一年生作物。",
    sources: [
      { label: "USDA FAS 印度尼西亚", url: "https://ipad.fas.usda.gov/cropexplorer/cropview/comm_chartview.aspx?cntryid=IDN&cropid=4243000" },
      { label: "马来西亚", url: "https://ipad.fas.usda.gov/cropexplorer/cropview/comm_chartview.aspx?cntryid=MYS&cropid=4243000" },
      { label: "泰国", url: "https://ipad.fas.usda.gov/Cropexplorer/cropview/comm_chartview.aspx?cntryid=THA&cropid=4243000" },
    ],
  },
  sugar: {
    title: "白糖三大关键生产国生长与压榨季",
    description: "甘蔗从田间成熟到糖厂压榨存在明确季节，南北半球错位使全球供应在全年分段接续。",
    rows: [
      { country: "巴西", note: "中南部，南半球", phases: [
        { start: 1, end: 3, kind: "grow", label: "雨季生长" },
        { start: 4, end: 11, kind: "harvest", label: "收获压榨" },
        { start: 12, end: 12, kind: "grow", label: "雨季生长" },
      ] },
      { country: "印度", note: "北半球，多播期", phases: [
        { start: 1, end: 3, kind: "sow", label: "春植" },
        { start: 4, end: 9, kind: "grow", label: "生长积糖" },
        { start: 10, end: 12, kind: "harvest", label: "收获压榨" },
      ] },
      { country: "泰国", note: "北半球，雨养蔗为主", phases: [
        { start: 1, end: 4, kind: "harvest", label: "收获压榨" },
        { start: 5, end: 6, kind: "sow", label: "雨季种植" },
        { start: 7, end: 10, kind: "grow", label: "生长积糖" },
        { start: 11, end: 12, kind: "harvest", label: "收获压榨" },
      ] },
    ],
    legend: [
      { label: "种植", color: "s1" },
      { label: "生长积糖", color: "s3" },
      { label: "收获压榨", color: "s5" },
    ],
    note: "窗口为主产区典型月份；甘蔗为多年生宿根作物，各产区、植期和天气会使窗口前后移动。",
    sources: [
      { label: "USDA FAS 巴西", url: "https://ipad.fas.usda.gov/Cropexplorer/cropview/comm_chartview.aspx?cntryid=BRA&cropid=0612000" },
      { label: "印度", url: "https://ipad.fas.usda.gov/Cropexplorer/cropview/comm_chartview.aspx?cntryid=IND&cropid=0612000" },
      { label: "泰国", url: "https://ipad.fas.usda.gov/Cropexplorer/cropview/comm_chartview.aspx?cntryid=THA&cropid=0612000" },
    ],
  },
};

const groups = [
  {
    key: "soybean",
    title: "大豆产业链全球供需结构",
    products: ["大豆", "豆粕", "豆油"],
    cropCalendar: cropCalendars.soybean,
    industryNote: {
      title: "大豆—豆粕—豆油的利润关系",
      text: "大豆压榨会同时产出豆粕和豆油，通常每吨大豆约产出0.2吨豆油，其余主要形成豆粕并包含少量加工损耗，实际比例随含油率和工艺变化。油厂关注的是豆粕与豆油的合计销售价值能否覆盖进口大豆到厂成本、加工费和损耗：豆油上涨也可能改善压榨利润、提高开机，进而增加豆粕供应。中国市场还要同时观察进口成本、压榨量、油粕库存和下游提货，不能只用单一产品价格判断利润。",
    },
    targets: { soybean: "大豆", "soybean-no2": "大豆", soymeal: "豆粕", "soybean-oil": "豆油" },
  },
  {
    key: "rapeseed",
    title: "菜籽产业链全球供需结构",
    products: ["菜籽", "菜粕", "菜籽油"],
    cropCalendar: cropCalendars.rapeseed,
    industryNote: {
      title: "菜籽—菜粕—菜籽油的利润关系",
      text: "菜籽压榨同时形成菜籽油和菜粕，出油率与出粕率受菜籽含油率、水分和加工工艺影响。压榨利润取决于菜油与菜粕的合计价值减去菜籽到厂及加工成本；菜油通常贡献较高的单位价值，菜粕则受水产、禽畜饲料需求和与豆粕价差影响。分析中国市场时，应把进口菜籽与菜油、菜粕的替代关系以及工厂开机和库存放在一起看。",
    },
    targets: { rapeseed: "菜籽", "rapeseed-meal": "菜粕", "rapeseed-oil": "菜籽油" },
  },
  {
    key: "palm-oil",
    title: "全球棕榈油供需结构",
    products: ["棕榈油"],
    cropCalendar: cropCalendars["palm-oil"],
    industryNote: {
      title: "棕榈油的加工与中国市场关系",
      text: "棕榈油来自油棕鲜果串加工，产地利润主要受鲜果串成本、出油率、棕榈油及棕榈仁副产品价格影响。中国并非主要油棕生产国，国内定价更接近进口到港成本、库存和消费变化；同时还要比较豆油、菜籽油的价差与替代性，因此全球产量变化往往通过进口成本和油脂间替代传导到中国市场。",
    },
    targets: { "palm-oil": "棕榈油" },
  },
  {
    key: "sugar",
    title: "全球白糖供需结构",
    products: ["白糖"],
    cropCalendar: cropCalendars.sugar,
    industryNote: {
      title: "国际原糖如何传导到中国白糖",
      text: "全球白糖边际供应主要看巴西制糖比与压榨进度、印度产量及出口政策、泰国产量和装运。国际原糖价格还要叠加配额内外关税、汇率、海运、精炼损耗与加工费，才能形成中国进口加工糖成本；因此外盘上涨或全球增产不会等比例、同步反映到郑糖。国内判断仍应以CASDE供需、糖厂产销、工业库存和进口到港为主。",
    },
    targets: { sugar: "白糖" },
  },
];

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

function csvCell(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: projectRoot, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`图表生成失败：${code}`)));
  });
}

const releases = (await fs.readdir(psdRoot, { withFileTypes: true }))
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();
const release = releases.at(-1);
if (!release) throw new Error("本地没有 USDA PSD 数据");
const groupRows = Object.fromEntries(groups.map(group => [group.key, []]));
const inputNames = ["psd_oilseeds.csv", "psd_sugar.csv"];
const inputPaths = [];
for (const inputName of inputNames) {
  for (const candidateRelease of [...releases].reverse()) {
    const candidatePath = path.join(psdRoot, candidateRelease, inputName);
    try {
      await fs.access(candidatePath);
      inputPaths.push({ release: candidateRelease, path: candidatePath });
      break;
    } catch {}
  }
}
for (const input of inputPaths) {
  const source = await fs.readFile(input.path, "utf8");
  const lines = source.split("\n");
  const header = parseCsvLine(lines[0].replace(/^\uFEFF/, ""));
  const column = Object.fromEntries(header.map((name, index) => [name, index]));
  for (let index = 1; index < lines.length; index += 1) {
    if (!lines[index]) continue;
    const row = parseCsvLine(lines[index]);
    const product = products[row[column.Commodity_Description]];
    const metric = metrics[row[column.Attribute_Description]];
    const year = Number(row[column.Market_Year]);
    if (!product || year < 2000 || year > 2026 || !metric) continue;
    const marketYear = `${year}/${String(year + 1).slice(-2)}`;
    const group = groups.find(candidate => candidate.products.includes(product));
    groupRows[group.key].push({
      product,
      country: countries[row[column.Country_Name]] || row[column.Country_Name],
      marketYear,
      metric,
      value: Number(row[column.Value]) / 1000,
    });
  }
}

const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "usda-four-charts-"));
try {
  for (const group of groups) {
    const rows = groupRows[group.key].sort((a, b) =>
      a.product.localeCompare(b.product, "zh-CN") ||
      a.marketYear.localeCompare(b.marketYear) ||
      a.metric.localeCompare(b.metric) ||
      a.country.localeCompare(b.country, "zh-CN")
    );
    const dataPath = path.join(temporaryRoot, `${group.key}.csv`);
    await fs.writeFile(dataPath, [
      "product,country,market_year,metric,value",
      ...rows.map(row => [
        row.product,
        row.country,
        row.marketYear,
        row.metric,
        Number(row.value.toFixed(3)),
      ].map(csvCell).join(",")),
    ].join("\n") + "\n", "utf8");

    for (const [slug, defaultProduct] of Object.entries(group.targets)) {
      const outputPath = path.join(
        wikiRoot,
        "content",
        "commodities",
        slug,
        "charts",
        "four-charts.html",
      );
      const configPath = path.join(temporaryRoot, `${slug}.json`);
      await fs.writeFile(configPath, JSON.stringify({
        title: group.title,
        unit: "百万吨",
        defaultProduct,
        defaultYear: "2026/27",
        products: group.products,
        dataFile: dataPath,
        outputFile: outputPath,
        mapFile: worldMapPath,
        countryCodes,
        mapPoints: { "欧盟": [10, 50] },
        importantCountries,
        cropCalendar: group.cropCalendar,
        industryNote: group.industryNote,
        chinaConsumption: chinaConsumption[defaultProduct]
          ? { [defaultProduct]: chinaConsumption[defaultProduct] }
          : {},
        chinaConsumptionNotes,
        chinaConsumptionSource: chinaConsumption[defaultProduct]
          ? chinaConsumptionSource
          : {},
        countryColorOrder: [
          "中国", "美国", "巴西", "阿根廷", "欧盟", "印度",
          "印度尼西亚", "马来西亚", "加拿大", "澳大利亚",
          "乌克兰", "俄罗斯", "泰国", "巴基斯坦", "日本",
        ],
        topCount: 6,
      }, null, 2), "utf8");
      await runNode([dashboardBuilder, configPath]);
    }
  }
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}

console.log(`已根据 USDA PSD 本地快照生成 ${groups.reduce((sum, group) => sum + Object.keys(group.targets).length, 0)} 个四图页面`);
