"""SQLite 存储：埋点写，悬浮窗读。"""

import os
import sqlite3
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime

# 数据目录：打包版用 Electron 传入的可写目录（XIAOBAI_DATA_DIR），开发版用项目内 data 目录
DB_DIR = os.environ.get("XIAOBAI_DATA_DIR") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "data"
)
DB_PATH = os.path.join(DB_DIR, "usage.db")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts REAL NOT NULL,
    model TEXT NOT NULL,
    cache_hit_tokens INTEGER NOT NULL DEFAULT 0,
    cache_miss_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    cost REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_usage_ts ON usage(ts);
"""


def _connect():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.executescript(_SCHEMA)
    return conn


@contextmanager
def _db():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def record(ts, model, cache_hit_tokens, cache_miss_tokens, completion_tokens, cost):
    with _db() as conn:
        conn.execute(
            "INSERT INTO usage(ts, model, cache_hit_tokens, cache_miss_tokens, completion_tokens, cost) "
            "VALUES(?,?,?,?,?,?)",
            (ts, model, cache_hit_tokens, cache_miss_tokens, completion_tokens, cost),
        )


def _where(start_ts, end_ts):
    conds, params = [], []
    if start_ts is not None:
        conds.append("ts >= ?")
        params.append(start_ts)
    if end_ts is not None:
        conds.append("ts < ?")
        params.append(end_ts)
    clause = (" WHERE " + " AND ".join(conds)) if conds else ""
    return clause, params


def summary(start_ts=None, end_ts=None):
    clause, params = _where(start_ts, end_ts)
    sql = (
        "SELECT COUNT(*), COALESCE(SUM(cache_hit_tokens),0), COALESCE(SUM(cache_miss_tokens),0), "
        "COALESCE(SUM(completion_tokens),0), COALESCE(SUM(cost),0) FROM usage" + clause
    )
    with _db() as conn:
        row = conn.execute(sql, params).fetchone()
    return {
        "calls": row[0],
        "cache_hit_tokens": row[1],
        "cache_miss_tokens": row[2],
        "completion_tokens": row[3],
        "cost": row[4],
    }


def by_model(start_ts=None, end_ts=None):
    clause, params = _where(start_ts, end_ts)
    sql = (
        "SELECT model, COUNT(*), COALESCE(SUM(cache_hit_tokens),0), COALESCE(SUM(cache_miss_tokens),0), "
        "COALESCE(SUM(completion_tokens),0), COALESCE(SUM(cost),0) FROM usage"
        + clause + " GROUP BY model ORDER BY SUM(cost) DESC"
    )
    with _db() as conn:
        return conn.execute(sql, params).fetchall()


def daily_costs(start_ts=None, end_ts=None):
    clause, params = _where(start_ts, end_ts)
    with _db() as conn:
        rows = conn.execute("SELECT ts, cost FROM usage" + clause, params).fetchall()
    buckets = defaultdict(float)
    for ts, cost in rows:
        buckets[datetime.fromtimestamp(ts).date()] += cost
    return sorted(buckets.items())
