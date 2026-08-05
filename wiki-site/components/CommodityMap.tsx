/**
 * 首页的品种关系图。
 *
 * 节点名称和关系数据来自 content/catalog.json，本文件只决定它们如何排列：
 * 原料 → 加工品 → 下游/替代关系。
 * 改节点样式和各列宽度，请到 app/globals.css 的“品种关系图”部分。
 */
import {
  commodityMap,
  commodityNodes,
} from "../content";
import type { CommodityNode as CommodityNodeData } from "../content/types";

function CommodityNode({
  node,
  className = "",
}: {
  node: CommodityNodeData;
  className?: string;
}) {
  return (
    <a
      className={`commodity-node ${node.ready ? "is-ready" : ""} ${className}`}
      href={`/${node.slug}`}
    >
      <span>{node.name}</span>
      <small>{node.code}</small>
      {!node.ready && <em>待完善</em>}
    </a>
  );
}

export function CommodityRelationshipMap() {
  return (
    <section className="relationship-map" aria-label="农产品品种关系图">
      {/* 第一列：核心原料，例如大豆。 */}
      <div className="graph-column graph-source">
        <p className="graph-label">原料</p>
        <CommodityNode
          node={commodityNodes[commodityMap.source]}
          className="main-node"
        />
      </div>

      {/* 中间箭头：processLabel 在 catalog.json 中维护。 */}
      <div className="graph-connector">
        <span>{commodityMap.processLabel}</span>
        <i>→</i>
      </div>

      {/* 第三列：原料加工后的直接产品，例如豆粕、豆油。 */}
      <div className="graph-column graph-products">
        <p className="graph-label">加工品</p>
        {commodityMap.products.map((slug) => (
          <CommodityNode key={slug} node={commodityNodes[slug]} />
        ))}
      </div>

      {/* 最后一列：替代、饲料配方、养殖需求等关联组。 */}
      <div className="graph-relations">
        {commodityMap.relationships.map((relationship) => (
          <div key={relationship.label}>
            <span>{relationship.label}</span>
            {relationship.targets.map((slug) => (
              <CommodityNode key={slug} node={commodityNodes[slug]} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
