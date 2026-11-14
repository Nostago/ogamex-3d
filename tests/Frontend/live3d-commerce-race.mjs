import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const require=createRequire(import.meta.url),{request}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const account=JSON.parse(await readFile(process.env.LIVE_ACCOUNT_FILE,'utf8'));
const client=await request.newContext({baseURL:process.env.LIVE_BASE_URL||'http://127.0.0.1'});
try {
    const login=await client.get('/login'),token=(await login.text()).match(/name="csrf-token" content="([^"]+)"/)[1];
    const signed=await client.post('/login',{form:{email:account.email,password:account.password,_token:token},maxRedirects:0});
    assert.ok([302,303].includes(signed.status()));
    const html=await (await client.get('/play-3d')).text();
    const csrf=html.match(/name="csrf-token" content="([^"]+)"/)[1];
    const before=await (await client.get('/play-3d/state')).json();
    assert.equal(before.darkMatter,700,'Use an isolated fixture funded for exactly one bronze item');
    const nonce=randomUUID(),same=process.env.COMMERCE_RACE_MODE==='same';
    const replies=await Promise.all(Array.from({length:4},()=>client.post('/shop/purchase',{headers:{Accept:'application/json'},data:{_token:csrf,product:'kraken_bronze',quantity:1,expected_price:700,request_id:same?nonce:randomUUID()}})));
    const statuses=replies.map(r=>r.status());
    const bodies=await Promise.all(replies.map(r=>r.json()));
    assert.ok(bodies.every((body,i)=>statuses[i]!==200 || body.success===true));
    assert.equal(statuses.filter(s=>s===200).length,same?4:1);
    assert.equal(statuses.filter(s=>s===422).length,same?0:3);
    const after=await (await client.get('/play-3d/state')).json();
    assert.equal(after.darkMatter,0);
    console.log(`PASS ${same?'four parallel retries produce one debit':'four parallel distinct purchases cannot overspend a one-item balance'}`);
} finally { await client.dispose(); }
