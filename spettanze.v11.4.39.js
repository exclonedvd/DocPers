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

function validate(p){if(p==null)return blank();if(!p||typeof p!=='object'||Array.isArray(p)||!p.balances||typeof p.balances!=='object'||Array.isArray(p.balances)||!Array.isArray(p.holidays)||p.holidays.length>2000||Object.keys(p.balances).length>200)throw Error('Spettanze non valide');const custom=p.custom??[];if(!Array.isArray(custom)||custom.length>40||custom.some(c=>!customValid(c))||new Set(custom.map(c=>c.id)).size!==custom.length)throw Error('Spettanze personalizzate non valide');const cats=allCategories(p);for(const [y,vals] of Object.entries(p.balances)){if(!/^\d{4}$/.test(y)||+y<1900||+y>2200||!vals||typeof vals!=='object'||Array.isArray(vals))throw Error('Anno non valido');for(const [id,v] of Object.entries(vals)){if(!cats.some(c=>c.id===id)||typeof v!=='number'||!Number.isFinite(v)||v<0||v>100000||Math.abs(v*(cats.find(c=>c.id===id)?.unit==='h'?60:1)-Math.round(v*(cats.find(c=>c.id===id)?.unit==='h'?60:1)))>1e-8)throw Error('Saldo non valido');}}if(p.holidays.some(k=>!date(k))||new Set(p.holidays).size!==p.holidays.length)throw Error('Festività non valide');const moves=p.adjustments??[];if(!Array.isArray(moves)||moves.length>5000||new Set(moves.map(m=>m?.id)).size!==moves.length)throw Error('Rettifiche non valide');for(const m of moves){const cat=cats.find(c=>c.id===m?.category);const factor=cat?.unit==='h'?60:1;if(!cat||typeof m.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(m.id)||!date(m.date)||+m.date.slice(0,4)<1900||+m.date.slice(0,4)>2200||typeof m.amount!=='number'||!Number.isFinite(m.amount)||m.amount===0||Math.abs(m.amount)>100000||Math.abs(m.amount*factor-Math.round(m.amount*factor))>1e-8||typeof m.reason!=='string'||!m.reason.trim()||m.reason.length>300)throw Error('Rettifica non valida');}return p}
function norm(s){return String(s||'').normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
const aliases={kairos_lo:['licenzaordinaria','lo'],kairos_rc:['recuperocompensativo','rc'],kairos_sm:['straordinariamalattia','licenzastraordinaria','straordinaria','malattia'],kairos_104:['lic104','licenza104','legge104'],kairos_937:['licenza937','lic937'],kairos_lo_ap:['licenzaap','loap','licenzaordinariaap'],kairos_rc_ap:['recuperocompensativoap','rcap'],kairos_rf:['recuperifestivita','recuperofestivita','rf']};
function category(s,p){if(!s)return null;const exact=allCategories(p).find(c=>c.id===s.id);if(exact)return exact.id;if(s.work!==false)return null;const n=norm(s.name);return categories.find(c=>aliases[c.id].includes(n))?.id||null}
// Standard templates: independent copies; add once without altering existing assignments.
const standardRows1131=[{"id":"std_m12","name":"Mattina H12","code":"M12","start":"07:00","end":"19:00","color":"#cce4ab","work":true,"kind":"service","pause":0},{"id":"std_n12","name":"Notte H12","code":"N12","start":"19:00","end":"07:00","color":"#bab6ec","work":true,"kind":"service","pause":0},{"id":"std_g24","name":"Guardia H24","code":"G24","start":"07:00","end":"07:00","color":"#dbceba","work":true,"kind":"service","pause":0},{"id":"std_ae","name":"Aeroportuale","code":"AE","start":"08:00","end":"16:00","color":"#a4d4f3","work":true,"kind":"service","pause":0},{"id":"r","name":"Riposo","code":"R","start":"00:00","end":"00:00","color":"#d8f1df","work":false,"kind":"rest","pause":0},{"id":"std_fisiol","name":"Riposo fisiologico","code":"FISIOL","start":"00:00","end":"00:00","color":"#d8dce3","work":false,"kind":"rest","pause":0},{"id":"std_smont","name":"Smontante","code":"SMONT","start":"00:00","end":"00:00","color":"#f5d8a9","work":false,"kind":"smonto","pause":0}];
const retiredRows1132=[{"id":"m","name":"Mattina","code":"M","start":"06:00","end":"14:00","color":"#d3edff","work":true,"kind":"service","pause":0},{"id":"p","name":"Pomeriggio","code":"P","start":"14:00","end":"22:00","color":"#ffe1a8","work":true,"kind":"service","pause":0},{"id":"n","name":"Notte","code":"N","start":"22:00","end":"06:00","color":"#dcd6ff","work":true,"kind":"service","pause":0},{"id":"std_lav","name":"Lavorativo","code":"LAV","start":"08:00","end":"16:00","color":"#c9e6eb","work":true,"kind":"service","pause":0}];
function standardModels(){return standardRows1131.map(s=>({...s}));}
function standardState(){return {version:1,theme:'auto',shifts:[{"id":"std_m12","name":"Mattina H12","code":"M12","start":"07:00","end":"19:00","color":"#aec5fb","work":true,"kind":"service","pause":0},{"id":"std_n12","name":"Notte H12","code":"N12","start":"19:00","end":"07:00","color":"#80a6f9","work":true,"kind":"service","pause":0},{"id":"std_g24","name":"Guardia H24","code":"G24","start":"07:00","end":"07:00","color":"#e52500","work":true,"kind":"service","pause":0},{"id":"std_ae","name":"Aeroportuale","code":"AE","start":"08:00","end":"16:00","color":"#aed3f0","work":true,"kind":"service","pause":0},{"id":"r","name":"Riposo","code":"R","start":"00:00","end":"00:00","color":"#def0e0","work":false,"kind":"rest","pause":0},{"id":"std_fisiol","name":"Riposo fisiologico","code":"FISIO","start":"00:00","end":"00:00","color":"#d9dce3","work":false,"kind":"rest","pause":0},{"id":"std_smont","name":"Smontante","code":"SMO","start":"00:00","end":"00:00","color":"#f0d9af","work":false,"kind":"smonto","pause":0}],days:{},standardModels1131:true,proRotations:[{name:'1 - 4 • H24',seq:['std_g24','blank','blank','blank','blank']},{name:'1 - 3 • H12',seq:['std_m12','std_n12','blank','blank','blank']}]};}
function addStandardModels(state){
 // Remove only untouched legacy defaults without references in calendar or saved rotations.
 const referenced=new Set([...Object.values(state.days||{}).flatMap(e=>e.ids||[]),...(state.proRotations||[]).flatMap(r=>r.seq||[])]);
 const original=state.shifts||[];
 const retained=original.filter(s=>referenced.has(s.id)||!retiredRows1132.some(t=>t.id===s.id&&Object.keys(t).every(k=>k==='kind'?(s.kind===undefined||s.kind===t.kind):s[k]===t[k])));
 if(retained.length!==original.length)state={...state,shifts:retained};
 if(state.standardModels1131===true)return state;
 const old=state.shifts||[], reserved=new Set(allCategories(state.spettanze).map(c=>c.id)), used=new Set([...old.map(x=>x.id),...reserved]);
 const result=[...old];
 for(const t of standardModels()){
  if(used.has(t.id))continue;
  const match=old.some(s=>s.work===t.work&&s.start===t.start&&s.end===t.end&&Number(s.pause||0)===0&&(norm(s.name)===norm(t.name)||norm(s.code)===norm(t.code)||(t.id==='std_m12'&&h12(s,state.spettanze)==='M')||(t.id==='std_n12'&&h12(s,state.spettanze)==='N')||(t.id==='std_g24'&&guard24(s,state.spettanze))||(t.id==='std_smont'&&smontante(s,state.spettanze))));
  if(match)continue;
  if(result.length>=255)break;
  result.push(t);used.add(t.id);
 }
 return {...state,shifts:result,standardModels1131:true};
}
function models(state){const shifts=state.shifts||[],cats=allCategories(validate(state.spettanze));const reserved=new Set(cats.map(c=>c.id));return [...shifts.filter(s=>!reserved.has(s.id)),...cats.map(c=>({id:c.id,name:c.name,code:c.code,start:'00:00',end:'00:00',pause:0,color:c.color,work:false}))]}
function cost(id,k,holidays,p){const d=date(k);if(!d||holidays.has(k)||[0,6].includes(d.getUTCDay()))return 0;return allCategories(p).find(c=>c.id===id)?.unit==='h'?(d.getUTCDay()===5?4:8):1}
// Ricostruzione cronologica: nessun saldo derivato viene salvato o duplicato.
const pairs=[['kairos_lo','kairos_lo_ap'],['kairos_rc','kairos_rc_ap']];
function hasWork(s,p){if(!s||s.work!==true||category(s,p))return false;const a=String(s.start).split(':').map(Number),b=String(s.end).split(':').map(Number);const raw=((b[0]*60+b[1]-a[0]*60-a[1]+1440)%1440)||1440;return raw>Number(s.pause||0)}
// Guardie di 24 ore: accrediti derivati, nessuna modifica al calendario.
function guard24(s,p){return hasWork(s,p)&&s.start===s.end&&Number(s.pause||0)===0&&(/(?:^|[^a-z])guardia(?:[^a-z]|$)/i.test(s.name||'')||norm(s.code)==='g24'||norm(s.code)==='guardia');}
function smontante(s,p){return !!s&&s.work===false&&!category(s,p)&&(s.kind?s.kind==='smonto':/smont/i.test(s.name||'')||/^(SMONT|SMONTO|SMONTANTE)$/i.test(s.code||''));}
function addDay(k,n){const d=date(k);d.setUTCDate(d.getUTCDate()+n);return key(d);}
// H12: detect exact 12-hour duty schedules, never ordinary 8-hour shifts.
function minute1131(t){const [h,m]=String(t).split(':').map(Number);return h*60+m;}
function h12(s,p){if(!hasWork(s,p)||Number(s.pause||0)!==0)return '';if(s.start==='07:00'&&s.end==='19:00')return 'M';if(s.start==='19:00'&&s.end==='07:00')return 'N';const a=minute1131(s.start),b=minute1131(s.end);if((b-a+1440)%1440!==720)return '';const n=norm(s.name),c=norm(s.code);if((s.id==='std_m12'||['m12','h12m'].includes(c)||n==='mattinah12'||n==='diurnoh12')&&a<b)return 'M';if((s.id==='std_n12'||['n12','h12n'].includes(c)||n==='notteh12'||n==='notturnoh12')&&a>b)return 'N';return '';}
function restShift(s,p){return !!s&&s.work===false&&!category(s,p)&&(smontante(s,p)||s.kind==='rest'||(!s.kind&&(/riposo|libero/i.test(s.name||'')||/^(R|RIP)$/i.test(s.code||''))))}
// Derived only: no synthetic shift, debit or balance is stored in the calendar.
function rotationPlan(state){
 const p=validate(state?.spettanze),shifts=new Map(models(state||{}).map(s=>[s.id,s])),days=state?.days||{},credits=new Map(),rfEarn=new Map(),uses=new Map(),markers=new Map(),holidayCache=new Map(),rotations=[],physiological=new Set();
 const get=k=>(days[k]?.ids||[]).map(id=>shifts.get(id)).filter(Boolean);
 const ordinary=k=>{const yr=+k.slice(0,4);if(!holidayCache.has(yr))holidayCache.set(yr,holidaySet(yr,p.holidays));return cost('kairos_rc',k,holidayCache.get(yr),p)};
 const add=(map,k,value)=>{if(!map.has(k))map.set(k,[]);map.get(k).push(value)};
 const addRF=(k,reason)=>add(rfEarn,k,{amount:1,reason});
 const eligible=k=>{let d=k;while(d<='2200-12-31'&&!ordinary(d))d=addDay(d,1);return d<='2200-12-31'?d:null};
 const mark=(k,type,label,reason,hours=0)=>{if(!markers.has(k))markers.set(k,{type,label,reason,hours})};
 const working=k=>get(k).some(s=>hasWork(s,p));
 const manual=k=>get(k).some(s=>!restShift(s,p));
 const dateList=Object.keys(days).filter(k=>date(k)&&k>='1900-01-01'&&k<='2200-12-31').sort();
 // RF and guard credits are derived from actual calendar assignments, without a separate start date.
 for(const k of dateList){
  const ss=get(k);
  const recognized=ss.filter(s=>h12(s,p));
  let rfToday=false;
  for(const s of recognized){const kind=h12(s,p),next=addDay(k,1);if(!ordinary(k)){addRF(k,'Turno H12 '+kind+' festivo');rfToday=true;}else if(kind==='N'&&minute1131(s.end)>0&&!ordinary(next))addRF(next,'Turno H12 notte: servizio dopo mezzanotte del '+k);}
  if(!rfToday&&!ordinary(k)&&ss.some(s=>hasWork(s,p)&&!recognized.includes(s)))addRF(k,'Servizio festivo / weekend');
  if(ss.some(s=>guard24(s,p))){const rest=addDay(k,1),third=addDay(k,2),a=ordinary(k),b=ordinary(rest),n=24-a-b;
   add(credits,k,{amount:n,reason:`Guardia 24 h − ordinario ${a} h − fisiologico ${b} h`});
   physiological.add(rest);
   if(!manual(rest))mark(rest,'rest','Fisiologico',`H24: riposo fisiologico già coperto dalla guardia del ${k} (${b} h detratte dalla guardia).`);
   rotations.push({type:'H24',start:k,creditDate:k,rc:n,rf:a===0?1:0,first:third,last:addDay(k,4)});
  }
  // Only consecutive, unambiguous M/N pairs generate a cycle and automatic rest coverage.
  const next=addDay(k,1),tail=addDay(k,2),ws=ss.filter(s=>hasWork(s,p)),ns=get(next).filter(s=>hasWork(s,p));
  if(ws.length===1&&h12(ws[0],p)==='M'&&ns.length===1&&h12(ns[0],p)==='N'){
   const late=(1440-minute1131(ns[0].start))/60,early=minute1131(ns[0].end)/60;const a=12-ordinary(k),b=late-ordinary(next),c=early-ordinary(tail),n=a+b+c;
   add(credits,tail,{amount:n,reason:`H12 ${k}: diurno ${a} h, notte ${b} h, fine notte/fisiologico ${c} h`});
   physiological.add(tail);
   if(!manual(tail))mark(tail,'rest','Fisiologico','H12: fine turno alle '+ns[0].end+'; bilancio '+c+' h.');
   rotations.push({type:'H12',start:k,creditDate:tail,rc:n,rf:Number(!ordinary(k))+Number(!ordinary(next)||(early>0&&!ordinary(tail))),first:addDay(k,3),last:addDay(k,4)});
  }
 }
 // Coverage is limited by the next rotation (or a return to work), not by day five.
 // Without a next rotation, extend the final cycle only while usable RC or the
 // postponed RF remains; do not populate an unlimited future calendar.
 for(let i=0;i<rotations.length;i++){
  const r=rotations[i];
  let rc=r.rc,stopped=false;const due=eligible(r.first);
  const nextRotation=rotations[i+1]?.start;
  for(let k=r.first;k<='2200-12-31'&&(!nextRotation||k<nextRotation);k=addDay(k,1)){
   const pendingRF=!!(r.rf&&due&&k<=due);
   if(!nextRotation&&k>r.last&&(stopped||!(rc>=4||pendingRF)))break;
   // A return to any manually assigned service ends automatic use of this cycle.
   if(working(k)){stopped=true;continue;}
   const hours=ordinary(k),assigned=get(k);
   if(!hours){
    if(!physiological.has(k)&&!assigned.length&&!uses.has(k))mark(k,'nonwork','Non lavorativo','Sabato, domenica o festività: nessuna copertura necessaria.');
    continue;
   }
   if(physiological.has(k)||uses.has(k))continue;
   if(manual(k)){
    // Manual current-year RC can draw on this cycle. Reserve its cost to avoid
    // allocating the same hours again automatically; explicit AP stays separate.
    const ids=new Set(assigned.map(s=>category(s,p)).filter(Boolean));
    if(!stopped&&ids.has('kairos_rc')&&!ids.has('kairos_rc_ap'))rc=Math.max(0,rc-hours);
    continue;
   }
   // Keep explicit rest assignments beyond the nominal cycle as entered.
   if(k>r.last&&assigned.length)continue;
   if(stopped){mark(k,'cover','Da coprire',hours+' h da coprire; recuperi residui accantonati al rientro in servizio.',hours);continue;}
   // Preserve the existing policy: at most one automatic RF per rotation.
   if(r.rf&&k===due){
    uses.set(k,{id:'kairos_rf',amount:1,reason:r.type+' RF automatico dalla guardia/rotazione del '+r.start});mark(k,'rf','RF automatico',r.type+': recupero festività della stessa rotazione.');continue;
   }
   if(rc>=hours){rc-=hours;const id=r.creditDate.slice(0,4)===k.slice(0,4)?'kairos_rc':'kairos_rc_ap';uses.set(k,{id,amount:hours,reason:r.type+' riposo di servizio: ore della rotazione del '+r.start});mark(k,'rc','RC automatico',r.type+': '+hours+' h dalla stessa rotazione.',hours);}
   else mark(k,'cover','Da coprire',hours+' h da coprire; '+rc+' h disponibili nella rotazione. Nessun recupero pregresso utilizzato.',hours);
  }
 }
 return {credits,rfEarn,uses,markers};
}
function calendarStatus(state){return Object.fromEntries(rotationPlan(state).markers)}

// Three deterministic views of the same calendar: actual, committed, forecast.
// No materialized carry or calendar debit is stored. Manual adjustments are dated events.
function calculate(state,y,today,mode,sharedPlan){
 const p=validate(state?.spettanze),cats=allCategories(p),shifts=new Map(models(state||{}).map(s=>[s.id,s]));
 const entries=new Map(),moves=new Map();const cutoff=mode==='actual'?today:null;
 for(const [k,e] of Object.entries(state?.days||{})){const d=date(k);if(!d||!Array.isArray(e.ids)||cutoff&&k>cutoff)continue;const yr=+k.slice(0,4);if(yr<1900||yr>y)continue;if(!entries.has(yr))entries.set(yr,[]);entries.get(yr).push([k,e,d]);}
 for(const m of p.adjustments||[]){const yr=+m.date.slice(0,4);if(yr>y||cutoff&&m.date>cutoff)continue;if(!moves.has(yr))moves.set(yr,[]);moves.get(yr).push(m);}
 const plan=sharedPlan||rotationPlan(state),eventDates=new Map();
 for(const k of new Set([...plan.credits.keys(),...plan.rfEarn.keys(),...plan.uses.keys()])){const yr=+k.slice(0,4);if(yr<1900||yr>y||cutoff&&k>cutoff)continue;if(!eventDates.has(yr))eventDates.set(yr,[]);eventDates.get(yr).push(k);}
 const start=Math.min(y,...Object.keys(p.balances).map(Number).filter(n=>n<=y),...entries.keys(),...moves.keys(),...eventDates.keys());
 const carry={kairos_lo_ap:0,kairos_rc_ap:0,kairos_rf:0};let result;
 const clean=n=>Math.round(n*1e8)/1e8;
 for(let yr=start;yr<=y;yr++){
  const holidays=holidaySet(yr,p.holidays),b=p.balances[yr]||{},items=Object.fromEntries(cats.map(c=>[c.id,{...c,initial:b[c.id]??null,total:b[c.id]??null,used:0,planned:0,remaining:null,carried:0,earned:0,projected:0,adjusted:0,configured:Object.hasOwn(b,c.id),ledger:[]}]));
  for(const [,ap] of pairs){const s=items[ap];s.carried=carry[ap];s.total=carry[ap]+(b[ap]??0);}
  const rf=items.kairos_rf;rf.carried=carry.kairos_rf;rf.total=rf.carried+(b.kairos_rf??0);
  const ledger=(id,k,amount,type,reason)=>{if(yr===y&&amount)items[id].ledger.push({date:k,amount:clean(amount),type,reason,planned:!!today&&k>today});};
  const days=(entries.get(yr)||[]).sort((a,b)=>a[0].localeCompare(b[0]));
  const dayMap=new Map(days.map(e=>[e[0],e]));const moveMap=new Map();for(const m of moves.get(yr)||[]){if(!moveMap.has(m.date))moveMap.set(m.date,[]);moveMap.get(m.date).push(m);}
  for(const k of eventDates.get(yr)||[])for(const event of plan.rfEarn.get(k)||[]){const n=event.amount;if(today&&k>today){rf.projected+=n;if(mode==='forecast')rf.total+=n;}else{rf.earned+=n;rf.total+=n;}ledger('kairos_rf',k,n,'earned',event.reason);}
  function use(id,n,k,reason){if(!n)return;items[id].used+=n;if(today&&k>today)items[id].planned+=n;ledger(id,k,-n,'use',reason);}
  for(const k of [...new Set([...dayMap.keys(),...moveMap.keys(),...(eventDates.get(yr)||[])])].sort()){
   // Rectification effective at start of its date; same-day consumption follows it.
   for(const m of moveMap.get(k)||[]){const t=items[m.category];t.adjusted+=m.amount;t.total=(t.total??0)+m.amount;ledger(m.category,k,m.amount,'adjustment',m.reason);}
   const e=dayMap.get(k)?.[1];const ids=new Set((e?.ids||[]).map(id=>category(shifts.get(id),p)).filter(Boolean));
   for(const credit of plan.credits.get(k)||[]){const rc=items.kairos_rc,n=credit.amount;if(today&&k>today){rc.projected+=n;if(mode==='forecast')rc.total=(rc.total??0)+n;}else{rc.earned+=n;rc.total=(rc.total??0)+n;}ledger('kairos_rc',k,n,'earned',credit.reason);}
   const auto=plan.uses.get(k);if(auto){use(auto.id,auto.amount,k,auto.reason);}
   for(const [cur,ap] of pairs){if(!ids.has(cur)&&!ids.has(ap))continue;const n=cost(cur,k,holidays,p);if(ids.has(ap)){use(ap,n,k,'Utilizzo AP da ShiftFlow');}else{const take=Math.min(n,Math.max(0,items[ap].total-items[ap].used));use(ap,take,k,'Priorità anni precedenti');use(cur,n-take,k,'Utilizzo da ShiftFlow');}ids.delete(cur);ids.delete(ap);}
   for(const id of ids)use(id,cost(id,k,holidays,p),k,'Utilizzo da ShiftFlow');
  }
  for(const t of Object.values(items)){t.used=clean(t.used);t.planned=clean(t.planned);t.adjusted=clean(t.adjusted);t.total=t.total===null?null:clean(t.total);t.remaining=t.total===null?null:clean(t.total-t.used);}
  for(const [cur,ap] of pairs)carry[ap]=Math.max(0,clean((items[cur].remaining??0)+(items[ap].remaining??0)));
  carry.kairos_rf=Math.max(0,rf.remaining);result=cats.map(c=>items[c.id]);
 }
 return result||[];
}
function summary(state,y,today){y=Number(y);if(!Number.isInteger(y)||y<1900||y>2200)throw Error('Anno non valido');const day=today||'2200-12-31';const plan=rotationPlan(state),committed=calculate(state,y,day,'committed',plan),forecast=calculate(state,y,day,'forecast',plan),actual=y<=+day.slice(0,4)?calculate(state,y,day,'actual',plan):null;
 return committed.map((s,i)=>({...s,currentRemaining:actual?actual[i].remaining:null,currentTotal:actual?actual[i].total:null,currentUsed:actual?actual[i].used:0,currentAdjusted:actual?actual[i].adjusted:0,currentCarried:actual?actual[i].carried:0,forecastRemaining:forecast[i].remaining,forecastTotal:forecast[i].total,forecastCarried:forecast[i].carried,forecastUsed:forecast[i].used,ledger:forecast[i].ledger.sort((a,b)=>b.date.localeCompare(a.date)),visible:s.configured||s.carried>0||s.earned>0||s.adjusted!==0||s.used>0||s.projected>0||s.ledger.length>0||forecast[i].carried>0}));
}
function active(state,y,today){return new Set(calculate(state,Number(y),today||'2200-12-31','committed').filter(s=>s.configured||s.carried>0||s.earned>0||s.adjusted!==0||s.ledger.some(m=>m.type==='adjustment')).map(s=>s.id));}
function selectable(state,y,today,existing=[]){const p=validate(state.spettanze),enabled=active(state,y,today),keep=new Set(existing);return models(state).filter(s=>{const id=category(s,p);return keep.has(s.id)||!id||(s.id===id&&enabled.has(id));});}
const api={standardModels,standardState,addStandardModels,categories,allCategories,blank,validate,category,models,cost,summary,active,selectable,holidaySet,date,calendarStatus,rotationPlan};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KairosSpettanze=api;
})(globalThis);
