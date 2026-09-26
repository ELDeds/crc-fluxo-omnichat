/* Navegação de um único SVG. Busca destaca e centraliza, nunca oculta áreas. */
'use strict';
const viewport=document.getElementById('viewport'), flow=document.getElementById('flow');
const search=document.getElementById('search'), results=document.getElementById('search-results');
const inspector=document.getElementById('inspector'), announce=document.getElementById('announce');
const width=flow.viewBox.baseVal.width,height=flow.viewBox.baseVal.height;
const nodes=new Map([...flow.querySelectorAll('.node')].map(el=>[el.querySelector('title').textContent,el]));
// Um tópico documental pode apontar para um bloco-resumo do SVG.
const topicNode=id=>nodes.get(CATALOG[id]?.nodeId||id);
const state={x:0,y:0,scale:1};let active=null;
flow.style.width=width+'px';flow.style.height=height+'px';document.body.classList.add('enhanced');
function paint(){flow.style.transform=`translate(${state.x}px,${state.y}px) scale(${state.scale})`;document.getElementById('zoom-level').textContent=Math.round(state.scale*100)+'%'}
function fit(){state.scale=Math.min(viewport.clientWidth/width,viewport.clientHeight/height)*.95;state.x=(viewport.clientWidth-width*state.scale)/2;state.y=(viewport.clientHeight-height*state.scale)/2;paint()}
function zoom(factor,x=viewport.clientWidth/2,y=viewport.clientHeight/2){const next=Math.max(.02,Math.min(4,state.scale*factor)),ratio=next/state.scale;state.x=x-(x-state.x)*ratio;state.y=y-(y-state.y)*ratio;state.scale=next;paint()}
function cleanHighlights(){nodes.forEach(el=>el.classList.remove('search-match','selected'))}
function hideResults(){results.hidden=true;search.setAttribute('aria-expanded','false')}
function overview(){search.value='';hideResults();cleanHighlights();inspector.hidden=true;active=null;history.replaceState(null,'',location.pathname+location.search);fit();announce.textContent='Fluxograma completo visível.'}
function normalize(text){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function findTopics(query){const q=normalize(query);if(!q)return [];return Object.entries(CATALOG).map(([id,item])=>{let title=normalize(item.title),terms=normalize([item.title,item.area,...item.aliases].join(' '));return {id,item,score:title===q?0:title.startsWith(q)?1:title.includes(q)?2:3,match:q.split(' ').every(t=>terms.includes(t))}}).filter(x=>x.match&&!!topicNode(x.id)).sort((a,b)=>a.score-b.score||a.item.title.localeCompare(b.item.title,'pt-BR'))}
function select(id,{move=true,hash=true}={}){
 const el=topicNode(id),item=CATALOG[id];if(!el||!item)return;
 nodes.forEach(n=>n.classList.remove('selected'));el.classList.add('selected');active=id;
 document.getElementById('topic-title').textContent=item.title;document.getElementById('topic-detail').textContent=item.detail;
 const list=document.getElementById('topic-sources');list.replaceChildren();item.sources.forEach(source=>{let li=document.createElement('li');li.textContent=source;list.append(li)});
 inspector.hidden=false;hideResults();
 if(move){
  // SVG group transform (including Graphviz's translation) → root coordinates.
  const rect=el.getBoundingClientRect(),vp=viewport.getBoundingClientRect();
  const cx=(rect.left-vp.left+rect.width/2-state.x)/state.scale,cy=(rect.top-vp.top+rect.height/2-state.y)/state.scale;
  const small=viewport.clientWidth<700;const space=small?viewport.clientWidth:Math.max(300,viewport.clientWidth-350);
  const newScale=Math.min(1.5,Math.max(.6,Math.min(space*.65/(rect.width/state.scale),viewport.clientHeight*.35/(rect.height/state.scale))));
  state.scale=newScale;state.x=(small?viewport.clientWidth*.5:space*.5)-cx*newScale;state.y=viewport.clientHeight*(small?.7:.5)-cy*newScale;paint();
 }
 if(hash)history.replaceState(null,'','#'+encodeURIComponent(id));announce.textContent='Tópico localizado: '+item.title;
}
function renderResults(){const matches=findTopics(search.value);cleanHighlights();results.replaceChildren();if(!normalize(search.value)){hideResults();return}
 matches.forEach(({id})=>topicNode(id).classList.add('search-match'));
 if(!matches.length){let p=document.createElement('p');p.textContent='Nenhum tópico encontrado. Tente senha, MFA, VPN, LAB ou projetor.';results.append(p)}
 matches.slice(0,15).forEach(({id,item})=>{let b=document.createElement('button');b.type='button';b.append(document.createTextNode(item.title));let sub=document.createElement('small');sub.textContent=item.area;b.append(sub);b.onclick=()=>select(id);results.append(b)});
 results.hidden=false;search.setAttribute('aria-expanded','true');announce.textContent=matches.length+' tópicos encontrados.';
}
search.addEventListener('input',renderResults);search.addEventListener('focus',()=>{if(search.value)renderResults()});search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();let first=findTopics(search.value)[0];if(first)select(first.id)}else if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus()}else if(e.key==='Escape'){hideResults();search.blur()}});
results.addEventListener('keydown',e=>{let buttons=[...results.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}else if(e.key==='Escape'){hideResults();search.focus()}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.search-box'))hideResults()});
// Pan e pinch-to-zoom por Pointer Events; nenhuma seleção altera os nós do fluxo.
const pointers=new Map();let moved=false,start=null;
viewport.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;moved=false;start={x:e.clientX,y:e.clientY};pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging')});
viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const before=[...pointers.values()],old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)moved=true;
 if(pointers.size===1){state.x+=e.clientX-old.x;state.y+=e.clientY-old.y;paint()}else if(pointers.size===2){moved=true;const after=[...pointers.values()],distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),d=distance(before),box=viewport.getBoundingClientRect();if(d>0){let x=(before[0].x+before[1].x)/2,y=(before[0].y+before[1].y)/2;zoom(distance(after)/d,x-box.left,y-box.top);state.x+=(after[0].x+after[1].x)/2-x;state.y+=(after[0].y+after[1].y)/2-y;paint()}}});
viewport.addEventListener('pointerup',e=>{if(!moved&&pointers.size===1){let node=document.elementFromPoint(e.clientX,e.clientY)?.closest('.node');if(node)select(node.querySelector('title').textContent,{move:false})}pointers.delete(e.pointerId);if(!pointers.size)viewport.classList.remove('dragging')});
for(const event of ['pointercancel','lostpointercapture'])viewport.addEventListener(event,e=>{pointers.delete(e.pointerId);if(!pointers.size)viewport.classList.remove('dragging')});
viewport.addEventListener('wheel',e=>{e.preventDefault();const b=viewport.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-b.left,e.clientY-b.top)},{passive:false});
for(const [id,el] of nodes){if(!CATALOG[id])continue;el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',CATALOG[id].title);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();select(id)}})}
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.key==='/'){e.preventDefault();search.focus()}else if(e.key==='0'){overview()}else if(e.key==='+'||e.key==='='){zoom(1.25)}else if(e.key==='-'){zoom(1/1.25)}else if(e.key==='Escape'){inspector.hidden=true;hideResults()}else if(e.target===viewport&&e.key.startsWith('Arrow')){e.preventDefault();state.x+=e.key==='ArrowLeft'?60:e.key==='ArrowRight'?-60:0;state.y+=e.key==='ArrowUp'?60:e.key==='ArrowDown'?-60:0;paint()}});
document.getElementById('overview').onclick=overview;document.getElementById('zoom-in').onclick=()=>zoom(1.25);document.getElementById('zoom-out').onclick=()=>zoom(1/1.25);document.getElementById('close-inspector').onclick=()=>{inspector.hidden=true};
document.getElementById('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{announce.textContent='Tela cheia indisponível neste navegador. Use a opção de tela cheia do navegador.'}};
document.getElementById('print').onclick=()=>window.print();
document.getElementById('export-svg').onclick=()=>{let copy=flow.cloneNode(true);copy.removeAttribute('style');copy.setAttribute('width',width);copy.setAttribute('height',height);copy.querySelectorAll('.selected,.search-match').forEach(n=>n.classList.remove('selected','search-match'));let url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));let a=document.createElement('a');a.href=url;a.download='omnichat-crc-fluxograma.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
function onResize(){fit();if(active)select(active,{hash:false})}new ResizeObserver(onResize).observe(viewport);
function openHash(){let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}if(CATALOG[id])select(id,{hash:false})}
window.addEventListener('hashchange',openHash);
requestAnimationFrame(()=>{fit();openHash()});

// A cópia baixada mantém referências e fonte acessíveis sem arquivos adjacentes.
if(location.protocol==='file:'){document.querySelectorAll('footer a').forEach(link=>{const name=link.getAttribute('href').split('/').pop();if(!RESOURCES[name])return;link.addEventListener('click',e=>{e.preventDefault();const url=URL.createObjectURL(new Blob([RESOURCES[name]],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)})})}
