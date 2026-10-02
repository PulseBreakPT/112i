STARTING_CASH = 40000
RESERVE_FLOOR = 5000
FUNDING_INTERVAL = 600


def reserve_floor(game):
    return max(RESERVE_FLOOR, 3500 + int(game.get('level', 1)) * 250)


def _add_support(game, amount, reason=None, log=None):
    value = max(0, int(round(amount or 0)))
    if not value:
        return 0
    game['money'] = int(game.get('money', 0)) + value
    game['public_funding'] = int(game.get('public_funding', 0)) + value
    game['last_public_funding_at'] = float(game.get('elapsed', 0))
    if log and reason:
        log(game, f'Financiamento público: +{value} € · {reason}.', 'success')
    return value


def ensure_reserve(game, log=None, reason='reserva operacional'):
    floor = reserve_floor(game)
    money = int(game.get('money', 0))
    if money >= floor:
        return 0
    return _add_support(game, floor - money, reason, log)


def pay_cost(game, amount, label='despesa operacional', log=None, protect_reserve=True):
    cost = max(0, int(round(amount or 0)))
    if not cost:
        return {'cost': 0, 'support': 0}
    support = 0
    if protect_reserve:
        floor = reserve_floor(game)
        projected = int(game.get('money', 0)) - cost
        if projected < floor:
            support = _add_support(game, floor - projected, f'cofinanciamento de {label}', log)
    game['money'] = max(0, int(game.get('money', 0)) - cost)
    game['expenses'] = int(game.get('expenses', 0)) + cost
    return {'cost': cost, 'support': support}


def public_funding_amount(game):
    bases = len(game.get('bases', []))
    facilities = len(game.get('facilities', []))
    trust = max(0, min(100, int(game.get('trust', 0))))
    factor = 0.8 + trust / 250
    return int(round((1800 + bases * 180 + facilities * 140) * factor))


def apply_periodic_funding(game, log=None):
    elapsed = float(game.get('elapsed', 0))
    next_funding = float(game.get('next_public_funding', FUNDING_INTERVAL))
    if elapsed < next_funding:
        return 0
    amount = public_funding_amount(game)
    _add_support(game, amount, 'dotação periódica da rede de emergência', log)
    debt = max(0, int(game.get('operating_debt', 0)))
    if debt:
        relief = min(debt, max(500, int(round(amount * 0.35))))
        game['operating_debt'] = debt - relief
        game['debt_relief'] = int(game.get('debt_relief', 0)) + relief
        if log:
            log(game, f'Regularização financeira: {relief} € de dívida operacional amortizada.', 'success')
    game['next_public_funding'] = elapsed + FUNDING_INTERVAL
    return amount


def mission_payout(game, incident, base_payout):
    base = max(0, int(round(base_payout or 0)))
    response_deadline = float(incident.get('response_deadline', incident.get('deadline', incident.get('created', 0))))
    response_at = float(incident.get('response_arrived_at', game.get('elapsed', response_deadline)))
    created = float(incident.get('created', 0))
    window = max(1.0, response_deadline - created)
    speed = max(0.0, min(1.0, (response_deadline - response_at) / window))
    triage = 0.08 if incident.get('call_result', {}).get('correct') else 0.0
    return int(round(base * (1.18 + speed * 0.14 + triage)))
