from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path


PSD_MANIFEST_URL = (
    "https://apps.fas.usda.gov/psdonline/"
    "DatasetHandler.ashx?returnType=CURRENT_DATA_SET"
)
PSD_BASE_URL = "https://apps.fas.usda.gov/psdonline/downloads/"
PSD_FILENAME = "psd_oilseeds_csv.zip"
WASDE_HISTORY_URL = (
    "https://www.usda.gov/about-usda/general-information/staff-offices/"
    "office-chief-economist/commodity-markets/wasde-report/"
    "historical-wasde-report-data"
)
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0 Safari/537.36"
)
SOYBEAN_PSD_COMMODITY_CODE = "2222000"
SOYBEAN_WASDE_COMMODITY = "Oilseed, Soybean"


class SourceError(RuntimeError):
    pass


class _WasdeLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href") or ""
        name = Path(urllib.parse.urlparse(href).path).name
        if (
            name.startswith("oce-wasde-report-data-")
            and name.endswith(".csv")
        ):
            self.links.append(href)


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _download(url: str, destination: Path, attempts: int = 3) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp = destination.with_suffix(destination.suffix + ".part")
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/csv,application/zip,application/json,text/html,*/*",
        },
    )
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                with temp.open("wb") as output:
                    while chunk := response.read(1024 * 1024):
                        output.write(chunk)
            temp.replace(destination)
            return destination
        except urllib.error.HTTPError as exc:
            last_error = exc
            temp.unlink(missing_ok=True)
            if exc.code in {403, 404}:
                raise SourceError(f"下载失败：{url}（{exc}）") from exc
            if attempt + 1 < attempts:
                time.sleep(1 + attempt)
        except Exception as exc:
            last_error = exc
            temp.unlink(missing_ok=True)
            if attempt + 1 < attempts:
                time.sleep(1 + attempt)
    raise SourceError(f"下载失败：{url}（{last_error}）") from last_error


def _read_url(url: str) -> bytes:
    request = urllib.request.Request(
        url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"}
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read()
    except Exception as exc:
        raise SourceError(f"读取失败：{url}（{exc}）") from exc


def _normalise_us_date(value: str) -> str:
    return datetime.strptime(value, "%m/%d/%Y").date().isoformat()


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def sync_psd(
    connection: sqlite3.Connection, raw_root: Path
) -> dict[str, int | str]:
    manifest = json.loads(_read_url(PSD_MANIFEST_URL))
    item = next(
        (
            entry
            for entry in manifest["DownloadableDataSets"]
            if entry["FileName"] == PSD_FILENAME
        ),
        None,
    )
    if item is None:
        raise SourceError(f"USDA 清单中找不到 {PSD_FILENAME}")

    release_date = _normalise_us_date(item["LastUpdated"])
    raw_dir = raw_root / "psd" / release_date
    archive = raw_dir / PSD_FILENAME
    if not archive.exists():
        _download(PSD_BASE_URL + PSD_FILENAME, archive)

    fetched_at = _utc_now()
    rows_seen = 0
    before = connection.total_changes
    with zipfile.ZipFile(archive) as bundle:
        csv_names = [
            name for name in bundle.namelist() if name.lower().endswith(".csv")
        ]
        if len(csv_names) != 1:
            raise SourceError("PSD ZIP 内部 CSV 数量异常")
        with bundle.open(csv_names[0]) as binary:
            reader = csv.DictReader(io.TextIOWrapper(binary, encoding="utf-8-sig"))
            for row in reader:
                if row["Commodity_Code"] != SOYBEAN_PSD_COMMODITY_CODE:
                    continue
                rows_seen += 1
                connection.execute(
                    """
                    INSERT OR IGNORE INTO psd_observations (
                        commodity_code, commodity, country_code, country,
                        market_year, calendar_year, month, attribute_id,
                        attribute, unit_id, unit, value, release_date,
                        fetched_at, source_file
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        row["Commodity_Code"],
                        row["Commodity_Description"],
                        row["Country_Code"],
                        row["Country_Name"],
                        int(row["Market_Year"]),
                        int(row["Calendar_Year"]),
                        int(row["Month"]),
                        row["Attribute_ID"],
                        row["Attribute_Description"],
                        row["Unit_ID"],
                        row["Unit_Description"],
                        float(row["Value"]),
                        release_date,
                        fetched_at,
                        str(archive),
                    ),
                )
    rows_inserted = connection.total_changes - before
    connection.execute(
        """
        INSERT OR REPLACE INTO sync_runs (
            source, release_date, fetched_at, source_file,
            rows_seen, rows_inserted
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            "USDA_PSD",
            release_date,
            fetched_at,
            str(archive),
            rows_seen,
            rows_inserted,
        ),
    )
    connection.commit()
    return {
        "source": "USDA_PSD",
        "release_date": release_date,
        "rows_seen": rows_seen,
        "rows_inserted": rows_inserted,
        "sha256": _sha256(archive),
    }


def discover_wasde_csv_urls(start_year: int) -> list[str]:
    try:
        parser = _WasdeLinkParser()
        parser.feed(
            _read_url(WASDE_HISTORY_URL).decode("utf-8", errors="replace")
        )
        urls = {
            urllib.parse.urljoin(WASDE_HISTORY_URL, href)
            for href in parser.links
            if _wasde_year_from_name(href) >= start_year
        }
        if urls:
            return sorted(urls)
    except SourceError:
        pass

    # USDA 的目录页偶尔会被 CDN 拒绝，但月度 CSV 仍公开可用。
    # 官方文件名从 2021 年起保持固定，用年月生成候选地址。
    today = datetime.now(UTC).date()
    urls = []
    for year in range(max(start_year, 2021), today.year + 1):
        last_month = today.month if year == today.year else 12
        for month in range(1, last_month + 1):
            base = (
                "https://www.usda.gov/sites/default/files/documents/"
                f"oce-wasde-report-data-{year:04d}-{month:02d}"
            )
            # 部分月份的勘误版文件只以 -V2 发布，优先使用它。
            urls.extend((base + "-V2.csv", base + ".csv"))
    return urls


def _wasde_year_from_name(url: str) -> int:
    return int(_wasde_month_key(url)[:4])


def _wasde_month_key(url: str) -> str:
    name = Path(urllib.parse.urlparse(url).path).name
    match = re.search(r"oce-wasde-report-data-(\d{4}-\d{2})", name)
    if not match:
        raise SourceError(f"无法识别 WASDE 文件年月：{name}")
    return match.group(1)


def import_wasde_csv(
    connection: sqlite3.Connection, path: Path
) -> dict[str, int | str]:
    fetched_at = _utc_now()
    rows_seen = 0
    release_date = ""
    before = connection.total_changes
    with path.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            if row["Commodity"] != SOYBEAN_WASDE_COMMODITY:
                continue
            if not row["Value"].strip():
                continue
            rows_seen += 1
            release_date = row["ReleaseDate"]
            connection.execute(
                """
                INSERT OR IGNORE INTO wasde_observations (
                    wasde_number, report_date, report_title, attribute,
                    reliability_projection, commodity, region, market_year,
                    proj_est_flag, annual_quarter_flag, value, unit,
                    release_date, release_time, forecast_year, forecast_month,
                    fetched_at, source_file
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["WasdeNumber"],
                    row["ReportDate"],
                    row["ReportTitle"],
                    row["Attribute"],
                    row["ReliabilityProjection"],
                    row["Commodity"],
                    row["Region"],
                    row["MarketYear"],
                    row["ProjEstFlag"],
                    row["AnnualQuarterFlag"],
                    float(row["Value"]),
                    row["Unit"],
                    row["ReleaseDate"],
                    row["ReleaseTime"],
                    int(row["ForecastYear"]),
                    int(row["ForecastMonth"]),
                    fetched_at,
                    str(path),
                ),
            )
    if not release_date:
        raise SourceError(f"{path.name} 中没有大豆 WASDE 数据")
    rows_inserted = connection.total_changes - before
    connection.execute(
        """
        INSERT OR REPLACE INTO sync_runs (
            source, release_date, fetched_at, source_file,
            rows_seen, rows_inserted
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            "USDA_WASDE",
            release_date,
            fetched_at,
            str(path),
            rows_seen,
            rows_inserted,
        ),
    )
    connection.commit()
    return {
        "source": "USDA_WASDE",
        "release_date": release_date,
        "rows_seen": rows_seen,
        "rows_inserted": rows_inserted,
        "sha256": _sha256(path),
    }


def sync_wasde(
    connection: sqlite3.Connection, raw_root: Path, start_year: int
) -> list[dict[str, int | str]]:
    results: list[dict[str, int | str]] = []
    completed_months: set[str] = set()
    current_month = datetime.now(UTC).date().strftime("%Y-%m")

    def import_once(path: Path) -> dict[str, int | str]:
        existing = connection.execute(
            """
            SELECT release_date, rows_seen
            FROM sync_runs
            WHERE source = 'USDA_WASDE' AND source_file = ?
            """,
            (str(path),),
        ).fetchone()
        if existing:
            return {
                "source": "USDA_WASDE",
                "release_date": existing["release_date"],
                "rows_seen": existing["rows_seen"],
                "rows_inserted": 0,
            }
        return import_wasde_csv(connection, path)

    for url in discover_wasde_csv_urls(start_year):
        year_month = _wasde_month_key(url)
        if year_month in completed_months:
            continue
        month_dir = raw_root / "wasde" / year_month[:4]
        local_files = sorted(
            month_dir.glob(
                f"oce-wasde-report-data-{year_month}*.csv"
            ),
            key=lambda item: ("-V2" not in item.name, item.name),
        )
        if local_files and year_month != current_month:
            results.append(import_once(local_files[0]))
            completed_months.add(year_month)
            continue
        filename = Path(urllib.parse.urlparse(url).path).name
        path = month_dir / filename
        if not path.exists():
            try:
                _download(url, path)
            except SourceError as exc:
                cause = exc.__cause__
                if isinstance(cause, urllib.error.HTTPError) and cause.code in {
                    403,
                    404,
                }:
                    continue
                # _download deliberately wraps the final exception in text, so
                # handle USDA's missing-file response when no cause is retained.
                if "HTTP Error 403" in str(exc) or "HTTP Error 404" in str(exc):
                    continue
                raise
        results.append(import_once(path))
        completed_months.add(year_month)
    return results
