/**
 * 网站首页：展示品种关系图。
 *
 * 修改首页标题和说明文字：改本文件。
 * 修改关系图内部节点布局：改 components/CommodityMap.tsx。
 * 修改宽度、颜色和间距：改 app/globals.css 中“品种关系首页”部分。
 */
import { CommodityRelationshipMap } from "../components/CommodityMap";
import { SiteHeader } from "../components/SiteHeader";

export default function CommodityMapPage() {
  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="map-page">
        <div className="map-intro">
          <p className="breadcrumb">研究入口 / 品种关系</p>
          <h1>从品种关系进入 Wiki</h1>
          <p>
            每个节点是一份独立的品种研究页，连线表示压榨、饲料需求或替代关系。
            先从大豆开始，后续品种复用同一套底层指标，不重复维护数据。
          </p>
        </div>

        <CommodityRelationshipMap />

        <div className="map-legend">
          <span><i className="legend-ready" />已有完整 Wiki</span>
          <span><i />已建立关系，内容待完善</span>
          <span>点击任一节点进入对应品种页</span>
        </div>
      </main>
    </div>
  );
}
