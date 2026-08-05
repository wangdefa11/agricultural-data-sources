# 跨品种共享数据模型

网站中的数据序列不归属于某一个品种页面。生猪存栏可以同时出现在生猪、豆粕、
玉米页面，但底层只保存一份观测值。

## 分层

```text
USDA / Wind / 统计局等原始表
              ↓ 清洗映射
metrics → data_series → observations
                 ↑
       page_series_usage
                 ↑
              entities
```

- `entities`：大豆、豆粕、生猪等网站实体。
- `entity_relations`：压榨产出、饲料投入等产业链关系。
- `metrics`：指标概念及定义，例如“生猪存栏”。
- `data_series`：确定地区、频率、单位和来源后的具体序列。
- `observations`：序列的时间、数值及发布版本。
- `page_series_usage`：页面怎样使用序列，包括栏目、角色和显示标题。

`psd_observations`、`wasde_observations`、`wind_observations` 等来源表继续作为
原始层，不需要为了网站统一格式而删除。

## 生猪存栏复用示例

```python
from soybean_report.catalog import (
    attach_series_to_page,
    upsert_entity,
    upsert_metric,
    upsert_observation,
    upsert_series,
)

upsert_entity(
    connection,
    entity_id="commodity_hog",
    slug="hog",
    name="生猪",
    entity_type="commodity",
)
upsert_entity(
    connection,
    entity_id="commodity_soymeal",
    slug="soymeal",
    name="豆粕",
    entity_type="commodity",
)
upsert_metric(
    connection,
    metric_code="hog_inventory",
    name="生猪存栏",
    definition="报告期末生猪存栏数量",
    default_unit="万头",
)
upsert_series(
    connection,
    series_id="cn_hog_inventory_q_nbs",
    metric_code="hog_inventory",
    name="全国生猪季度末存栏",
    geography="中国",
    frequency="quarterly",
    unit="万头",
    source="国家统计局",
)
upsert_observation(
    connection,
    series_id="cn_hog_inventory_q_nbs",
    period="2026-Q1",
    value=41731,
    release_date="2026-04-18",
)
```

把同一序列挂到两个页面：

```python
attach_series_to_page(
    connection,
    page_entity_id="commodity_hog",
    series_id="cn_hog_inventory_q_nbs",
    section="供给",
    role="core",
    display_title="全国生猪存栏",
)
attach_series_to_page(
    connection,
    page_entity_id="commodity_soymeal",
    series_id="cn_hog_inventory_q_nbs",
    section="下游需求",
    role="demand_proxy",
    display_title="生猪存栏：豆粕饲用需求参考",
)
```

页面标题和解释可以不同，但两个引用的 `series_id` 相同。修订数据时只调用一次
`upsert_observation`。

## ID 和口径规则

- `metric_code` 表达“是什么”，例如 `hog_inventory`。
- `series_id` 表达“哪一条”，建议包含地区、指标、频率和来源，例如
  `cn_hog_inventory_q_nbs`。
- 不同地区、频率、单位、来源或统计口径使用不同 `series_id`。
- 中文名称允许调整，已发布的 `metric_code` 和 `series_id` 不改名。
- 页面导出的 JSON、Excel 和图表数据都是缓存或交付物，不作为主数据。
- `release_date` 用于保留历史修订；读取页面时使用
  `latest_observations()` 获取各期最新版本。

## 接入现有来源

新增采集器仍先写来源原始表，再显式映射到标准序列。例如：

```text
wind_observations.indicator = 中国:存栏数:生猪
                         ↓
data_series.series_id = cn_hog_inventory_q_nbs
                         ↓
observations
```

不要根据中文名称模糊匹配。每个来源指标到 `series_id` 的映射应在采集脚本中明确
配置并接受测试。
