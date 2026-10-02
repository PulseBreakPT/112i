import asyncio
import hashlib
import os
import re
import secrets
from pathlib import Path
from uuid import UUID, uuid4
from datetime import datetime, timezone, timedelta
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Header, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from engine import new_game, tick, action
from world import world_data, SERVICES, SITES
from geo_world import POINTS, MODE, world_data as geo_world_data
import geo_engine
from road_routing import RoadRouter

load_dotenv(Path(__file__).parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
road_router = RoadRouter(db)
app = FastAPI(title='Distrito 112 · Central de Operações')
api = APIRouter(prefix='/api')
locks = {}
room_locks = {}

CALLSIGNS = [
    'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
    'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa',
    'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Zulu',
]


class GameResponse(BaseModel):
    id: str
    mode: str = 'legacy'
    city: str = "Porto d'Ouro"
    money: int
    xp: int
    level: int
    trust: int
    elapsed: float
    speed: int
    completed: int
    failed: int
    earned: int
    next_spawn: float
    sequence: int
    incidents: list[dict[str, Any]]
    units: list[dict[str, Any]]
    bases: list[dict[str, Any]]
    logs: list[dict[str, Any]]
    history: list[dict[str, Any]]
    saved_at: str


class ActionRequest(BaseModel):
    type: str
    data: dict[str, Any] = Field(default_factory=dict)


class TickRequest(BaseModel):
    seconds: float = Field(default=2, gt=0, le=3)


class PlayerCreate(BaseModel):
    callsign: str | None = None


class RoomCreate(BaseModel):
    name: str | None = None


class OnlineActionRequest(BaseModel):
    type: str
    data: dict[str, Any] = Field(default_factory=dict)
    expected_revision: int = Field(ge=0)


def utcnow():
    return datetime.now(timezone.utc)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def safe_room_name(value: str | None) -> str:
    text = re.sub(r'[^A-Za-zÀ-ÿ0-9 ._-]+', '', str(value or '')).strip()[:32]
    return text or 'Sala operacional'


def public_room(room: dict[str, Any]) -> dict[str, Any]:
    return {
        'id': room['id'],
        'name': room['name'],
        'status': room['status'],
        'host_id': room['host_id'],
        'members': room.get('members', []),
        'revision': room.get('revision', 0),
        'game': room['game'],
        'created_at': room['created_at'],
        'updated_at': room['updated_at'],
    }


async def authenticated_player(authorization: str | None) -> dict[str, Any]:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Sessão online necessária.')
    token = authorization[7:].strip()
    if len(token) < 20:
        raise HTTPException(401, 'Sessão online inválida.')
    now = utcnow()
    query = {'token_hash': token_hash(token), '$or': [{'expires_at': {'$gt': now}}, {'expires_at': {'$exists': False}}]}
    player = await db.online_players.find_one(query, {'_id': 0, 'token_hash': 0})
    if not player:
        raise HTTPException(401, 'Sessão online inválida ou expirada.')
    expires_at = player.get('expires_at') or (now + timedelta(days=90))
    await db.online_players.update_one({'id': player['id']}, {'$set': {'last_seen_at': now, 'expires_at': expires_at}})
    player['last_seen_at'] = now
    player['expires_at'] = expires_at
    return player


def server_score(game: dict[str, Any]) -> int:
    completed = int(game.get('completed', 0))
    if completed <= 0:
        return 0
    failed = int(game.get('failed', 0))
    earned = int(game.get('earned', 0))
    trust = int(game.get('trust', 0))
    history = game.get('history', [])
    successful = [item for item in history if item.get('success')]
    response_bonus = sum(max(0.0, 900.0 - float(item.get('response_time', 900))) / 3 for item in successful)
    triage_bonus = sum(150 for item in successful if item.get('triage_correct'))
    waste_penalty = sum(max(0, int(item.get('units_used', 0)) - int(item.get('required_units', 0))) * 90 for item in successful)
    failure_penalty = failed * 900
    trust_bonus = max(0, trust - 90) * 18
    value = completed * 900 + earned / 12 + trust_bonus + response_bonus + triage_bonus - waste_penalty - failure_penalty
    return max(0, int(round(value)))


async def read_game(game_id):
    game = await db.games.find_one({'id': str(game_id)}, {'_id': 0})
    if not game:
        raise HTTPException(404, 'Turno não encontrado.')
    return game


async def save_game(game):
    game['saved_at'] = utcnow().isoformat()
    await db.games.replace_one({'id': game['id']}, dict(game), upsert=True)
    return GameResponse(**game)


async def read_room(room_id: str) -> dict[str, Any]:
    room = await db.online_rooms.find_one({'id': room_id}, {'_id': 0})
    if not room:
        raise HTTPException(404, 'Sala não encontrada.')
    if room.get('status') == 'active' and room.get('expires_at') and room['expires_at'] <= utcnow():
        room['status'] = 'expired'
        room['updated_at'] = utcnow()
        await db.online_rooms.update_one({'id': room_id, 'status': 'active'}, {'$set': {'status': 'expired', 'updated_at': room['updated_at']}})
    return room


def ensure_member(room: dict[str, Any], player_id: str):
    if not any(member.get('player_id') == player_id for member in room.get('members', [])):
        raise HTTPException(403, 'Não pertences a esta sala.')


@api.get('/')
async def health():
    return {'status': 'operational', 'name': 'Distrito 112'}


@api.get('/road-routes/{origin_id}/{destination_id}')
async def road_route(origin_id: str, destination_id: str):
    if origin_id not in POINTS or destination_id not in POINTS:
        raise HTTPException(422, 'Localização desconhecida.')
    return await road_router.get(POINTS[origin_id], POINTS[destination_id])


@api.get('/world')
async def world():
    return geo_world_data()


@api.get('/legacy/world')
async def legacy_world():
    return {**world_data(), 'services': SERVICES, 'sites': SITES}


@api.post('/games', response_model=GameResponse)
async def create():
    return await save_game(geo_engine.new_game())


@api.get('/games/{game_id}', response_model=GameResponse)
async def get_game(game_id: UUID):
    return GameResponse(**await read_game(game_id))


@api.post('/games/{game_id}/tick', response_model=GameResponse)
async def advance(game_id: UUID, req: TickRequest):
    async with locks.setdefault(str(game_id), asyncio.Lock()):
        game = await read_game(game_id)
        if game.get('mode') == MODE:
            geo_engine.tick(game, req.seconds)
        else:
            tick(game, req.seconds)
        return await save_game(game)


@api.post('/games/{game_id}/action', response_model=GameResponse)
async def perform(game_id: UUID, req: ActionRequest):
    async with locks.setdefault(str(game_id), asyncio.Lock()):
        game = await read_game(game_id)
        if req.type == 'reset':
            game = geo_engine.new_game() if game.get('mode') == MODE else new_game()
            game['id'] = str(game_id)
        elif game.get('mode') == MODE:
            await geo_engine.action(game, req.type, req.data, road_router)
        else:
            action(game, req.type, req.data)
        return await save_game(game)


@api.post('/online/players')
async def create_online_player(req: PlayerCreate):
    requested = (req.callsign or '').strip().title()
    callsign = requested if requested in CALLSIGNS else secrets.choice(CALLSIGNS)
    suffix = secrets.randbelow(9000) + 1000
    display_name = f'{callsign}-{suffix}'
    token = secrets.token_urlsafe(32)
    now = utcnow()
    player = {
        'id': str(uuid4()),
        'callsign': display_name,
        'token_hash': token_hash(token),
        'created_at': now,
        'last_seen_at': now,
        'expires_at': now + timedelta(days=90),
    }
    await db.online_players.insert_one(player)
    return {'player_id': player['id'], 'callsign': display_name, 'token': token}


@api.post('/online/rooms')
async def create_online_room(req: RoomCreate, authorization: str | None = Header(default=None)):
    player = await authenticated_player(authorization)
    now = utcnow()
    game = geo_engine.new_game()
    game['speed'] = 1
    room = {
        'id': str(uuid4()),
        'name': safe_room_name(req.name),
        'status': 'active',
        'host_id': player['id'],
        'members': [{'player_id': player['id'], 'callsign': player['callsign'], 'joined_at': now}],
        'revision': 0,
        'engine_version': 'geo-v2',
        'game': game,
        'created_at': now,
        'updated_at': now,
        'last_tick_at': now,
        'next_tick_at': now + timedelta(seconds=2),
        'expires_at': now + timedelta(hours=24),
    }
    await db.online_rooms.insert_one(room)
    return public_room(room)


@api.post('/online/rooms/{room_id}/join')
async def join_online_room(room_id: str, authorization: str | None = Header(default=None)):
    player = await authenticated_player(authorization)
    async with room_locks.setdefault(room_id, asyncio.Lock()):
        room = await read_room(room_id)
        if room['status'] != 'active':
            raise HTTPException(409, 'A sala já não está ativa.')
        if any(member.get('player_id') == player['id'] for member in room.get('members', [])):
            return public_room(room)
        if len(room.get('members', [])) >= 8:
            raise HTTPException(409, 'A sala atingiu o limite de 8 jogadores.')
        expected = room.get('revision', 0)
        now = utcnow()
        updated = await db.online_rooms.find_one_and_update(
            {'id': room_id, 'status': 'active', 'revision': expected, 'members.player_id': {'$ne': player['id']}},
            {'$push': {'members': {'player_id': player['id'], 'callsign': player['callsign'], 'joined_at': now}},
             '$inc': {'revision': 1},
             '$set': {'updated_at': now}},
            projection={'_id': 0},
            return_document=ReturnDocument.AFTER,
        )
        if not updated:
            raise HTTPException(409, 'A sala mudou entretanto. Sincroniza e tenta novamente.')
        return public_room(updated)

@api.get('/online/rooms/{room_id}')
async def get_online_room(room_id: str, authorization: str | None = Header(default=None)):
    player = await authenticated_player(authorization)
    room = await read_room(room_id)
    ensure_member(room, player['id'])
    return public_room(room)


@api.post('/online/rooms/{room_id}/action')
async def online_room_action(room_id: str, req: OnlineActionRequest, authorization: str | None = Header(default=None)):
    player = await authenticated_player(authorization)
    async with room_locks.setdefault(room_id, asyncio.Lock()):
        room = await read_room(room_id)
        ensure_member(room, player['id'])
        if room['status'] != 'active':
            raise HTTPException(409, 'A partida já terminou.')
        if room.get('revision', 0) != req.expected_revision:
            raise HTTPException(409, detail={'message': 'Estado desatualizado.', 'revision': room.get('revision', 0)})
        if req.type in {'speed', 'reset', 'new_incident'}:
            raise HTTPException(403, 'Esta ação não está disponível no modo online.')
        game = room['game']
        await geo_engine.action(game, req.type, req.data, road_router)
        room['revision'] += 1
        room['updated_at'] = utcnow()
        result = await db.online_rooms.replace_one(
            {'id': room_id, 'revision': req.expected_revision},
            room,
        )
        if result.matched_count != 1:
            raise HTTPException(409, 'A sala foi atualizada por outro jogador. Sincroniza e tenta novamente.')
        return public_room(room)


@api.post('/online/rooms/{room_id}/finish')
async def finish_online_room(room_id: str, authorization: str | None = Header(default=None)):
    player = await authenticated_player(authorization)
    async with room_locks.setdefault(room_id, asyncio.Lock()):
        room = await read_room(room_id)
        ensure_member(room, player['id'])
        if room['host_id'] != player['id']:
            raise HTTPException(403, 'Só o anfitrião pode terminar a partida.')
        if room['status'] == 'finished':
            return {'room_id': room_id, 'score': server_score(room['game']), 'eligible': bool(room.get('leaderboard_eligible'))}
        if room['status'] != 'active':
            raise HTTPException(409, 'A partida já não está ativa.')
        expected = room.get('revision', 0)
        now = utcnow()
        score = server_score(room['game'])
        eligible = int(room['game'].get('completed', 0)) >= 3 and float(room['game'].get('elapsed', 0)) >= 300
        room['status'] = 'finished'
        room['revision'] = expected + 1
        room['updated_at'] = now
        room['leaderboard_eligible'] = eligible
        result = await db.online_rooms.replace_one({'id': room_id, 'status': 'active', 'revision': expected}, room)
        if result.matched_count != 1:
            raise HTTPException(409, 'A sala mudou entretanto. Sincroniza e tenta novamente.')
        entry = {
            'room_id': room_id,
            'score': score,
            'completed': int(room['game'].get('completed', 0)),
            'failed': int(room['game'].get('failed', 0)),
            'trust': int(room['game'].get('trust', 0)),
            'elapsed': float(room['game'].get('elapsed', 0)),
            'players': [member['callsign'] for member in room.get('members', [])],
            'player_count': len(room.get('members', [])),
            'created_at': now,
        }
        if eligible:
            await db.leaderboard.update_one({'room_id': room_id}, {'$set': entry}, upsert=True)
        return {'room_id': room_id, **entry, 'eligible': eligible}

@api.get('/leaderboard')
async def leaderboard(limit: int = Query(default=25, ge=1, le=100), player_count: int | None = Query(default=None, ge=1, le=8)):
    query: dict[str, Any] = {}
    if player_count is not None:
        query['player_count'] = player_count
    cursor = db.leaderboard.find(query, {'_id': 0}).sort([('score', -1), ('elapsed', 1)]).limit(limit)
    return {'entries': [entry async for entry in cursor]}


async def online_tick_loop():
    while True:
        try:
            now = utcnow()
            query = {'status': 'active', '$or': [{'next_tick_at': {'$lte': now}}, {'next_tick_at': {'$exists': False}}]}
            rooms = db.online_rooms.find(query, {'id': 1, '_id': 0}).limit(100)
            async for candidate in rooms:
                room_id = candidate['id']
                claim_id = str(uuid4())
                claimed = await db.online_rooms.find_one_and_update(
                    {'id': room_id, 'status': 'active', '$or': [{'next_tick_at': {'$lte': now}}, {'next_tick_at': {'$exists': False}}]},
                    {'$set': {'next_tick_at': now + timedelta(seconds=2), 'tick_claim_id': claim_id}},
                    projection={'_id': 0},
                    return_document=ReturnDocument.AFTER,
                )
                if not claimed:
                    continue
                expires_at = claimed.get('expires_at')
                if expires_at and expires_at <= now:
                    await db.online_rooms.update_one({'id': room_id, 'tick_claim_id': claim_id}, {'$set': {'status': 'expired', 'updated_at': now}, '$unset': {'tick_claim_id': ''}})
                    continue
                expected = claimed.get('revision', 0)
                last_tick = claimed.get('last_tick_at')
                seconds = max(0.1, min(3.0, (now - last_tick).total_seconds())) if isinstance(last_tick, datetime) else 2.0
                geo_engine.tick(claimed['game'], seconds)
                claimed['revision'] = expected + 1
                claimed['updated_at'] = now
                claimed['last_tick_at'] = now
                claimed['expires_at'] = expires_at or (now + timedelta(hours=24))
                claimed.pop('tick_claim_id', None)
                await db.online_rooms.replace_one({'id': room_id, 'status': 'active', 'revision': expected, 'tick_claim_id': claim_id}, claimed)
        except Exception:
            pass
        await asyncio.sleep(0.5)

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ['CORS_ORIGINS'].split(','),
    allow_credentials=False,
    allow_methods=['GET', 'POST'],
    allow_headers=['Content-Type', 'Authorization'],
)


@app.on_event('startup')
async def startup():
    await db.games.create_index('id', unique=True)
    await db.road_routes.create_index('key', unique=True)
    await db.road_routes.create_index('expires_at', expireAfterSeconds=0)
    await db.online_players.create_index('id', unique=True)
    await db.online_players.create_index('token_hash', unique=True)
    await db.online_players.create_index('expires_at', expireAfterSeconds=0)
    await db.online_rooms.create_index('id', unique=True)
    await db.online_rooms.create_index('expires_at', expireAfterSeconds=0)
    await db.online_rooms.create_index([('status', 1), ('next_tick_at', 1)])
    await db.leaderboard.create_index('room_id', unique=True)
    await db.leaderboard.create_index([('score', -1), ('elapsed', 1)])
    app.state.online_tick_task = asyncio.create_task(online_tick_loop())


@app.on_event('shutdown')
async def shutdown():
    task = getattr(app.state, 'online_tick_task', None)
    if task:
        task.cancel()
    await road_router.close()
    client.close()
