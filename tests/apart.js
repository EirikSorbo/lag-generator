const A=require('./app.js');
const {S,ck,buildGroups,buildCoMatrix,setPrior,constraintsOk,apartMap,apartGroups,coVarScore,catBalanceScore,bindingComponents,getForcedConstraints,recordGen}=A;
let pass=0,fail=0;
const t=(n,ok,i='')=>{ok?pass++:fail++;console.log(`${ok?'  OK  ':' FEIL '} ${n}${i?'  '+i:''}`);};
const NAVN=['Ada','Bo','Cato','Dina','Even','Frida','Geir','Hanne','Ivar','Jon','Kari','Lise'];
function nyTropp(){
  S.cats=[{id:'a',name:'A',names:[]},{id:'b',name:'B',names:[]},{id:'c',name:'C',names:[]}];
  NAVN.forEach((n,i)=>S.cats[i%3].names.push(n));
  S.coOcc={};S.opp={};S.genCount=0;S.archive=[];S.bindings=[];S.apart=[];S.excluded=new Set();
}
function historikk(){for(let i=0;i<12;i++)for(let j=i+1;j<12;j++){S.coOcc[ck(NAVN[i],NAVN[j])]=Math.floor(Math.random()*4);S.opp[ck(NAVN[i],NAVN[j])]=8;}S.genCount=8;}
const mk=()=>S.cats.flatMap(c=>c.names.filter(n=>!S.excluded.has(n)).map(n=>({name:n,cat:c.id})));
function gen(ng,ms){
  const people=mk(); setPrior(people.length,ms); buildCoMatrix(people);
  let best=null,bs=Infinity;
  for(let i=0;i<5;i++){const g=buildGroups(people,ng,ms);if(!g||!constraintsOk(g))continue;
    const s=coVarScore(g)+catBalanceScore(g)*10000;if(s<bs){bs=s;best=g;}}
  return best;
}
const lagAv=(g,navn)=>g.findIndex(x=>x.some(p=>p.name===navn));

// 1. Enkelt par skal holdes fra hverandre
nyTropp();historikk();S.apart=[['Ada','Bo']];
let brudd=0,tomme=0;
for(let r=0;r<200;r++){const g=gen(3,4);if(!g){tomme++;continue;}if(lagAv(g,'Ada')===lagAv(g,'Bo'))brudd++;}
t('Ada og Bo havner aldri på samme lag',brudd===0&&tomme===0,`brudd ${brudd}, mislykket ${tomme} av 200`);

// 2. Tre som alle skal fra hverandre (= ett på hvert av tre lag)
nyTropp();historikk();S.apart=[['Ada','Bo','Cato']];
brudd=0;tomme=0;
for(let r=0;r<200;r++){const g=gen(3,4);if(!g){tomme++;continue;}
  const lag=[lagAv(g,'Ada'),lagAv(g,'Bo'),lagAv(g,'Cato')];
  if(new Set(lag).size!==3)brudd++;}
t('Tre spillere fordeles på hvert sitt lag',brudd===0&&tomme===0,`brudd ${brudd}, mislykket ${tomme} av 200`);

// 3. Binding og «ikke sammen» samtidig
nyTropp();historikk();S.bindings=[['Ada','Dina']];S.apart=[['Ada','Bo'],['Dina','Cato']];
brudd=0;tomme=0;
for(let r=0;r<200;r++){const g=gen(3,4);if(!g){tomme++;continue;}
  if(lagAv(g,'Ada')!==lagAv(g,'Dina'))brudd++;
  if(lagAv(g,'Ada')===lagAv(g,'Bo'))brudd++;
  if(lagAv(g,'Dina')===lagAv(g,'Cato'))brudd++;}
t('Binding og «ikke sammen» holder samtidig',brudd===0&&tomme===0,`brudd ${brudd}, mislykket ${tomme} av 200`);

// 4. Mange krav samtidig
nyTropp();historikk();S.apart=[['Ada','Bo'],['Cato','Dina'],['Even','Frida'],['Geir','Hanne'],['Ivar','Jon']];
brudd=0;tomme=0;
for(let r=0;r<100;r++){const g=gen(2,6);if(!g){tomme++;continue;}
  for(const [a,b] of S.apart) if(lagAv(g,a)===lagAv(g,b))brudd++;}
t('Fem par holdes fra hverandre på to lag',brudd===0&&tomme===0,`brudd ${brudd}, mislykket ${tomme} av 100`);

// 5. Utelatt spiller krymper kravet
nyTropp();S.apart=[['Ada','Bo','Cato']];S.excluded=new Set(['Cato']);
const grupper=apartGroups(new Set(mk().map(p=>p.name)));
t('Utelatt spiller faller ut av kravet',JSON.stringify(grupper)==='[["Ada","Bo"]]',JSON.stringify(grupper));

// 6. Alle spillere kommer med
nyTropp();historikk();S.apart=[['Ada','Bo'],['Cato','Dina']];
let feil=0;
for(let r=0;r<100;r++){const g=gen(3,4);if(!g){feil++;continue;}
  const n=g.flat().map(p=>p.name);if(n.length!==12||new Set(n).size!==12)feil++;}
t('Ingen spillere forsvinner',feil===0,`avvik ${feil}/100`);

// 7. Umulig krav skal gi null, ikke et ugyldig svar
nyTropp();historikk();S.apart=[['Ada','Bo','Cato','Dina']];
let ugyldig=0,nullSvar=0;
for(let r=0;r<50;r++){const g=gen(3,4);if(!g){nullSvar++;continue;}if(!constraintsOk(g))ugyldig++;}
t('Fire som skal fra hverandre på tre lag gir ingen løsning (ikke et ugyldig svar)',ugyldig===0&&nullSvar===50,`ugyldige ${ugyldig}, null ${nullSvar}/50`);

// 8. Kategoribalansen overlever kravene
nyTropp();historikk();S.apart=[['Ada','Bo'],['Cato','Dina']];
let ubal=0;
for(let r=0;r<100;r++){const g=gen(3,4);if(!g)continue;
  for(const c of ['a','b','c']){const cnt=g.map(x=>x.filter(p=>p.cat===c).length);
    if(Math.max(...cnt)-Math.min(...cnt)>1)ubal++;}}
t('Kategoriene er fortsatt jevnt fordelt',ubal===0,`avvik ${ubal}/300`);
// 9. Etter en sesong har «ikke sammen»-paret null samspill, og var derfor det
//    automatiske dyttet plukket ut som «minst sammen». Da ble lagene umulige.
nyTropp();S.apart=[['Ada','Bo','Cato']];
for(let o=0;o<15;o++){
  const g=gen(3,4);
  if(g)recordGen(g.map(x=>x.map(p=>({name:p.name,cat:p.cat}))),'2026-08-'+String(1+o).padStart(2,'0'));
}
let mislykket=0,brudd2=0;
for(let r=0;r<300;r++){
  const g=gen(3,4);
  if(!g){mislykket++;continue;}
  if(new Set(['Ada','Bo','Cato'].map(n=>g.findIndex(x=>x.some(p=>p.name===n)))).size!==3)brudd2++;
}
t('Med historikk der kravparet aldri er sammen: genererer fortsatt',mislykket===0,`mislykket ${mislykket}/300`);
t('...og kravet holder',brudd2===0,`brudd ${brudd2}/300`);
{const {together}=getForcedConstraints(mk());
 const am=apartMap(new Set(mk().map(p=>p.name)));
 const dyttParet=together.length?together[0]:null;
 const dytterSammenForbudte=dyttParet&&am.get(dyttParet[0].name)&&am.get(dyttParet[0].name).has(dyttParet[1].name);
 t('Dyttet velger aldri et par som skal holdes fra hverandre',!dytterSammenForbudte,
   dyttParet?`valgte ${dyttParet[0].name}+${dyttParet[1].name}`:'ingen');}

console.log(`\n${pass} bestått, ${fail} feilet`);
