/**
 * 渲染 wiki.md 中常用的行内 Markdown。
 *
 * 支持链接、加粗、斜体和行内代码。这里不接收 HTML，因此编辑内容不会把任意
 * HTML 注入页面。
 */
import type { ReactNode } from "react";

const SAFE_LINK = /^(?:https?:\/\/|mailto:|\/|#|\.{1,2}\/)/i;

function renderInline(text: string, keyPrefix = "md"): ReactNode[] {
  const token =
    /(\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = token.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const key = `${keyPrefix}-${index}`;
    if (match[2] !== undefined && match[3] !== undefined) {
      const href = match[3];
      if (SAFE_LINK.test(href)) {
        const external = /^https?:\/\//i.test(href);
        nodes.push(
          <a
            className="inline-markdown-link"
            href={href}
            key={key}
            rel={external ? "noreferrer" : undefined}
            target={external ? "_blank" : undefined}
          >
            {renderInline(match[2], `${key}-link`)}
          </a>,
        );
      } else {
        nodes.push(match[0]);
      }
    } else if (match[4] !== undefined || match[5] !== undefined) {
      const content = match[4] ?? match[5];
      nodes.push(
        <strong key={key}>{renderInline(content, `${key}-strong`)}</strong>,
      );
    } else if (match[6] !== undefined) {
      nodes.push(<code key={key}>{match[6]}</code>);
    } else {
      const content = match[7] ?? match[8];
      nodes.push(<em key={key}>{renderInline(content, `${key}-em`)}</em>);
    }

    cursor = match.index + match[0].length;
    index += 1;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

export function InlineMarkdown({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}
