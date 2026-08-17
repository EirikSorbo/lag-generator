const A=require('./app.js');
const {S,ck,gco,gopp,buildGroups,buildCoMatrix,setPrior,constraintsOk,coVarScore,catBalanceScore,
       recordGen,rebuildStatsFromArchive,renamePlayer,addCat,removeCat,catOrder,MAX_CATS,
       co,copp,allNames,harHistorikk,pairVal}=A;
let pass=0,fail=0;
const t=(n,ok,i='')=>{ok?pass++:fail++;console.log(`${ok?'  OK  ':' FEIL '} ${n}${i?'  '+i:''}`);};
const NAVN=['Ada','Bo','Cato','Dina','Even','Frida'];
function nyTropp(){
  S.cats=[{id:'a',name:'A',names:['Ada','Dina']},{id:'b',name:'B',names:['Bo','Even']},{id:'c',name:'C',names:['Cato','Frida']}];
  S.coOcc={};S.opp={};S.genCount=0;S.archive=[];S.bindings=[];S.apart=[];S.excluded=new Set();S.currentGroups=[];
}

console.log('── 1. Navnebytte ──');
nyTropp();
recordGen([[{name:'Ada',cat:'a'},{name:'Bo',cat:'b'}],[{name:'Cato',cat:'c'},{name:'Dina',cat:'a'}]],'2026-08-01');
S.excluded=new Set(['Even']);
recordGen([[{name:'Ada',cat:'a'},{name:'Cato',cat:'c'}],[{name:'Bo',cat:'b'},{name:'Dina',cat:'a'}]],'2026-08-08');
S.bindings=[['Ada','Frida']];S.apart=[['Ada','Bo']];S.excluded=new Set(['Ada']);
S.currentGroups=[[{name:'Ada',cat:'a'}]];
const før={co:gco('Ada','Bo'),opp:gopp('Ada','Bo')};
renamePlayer('a',0,{value:'Adelheid'});
const etter={co:gco('Adelheid','Bo'),opp:gopp('Adelheid','Bo')};
t('Statistikken følger med på navnebyttet',JSON.stringify(før)===JSON.stringify(etter),`${JSON.stringify(før)} -> ${JSON.stringify(etter)}`);
t('Gammelt navn er borte fra statistikken',gco('Ada','Bo')===0&&!Object.keys(S.coOcc).some(k=>k.split('|').includes('Ada')));
t('Arkivet er oppdatert',S.archive.every(e=>!e.groups.flat().some(p=>p.name==='Ada'))&&S.archive[0].groups.flat().some(p=>p.name==='Adelheid'));
t('Bindingen følger med',JSON.stringify(S.bindings)==='[["Adelheid","Frida"]]',JSON.stringify(S.bindings));
t('«Ikke sammen» følger med',JSON.stringify(S.apart)==='[["Adelheid","Bo"]]',JSON.stringify(S.apart));
t('Utelatelsen følger med',S.excluded.has('Adelheid')&&!S.excluded.has('Ada'));
t('Åpne lag følger med',S.currentGroups[0][0].name==='Adelheid');
t('Troppen er oppdatert',S.cats[0].names.includes('Adelheid'));
// avvisninger
let inp={value:'Bo'};renamePlayer('a',0,inp);
t('Duplikat avvises og feltet tilbakestilles',inp.value==='Adelheid'&&S.cats[0].names[0]==='Adelheid',inp.value);
inp={value:'A|B'};renamePlayer('a',0,inp);
t('Navn med | avvises (ville ødelagt nøklene)',inp.value==='Adelheid'&&S.cats[0].names[0]==='Adelheid');
inp={value:'   '};renamePlayer('a',0,inp);
t('Tomt navn avvises',S.cats[0].names[0]==='Adelheid');

console.log('\n── 2. Antall kategorier ──');
nyTropp();
addCat();
t('Ny kategori får neste ledige id',S.cats.length===4&&S.cats[3].id==='d',S.cats.map(c=>c.id).join(''));
t('catOrder følger rekkefølgen',catOrder('d')===3&&catOrder('a')===0);
S.cats[3].names.push('Geir');
removeCat('d');
t('Kategori med spillere kan ikke slettes',S.cats.length===4);
S.cats[3].names=[];
global.confirm=()=>true;
removeCat('d');
t('Tom kategori kan slettes',S.cats.length===3,S.cats.map(c=>c.id).join(''));
while(S.cats.length<MAX_CATS)addCat();
addCat();
t(`Taket er ${MAX_CATS} kategorier`,S.cats.length===MAX_CATS,`${S.cats.length}`);
// generering med 5 kategorier
nyTropp();
S.cats=[];['a','b','c','d','e'].forEach((id,i)=>S.cats.push({id,name:'K'+id,names:[]}));
Array.from({length:20},(_,i)=>'P'+i).forEach((n,i)=>S.cats[i%5].names.push(n));
const folk=S.cats.flatMap(c=>c.names.map(n=>({name:n,cat:c.id})));
setPrior(20,5);buildCoMatrix(folk);
const g5=buildGroups(folk,4,5);
t('Generering virker med 5 kategorier',!!g5&&g5.flat().length===20,g5?`${g5.length} lag`:'null');
const spredning=['a','b','c','d','e'].map(c=>{const k=g5.map(x=>x.filter(p=>p.cat===c).length);return Math.max(...k)-Math.min(...k);});
t('Alle fem kategoriene fordeles jevnt',Math.max(...spredning)<=1,`maks differanse ${Math.max(...spredning)}`);

console.log('\n── 3. Arkivet husker hvem som satt over ──');
nyTropp();
S.excluded=new Set(['Frida','Even']);
recordGen([[{name:'Ada',cat:'a'},{name:'Bo',cat:'b'}],[{name:'Cato',cat:'c'},{name:'Dina',cat:'a'}]],'2026-08-16');
t('Utelatte lagres i arkivoppføringen',JSON.stringify(S.archive[0].excluded.sort())==='["Even","Frida"]',JSON.stringify(S.archive[0].excluded));
S.excluded=new Set();
recordGen([[{name:'Ada',cat:'a'},{name:'Bo',cat:'b'},{name:'Even',cat:'b'}],[{name:'Cato',cat:'c'},{name:'Dina',cat:'a'},{name:'Frida',cat:'c'}]],'2026-08-17');
t('Ingen utelatte gir tom liste',S.archive[0].excluded.length===0);

console.log('\n── 4. Aldring av historikk ──');
{
  nyTropp();
  const navn=Array.from({length:8},(_,i)=>'S'+i);
  S.cats=[{id:'a',name:'A',names:navn.slice(0,4)},{id:'b',name:'B',names:navn.slice(4)}];
  // 40 gamle økter der S0+S1 alltid var sammen, så 10 ferske der de aldri var det
  for(let o=0;o<40;o++) S.archive.push({id:o,matchDate:'2025-01-'+String(1+o%28).padStart(2,'0'),
    groups:[[{name:'S0',cat:'a'},{name:'S1',cat:'a'},{name:'S2',cat:'a'},{name:'S3',cat:'a'}],
            [{name:'S4',cat:'b'},{name:'S5',cat:'b'},{name:'S6',cat:'b'},{name:'S7',cat:'b'}]],excluded:[]});
  for(let o=0;o<10;o++) S.archive.push({id:100+o,matchDate:'2026-08-'+String(1+o).padStart(2,'0'),
    groups:[[{name:'S0',cat:'a'},{name:'S4',cat:'b'},{name:'S2',cat:'a'},{name:'S6',cat:'b'}],
            [{name:'S1',cat:'a'},{name:'S5',cat:'b'},{name:'S3',cat:'a'},{name:'S7',cat:'b'}]],excluded:[]});
  rebuildStatsFromArchive();
  const folk=navn.map((n,i)=>({name:n,cat:i<4?'a':'b'}));
  buildCoMatrix(folk);
  const s0=folk[0],s1=folk[1],s0b=folk[0],s4=folk[4];
  const råS0S1=gco('S0','S1'), råS0S4=gco('S0','S4');
  const vektetS0S1=co(s0,s1), vektetS0S4=co(s0b,s4);
  console.log(`   S0+S1 (40 gamle økter sammen): rått ${råS0S1}, vektet ${vektetS0S1.toFixed(1)}`);
  console.log(`   S0+S4 (10 ferske økter sammen): rått ${råS0S4}, vektet ${vektetS0S4.toFixed(1)}`);
  t('Rått teller den gamle historikken tyngst',råS0S1>råS0S4,`${råS0S1} mot ${råS0S4}`);
  // Aldring betyr ikke at ferskt alltid vinner på sum: 40 økter er 40 økter.
  // Den skal derimot krympe de gamles overtak kraftig.
  const råForhold=råS0S1/råS0S4, vektetForhold=vektetS0S1/vektetS0S4;
  console.log(`   overtak til den gamle historikken: rått ${råForhold.toFixed(1)}x, vektet ${vektetForhold.toFixed(1)}x`);
  t('Aldringen mer enn halverer den gamle historikkens overtak',vektetForhold<råForhold/2,
    `${råForhold.toFixed(1)}x -> ${vektetForhold.toFixed(1)}x`);
  // og andelen, som er det algoritmen faktisk styrer etter
  const nevner=copp(s0,s1);
  console.log(`   andel S0+S1: rått ${(råS0S1/50*100).toFixed(0)} %, vektet ${(vektetS0S1/nevner*100).toFixed(0)} %`);
  t('Andelen for det gamle paret trekkes ned mot de ferske',vektetS0S1/nevner < råS0S1/50 - .1,
    `${(råS0S1/50*100).toFixed(0)} % -> ${(vektetS0S1/nevner*100).toFixed(0)} %`);
  t('Statistikkfanen viser fortsatt råtallene',gco('S0','S1')===40&&gopp('S0','S1')===50,`${gco('S0','S1')} av ${gopp('S0','S1')}`);
  // Med likt antall økter skal det ferske veie tyngst
  S.archive=[];
  for(let o=0;o<10;o++) S.archive.push({id:o,matchDate:'2025-01-'+String(1+o).padStart(2,'0'),
    groups:[[{name:'S0',cat:'a'},{name:'S1',cat:'a'}],[{name:'S4',cat:'b'},{name:'S5',cat:'b'}]],excluded:[]});
  for(let o=0;o<10;o++) S.archive.push({id:100+o,matchDate:'2026-08-'+String(1+o).padStart(2,'0'),
    groups:[[{name:'S0',cat:'a'},{name:'S4',cat:'b'}],[{name:'S1',cat:'a'},{name:'S5',cat:'b'}]],excluded:[]});
  buildCoMatrix(folk);
  console.log(`   likt antall økter: gammelt par ${co(folk[0],folk[1]).toFixed(1)}, ferskt par ${co(folk[0],folk[4]).toFixed(1)}`);
  t('Ved likt antall økter veier de ferske tyngst',co(folk[0],folk[4])>co(folk[0],folk[1]),
    `${co(folk[0],folk[4]).toFixed(1)} mot ${co(folk[0],folk[1]).toFixed(1)}`);

  // uten arkiv faller vi tilbake på flate tall
  const arkiv=S.archive; S.archive=[];
  buildCoMatrix(folk);
  t('Uten arkiv brukes de flate tallene',co(folk[0],folk[1])===40,`${co(folk[0],folk[1])}`);
  S.archive=arkiv;
}
console.log(`\n${pass} bestått, ${fail} feilet`);
