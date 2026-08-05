import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/019fbb09-1f0e-75e3-8f18-2e45e03c7fec";
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const summary = workbook.worksheets.add("实施总览");
const catalog = workbook.worksheets.add("指标数据目录");
const oilseeds = workbook.worksheets.add("油料分布重算");
const assets = workbook.worksheets.add("已有数据资产");

const navy = "#17365D";
const red = "#C00000";
const paleBlue = "#DCE6F1";
const paleGreen = "#E2F0D9";
const paleYellow = "#FFF2CC";
const paleRed = "#FCE4D6";
const gray = "#666666";
const lightBorder = "#D9E2F3";

for (const sheet of [summary, catalog, oilseeds, assets]) {
  sheet.showGridLines = false;
}

const rows = [
  ["生产", "全球/主产国", "大豆收获面积", "年度", "市场年度", "千公顷", "USDA PSD", "已落地", "高", "1964/65—2026/27；98个国家/地区", "SQLite + 年度工作簿", "https://apps.fas.usda.gov/PSDOnline/app/index.html", "对应课件“产量由面积和单产决定”"],
  ["生产", "全球/主产国", "大豆单产", "年度", "市场年度", "吨/公顷", "USDA PSD", "已落地", "高", "1964/65—2026/27", "SQLite + 年度工作簿", "https://apps.fas.usda.gov/PSDOnline/app/index.html", "可与面积、产量联动"],
  ["生产", "全球/主产国", "大豆产量", "年度", "市场年度", "千吨", "USDA PSD", "已落地", "高", "1964/65—2026/27", "SQLite + 年度工作簿", "https://apps.fas.usda.gov/PSDOnline/app/index.html", "中国、美国、巴西、阿根廷已生成宽表"],
  ["生产", "美国", "播种进度/优良率", "周度", "作物年度", "%", "USDA NASS Crop Progress", "官方公开可补", "高", "通常覆盖当季及历史报告", "待建采集器", "https://www.nass.usda.gov/Newsroom/2026/crop-progress.php", "课件所示周度优良率核心数据"],
  ["生产", "巴西", "面积/单产/产量（州级）", "月度/年度", "作物年度", "千公顷、千吨", "CONAB", "官方公开可补", "高", "历史作物系列", "待下载历史表", "https://portaldeinformacoes.conab.gov.br/safra-serie-historica-graos.html", "补足巴西州级产区"],
  ["生产", "阿根廷", "面积/单产/产量（省级）", "月度/年度", "作物年度", "公顷、吨", "阿根廷农业部门", "官方公开可补", "中", "历史估计表", "待下载历史表", "https://datosestimaciones.magyp.gob.ar/reportes.php?reporte=Estimaciones", "补足阿根廷省级产区"],
  ["生产", "中国", "大豆播种面积/产量", "年度", "自然年", "千公顷、万吨", "国家统计局", "官方公开可补", "高", "年度及部分分省数据", "待整理下载", "https://data.stats.gov.cn/", "豆一国产供给核心"],
  ["供需平衡", "中国", "大豆平衡表", "月度发布/年度值", "10月—次年9月", "万吨", "CASDE", "官方公开可补", "高", "历史月报 PDF", "待做PDF抽取与人工复核", "https://scs.moa.gov.cn/jcyj/", "含面积、单产、产量、进口、压榨、食用、结余"],
  ["贸易", "中国", "大豆进口量/金额/来源国", "月度", "自然月", "吨、美元", "海关统计", "官方公开可补", "高", "2018年以来在线查询较便利", "建议人工导出CSV后自动入库", "https://online.customs.gov.cn/", "按巴西/美国/阿根廷拆分"],
  ["贸易", "全球/主产国", "大豆进口/出口", "年度", "市场年度", "千吨", "USDA PSD", "已落地", "高", "1964/65—2026/27", "SQLite + 年度工作簿", "https://apps.fas.usda.gov/PSDOnline/app/index.html", "年度贸易对比可直接使用"],
  ["贸易", "美国", "出口销售/出口检验", "周度", "作物年度", "吨", "USDA FAS/AMS", "官方公开可补", "高", "公开周报", "待建采集器", "https://apps.fas.usda.gov/export-sales/esrd1.html", "短期出口节奏"],
  ["压榨", "全球/主产国", "大豆压榨量", "年度", "市场年度", "千吨", "USDA PSD", "已落地", "高", "1964/65—2026/27", "SQLite + 年度工作簿", "https://apps.fas.usda.gov/PSDOnline/app/index.html", "中国压榨量已生成"],
  ["压榨", "中国", "压榨产能/企业分布", "年度", "自然年", "万吨/日、占比", "行业名录/企业公告/商业机构", "需人工整理", "中", "公开口径分散", "建立企业主数据表", "", "课件13页；不宜把单张旧图长期沿用"],
  ["压榨", "中国", "油厂周度压榨量/开机率", "周度", "自然周", "万吨、%", "商业资讯商", "需商业授权", "高", "通常为付费长历史", "明确供应商与授权后接入", "", "短期豆粕供应关键"],
  ["需求", "中国", "豆粕产量/消费/饲用", "年度", "市场年度", "千吨", "USDA PSD", "已落地", "高", "2000/01—2026/27已生成", "年度工作簿", "https://apps.fas.usda.gov/PSDOnline/app/index.html", "豆粕年度供需宽表"],
  ["需求", "中国", "饲料产量（猪料/禽料/水产）", "月度", "自然月", "万吨", "农业农村部/饲料工业协会", "公开但需整理", "高", "公告和月报口径分散", "先做总量，再按品类补齐", "https://www.moa.gov.cn/", "课件“中国饲料种类分布”及需求前验"],
  ["需求", "中国", "生猪存栏/能繁母猪", "月度/季度", "自然月/季", "万头", "农业农村部/国家统计局", "官方公开可补", "高", "公开公告，需统一频率", "待建整理表", "https://www.stats.gov.cn/", "按4个月领先关系构造豆粕需求指标"],
  ["需求", "中国", "蛋鸡/肉鸡存栏", "月度", "自然月", "亿只", "行业协会/商业资讯商", "公开不足", "中", "官方连续月度长历史较难", "优先整理公开节点，缺口标记", "", "课件蛋鸡存栏预测"],
  ["库存", "全球/主产国", "大豆/豆粕/豆油期末库存", "年度", "市场年度", "千吨", "USDA PSD", "已落地", "高", "2000/01—2026/27已生成", "年度工作簿", "https://apps.fas.usda.gov/PSDOnline/app/index.html", "平衡表库存，不等于现货库存"],
  ["库存", "中国", "大豆港口库存", "周度", "自然周", "万吨", "商业资讯商", "需商业授权", "高", "课件使用的油厂大豆库存可能为商业口径", "采购授权或逐日手工留档", "", "不能用USDA期末库存替代"],
  ["库存", "中国", "油厂豆粕库存", "周度", "自然周", "万吨", "商业资讯商", "需商业授权", "高", "长历史通常付费", "采购授权或逐日手工留档", "", "短期供需压力核心"],
  ["库存", "中国", "豆粕/豆油注册仓单", "日度", "交易日", "张/吨", "大连商品交易所", "官方公开可补", "中", "日度公开", "待建采集器", "https://www.dce.com.cn/", "仅代表可交割库存"],
  ["价格", "中国", "豆粕/豆油期货结算价", "日度", "交易日", "元/吨", "大连商品交易所", "官方公开可补", "高", "历史行情公开", "待建采集器", "https://www.dce.com.cn/", "用于季节性和基差计算"],
  ["价格", "美国", "CBOT大豆/豆粕/豆油期价", "日度", "交易日", "美分/蒲式耳、美元/短吨", "CME/授权行情", "需确认行情授权", "高", "延迟行情公开，批量历史需注意许可", "确定许可后接入", "https://www.cmegroup.com/markets/agriculture/oilseeds.html", "进口成本与油粕比"],
  ["价格", "中国", "豆粕现货价", "日度", "自然日", "元/吨", "商业资讯商/地区报价", "需商业授权", "高", "统一口径的长历史较难免费获得", "选择固定地区与报价时点", "", "基差必要输入"],
  ["价差", "中国", "豆粕基差", "日度", "交易日", "元/吨", "现货价-期货价", "派生项（待输入）", "高", "需先补齐同地区现货和对应合约", "公式计算并保留换月规则", "", "课件26—28页"],
  ["成本利润", "中国", "进口大豆压榨利润", "日度/周度", "交易日", "元/吨", "CBOT+汇率+升贴水+关税+港杂+豆粕豆油价", "派生项（部分缺输入）", "高", "期价/汇率可得，升贴水和港口现货需稳定源", "先建公式模板，后补商业输入", "", "课件20页"],
  ["成本利润", "中国", "豆粕理论保本价", "日度", "交易日", "元/吨", "进口大豆成本+动态油粕比", "派生项（部分缺输入）", "高", "需统一油粕出率、损耗和费用假设", "建立可审计公式", "", "课件26页"],
  ["季节性", "中国", "豆粕期价/现价/基差月度季节性", "月度统计", "自然月", "%、元/吨", "日度价格派生", "派生项（待输入）", "中", "日度历史完成后自动生成", "计算月均涨跌与上涨概率", "", "课件27—28页"],
  ["跨品种", "全球", "7类油籽产量/进口/出口/压榨占比", "年度", "市场年度", "千吨、%", "USDA PSD油籽快照", "已重算", "中", "本工作簿含2022/23当前快照重算", "可扩展至全历史", "https://apps.fas.usda.gov/PSDOnline/app/index.html", "对应课件第3页；后续修订会与原课件略有差异"],
];

const headers = ["模块", "地区", "指标", "频率", "时间口径", "单位", "优先来源", "当前状态", "优先级", "可获得范围", "落地方式", "来源URL", "课件对应/备注"];

catalog.getRange("A1:M1").merge();
catalog.getRange("A1").values = [["课件指标数据目录"]];
catalog.getRange("A2:M2").merge();
catalog.getRange("A2").values = [["按“已落地—官方公开可补—商业授权/人工整理—派生项”拆分；任何跨来源拼接都保留市场年度/自然年口径。"]];
catalog.getRange(`A4:M${rows.length + 4}`).values = [headers, ...rows];
catalog.tables.add(`A4:M${rows.length + 4}`, true, "IndicatorCatalog");
catalog.freezePanes.freezeRows(4);
catalog.getRange("A1:M1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 16 }, rowHeight: 28 };
catalog.getRange("A2:M2").format = { fill: paleBlue, font: { color: navy, italic: true }, wrapText: true, rowHeight: 34 };
catalog.getRange("A4:M4").format = { fill: red, font: { bold: true, color: "#FFFFFF" }, wrapText: true, rowHeight: 28 };
catalog.getRange(`A5:M${rows.length + 4}`).format = { borders: { insideHorizontal: { style: "thin", color: lightBorder } }, verticalAlignment: "top" };
catalog.getRange(`H5:H${rows.length + 4}`).format = { font: { bold: true }, horizontalAlignment: "center" };
catalog.getRange(`I5:I${rows.length + 4}`).format.horizontalAlignment = "center";
catalog.getRange(`A5:G${rows.length + 4}`).format.wrapText = true;
catalog.getRange(`J5:M${rows.length + 4}`).format.wrapText = true;
catalog.getRange("A:A").format.columnWidth = 10;
catalog.getRange("B:B").format.columnWidth = 12;
catalog.getRange("C:C").format.columnWidth = 26;
catalog.getRange("D:F").format.columnWidth = 13;
catalog.getRange("G:G").format.columnWidth = 22;
catalog.getRange("H:H").format.columnWidth = 20;
catalog.getRange("I:I").format.columnWidth = 9;
catalog.getRange("J:J").format.columnWidth = 26;
catalog.getRange("K:K").format.columnWidth = 26;
catalog.getRange("L:L").format.columnWidth = 38;
catalog.getRange("M:M").format.columnWidth = 34;

const statusColors = {
  "已落地": paleGreen,
  "已重算": paleGreen,
  "官方公开可补": paleBlue,
  "公开但需整理": paleYellow,
  "需人工整理": paleYellow,
  "公开不足": paleRed,
  "需商业授权": paleRed,
  "需确认行情授权": paleRed,
  "派生项（待输入）": paleYellow,
  "派生项（部分缺输入）": paleYellow,
};
for (let i = 0; i < rows.length; i += 1) {
  catalog.getRange(`H${i + 5}`).format.fill = statusColors[rows[i][7]] ?? "#FFFFFF";
}

summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["中信期货农产品框架｜数据落地总览"]];
summary.getRange("A2:H2").merge();
summary.getRange("A2").values = [["结论：年度供需和课件第3页油料分布已经能直接做；国内高频库存、现货和利润需要商业数据或持续手工留档。"]];
summary.getRange("A1:H1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 17 }, rowHeight: 30 };
summary.getRange("A2:H2").format = { fill: paleBlue, font: { color: navy, bold: true }, wrapText: true, rowHeight: 38 };
summary.getRange("A4:B9").values = [
  ["指标", "数量"],
  ["目录总项数", null],
  ["已落地/已重算", null],
  ["官方公开可补", null],
  ["需整理/授权/缺输入", null],
  ["现有自动化测试", 3],
];
summary.getRange("B5").formulas = [[`=COUNTA('指标数据目录'!C5:C${rows.length + 4})`]];
summary.getRange("B6").formulas = [[`=COUNTIF('指标数据目录'!H5:H${rows.length + 4},"已落地")+COUNTIF('指标数据目录'!H5:H${rows.length + 4},"已重算")`]];
summary.getRange("B7").formulas = [[`=COUNTIF('指标数据目录'!H5:H${rows.length + 4},"官方公开可补")`]];
summary.getRange("B8").formulas = [[`=B5-B6-B7`]];
summary.getRange("A4:B4").format = { fill: red, font: { bold: true, color: "#FFFFFF" } };
summary.getRange("A5:A9").format = { fill: "#F2F2F2", font: { bold: true } };
summary.getRange("B5:B9").format = { fill: "#FFFFFF", font: { bold: true, color: navy, size: 14 }, numberFormat: "0" };
summary.getRange("A4:B9").format.borders = { preset: "outside", style: "thin", color: lightBorder };

summary.getRange("D4:H4").merge();
summary.getRange("D4").values = [["建议实施顺序"]];
summary.getRange("D4:H4").format = { fill: red, font: { bold: true, color: "#FFFFFF" } };
summary.getRange("D5:H9").values = [
  ["阶段", "工作", "成果", "验证", "备注"],
  ["1 已完成", "USDA PSD/WASDE", "SQLite、年度工作簿、报告", "3项测试通过", "先用年度框架做研究底座"],
  ["2 立即做", "CASDE + 海关 + NBS/养殖", "中国月度/季度表", "同口径校验", "免费官方数据为主"],
  ["3 再做", "DCE行情/仓单 + NASS/出口", "日周度市场表", "断点与换月检查", "可持续自动更新"],
  ["4 需决策", "油厂库存/压榨/现货/升贴水", "高频利润与基差", "供应商对账", "需要商业授权或人工留档"],
];
summary.getRange("D5:H5").format = { fill: "#F2F2F2", font: { bold: true } };
summary.getRange("D6:H9").format = { wrapText: true, borders: { insideHorizontal: { style: "thin", color: lightBorder } }, verticalAlignment: "top" };
summary.getRange("A12:H12").merge();
summary.getRange("A12").values = [["口径红线"]];
summary.getRange("A12:H12").format = { fill: navy, font: { bold: true, color: "#FFFFFF" } };
summary.getRange("A13:H16").merge(true);
summary.getRange("A13:H16").values = [
  ["1. USDA/CASDE 的市场年度、海关/NBS 的自然年必须分列，不能无说明拼接。"],
  ["2. 平衡表期末库存、交易所仓单、港口/油厂商业库存是三种不同概念。"],
  ["3. 基差必须固定现货地区、报价时点、期货合约和换月规则。"],
  ["4. 课件截图只作为指标线索；落库数字以原始文件快照和来源日期为准。"],
];
summary.getRange("A13:H16").format = { fill: "#F7F9FC", wrapText: true, font: { color: gray }, rowHeight: 25 };
summary.getRange("A:A").format.columnWidth = 25;
summary.getRange("B:B").format.columnWidth = 14;
summary.getRange("C:C").format.columnWidth = 3;
summary.getRange("D:H").format.columnWidth = 22;

const oilseedRows = [
  ["大豆", 378.210, 171.758, 168.502, 315.767],
  ["花生", 49.814, 4.853, 4.179, 19.076],
  ["棉籽", 40.313, 1.091, 1.366, 30.216],
  ["葵花籽", 52.776, 4.017, 3.769, 51.359],
  ["菜籽", 89.858, 19.800, 20.065, 82.107],
  ["椰肉干", 6.047, 0.101, 0.080, 5.903],
  ["棕榈仁", 19.775, 0.060, 0.157, 19.770],
];
oilseeds.getRange("A1:I1").merge();
oilseeds.getRange("A1").values = [["全球7类油籽分布重算｜2022/23"]];
oilseeds.getRange("A2:I2").merge();
oilseeds.getRange("A2").values = [["按本地 USDA PSD 2026-07-10 快照逐国汇总；单位为百万吨。与2023课件数字的小幅差异来自后续历史修订。"]];
oilseeds.getRange("A4:I12").values = [
  ["品种", "产量", "产量占比", "出口", "出口占比", "进口", "进口占比", "压榨", "压榨占比"],
  ...oilseedRows.map(([name, production, exports, imports, crush]) => [name, production, null, exports, null, imports, null, crush, null]),
  ["合计", null, null, null, null, null, null, null, null],
];
for (let r = 5; r <= 11; r += 1) {
  oilseeds.getRange(`C${r}`).formulas = [[`=B${r}/$B$12`]];
  oilseeds.getRange(`E${r}`).formulas = [[`=D${r}/$D$12`]];
  oilseeds.getRange(`G${r}`).formulas = [[`=F${r}/$F$12`]];
  oilseeds.getRange(`I${r}`).formulas = [[`=H${r}/$H$12`]];
}
oilseeds.getRange("B12").formulas = [["=SUM(B5:B11)"]];
oilseeds.getRange("C12").formulas = [["=SUM(C5:C11)"]];
oilseeds.getRange("D12").formulas = [["=SUM(D5:D11)"]];
oilseeds.getRange("E12").formulas = [["=SUM(E5:E11)"]];
oilseeds.getRange("F12").formulas = [["=SUM(F5:F11)"]];
oilseeds.getRange("G12").formulas = [["=SUM(G5:G11)"]];
oilseeds.getRange("H12").formulas = [["=SUM(H5:H11)"]];
oilseeds.getRange("I12").formulas = [["=SUM(I5:I11)"]];
oilseeds.tables.add("A4:I12", true, "OilseedDistribution");
oilseeds.freezePanes.freezeRows(4);
oilseeds.getRange("A1:I1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 16 }, rowHeight: 28 };
oilseeds.getRange("A2:I2").format = { fill: paleBlue, font: { color: navy, italic: true }, wrapText: true, rowHeight: 34 };
oilseeds.getRange("A4:I4").format = { fill: red, font: { bold: true, color: "#FFFFFF" } };
oilseeds.getRange("A12:I12").format = { fill: "#F2F2F2", font: { bold: true }, borders: { preset: "doubleBottom", style: "thin", color: navy } };
oilseeds.getRange("B5:B12").format.numberFormat = "0.000";
oilseeds.getRange("D5:D12").format.numberFormat = "0.000";
oilseeds.getRange("F5:F12").format.numberFormat = "0.000";
oilseeds.getRange("H5:H12").format.numberFormat = "0.000";
oilseeds.getRange("C5:C12").format.numberFormat = "0.0%";
oilseeds.getRange("E5:E12").format.numberFormat = "0.0%";
oilseeds.getRange("G5:G12").format.numberFormat = "0.0%";
oilseeds.getRange("I5:I12").format.numberFormat = "0.0%";
oilseeds.getRange("A:A").format.columnWidth = 16;
oilseeds.getRange("B:I").format.columnWidth = 14;
oilseeds.getRange("A15:I15").merge();
oilseeds.getRange("A15").values = [["来源：https://apps.fas.usda.gov/PSDOnline/app/index.html ｜ 本地文件：data/raw/psd/2026-07-10/psd_oilseeds.csv"]];
oilseeds.getRange("A15:I15").format = { font: { color: gray, italic: true }, wrapText: true };

const assetRows = [
  ["USDA PSD SQLite", "data/soybean.sqlite3 / psd_observations", "49,504行；13指标；98国家/地区；1964—2026市场年度", "2026-07-10", "可直接查询", "当前SQLite只过滤大豆；豆粕豆油保留在原始油籽CSV和年度工作簿"],
  ["USDA WASDE SQLite", "data/soybean.sqlite3 / wasde_observations", "23,070行；66个发布文件；2021-01至2026-07", "2026-07-10", "可直接查询", "保留月度发布时点，适合计算预测修订"],
  ["USDA PSD 原始快照", "data/raw/psd/2026-07-10/psd_oilseeds.csv", "完整油籽品种与各国年度字段", "2026-07-10", "可直接重算", "本工作簿油料分布来自该文件"],
  ["WASDE 原始文件", "data/raw/wasde/2021—2026/", "66个月度CSV", "2026-07-10", "可追溯", "个别月份使用V2勘误版"],
  ["大豆产业链年度Excel", "outputs/019fb850-5ee3-7ad3-990e-1152fd468556/大豆产业链_2000年以来年度数据.xlsx", "6张表；大豆、豆粕、豆油；2000/01—2026/27；4,320条PSD明细", "2026-07-10", "可直接使用", "含总览和数据说明"],
  ["宏观月报", "reports/soybean_macro_2026-07-29.md", "年度变化 + WASDE月度修订", "2026-07-29", "可直接阅读", "由数据库生成"],
  ["数据采集与报告代码", "soybean_report/", "PSD/WASDE同步、SQLite入库、报告生成", "当前版本", "可重复运行", "python3 -m soybean_report run"],
  ["自动化测试", "tests/", "3项测试全部通过", "本次验证", "通过", "幂等导入、V2文件名、报告内容"],
];
assets.getRange("A1:F1").merge();
assets.getRange("A1").values = [["已有数据资产清单"]];
assets.getRange("A2:F2").merge();
assets.getRange("A2").values = [["本项目已经具备年度底座；后续重点是中国官方月度数据和高频商业数据。"]];
assets.getRange("A4:F12").values = [
  ["资产", "位置/表", "覆盖", "最新快照", "状态", "说明"],
  ...assetRows,
];
assets.tables.add("A4:F12", true, "ExistingAssets");
assets.freezePanes.freezeRows(4);
assets.getRange("A1:F1").format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 16 }, rowHeight: 28 };
assets.getRange("A2:F2").format = { fill: paleBlue, font: { color: navy, italic: true }, wrapText: true, rowHeight: 32 };
assets.getRange("A4:F4").format = { fill: red, font: { bold: true, color: "#FFFFFF" } };
assets.getRange("A5:F12").format = { wrapText: true, borders: { insideHorizontal: { style: "thin", color: lightBorder } }, verticalAlignment: "top" };
assets.getRange("A:A").format.columnWidth = 24;
assets.getRange("B:B").format.columnWidth = 52;
assets.getRange("C:C").format.columnWidth = 48;
assets.getRange("D:E").format.columnWidth = 18;
assets.getRange("F:F").format.columnWidth = 42;

const summaryCheck = await workbook.inspect({
  kind: "table",
  range: "实施总览!A1:H16",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 10,
});
console.log(summaryCheck.ndjson);

const oilseedCheck = await workbook.inspect({
  kind: "table",
  range: "油料分布重算!A4:I12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 10,
});
console.log(oilseedCheck.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

for (const sheetName of ["实施总览", "指标数据目录", "油料分布重算", "已有数据资产"]) {
  const preview = await workbook.render({
    sheetName,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    `${outputDir}/${sheetName}.png`,
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/农产品课件指标_数据落地清单.xlsx`);
