const A=require('./app.js');
const {S,ck,gco,gopp,buildGroups,buildCoMatrix,setPrior,constraintsOk,coVarScore,catBalanceScore,
       recordGen,rebuildStatsFromArchive,displayOrder,hashKey,coStats,varianceOf}=A;
let pass=0,fail=0;
const t=(n,ok,i='')=>{ok?pass++:fail++;console.log(`${ok?'  OK  ':' FEIL '} ${n}${i?'  '+i:''}`);};

const NAVN=['Ada','Bo','Cato','Dina','Even','Frida','Geir','Hanne','Ivar','Jon','Kari','Lise'];
function nyTropp(){
  S.cats=[{id:'a',name:'A',names:[]},{id:'b',name:'B',names:[]},{id:'c',name:'C',names:[]}];
  NAVN.forEach((n,i)=>S.cats[i%3].names.push(n));
  S.coOcc={};S.opp={};S.genCount=0;S.archive=[];S.bindings=[];S.excluded=new Set();
}
// Kjører en sesong der «sjelden» bare er med annenhver gang
function sesong(okter, sjelden){
  nyTropp();
  for(let o=0;o<okter;o++){
    const med = NAVN.filter(n => !(n===sjelden && o%2===1));
    const people = med.map(n=>({name:n,cat:S.cats.find(c=>c.names.includes(n)).id}));
    const ng=3, ms=Math.ceil(people.length/ng);
    setPrior(people.length,ms); buildCoMatrix(people);
    let best=null,bs=Infinity;
    for(let i=0;i<5;i++){const g=buildGroups(people,ng,ms);if(!g||!constraintsOk(g))continue;
      const s=coVarScore(g)+catBalanceScore(g)*10000;if(s<bs){bs=s;best=g;}}
    recordGen(best.map(g=>g.map(p=>({name:p.name,cat:p.cat}))),'2026-01-01');
  }
}
const snitt=a=>a.reduce((x,y)=>x+y,0)/a.length;

// ── 1. Oppmøtetall registreres riktig ──
sesong(20,'Lise');
const lisePar = NAVN.filter(n=>n!=='Lise');
t('Lise var med i 10 av 20 økter', gopp('Lise','Ada')===10, `felles økter: ${gopp('Lise','Ada')}`);
t('De faste har 20 felles økter', gopp('Ada','Bo')===20, `${gopp('Ada','Bo')}`);

// ── 2. Rå antall er skjeve, andelene er rettferdige ──
const antallLise = snitt(lisePar.map(n=>gco('Lise',n)));
const antallAndre = snitt(NAVN.filter(n=>n!=='Lise'&&n!=='Ada').map(n=>gco('Ada',n)));
const andelLise = snitt(lisePar.map(n=>gco('Lise',n)/gopp('Lise',n)));
const andelAlle = snitt(NAVN.flatMap((a,i)=>NAVN.slice(i+1).map(b=>gco(a,b)/gopp(a,b))));
console.log(`\n  Lise (10 av 20 økter):  ${antallLise.toFixed(1)} ganger i snitt, andel ${(andelLise*100).toFixed(0)} %`);
console.log(`  En som møter alltid:    ${antallAndre.toFixed(1)} ganger i snitt, andel ${(andelAlle*100).toFixed(0)} %\n`);
t('Råtallet for Lise er omtrent halvparten (som forventet)', antallLise < antallAndre*0.75, `${antallLise.toFixed(1)} mot ${antallAndre.toFixed(1)}`);
t('Andelen hennes ligger på linje med de andre (innen 6 prosentpoeng)',
  Math.abs(andelLise-andelAlle) < 0.06, `${(andelLise*100).toFixed(0)} % mot ${(andelAlle*100).toFixed(0)} %`);

// ── 3. Ingen blir glemt eller overpriotert ──
const alleAndeler = NAVN.flatMap((a,i)=>NAVN.slice(i+1).map(b=>gco(a,b)/gopp(a,b)));
t('Alle par har spilt sammen minst én gang', Math.min(...alleAndeler) > 0, `laveste andel ${(Math.min(...alleAndeler)*100).toFixed(0)} %`);
t('Ingen par klumper seg (høyeste andel under 60 %)', Math.max(...alleAndeler) < 0.6, `høyeste ${(Math.max(...alleAndeler)*100).toFixed(0)} %`);

// ── 4. Ved fullt oppmøte er scoren en ren omskalering av den gamle ──
{
  nyTropp();
  const people=NAVN.map((n,i)=>({name:n,cat:['a','b','c'][i%3]}));
  for(let i=0;i<12;i++)for(let j=i+1;j<12;j++){S.coOcc[ck(NAVN[i],NAVN[j])]=Math.floor(Math.random()*5);S.opp[ck(NAVN[i],NAVN[j])]=9;}
  S.genCount=9; setPrior(12,4); buildCoMatrix(people);
  const grupper=[[],[],[]]; people.forEach((p,i)=>grupper[i%3].push(p));
  const D=9+1+4;
  // gammel score = varians av (antall + sammen); ny = den delt på D²
  const gammel=(()=>{const all=grupper.flat(),gof=[];grupper.forEach((g,i)=>g.forEach(()=>gof.push(i)));
    const v=[];for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)v.push(gco(all[i].name,all[j].name)+(gof[i]===gof[j]?1:0));
    const m=snitt(v);return snitt(v.map(x=>(x-m)*(x-m)));})();
  const ny=coVarScore(grupper);
  t('Fullt oppmøte gir samme rangering som før (score = gammel/D²)', Math.abs(ny-gammel/(D*D))<1e-12, `${ny.toExponential(3)} mot ${(gammel/(D*D)).toExponential(3)}`);
}

// ── 5. Stokkingen i delevisning ──
{
  S.shareMode=true;
  const g=[{name:'Ada',cat:'a'},{name:'Bo',cat:'a'},{name:'Cato',cat:'b'},{name:'Dina',cat:'b'},{name:'Even',cat:'c'}];
  const o1=displayOrder(g,777).join(','), o2=displayOrder(g,777).join(',');
  t('Samme frø gir samme rekkefølge (hopper ikke ved opptegning)', o1===o2, o1);
  const frø=Array.from({length:200},(_,i)=>displayOrder(g,i+1).join(','));
  t('Ulike frø gir ulike rekkefølger', new Set(frø).size > 20, `${new Set(frø).size} varianter av 200 frø`);
  t('Rekkefølgen er ikke kategorisortert', frø.filter(f=>f==='0,1,2,3,4').length < 20, `kategorirekkefølge i ${frø.filter(f=>f==='0,1,2,3,4').length} av 200`);
  // hver spiller skal havne på hver plass omtrent like ofte
  const plass0={}; for(let s=1;s<=3000;s++){const n=g[displayOrder(g,s)[0]].name;plass0[n]=(plass0[n]||0)+1;}
  const andeler=Object.values(plass0).map(v=>v/3000);
  t('Alle fem havner øverst omtrent like ofte', Math.max(...andeler)-Math.min(...andeler) < 0.05,
    Object.entries(plass0).map(([k,v])=>`${k} ${(v/30).toFixed(0)}%`).join(' '));
  t('Alle spillere er med etter stokking', new Set(displayOrder(g,42)).size===5);
  S.shareMode=false;
  t('Uten delevisning beholdes kategorirekkefølgen', displayOrder(g,42).join(',')==='0,1,2,3,4');
}
console.log(`\n${pass} bestått, ${fail} feilet`);
