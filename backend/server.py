import asyncio
import os
from pathlib import Path
from uuid import UUID
from datetime import datetime, timezone
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware
from engine import new_game, tick, action
from world import world_data, SERVICES, SITES

load_dotenv(Path(__file__).parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
app = FastAPI(title='NEXO 112 · Central de Operações')
api = APIRouter(prefix='/api')
locks = {}

class GameResponse(BaseModel):
    id: str
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

async def read_game(game_id):
    game = await db.games.find_one({'id': str(game_id)}, {'_id': 0})
    if not game:
        raise HTTPException(404, 'Turno não encontrado.')
    return game

async def save_game(game):
    game['saved_at'] = datetime.now(timezone.utc).isoformat()
    await db.games.replace_one({'id': game['id']}, dict(game), upsert=True)
    return GameResponse(**game)

@api.get('/')
async def health():
    return {'status': 'operational', 'name': 'NEXO 112'}

@api.get('/world')
async def world():
    return {**world_data(), 'services': SERVICES, 'sites': SITES}

@api.post('/games', response_model=GameResponse)
async def create():
    return await save_game(new_game())

@api.get('/games/{game_id}', response_model=GameResponse)
async def get_game(game_id: UUID):
    return GameResponse(**await read_game(game_id))

@api.post('/games/{game_id}/tick', response_model=GameResponse)
async def advance(game_id: UUID, req: TickRequest):
    async with locks.setdefault(str(game_id), asyncio.Lock()):
        game = await read_game(game_id)
        tick(game, req.seconds)
        return await save_game(game)

@api.post('/games/{game_id}/action', response_model=GameResponse)
async def perform(game_id: UUID, req: ActionRequest):
    async with locks.setdefault(str(game_id), asyncio.Lock()):
        game = await read_game(game_id)
        if req.type == 'reset':
            game = new_game(str(game_id))
        else:
            action(game, req.type, req.data)
        return await save_game(game)

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_origins=os.environ['CORS_ORIGINS'].split(','), allow_credentials=False, allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])

@app.on_event('startup')
async def startup():
    await db.games.create_index('id', unique=True)

@app.on_event('shutdown')
async def shutdown():
    client.close()