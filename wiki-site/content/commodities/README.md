# 单文件品种 Wiki 写法

每个品种目录只用 `wiki.md` 管理页面内容：

```text
soybean/
├── README.md
├── wiki.md
├── images/
└── charts/
```

## 文件头

```markdown
---
slug: soybean
name: 大豆
codes: A · B · CBOT S
site_name: 农产品研究 Wiki
map_nav_label: 品种关系
breadcrumb_root_label: 品种关系
updated_prefix: 数据框架更新于
relations_link_label: 查看完整品种关系图 →
---
```

`slug` 和 `name` 必填，其余字段可以删除。

## 页面章节

```markdown
## 摘要

页面摘要。

## 01 宏观数据 {macro}

章节说明。

### 普通文字标题

普通正文。
```

- `##` 决定页面大章节和顺序；
- `01` 是页面显示的编号；
- `{macro}` 是稳定英文 id，每个章节不能重复；
- `## 摘要` 必须存在；
- `###` 决定章节中的内容块和显示顺序。

## 自动识别的普通内容

三级标题下面：

- 写普通段落，会显示为文字块；
- 写 Markdown 表格，会显示为表格；
- 第一行写 `![说明](images/file.png)`，会显示为图片，其余文字作为图注。

## 特殊内容块

在三级标题末尾添加：

- `{stats}`：关键指标表；
- `{chart}`：普通数据图表；
- `{checklist}`：检查清单；
- `{embed}`：嵌入 `charts/` 中的独立交互图表；
- `{relations}`：关联品种顺序。

还可以同时添加 `full`、`wide` 或 `narrow` 控制宽度。例如：

```markdown
### 全国豆粕现货均价 {chart wide}
```

完整修改说明和可复制格式见
[content/CONTENT_TEMPLATES.md](../CONTENT_TEMPLATES.md)。

## 共享数据

指标表最后一列填写稳定的 `seriesId`。不同品种引用同一份底层数据时使用相同
`seriesId`，后续接入数据库时便可以指向同一条数据，不需要维护两份。

## 全站关系图

`content/catalog.json` 仍然是全站文件，只管理首页节点和全站关系。具体品种页面
内展示的关联顺序写在该品种自己的 `wiki.md`。
