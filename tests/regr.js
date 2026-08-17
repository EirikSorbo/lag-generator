const A=require('./app.js');
const {S,ck,bindingComponents,constraintsOk,buildGroups,coVarScore,catBalanceScore,tryGenerate,buildCoMatrix,setPrior}=A;
const NAV=['Ada','Bo','Cato','Dina','Even','Frida','Geir','Hanne','Ivar','Jon','Kari','Lise'];
function setup(){
  S.cats=[{id:'a',name:'A',names:[]},{id:'b',name:'B',names:[]},{id:'c',name:'C',names:[]}];
  NAV.forEach((n,i)=>S.cats[i%3].names.push(n));
  S.excluded=new Set();S.bindings=[];S.coOcc={};S.archive=[];S.genCount=0;S.currentGroups=[];
}
function historikk(navn){S.coOcc={};for(let i=0;i<navn.length;i++)for(let j=i+1;j<navn.length;j++)S.coOcc[ck(navn[i],navn[j])]=Math.floor(Math.random()*4);}
function gen(people,ng,ms){
  setPrior(people.length,ms); buildCoMatrix(people);   // som generateTeams gjør
  let best=null,bs=Infinity;
  for(let i=0;i<5;i++){const g=buildGroups(people,ng,ms);if(!g||!constraintsOk(g))continue;
    const s=coVarScore(g)+catBalanceScore(g)*10000;if(s<bs){bs=s;best=g;}}
  return best;
}
const mk=()=>S.cats.flatMap(c=>c.names.filter(n=>!S.excluded.has(n)).map(n=>({name:n,cat:c.id})));
let pass=0,fail=0;
const t=(navn,ok,info='')=>{ok?pass++:fail++;console.log(`${ok?'  OK  ':' FEIL '} ${navn}${info?'  '+info:''}`);};

// 1: binding innen samme kategori, med historikk
setup();historikk(NAV);S.bindings=[['Ada','Dina']]; // begge kat a
let brutt=0;for(let r=0;r<100;r++){const g=gen(mk(),3,4);if(!g||!g.some(x=>x.some(p=>p.name==='Ada')&&x.some(p=>p.name==='Dina')))brutt++;}
t('Binding i samme kategori holder (med historikk)',brutt===0,`brutt ${brutt}/100`);

// 2: binding på tvers av kategorier, med historikk
setup();historikk(NAV);S.bindings=[['Ada','Bo']];
brutt=0;for(let r=0;r<100;r++){const g=gen(mk(),3,4);if(!g||!g.some(x=>x.some(p=>p.name==='Ada')&&x.some(p=>p.name==='Bo')))brutt++;}
t('Binding på tvers av kategorier holder (med historikk)',brutt===0,`brutt ${brutt}/100`);

// 3: én utelatt spiller i en 3-binding -> de to andre skal fortsatt holde sammen
setup();historikk(NAV);S.bindings=[['Ada','Bo','Cato']];S.excluded=new Set(['Cato']);
brutt=0;for(let r=0;r<100;r++){const g=gen(mk(),3,4);if(!g||!g.some(x=>x.some(p=>p.name==='Ada')&&x.some(p=>p.name==='Bo')))brutt++;}
t('Utelatt spiller krymper bindingen, opphever den ikke',brutt===0,`brutt ${brutt}/100`);

// 4: overlappende bindinger slås sammen
setup();historikk(NAV);S.bindings=[['Ada','Bo'],['Bo','Cato']];
brutt=0;for(let r=0;r<100;r++){const g=gen(mk(),3,4);if(!g)continue;
  const grp=g.find(x=>x.some(p=>p.name==='Bo'));
  if(!grp.some(p=>p.name==='Cato')||!grp.some(p=>p.name==='Ada'))brutt++;}
t('Overlappende bindinger slås sammen til én gruppe',brutt===0,`brutt ${brutt}/100`);

// 5: komponent-logikken direkte
setup();S.bindings=[['Ada','Bo'],['Bo','Cato'],['Dina','Even']];
const comps=bindingComponents(new Set(NAV)).map(c=>c.slice().sort().join('+')).sort();
t('bindingComponents slår sammen riktig',JSON.stringify(comps)===JSON.stringify(['Ada+Bo+Cato','Dina+Even']),comps.join(' | '));
// Bo utelatt: begge Bo-reglene blir tomme, og Ada/Cato var aldri bundet direkte
const comps2=bindingComponents(new Set(NAV.filter(n=>n!=='Bo'))).map(c=>c.slice().sort().join('+')).sort();
t('Binding via en fraværende spiller smitter ikke over',JSON.stringify(comps2)===JSON.stringify(['Dina+Even']),comps2.join(' | '));
// men en 3-binding som mister ett medlem skal bestå for resten
S.bindings=[['Ada','Bo','Cato']];
const comps3=bindingComponents(new Set(NAV.filter(n=>n!=='Bo'))).map(c=>c.slice().sort().join('+')).sort();
t('3-binding som mister ett medlem består for resten',JSON.stringify(comps3)===JSON.stringify(['Ada+Cato']),comps3.join(' | '));

// 6: alle spillere kommer med, ingen forsvinner
setup();historikk(NAV);S.bindings=[['Ada','Bo']];
let tapt=0;for(let r=0;r<100;r++){const g=gen(mk(),3,4);if(!g){tapt++;continue;}
  const n=g.flat().map(p=>p.name).sort();if(n.length!==12||new Set(n).size!==12)tapt++;}
t('Alle 12 spillere er med i hver generering',tapt===0,`avvik ${tapt}/100`);

// 7: kategoribalanse fortsatt ivaretatt
setup();historikk(NAV);
let ubal=0;for(let r=0;r<100;r++){const g=gen(mk(),3,4);if(!g)continue;
  for(const c of ['a','b','c']){const cnt=g.map(x=>x.filter(p=>p.cat===c).length);
    if(Math.max(...cnt)-Math.min(...cnt)>1)ubal++;}}
t('Kategoriene er jevnt fordelt (maks 1 i differanse)',ubal===0,`avvik ${ubal}/300`);

console.log(`\n${pass} bestått, ${fail} feilet`);
