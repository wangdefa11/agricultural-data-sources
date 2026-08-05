/**
 * 品种动态路由。
 *
 * /soybean、/hog 等网址都会进入这里。本文件只负责：
 * 1. 有完整内容时显示 Wiki；
 * 2. 只有品种节点时显示“内容待完善”。
 *
 * 通常不用修改。Wiki 的实际布局在 components/CommodityWiki.tsx。
 */
import { CommodityWiki } from "../../components/CommodityWiki";
import { SiteHeader } from "../../components/SiteHeader";
import { commodityNodes, commodityPages } from "../../content";

export default async function CommodityRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = commodityPages[slug];

  if (page) {
    return <CommodityWiki page={page} />;
  }

  const commodity = commodityNodes[slug];
  if (!commodity) {
    return (
      <main className="placeholder-page">
        <p>找不到该品种</p>
        <a href="/">返回品种关系图</a>
      </main>
    );
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="placeholder-page">
        <p className="breadcrumb"><a href="/">品种关系</a> / {commodity.name}</p>
        <span>页面结构已建立 · 内容待完善</span>
        <h1>{commodity.name}</h1>
        <p>{commodity.summary}</p>
        <div>
          <a className="button-link" href="/">返回品种关系图</a>
        </div>
      </main>
    </div>
  );
}
