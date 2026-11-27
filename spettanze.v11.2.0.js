/* Kairos: regole di conteggio personali, non determinazione di diritti normativi. */
(function(root){'use strict';
const categories=Object.freeze([
 {id:'kairos_lo',name:'Licenza ordinaria',code:'LO',unit:'gg',color:'#b7dfc0'},
 {id:'kairos_rc',name:'Recupero compensativo',code:'RC',unit:'h',color:'#a8d5f2'},
 {id:'kairos_sm',name:'Straordinaria/Malattia',code:'SM',unit:'gg',color:'#f1c0c9'},
 {id:'kairos_104',name:'Lic 104',code:'104',unit:'gg',color:'#dcd6ff'},
 {id:'kairos_937',name:'Licenza 937',code:'937',unit:'gg',color:'#ffe1a8'},
 {id:'kairos_lo_ap',name:'Licenza AP',code:'LO AP',unit:'gg',color:'#8ecbad'},
 {id:'kairos_rc_ap',name:'Recupero compensativo AP',code:'RC AP',unit:'h',color:'#80b9e2'},
 {id:'kairos_rf',name:'Recuperi festività',code:'RF',unit:'gg',color:'#f0b8e8'}
]);
const key=d=>d.toISOString().slice(0,10);
function date(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const d=new Date(s+'T12:00:00Z');return Number.isFinite(+d)&&key(d)===s?d:null}
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mth=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;return new Date(Date.UTC(y,mth-1,day,12));}
function holidaySet(y,custom=[]){const fixed=['01-01','01-06','04-25','05-01','06-02','08-15','11-01','12-08','12-25','12-26'];if(y>=2026)fixed.push('10-04');const s=new Set(fixed.map(x=>`${y}-${x}`));const e=easter(y);s.add(key(e));e.setUTCDate(e.getUTCDate()+1);s.add(key(e));for(const k of custom)if(k.startsWith(`${y}-`)&&date(k))s.add(k);return s}
const blank=()=>({balances:{},holidays:[],custom:[],adjustments:[]});
function allCategories(p){return [...categories,...(p?.custom||[])];}
function customValid(c){return c&&typeof c.id==='string'&&/^kairos_custom_[a-z0-9-]{1,50}$/.test(c.id)&&typeof c.name==='string'&&c.name.trim()&&c.name.length<=80&&typeof c.code==='string'&&c.code.trim()&&c.code.length<=8&&['h','gg'].includes(c.unit)&&/^#[0-9a-f]{6}$/i.test(c.color);}

function validate(p){if(p==null)return blank();if(!p||typeof p!=='object'||Array.isArray(p)||!p.balances||typeof p.balances!=='object'||Array.isArray(p.balances)||!Array.isArray(p.holidays)||p.holidays.length>2000||Object.keys(p.balances).length>200)throw Error('Spettanze non valide');const custom=p.custom??[];if(!Array.isArray(custom)||custom.length>40||custom.some(c=>!customValid(c))||new Set(custom.map(c=>c.id)).size!==custom.length)throw Error('Spettanze personalizzate non valide');const cats=allCategories(p);for(const [y,vals] of Object.entries(p.balances)){if(!/^\d{4}$/.test(y)||+y<1900||+y>2200||!vals||typeof vals!=='object'||Array.isArray(vals))throw Error('Anno non valido');for(const [id,v] of Object.entries(vals)){if(!cats.some(c=>c.id===id)||typeof v!=='number'||!Number.isFinite(v)||v<0||v>100000||Math.abs(v*(cats.find(c=>c.id===id)?.unit==='h'?60:1)-Math.round(v*(cats.find(c=>c.id===id)?.unit==='h'?60:1)))>1e-8)throw Error('Saldo non valido');}}if(p.holidays.some(k=>!date(k))||new Set(p.holidays).size!==p.holidays.length)throw Error('Festività non valide');const moves=p.adjustments??[];if(!Array.isArray(moves)||moves.length>5000||new Set(moves.map(m=>m?.id)).size!==moves.length)throw Error('Rettifiche non valide');for(const m of moves){const cat=cats.find(c=>c.id===m?.category);const factor=cat?.unit==='h'?60:1;if(!cat||typeof m.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(m.id)||!date(m.date)||+m.date.slice(0,4)<1900||+m.date.slice(0,4)>2200||typeof m.amount!=='number'||!Number.isFinite(m.amount)||m.amount===0||Math.abs(m.amount)>100000||Math.abs(m.amount*factor-Math.round(m.amount*factor))>1e-8||typeof m.reason!=='string'||!m.reason.trim()||m.reason.length>300)throw Error('Rettifica non valida');}if(p.guardFrom!=null&&(!date(p.guardFrom)||p.guardFrom<'1900-01-01'||p.guardFrom>'2200-12-31'))throw Error('Decorrenza guardie non valida');return p}
function norm(s){return String(s||'').normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
const aliases={kairos_lo:['licenzaordinaria','lo'],kairos_rc:['recuperocompensativo','rc'],kairos_sm:['straordinariamalattia','licenzastraordinaria','straordinaria','malattia'],kairos_104:['lic104','licenza104','legge104'],kairos_937:['licenza937','lic937'],kairos_lo_ap:['licenzaap','loap','licenzaordinariaap'],kairos_rc_ap:['recuperocompensativoap','rcap'],kairos_rf:['recuperifestivita','recuperofestivita','rf']};
function category(s,p){if(!s)return null;const exact=allCategories(p).find(c=>c.id===s.id);if(exact)return exact.id;if(s.work!==false)return null;const n=norm(s.name);return categories.find(c=>aliases[c.id].includes(n))?.id||null}
function models(state){const shifts=state.shifts||[],cats=allCategories(validate(state.spettanze));const reserved=new Set(cats.map(c=>c.id));return [...shifts.filter(s=>!reserved.has(s.id)),...cats.map(c=>({id:c.id,name:c.name,code:c.code,start:'00:00',end:'00:00',pause:0,color:c.color,work:false}))]}
function cost(id,k,holidays,p){const d=date(k);if(!d||holidays.has(k)||[0,6].includes(d.getUTCDay()))return 0;return allCategories(p).find(c=>c.id===id)?.unit==='h'?(d.getUTCDay()===5?4:8):1}
// Ricostruzione cronologica: nessun saldo derivato viene salvato o duplicato.
const pairs=[['kairos_lo','kairos_lo_ap'],['kairos_rc','kairos_rc_ap']];
function hasWork(s,p){if(!s||s.work!==true||category(s,p))return false;const a=String(s.start).split(':').map(Number),b=String(s.end).split(':').map(Number);const raw=((b[0]*60+b[1]-a[0]*60-a[1]+1440)%1440)||1440;return raw>Number(s.pause||0)}
// Guardie di 24 ore: accrediti derivati, nessuna modifica al calendario.
function guard24(s,p){return hasWork(s,p)&&s.start===s.end&&Number(s.pause||0)===0&&(/(?:^|[^a-z])guardia(?:[^a-z]|$)/i.test(s.name||'')||norm(s.code)==='g24'||norm(s.code)==='guardia');}
function smontante(s,p){return !!s&&s.work===false&&!category(s,p)&&(s.kind?s.kind==='smonto':/smont/i.test(s.name||'')||/^(SMONT|SMONTO|SMONTANTE)$/i.test(s.code||''));}
function addDay(k,n){const d=date(k);d.setUTCDate(d.getUTCDate()+n);return key(d);}
// Three deterministic views of the same calendar: actual, committed, forecast.
// No materialized carry or calendar debit is stored. Manual adjustments are dated events.
function calculate(state,y,today,mode){
 const p=validate(state?.spettanze),cats=allCategories(p),shifts=new Map(models(state||{}).map(s=>[s.id,s]));
 const entries=new Map(),moves=new Map();const cutoff=mode==='actual'?today:null;
 for(const [k,e] of Object.entries(state?.days||{})){const d=date(k);if(!d||!Array.isArray(e.ids)||cutoff&&k>cutoff)continue;const yr=+k.slice(0,4);if(yr<1900||yr>y)continue;if(!entries.has(yr))entries.set(yr,[]);entries.get(yr).push([k,e,d]);}
 for(const m of p.adjustments||[]){const yr=+m.date.slice(0,4);if(yr>y||cutoff&&m.date>cutoff)continue;if(!moves.has(yr))moves.set(yr,[]);moves.get(yr).push(m);}
 // Derive the two events from each explicitly recognised guard, including across years.
 const guardCredits=new Map(),guardRF=new Map(),holidayCache=new Map();
 const ordinary=k=>{const yr=+k.slice(0,4);if(!holidayCache.has(yr))holidayCache.set(yr,holidaySet(yr,p.holidays));return cost('kairos_rc',k,holidayCache.get(yr),p);};
 if(p.guardFrom)for(const rows of entries.values())for(const [k,e] of rows){
  if(k<p.guardFrom||!e.ids.some(id=>guard24(shifts.get(id),p)))continue;
  const rest=addDay(k,1),third=addDay(k,2),a=ordinary(k),b=ordinary(rest);
  guardCredits.set(k,{amount:24-a-b,reason:`Guardia 24 h − ordinario ${a} h − fisiologico ${b} h`});
  if(a===0&&ordinary(third)>0&&+third.slice(0,4)<=y&&(!cutoff||third<=cutoff)){
   const ids=state.days?.[third]?.ids||[];
   if(ids.some(id=>smontante(shifts.get(id),p))&&!ids.some(id=>hasWork(shifts.get(id),p)))guardRF.set(third,k);
  }
 }
 const start=Math.min(y,...Object.keys(p.balances).map(Number).filter(n=>n<=y),...entries.keys(),...moves.keys());
 const carry={kairos_lo_ap:0,kairos_rc_ap:0,kairos_rf:0};let result;
 const clean=n=>Math.round(n*1e8)/1e8;
 for(let yr=start;yr<=y;yr++){
  const holidays=holidaySet(yr,p.holidays),b=p.balances[yr]||{},items=Object.fromEntries(cats.map(c=>[c.id,{...c,initial:b[c.id]??null,total:b[c.id]??null,used:0,planned:0,remaining:null,carried:0,earned:0,projected:0,adjusted:0,configured:Object.hasOwn(b,c.id),ledger:[]}]));
  for(const [,ap] of pairs){const s=items[ap];s.carried=carry[ap];s.total=carry[ap]+(b[ap]??0);}
  const rf=items.kairos_rf;rf.carried=carry.kairos_rf;rf.total=rf.carried+(b.kairos_rf??0);
  const ledger=(id,k,amount,type,reason)=>{if(yr===y&&amount)items[id].ledger.push({date:k,amount:clean(amount),type,reason,planned:!!today&&k>today});};
  const days=(entries.get(yr)||[]).sort((a,b)=>a[0].localeCompare(b[0]));
  const dayMap=new Map(days.map(e=>[e[0],e]));const moveMap=new Map();for(const m of moves.get(yr)||[]){if(!moveMap.has(m.date))moveMap.set(m.date,[]);moveMap.get(m.date).push(m);}
  // RF maturation counts once per day, independently of the number of services.
  for(const [k,e,d] of days){if((holidays.has(k)||[0,6].includes(d.getUTCDay()))&&e.ids.some(id=>hasWork(shifts.get(id),p))){if(today&&k>today){rf.projected++;if(mode==='forecast')rf.total++;}else{rf.earned++;rf.total++;}ledger('kairos_rf',k,1,'earned','Servizio festivo / weekend');}}
  function use(id,n,k,reason){if(!n)return;items[id].used+=n;if(today&&k>today)items[id].planned+=n;ledger(id,k,-n,'use',reason);}
  for(const k of [...new Set([...dayMap.keys(),...moveMap.keys()])].sort()){
   // Rectification effective at start of its date; same-day consumption follows it.
   for(const m of moveMap.get(k)||[]){const t=items[m.category];t.adjusted+=m.amount;t.total=(t.total??0)+m.amount;ledger(m.category,k,m.amount,'adjustment',m.reason);}
   const e=dayMap.get(k)?.[1];if(!e)continue;const ids=new Set(e.ids.map(id=>category(shifts.get(id),p)).filter(Boolean));
   const credit=guardCredits.get(k);if(credit){const rc=items.kairos_rc,n=credit.amount;if(today&&k>today){rc.projected+=n;if(mode==='forecast')rc.total=(rc.total??0)+n;}else{rc.earned+=n;rc.total=(rc.total??0)+n;}ledger('kairos_rc',k,n,'earned',credit.reason);}
   // The automatic RF use is tied to this guard, never to an unrelated rest day.
   if(guardRF.has(k)){use('kairos_rf',1,k,'Smontante feriale dopo guardia del '+guardRF.get(k));ids.delete('kairos_rf');}
   for(const [cur,ap] of pairs){if(!ids.has(cur)&&!ids.has(ap))continue;const n=cost(cur,k,holidays,p);if(ids.has(ap)){use(ap,n,k,'Utilizzo AP da ShiftFlow');}else{const take=Math.min(n,Math.max(0,items[ap].total-items[ap].used));use(ap,take,k,'Priorità anni precedenti');use(cur,n-take,k,'Utilizzo da ShiftFlow');}ids.delete(cur);ids.delete(ap);}
   for(const id of ids)use(id,cost(id,k,holidays,p),k,'Utilizzo da ShiftFlow');
  }
  for(const t of Object.values(items)){t.used=clean(t.used);t.planned=clean(t.planned);t.adjusted=clean(t.adjusted);t.total=t.total===null?null:clean(t.total);t.remaining=t.total===null?null:clean(t.total-t.used);}
  for(const [cur,ap] of pairs)carry[ap]=Math.max(0,clean((items[cur].remaining??0)+(items[ap].remaining??0)));
  carry.kairos_rf=Math.max(0,rf.remaining);result=cats.map(c=>items[c.id]);
 }
 return result||[];
}
function summary(state,y,today){y=Number(y);if(!Number.isInteger(y)||y<1900||y>2200)throw Error('Anno non valido');const day=today||'2200-12-31';const committed=calculate(state,y,day,'committed'),forecast=calculate(state,y,day,'forecast'),actual=y<=+day.slice(0,4)?calculate(state,y,day,'actual'):null;
 return committed.map((s,i)=>({...s,currentRemaining:actual?actual[i].remaining:null,currentTotal:actual?actual[i].total:null,currentUsed:actual?actual[i].used:0,currentAdjusted:actual?actual[i].adjusted:0,currentCarried:actual?actual[i].carried:0,forecastRemaining:forecast[i].remaining,forecastTotal:forecast[i].total,forecastCarried:forecast[i].carried,forecastUsed:forecast[i].used,ledger:forecast[i].ledger.sort((a,b)=>b.date.localeCompare(a.date)),visible:s.configured||s.carried>0||s.earned>0||s.adjusted!==0||s.used>0||s.projected>0||s.ledger.length>0||forecast[i].carried>0}));
}
function active(state,y,today){return new Set(calculate(state,Number(y),today||'2200-12-31','committed').filter(s=>s.configured||s.carried>0||s.earned>0||s.adjusted!==0||s.ledger.some(m=>m.type==='adjustment')).map(s=>s.id));}
function selectable(state,y,today,existing=[]){const p=validate(state.spettanze),enabled=active(state,y,today),keep=new Set(existing);return models(state).filter(s=>{const id=category(s,p);return keep.has(s.id)||!id||(s.id===id&&enabled.has(id));});}
const api={categories,allCategories,blank,validate,category,models,cost,summary,active,selectable,holidaySet,date};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KairosSpettanze=api;
})(globalThis);
