import * as g from '../src/utils/gemini.ts';
const store: Record<string,string> = {};
(globalThis as any).localStorage = { getItem:(k:string)=>store[k]??null, setItem:(k:string,v:string)=>{store[k]=v}, removeItem:(k:string)=>{delete store[k]} };
let calls: any[] = [];
function mock(status:number, body:any){ (globalThis as any).fetch = async (url:string, init:any)=>{ calls.push({url, init}); return new Response(JSON.stringify(body),{status}); }; }
const ok = (t:string)=>({candidates:[{content:{parts:[{text:t}]}}]});
let pass=0, fail=0; const t=(n:string,c:boolean)=>{ (c?pass++:fail++); console.log((c?'PASS ':'FAIL ')+n); };

// no key
let r = await g.aiFetch('/api/ai/chat',{method:'POST',body:JSON.stringify({message:'hi'})});
t('no key -> 401 with message', r.status===401 && (await r.json()).error.includes('Settings > AI'));

g.setApiKey('AIzaSyFAKEKEYFAKEKEYFAKEKEY12345');
t('key stored', g.hasApiKey());
mock(200, ok('hello'));
r = await g.aiFetch('/api/ai/chat',{method:'POST',body:JSON.stringify({message:'hi',history:[{role:'user',text:'a'}],fileContext:{filename:'a.kt',language:'kotlin',content:'x'}})});
let j = await r.json();
t('chat success', r.status===200 && j.reply==='hello');
const c = calls.at(-1);
t('key sent in header, not URL', c.init.headers['x-goog-api-key'].startsWith('AIza') && !c.url.includes('AIza'));
t('model in URL', c.url.includes('gemini-2.5-flash:generateContent'));
t('system instruction + file context sent', JSON.parse(c.init.body).systemInstruction && JSON.parse(c.init.body).contents[0].parts[0].text.includes('a.kt'));

mock(403,{error:{message:'denied'}});
r = await g.aiFetch('/api/ai/chat',{body:JSON.stringify({message:'hi'})});
t('403 -> friendly', r.status===403 && (await r.json()).error.includes('rejected'));
mock(429,{}); r = await g.aiFetch('/api/ai/chat',{body:JSON.stringify({message:'x'})});
t('429 -> rate limit msg', (await r.json()).error.includes('rate limit'));
mock(200,{candidates:[]}); r = await g.aiFetch('/api/ai/chat',{body:JSON.stringify({message:'x'})});
t('empty response handled', r.status===500 && (await r.json()).error.includes('empty'));

mock(200, ok('```json\n{"screenTitle":"T","components":[]}\n```'));
r = await g.aiFetch('/api/ai/designer',{body:JSON.stringify({prompt:'x'})});
j = await r.json(); t('designer parses fenced JSON', j.spec.screenTitle==='T');
t('designer requests JSON mime', JSON.parse(calls.at(-1).init.body).generationConfig.responseMimeType==='application/json');
mock(200, ok('not json')); r = await g.aiFetch('/api/ai/creator',{body:JSON.stringify({prompt:'x',platform:'web'})});
t('creator malformed JSON -> error', r.status===500 && (await r.json()).error.includes('malformed'));
mock(200, ok('{"projectName":"P","files":[]}')); r = await g.aiFetch('/api/ai/creator',{body:JSON.stringify({prompt:'x',platform:'web'})});
t('creator success', (await r.json()).project.projectName==='P');

(globalThis as any).fetch = async()=>{ throw new TypeError('network'); };
r = await g.aiFetch('/api/ai/chat',{body:JSON.stringify({message:'x'})});
t('offline -> message', (await r.json()).error.includes('internet'));
(globalThis as any).fetch = (_u:string, init:any)=> new Promise((_,rej)=>init.signal.addEventListener('abort',()=>rej(Object.assign(new Error('a'),{name:'AbortError'}))));
try { await g.generate('x',{timeoutMs:50}); t('timeout',false);} catch(e:any){ t('timeout -> AiError', e.message.includes('timed out')); }

mock(200, ok('ok')); t('testApiKey ok', await g.testApiKey('AIzaSyOTHERKEYOTHERKEY1234567'));
t('key shape check', g.looksLikeApiKey('AIzaSyFAKEKEYFAKEKEYFAKEKEY12345') && !g.looksLikeApiKey('short') && !g.looksLikeApiKey('has space in it 12345678901234'));
g.setApiKey(''); t('key removed', !g.hasApiKey());
r = await g.aiFetch('/api/nope'); t('unknown route 404', r.status===404);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
