/**
 * 首页的国内上市农产品产业链图。
 * 节点内容来自 content/catalog.json；此处只维护参考图式的空间布局。
 */
import { commodityNodes } from "../content";
import type { CommodityNode as CommodityNodeData } from "../content/types";

function CommodityNode({
  node,
  className,
}: {
  node: CommodityNodeData;
  className: string;
}) {
  return (
    <a
      className={`commodity-node chain-node ${className}`}
      href={`/${node.slug}`}
      title={node.summary}
    >
      <span>{node.name}</span>
      <small>{node.code}</small>
    </a>
  );
}

function Node({ slug, at }: { slug: string; at: string }) {
  return <CommodityNode node={commodityNodes[slug]} className={`node-${at}`} />;
}

export function CommodityRelationshipMap() {
  return (
    <section className="relationship-map" aria-label="国内上市农产品产业链关系图">
      <div className="chain-titlebar">
        <h2>农产品产业链</h2>
        <span>点击品种进入对应 Wiki</span>
      </div>

      <div className="chain-scroll">
        <div className="chain-canvas">
          <div className="chain-market-tab">国内上市品种</div>

          <div className="chain-group oils-group"><b>油脂</b></div>
          <div className="chain-group feed-group"><b>饲料</b></div>

          <div className="chain-route route-bean-pair" />
          <div className="chain-route route-bean-oil" />
          <div className="chain-route route-bean-meal" />
          <div className="chain-route route-rapeseed-oil" />
          <div className="chain-route route-rapeseed-meal" />
          <div className="chain-route route-peanut" />
          <div className="chain-route route-palm" />
          <div className="chain-route route-corn-feed" />
          <div className="chain-route route-corn-starch" />
          <div className="chain-route route-hog" />
          <div className="chain-route route-egg" />

          <span className="route-label label-crush">压榨</span>
          <span className="route-label label-oil-sub">油脂替代</span>
          <span className="route-label label-protein">蛋白替代</span>
          <span className="route-label label-feed">饲料配方</span>
          <span className="route-label label-farming">养殖需求</span>
          <span className="route-label label-deep">深加工</span>
          <span className="route-label label-food">国产食用大豆</span>
          <Node slug="sugar" at="sugar" />
          <Node slug="red-date" at="red-date" />
          <Node slug="apple" at="apple" />

          <Node slug="soybean-no1" at="soybean-one" />
          <Node slug="soybean-no2" at="soybean-two" />
          <Node slug="peanut" at="peanut" />
          <Node slug="palm-oil" at="palm" />
          <Node slug="soybean-oil" at="soy-oil" />
          <Node slug="rapeseed-oil" at="rapeseed-oil" />
          <Node slug="rapeseed" at="rapeseed" />
          <Node slug="soymeal" at="soymeal" />
          <Node slug="rapeseed-meal" at="rapeseed-meal" />
          <Node slug="corn" at="corn-feed" />
          <div className="process-node node-feed">饲料</div>
          <Node slug="corn-starch" at="corn-starch" />
          <Node slug="hog" at="hog" />
          <Node slug="egg" at="egg" />

        </div>
      </div>
    </section>
  );
}
