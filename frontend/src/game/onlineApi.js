const API_BASE=(process.env.REACT_APP_BACKEND_URL||'').replace(/\/$/,'')+'/api';
const SESSION_KEY='distrito112-online-session-v1';

const request=async(path,{method='GET',token,body}={})=>{
  const response=await fetch(`${API_BASE}${path}`,{
    method,
    headers:{
      ...(body?{'Content-Type':'application/json'}:{}),
      ...(token?{Authorization:`Bearer ${token}`}:{}),
    },
    body:body?JSON.stringify(body):undefined,
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    const detail=payload?.detail;
    const message=typeof detail==='string'?detail:detail?.message||`Pedido online recusado (${response.status}).`;
    const error=new Error(message);
    error.status=response.status;
    error.payload=payload;
    throw error;
  }
  return payload;
};

export const onlineSession={
  load:()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY))||null;}catch{return null;}},
  save:value=>{localStorage.setItem(SESSION_KEY,JSON.stringify(value));return value;},
  clear:()=>localStorage.removeItem(SESSION_KEY),
};

export const onlineApi={
  async createPlayer(callsign){
    const player=await request('/online/players',{method:'POST',body:{callsign}});
    return onlineSession.save(player);
  },
  async ensurePlayer(callsign){
    return onlineSession.load()||this.createPlayer(callsign);
  },
  async createRoom(name){
    const session=await this.ensurePlayer();
    return request('/online/rooms',{method:'POST',token:session.token,body:{name}});
  },
  async joinRoom(roomId){
    const session=await this.ensurePlayer();
    return request(`/online/rooms/${encodeURIComponent(roomId)}/join`,{method:'POST',token:session.token});
  },
  async getRoom(roomId){
    const session=await this.ensurePlayer();
    return request(`/online/rooms/${encodeURIComponent(roomId)}`,{token:session.token});
  },
  async act(roomId,revision,type,data={}){
    const session=await this.ensurePlayer();
    return request(`/online/rooms/${encodeURIComponent(roomId)}/action`,{
      method:'POST',token:session.token,body:{type,data,expected_revision:revision},
    });
  },
  async finish(roomId){
    const session=await this.ensurePlayer();
    return request(`/online/rooms/${encodeURIComponent(roomId)}/finish`,{method:'POST',token:session.token});
  },
  leaderboard:({limit=25,playerCount}={})=>{
    const params=new URLSearchParams({limit:String(limit)});
    if(playerCount)params.set('player_count',String(playerCount));
    return request(`/leaderboard?${params}`);
  },
};
