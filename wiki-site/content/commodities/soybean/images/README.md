# 大豆图片放这里

把大豆页面需要使用的图片复制到本目录，支持：

- `.png`
- `.jpg` / `.jpeg`
- `.webp`
- `.gif`
- `.avif`

然后在同级 `wiki.md` 中直接插入，例如：

```markdown
### 全球大豆生长周期

![美国、巴西和阿根廷大豆生长周期对比](images/soybean-calendar.png)

图片来源及口径写在这里。
```

运行网站时，Python 会自动把图片同步到浏览器可访问的位置。不要手工修改
`public/commodities/soybean/images/` 中的生成副本。
