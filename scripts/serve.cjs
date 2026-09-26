// Servidor de prévia, acessível somente na máquina local.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
if(!fs.existsSync(root)){console.error('Execute npm run build primeiro.');process.exit(1)}
http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
const file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Não encontrado');return}const types={'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.dot':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data)})}).listen(4173,'127.0.0.1',()=>console.log('Prévia: http://127.0.0.1:4173'));
