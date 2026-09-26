// Publica cópias congeladas. Nunca reconstrói versões antigas usando fontes atuais.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports=async function history(root,dist){
 const items=JSON.parse(await fs.readFile(path.join(root,'archive/manifest.json'),'utf8'));
 for(const item of items){
  const source=path.join(root,'archive',item.slug),target=path.join(dist,'versoes',item.slug);
  const raw=await fs.readFile(path.join(source,'fluxo.html'));
  if(crypto.createHash('sha256').update(raw).digest('hex')!==item.sha256)throw Error('Snapshot alterado: '+item.slug);
  await fs.cp(source,target,{recursive:true});
  // O aviso fica fora do HTML original; o iframe preserva scripts, CSS e conteúdo.
  await fs.writeFile(path.join(target,'index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(item.title)} · Histórico CRC</title><style>html,body{margin:0;height:100%;font:14px Arial;color:#17354c}body{display:flex;flex-direction:column}header{padding:12px 20px;background:#fff4d9;border-bottom:1px solid #d6bd85;display:flex;gap:12px;align-items:center;flex-wrap:wrap}header p{margin:0;flex:1;min-width:240px}a{color:#135c72}iframe{border:0;width:100%;flex:1;min-height:0}</style><header><strong>${esc(item.title)}</strong><p>Versão histórica — este fluxograma não representa necessariamente o processo atual.</p><a href="../../">Ver versão atual</a><a href="../../historico/">Histórico</a></header><iframe src="fluxo.html" title="${esc(item.title)} — fluxograma interativo" allow="fullscreen"></iframe></html>`);
 }
 await fs.mkdir(path.join(dist,'historico'),{recursive:true});
 await fs.writeFile(path.join(dist,'historico/index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Histórico de versões · OmniChat CRC</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f7fa;color:#17354c;font:16px/1.55 system-ui,sans-serif}main{max-width:950px;margin:0 auto;padding:40px 24px}a{color:#12654f}h1{font-size:32px;margin:12px 0}h2{font-size:21px;margin:0}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin:28px 0}article{background:white;border:1px solid #cfdae2;border-radius:12px;padding:24px}small{color:#597082}article a{display:inline-block;margin-top:8px;font-weight:600}.note{border-left:3px solid #c8a45a;padding-left:16px}</style><main><a href="../">← Ver versão atual</a><h1>Histórico de versões</h1><p>Marcos preservados para consulta e comparação visual do atendimento OmniChat do CRC.</p><p class="note">A raiz do site apresenta a versão atual aprovada. As cópias abaixo permanecem fixas e podem conter procedimentos superados.</p><section>${items.map(i=>`<article><h2>${esc(i.title)}</h2><small>${i.date?i.date.split('-').reverse().join('/'):'Data original não registrada'}</small><p>${esc(i.description)}</p><a href="../versoes/${i.slug}/">Abrir versão →</a></article>`).join('')}</section><p><a href="../CHANGELOG.md">Consultar CHANGELOG</a></p></main></html>`);
 await fs.copyFile(path.join(root,'CHANGELOG.md'),path.join(dist,'CHANGELOG.md'));
};
