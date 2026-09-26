// Gera SVG a partir do DOT e monta exclusivamente os arquivos públicos em dist/.
const fs = require('node:fs/promises');
const path = require('node:path');
const { instance } = require('@viz-js/viz');
const root = path.resolve(__dirname, '..');
async function build() {
  const dot = await fs.readFile(path.join(root, 'src/fluxo.dot'), 'utf8');
  const viz = await instance();
  const result = viz.render(dot, { format: 'svg', engine: 'dot' });
  if (result.status !== 'success') throw new Error(JSON.stringify(result.errors));
  let svg = result.output.slice(result.output.indexOf('<svg'));
  svg = svg.replace('<svg ', '<svg id="flow" role="img" aria-labelledby="diagram-title diagram-description" ');
  svg = svg.replace(/(<svg[^>]*>)/, '$1\n<title id="diagram-title">Fluxograma único do atendimento OmniChat do CRC</title><desc id="diagram-description">Entrada pelo WhatsApp. O agente interpreta a demanda, consulta a documentação e utiliza cinco grupos de procedimentos. Se resolver, encerra; se não resolver, encaminha ao CRC. Projetor é direcionado à Infraestrutura.</desc>');
  const commit = process.env.GITHUB_SHA || '';
  const revision = commit ? commit.slice(0, 7) : 'prévia local';
  const template = await fs.readFile(path.join(root, 'src/index.template.html'), 'utf8');
  // Conteúdo embutido permite também abrir o HTML sem servidor local.
  const css = await fs.readFile(path.join(root, 'src/styles.css'), 'utf8');
  const js = await fs.readFile(path.join(root, 'src/app.js'), 'utf8');
  const catalog = JSON.parse(await fs.readFile(path.join(root, 'src/catalog.json'), 'utf8'));
  const resources = {'fluxo.dot':dot, 'pendencias.md':await fs.readFile(path.join(root,'docs/pendencias.md'),'utf8'), 'referencias.md':await fs.readFile(path.join(root,'docs/referencias.md'),'utf8')};
  const html = template.replace('<!-- STYLES -->', `<style>${css}</style>`).replace('<!-- DIAGRAM -->', svg)
    .replace('<!-- APP -->', `<script>const RESOURCES = ${JSON.stringify(resources).replace(/</g,'\\u003c')};\nconst CATALOG = ${JSON.stringify(catalog).replace(/</g,'\\u003c')};\n${js}</script>`)
    .replaceAll('{{REVISION}}', revision);
  const dist = path.join(root, 'dist');
  await fs.rm(dist, {recursive:true, force:true});
  await fs.mkdir(dist, {recursive:true});
  await fs.writeFile(path.join(dist, 'index.html'), html);
  await fs.writeFile(path.join(root, 'index.html'), html.replace('href="historico/"','href="dist/historico/"').replace('href="pendencias.md"','href="docs/pendencias.md"').replace('href="referencias.md"','href="docs/referencias.md"').replace('href="fluxo.dot"','href="src/fluxo.dot"'));
  await fs.writeFile(path.join(dist, 'fluxo.svg'), svg);
  await fs.writeFile(path.join(dist, 'fluxo.dot'), dot);
  await fs.writeFile(path.join(dist, '.nojekyll'), '');
  await fs.copyFile(path.join(root, 'docs/pendencias.md'), path.join(dist, 'pendencias.md'));
  await fs.copyFile(path.join(root, 'docs/referencias.md'), path.join(dist, 'referencias.md'));
  await require('./history.cjs')(root,dist);
  console.log(`Build concluído: ${revision} · ${Object.keys(catalog).length} tópicos pesquisáveis`);
}
build().catch(error=>{console.error(error);process.exit(1)});
