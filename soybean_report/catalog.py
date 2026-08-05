from __future__ import annotations

import sqlite3
from collections.abc import Iterable


def upsert_entity(
    connection: sqlite3.Connection,
    *,
    entity_id: str,
    slug: str,
    name: str,
    entity_type: str,
    description: str = "",
) -> None:
    connection.execute(
        """
        INSERT INTO entities (
            entity_id, slug, name, entity_type, description
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(entity_id) DO UPDATE SET
            slug = excluded.slug,
            name = excluded.name,
            entity_type = excluded.entity_type,
            description = excluded.description
        """,
        (entity_id, slug, name, entity_type, description),
    )


def upsert_entity_relation(
    connection: sqlite3.Connection,
    *,
    from_entity_id: str,
    to_entity_id: str,
    relation_type: str,
    description: str = "",
) -> None:
    connection.execute(
        """
        INSERT INTO entity_relations (
            from_entity_id, to_entity_id, relation_type, description
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(from_entity_id, to_entity_id, relation_type)
        DO UPDATE SET description = excluded.description
        """,
        (from_entity_id, to_entity_id, relation_type, description),
    )


def upsert_metric(
    connection: sqlite3.Connection,
    *,
    metric_code: str,
    name: str,
    definition: str,
    default_unit: str = "",
) -> None:
    connection.execute(
        """
        INSERT INTO metrics (
            metric_code, name, definition, default_unit
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(metric_code) DO UPDATE SET
            name = excluded.name,
            definition = excluded.definition,
            default_unit = excluded.default_unit
        """,
        (metric_code, name, definition, default_unit),
    )


def upsert_series(
    connection: sqlite3.Connection,
    *,
    series_id: str,
    metric_code: str,
    name: str,
    geography: str,
    frequency: str,
    unit: str,
    source: str,
    source_series_key: str = "",
    description: str = "",
) -> None:
    connection.execute(
        """
        INSERT INTO data_series (
            series_id, metric_code, name, geography, frequency, unit,
            source, source_series_key, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(series_id) DO UPDATE SET
            metric_code = excluded.metric_code,
            name = excluded.name,
            geography = excluded.geography,
            frequency = excluded.frequency,
            unit = excluded.unit,
            source = excluded.source,
            source_series_key = excluded.source_series_key,
            description = excluded.description
        """,
        (
            series_id,
            metric_code,
            name,
            geography,
            frequency,
            unit,
            source,
            source_series_key,
            description,
        ),
    )


def upsert_observation(
    connection: sqlite3.Connection,
    *,
    series_id: str,
    period: str,
    value: float,
    release_date: str = "",
    fetched_at: str = "",
    source_record_id: str = "",
) -> None:
    connection.execute(
        """
        INSERT INTO observations (
            series_id, period, value, release_date, fetched_at, source_record_id
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(series_id, period, release_date) DO UPDATE SET
            value = excluded.value,
            fetched_at = excluded.fetched_at,
            source_record_id = excluded.source_record_id
        """,
        (
            series_id,
            period,
            value,
            release_date,
            fetched_at,
            source_record_id,
        ),
    )


def upsert_observations(
    connection: sqlite3.Connection,
    rows: Iterable[dict[str, str | float]],
) -> None:
    for row in rows:
        upsert_observation(connection, **row)


def attach_series_to_page(
    connection: sqlite3.Connection,
    *,
    page_entity_id: str,
    series_id: str,
    section: str,
    role: str,
    display_title: str = "",
    chart_key: str = "",
    display_order: int = 0,
    note: str = "",
) -> None:
    connection.execute(
        """
        INSERT INTO page_series_usage (
            page_entity_id, series_id, section, role, display_title,
            chart_key, display_order, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(page_entity_id, series_id, section, chart_key)
        DO UPDATE SET
            role = excluded.role,
            display_title = excluded.display_title,
            display_order = excluded.display_order,
            note = excluded.note
        """,
        (
            page_entity_id,
            series_id,
            section,
            role,
            display_title,
            chart_key,
            display_order,
            note,
        ),
    )


def list_page_series(
    connection: sqlite3.Connection,
    page_entity_id: str,
) -> list[sqlite3.Row]:
    return connection.execute(
        """
        SELECT
            usage.page_entity_id,
            usage.section,
            usage.role,
            usage.display_title,
            usage.chart_key,
            usage.display_order,
            usage.note,
            series.series_id,
            series.metric_code,
            series.name AS series_name,
            series.geography,
            series.frequency,
            series.unit,
            series.source
        FROM page_series_usage AS usage
        JOIN data_series AS series ON series.series_id = usage.series_id
        WHERE usage.page_entity_id = ?
        ORDER BY usage.section, usage.display_order, usage.id
        """,
        (page_entity_id,),
    ).fetchall()


def latest_observations(
    connection: sqlite3.Connection,
    series_id: str,
) -> list[sqlite3.Row]:
    return connection.execute(
        """
        SELECT current.series_id, current.period, current.value,
               current.release_date, current.fetched_at,
               current.source_record_id
        FROM observations AS current
        WHERE current.series_id = ?
          AND current.release_date = (
              SELECT MAX(candidate.release_date)
              FROM observations AS candidate
              WHERE candidate.series_id = current.series_id
                AND candidate.period = current.period
          )
        ORDER BY current.period
        """,
        (series_id,),
    ).fetchall()
