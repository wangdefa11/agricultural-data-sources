/**
 * 全站顶部导航。
 *
 * 顶部只保留通用的“品种关系”入口，避免导航绑定某一个具体品种。
 * 网站名和入口文字来自品种 wiki.md 的文件头。
 * 修改导航高度、颜色和悬停效果：改 app/globals.css 的“顶部导航”部分。
 */
import { commodityPages } from "../content";
import type { CommodityPage } from "../content/types";

type SiteHeaderProps = {
  page?: CommodityPage;
};

export function SiteHeader({ page }: SiteHeaderProps) {
  const displayedPage = page ?? Object.values(commodityPages)[0];

  return (
    <header className="plain-header">
      <a className="site-name" href="/">
        {displayedPage?.pageText.siteName ?? "农产品研究 Wiki"}
      </a>
      <nav aria-label="主导航">
        <a className="is-current" href="/">
          {displayedPage?.pageText.mapNavLabel ?? "品种关系"}
        </a>
      </nav>
    </header>
  );
}
