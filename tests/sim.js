const {S,ck,buildGroups,buildCoMatrix,constraintsOk,coVarScore,catBalanceScore,recordGen}=require('./app.js');
function sesong(okter,N,lag){
  S.cats=[{id:'a',name:'A',names:[]},{id:'b',name:'B',names:[]},{id:'c',name:'C',names:[]}];
  const navn=Array.from({length:N},(_,i)=>'P'+String(i).padStart(2,'0'));
  navn.forEach((n,i)=>S.cats[i%3].names.push(n));
  S.coOcc={};S.opp={};S.genCount=0;S.archive=[];S.bindings=[];S.apart=[];S.excluded=new Set();
  for(let o=0;o<okter;o++){
    const people=navn.map((n,i)=>({name:n,cat:['a','b','c'][i%3]}));
    buildCoMatrix(people);
    let best=null,bs=Infinity;
    for(let i=0;i<5;i++){const g=buildGroups(people,lag,Math.ceil(N/lag));if(!g||!constraintsOk(g))continue;
      const s=coVarScore(g)+catBalanceScore(g)*10000;if(s<bs){bs=s;best=g;}}
    recordGen(best.map(g=>g.map(p=>({name:p.name,cat:p.cat}))),'2026-01-01');
  }
  const tall=[];
  for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)tall.push(S.coOcc[ck(navn[i],navn[j])]||0);
  tall.sort((a,b)=>a-b);
  const snitt=tall.reduce((a,b)=>a+b,0)/tall.length;
  const varians=tall.reduce((s,v)=>s+(v-snitt)**2,0)/tall.length;
  const aldri=tall.filter(v=>v===0).length;
  return{min:tall[0],max:tall[tall.length-1],snitt:snitt.toFixed(2),varians:varians.toFixed(2),aldri,par:tall.length};
}
console.log('16 spillere, 4 lag:');
for(const o of [5,10,20,30]){
  const r=sesong(o,16,4);
  console.log(`  ${String(o).padStart(2)} økter: hvert par har spilt sammen ${r.min}-${r.max} ganger (snitt ${r.snitt}, varians ${r.varians}), aldri sammen: ${r.aldri}/${r.par}`);
}
console.log('\n24 spillere, 3 lag:');
for(const o of [10,20,30]){
  const r=sesong(o,24,3);
  console.log(`  ${String(o).padStart(2)} økter: ${r.min}-${r.max} ganger (snitt ${r.snitt}, varians ${r.varians}), aldri sammen: ${r.aldri}/${r.par}`);
}
