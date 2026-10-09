"""DeepSeek 计价表。价格单位：元 / 百万 tokens。"""

from datetime import datetime, time

# 高峰时段单价（元 / 百万 tokens）
_PEAK = {
    "cache_hit": 0.30,
    "cache_miss": 9.0,
    "output": 27.0,
}

# 模型名 -> 高峰价。空闲时段 = 高峰价的一半。
_MODELS = {
    "deepseek-v4-pro": _PEAK,
}

# 高峰时段窗口（北京时间）
_PEAK_WINDOWS = [(time(9, 0), time(12, 0)), (time(14, 0), time(18, 0))]


def is_peak(dt):
    """高峰时段：北京时间周一至周五 9:00-12:00、14:00-18:00（不含法定节假日）。

    简化实现：只按工作日 + 时间段判断，法定节假日暂不处理，
    后续需要可在此处加入节假日表。
    """
    if dt.weekday() >= 5:  # 周六周日
        return False
    t = dt.time()
    return any(start <= t < end for start, end in _PEAK_WINDOWS)


def compute_cost(model, dt, cache_hit_tokens, cache_miss_tokens, output_tokens):
    """计算本次调用费用（元）。"""
    p = _MODELS.get(model, _PEAK)
    if not is_peak(dt):
        p = {k: v / 2 for k, v in p.items()}  # 空闲时段减半
    return (
        cache_hit_tokens / 1_000_000 * p["cache_hit"]
        + cache_miss_tokens / 1_000_000 * p["cache_miss"]
        + output_tokens / 1_000_000 * p["output"]
    )
