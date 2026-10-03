import { useMemo, useState } from 'react';
import { Building2, CarFront, Settings2, Clock3, Plus, Wallet, RadioTower, ShieldCheck, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { money, duration } from './common';
import {
  LOGISTICS_STOCKS,
  LOGISTICS_SUPPLIERS,
  logisticsCapacity,
  baseStockPercent,
  inboundStock,
  logisticsPackPrice,
} from './logisticsEngine';
import { reserveFloor } from './engines/economyEngine';
import './Logistics.css';

const quantity = (value,unit) => new Intl.NumberFormat('pt-PT',{maximumFractionDigits:1}).format(Math.max(0,Number(value)||0))+' '+unit;
const pctTone = value => value<15?'critical':value<30?'warning':value<60?'watch':'healthy';
const orderLabel = status => status==='transit'?'Em trânsito':status==='delivered'?'Entregue':status==='cancelled'?'Cancelada':'Pendente';

export default function Logistics({ game, act, busy }) {
  const [view,setView]=useState('shop');
  const [baseId,setBaseId]=useState(game.bases?.[0]?.id||'');
  const [supplierId,setSupplierId]=useState('regional');
  const [group,setGroup]=useState('Todos');
  const [packs,setPacks]=useState({});
  const [query,setQuery]=useState('');

  const base=game.bases.find(item=>item.id===baseId)||game.bases[0];
  const groups=['Todos',...new Set(LOGISTICS_STOCKS.map(item=>item.group))];
  const visible=useMemo(()=>LOGISTICS_STOCKS.filter(item=>{
    const matchesGroup=group==='Todos'||item.group===group;
    const q=query.trim().toLowerCase();
    return matchesGroup&&(!q||item.name.toLowerCase().includes(q)||item.description.toLowerCase().includes(q));
  }),[group,query]);

  const activeOrders=(game.supply_orders||[]).filter(order=>['pending','transit'].includes(order.status));
  const criticalCount=game.bases.reduce((sum,item)=>sum+LOGISTICS_STOCKS.filter(stock=>baseStockPercent(item,stock.id)<15).length,0);
  const inventoryValue=game.bases.reduce((total,item)=>total+LOGISTICS_STOCKS.reduce((sum,stock)=>sum+(item.logistics?.stock?.[stock.id]||0)*stock.unit_price,0),0);
  const run=async(kind,data,message)=>{const next=await act(kind,data);if(next&&message)toast.success(message);return next;};

  const order=async stock=>{
    if(!base)return;
    const amount=Math.max(1,Math.floor(Number(packs[stock.id])||1));
    const quote=logisticsPackPrice(stock.id,supplierId,amount,base.land);
    const ok=await run('place_supply_order',{base_id:base.id,stock_id:stock.id,packs:amount,supplier_id:supplierId},`Encomenda de ${stock.name} emitida.`);
    if(ok)setPacks(current=>({...current,[stock.id]:1}));
    return quote;
  };

  return <main className="management-page logistics-page">
    <div className="page-heading">
      <div><span className="page-eyebrow">CADEIA DE ABASTECIMENTO</span><h1>Logística</h1><p>Compra, armazena e repõe os 18 consumíveis operacionais da rede.</p></div>
      <div className="logistics-heading-budget"><Wallet size={18}/><span>Disponível</span><strong>{money(game.money)}</strong><small>Reserva protegida {money(reserveFloor(game))}</small></div>
    </div>

    <section className="logistics-kpis">
      <article><Building2/><div><span>Armazéns</span><strong>{game.bases.length}</strong><small>bases com stock próprio</small></div></article>
      <article data-tone={criticalCount?'warning':'positive'}><ShieldCheck/><div><span>Ruturas críticas</span><strong>{criticalCount}</strong><small>{criticalCount?'requer atenção':'rede abastecida'}</small></div></article>
      <article><Clock3/><div><span>Em trânsito</span><strong>{activeOrders.length}</strong><small>encomendas abertas</small></div></article>
      <article><Wallet/><div><span>Valor em stock</span><strong>{money(inventoryValue)}</strong><small>estimativa a preço de referência</small></div></article>
    </section>

    <div className="logistics-tabs" role="tablist" aria-label="Áreas da logística">
      {[['shop','Loja'],['inventory','Inventário'],['orders','Encomendas'],['automation','Reposição automática']].map(([id,label])=><button key={id} role="tab" aria-selected={view===id} className={view===id?'active':''} onClick={()=>setView(id)}>{label}</button>)}
    </div>

    <section className="logistics-controlbar">
      <label><span>Base / armazém</span><select value={base?.id||''} onChange={event=>setBaseId(event.target.value)}>{game.bases.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="logistics-base-status">
        <RadioTower size={17}/><div><strong>{base?.name||'Sem base'}</strong><small>{base?.city} · {base?.service==='fire'?'Bombeiros':base?.service==='medical'?'INEM':'PSP'}</small></div>
      </div>
    </section>

    {view==='shop'&&<>
      <section className="supplier-strip">
        <div className="supplier-heading"><CarFront size={18}/><div><strong>Fornecedor</strong><small>Preço, prazo e transporte variam por fornecedor e região.</small></div></div>
        <div className="supplier-options">{LOGISTICS_SUPPLIERS.map(supplier=><button key={supplier.id} className={supplierId===supplier.id?'active':''} onClick={()=>setSupplierId(supplier.id)}><strong>{supplier.name}</strong><small>{supplier.price_factor<1?'−'+Math.round((1-supplier.price_factor)*100)+'%':supplier.price_factor>1?'+'+Math.round((supplier.price_factor-1)*100)+'%':'Preço normal'} · ~{Math.round(supplier.lead_seconds/60)} min base</small><span>{supplier.description}</span></button>)}</div>
      </section>

      <div className="catalog-tools">
        <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Pesquisar consumível…" aria-label="Pesquisar consumível"/>
        <div className="catalog-groups">{groups.map(item=><button key={item} className={group===item?'active':''} onClick={()=>setGroup(item)}>{item}</button>)}</div>
      </div>

      <div className="logistics-catalog">
        {visible.map(stock=>{
          const current=base?.logistics?.stock?.[stock.id]||0,capacity=base?logisticsCapacity(base,stock.id):0,pct=base?baseStockPercent(base,stock.id):0,inbound=base?inboundStock(game,base.id,stock.id):0;
          const amount=Math.max(1,Math.floor(Number(packs[stock.id])||1));
          const quote=base?logisticsPackPrice(stock.id,supplierId,amount,base.land):null;
          const fits=quote&&current+inbound+quote.quantity<=capacity+stock.pack*.01;
          const affordable=quote&&(game.money||0)-quote.total>=reserveFloor(game);
          return <article className="stock-card" key={stock.id} data-tone={pctTone(pct)}>
            <header><div><span>{stock.group}</span><h2>{stock.name}</h2></div>{stock.critical&&<b>CRÍTICO</b>}</header>
            <p>{stock.description}</p>
            <div className="stock-meter"><i style={{width:`${Math.min(100,pct)}%`}}/><span>{Math.round(pct)}%</span></div>
            <div className="stock-numbers"><div><small>Em armazém</small><strong>{quantity(current,stock.unit)}</strong></div><div><small>Capacidade</small><strong>{quantity(capacity,stock.unit)}</strong></div><div><small>A caminho</small><strong>{quantity(inbound,stock.unit)}</strong></div></div>
            <div className="stock-price"><span>Pack · {quantity(stock.pack,stock.unit)}</span><strong>{money(logisticsPackPrice(stock.id,supplierId,1,base?.land).total)}</strong></div>
            <div className="stock-order-row">
              <label><span>Packs</span><input type="number" min="1" max="999" value={amount} onChange={event=>setPacks(current=>({...current,[stock.id]:event.target.value}))}/></label>
              <div><small>Total</small><strong>{money(quote?.total||0)}</strong></div>
              <Button data-action-tone={fits&&affordable?'positive':'supported'} disabled={busy||!fits||!affordable} onClick={()=>order(stock)}><Plus size={14}/>{!fits?'Sem capacidade':!affordable?'Reserva protegida':'Encomendar'}</Button>
            </div>
            {quote&&<footer><span>Mercadoria {money(quote.subtotal)}</span><span>Transporte {money(quote.transport)}</span>{quote.bulk_discount>0&&<span>Desconto volume {Math.round(quote.bulk_discount*100)}%</span>}</footer>}
          </article>;
        })}
      </div>
    </>}

    {view==='inventory'&&<section className="logistics-panel">
      <header><div><h2>Inventário de {base?.name}</h2><p>Estado físico do armazém, capacidade e encomendas em trânsito.</p></div></header>
      <div className="inventory-table">
        <div className="inventory-head"><span>Stock</span><span>Atual</span><span>Em trânsito</span><span>Capacidade</span><span>Nível</span></div>
        {LOGISTICS_STOCKS.map(stock=>{const current=base?.logistics?.stock?.[stock.id]||0,cap=base?logisticsCapacity(base,stock.id):0,pct=base?baseStockPercent(base,stock.id):0,inbound=base?inboundStock(game,base.id,stock.id):0;return <div className="inventory-row" key={stock.id} data-tone={pctTone(pct)}><div><strong>{stock.name}</strong><small>{stock.group}{stock.critical?' · crítico':''}</small></div><span>{quantity(current,stock.unit)}</span><span>{quantity(inbound,stock.unit)}</span><span>{quantity(cap,stock.unit)}</span><div className="inventory-level"><i style={{width:`${Math.min(100,pct)}%`}}/><b>{Math.round(pct)}%</b></div></div>})}
      </div>
    </section>}

    {view==='orders'&&<section className="logistics-panel">
      <header><div><h2>Encomendas e entregas</h2><p>Histórico de compras, trânsito e receção por armazém.</p></div></header>
      <div className="order-list">
        {(game.supply_orders||[]).map(order=>{const stock=LOGISTICS_STOCKS.find(item=>item.id===order.stock_id),supplier=LOGISTICS_SUPPLIERS.find(item=>item.id===order.supplier_id),destination=game.bases.find(item=>item.id===order.base_id),remaining=Math.max(0,(order.arrives_at||game.elapsed)-game.elapsed),canCancel=order.status==='transit'&&game.elapsed-order.created_at<=30;return <article key={order.id} data-status={order.status}><div className="order-status"><span>{orderLabel(order.status)}</span><strong>{stock?.name||order.stock_id}</strong><small>{destination?.name||'Base removida'}</small></div><div><small>Quantidade</small><strong>{quantity(order.quantity,order.unit)}</strong><span>{order.packs} pack(s)</span></div><div><small>Fornecedor</small><strong>{supplier?.name||order.supplier_id}</strong><span>{order.auto?'Reposição automática':'Compra manual'}</span></div><div><small>Custo</small><strong>{money(order.total||0)}</strong><span>{order.status==='transit'?`ETA ${duration(remaining)}`:order.status==='delivered'?'Recebida':'—'}</span></div>{canCancel&&<Button data-action-tone="supported" disabled={busy} onClick={()=>run('cancel_supply_order',{order_id:order.id},'Encomenda cancelada.')}>Cancelar</Button>}</article>})}
        {!(game.supply_orders||[]).length&&<div className="operations-empty compact"><Clock3 size={23}/><p>Ainda não existem encomendas.</p></div>}
      </div>
    </section>}

    {view==='automation'&&<section className="logistics-panel">
      <header><div><h2>Reposição automática</h2><p>Define o stock mínimo, objetivo e fornecedor preferencial para cada consumível.</p></div></header>
      <div className="automation-master">
        <label><input type="checkbox" checked={base?.logistics?.auto_reorder!==false} onChange={event=>run('update_supply_policy',{base_id:base.id,auto_reorder:event.target.checked})}/><span><strong>Reposição automática desta base</strong><small>Encomenda apenas quando o stock efetivo cai abaixo do mínimo.</small></span></label>
        <label><input type="checkbox" checked={base?.logistics?.auto_express_critical!==false} onChange={event=>run('update_supply_policy',{base_id:base.id,auto_express_critical:event.target.checked})}/><span><strong>Expresso em rutura crítica</strong><small>Abaixo de 12%, stocks automáticos usam fornecimento de emergência.</small></span></label>
      </div>
      <div className="automation-table">
        <div className="automation-head"><span>Ativo</span><span>Stock</span><span>Mínimo</span><span>Objetivo</span><span>Fornecedor</span><span>Estado</span></div>
        {LOGISTICS_STOCKS.map(stock=>{const policy=base?.logistics?.policy?.[stock.id]||{},pct=base?baseStockPercent(base,stock.id):0;return <div className="automation-row" key={stock.id} data-tone={pctTone(pct)}>
          <label className="switch"><input type="checkbox" checked={!!policy.enabled} onChange={event=>run('update_supply_policy',{base_id:base.id,stock_id:stock.id,enabled:event.target.checked})}/><span/></label>
          <div><strong>{stock.name}</strong><small>{stock.group}</small></div>
          <label><input type="number" min="0" max="90" value={policy.min_percent??20} onChange={event=>run('update_supply_policy',{base_id:base.id,stock_id:stock.id,min_percent:Number(event.target.value)})}/><span>%</span></label>
          <label><input type="number" min={policy.min_percent??20} max="100" value={policy.target_percent??70} onChange={event=>run('update_supply_policy',{base_id:base.id,stock_id:stock.id,target_percent:Number(event.target.value)})}/><span>%</span></label>
          <select value={policy.supplier_id||'framework'} onChange={event=>run('update_supply_policy',{base_id:base.id,stock_id:stock.id,supplier_id:event.target.value})}>{LOGISTICS_SUPPLIERS.map(supplier=><option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
          <div className="auto-status"><b>{Math.round(pct)}%</b><span>{inboundStock(game,base.id,stock.id)>0?'Encomenda a caminho':pct<(policy.min_percent??20)?'Abaixo do mínimo':'Dentro da política'}</span></div>
        </div>})}
      </div>
      <div className="automation-note"><Info size={17}/><p>A reposição automática respeita a capacidade do armazém, mercadoria já em trânsito e a reserva operacional protegida. Não compra stock se a encomenda deixar o orçamento abaixo da reserva.</p></div>
    </section>}
  </main>;
}
