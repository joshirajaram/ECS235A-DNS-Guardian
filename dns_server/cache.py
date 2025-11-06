# Adaptive cache logic (TTL adjustments)

import time


class SimpleCache:
    def __init__(self):
        self._store = {}


    def get(self, key):
        item = self._store.get(key)
        if not item:
            return None
        value, exp = item
        if exp < time.time():
            del self._store[key]
            return None
        return value


    def put(self, key, value, ttl=60):
        self._store[key] = (value, time.time() + ttl)