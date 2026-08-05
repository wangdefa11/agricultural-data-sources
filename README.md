# 大豆基本面数据库 v1

从 USDA 官方数据源建立大豆供需数据库，并生成 Markdown 月度宏观报告。

当前范围：

- USDA PSD：当前官方年度序列，覆盖各国生产、进口、出口、压榨、消费和库存。
- USDA WASDE：保留每月发布时的数值，用于计算预测修订。
- SQLite：重复运行不会重复写入同一发布版本。
- 宏观报告：年度变化表、最近两次 WASDE 月度修订表。

USDA 宏观报告与国内高频日报分开，不把年度/月度数据写入日报。

## 使用

要求 Python 3.11 或更高版本，无第三方依赖。

```bash
python3 -m soybean_report run
```

第一次运行默认导入 2021 年至今的月度 WASDE 文件。只想快速验证最近数据：

```bash
python3 -m soybean_report run --wasde-start-year 2026
```

分开执行：

```bash
python3 -m soybean_report update --wasde-start-year 2021
python3 -m soybean_report report
```

生成用于人工采集月度和年度数据的 Excel 模板：

```bash
python3 scripts/generate_soymeal_collection_template.py
```

模板脚本需要 `openpyxl`：

```bash
python3 -m pip install openpyxl
```

输出位置：

```text
data/soybean.sqlite3
data/raw/psd/
data/raw/wasde/
reports/soybean_macro_YYYY-MM-DD.md
outputs/
```

正式 Excel 文件统一放在 `outputs/`。旧版网页方案和历史生成物保存在
`archive/`，不参与当前 Python 数据处理流程。

## 宏观报告自动运行

macOS/Linux 的定时任务只需每天调用同一条命令：

```bash
cd "/Users/suzz/Documents/农产品数据源获取"
/opt/homebrew/bin/python3 -m soybean_report run
```

程序会检查 USDA 的最新文件，已导入的发布版本不会重复写入。
设置定时任务前先执行 `command -v python3`；如果结果不是上面的路径，
请将命令替换成实际路径。

## 数据口径

- PSD 数据的单位以 USDA 原始字段为准；宏观报告中的年度供需量转换成百万吨。
- PSD 表示纳入历史修订后的当前官方序列，适合年度比较。
- WASDE 历史 CSV 表示当次报告发布时的估计，适合观察月度修订。
- 市场年度按 USDA 原始口径保存，不强行改成自然年。

## 网站共享数据层

数据库包含独立于品种页面的标准指标、数据序列和页面引用表。同一条生猪存栏
序列可以同时被生猪、豆粕和玉米页面使用，底层观测值只维护一次。

结构及使用示例见
[跨品种共享数据模型](docs/shared_data_model.md)。

## 测试

```bash
python3 -m unittest discover -s tests -v
```

## 官方来源

- [USDA PSD Online](https://apps.fas.usda.gov/psdonline/app/index.html#/app/downloads)
- [USDA Historical WASDE Report Data](https://www.usda.gov/historical-wasde-report-data-3)
