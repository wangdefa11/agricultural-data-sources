from __future__ import annotations

import sqlite3
from pathlib import Path


SCHEMA = """
CREATE TABLE IF NOT EXISTS psd_observations (
    id INTEGER PRIMARY KEY,
    commodity_code TEXT NOT NULL,
    commodity TEXT NOT NULL,
    country_code TEXT NOT NULL,
    country TEXT NOT NULL,
    market_year INTEGER NOT NULL,
    calendar_year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    attribute_id TEXT NOT NULL,
    attribute TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    unit TEXT NOT NULL,
    value REAL NOT NULL,
    release_date TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    source_file TEXT NOT NULL,
    UNIQUE (
        commodity_code, country_code, market_year, attribute_id, release_date
    )
);

CREATE INDEX IF NOT EXISTS idx_psd_latest
ON psd_observations (release_date, country, market_year, attribute);

CREATE TABLE IF NOT EXISTS wasde_observations (
    id INTEGER PRIMARY KEY,
    wasde_number TEXT NOT NULL,
    report_date TEXT NOT NULL,
    report_title TEXT NOT NULL,
    attribute TEXT NOT NULL,
    reliability_projection TEXT NOT NULL,
    commodity TEXT NOT NULL,
    region TEXT NOT NULL,
    market_year TEXT NOT NULL,
    proj_est_flag TEXT NOT NULL,
    annual_quarter_flag TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    release_date TEXT NOT NULL,
    release_time TEXT NOT NULL,
    forecast_year INTEGER NOT NULL,
    forecast_month INTEGER NOT NULL,
    fetched_at TEXT NOT NULL,
    source_file TEXT NOT NULL,
    UNIQUE (
        release_date, report_title, attribute, commodity, region, market_year,
        proj_est_flag, annual_quarter_flag, unit
    )
);

CREATE INDEX IF NOT EXISTS idx_wasde_revisions
ON wasde_observations (
    commodity, report_title, release_date, region, market_year, attribute
);

CREATE TABLE IF NOT EXISTS sync_runs (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL,
    release_date TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    source_file TEXT NOT NULL,
    rows_seen INTEGER NOT NULL,
    rows_inserted INTEGER NOT NULL,
    UNIQUE (source, release_date, source_file)
);

CREATE TABLE IF NOT EXISTS entities (
    entity_id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS entity_relations (
    from_entity_id TEXT NOT NULL REFERENCES entities(entity_id),
    to_entity_id TEXT NOT NULL REFERENCES entities(entity_id),
    relation_type TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (from_entity_id, to_entity_id, relation_type)
);

CREATE TABLE IF NOT EXISTS metrics (
    metric_code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    definition TEXT NOT NULL,
    default_unit TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS data_series (
    series_id TEXT PRIMARY KEY,
    metric_code TEXT NOT NULL REFERENCES metrics(metric_code),
    name TEXT NOT NULL,
    geography TEXT NOT NULL,
    frequency TEXT NOT NULL,
    unit TEXT NOT NULL,
    source TEXT NOT NULL,
    source_series_key TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_data_series_metric
ON data_series (metric_code, geography, frequency);

CREATE TABLE IF NOT EXISTS observations (
    series_id TEXT NOT NULL REFERENCES data_series(series_id),
    period TEXT NOT NULL,
    value REAL NOT NULL,
    release_date TEXT NOT NULL DEFAULT '',
    fetched_at TEXT NOT NULL DEFAULT '',
    source_record_id TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (series_id, period, release_date)
);

CREATE INDEX IF NOT EXISTS idx_observations_series_period
ON observations (series_id, period);

CREATE TABLE IF NOT EXISTS page_series_usage (
    id INTEGER PRIMARY KEY,
    page_entity_id TEXT NOT NULL REFERENCES entities(entity_id),
    series_id TEXT NOT NULL REFERENCES data_series(series_id),
    section TEXT NOT NULL,
    role TEXT NOT NULL,
    display_title TEXT NOT NULL DEFAULT '',
    chart_key TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    UNIQUE (page_entity_id, series_id, section, chart_key)
);

CREATE INDEX IF NOT EXISTS idx_page_series_usage_page
ON page_series_usage (page_entity_id, section, display_order);
"""


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.executescript(SCHEMA)
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA foreign_keys = ON")
    return connection
