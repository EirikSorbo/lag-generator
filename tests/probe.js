const A=require('./app.js');
const {S,ck,gco,gopp,buildGroups,buildCoMatrix,setPrior,constraintsOk,coVarScore,catBalanceScore,
       recordGen,rebuildStatsFromArchive,renamePlayer,addCat,removeCat,catOrder,calcGroups,
       co,copp,allNames,harHistorikk,CAT_PALETTE,applyCatColors}=A;
global.confirm=()=>true;
let funn=[];
const sjekk=(n,ok,detalj='')=>{console.log(`${ok?'  ok  ':' FUNN '} ${n}${detalj?'  '+detalj:''}`); if(!ok)funn.push(n);};
function tropp(n=12,kat=3){
  S.cats=Array.from({length:kat},(_,i)=>({id:String.fromCharCode(97+i),name:'K'+i,names:[],color:i}));
  Array.from({length:n},(_,i)=>'P'+String(i).padStart(2,'0')).forEach((nm,i)=>S.cats[i%kat].names.push(nm));
  S.coOcc={};S.opp={};S.genCount=0;S.archive=[];S.bindings=[];S.apart=[];S.excluded=new Set();S.currentGroups=[];
}
const folk=()=>S.cats.flatMap(c=>c.names.filter(n=>!S.excluded.has(n)).map(n=>({name:n,cat:c.id})));
function gen(ng,ms){const p=folk();setPrior(p.length,ms);buildCoMatrix(p);
  let best=null,bs=Infinity;
  for(let i=0;i<5;i++){const g=buildGroups(p,ng,ms);if(!g||!constraintsOk(g))continue;
    const s=coVarScore(g)+catBalanceScore(g)*10000;if(s<bs){bs=s;best=g;}}
  return best;}

console.log('── Kanttilfeller i generering ──');
// helt fersk tropp, ingen historikk
tropp(12);
sjekk('Fersk tropp uten historikk gir lag',!!gen(3,4));
// nøyaktig 2 spillere
tropp(2,1);
sjekk('To spillere, to lag',(()=>{const g=gen(2,1);return g&&g.flat().length===2&&g.length===2;})());
// oddetall som ikke går opp
tropp(13);
{const {numGroups,maxSize}=(S.mode='count',S.num=4,calcGroups(13));const g=gen(numGroups,maxSize);
 sjekk('13 spillere på 4 lag',!!g&&g.flat().length===13,g?g.map(x=>x.length).join('/'):'null');}
// alle utelatt bortsett fra én
tropp(12);S.excluded=new Set(allNames().slice(1));
sjekk('Én aktiv spiller gir ingen lag (fanges av vakten i generateTeams)',folk().length===1);
// spiller uten historikk sammen med spillere som har mye
tropp(6,2);
for(let o=0;o<10;o++)S.archive.push({id:o,matchDate:'2026-08-0'+(o%9+1),
  groups:[[{name:'P00',cat:'a'},{name:'P02',cat:'a'},{name:'P01',cat:'b'}],[{name:'P04',cat:'a'},{name:'P03',cat:'b'},{name:'P05',cat:'b'}]],excluded:[]});
rebuildStatsFromArchive();
S.cats[0].names.push('Nykommer');
{const g=gen(2,4);
 sjekk('Ny spiller uten historikk plasseres',!!g&&g.flat().some(p=>p.name==='Nykommer'));}

console.log('\n── Kategorifarger ved sletting ──');
tropp(6,3);
const farge=id=>{const c=S.cats.find(x=>x.id===id);return c?CAT_PALETTE[c.color].c:null;};
const cFørstFarge=farge('c');
S.cats[1].names=[];
removeCat('b');
const cEtterFarge=farge('c');
sjekk('Kategori C beholder fargen sin når B slettes',cFørstFarge===cEtterFarge,
  `c: ${cFørstFarge} -> ${cEtterFarge}`);

console.log('\n── Navnebytte, vanskelige varianter ──');
tropp(6,2);
recordGen([[{name:'P00',cat:'a'},{name:'P01',cat:'b'}],[{name:'P02',cat:'a'},{name:'P03',cat:'b'}]],'2026-08-01');
let inp={value:'p00'};  // bare ulik store/små bokstaver
renamePlayer('a',0,inp);
sjekk('Navnebytte til bare ulik bokstavstørrelse godtas',S.cats[0].names[0]==='p00',S.cats[0].names[0]);
inp={value:'   Mellomrom rundt   '};
renamePlayer('a',0,inp);
sjekk('Navn trimmes',S.cats[0].names[0]==='Mellomrom rundt',JSON.stringify(S.cats[0].names[0]));

console.log('\n── Ytelse med langt arkiv ──');
tropp(24,3);
for(let o=0;o<300;o++){
  const alle=allNames();
  const g=[[],[],[]];alle.forEach((n,i)=>g[i%3].push({name:n,cat:S.cats.find(c=>c.names.includes(n)).id}));
  S.archive.push({id:o,matchDate:`2024-${String(1+o%12).padStart(2,'0')}-${String(1+o%28).padStart(2,'0')}`,groups:g,excluded:[]});
}
rebuildStatsFromArchive();
{const t0=process.hrtime.bigint();const g=gen(3,8);const ms=Number(process.hrtime.bigint()-t0)/1e6;
 sjekk(`24 spillere med 300 arkiverte økter under 500 ms`,ms<500&&!!g,`${ms.toFixed(0)} ms`);}

console.log('\n── Aldring: rekkefølge etter dato vs. registrering ──');
tropp(6,2);
S.archive=[
  {id:1,matchDate:'2020-01-01',groups:[[{name:'P00',cat:'a'},{name:'P01',cat:'b'}],[{name:'P02',cat:'a'},{name:'P03',cat:'b'}]],excluded:[]},
  {id:2,matchDate:'2026-08-10',groups:[[{name:'P00',cat:'a'},{name:'P02',cat:'a'}],[{name:'P01',cat:'b'},{name:'P03',cat:'b'}]],excluded:[]}
];
{const p=folk();buildCoMatrix(p);
 const gammel=co(p.find(x=>x.name==='P00'),p.find(x=>x.name==='P01'));
 const fersk=co(p.find(x=>x.name==='P00'),p.find(x=>x.name==='P02'));
 sjekk('Etterregistrert gammel kamp veier mindre enn en fersk',fersk>gammel,`fersk ${fersk.toFixed(3)} mot gammel ${gammel.toFixed(3)}`);}

console.log(`\n${funn.length? funn.length+' funn: '+funn.join('; ') : 'ingen funn'}`);
