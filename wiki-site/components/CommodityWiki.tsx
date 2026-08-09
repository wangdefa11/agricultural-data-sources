/**
 * 完整品种 Wiki 的页面骨架。
 *
 * 这里决定：标题区、章节、关联品种和来源区的连续阅读顺序。
 * 章节文字和表格内容来自 content/commodities/，不要写死在本文件。
 * 宽度和间距在 app/globals.css 的“Wiki 页面”部分修改。
 */
import { commodityNodes } from "../content";
import type { CommodityPage } from "../content/types";
import { ContentBlock } from "./ContentBlock";
import { InlineMarkdown } from "./InlineMarkdown";
import { SiteHeader } from "./SiteHeader";

export function CommodityWiki({ page }: { page: CommodityPage }) {
  return (
    <div className="site-shell">
      <SiteHeader page={page} />

      <main className="wiki-layout">
        {/* 单栏正文；各章节按 wiki.md 的顺序直接向下阅读。 */}
        <article className="wiki-content">
          {/* 品种标题和摘要。 */}
          <header className="wiki-title" id="overview">
            <p className="breadcrumb">
              <a href="/">{page.pageText.breadcrumbRootLabel}</a> / {page.name}
            </p>
            <div className="wiki-hero">
              <div className="wiki-hero-copy">
                <div className="title-line">
                  <div>
                    <h1>{page.name}</h1>
                    {page.codes && <p>{page.codes}</p>}
                  </div>
                </div>
                <p className="wiki-summary">
                  <InlineMarkdown text={page.summary} />
                </p>
              </div>
              {page.heroImage && (
                <figure className="wiki-hero-media">
                  <img
                    className="wiki-hero-image"
                    src={page.heroImage}
                    alt={page.heroAlt ?? ""}
                  />
                  {(page.heroCredit || page.heroSource) && (
                    <figcaption>
                      {page.heroSource ? (
                        <a href={page.heroSource} rel="noreferrer" target="_blank">
                          {page.heroCredit ? `图源：${page.heroCredit} ↗` : "图片来源 ↗"}
                        </a>
                      ) : (
                        `图源：${page.heroCredit}`
                      )}
                    </figcaption>
                  )}
                </figure>
              )}
            </div>
          </header>

          {/* 由 wiki.md 的二级标题顺序生成宏观、日报等章节。 */}
          {page.sections.map((section) => (
            <section className="wiki-section" id={section.id} key={section.id}>
              <div className="section-title">
                <div><span>{section.index}</span><h2>{section.title}</h2></div>
                {section.description && (
                  <p><InlineMarkdown text={section.description} /></p>
                )}
              </div>

              {section.stats && (
                <div className={`data-summary stats-${section.stats.length}`}>
                  {section.stats.map((stat) => (
                    <div key={stat.label} title={stat.seriesId}>
                      <span><InlineMarkdown text={stat.label} /></span>
                      <strong><InlineMarkdown text={stat.value} /></strong>
                      <small><InlineMarkdown text={stat.context} /></small>
                    </div>
                  ))}
                </div>
              )}

              <div className="content-blocks">
                {section.blocks.map((block, index) => (
                  <ContentBlock block={block} key={`${block.kind}-${index}`} />
                ))}
              </div>
            </section>
          ))}

          {/* 当前品种与上下游、替代品的简化关系。 */}
          {page.relationFlow.length > 0 && (
            <section className="wiki-section relations-section" id="relations">
              <div className="section-title">
                <div>
                  <span>{page.pageText.relations.index}</span>
                  <h2>{page.pageText.relations.title}</h2>
                </div>
                {page.pageText.relations.description && (
                  <p>
                    <InlineMarkdown
                      text={page.pageText.relations.description}
                    />
                  </p>
                )}
              </div>
              <div className="compact-relations">
                {page.relationFlow.map((item, index) => {
                  if (item.kind === "label") {
                    return (
                      <i key={`${item.text}-${index}`}>
                        <InlineMarkdown text={item.text} />
                      </i>
                    );
                  }
                  const node = commodityNodes[item.slug];
                  return (
                    <a
                      className={item.slug === page.slug ? "current" : ""}
                      href={`/${item.slug}`}
                      key={`${item.slug}-${index}`}
                    >
                      {node.name}
                    </a>
                  );
                })}
              </div>
              <a className="text-link" href="/">
                {page.pageText.relations.fullMapLink}
              </a>
            </section>
          )}

          {/* 来源章节为空时，连同左侧入口一起隐藏。 */}
          {page.sourceDescription && (
            <section className="wiki-section sources-section" id="sources">
              <h2>{page.pageText.sources.title}</h2>
              <p><InlineMarkdown text={page.sourceDescription} /></p>
            </section>
          )}
        </article>
      </main>
    </div>
  );
}
