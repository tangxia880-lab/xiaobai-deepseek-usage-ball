"""埋点入口：记录一次 DeepSeek 调用的 token 用量与费用。"""

from datetime import datetime

from . import pricing, storage


def track_usage(usage, model="deepseek-v4-pro", ts=None):
    """记录一次调用用量。

    usage: OpenAI SDK 返回的 response.usage 对象（或 dict，或带同名属性的对象）。
    model: 模型名，用于计价。
    ts:    可选，调用时间（datetime）。默认取当前时间。
    返回本次费用（元）。
    """
    if usage is None:
        return 0.0

    if hasattr(usage, "model_dump"):  # pydantic / OpenAI SDK Usage 对象
        u = usage.model_dump()
    elif isinstance(usage, dict):
        u = usage
    else:
        keys = ("prompt_cache_hit_tokens", "prompt_cache_miss_tokens", "completion_tokens")
        u = {k: getattr(usage, k, 0) for k in keys}

    cache_hit = int(u.get("prompt_cache_hit_tokens") or 0)
    cache_miss = int(u.get("prompt_cache_miss_tokens") or 0)
    completion = int(u.get("completion_tokens") or 0)

    dt = ts if ts is not None else datetime.now()
    cost = pricing.compute_cost(model, dt, cache_hit, cache_miss, completion)
    storage.record(dt.timestamp(), model, cache_hit, cache_miss, completion, cost)
    return cost
