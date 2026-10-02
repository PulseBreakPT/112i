import asyncio
import sys
from pathlib import Path

from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from road_routing import RoadRouter


class FakeCollection:
    def __init__(self):
        self.document = None

    async def find_one(self, query, projection=None):
        if self.document and self.document.get("key") == query.get("key"):
            return self.document
        return None

    async def update_one(self, query, update, upsert=False):
        self.document = update["$set"]


class FakeDB:
    def __init__(self):
        self.road_routes = FakeCollection()


class FakeResponse:
    status_code = 200

    def raise_for_status(self):
        return None

    def json(self):
        return {
            "code": "Ok",
            "routes": [{
                "duration": 20.0,
                "distance": 220.0,
                "geometry": {"coordinates": [[-8.61, 41.15], [-8.609, 41.151], [-8.608, 41.152]]},
                "legs": [{
                    "annotation": {"duration": [8.0, 12.0], "distance": [90.0, 130.0]},
                    "steps": [{"name": "Rua A", "duration": 20.0, "distance": 220.0, "mode": "driving"}],
                }],
            }],
        }


class FakeClient:
    def __init__(self):
        self.calls = 0

    async def get(self, *args, **kwargs):
        self.calls += 1
        return FakeResponse()

    async def aclose(self):
        return None


def test_coordinate_route_is_cached_and_has_cumulative_timing(monkeypatch):
    monkeypatch.setenv("OSRM_URL", "https://router.invalid")
    router = RoadRouter(FakeDB())
    router.client = FakeClient()
    origin = {"lng": -8.61, "lat": 41.15, "land": "mainland"}
    destination = {"lng": -8.608, "lat": 41.152, "land": "mainland"}

    first = asyncio.run(router.get(origin, destination))
    second = asyncio.run(router.get(origin, destination))

    assert first["coordinates"] == second["coordinates"]
    assert first["times"][0] == 0
    assert abs(first["times"][-1] - first["duration"]) < 0.001
    assert len(first["times"]) == len(first["coordinates"])
    assert router.client.calls == 1


def test_cross_region_route_is_rejected(monkeypatch):
    monkeypatch.setenv("OSRM_URL", "https://router.invalid")
    router = RoadRouter(FakeDB())
    router.client = FakeClient()

    try:
        asyncio.run(router.get(
            {"lng": -8.61, "lat": 41.15, "land": "mainland"},
            {"lng": -16.91, "lat": 32.65, "land": "madeira"},
        ))
    except HTTPException as error:
        assert error.status_code == 422
    else:
        raise AssertionError("Cross-region routing should be rejected")
