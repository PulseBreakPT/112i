import copy
import math
import random
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException
from economy import STARTING_CASH, FUNDING_INTERVAL, ensure_reserve, pay_cost, apply_periodic_funding, mission_payout
from world import NODES, SCENARIOS, SERVICES, SITES, district_name, route

def uid():
    return str(uuid.uuid4())

def log(g, text, kind='info'):
    g['logs'].insert(0, {'id': uid(), 'text': text, 'kind': kind, 'time': g['elapsed'], 'real_time': datetime.now(timezone.utc).isoformat()})
    g['logs'] = g['logs'][:50]

def spawn(g, scenario=None, node=None):
    index = random.randrange(len(SCENARIOS)) if scenario is None else scenario
    s = SCENARIOS[index]
    node = node or random.choice(list(NODES))
    n = NODES[node]
    streets = ['Rua da Liberdade', 'Avenida dos Descobrimentos', 'Rua de São João', 'Avenida da República', 'Rua das Flores', 'Estrada Nacional 112']
    district = district_name(n)
    incident = {k: copy.deepcopy(s[k]) for k in ['title', 'service', 'priority', 'needs', 'reward', 'xp', 'description']}
    incident.update({'id': uid(), 'number': g['sequence'], 'scenario': index, 'node': node, 'x': n['x'], 'y': n['y'], 'address': f'{streets[n["row"] % len(streets)]}, {n["col"] * 12 + 4}', 'district': district, 'status': 'waiting', 'created': g['elapsed'], 'deadline': g['elapsed'] + 420, 'assigned': [], 'progress': 0, 'call_answered': False, 'call': {'text': s['caller'], 'choices': s['choices']}})
    g['sequence'] += 1
    g['incidents'].append(incident)
    log(g, f'Nova ocorrência: {s["title"]}.', 'alert')

def new_game(game_id=None):
    g = {'id': game_id or uid(), 'money': STARTING_CASH, 'xp': 0, 'level': 1, 'trust': 98, 'elapsed': 0, 'speed': 1, 'completed': 0, 'failed': 0, 'earned': 0, 'expenses': 0, 'public_funding': 0, 'operating_debt': 0, 'next_public_funding': FUNDING_INTERVAL, 'next_spawn': 100, 'sequence': 101, 'incidents': [], 'units': [], 'bases': [], 'logs': [], 'history': [], 'saved_at': datetime.now(timezone.utc).isoformat()}
    for service, node, name in [('fire', '4-4', 'Quartel da Baixa'), ('medical', '9-3', 'Posto INEM · Santa Clara'), ('police', '4-7', 'Esquadra de São Vicente')]:
        base = {'id': uid(), 'service': service, 'node': node, 'name': name, 'x': NODES[node]['x'], 'y': NODES[node]['y']}
        g['bases'].append(base)
        for _ in range(2):
            add_unit(g, base)
    spawn(g, 0, '12-4')
    spawn(g, 1, '6-3')
    spawn(g, 2, '5-7')
    log(g, 'Central operacional. Início do turno da tarde.', 'success')
    ensure_reserve(g, log, 'reserva operacional protegida')
    return g

def add_unit(g, base, advanced=False):
    service = base['service']
    num = 1 + sum(u['service'] == service for u in g['units'])
    prefix = 'VMER' if advanced and service == 'medical' else SERVICES[service]['short'] + ('-E' if advanced else '')
    g['units'].append({'id': uid(), 'name': f'{prefix}-{num:02d}', 'service': service, 'base_id': base['id'], 'node': base['node'], 'x': base['x'], 'y': base['y'], 'status': 'available', 'incident_id': None, 'route': [], 'travel': 0, 'travel_total': 0, 'advanced': advanced})

def tick(g, seconds):
    dt = seconds * g['speed']
    if not dt:
        return
    g['elapsed'] += dt
    for u in g['units']:
        if u['status'] not in ['enroute', 'returning']:
            continue
        u['travel'] = min(u['travel_total'], u['travel'] + dt)
        fraction = u['travel'] / max(1, u['travel_total'])
        points = u['route']
        lengths = [math.dist(a, b) for a, b in zip(points, points[1:])]
        distance = sum(lengths) * fraction
        for i, length in enumerate(lengths):
            if distance <= length:
                t = distance / max(1, length)
                u['x'] = points[i][0] + (points[i + 1][0] - points[i][0]) * t
                u['y'] = points[i][1] + (points[i + 1][1] - points[i][1]) * t
                break
            distance -= length
        if fraction >= 1:
            u['x'], u['y'] = points[-1]
            u['node'] = u['destination']
            if u['status'] == 'returning':
                u.update(status='available', incident_id=None, route=[])
            else:
                u['status'] = 'onscene'
                log(g, f'{u["name"]} no local da ocorrência.')
    for inc in list(g['incidents']):
        assigned = [u for u in g['units'] if u['incident_id'] == inc['id']]
        ready = all(sum(u['service'] == service and u['status'] == 'onscene' for u in assigned) >= amount for service, amount in inc['needs'].items())
        if ready:
            inc['status'] = 'onscene'
            inc['progress'] = min(100, inc['progress'] + dt * (5 if any(u['advanced'] for u in assigned) else 3.4))
        if inc['progress'] >= 100:
            payout = mission_payout(g, inc, inc['reward'])
            inc['final_reward'] = payout
            g['money'] += payout
            g['earned'] += payout
            g['xp'] += inc['xp']
            g['completed'] += 1
            g['trust'] = min(100, g['trust'] + 1)
            resolve(g, inc, True)
        elif g['elapsed'] >= inc['deadline'] and inc['status'] == 'waiting':
            g['failed'] += 1
            g['trust'] = max(0, g['trust'] - 6)
            resolve(g, inc, False)
        elif g['elapsed'] >= inc['deadline'] + 180 and not ready:
            g['failed'] += 1
            g['trust'] = max(0, g['trust'] - 6)
            resolve(g, inc, False)
    g['level'] = 1 + g['xp'] // 200
    apply_periodic_funding(g, log)
    ensure_reserve(g, log, 'garantia mínima de continuidade operacional')
    if g['elapsed'] >= g['next_spawn']:
        if len(g['incidents']) < 7:
            spawn(g)
        g['next_spawn'] = g['elapsed'] + max(65, 110 - g['level'] * 5)

def resolve(g, inc, success):
    reward = inc.get('final_reward', inc['reward']) if success else 0
    log(g, f'{inc["title"]} — ' + (f'resolvida. +{reward} €' if success else 'prazo de resposta excedido.'), 'success' if success else 'alert')
    g['history'].insert(0, {'id': inc['id'], 'title': inc['title'], 'service': inc['service'], 'success': success, 'reward': reward, 'time': g['elapsed'], 'real_time': datetime.now(timezone.utc).isoformat()})
    g['history'] = g['history'][:100]
    for u in g['units']:
        if u['incident_id'] == inc['id']:
            base = next(b for b in g['bases'] if b['id'] == u['base_id'])
            points = route(u['node'], base['node'])
            points[0] = [u['x'], u['y']]
            u.update(status='returning', incident_id=None, route=points, destination=base['node'], travel=0, travel_total=max(6, sum(math.dist(a, b) for a, b in zip(points, points[1:])) / 38))
    g['incidents'].remove(inc)

def require(condition, message):
    if not condition:
        raise HTTPException(400, message)

def action(g, kind, data):
    if kind == 'speed':
        require(data.get('speed') in [0, 1, 2, 5], 'Velocidade inválida.')
        g['speed'] = data['speed']
    elif kind == 'dispatch':
        inc = next((i for i in g['incidents'] if i['id'] == data.get('incident_id')), None)
        require(inc is not None, 'Ocorrência já encerrada.')
        ids = data.get('unit_ids', [])
        require(isinstance(ids, list) and 0 < len(ids) <= len(g['units']), 'Selecione pelo menos uma unidade.')
        units = [u for u in g['units'] if u['id'] in ids]
        require(len(units) == len(set(ids)) and all(u['status'] == 'available' for u in units), 'Uma unidade já não está disponível.')
        for service in set(u['service'] for u in units):
            allocated = sum(u['service'] == service and u['incident_id'] == inc['id'] for u in g['units'])
            require(allocated + sum(u['service'] == service for u in units) <= inc['needs'].get(service, 0), 'Envie apenas os meios necessários.')
        for u in units:
            points = route(u['node'], inc['node'])
            duration = max(8, sum(math.dist(a, b) for a, b in zip(points, points[1:])) / (55 if u['advanced'] else 38))
            u.update(status='enroute', incident_id=inc['id'], route=points, travel=0, travel_total=duration, destination=inc['node'])
            inc['assigned'].append(u['id'])
        inc['status'] = 'enroute'
        log(g, f'{len(units)} unidade(s) mobilizada(s): {inc["title"]}.', 'info')
    elif kind == 'answer':
        inc = next((i for i in g['incidents'] if i['id'] == data.get('incident_id')), None)
        require(inc is not None and not inc['call_answered'], 'Chamada já encerrada.')
        choice = data.get('choice')
        require(type(choice) is int and 0 <= choice < 3, 'Escolha inválida.')
        correct = choice == SCENARIOS[inc['scenario']]['correct']
        inc['call_answered'] = True
        inc['call_result'] = {'correct': correct, 'feedback': SCENARIOS[inc['scenario']]['feedback'] if correct else 'Orientação insegura. A central corrigiu a indicação. Priorize a segurança do interlocutor.', 'xp': 25 if correct else 0}
        g['xp'] += 25 if correct else 0
        g['trust'] = min(100, max(0, g['trust'] + (1 if correct else -3)))
        g['level'] = 1 + g['xp'] // 200
        log(g, f'Chamada #{inc["number"]} triada.' + (' +25 XP' if correct else ' Orientação corrigida.'), 'success' if correct else 'alert')
    elif kind == 'buy_vehicle':
        base = next((b for b in g['bases'] if b['id'] == data.get('base_id')), None)
        require(base is not None, 'Base inválida.')
        advanced = data.get('advanced') is True
        require(not advanced or g['level'] >= 2, 'Unidades especializadas disponíveis no nível 2.')
        require(sum(u['base_id'] == base['id'] for u in g['units']) < 6, 'Garagem cheia. Construa outra base.')
        price = SERVICES[base['service']]['price'] * (2 if advanced else 1)
        pay_cost(g, price, 'aquisição de viatura', log)
        add_unit(g, base, advanced)
        log(g, f'Nova unidade adquirida: {base["name"]}.', 'success')
    elif kind == 'build_base':
        service = data.get('service')
        site = next((s for s in SITES if s['id'] == data.get('site_id')), None)
        require(service in SERVICES and site is not None, 'Selecione um serviço e um local válidos.')
        require(not any(b['node'] == site['node'] for b in g['bases']), 'Este terreno já está ocupado.')
        price = SERVICES[service]['base_price']
        n = NODES[site['node']]
        pay_cost(g, price, 'construção de base', log)
        g['bases'].append({'id': uid(), 'service': service, 'node': site['node'], 'name': f'{SERVICES[service]["name"]} · {site["name"]}', 'x': n['x'], 'y': n['y']})
        log(g, f'Nova base construída em {site["name"]}.', 'success')
    elif kind == 'new_incident':
        require(len(g['incidents']) < 7, 'Limite de 7 ocorrências ativas atingido.')
        spawn(g)
    elif kind != 'save':
        raise HTTPException(400, 'Ação desconhecida.')
    ensure_reserve(g, log, 'reserva operacional protegida')
    return g