import asyncio
import logging
from functools import wraps
from ccxt.base.errors import NetworkError, RequestTimeout

logger = logging.getLogger(__name__)

def retry_on_error(max_retries=3, delay=1):
    """
    Async decorator to retry functions on network errors.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for i in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except (NetworkError, RequestTimeout) as e:
                    last_exception = e
                    wait_time = delay * (2 ** i)
                    logger.warning(f"网络请求失败 ({i+1}/{max_retries}): {e}. 重试中 ({wait_time}s)...")
                    await asyncio.sleep(wait_time)
                except Exception as e:
                    # 非网络错误直接抛出
                    raise e
            logger.error(f"重试 {max_retries} 次后仍然失败: {last_exception}")
            raise last_exception
        return wrapper
    return decorator
