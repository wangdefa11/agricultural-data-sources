/**
 * 前端内容的数据格式定义。
 *
 * 这些类型用于在开发时检查 JSON 字段是否被页面正确使用，不存放真实内容。
 * 新增普通品种或修改文字时不用改；只有新增一种内容块字段时才需要调整。
 */

// 关系图上的一个品种节点。
export type CommodityNode = {
  slug: string;
  name: string;
  code: string;
  ready: boolean;
  summary: string;
};

// 首页品种关系图的数据格式。
export type RelationshipGroup = {
  label: string;
  targets: string[];
};

export type CommodityMap = {
  source: string;
  processLabel: string;
  products: string[];
  relationships: RelationshipGroup[];
};

// 页面顶部的关键数值卡片。
export type StatItem = {
  label: string;
  value: string;
  context: string;
  seriesId?: string;
};

// 项目内置图表。
export type ChartSeries = {
  name: string;
};

export type ChartPoint = {
  label: string;
  values: number[];
};

export type ChartBlock = {
  kind: "chart";
  span?: "full" | "wide" | "narrow";
  title: string;
  description: string;
  ariaLabel: string;
  series: ChartSeries[];
  points: ChartPoint[];
  baseline?: number;
  ceiling: number;
  sourceNote: string;
  latestValue?: string;
};

// 普通文字块：正文来自品种 wiki.md 的三级标题。
export type TextBlock = {
  kind: "text";
  span?: "full" | "wide" | "narrow";
  title: string;
  paragraphs: string[];
};

// 品种图片：源文件放在该品种的 images/ 目录。
export type ImageBlock = {
  kind: "image";
  span?: "full" | "wide" | "narrow";
  src: string;
  alt: string;
  title?: string;
  caption?: string;
};

// 嵌入图表、信息表格和检查清单。
export type EmbedBlock = {
  kind: "embed";
  span?: "full" | "wide" | "narrow";
  title: string;
  description: string;
  src: string;
  linkLabel: string;
  height?: number;
};

export type TableBlock = {
  kind: "table";
  span?: "full" | "wide" | "narrow";
  title?: string;
  columns: string[];
  rows: string[][];
};

export type ChecklistBlock = {
  kind: "checklist";
  span?: "full" | "wide" | "narrow";
  title: string;
  items: Array<{
    title: string;
    description: string;
  }>;
};

export type ContentBlock =
  | ChartBlock
  | TextBlock
  | ImageBlock
  | EmbedBlock
  | TableBlock
  | ChecklistBlock;

// 一个 Wiki 章节和完整品种页面。
export type WikiSection = {
  id: string;
  index: string;
  title: string;
  description: string;
  stats?: StatItem[];
  blocks: ContentBlock[];
};

export type RelationFlowItem =
  | { kind: "node"; slug: string }
  | { kind: "label"; text: string };

export type CommodityPageText = {
  siteName: string;
  mapNavLabel: string;
  breadcrumbRootLabel: string;
  updatedPrefix: string;
  relations: {
    index: string;
    title: string;
    description: string;
    fullMapLink: string;
  };
  sources: {
    title: string;
  };
};

export type CommodityPage = {
  slug: string;
  name: string;
  codes: string;
  updatedAt: string;
  summary: string;
  pageText: CommodityPageText;
  sections: WikiSection[];
  relationFlow: RelationFlowItem[];
  sourceDescription: string;
};

// Python 最终生成的 content/generated/site-content.json 的顶层格式。
export type SiteContent = {
  catalog: {
    nodes: Record<string, CommodityNode>;
    map: CommodityMap;
  };
  pages: Record<string, CommodityPage>;
};
