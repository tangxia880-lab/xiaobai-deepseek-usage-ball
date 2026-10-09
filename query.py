"""读取本地 SQLite 用量，输出 JSON 快照，供 Electron 悬浮窗轮询。"""

import json
from datetime import datetime, timedelta

from tracker import storage


def start_of_day(dt):
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def start_of_week(dt):
    d = start_of_day(dt)
    return d - timedelta(days=d.weekday())


def start_of_month(dt):
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def main():
    now = datetime.now()
    day = storage.summary(start_of_day(now).timestamp())
    week = storage.summary(start_of_week(now).timestamp())
    month = storage.summary(start_of_month(now).timestamp())

    by_model = [
        {"model": m, "calls": c, "hit": h, "miss": ms, "completion": comp, "cost": cost}
        for m, c, h, ms, comp, cost in storage.by_model(start_of_month(now).timestamp())
    ]

    start = start_of_day(now) - timedelta(days=6)
    daily_map = dict(storage.daily_costs(start.timestamp()))
    daily = []
    for i in range(7):
        d = (start + timedelta(days=i)).date()
        daily.append({"date": d.strftime("%m-%d"), "cost": daily_map.get(d, 0.0)})

    print(json.dumps({
        "day": day,
        "week": week,
        "month": month,
        "by_model": by_model,
        "daily": daily,
    }))


if __name__ == "__main__":
    main()
