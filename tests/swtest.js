const fs=require('fs'), vm=require('vm');
const BASE='https://eiriksorbo.github.io/lag-generator/';
const abs=u=>new URL(u,BASE).href;
let pass=0,fail=0;
const t=(n,ok,i='')=>{ok?pass++:fail++;console.log(`${ok?'  OK  ':' FEIL '} ${n}${i?'  '+i:''}`);};

// ── Stubber ──
let nettPå=true, nettKall=[];
const lager=new Map();                       // cachenavn -> Map(url -> body)
const nøkkel=k=>typeof k==='string'?abs(k):k.url;
function lagCache(navn){
  if(!lager.has(navn))lager.set(navn,new Map());
  const m=lager.get(navn);
  return {
    addAll:async ks=>{for(const k of ks){if(!nettPå)throw new Error('offline');m.set(nøkkel(k),'nett:'+nøkkel(k));}},
    put:async(k,v)=>{m.set(nøkkel(k),v);return undefined;},
    match:async k=>m.get(nøkkel(k)),
    keys:async()=>[...m.keys()].map(u=>({url:u}))
  };
}
const caches={
  open:async n=>lagCache(n),
  keys:async()=>[...lager.keys()],
  delete:async n=>lager.delete(n),
  match:async k=>{for(const m of lager.values()){const v=m.get(nøkkel(k));if(v)return v;}return undefined;}
};
const lyttere={};
const self={
  addEventListener:(t,f)=>{(lyttere[t]=lyttere[t]||[]).push(f);},
  skipWaiting:async()=>'skipWaiting',
  clients:{claim:async()=>'claim'},
  location:{origin:'https://eiriksorbo.github.io'}
};
async function fetchStub(req){
  const u=nøkkel(req);
  nettKall.push(u);
  if(!nettPå)throw new TypeError('offline');
  return {ok:true,clone:()=>'nett:'+u,_body:'nett:'+u};
}
const ctx={self,caches,fetch:fetchStub,URL,Response:{error:()=>'ResponseError'},console};
ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('/Users/eiriks05/Documents/Eiriks Script/lag-generator/sw.js','utf8'),ctx);
t('sw.js kjører uten feil', !!lyttere.install && !!lyttere.activate && !!lyttere.fetch);

// hjelpere for å fyre hendelser
const fyr=async(type,ev)=>{const p=[];for(const f of lyttere[type])f({...ev,waitUntil:x=>p.push(x),respondWith:x=>{ev._svar=x;}});await Promise.all(p);return ev;};

(async()=>{
  // ── Install: appen legges i cache ──
  await fyr('install',{});
  const shell=[...lager.keys()].find(k=>k.startsWith('gf-shell'));
  const lagt=[...lager.get(shell).keys()].map(u=>u.replace(BASE,'./').replace(BASE.slice(0,-1),'.'));
  t('Install legger appen i cache', lager.get(shell).size===6, lagt.join(' '));
  t('index.html er med', [...lager.get(shell).keys()].some(u=>u.endsWith('index.html')));
  t('Ikoner og manifest er med', ['icon-192.png','icon-512.png','apple-touch-icon.png','manifest.webmanifest'].every(f=>[...lager.get(shell).keys()].some(u=>u.endsWith(f))));

  // ── Activate: gamle cacher ryddes ──
  lager.set('gf-shell-v1.20',new Map([[abs('./index.html'),'gammel']]));
  await fyr('activate',{});
  t('Gammel cacheversjon slettes', !lager.has('gf-shell-v1.20'), [...lager.keys()].join(' '));

  // ── Appen på nett: nett først ──
  nettKall=[];
  let ev=await fyr('fetch',{request:{method:'GET',url:abs('./'),mode:'navigate'}});
  let svar=await ev._svar;
  t('På nett hentes appen fra nett (så nye versjoner slår gjennom)', nettKall.length===1 && String(svar._body).startsWith('nett:'), svar._body||svar);
  await new Promise(r=>setTimeout(r,10));
  t('Ferske svar legges tilbake i cache', (await (await caches.open(shell)).match('./index.html'))!==undefined);

  // ── Appen uten nett: fra cache ──
  nettPå=false; nettKall=[];
  ev=await fyr('fetch',{request:{method:'GET',url:abs('./'),mode:'navigate'}});
  svar=await ev._svar;
  t('Uten nett svares appen fra cache', svar!==undefined && svar!=='ResponseError', String(svar));

  // ── Ikon uten nett ──
  ev=await fyr('fetch',{request:{method:'GET',url:abs('./icon-192.png'),mode:'no-cors'}});
  svar=await ev._svar;
  t('Ikoner virker uten nett', svar!==undefined, String(svar));

  // ── Skrifta: nett første gang, cache etterpå ──
  nettPå=true; nettKall=[];
  const font={method:'GET',url:'https://fonts.gstatic.com/s/sora/v1/font.woff2',mode:'cors'};
  ev=await fyr('fetch',{request:font}); await ev._svar;
  await new Promise(r=>setTimeout(r,10));
  const førsteKall=nettKall.length;
  nettKall=[];
  ev=await fyr('fetch',{request:font}); svar=await ev._svar;
  t('Skrifta hentes fra nett én gang, deretter fra cache', førsteKall===1 && nettKall.length===0, `først ${førsteKall} nettkall, så ${nettKall.length}`);
  nettPå=false; nettKall=[];
  ev=await fyr('fetch',{request:font}); svar=await ev._svar;
  t('Skrifta virker uten nett etter første gang', svar!==undefined && svar!=='ResponseError', String(svar));

  // ── POST skal ikke røres ──
  ev=await fyr('fetch',{request:{method:'POST',url:abs('./'),mode:'cors'}});
  t('POST håndteres ikke av service workeren', ev._svar===undefined);

  console.log(`\n${pass} bestått, ${fail} feilet`);
})();
