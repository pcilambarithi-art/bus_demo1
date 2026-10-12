import asyncio
import json
import logging
from typing import Set, Dict, Any, List

logger = logging.getLogger("dce_transit.live_updates")

class SSEManager:
    def __init__(self):
        self._clients: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def connect(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._clients.add(q)
        logger.info(f"SSE client connected. Active listeners: {len(self._clients)}")
        return q

    async def disconnect(self, q: asyncio.Queue):
        async with self._lock:
            self._clients.discard(q)
        logger.info(f"SSE client disconnected. Active listeners: {len(self._clients)}")

    async def broadcast(self, payload: Dict[str, Any]):
        dead_clients = []
        async with self._lock:
            for q in self._clients:
                try:
                    q.put_nowait(payload)
                except asyncio.QueueFull:
                    dead_clients.append(q)
                except Exception:
                    dead_clients.append(q)
            for dead in dead_clients:
                self._clients.discard(dead)

    def broadcast_sync(self, payload: Dict[str, Any]):
        """Synchronous bridge to broadcast to active event loop."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(payload))
        except RuntimeError:
            pass

sse_manager = SSEManager()
