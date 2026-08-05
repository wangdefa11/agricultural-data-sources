# 商品四图分析模板

这个模板用于生成与当前大豆产业链版本相同结构的交互图表：

1. 上方 2×2 饼图：某一年度的产量、出口量、进口量、消费量国家分布；
2. 下方趋势图：选择重要国家和上述四项指标，查看多年走势；
3. 趋势图竖线与饼图年度同步，点击趋势图可以切换饼图年度；
4. 同一国家在四张饼图中始终使用同一种颜色。

模板只依赖 Node.js，不需要安装第三方库。

## 最快使用方式

```bash
cd commodity-four-chart-template
node scripts/build-dashboard.mjs config/soybean.example.json
```

生成结果位于：

```text
output/soybean-four-charts.html
```

直接用浏览器打开即可。

## 更换成其他农产品或工业品

只需要准备两项内容：

1. 按 `DATA_FORMAT.md` 整理一份长表 CSV；
2. 复制并修改 `config/soybean.example.json`。

配置中最重要的字段：

- `products`：页面顶部可以切换的品种；
- `defaultProduct`、`defaultYear`：默认展示状态；
- `unit`：数值单位，例如“百万吨”“万吨”“万桶/日”；
- `importantCountries`：下方国家选择框保留的主要国家；
- `countryColorOrder`：国家固定颜色的优先顺序；
- `dataFile`、`outputFile`：输入和输出文件。

如果只有一个品种，也可以只填写一个产品，例如铁矿石、原油、铜或棉花。

## 推荐的数据整理流程

1. 保留 2000 年以来的数据；
2. 将不同数据源统一为四个指标：`production`、`exports`、`imports`、`consumption`；
3. 所有数值统一到同一个单位；
4. 国家名称统一，避免“中国”“China”等重复；
5. 在配置文件中人工保留约 12–20 个重要国家。

上方饼图始终从 CSV 的全部国家中计算前六名，不受“重要国家”名单限制；重要国家名单只影响下方趋势图的选择框。

## 文件说明

- `scripts/build-dashboard.mjs`：通用图表生成器；
- `scripts/prepare-soybean-example.mjs`：把本项目 USDA PSD 大豆数据转成标准格式的示例；
- `config/soybean.example.json`：大豆产业链配置示例；
- `data/soybean-example.csv`：大豆、豆粕、豆油的标准化示例数据；
- `output/soybean-four-charts.html`：用示例配置生成的结果；
- `reference/soybean-current-dashboard.html`：当前确认版本的完整参考页面。

## 更新数据

替换 CSV 后重新运行生成命令即可。生成的页面会把数据直接嵌入文件中，因此打开图表时不需要联网，也不依赖原始 CSV。

