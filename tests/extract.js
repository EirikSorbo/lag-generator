// Trekker app-koden ut av index.html og gjør den kjørbar i Node.
// Appen er én HTML-fil uten byggsteg, så testene henter logikken herfra i
// stedet for at koden må dupliseres. DOM-avhengige deler stubbes.
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROT, 'index.html'), 'utf8');

const i = src.lastIndexOf('<script>');
const j = src.lastIndexOf('</script>');
let kode = src.slice(i + 8, j);

// Kutt bort oppstarten nederst: den vil røre DOM-en og localStorage
const kutt = kode.indexOf('// ── Global lukking ──');
if (kutt < 0) throw new Error('fant ikke kuttpunktet «Global lukking» i index.html');
kode = kode.slice(0, kutt);

// showToast byttes ut så testene kan lese meldingene
const patched = kode.replace(
  /function showToast\(msg,type='err'\)\{[^}]*\}/,
  "function showToast(msg,type='err'){global.toastLog.push(msg);}"
);
if (patched === kode) throw new Error('klarte ikke bytte ut showToast');

const stub = `
const el={classList:{add(){},remove(){},toggle(){},contains(){return false}},style:{},textContent:'',innerHTML:'',value:'',
  focus(){},select(){},setAttribute(){},setSelectionRange(){},
  getBoundingClientRect(){return{left:0,top:0,bottom:0,right:0}},offsetWidth:0,offsetHeight:0,appendChild(){},removeChild(){}};
global.document={getElementById:()=>el,querySelectorAll:()=>[],createElement:()=>el,
  body:{classList:{toggle(){}},appendChild(){},removeChild(){}},addEventListener(){}};
global.window={innerWidth:1000,innerHeight:800};
global.navigator={};
global.localStorage={_d:{},getItem(k){return this._d[k]===undefined?null:this._d[k]},
  setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}};
global.confirm=()=>true;
global.toastLog=[];
`;

const eksport = `
module.exports={S,buildCoMatrix,co,copp,gco,gopp,ck,pairVal,setPrior,hashKey,displayOrder,
  apartMap,apartGroups,constraintsOk,canPlace,renamePlayer,addCat,removeCat,applyCatColors,
  catOrder,MAX_CATS,CAT_PALETTE,HALVERING,allNames,addPoolName,harHistorikk,calcGroups,
  nextCatColor,getForcedConstraints,bindingComponents,tryGenerate,coVarScore,coStats,
  varianceOf,swapDelta,localSearch,catBalanceScore,buildGroups,generateTeams,recordGen,
  rebuildStatsFromArchive,saveToStats,teamsAsText,pruneBindings,movePlayerCat,activePeople,sortGroup};
`;

fs.writeFileSync(path.join(__dirname, 'app.js'), stub + patched + eksport);
if (require.main === module) console.log('tests/app.js bygget fra index.html');
