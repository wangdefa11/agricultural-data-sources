# 内容维护说明

每个品种只维护一个 `wiki.md`。Python 在本地运行和构建前自动读取它，前端代码
只负责统一排版。

## 目录结构

```text
content/
├── CONTENT_TEMPLATES.md         wiki.md 完整修改说明和模板
├── catalog.json                 全站品种字典和首页关系图
├── commodities/
│   ├── README.md                wiki.md 通用写法
│   └── soybean/
│       ├── README.md            大豆目录说明
│       ├── wiki.md              大豆全部页面内容
│       ├── images/              大豆图片文件
│       └── charts/              大豆独立交互图表
├── generated/
│   └── site-content.json        自动生成，不要手改
├── index.ts                     前端读取适配器，不要手改
└── types.ts                     前端格式定义，不要手改
```

## 日常编辑

修改大豆时只打开：

```text
content/commodities/soybean/wiki.md
```

其中可以直接修改：

- 页面标题、代码、摘要；
- 宏观和日报章节顺序；
- 指标卡数值和 `seriesId`；
- 普通正文；
- Markdown 表格；
- 图片插入位置和图片说明；
- 普通数据图表的数据、来源和坐标范围；
- 日报检查清单；
- 关联品种顺序；
- 数据来源与口径。

具体语法见 [CONTENT_TEMPLATES.md](CONTENT_TEMPLATES.md)。

## 图片和交互图表

- 图片文件放进本品种的 `images/`，在 `wiki.md` 使用标准 Markdown 图片语法；
- 独立交互图表放进本品种的 `charts/`，在 `wiki.md` 使用 `{embed}` 块；
- Python 会自动同步文件，不要修改 `public/commodities/` 中的生成副本。

## 新增品种

1. 复制 `content/commodities/soybean/` 并改成新 slug；
2. 删除或替换复制来的图片和交互图表；
3. 修改新目录中 `wiki.md` 文件头的 `slug`、`name` 和 `codes`；
4. 改写同一份 `wiki.md` 的全部内容；
5. 在 `content/catalog.json` 登记节点并将 `ready` 改为 `true`。

Python 会自动发现 `commodities/<slug>/wiki.md`，不需要修改 TSX。

## 检查

```bash
npm run content:build
npm run content:check
```

运行 `npm run dev` 或 `npm run build` 时也会自动生成内容。
