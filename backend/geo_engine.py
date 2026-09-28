"""Geographic simulation using OSRM routes, real seconds and durable return plans."""
import bisect
import copy
import random
from datetime import datetime, timezone
from engine import uid, log, require, action as common_action, add_unit
from geo_world import MODE, POINTS, PLACES, SITES
from world import SCENARIOS, SERVICES


def new_game():
    g = {'id': uid(), 'mode': MODE, 'city': 'Porto', 'money': 24500, 'xp': 0, 'level': 1,
         'trust': 98, 'elapsed': 0, 'speed': 1, 'completed': 0, 'failed': 0, 'earned': 0,
         'next_spawn': 180, 'sequence': 101, 'incidents': [], 'units': [], 'bases': [],
         'logs': [], 'history': [], 'saved_at': datetime.now(timezone.utc).isoformat()}
    for service, key in [('fire', 'porto-boavista'), ('medical', 'porto-asprela'), ('police', 'porto-bonfim')]:
        base = make_base(service, POINTS[key])
        g['bases'].append(base)
        for _ in range(2):
            add_unit(g, base)
            g['units'][-1].update(lng=base['lng'], lat=base['lat'], land=base['land'])
    spawn(g, 0, 'porto-aliados')
    spawn(g, 1, 'porto-trindade')
    spawn(g, 2, 'porto-batalha')
    log(g, 'Portugal · Central do Porto operacional. Cartografia real; ocorrências e bases de simulação.', 'success')
    return g


def make_base(service, point):
    return {**point, 'id': uid(), 'service': service, 'node': point['id'],
            'name': f"{SERVICES[service]['name']} · {point['name']}"}


def spawn(g, scenario=None, node=None):
    if node is None:
        # Incidents stay around the network the player has actually built, not anywhere in Portugal.
        cities = list({b['city'] for b in g['bases']})
        city = random.choice(cities)
        candidates = [p for p in PLACES if p['city'] == city]
        occupied = {i['node'] for i in g['incidents']}
        candidates = [p for p in candidates if p['id'] not in occupied] or candidates
        point = random.choice(candidates)
        coverage = {b['service'] for b in g['bases'] if b['city'] == city}
        available = [i for i, s in enumerate(SCENARIOS) if set(s['needs']).issubset(coverage)]
        scenario = random.choice(available) if available else 4
    else:
        point = POINTS[node]
    scenario = 0 if scenario is None else scenario
    source = SCENARIOS[scenario]
    incident = {k: copy.deepcopy(source[k]) for k in ['title', 'service', 'priority', 'needs', 'reward', 'xp', 'description']}
    incident.update({'id': uid(), 'number': g['sequence'], 'scenario': scenario,
                     'node': point['id'], 'lng': point['lng'], 'lat': point['lat'],
                     'x': point['lng'], 'y': point['lat'], 'land': point['land'],
                     'address': point['name'], 'district': point['city'], 'status': 'waiting',
                     'created': g['elapsed'], 'deadline': g['elapsed'] + {1: 900, 2: 1200, 3: 1500}[source['priority']],
                     'assigned': [], 'progress': 0, 'call_answered': False,
                     'call': {'text': source['caller'], 'choices': source['choices']}})
    g['incidents'].append(incident)
    g['sequence'] += 1
    log(g, f"Nova ocorrência em {point['city']}: {source['title']}.", 'alert')


def start_route(unit, plan, status, destination):
    unit.update(status=status, route=plan['coordinates'], route_times=plan['times'],
                travel=0, travel_total=plan['duration'], route_distance=plan['distance'],
                route_source=plan['source'], destination=destination,
                lng=plan['coordinates'][0][0], lat=plan['coordinates'][0][1])
    unit['x'], unit['y'] = unit['lng'], unit['lat']


def locate(unit):
    points, times = unit['route'], unit['route_times']
    elapsed = min(unit['travel'], unit['travel_total'])
    index = min(max(0, bisect.bisect_right(times, elapsed) - 1), len(points) - 2)
    span = times[index + 1] - times[index]
    fraction = max(0, min(1, (elapsed - times[index]) / span)) if span else 1
    unit['lng'] = points[index][0] + (points[index + 1][0] - points[index][0]) * fraction
    unit['lat'] = points[index][1] + (points[index + 1][1] - points[index][1]) * fraction
    unit['x'], unit['y'] = unit['lng'], unit['lat']


def return_to_base(unit, base):
    unit['incident_id'] = None
    start_route(unit, unit.pop('return_plan'), 'returning', base['node'])


def resolve(g, incident, success):
    log(g, f"{incident['title']} — " + ('resolvida.' if success else 'prazo de resposta excedido.'), 'success' if success else 'alert')
    g['history'].insert(0, {'id': incident['id'], 'title': incident['title'], 'service': incident['service'],
                          'success': success, 'reward': incident['reward'] if success else 0, 'time': g['elapsed']})
    g['history'] = g['history'][:100]
    for unit in g['units']:
        if unit['incident_id'] != incident['id']:
            continue
        base = next(b for b in g['bases'] if b['id'] == unit['base_id'])
        if unit['status'] == 'enroute':
            # Finish the known road approach before the separately routed return; never teleport/reverse a one-way road.
            unit.update(status='returning', incident_id=None, finish_approach=True)
        else:
            return_to_base(unit, base)
    g['incidents'].remove(incident)


def tick(g, seconds):
    dt = seconds * g['speed']
    if not dt:
        return
    g['elapsed'] += dt
    for unit in g['units']:
        if unit['status'] not in ['enroute', 'returning']:
            continue
        unit['travel'] = min(unit['travel_total'], unit['travel'] + dt)
        locate(unit)
        if unit['travel'] < unit['travel_total']:
            continue
        unit['node'] = unit['destination']
        if unit.pop('finish_approach', False):
            base = next(b for b in g['bases'] if b['id'] == unit['base_id'])
            return_to_base(unit, base)
        elif unit['status'] == 'returning':
            unit.update(status='available', incident_id=None, route=[], route_times=[])
        else:
            unit['status'] = 'onscene'
            log(g, f"{unit['name']} no local da ocorrência.")
    for incident in list(g['incidents']):
        assigned = [u for u in g['units'] if u['incident_id'] == incident['id']]
        ready = all(sum(u['service'] == service and u['status'] == 'onscene' for u in assigned) >= count
                    for service, count in incident['needs'].items())
        if ready:
            incident['status'] = 'onscene'
            incident['progress'] = min(100, incident['progress'] + dt * (100 / (120 if any(u['advanced'] for u in assigned) else 180)))
        if incident['progress'] >= 100:
            g['money'] += incident['reward']
            g['earned'] += incident['reward']
            g['xp'] += incident['xp']
            g['completed'] += 1
            g['trust'] = min(100, g['trust'] + 1)
            resolve(g, incident, True)
        elif g['elapsed'] >= incident['deadline'] and not ready:
            g['failed'] += 1
            g['trust'] = max(0, g['trust'] - 6)
            resolve(g, incident, False)
    g['level'] = 1 + g['xp'] // 200
    if g['elapsed'] >= g['next_spawn']:
        if len(g['incidents']) < 7:
            spawn(g)
        g['next_spawn'] = g['elapsed'] + max(120, 200 - g['level'] * 5)


async def action(g, kind, data, router):
    if kind == 'dispatch':
        incident = next((i for i in g['incidents'] if i['id'] == data.get('incident_id')), None)
        require(incident is not None, 'Ocorrência já encerrada.')
        ids = data.get('unit_ids', [])
        require(isinstance(ids, list) and 0 < len(ids) <= len(g['units']) and all(isinstance(i, str) for i in ids), 'Seleciona pelo menos uma unidade válida.')
        units = [u for u in g['units'] if u['id'] in ids]
        require(len(units) == len(set(ids)) and all(u['status'] == 'available' for u in units), 'Uma unidade já não está disponível.')
        for service in set(u['service'] for u in units):
            allocated = sum(u['service'] == service and u['incident_id'] == incident['id'] for u in g['units'])
            require(allocated + sum(u['service'] == service for u in units) <= incident['needs'].get(service, 0), 'Envia apenas os meios necessários.')
        require(all(u['land'] == incident['land'] for u in units), 'Sem ligação rodoviária. Seleciona unidades na mesma ilha ou no continente.')
        plans = []
        destination = POINTS[incident['node']]
        # Fetch and validate ALL routes before any game mutation. Upstream failures leave units available.
        for unit in units:
            origin = POINTS[unit['node']]
            outward = await router.get(origin, destination)
            inward = await router.get(destination, POINTS[next(b for b in g['bases'] if b['id'] == unit['base_id'])['node']])
            plans.append((unit, outward, inward))
        for unit, outward, inward in plans:
            start_route(unit, outward, 'enroute', incident['node'])
            unit.update(incident_id=incident['id'], return_plan=inward)
            incident['assigned'].append(unit['id'])
        incident['status'] = 'enroute'
        incident['deadline'] = max(incident['deadline'], g['elapsed'] + max(p[1]['duration'] for p in plans) + 180)
        log(g, f"{len(units)} unidade(s) mobilizada(s) por estrada. Tempos estimados OSRM; sem trânsito em direto.")
    elif kind == 'build_base':
        service = data.get('service')
        site = next((s for s in SITES if s['id'] == data.get('site_id')), None)
        require(service in SERVICES and site is not None, 'Seleciona um serviço e um local válidos.')
        require(not any(b['node'] == site['node'] and b['service'] == service for b in g['bases']), 'Este serviço já tem uma base neste local.')
        price = SERVICES[service]['base_price']
        require(g['money'] >= price, 'Orçamento insuficiente.')
        g['money'] -= price
        g['bases'].append(make_base(service, site))
        log(g, f"Nova base construída em {site['name']}.", 'success')
    elif kind == 'new_incident':
        require(len(g['incidents']) < 7, 'Limite de 7 ocorrências ativas atingido.')
        spawn(g)
    else:
        common_action(g, kind, data)
        if kind == 'buy_vehicle':
            unit = g['units'][-1]
            base = next(b for b in g['bases'] if b['id'] == unit['base_id'])
            unit.update(lng=base['lng'], lat=base['lat'], land=base['land'])
    return g
