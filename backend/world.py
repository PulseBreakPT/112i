import math
import networkx as nx

def river_y(x):
    return 790 - x * .23 + 58 * math.sin(x / 185)

NODES = {}
GRAPH = nx.Graph()
for row in range(12):
    for col in range(17):
        x, y = 60 + col * 80, 55 + row * 80
        if abs(y - river_y(x)) > 48:
            key = f'{col}-{row}'
            NODES[key] = {'id': key, 'x': x, 'y': y, 'col': col, 'row': row}
            GRAPH.add_node(key)

for key, node in NODES.items():
    col, row = node['col'], node['row']
    right = f'{col + 1}-{row}'
    if right in NODES:
        GRAPH.add_edge(key, right, weight=80, major=row in [3, 6, 10])
    below = f'{col}-{row + 1}'
    if below in NODES:
        GRAPH.add_edge(key, below, weight=80, major=col in [4, 9, 14])
    elif col in [4, 9, 14]:
        for step in [2, 3]:
            target = f'{col}-{row + step}'
            if target in NODES:
                GRAPH.add_edge(key, target, weight=80 * step, major=True, bridge=True)
                break

def route(start, end):
    path = nx.shortest_path(GRAPH, start, end, weight='weight')
    return [[NODES[k]['x'], NODES[k]['y']] for k in path]

def world_data():
    return {'width': 1400, 'height': 1000, 'nodes': list(NODES.values()),
            'roads': [{'a': NODES[a], 'b': NODES[b], **d} for a, b, d in GRAPH.edges(data=True)]}

SERVICES = {
    'fire': {'name': 'Bombeiros', 'vehicle': 'Veículo de combate a incêndios', 'short': 'VFCI', 'price': 5000, 'base_price': 10000},
    'medical': {'name': 'Emergência médica', 'vehicle': 'Ambulância de socorro', 'short': 'ABSC', 'price': 4000, 'base_price': 8000},
    'police': {'name': 'Polícia', 'vehicle': 'Carro-patrulha', 'short': 'PSP', 'price': 3000, 'base_price': 8000},
}
SITES = [
    {'id': 'north', 'name': 'Monte Belo', 'node': '5-1'},
    {'id': 'east', 'name': 'Parque Industrial', 'node': '14-3'},
    {'id': 'south', 'name': 'Margem Sul', 'node': '9-10'},
    {'id': 'west', 'name': 'São Vicente', 'node': '1-5'},
    {'id': 'port', 'name': 'Porto Comercial', 'node': '14-10'},
]

SCENARIOS = [
    {'title': 'Incêndio num armazém', 'service': 'fire', 'priority': 1, 'needs': {'fire': 1, 'medical': 1}, 'reward': 2400, 'xp': 100, 'description': 'Fumo intenso num armazém. Um funcionário poderá estar no interior. Risco de propagação aos edifícios adjacentes.', 'caller': 'Estou à porta do armazém. Há imenso fumo e o meu colega ainda não saiu! Devo entrar para o procurar?', 'choices': ['Afaste-se do edifício e aguarde as equipas no exterior.', 'Entre e procure o seu colega.', 'Abra todas as portas do armazém.'], 'correct': 0, 'feedback': 'O civil afastou-se para um local seguro. A equipa recebeu a indicação de uma possível vítima.'},
    {'title': 'Pessoa inconsciente', 'service': 'medical', 'priority': 1, 'needs': {'medical': 1}, 'reward': 1500, 'xp': 80, 'description': 'Uma pessoa perdeu os sentidos na via pública. É necessária uma equipa de emergência médica.', 'caller': 'O meu pai caiu no passeio e não me responde. Estou muito assustado. Já vos dei a morada. O que faço?', 'choices': ['Dê-lhe um copo de água.', 'Mantenha a calma. Diga-me se ele respira normalmente.', 'Deixe-o sozinho e procure ajuda.'], 'correct': 1, 'feedback': 'O interlocutor manteve a calma e confirmou a respiração. Informação transmitida à equipa médica.'},
    {'title': 'Assalto a estabelecimento', 'service': 'police', 'priority': 2, 'needs': {'police': 1}, 'reward': 1200, 'xp': 60, 'description': 'Alarme acionado numa loja. O suspeito foi visto junto à entrada. O comerciante encontra-se em segurança.', 'caller': 'Acabaram de assaltar a minha loja! Estou nas traseiras e acho que o homem ainda está cá. Posso ir atrás dele?', 'choices': ['Persiga o suspeito e tente detê-lo.', 'Saia do esconderijo para tirar uma fotografia.', 'Fique num local seguro e descreva o suspeito.'], 'correct': 2, 'feedback': 'Descrição do suspeito recebida. O comerciante permaneceu em segurança.'},
    {'title': 'Colisão rodoviária', 'service': 'fire', 'priority': 1, 'needs': {'fire': 1, 'medical': 1, 'police': 1}, 'reward': 3800, 'xp': 130, 'description': 'Dois veículos envolvidos numa colisão. Uma vítima encarcerada. É necessário cortar o trânsito e prestar socorro.', 'caller': 'Houve um acidente no cruzamento. Um dos condutores não consegue sair do carro. Há combustível no chão.', 'choices': ['Afaste-se do combustível e não mova os feridos.', 'Puxe o condutor para fora imediatamente.', 'Aproxime-se para verificar a fuga de combustível.'], 'correct': 0, 'feedback': 'Zona sinalizada à distância. A informação sobre a fuga de combustível foi transmitida aos bombeiros.'},
    {'title': 'Incêndio em vegetação', 'service': 'fire', 'priority': 2, 'needs': {'fire': 1}, 'reward': 1700, 'xp': 70, 'description': 'Foco de incêndio junto a uma zona arborizada. Vento moderado. Não há vítimas identificadas.', 'caller': 'Vejo chamas atrás do parque. O vento está a levar o fogo para as casas!', 'choices': ['Tente apagar o incêndio sozinho.', 'Afaste-se das chamas e indique um acesso seguro.', 'Espere para ver se o fogo se apaga.'], 'correct': 1, 'feedback': 'Acesso seguro identificado. Equipa de combate informada da direção do vento.'},
    {'title': 'Distúrbios na praça', 'service': 'police', 'priority': 3, 'needs': {'police': 1}, 'reward': 900, 'xp': 50, 'description': 'Confronto entre dois grupos na praça. Pedida presença policial preventiva.', 'caller': 'Estão várias pessoas a discutir à frente do café. Parece que vão começar à pancada.', 'choices': ['Intervenha para separar os grupos.', 'Afaste-se e aguarde a patrulha num local seguro.', 'Aproxime-se e filme a discussão.'], 'correct': 1, 'feedback': 'O interlocutor afastou-se. A patrulha recebeu a localização dos grupos.'},
    {'title': 'Queda na via pública', 'service': 'medical', 'priority': 2, 'needs': {'medical': 1}, 'reward': 1100, 'xp': 60, 'description': 'Pessoa idosa com lesão na perna após uma queda. Consciente e acompanhada por um vizinho.', 'caller': 'A minha vizinha caiu nas escadas e tem muitas dores na perna. Está consciente. Devo levantá-la?', 'choices': ['Ajude-a a caminhar até à ambulância.', 'Não a mova. Mantenha-a confortável e aguarde o socorro.', 'Deixe-a descansar sozinha.'], 'correct': 1, 'feedback': 'A vítima ficou acompanhada e não foi mobilizada. Ambulância informada.'},
]