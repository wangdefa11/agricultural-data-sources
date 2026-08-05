# 数据格式

输入文件必须是 UTF-8 编码的 CSV 长表，并包含以下五列：

| 列名 | 含义 | 示例 |
|---|---|---|
| `product` | 品种名称 | 大豆 |
| `country` | 国家或地区 | 巴西 |
| `market_year` | 市场年度 | 2025/26 |
| `metric` | 指标代码 | production |
| `value` | 数值 | 180 |

`metric` 只能使用以下四个代码：

| 指标代码 | 页面名称 |
|---|---|
| `production` | 产量 |
| `exports` | 出口量 |
| `imports` | 进口量 |
| `consumption` | 消费量 |

示例：

```csv
product,country,market_year,metric,value
大豆,巴西,2025/26,production,180
大豆,美国,2025/26,production,115.99
大豆,中国,2025/26,imports,113
```

要求：

- 同一份文件中的数值应使用统一单位；
- 一个“品种—国家—年度—指标”组合只能出现一次；
- 缺失值可以不写对应行，不要用文本 `NA`；
- 年度按 `YYYY/YY` 格式填写；
- 国家名称必须与配置文件中的 `importantCountries` 和 `countryColorOrder` 完全一致。

