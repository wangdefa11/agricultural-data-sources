/**
 * Wiki 章节中的通用内容块。
 *
 * wiki.md 的三级标题和标记决定显示哪一种：
 * - chart：项目内置柱状图
 * - text：wiki.md 中的普通文字
 * - image：品种 images/ 中的图片
 * - embed：iframe 嵌入图表
 * - table：信息表格
 * - checklist：日报检查清单
 *
 * 修改内容去品种 wiki.md；修改这些模块的 HTML 结构才改本文件；修改外观去 CSS。
 */
import type {
  ChartBlock,
  ContentBlock as ContentBlockData,
} from "../content/types";
import { EmbeddedChart } from "./EmbeddedChart";
import { InlineMarkdown } from "./InlineMarkdown";

function DataChart({ block }: { block: ChartBlock }) {
  // 把真实数值换算成 0%—100% 的柱高；baseline 可用于截断纵轴。
  const baseline = block.baseline ?? 0;
  const range = block.ceiling - baseline;

  return (
    <div
      className={`data-chart ${block.series.length === 1 ? "single-series" : ""}`}
      style={{
        gridTemplateColumns: `repeat(${block.points.length}, minmax(0, 1fr))`,
      }}
      aria-label={block.ariaLabel}
    >
      {block.points.map((point, pointIndex) => (
        <div className="data-chart-group" key={point.label}>
          <div className="data-chart-bars">
            {point.values.map((value, seriesIndex) => {
              const ratio = Math.max(0, Math.min(1, (value - baseline) / range));
              const height =
                block.baseline === undefined ? ratio * 100 : ratio * 88 + 12;
              return (
                <i
                  className={`series-bar series-${seriesIndex}`}
                  style={{ height: `${height}%` }}
                  title={`${block.series[seriesIndex]?.name ?? ""} ${value}`}
                  key={`${pointIndex}-${seriesIndex}`}
                />
              );
            })}
          </div>
          <span>{point.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ContentBlock({ block }: { block: ContentBlockData }) {
  // span-full / wide / narrow 控制模块在内容网格中占几列。
  const span = `span-${block.span ?? "full"}`;

  // 内置数据图表。
  if (block.kind === "chart") {
    return (
      <div className={`chart-block content-block ${span}`}>
        <div className="chart-heading">
          <div>
            <h3><InlineMarkdown text={block.title} /></h3>
            <p><InlineMarkdown text={block.description} /></p>
          </div>
          {block.latestValue ? (
            <strong>{block.latestValue}</strong>
          ) : (
            <div className="chart-legend">
              {block.series.map((series, index) => (
                <span key={series.name}>
                  <i className={`series-${index}`} />
                  {series.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <DataChart block={block} />
        <p className="source-note">
          <InlineMarkdown text={block.sourceNote} />
        </p>
      </div>
    );
  }

  // 普通正文；段落内容来自同品种 wiki.md 的二级标题。
  if (block.kind === "text") {
    return (
      <div className={`text-block content-block ${span}`}>
        {block.title && <h3><InlineMarkdown text={block.title} /></h3>}
        {block.paragraphs.map((paragraph, index) => (
          <p key={index}><InlineMarkdown text={paragraph} /></p>
        ))}
      </div>
    );
  }

  // 品种专属图片；图片源文件保存在同品种 images/ 目录。
  if (block.kind === "image") {
    return (
      <figure className={`image-block content-block ${span}`}>
        {block.title && <h3><InlineMarkdown text={block.title} /></h3>}
        <img src={block.src} alt={block.alt} loading="lazy" />
        {block.caption && (
          <figcaption><InlineMarkdown text={block.caption} /></figcaption>
        )}
      </figure>
    );
  }

  if (block.kind === "source") {
    return (
      <p className={`block-source content-block ${span}`}>
        <InlineMarkdown text={block.text} />
      </p>
    );
  }

  // 外部或独立 HTML 图表。
  if (block.kind === "embed") {
    return (
      <div className={`embedded-chart content-block ${span}`}>
        <div className="chart-heading">
          <div>
            <h3><InlineMarkdown text={block.title} /></h3>
            <p><InlineMarkdown text={block.description} /></p>
          </div>
          <a href={block.src} target="_blank" rel="noreferrer">
            {block.linkLabel}
          </a>
        </div>
        <EmbeddedChart block={block} />
      </div>
    );
  }

  // 可横向滚动的信息表。
  if (block.kind === "table") {
    return (
      <div className={`info-table-wrap content-block ${span}`}>
        {block.title && (
          <h3 className="table-title">
            <InlineMarkdown text={block.title} />
          </h3>
        )}
        <table className="info-table">
          <thead>
            <tr>
              {block.columns.map((column) => (
                <th key={column}><InlineMarkdown text={column} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>
                    <InlineMarkdown text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 剩余类型是 checklist。
  return (
    <div className={`daily-checklist content-block ${span}`}>
      <h3><InlineMarkdown text={block.title} /></h3>
      <ol>
        {block.items.map((item, index) => (
          <li key={item.title}>
            <span>{index + 1}</span>
            <div>
              <strong><InlineMarkdown text={item.title} /></strong>
              <p><InlineMarkdown text={item.description} /></p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
