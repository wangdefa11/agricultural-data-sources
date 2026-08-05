# 大豆 Wiki 文件

大豆页面的人工内容全部在：

[wiki.md](wiki.md)

这里可以直接修改标题、摘要、章节、指标卡、图表数据、普通文字、表格、图片、
检查清单和关联品种。页面顺序就是 Markdown 中从上到下的顺序。

## 其他文件夹

- `images/`：只存放大豆页面使用的图片；
- `charts/`：只存放大豆独立交互图表；
- [统一修改说明](../../CONTENT_TEMPLATES.md)：不知道怎么写时复制里面的
  Markdown 模板。

不再使用 `page.json` 或 `data.json`。

## 链接和文字格式

`wiki.md` 中的常用 Markdown 格式会在网页中正常显示：

```markdown
[链接文字](https://example.com)
**加粗文字**
*斜体文字*
`seriesId`
```

这些格式可以写在摘要、普通正文、章节说明、表格单元格、检查清单和图片说明中。
外部链接会在新标签页打开，站内链接可以写成 `[大豆](/soybean)`。

## 修改后查看

重新运行本地网站会自动读取 `wiki.md`：

```bash
npm run dev
```

已经运行网站时，也可以手动执行：

```bash
npm run content:build
```

然后刷新页面。
