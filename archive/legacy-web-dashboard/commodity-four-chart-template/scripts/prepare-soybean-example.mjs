import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const defaultInput = path.resolve(
  packageDir,
  "../data/raw/psd/2026-07-10/psd_oilseeds.csv"
);
const defaultOutput = path.resolve(packageDir, "data/soybean-example.csv");
const inputPath = path.resolve(process.argv[2] || defaultInput);
const outputPath = path.resolve(process.argv[3] || defaultOutput);

const products = {
  "Oilseed, Soybean": "大豆",
  "Meal, Soybean": "豆粕",
  "Oil, Soybean": "豆油",
};

const metrics = {
  Production: "production",
  Exports: "exports",
  Imports: "imports",
  "Domestic Consumption": "consumption",
};

const countries = {
  China: "中国",
  "United States": "美国",
  Brazil: "巴西",
  Argentina: "阿根廷",
  "European Union": "欧盟",
  "EU-15": "欧盟",
  India: "印度",
  Mexico: "墨西哥",
  Paraguay: "巴拉圭",
  Canada: "加拿大",
  Bolivia: "玻利维亚",
  Uruguay: "乌拉圭",
  Japan: "日本",
  "Korea, South": "韩国",
  Taiwan: "中国台湾",
  Indonesia: "印度尼西亚",
  Thailand: "泰国",
  Vietnam: "越南",
  Bangladesh: "孟加拉国",
  Pakistan: "巴基斯坦",
  Iran: "伊朗",
  Turkey: "土耳其",
  Egypt: "埃及",
  Algeria: "阿尔及利亚",
  Morocco: "摩洛哥",
  Tunisia: "突尼斯",
  Malaysia: "马来西亚",
  Philippines: "菲律宾",
  Russia: "俄罗斯",
  Ukraine: "乌克兰",
  "Saudi Arabia": "沙特阿拉伯",
  "South Africa": "南非",
  Chile: "智利",
  Colombia: "哥伦比亚",
  Venezuela: "委内瑞拉",
  Peru: "秘鲁",
};

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

const source = await fs.readFile(inputPath, "utf8");
const lines = source.split("\n");
const header = parseCsvLine(lines[0].replace(/^\uFEFF/, ""));
const column = Object.fromEntries(header.map((name, index) => [name, index]));
const rows = [];

for (let index = 1; index < lines.length; index += 1) {
  if (!lines[index]) continue;
  const row = parseCsvLine(lines[index]);
  const product = products[row[column.Commodity_Description]];
  const metric = metrics[row[column.Attribute_Description]];
  const year = Number(row[column.Market_Year]);
  if (!product || !metric || year < 2000 || year > 2026) continue;

  const rawCountry = row[column.Country_Name];
  rows.push({
    product,
    country: countries[rawCountry] || rawCountry,
    marketYear: `${year}/${String(year + 1).slice(-2)}`,
    metric,
    value: Number(row[column.Value]) / 1000,
  });
}

rows.sort((a, b) =>
  a.product.localeCompare(b.product, "zh-CN") ||
  a.marketYear.localeCompare(b.marketYear) ||
  a.metric.localeCompare(b.metric) ||
  a.country.localeCompare(b.country, "zh-CN")
);

const output = [
  "product,country,market_year,metric,value",
  ...rows.map(row => [
    row.product,
    row.country,
    row.marketYear,
    row.metric,
    Number(row.value.toFixed(3)),
  ].map(csvCell).join(",")),
].join("\n");

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${output}\n`, "utf8");
console.log(JSON.stringify({ inputPath, outputPath, rows: rows.length }));
