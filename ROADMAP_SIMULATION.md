# Distrito 112 — Programa integral de simulação

Este documento transforma a auditoria de lógica num plano executável. Cada fase deve preservar os saves existentes, incluir testes do motor e terminar numa versão jogável.

## Princípios

- O motor ativo é `frontend/src/game/localGame.js`; toda a lógica jogável deve existir aí ou em módulos importados por ele.
- Sistemas geográficos são locais a uma área operacional. Uma capacidade no Porto não desbloqueia missões em Faro.
- Conteúdo e comportamento são separados. Uma nova ocorrência deve declarar requisitos, evolução, consequências e operações próprias.
- Os estados continuam serializáveis em `localStorage`, com migração automática de versões anteriores.
- O modo individual permanece a base. Funcionalidades cooperativas entram apenas depois de existir persistência remota e autoridade de servidor.

## Fase 1 — Comando territorial

- Centros de Comando configuráveis, com nome, sede, raio e estado.
- Bases e instalações atribuídas a uma área.
- Extensões, viaturas, especializações, POIs e limite de ocorrências calculados localmente.
- Ocorrências marcadas com a área que as gerou.
- Migração automática de saves antigos para o Centro de Comando do Porto.
- Rota de gestão própria para consultar cobertura e redistribuir infraestrutura.

## Fase 2 — Geografia operacional

- Geração a partir de uma base elegível e dentro do raio configurado.
- POIs criados, editados e removidos pelo jogador.
- Tipos de POI associados a famílias de ocorrência.
- Diagnóstico de cobertura: bases sem centro, zonas sem meios e POIs fora de alcance.

## Fase 3 — Pessoas e qualificações

- Registo individual de pessoal com base, estado, formações e viatura atribuída.
- Recrutamento progressivo e capacidade real das instalações.
- Formação aplicada a pessoas concretas.
- Tripulação e qualificações validadas no despacho, não apenas na compra.
- Ritmo de resolução dependente de pessoal, formação, comando e veículos especializados.

## Fase 4 — Ocorrências vivas

- Definições individuais em vez de apenas variações por escalão.
- Follow-up durante a ocorrência, subsequent após conclusão e expansion no mesmo incidente.
- Consequências persistentes: vítimas, detidos, indisponibilidade rodoviária e perda de confiança.
- Cadeias iniciais: fuga de gás → explosão; incêndio doméstico → edifício; acidente → incêndio; desaparecimento → busca alargada; distúrbio → motim.

## Fase 5 — Transporte e instalações

- Rotas reais unidade → origem → hospital/prisão → base.
- Pedidos de transporte e transferências inter-hospitalares.
- Especialidades: urgência, trauma, queimados, pediatria, cardiologia, neurologia, obstetrícia e cuidados intensivos.
- Bónus por destino adequado e penalização por sobrelotação.
- Custódia com células, prioridades e automatização tardia.

## Fase 6 — Mobilidade avançada

- Patrulhas OSRM com waypoints, duração e posição contínua.
- RAR com tipos e quantidades concretas de veículos.
- Grupos de unidades específicas separados dos RAR.
- Nova rota OSRM para cada regresso; nunca inverter coordenadas da ida.

## Fase 7 — Preparação operacional

- Missões planeadas com hora, previsão de meios e janela de preparação.
- Zonas de concentração temporárias e redistribuição de meios.
- Complexos que agrupam bases e instalações no mesmo polo.

## Fase 8 — Progressão e controlo

- Tarefas diárias, conquistas, eventos e recompensas de nível.
- Expansões e construções com duração real.
- Transferência, reserva, desativação, turnos, atraso de saída, tripulação máxima e exclusão dos RAR por viatura.
- Economia e manutenção balanceadas por área.

## Fase 9 — Cooperação online

- Persistência com autoridade de servidor.
- Alianças, missões partilhadas, edifícios coletivos e eventos cooperativos.
- Registos anti-abuso, idempotência e reconciliação de estado.

## Critérios de conclusão

Uma fase só fica concluída quando o estado é migrável, a interface é utilizável em telemóvel, o motor tem testes e a build de produção termina sem novos avisos.
