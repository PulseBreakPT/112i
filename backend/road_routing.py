"""OSRM road routes, persistent cache, serialized <=1 request/second public upstream."""
import asyncio
import hashlib
import math
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
import httpx
from fastapi import HTTPException


class RoadRouter:
    def __init__(self, db):
        self.db = db
        self.lock = asyncio.Lock()
        self.last_request = 0.0
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0),
                                       headers={'User-Agent': 'Distrito112-GeographicSimulation/1.0'})

    async def close(self):
        await self.client.aclose()

    async def get(self, origin, destination):
        if origin['land'] != destination['land']:
            raise HTTPException(422, 'Sem ligação rodoviária entre estas ilhas ou o continente. Mobiliza uma base na mesma ilha.')
        coordinates = f"{origin['lng']:.6f},{origin['lat']:.6f};{destination['lng']:.6f},{destination['lat']:.6f}"
        key = hashlib.sha256(f'osrm-driving-v1:{coordinates}'.encode()).hexdigest()
        async with self.lock:
            now = datetime.now(timezone.utc)
            cached = await self.db.road_routes.find_one({'key': key, 'expires_at': {'$gt': now}}, {'_id': 0})
            if cached:
                return cached['route']
            await asyncio.sleep(max(0, 1.1 - (time.monotonic() - self.last_request)))
            self.last_request = time.monotonic()
            try:
                response = await self.client.get(
                    f"{os.environ['OSRM_URL'].rstrip('/')}/route/v1/driving/{coordinates}",
                    params={'steps': 'true', 'annotations': 'true', 'geometries': 'geojson',
                            'overview': 'full', 'alternatives': 'false', 'radiuses': '200;200'})
                if response.status_code == 400:
                    raise HTTPException(422, 'Não foi encontrada uma estrada acessível neste local.')
                response.raise_for_status()
                data = response.json()
            except (httpx.HTTPError, ValueError) as exc:
                raise HTTPException(503, 'O serviço de rotas está temporariamente indisponível. Não foram mobilizadas viaturas; tenta novamente.') from exc
            if data.get('code') != 'Ok' or not data.get('routes'):
                raise HTTPException(422, 'Sem percurso rodoviário disponível. Escolhe outra base; não são criadas rotas em linha reta.')
            raw = data['routes'][0]
            points = raw.get('geometry', {}).get('coordinates', [])
            duration = raw.get('duration', 0)
            distance = raw.get('distance', 0)
            annotation = raw['legs'][0].get('annotation', {})
            times = annotation.get('duration', [])
            distances = annotation.get('distance', [])
            if (len(points) < 2 or len(times) != len(points) - 1 or len(distances) != len(times)
                    or any(not math.isfinite(t) or t < 0 for t in times)
                    or not math.isfinite(duration) or duration < 0):
                raise HTTPException(502, 'O serviço devolveu um percurso incompleto. Nenhuma viatura foi mobilizada.')
            total = sum(times)
            if duration > 0 and total <= 0:
                raise HTTPException(502, 'O serviço devolveu tempos de percurso inválidos.')
            # Include the route's turn costs proportionally while preserving per-road timing.
            scaled = [t * duration / total for t in times] if total else [0 for _ in times]
            cumulative = [0.0]
            for seconds in scaled:
                cumulative.append(cumulative[-1] + seconds)
            result = {'id': str(uuid.uuid4()), 'coordinates': points, 'times': cumulative,
                      'duration': duration, 'distance': distance, 'source': 'OSRM / OpenStreetMap',
                      'estimated': True, 'live_traffic': False,
                      'steps': [{'name': s.get('name', ''), 'duration': s.get('duration', 0),
                                 'distance': s.get('distance', 0), 'mode': s.get('mode')}
                                for leg in raw['legs'] for s in leg.get('steps', [])]}
            if any(s['mode'] == 'ferry' for s in result['steps']):
                raise HTTPException(422, 'Este trajeto exige transporte marítimo. Usa uma base com ligação rodoviária direta.')
            await self.db.road_routes.update_one({'key': key}, {'$set': {
                'id': str(uuid.uuid4()), 'key': key, 'route': result,
                'expires_at': now + timedelta(days=7)}}, upsert=True)
            return result
