from datetime import datetime, timezone, timedelta

CACHE = {}
CACHE_TTL = timedelta(minutes=10)

def get_cached(key, loader):
    """Basic in-memory cache helper for static pricing data."""
    now = datetime.now(timezone.utc)
    if key in CACHE:
        data, expiry = CACHE[key]
        if now < expiry:
            return data
    # Rebuild cache
    data = loader()
    CACHE[key] = (data, now + CACHE_TTL)
    return data

def invalidate_cache(key_prefix=None):
    """Invalidate cached items (optionally by prefix)."""
    global CACHE
    if key_prefix is None:
        CACHE.clear()  # wipe everything
    else:
        keys_to_remove = [k for k in CACHE if k.startswith(key_prefix)]
        for k in keys_to_remove:
            del CACHE[k]