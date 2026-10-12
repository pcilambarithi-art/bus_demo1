import asyncio
import pytest
from backend.app.services.live_updates import sse_manager

def test_sse_manager_registration_and_broadcast():
    """Test SSE queue registration and non-blocking real-time broadcasting."""
    async def run_test():
        q = await sse_manager.connect()
        try:
            test_payload = {"type": "GPS_TELEMETRY_UPDATE", "bus": {"busNumber": "DCE-BUS-07"}}
            await sse_manager.broadcast(test_payload)
            received = await asyncio.wait_for(q.get(), timeout=2.0)
            assert received["type"] == "GPS_TELEMETRY_UPDATE"
            assert received["bus"]["busNumber"] == "DCE-BUS-07"
        finally:
            await sse_manager.disconnect(q)

    asyncio.run(run_test())
