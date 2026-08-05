import generatedContent from "./generated/site-content.json";
import type { SiteContent } from "./types";

/**
 * 内容入口：把 Python 生成的 JSON 提供给 React 页面。
 *
 * 通常不要修改本文件。人工内容请修改：
 * - catalog.json
 * - commodities/<slug>/wiki.md
 */
export const siteContent = generatedContent as unknown as SiteContent;
export const commodityNodes = siteContent.catalog.nodes;
export const commodityMap = siteContent.catalog.map;
export const commodityPages = siteContent.pages;
