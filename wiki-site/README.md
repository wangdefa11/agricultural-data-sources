# 农产品研究 Wiki

这是项目总入口。想修改网站时，先根据下面的分类找文件。

## 最常修改的文件

| 想修改什么 | 文件 |
| --- | --- |
| 网站颜色、宽度、间距、手机版布局 | `app/globals.css` |
| 首页“品种关系图”上下结构 | `app/page.tsx` |
| 关系图内部节点和列的结构 | `components/CommodityMap.tsx` |
| Wiki 的标题和章节顺序 | `components/CommodityWiki.tsx` |
| 图表、表格、检查清单的 HTML 结构 | `components/ContentBlock.tsx` |
| 顶部导航 | `components/SiteHeader.tsx` |
| 大豆全部页面内容 | `content/commodities/soybean/wiki.md` |
| 品种节点和品种关系 | `content/catalog.json` |

`TSX` 决定页面上有哪些区域以及它们的顺序，`CSS` 决定这些区域的宽度、颜色、
间距和响应式布局。只改字号、颜色或宽度时，通常只需要编辑
`app/globals.css`。

## 内容文件

`content/commodities/` 下每个品种拥有自己的目录：

```text
commodities/
├── soybean/
│   ├── README.md   本品种文件说明
│   ├── wiki.md     标题、正文、指标、图表数据、表格、图片和关系
│   ├── images/     本品种图片文件
│   └── charts/     本品种专属交互图表文件
├── soymeal/
│   └── ...
└── hog/
    └── ...
```

日常编辑一个品种时，只需要修改该品种的 `wiki.md`。写法和复制模板见
`content/commodities/README.md`。

## 不建议日常修改的文件

- `content/generated/site-content.json`：Python 自动生成。
- `content/index.ts`、`content/types.ts`：内容与前端之间的适配层和类型定义。
- `scripts/build_site_content.py`：内容合并和校验程序。
- `app/[slug]/page.tsx`：根据网址选择品种页面。
- `app/layout.tsx`：全站外壳和搜索/分享元信息。
- `app/chatgpt-auth.ts`：Sites 登录辅助代码，目前页面没有直接使用。
- `build/`、`worker/`：Sites/Vite 的本地构建和 Worker 入口，仍然需要保留。
- `.openai/hosting.json`：线上站点配置。本地预览不需要修改。
- `package-lock.json`：依赖锁定文件，由 npm 自动维护。

## 本地预览

```bash
cd "/Users/suzz/Documents/农产品数据源获取/wiki-site"
npm run dev
```

浏览器打开 `http://localhost:3000`。修改 TSX 或 CSS 后会自动刷新。

修改 `wiki.md` 后，重新运行本地网站会自动构建；也可以手动执行：

```bash
npm run content:build
```

再刷新页面。只检查内容是否正确：

```bash
npm run content:check
```

只检查网站能否正常构建，不会部署：

```bash
npm run build
```
