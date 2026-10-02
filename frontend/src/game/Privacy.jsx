import { ShieldCheck, HardDrive, Map, EyeOff, ExternalLink } from 'lucide-react';

export default function Privacy() {
  return <main className="management-page settings-page privacy-page">
    <div className="page-heading"><div>
      <span className="page-eyebrow">PRIVACIDADE E DADOS</span>
      <h1 data-testid="privacy-title">Política de Privacidade</h1>
      <p>Última atualização: 2 de outubro de 2026.</p>
    </div></div>

    <section className="settings-section">
      <h2>Resumo</h2>
      <div className="setting-row"><EyeOff /><div>
        <h3>Sem analytics nem gravação de sessões</h3>
        <p>O Distrito 112 não utiliza PostHog, Google Analytics, publicidade comportamental, gravação de sessões ou perfis de marketing.</p>
      </div></div>
      <div className="setting-row"><HardDrive /><div>
        <h3>Modo local e modo online</h3>
        <p>No modo local, a carreira e as preferências são guardadas no navegador. Quando utilizares funcionalidades online, como partidas multijogador ou classificações, são enviados apenas os dados necessários para identificar a sessão e sincronizar a partida.</p>
      </div></div>
    </section>

    <section className="settings-section">
      <h2>Dados do modo online</h2>
      <div className="setting-row"><ShieldCheck /><div>
        <h3>Multijogador e classificações</h3>
        <p>Quando o modo online estiver ativo, o serviço pode tratar um nome de jogador escolhido por ti, um identificador pseudónimo de jogador, identificadores de partida, pontuações, posição nas classificações, estado e eventos necessários para sincronizar a partida, bem como data e hora.</p>
        <p>O nome de jogador, a pontuação, a posição e informação básica da partida podem ficar visíveis a outros jogadores. Não uses o teu nome real se não o quiseres tornar público.</p>
      </div></div>
    </section>

    <section className="settings-section">
      <h2>Dados e serviços externos</h2>
      <div className="setting-row"><Map /><div>
        <h3>Mapa e cálculo de rotas</h3>
        <p>O jogo carrega cartografia através do OpenFreeMap/OpenStreetMap e calcula percursos através do serviço público OSRM. Os pedidos de rotas contêm apenas coordenadas dos locais usados pela simulação, não a localização real do jogador.</p>
        <p>Como acontece em qualquer pedido web, estes fornecedores, o alojamento e o servidor do modo online podem receber metadados técnicos normais, como endereço IP, data/hora, navegador e informação necessária para segurança, prevenção de abuso e entrega do serviço.</p>
      </div></div>
      <div className="setting-row"><ShieldCheck /><div>
        <h3>O que não pedimos</h3>
        <p>Não pedimos nome real, número de telefone, contactos, fotografias, microfone, câmara ou localização precisa para jogar. Não vendemos dados pessoais e não usamos dados do multiplayer para publicidade comportamental.</p>
      </div></div>
    </section>

    <section className="settings-section">
      <h2>Controlo e retenção dos teus dados</h2>
      <p>Podes reiniciar a carreira nas Definições e apagar os dados locais através das definições do navegador. O relatório de turno é criado localmente quando escolhes exportá-lo.</p>
      <p>Os dados das partidas online e classificações podem permanecer no servidor enquanto forem necessários para manter o histórico, a integridade competitiva e a segurança do serviço. Antes do lançamento público do multiplayer, o jogo deverá disponibilizar um mecanismo para pedir a eliminação dos dados associados ao teu identificador de jogador.</p>
      <p>O site é alojado através do GitHub Pages. O carregamento do mapa, das fontes e das rotas pode implicar ligações diretas do teu navegador aos respetivos fornecedores.</p>
    </section>

    <section className="settings-section">
      <h2>Responsável e contacto</h2>
      <p>Distrito 112 é um projeto independente publicado por PulseBreakPT. Para questões sobre privacidade ou esta política, utiliza o repositório público do projeto no GitHub.</p>
      <p><a href="https://github.com/PulseBreakPT/112i" target="_blank" rel="noreferrer">github.com/PulseBreakPT/112i <ExternalLink size={14} /></a></p>
    </section>

    <div className="settings-note"><ShieldCheck size={19} /><p>Esta política descreve o funcionamento atual do jogo. Se forem adicionadas contas, analytics, publicidade ou nova recolha de dados, a política deverá ser atualizada antes da respetiva ativação.</p></div>
  </main>;
}
