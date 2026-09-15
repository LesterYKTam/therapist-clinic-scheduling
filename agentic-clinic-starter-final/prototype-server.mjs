import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
const files={'/':['index.html','text/html'],'/ui.mjs':['ui.mjs','text/javascript'],'/model.mjs':['model.mjs','text/javascript'],'/style.css':['style.css','text/css']};
createServer((req,res)=>{
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
  const asset=files[new URL(req.url,'http://localhost').pathname];
  if (!asset) {res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':`${asset[1]}; charset=utf-8`,'Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:readFileSync(new URL(`./prototype/${asset[0]}`,import.meta.url)));
}).listen(3001,'127.0.0.1',()=>console.log('Whole-workflow UX prototype: http://127.0.0.1:3001'));
