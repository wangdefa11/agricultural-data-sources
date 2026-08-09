"""把每个品种的单一 wiki.md 转换成前端只读内容。

无第三方依赖。npm 的 predev 和 prebuild 会自动运行本脚本。
"""

from __future__ import annotations

import argparse
from contextlib import contextmanager
import hashlib
import json
import math
import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
COMMODITIES = CONTENT / "commodities"
OUTPUT = CONTENT / "generated" / "site-content.json"
PUBLIC_COMMODITIES = ROOT / "public" / "commodities"
BUILD_LOCK = Path(tempfile.gettempdir()) / (
    "commodity-wiki-"
    f"{hashlib.sha256(str(ROOT).encode()).hexdigest()[:12]}.lock"
)

REQUIRED_META = ("slug", "name")
SUMMARY_HEADING = "摘要"
SOURCE_HEADING = "数据来源与口径"
IMAGE_EXTENSIONS = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"}
IMAGE_MARKDOWN = re.compile(r"^!\[(?P<alt>.*)\]\((?P<src>[^)]+)\)$")
SECTION_HEADING = re.compile(
    r"^(?:(?P<index>\d{1,3})\s+)?"
    r"(?P<title>.*?)"
    r"(?:\s+\{(?P<id>[a-z0-9-]+)\})?$"
)
BLOCK_HEADING = re.compile(
    r"^(?P<title>.*?)"
    r"(?:\s+\{(?P<attrs>[^{}]+)\})?$"
)
BLOCK_KINDS = {"chart", "checklist", "embed", "relations", "source", "stats"}
BLOCK_SPANS = {"full", "narrow", "wide"}


@contextmanager
def content_build_lock():
    """防止多个本地开发服务同时重建公共资源目录。"""
    with BUILD_LOCK.open("a+") as handle:
        if os.name == "posix":
            import fcntl

            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            if os.name == "posix":
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def load_json(path: Path) -> dict[str, Any]:
    """读取一个 JSON 对象，并把格式错误转换成易懂的中文提示。"""
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"无法读取 JSON：{path}（{exc}）") from exc
    if not isinstance(value, dict):
        raise ValueError(f"JSON 顶层必须是对象：{path}")
    return value


def normalise_markdown(lines: list[str]) -> str:
    """把多行普通文字整理成保留段落的纯文本。"""
    paragraphs: list[str] = []
    current: list[str] = []
    for line in lines:
        text = line.strip()
        if text:
            current.append(text)
        elif current:
            paragraphs.append(" ".join(current))
            current = []
    if current:
        paragraphs.append(" ".join(current))
    return "\n\n".join(paragraphs)


def parse_front_matter(
    path: Path,
    lines: list[str],
) -> tuple[dict[str, str], int]:
    """读取 wiki.md 开头的简单 key: value 字段。"""
    if not lines or lines[0].strip() != "---":
        raise ValueError(f"Markdown 缺少开头的 ---：{path}")
    try:
        closing = next(
            index
            for index, line in enumerate(lines[1:], start=1)
            if line.strip() == "---"
        )
    except StopIteration as exc:
        raise ValueError(f"Markdown front matter 没有结束的 ---：{path}") from exc

    meta: dict[str, str] = {}
    for line in lines[1:closing]:
        if not line.strip():
            continue
        key, separator, value = line.partition(":")
        if not separator or not key.strip() or not value.strip():
            raise ValueError(f"front matter 行格式错误：{path}：{line}")
        meta[key.strip()] = value.strip()

    missing = [key for key in REQUIRED_META if not meta.get(key)]
    if missing:
        raise ValueError(f"Markdown 缺少字段 {missing}：{path}")
    return meta, closing


def split_h2_sections(
    path: Path,
    lines: list[str],
) -> list[tuple[str, list[str]]]:
    """按 ## 二级标题切分整份 wiki.md，并保留原始顺序。"""
    sections: list[tuple[str, list[str]]] = []
    current_heading: str | None = None
    current_lines: list[str] = []
    seen: set[str] = set()

    for line in lines:
        if line.startswith("## "):
            if current_heading is not None:
                sections.append((current_heading, current_lines))
            current_heading = line[3:].strip()
            current_lines = []
            if not current_heading:
                raise ValueError(f"存在空二级标题：{path}")
            if current_heading in seen:
                raise ValueError(f"二级标题重复：{path}：{current_heading}")
            seen.add(current_heading)
        elif current_heading is not None:
            current_lines.append(line)
        elif line.strip():
            raise ValueError(f"正文必须放在 ## 标题下面：{path}：{line}")

    if current_heading is not None:
        sections.append((current_heading, current_lines))
    return sections


def split_h3_blocks(
    path: Path,
    section_title: str,
    lines: list[str],
) -> tuple[str, list[tuple[str, str | None, str, list[str]]]]:
    """把一个页面章节拆成章节说明、隐式内容块和 ### 内容块。"""
    preamble: list[str] = []
    blocks: list[tuple[str, str | None, str, list[str]]] = []
    current_title: str | None = None
    current_kind: str | None = None
    current_span = "full"
    current_lines: list[str] = []

    for line in lines:
        if line.startswith("### "):
            if current_title is not None:
                blocks.append(
                    (current_title, current_kind, current_span, current_lines)
                )
            match = BLOCK_HEADING.fullmatch(line[4:].strip())
            if match is None or not match.group("title").strip():
                raise ValueError(f"三级标题格式错误：{path}：{line}")
            attrs = set((match.group("attrs") or "").split())
            unknown = attrs - BLOCK_KINDS - BLOCK_SPANS
            if unknown:
                raise ValueError(
                    f"{path} 的“{section_title}”存在未知块属性：{sorted(unknown)}"
                )
            kinds = attrs & BLOCK_KINDS
            spans = attrs & BLOCK_SPANS
            if len(kinds) > 1 or len(spans) > 1:
                raise ValueError(f"三级标题只能设置一种类型和一种宽度：{line}")
            current_title = match.group("title").strip()
            current_kind = next(iter(kinds), None)
            current_span = next(iter(spans), "full")
            current_lines = []
        elif current_title is None:
            preamble.append(line)
        else:
            current_lines.append(line)

    if current_title is not None:
        blocks.append((current_title, current_kind, current_span, current_lines))

    # 二级标题后允许直接写“说明文字 + 表格 + 补充文字”，无需为了让
    # 表格生效而人为增加空的三级标题。第一段普通文字仍用作章节说明；
    # 表格及其后的文字按原顺序转换成无标题内容块。
    segments: list[tuple[str, list[str]]] = []
    text_lines: list[str] = []
    index = 0
    while index < len(preamble):
        if preamble[index].strip().startswith("|"):
            table_lines: list[str] = []
            while (
                index < len(preamble)
                and preamble[index].strip().startswith("|")
            ):
                table_lines.append(preamble[index])
                index += 1
            if markdown_table(
                table_lines,
                f"{path} 的“{section_title}”",
            ) is not None:
                if any(line.strip() for line in text_lines):
                    segments.append(("text", text_lines))
                text_lines = []
                segments.append(("table", table_lines))
                continue
            text_lines.extend(table_lines)
            continue
        text_lines.append(preamble[index])
        index += 1

    if any(line.strip() for line in text_lines):
        segments.append(("text", text_lines))

    description = ""
    implicit_blocks: list[tuple[str, str | None, str, list[str]]] = []
    for segment_kind, segment_lines in segments:
        if not description and not implicit_blocks and segment_kind == "text":
            description = normalise_markdown(segment_lines)
        else:
            implicit_blocks.append(("", None, "full", segment_lines))
    return description, implicit_blocks + blocks


def markdown_table(
    lines: list[str],
    location: str,
) -> tuple[list[str], list[list[str]]] | None:
    """识别一个完整的 Markdown 表格；普通正文返回 None。"""
    rows = [line.strip() for line in lines if line.strip()]
    if len(rows) < 2 or any("|" not in row for row in rows):
        return None

    cells = [
        [cell.strip() for cell in row.strip("|").split("|")]
        for row in rows
    ]
    if not cells[0] or len(cells[1]) != len(cells[0]):
        return None
    if not all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells[1]):
        return None
    if any(len(row) != len(cells[0]) for row in cells[2:]):
        raise ValueError(f"{location} 的表格每一行必须与表头列数一致")
    return cells[0], cells[2:]


def public_image_src(slug: str, source: str) -> str:
    """验证 images/ 下的图片并转换成浏览器网址。"""
    relative = Path(source)
    if (
        relative.is_absolute()
        or not relative.parts
        or relative.parts[0] != "images"
        or ".." in relative.parts
        or relative.suffix.lower() not in IMAGE_EXTENSIONS
    ):
        raise ValueError(
            f"commodities/{slug} 图片必须指向 images/ 下的图片：{source}"
        )
    if not (COMMODITIES / slug / relative).is_file():
        raise ValueError(f"commodities/{slug} 找不到图片：{source}")
    return f"/commodities/{slug}/{relative.as_posix()}"


def public_chart_src(slug: str, source: str) -> str:
    """验证 charts/ 下的独立图表并转换成浏览器网址。"""
    relative = Path(source)
    if (
        relative.is_absolute()
        or not relative.parts
        or relative.parts[0] != "charts"
        or ".." in relative.parts
    ):
        raise ValueError(
            f"commodities/{slug} 嵌入图表必须指向 charts/ 下的文件：{source}"
        )
    chart_path = COMMODITIES / slug / relative
    if not chart_path.is_file():
        raise ValueError(f"commodities/{slug} 找不到图表：{source}")
    public_relative = relative.relative_to("charts")
    version = hashlib.sha256(chart_path.read_bytes()).hexdigest()[:10]
    return f"/commodities/{slug}/{public_relative.as_posix()}?v={version}"


def parse_metadata(lines: list[str], location: str) -> dict[str, str]:
    """读取图表块中表格之前的“字段：内容”行。"""
    metadata: dict[str, str] = {}
    for line in lines:
        text = line.strip()
        if not text:
            continue
        key, separator, value = text.partition("：")
        if not separator:
            key, separator, value = text.partition(":")
        if not separator or not key.strip() or not value.strip():
            raise ValueError(f"{location} 的配置行应写成“字段：内容”：{line}")
        metadata[key.strip()] = value.strip()
    return metadata


def parse_number(value: str, location: str) -> float:
    """读取图表数值并给出明确错误。"""
    try:
        return float(value)
    except ValueError as exc:
        raise ValueError(f"{location} 不是有效数字：{value}") from exc


def nice_step(value: float) -> float:
    """把任意间距向上取成适合坐标轴的 1、2、5 倍数。"""
    if value <= 0:
        return 1
    magnitude = 10 ** math.floor(math.log10(value))
    fraction = value / magnitude
    multiplier = 1 if fraction <= 1 else 2 if fraction <= 2 else 5 if fraction <= 5 else 10
    return multiplier * magnitude


def clean_number(value: float) -> int | float:
    """避免自动计算结果出现无意义的浮点尾数。"""
    rounded = round(value, 10)
    return int(rounded) if rounded.is_integer() else rounded


def automatic_chart_bounds(
    values: list[float],
    series_count: int,
) -> tuple[int | float | None, int | float]:
    """根据数据范围自动选择纵轴起点和上限。"""
    minimum = min(values)
    maximum = max(values)
    spread = maximum - minimum

    if (
        series_count == 1
        and minimum > 0
        and spread > 0
        and spread / maximum <= 0.35
    ):
        step = nice_step(spread / 6)
        baseline = math.floor((minimum - step) / step) * step
        ceiling = math.ceil((maximum + step) / step) * step
        return clean_number(max(0, baseline)), clean_number(ceiling)

    rounding = 10 ** max(math.floor(math.log10(maximum)) - 1, -6)
    ceiling = math.ceil(maximum * 1.05 / rounding) * rounding
    return None, clean_number(ceiling)


def resolve_block(
    slug: str,
    section_title: str,
    title: str,
    kind: str | None,
    span: str,
    lines: list[str],
) -> tuple[str, Any]:
    """把一个 ### 内容块转换成页面块、指标或关联关系。"""
    location = f"commodities/{slug}/wiki.md 的“{section_title} / {title}”"
    nonempty = [line.strip() for line in lines if line.strip()]
    if not nonempty:
        raise ValueError(f"{location}没有内容")

    if kind == "stats":
        table = markdown_table(lines, location)
        if table is None:
            raise ValueError(f"{location}必须填写 Markdown 表格")
        columns, rows = table
        if len(columns) not in {3, 4}:
            raise ValueError(f"{location}必须是指标、数值、说明和可选 seriesId")
        stats = []
        for row in rows:
            item = {"label": row[0], "value": row[1], "context": row[2]}
            if len(row) == 4 and row[3]:
                item["seriesId"] = row[3]
            stats.append(item)
        return "stats", stats

    if kind == "chart":
        try:
            table_start = next(
                index for index, line in enumerate(lines)
                if line.strip().startswith("|")
            )
        except StopIteration as exc:
            raise ValueError(f"{location}缺少图表数据表格") from exc
        metadata = parse_metadata(lines[:table_start], location)
        table = markdown_table(lines[table_start:], location)
        if table is None:
            raise ValueError(f"{location}的图表数据表格格式错误")
        columns, rows = table
        if len(columns) < 2:
            raise ValueError(f"{location}至少需要一列时间和一列数据")
        points = [
            {
                "label": row[0],
                "values": [
                    parse_number(value, location) for value in row[1:]
                ],
            }
            for row in rows
        ]
        all_values = [
            value for point in points for value in point["values"]
        ]
        if not all_values:
            raise ValueError(f"{location}至少需要一行图表数据")
        automatic_baseline, automatic_ceiling = automatic_chart_bounds(
            all_values, len(columns) - 1
        )
        block: dict[str, Any] = {
            "kind": "chart",
            "span": span,
            "title": title,
            "description": metadata.get("说明", ""),
            "ariaLabel": metadata.get("无障碍说明", f"{title}图表"),
            "series": [{"name": name} for name in columns[1:]],
            "ceiling": (
                parse_number(metadata["纵轴上限"], location)
                if metadata.get("纵轴上限")
                else automatic_ceiling
            ),
            "points": points,
            "sourceNote": (
                f"来源：{metadata['来源']}" if metadata.get("来源") else ""
            ),
        }
        if metadata.get("纵轴起点"):
            block["baseline"] = parse_number(metadata["纵轴起点"], location)
        elif automatic_baseline is not None:
            block["baseline"] = automatic_baseline
        if metadata.get("最新值"):
            block["latestValue"] = metadata["最新值"]
        return "block", block

    if kind == "embed":
        metadata = parse_metadata(lines, location)
        source = metadata.get("文件")
        if not source:
            raise ValueError(f"{location}缺少“文件”")
        block = {
            "kind": "embed",
            "span": span,
            "title": title,
            "description": metadata.get("说明", ""),
            "src": public_chart_src(slug, source),
            "linkLabel": metadata.get("链接文字", "单独打开图表 ↗"),
        }
        if metadata.get("初始高度"):
            block["height"] = int(metadata["初始高度"])
        return "block", block

    if kind == "checklist":
        table = markdown_table(lines, location)
        if table is None:
            raise ValueError(f"{location}必须填写 Markdown 表格")
        columns, rows = table
        if len(columns) != 2:
            raise ValueError(f"{location}必须是项目、说明两列")
        return "block", {
            "kind": "checklist",
            "span": span,
            "title": title,
            "items": [
                {"title": row[0], "description": row[1]} for row in rows
            ],
        }

    if kind == "source":
        return "block", {
            "kind": "source",
            "span": span,
            "text": normalise_markdown(lines),
        }

    if kind == "relations":
        table = markdown_table(lines, location)
        if table is None:
            raise ValueError(f"{location}必须填写 Markdown 表格")
        columns, rows = table
        if len(columns) != 2:
            raise ValueError(f"{location}必须是类型、内容两列")
        relation_flow = []
        for relation_kind, value in rows:
            if relation_kind not in {"node", "label"}:
                raise ValueError(f"{location}的类型只能是 node 或 label")
            relation_flow.append(
                {"kind": relation_kind, "slug": value}
                if relation_kind == "node"
                else {"kind": relation_kind, "text": value}
            )
        return "relations", relation_flow

    image = IMAGE_MARKDOWN.fullmatch(nonempty[0])
    if image:
        return "block", {
            "kind": "image",
            "span": span,
            "src": public_image_src(slug, image.group("src").strip()),
            "alt": image.group("alt").strip(),
            "title": title,
            "caption": normalise_markdown(nonempty[1:]),
        }

    table = markdown_table(lines, location)
    if table:
        columns, rows = table
        return "block", {
            "kind": "table",
            "span": span,
            "title": title,
            "columns": columns,
            "rows": rows,
        }

    text = normalise_markdown(lines)
    return "block", {
        "kind": "text",
        "span": span,
        "title": title,
        "paragraphs": [
            paragraph for paragraph in text.split("\n\n") if paragraph
        ],
    }


def parse_wiki(path: Path) -> dict[str, Any]:
    """从一个 wiki.md 生成完整品种页面。"""
    lines = path.read_text(encoding="utf-8").splitlines()
    meta, closing = parse_front_matter(path, lines)
    slug = path.parent.name
    if meta["slug"] != slug:
        raise ValueError(f"目录名和 Markdown slug 不一致：{slug} / {meta['slug']}")

    raw_sections = split_h2_sections(path, lines[closing + 1 :])
    summary = ""
    source_description = ""
    sections: list[dict[str, Any]] = []
    relation_flow: list[dict[str, str]] = []
    relations_meta = {
        "index": "99",
        "title": "关联品种",
        "description": "",
        "fullMapLink": meta.get("relations_link_label", "查看完整品种关系图 →"),
    }

    for raw_heading, section_lines in raw_sections:
        if raw_heading == SUMMARY_HEADING:
            if any(line.startswith("### ") for line in section_lines):
                raise ValueError(f"“## {SUMMARY_HEADING}”下面不能使用三级标题")
            summary = normalise_markdown(section_lines)
            continue
        if raw_heading == SOURCE_HEADING:
            if any(line.startswith("### ") for line in section_lines):
                raise ValueError(f"“## {SOURCE_HEADING}”下面不能使用三级标题")
            source_description = normalise_markdown(section_lines)
            continue

        match = SECTION_HEADING.fullmatch(raw_heading)
        if match is None or not match.group("title").strip():
            raise ValueError(f"二级章节格式错误：{path}：{raw_heading}")
        index = match.group("index") or f"{len(sections) + 1:02d}"
        title = match.group("title").strip()
        section_id = match.group("id")
        if not section_id:
            raise ValueError(
                f"章节“{raw_heading}”缺少英文 id，例如 {{macro}}"
            )

        description, raw_blocks = split_h3_blocks(
            path, title, section_lines
        )
        stats: list[dict[str, str]] | None = None
        page_blocks: list[dict[str, Any]] = []
        section_relations: list[dict[str, str]] | None = None
        for block_title, kind, span, block_lines in raw_blocks:
            result_kind, value = resolve_block(
                slug,
                title,
                block_title,
                kind,
                span,
                block_lines,
            )
            if result_kind == "stats":
                if stats is not None:
                    raise ValueError(f"章节“{title}”只能有一个 stats 块")
                stats = value
            elif result_kind == "relations":
                if section_relations is not None:
                    raise ValueError(f"章节“{title}”只能有一个 relations 块")
                section_relations = value
            else:
                page_blocks.append(value)

        if section_id == "relations":
            relations_meta.update({
                "index": index,
                "title": title,
                "description": description,
            })
            relation_flow = section_relations or []
            if page_blocks or stats:
                raise ValueError("关联品种章节只能使用 relations 块")
            continue

        section = {
            "id": section_id,
            "index": index,
            "title": title,
            "description": description,
            "blocks": page_blocks,
        }
        if stats is not None:
            section["stats"] = stats
        sections.append(section)

    if not summary:
        raise ValueError(f"Markdown 缺少“## {SUMMARY_HEADING}”：{path}")

    page = {
        "slug": slug,
        "name": meta["name"],
        "codes": meta.get("codes", ""),
        "summary": summary,
        "pageText": {
            "siteName": meta.get("site_name", "农产品研究 Wiki"),
            "mapNavLabel": meta.get("map_nav_label", "品种关系"),
            "breadcrumbRootLabel": meta.get(
                "breadcrumb_root_label", "品种关系"
            ),
            "relations": relations_meta,
            "sources": {"title": SOURCE_HEADING},
        },
        "sections": sections,
        "relationFlow": relation_flow,
        "sourceDescription": source_description,
    }
    if hero_image := meta.get("hero_image"):
        page["heroImage"] = public_image_src(slug, hero_image)
    for source_key, output_key in (
        ("hero_alt", "heroAlt"),
        ("hero_credit", "heroCredit"),
        ("hero_source", "heroSource"),
    ):
        if value := meta.get(source_key):
            page[output_key] = value
    return page


def validate_catalog(catalog: dict[str, Any]) -> None:
    """检查品种节点和关系图引用是否完整。"""
    nodes = catalog.get("nodes")
    mapping = catalog.get("map")
    if not isinstance(nodes, dict) or not nodes:
        raise ValueError("catalog.json 的 nodes 必须是非空对象")
    if not isinstance(mapping, dict):
        raise ValueError("catalog.json 的 map 必须是对象")

    for slug, node in nodes.items():
        if not isinstance(node, dict) or node.get("slug") != slug:
            raise ValueError(f"品种节点 slug 不一致：{slug}")
        for key in ("name", "code", "summary"):
            if not node.get(key):
                raise ValueError(f"品种节点缺少 {key}：{slug}")

    referenced = [mapping.get("source"), *mapping.get("products", [])]
    for relation in mapping.get("relationships", []):
        referenced.extend(relation.get("targets", []))
    unknown = sorted({slug for slug in referenced if slug not in nodes})
    if unknown:
        raise ValueError(f"关系图引用了未登记品种：{unknown}")


def build_content() -> dict[str, Any]:
    """发现所有 commodities/<slug>/wiki.md，并生成全站内容。"""
    catalog = load_json(CONTENT / "catalog.json")
    validate_catalog(catalog)
    nodes = catalog["nodes"]

    pages: dict[str, Any] = {}
    for markdown_path in sorted(COMMODITIES.glob("*/wiki.md")):
        slug = markdown_path.parent.name
        if slug not in nodes:
            raise ValueError(f"品种页面未在 catalog.json 登记：{slug}")
        pages[slug] = parse_wiki(markdown_path)

    for slug, node in nodes.items():
        if node.get("ready") is True and slug not in pages:
            raise ValueError(f"品种标记为 ready 但没有 wiki.md：{slug}")

    for slug, page in pages.items():
        for item in page["relationFlow"]:
            if item["kind"] == "node" and item["slug"] not in nodes:
                raise ValueError(
                    f"{slug} 页面引用了未登记关联品种：{item['slug']}"
                )

    return {"catalog": catalog, "pages": pages}


def sync_commodity_assets(check: bool) -> None:
    """把各品种的 charts/ 和 images/ 同步到浏览器可访问目录。"""
    expected: dict[Path, Path] = {}
    for commodity_dir in sorted(
        path for path in COMMODITIES.iterdir() if path.is_dir()
    ):
        slug = commodity_dir.name
        charts_dir = commodity_dir / "charts"
        if charts_dir.exists():
            for source in sorted(charts_dir.rglob("*")):
                if not source.is_file():
                    continue
                target = (
                    PUBLIC_COMMODITIES
                    / slug
                    / source.relative_to(charts_dir)
                )
                expected[target] = source

        images_dir = commodity_dir / "images"
        if images_dir.exists():
            for source in sorted(images_dir.rglob("*")):
                if (
                    not source.is_file()
                    or source.suffix.lower() not in IMAGE_EXTENSIONS
                ):
                    continue
                target = (
                    PUBLIC_COMMODITIES
                    / slug
                    / "images"
                    / source.relative_to(images_dir)
                )
                expected[target] = source

    existing = (
        {path for path in PUBLIC_COMMODITIES.rglob("*") if path.is_file()}
        if PUBLIC_COMMODITIES.exists()
        else set()
    )
    if check:
        missing_or_changed = [
            target
            for target, source in expected.items()
            if not target.exists() or target.read_bytes() != source.read_bytes()
        ]
        extra = sorted(existing - set(expected))
        if missing_or_changed or extra:
            raise SystemExit(
                "品种图表或图片副本不是最新，请运行 scripts/build_site_content.py"
            )
        return

    if PUBLIC_COMMODITIES.exists():
        shutil.rmtree(PUBLIC_COMMODITIES)
    for target, source in expected.items():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def main() -> int:
    """生成内容；传入 --check 时只检查生成结果是否为最新。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="只检查已生成文件是否为最新，不写文件",
    )
    args = parser.parse_args()

    with content_build_lock():
        rendered = json.dumps(
            build_content(), ensure_ascii=False, indent=2
        ) + "\n"
        if args.check:
            if (
                not OUTPUT.exists()
                or OUTPUT.read_text(encoding="utf-8") != rendered
            ):
                raise SystemExit(
                    "生成内容不是最新，请运行 scripts/build_site_content.py"
                )
            sync_commodity_assets(check=True)
            print("内容配置有效，生成文件为最新")
            return 0

        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(rendered, encoding="utf-8")
        sync_commodity_assets(check=False)
        print(f"已生成：{OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
