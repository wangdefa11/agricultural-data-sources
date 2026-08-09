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
            按国内上市品种的产业链组织研究入口：从原料、加工品到饲料和养殖需求，
            同时标出油脂替代、蛋白替代与深加工关系，只展示国内上市品种。
          </p>
        </div>

        <CommodityRelationshipMap />

        <div className="map-legend">
          <span><i className="legend-ready" />国内上市品种</span>
          <span><i />虚线框表示产业链分组</span>
          <span>点击已有内容的节点进入对应品种页</span>
        </div>
      </main>
    </div>
  );
}
