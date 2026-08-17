const A=require('./app.js');
const {S,ck,buildGroups,buildCoMatrix,setPrior,gopp,displayOrder,hashKey,constraintsOk,coVarScore,catBalanceScore,recordGen,rebuildStatsFromArchive,saveToStats,teamsAsText,coStats,varianceOf,swapDelta,localSearch}=A;
let pass=0,fail=0;
const t=(n,ok,i='')=>{ok?pass++:fail++;console.log(`${ok?'  OK  ':' FEIL '} ${n}${i?'  '+i:''}`);};

// ── Ytelse ──
console.log('Kjøretid for én generering (5 restarter), node på laptop:');
for(const N of [12,20,30,40]){
  const navn=Array.from({length:N},(_,i)=>'S'+i);
  S.coOcc={};S.opp={};for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){S.coOcc[ck(navn[i],navn[j])]=Math.floor(Math.random()*4);S.opp[ck(navn[i],navn[j])]=8;}
  S.bindings=[];
  const people=navn.map((n,i)=>({name:n,cat:['a','b','c'][i%3]}));
  const ng=Math.min(4,N),ms=Math.ceil(N/ng);
  setPrior(N,ms);
  buildCoMatrix(people);
  const t0=process.hrtime.bigint();
  let best=null,bs=Infinity;
  for(let i=0;i<5;i++){const g=buildGroups(people.map(p=>({...p})),ng,ms);if(!g)continue;
    const s=coVarScore(g)+catBalanceScore(g)*10000;if(s<bs){bs=s;best=g;}}
  const ms2=Number(process.hrtime.bigint()-t0)/1e6;
  console.log(`   ${String(N).padStart(2)} spillere: ${ms2.toFixed(0)} ms`);
  if(N===30)t('30 spillere under 300 ms',ms2<300,`${ms2.toFixed(0)} ms`);
  if(N===40)t('40 spillere under 300 ms',ms2<300,`${ms2.toFixed(0)} ms`);
}

// ── Inkrementell scoring gir samme svar som full utregning ──
{
  const navn=Array.from({length:16},(_,i)=>'P'+i);
  S.coOcc={};S.opp={};for(let i=0;i<16;i++)for(let j=i+1;j<16;j++){S.coOcc[ck(navn[i],navn[j])]=Math.floor(Math.random()*5);S.opp[ck(navn[i],navn[j])]=5+Math.floor(Math.random()*8);}
  let avvik=0;
  for(let r=0;r<300;r++){
    const people=navn.map((n,i)=>({name:n,cat:['a','b','c'][i%3]}));
    const groups=[[],[],[],[]];people.forEach((p,i)=>groups[i%4].push(p));
    const st=coStats(groups);
    const g1=groups[0],g2=groups[1];
    const p1=g1[Math.floor(Math.random()*g1.length)];
    const c2=g2.filter(p=>p.cat===p1.cat);if(!c2.length)continue;
    const p2=c2[Math.floor(Math.random()*c2.length)];
    const d=swapDelta(g1,g2,p1,p2);
    const forventet=varianceOf(st.sum+d.dS,st.sumSq+d.dQ,st.m);
    g1[g1.indexOf(p1)]=p2;g2[g2.indexOf(p2)]=p1;
    const fasit=coVarScore(groups);
    if(Math.abs(forventet-fasit)>1e-9)avvik++;
  }
  t('swapDelta gir nøyaktig samme score som full utregning',avvik===0,`avvik ${avvik}/300`);
}

// ── Dobbel lagring ──
{
  S.coOcc={};S.opp={};S.genCount=0;S.archive=[];S.currentMatchDate='2026-08-16';
  S.currentGroups=[[{name:'Ada',cat:'a'},{name:'Bo',cat:'b'}],[{name:'Cato',cat:'c'},{name:'Dina',cat:'a'}]];
  S.isSaved=false;
  saveToStats();saveToStats();saveToStats();
  t('Tre trykk på lagre gir én oppføring',S.archive.length===1,`${S.archive.length} oppføringer`);
  t('Samspillstallet ble ikke doblet',S.coOcc[ck('Ada','Bo')]===1,`Ada|Bo = ${S.coOcc[ck('Ada','Bo')]}`);
  t('Øktteller er 1',S.genCount===1,`genCount = ${S.genCount}`);
}

// ── Statistikk bygget på nytt fra arkivet ──
{
  S.coOcc={};S.opp={};S.genCount=0;S.archive=[];
  const g=[[{name:'Ada',cat:'a'},{name:'Bo',cat:'b'}],[{name:'Cato',cat:'c'},{name:'Dina',cat:'a'}]];
  recordGen(g,'2026-08-01');
  recordGen([[{name:'Ada',cat:'a'},{name:'Cato',cat:'c'}],[{name:'Bo',cat:'b'},{name:'Dina',cat:'a'}]],'2026-08-08');
  t('To økter registrert',S.genCount===2&&S.coOcc[ck('Ada','Bo')]===1&&S.coOcc[ck('Ada','Cato')]===1);
  S.archive.splice(0,1); // slett nyeste, som før ville etterlatt spøkelsestall
  rebuildStatsFromArchive();
  t('Etter sletting: statistikken speiler arkivet',S.genCount===1&&S.coOcc[ck('Ada','Bo')]===1&&!S.coOcc[ck('Ada','Cato')],
    `genCount=${S.genCount} Ada|Bo=${S.coOcc[ck('Ada','Bo')]} Ada|Cato=${S.coOcc[ck('Ada','Cato')]||0}`);
  S.archive=[];rebuildStatsFromArchive();
  t('Tomt arkiv gir tom statistikk',S.genCount===0&&Object.keys(S.coOcc).length===0);
}

// ── Tomme lag arkiveres ikke ──
{
  S.coOcc={};S.opp={};S.genCount=0;S.archive=[];
  recordGen([[{name:'Ada',cat:'a'}],[],[{name:'Bo',cat:'b'}]],'2026-08-16');
  t('Tomme lag havner ikke i arkivet',S.archive[0].groups.length===2,`${S.archive[0].groups.length} lag`);
}

// ── Delingstekst ──
{
  S.shareMode=true; S.shareSeed=12345; S.currentMatchDate='2026-08-16';
  S.currentGroups=[[{name:'Even',cat:'a'},{name:'Ada',cat:'c'},{name:'Geir',cat:'b'}],[{name:'Bo',cat:'b'}]];
  const txt=teamsAsText();
  const iTekst=txt.split('\n').filter(l=>l.startsWith('- ')).map(l=>l.slice(2));
  const forventet=S.currentGroups.flatMap(g=>displayOrder(g,S.shareSeed).map(i=>g[i].name));
  t('Delingstekst følger samme stokking som skjermen',JSON.stringify(iTekst)===JSON.stringify(forventet),JSON.stringify(iTekst));
  t('Delingstekst inneholder ingen kategoriinfo',!/[Kk]ategori/.test(txt)&&iTekst.length===4);
  S.shareMode=false;
}
console.log(`\n${pass} bestått, ${fail} feilet`);
