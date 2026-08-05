/**
 * 生产构建后的最小页面检查。
 *
 * 修改布局通常无需改测试；如果删改了页面上的关键标题或模块，再同步调整断言。
 * 运行方式：npm test。
 */
import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the commodity relationship map", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>农产品研究 Wiki｜品种关系与研究框架<\/title>/);
  assert.match(html, /从品种关系进入 Wiki/);
  assert.match(html, /压榨/);
  assert.match(html, /蛋白替代/);
  assert.match(html, /养殖需求/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders the soybean macro and daily sections", async () => {
  const response = await render("/soybean");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /宏观数据/);
  assert.match(html, /日报数据/);
  assert.match(html, /commodities\/soybean\/four-charts\.html/);
  assert.match(html, /巴西产量/);
  assert.match(html, /宏观数据检查表/);
  assert.match(html, /全国豆粕现货均价/);
  assert.match(html, /日报信号检查表/);
  assert.match(html, /关联品种/);
});
