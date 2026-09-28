"""Real geographical points; facilities/incidents are fictional simulation locations."""
import os
from world import SERVICES

MODE = 'portugal-v1'


def place(key, name, lng, lat, city, land='mainland'):
    return {'id': key, 'node': key, 'name': name, 'lng': lng, 'lat': lat,
            'x': lng, 'y': lat, 'city': city, 'land': land}


PLACES = [
    place('porto-boavista', 'Boavista · Porto', -8.6306, 41.1578, 'Porto'),
    place('porto-asprela', 'Asprela · Porto', -8.6045, 41.1807, 'Porto'),
    place('porto-bonfim', 'Bonfim · Porto', -8.6006, 41.1499, 'Porto'),
    place('porto-aliados', 'Avenida dos Aliados', -8.6110, 41.1496, 'Porto'),
    place('porto-cedofeita', 'Rua de Cedofeita', -8.6188, 41.1537, 'Porto'),
    place('porto-trindade', 'Trindade', -8.6089, 41.1537, 'Porto'),
    place('porto-batalha', 'Praça da Batalha', -8.6067, 41.1458, 'Porto'),
    place('porto-campanha', 'Campanhã · Porto', -8.5860, 41.1496, 'Porto'),
    place('porto-foz', 'Foz do Douro · Porto', -8.6711, 41.1514, 'Porto'),
    place('gaia', 'Vila Nova de Gaia', -8.6080, 41.1294, 'Porto'),
    place('matosinhos', 'Matosinhos', -8.6826, 41.1821, 'Porto'),
    place('maia', 'Maia', -8.6199, 41.2350, 'Porto'),
    place('braga', 'Braga', -8.4201, 41.5500, 'Braga'),
    place('braga-north', 'São Vicente · Braga', -8.4180, 41.5600, 'Braga'),
    place('aveiro', 'Aveiro', -8.6455, 40.6404, 'Aveiro'),
    place('aveiro-east', 'Vera Cruz · Aveiro', -8.6385, 40.6450, 'Aveiro'),
    place('coimbra', 'Coimbra', -8.4292, 40.2100, 'Coimbra'),
    place('coimbra-south', 'Santa Clara · Coimbra', -8.4360, 40.2010, 'Coimbra'),
    place('lisboa', 'Lisboa · Marquês de Pombal', -9.1493, 38.7253, 'Lisboa'),
    place('lisboa-east', 'Alameda · Lisboa', -9.1330, 38.7370, 'Lisboa'),
    place('faro', 'Faro', -7.9304, 37.0194, 'Faro'),
    place('faro-north', 'Penha · Faro', -7.9230, 37.0270, 'Faro'),
    place('funchal', 'Funchal · Madeira', -16.9100, 32.6495, 'Funchal', 'madeira'),
    place('machico', 'Machico · Madeira', -16.7660, 32.7190, 'Funchal', 'madeira'),
    place('ponta-delgada', 'Ponta Delgada · Açores', -25.6670, 37.7415, 'São Miguel', 'sao-miguel'),
    place('ribeira-grande', 'Ribeira Grande · Açores', -25.5200, 37.8210, 'São Miguel', 'sao-miguel'),
    place('angra', 'Angra do Heroísmo · Açores', -27.2180, 38.6550, 'Terceira', 'terceira'),
    place('praia-vitoria', 'Praia da Vitória · Açores', -27.0690, 38.7300, 'Terceira', 'terceira'),
]
POINTS = {p['id']: p for p in PLACES}
SITE_IDS = ['porto-campanha', 'porto-foz', 'gaia', 'matosinhos', 'maia', 'braga', 'aveiro',
            'coimbra', 'lisboa', 'faro', 'funchal', 'ponta-delgada', 'angra']
SITES = [POINTS[key] for key in SITE_IDS]


def world_data():
    return {'mode': MODE, 'name': 'Portugal', 'center': [-8.616, 41.156], 'zoom': 13.1,
            'map_style': os.environ['MAP_STYLE_URL'], 'services': SERVICES, 'sites': SITES,
            'regions': [
                {'id': 'porto', 'name': 'Porto', 'center': [-8.616, 41.156], 'zoom': 13.1},
                {'id': 'mainland', 'name': 'Continente', 'bounds': [[-9.6, 36.9], [-6.1, 42.2]]},
                {'id': 'madeira', 'name': 'Madeira', 'bounds': [[-17.3, 32.6], [-16.25, 33.15]]},
                {'id': 'azores', 'name': 'Açores', 'bounds': [[-31.4, 36.85], [-24.8, 39.8]]},
            ], 'routing': {'provider': 'OSRM / OpenStreetMap', 'live_traffic': False,
                           'notice': 'Tempos rodoviários estimados. Serviço público sem garantia de disponibilidade.'}}
