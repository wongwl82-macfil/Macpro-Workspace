/* Macpro Document Hub — js/core.js
   App state, Supabase config, per-record cloud sync, sign-in / sign-out, company & data setup,
   numbering, shared helpers, automatic & linked statuses, payment terms, navigation and render().
   Plain script (not a module): index.html loads the js/ files in order and they share one global scope,
   so the onclick="…" handlers in the page can call any function by name. */

/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
let PAGE='dash', DARK=false, MODAL=null, DOC_TYPE=null, EDIT_ID=null;
let LINE_ITEMS=[], FORM={}, DOC_TAB='edit', S_TAB='profile', SEARCH={clients:'',suppliers:'',products:''};
let PROD_PICKER_IDX = -1; // which line is showing product picker


/* ═══════════════════════════════════════════════
   SUPABASE CONFIG
   Fill in your credentials from:
   Supabase Dashboard → Settings → API
═══════════════════════════════════════════════ */
const SUPABASE_URL = 'https://ienfiessqrjldyqebyhr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbmZpZXNzcXJqbGR5cWVieWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MDY4MTgsImV4cCI6MjEwODI4MjgxOH0.cE8bHwMAI9O-ruQAahRC5A71i3jTUwkYa5HE2nNFHU8';

let _sb = null;
function getSB(){
  if(_sb) return _sb;
  if(typeof supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL')
    _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}
const isConfigured = () => SUPABASE_URL !== 'YOUR_SUPABASE_URL';

/* ── SYNC STATUS ── */
function setSyncStatus(s){
  const el=document.getElementById('sync-status'); if(!el) return;
  const map={syncing:'🔄 Syncing…',ok:'☁️ Synced',offline:'💾 Local only',error:'⚠️ Sync error'};
  el.textContent=map[s]||s;
  el.dataset.state=s;   // colour comes from app.css
}

/* ═══════════════════════════════════════════════
   PER-RECORD CLOUD SYNC  (needs supabase_sync_setup.sql)
   Every document / contact / product is its own row in mp_records.
   saveDB() diffs DB against what was last synced and pushes only the changed
   rows; each row carries a version, and mp_sync refuses to overwrite a row
   someone else changed since we loaded it (that becomes a "conflict").
═══════════════════════════════════════════════ */
const COLLS=['clients','suppliers','products','clientPOs','quotations','invoices','dos','pos','supInvoices','supDOs','creditNotes','debitNotes'];
// SYNCED[coll][id] = {v: server version, h: hash of the JSON last synced}. null = never synced on this device.
let SYNCED=JSON.parse(localStorage.getItem('mp_synced')||'null');
let _syncChain=Promise.resolve(), _rt=null, _lastPull=0;

function hashStr(s){ let h=0x811c9dc5; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193); } return (h>>>0).toString(36)+':'+s.length; }
function persistLocal(){ try{ localStorage.setItem('mp_db',JSON.stringify(DB)); }catch(e){ console.warn('persistLocal:',e); } }
function persistSynced(){ try{ localStorage.setItem('mp_synced',JSON.stringify(SYNCED)); }catch(e){ console.warn('persistSynced:',e); } }
function normalizeDB(){ COLLS.forEach(c=>{ if(!Array.isArray(DB[c])) DB[c]=[]; }); }
// Re-render only when it can't wipe what the user is typing (doc form, modal, settings inputs)
function safeRender(){
  pills();
  // Never redraw under someone typing (e.g. in a search box when another user's save arrives)
  const a=document.activeElement, typing=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.closest('#content');
  if(!DOC_TYPE && !MODAL && PAGE!=='settings' && !typing) render();
}

// Records that differ from what was last synced → upserts; synced ids no longer in DB → deletes
function diffDB(){
  const ups=[], dels=[];
  COLLS.forEach(c=>{
    const known=(SYNCED&&SYNCED[c])||{}, seen={};
    (DB[c]||[]).forEach(r=>{
      if(!r||!r.id||seen[r.id]) return; seen[r.id]=1;
      const h=hashStr(JSON.stringify(r)), k=known[r.id];
      if(!k||k.h!==h) ups.push({coll:c,id:r.id,data:r,base:k?k.v:null,h});
    });
    Object.keys(known).forEach(id=>{ if(!seen[id]) dels.push({coll:c,id,base:known[id].v}); });
  });
  return {ups,dels};
}

// Overwrite the local copy of one record with the server's (row=null → deleted on the server)
function applyRemote(coll,id,row){
  if(!Array.isArray(DB[coll])) DB[coll]=[];
  const arr=DB[coll], i=arr.findIndex(x=>x.id===id);
  SYNCED=SYNCED||{}; SYNCED[coll]=SYNCED[coll]||{};
  if(row){ if(i>=0) arr[i]=row.data; else arr.push(row.data); SYNCED[coll][id]={v:row.version,h:hashStr(JSON.stringify(row.data))}; }
  else   { if(i>=0) arr.splice(i,1); delete SYNCED[coll][id]; }
}

// Someone else changed these records first: keep a local backup of our version, then take theirs
async function resolveConflicts(list,why){
  const sb=getSB();
  let stash=[]; try{ stash=JSON.parse(localStorage.getItem('mp_conflicts')||'[]'); }catch(e){}
  for(const c of list){
    const mine=(DB[c.coll]||[]).find(x=>x.id===c.id);
    if(mine) stash.push({at:new Date().toISOString(),coll:c.coll,id:c.id,data:mine});
    const {data:row,error}=await sb.from('mp_records').select('coll,id,data,version').eq('coll',c.coll).eq('id',c.id).maybeSingle();
    if(!error) applyRemote(c.coll,c.id,row);
  }
  try{ localStorage.setItem('mp_conflicts',JSON.stringify(stash.slice(-50))); }catch(e){}
  persistLocal(); persistSynced();
  const ids=list.slice(0,3).map(c=>c.id).join(', ')+(list.length>3?` +${list.length-3} more`:'');
  toast(why==='locked'?`${ids} is issued and locked — the change was refused and the saved version reloaded`
    :`${ids} was changed by another user — their version is loaded, please redo your edit`,false);
  safeRender();
}

// Push local changes. Returns false if the push failed (network / setup), true otherwise.
async function pushChanges(){
  const sb=getSB();
  if(!sb||!AUTH_USER||!SYNCED){ setSyncStatus('offline'); return false; }
  const {ups,dels}=diffDB();
  if(!ups.length&&!dels.length){ setSyncStatus('ok'); return true; }
  setSyncStatus('syncing');
  try{
    const {data,error}=await sb.rpc('mp_sync',{
      p_upserts:ups.map(({coll,id,data,base})=>({coll,id,data,base})),
      p_deletes:dels,
    });
    if(error) throw error;
    const hashOf={}; ups.forEach(u=>{ hashOf[u.coll+'|'+u.id]=u.h; });
    (data.saved||[]).forEach(s=>{ SYNCED[s.coll]=SYNCED[s.coll]||{}; SYNCED[s.coll][s.id]={v:s.version,h:hashOf[s.coll+'|'+s.id]}; });
    (data.deleted||[]).forEach(s=>{ if(SYNCED[s.coll]) delete SYNCED[s.coll][s.id]; });
    persistSynced();
    if(data.conflicts&&data.conflicts.length) await resolveConflicts(data.conflicts);
    // Refused by the database's lock on issued documents (supabase_lock_setup.sql)
    if(data.rejected&&data.rejected.length) await resolveConflicts(data.rejected,'locked');
    setSyncStatus('ok'); return true;
  }catch(e){ console.warn('saveDB:',e); setSyncStatus('error'); return false; }
}

/* ── CLOUD SAVE ── */
// Saves are queued so two quick saves never race each other
function saveDB(){
  applyAutoStatuses();  // an edited due / valid date takes effect on the same save
  persistLocal();
  _syncChain=_syncChain.then(pushChanges,pushChanges);
  return _syncChain;
}
// Settings blob (company profile, banks, FX). Counters no longer live here — see mp_counters.
async function saveCO(){
  localStorage.setItem('mp_co',JSON.stringify(CO));
  const sb=getSB(); if(!sb) return;
  try{await sb.from('mp_settings').upsert({key:'co',value:CO});}
  catch(e){console.warn('saveCO:',e);}
}
function saveCOLocal(){ try{ localStorage.setItem('mp_co',JSON.stringify(CO)); }catch(e){} }

/* ── DOCUMENT NUMBERING (atomic, server-side) ── */
// Highest number already used for `prefix` in DB[coll], e.g. "Q-2610-0007" → 7, "C012" → 12
function maxSeqIn(coll,prefix){
  const re=new RegExp('^'+prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'-?(\\d+)$');
  return (DB[coll]||[]).reduce((m,r)=>{ const x=re.exec((r&&r.id)||''); return x?Math.max(m,+x[1]):m; },0);
}
// Reserve the next number from Supabase so two users can never get the same one.
// Offline it falls back to a local guess (and warns, since that guess can clash).
async function nextSeq(prefix,coll,localKey){
  const floor=maxSeqIn(coll,prefix);
  const sb=getSB();
  if(sb&&AUTH_USER){
    try{
      const {data,error}=await sb.rpc('mp_next_seq',{p_prefix:prefix,p_floor:floor});
      if(error) throw error;
      return data;
    }catch(e){ console.warn('mp_next_seq:',e); }
  }
  toast('Offline — number assigned locally, check for duplicates later',false);
  return Math.max(floor, localKey?(CO.counter[localKey]||0):0)+1;
}
// e.g. allocNo('Q-2610','quotations','quotation') → "Q-2610-0008"; allocNo('C','clients',null,'',3) → "C006"
async function allocNo(prefix,coll,localKey,sep='-',width=4){
  const n=await nextSeq(prefix,coll,localKey);
  if(localKey){ CO.counter[localKey]=n; saveCOLocal(); }
  return `${prefix}${sep}${String(n).padStart(width,'0')}`;
}
async function allocDocNo(pfxKey,coll){ checkMonthRollover(); return allocNo(fullPrefix(pfxKey),coll,pfxKey); }
// The counter key each settings row maps to on the server
const COUNTER_PREFIX={supInvoice:'SINV',supDO:'SDO'};
const counterPrefix=key=>COUNTER_PREFIX[key]||fullPrefix(key);
// Refresh the "next number" previews from the server's counters
function applyServerCounters(rows){
  if(!rows) return;
  const byPfx={}; rows.forEach(r=>{ byPfx[r.prefix]=r.n; });
  Object.keys(CO.counter).forEach(k=>{ const p=counterPrefix(k); if(byPfx[p]!==undefined) CO.counter[k]=byPfx[p]; });
  saveCOLocal();
}

/* ── LIVE UPDATES from other users ── */
function subscribeRealtime(){
  const sb=getSB(); if(!sb||_rt) return;
  _rt=sb.channel('mp_records').on('postgres_changes',{event:'*',schema:'public',table:'mp_records'},p=>{
    const del=p.eventType==='DELETE', key=del?p.old:p.new;
    if(!key||!key.coll||!key.id) return;
    const k=SYNCED&&SYNCED[key.coll]&&SYNCED[key.coll][key.id];
    if(!del&&k&&k.v>=p.new.version) return;   // our own save echoing back
    if(del&&!k&&!(DB[key.coll]||[]).some(x=>x.id===key.id)) return;
    applyRemote(key.coll,key.id,del?null:p.new);
    persistLocal(); persistSynced(); safeRender();
  }).subscribe();
}
// Without realtime, pick up other users' changes when the tab comes back into view
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&AUTH_USER&&Date.now()-_lastPull>60000) loadFromCloud();
});
window.addEventListener('online',()=>{ if(AUTH_USER) saveDB(); });

async function fetchAllRecords(sb){
  const rows=[], SZ=1000;
  for(let from=0;;from+=SZ){
    const {data,error}=await sb.from('mp_records').select('coll,id,data,version').order('coll').order('id').range(from,from+SZ-1);
    if(error) throw error;
    rows.push(...data);
    if(data.length<SZ) break;
  }
  return rows;
}

// First run after the upgrade: copy the old single-blob data (mp_data) into mp_records.
// If there is no blob either, this device's local data becomes the first cloud copy.
async function migrateToRecords(sb){
  const {data:blob}=await sb.from('mp_data').select('value').eq('key','db').maybeSingle();
  if(blob&&blob.value){
    DB=blob.value;
    if(!DB.supInvoices)DB.supInvoices=defaultDB().supInvoices;
    if(!DB.supDOs)DB.supDOs=defaultDB().supDOs;
    if(!DB.products)DB.products=defaultDB().products;
  }
  normalizeDB(); persistLocal();
  SYNCED={};
  return pushChanges();
}

/* ── CLOUD LOAD ── */
async function loadFromCloud(){
  const sb=getSB(); if(!sb){setSyncStatus('offline');return;}
  _lastPull=Date.now();
  setSyncStatus('syncing');
  try{
    // Push edits made offline first, so the pull below doesn't throw them away
    if(SYNCED&&!(await saveDB())) return;
    const[rows,coRes,ctrRes]=await Promise.all([
      fetchAllRecords(sb),
      sb.from('mp_settings').select('value').eq('key','co').single(),
      sb.from('mp_counters').select('prefix,n'),
    ]);
    let changed=false;
    if(!rows.length){
      if(!(await migrateToRecords(sb))) return;
      changed=true;
    } else {
      const next={}; COLLS.forEach(c=>{ next[c]=[]; });
      SYNCED={};
      rows.forEach(r=>{
        if(!next[r.coll]) next[r.coll]=[];
        next[r.coll].push(r.data);
        SYNCED[r.coll]=SYNCED[r.coll]||{};
        SYNCED[r.coll][r.id]={v:r.version,h:hashStr(JSON.stringify(r.data))};
      });
      DB=next; normalizeDB(); persistLocal(); persistSynced(); changed=true;
    }
    if(coRes.data?.value){
      CO=coRes.data.value;
      if(!CO.staff)CO.staff=[];if(!CO.banks)CO.banks=[];
      if(!CO.prefix.creditNote)CO.prefix.creditNote='CN';
      if(!CO.prefix.debitNote)CO.prefix.debitNote='DN';
      if(CO.counter.creditNote===undefined)CO.counter.creditNote=0;
      if(CO.counter.debitNote===undefined)CO.counter.debitNote=0;
      localStorage.setItem('mp_co',JSON.stringify(CO));changed=true;
    }
    checkMonthRollover();
    if(!ctrRes.error) applyServerCounters(ctrRes.data);
    if(applyAutoStatuses()) saveDB();
    autoFetchFxRates();
    subscribeRealtime();
    setSyncStatus('ok');
    if(changed)safeRender();
  }catch(e){
    console.warn('loadFromCloud:',e);setSyncStatus('error');
    if(/mp_records|mp_counters|mp_sync|schema cache/i.test(e.message||'')) toast('Cloud tables missing — run supabase_sync_setup.sql in Supabase',false);
  }
}

/* ═══════════════════════════════════════════════
   AUTHENTICATION
═══════════════════════════════════════════════ */
let AUTH_USER=null;

function showLogin(){
  let ov=document.getElementById('auth-overlay');
  if(!ov){ov=document.createElement('div');ov.id='auth-overlay';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;background:#0B1F4B;display:flex;align-items:center;justify-content:center;z-index:9999';
  ov.innerHTML=`
  <div style="background:#fff;border-radius:16px;padding:36px 32px;width:360px;max-width:92vw;box-shadow:0 24px 60px rgba(0,0,0,.5)">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:26px;font-weight:800;color:#0B1F4B">${esc(CO.shortName||'Macpro')}</div>
      <div style="font-size:12px;color:#aaa;margin-top:6px">Document Hub — Sign in to continue</div>
    </div>
    <div id="auth-err" style="display:none;background:#fee2e2;color:#991b1b;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px"></div>
    <div id="auth-msg" style="display:none;background:#d1fae5;color:#065f46;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px"></div>
    <div id="auth-body"></div>
  </div>`;
  renderLoginForm();
}
function hideLogin(){const ov=document.getElementById('auth-overlay');if(ov)ov.style.display='none';}

function renderLoginForm(){
  const b=document.getElementById('auth-body');if(!b)return;
  b.innerHTML=`
    <div style="margin-bottom:14px"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px">Email</label>
      <input id="auth-email" type="email" placeholder="you@company.com" style="width:100%;padding:10px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box"/></div>
    <div style="margin-bottom:20px"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px">Password</label>
      <input id="auth-pass" type="password" placeholder="••••••••" style="width:100%;padding:10px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box" onkeydown="if(event.key==='Enter')doLogin()"/></div>
    <button onclick="doLogin()" style="width:100%;padding:12px;background:#0B1F4B;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit">Sign in</button>
    <div style="text-align:center;margin-top:12px"><button onclick="renderResetForm()" style="background:none;border:none;color:#9ca3af;font-size:12px;cursor:pointer;font-family:inherit">Forgot password?</button></div>`;
}
function renderResetForm(){
  const b=document.getElementById('auth-body');if(!b)return;
  b.innerHTML=`
    <div style="margin-bottom:14px"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px">Email address</label>
      <input id="auth-email" type="email" placeholder="you@company.com" style="width:100%;padding:10px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box"/></div>
    <button onclick="doReset()" style="width:100%;padding:12px;background:#0B1F4B;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit">Send reset link</button>
    <div style="text-align:center;margin-top:12px"><button onclick="renderLoginForm()" style="background:none;border:none;color:#9ca3af;font-size:12px;cursor:pointer;font-family:inherit">← Back to sign in</button></div>`;
}

function authErr(msg){const e=document.getElementById('auth-err');if(e){e.textContent=msg;e.style.display='block';}const m=document.getElementById('auth-msg');if(m)m.style.display='none';}
function authMsg(msg){const m=document.getElementById('auth-msg');if(m){m.textContent=msg;m.style.display='block';}const e=document.getElementById('auth-err');if(e)e.style.display='none';}

async function doLogin(){
  const sb=getSB();
  if(!sb){authErr('Supabase not configured — check SUPABASE_URL and SUPABASE_KEY in the file.');return;}
  const email=document.getElementById('auth-email')?.value?.trim();
  const pass=document.getElementById('auth-pass')?.value;
  if(!email||!pass){authErr('Please enter email and password.');return;}
  // Validate URL format
  if(!SUPABASE_URL.startsWith('https://')||SUPABASE_URL.includes('/rest/')||SUPABASE_URL.endsWith('/')){
    authErr('SUPABASE_URL is incorrect. It should be exactly: https://xxxxxxxxxx.supabase.co (no trailing slash, no /rest/v1/)');return;
  }
  try{
    const res=await sb.auth.signInWithPassword({email,password:pass});
    if(res.error) throw res.error;
    AUTH_USER=res.data.user;
    hideLogin();
    const ue=document.getElementById('user-email');if(ue)ue.textContent=email;
    loadFromCloud();
  }catch(e){
    console.error('Login error:',e);
    authErr(e.message||'Sign in failed. Check your credentials and try again.');
  }
}
async function doReset(){
  const sb=getSB();if(!sb){authErr('Supabase not configured.');return;}
  const email=document.getElementById('auth-email')?.value?.trim();
  if(!email){authErr('Enter your email address.');return;}
  try{const{error}=await sb.auth.resetPasswordForEmail(email);if(error)throw error;authMsg('Reset link sent — check your inbox.');}
  catch(e){authErr(e.message||'Failed to send reset email.');}
}
async function doLogout(){
  const sb=getSB();
  // Push anything not yet in the cloud first, so clearing this browser can't lose work
  if(sb&&AUTH_USER&&SYNCED&&!(await saveDB())
     &&!confirm('Some changes have not reached the cloud yet (no connection?).\n\nSign out anyway? Those changes will be lost on this computer.')) return;
  if(sb&&_rt){sb.removeChannel(_rt);_rt=null;}
  if(sb) await sb.auth.signOut();
  // Shared PCs: remove the copy of the company's data kept in this browser
  ['mp_db','mp_synced','mp_co','mp_conflicts'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
  location.reload();  // also clears everything held in memory; the login screen comes back
}
async function checkSession(){
  if(!isConfigured()){setSyncStatus('offline');loadFromCloud();return;}
  const sb=getSB();if(!sb){loadFromCloud();return;}
  try{
    const res=await sb.auth.getSession();
    const session=res?.data?.session||null;
    if(session&&session.user){
      AUTH_USER=session.user;
      const ue=document.getElementById('user-email');if(ue)ue.textContent=session.user.email;
      loadFromCloud();
    } else showLogin();
  }catch(e){console.warn('session error:',e);showLogin();}
}

/* ═══════════════════════════════════════════════
   COMPANY
═══════════════════════════════════════════════ */
function defaultCo() {
  return {
    name:'Macpro Solutions (SEA) Pte Ltd', shortName:'Macpro Solutions (SEA)',
    addr:'10 Anson Road, #20-15 International Plaza\nSingapore 079903',
    tel:'+65 6123 4567', fax:'+65 6123 4568',
    email:'sales@macprosea.com', website:'www.macprosea.com',
    uen:'201912345G', gst:'201912345G',
    gstOn:true, gstRate:9,
    currency:'SGD', country:'Singapore',
    industry:'Industrial Solutions & Engineering',
    desc:'Specialist in rotating machines, electrical motors, drives and industrial engineering solutions.',
    banks:[{id:'b1',bank:'DBS Bank Ltd',accName:'Macpro Solutions (SEA) Pte Ltd',accNo:'023-9-012345',swift:'DBSSSGSG',branch:'Tanjong Pagar Branch',currency:'SGD'}],
    prefix:{quotation:'Q',invoice:'MS-IV',po:'PO',do:'MS-DO',clientPO:'SO',creditNote:'CN',debitNote:'DN'},
    counter:{quotation:0,invoice:0,po:0,do:0,clientPO:0,creditNote:0,debitNote:0},
    counterMonth:'',  // tracks YYMM of last counter — resets when month changes
    brand:'#0B1F4B', accent:'#C9A84C',
    terms:{
      quotation:'This quotation is valid for 30 days from the date above.',
      invoice:'Payment is due within the credit terms stated.',
      po:'Please confirm receipt of this purchase order.',
      do:'Please sign and return a copy upon receipt of goods.'
    },
    footer:'All prices are subject to prevailing GST where applicable.',
    signoff:'Wong WL',
    staff:[
      {name:'Wong WL', mobile:'+65 8838 6949'},
      {name:'Sales Team', mobile:'+65 6123 4567'},
    ],
    fxRates:{
      base:'SGD',
      rates:[
        {currency:'USD', rate:1.34, updatedAt: new Date().toISOString().slice(0,10)},
        {currency:'MYR', rate:0.30, updatedAt: new Date().toISOString().slice(0,10)},
        {currency:'EUR', rate:1.46, updatedAt: new Date().toISOString().slice(0,10)},
        {currency:'GBP', rate:1.71, updatedAt: new Date().toISOString().slice(0,10)},
        {currency:'AUD', rate:0.88, updatedAt: new Date().toISOString().slice(0,10)},
      ]
    },
  };
}
let CO = JSON.parse(localStorage.getItem('mp_co')||'null') || defaultCo();
// saveCO defined above as async Supabase function
// Migrate: add fxRates if missing
if(!CO.fxRates) CO.fxRates = defaultCo().fxRates;
if(!CO.staff)   CO.staff   = [];
if(!CO.banks)   CO.banks   = [];
if(!CO.prefix.creditNote)  CO.prefix.creditNote = 'CN';
if(!CO.prefix.debitNote)   CO.prefix.debitNote  = 'DN';
if(CO.counter.creditNote===undefined) CO.counter.creditNote = 0;
if(CO.counter.debitNote===undefined)  CO.counter.debitNote  = 0;

/* ── FX HELPERS ── */
// Convert any amount to base currency (SGD)
function toBase(amount, currency){
  const base = CO.fxRates?.base || 'SGD';
  if(!currency || currency === base) return amount;
  const r = (CO.fxRates?.rates||[]).find(x=>x.currency===currency);
  return r ? amount * r.rate : amount; // fallback: treat as 1:1 if rate not found
}
// Format amount in base currency
function fmtBase(amount, currency){
  const base = CO.fxRates?.base || 'SGD';
  const converted = toBase(amount, currency);
  return `${base} ${Number(converted||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}
// Get rate for a currency
function getRate(currency){
  const base = CO.fxRates?.base || 'SGD';
  if(currency === base) return 1;
  const r = (CO.fxRates?.rates||[]).find(x=>x.currency===currency);
  return r ? r.rate : null;
}

/* ═══════════════════════════════════════════════
   DATABASE
═══════════════════════════════════════════════ */
function defaultDB() {
  return {
    clients:[
      {id:'C001',name:'ABB Pte Ltd',contact:'James Tan',email:'james.tan@abb.com',tel:'+65 6776 5555',addr:'2 Ayer Rajah Crescent #05-12, Singapore 139935',country:'Singapore',industry:'Electrical Engineering',terms:'30 days',gst:'198403682R',status:'active',notes:'Key account'},
      {id:'C002',name:'Petronas Malaysia',contact:'Ahmad Razif',email:'a.razif@petronas.com.my',tel:'+60 3 2051 5000',addr:'Tower 1, PETRONAS Twin Towers, KLCC, KL',country:'Malaysia',industry:'Oil & Gas',terms:'60 days',gst:'',status:'active',notes:''},
      {id:'C003',name:'TNB Engineering Sdn Bhd',contact:'Lee Mei Ling',email:'mling@tnb.com.my',tel:'+60 3 2296 5566',addr:'129 Jalan Bangsar, 59200 KL',country:'Malaysia',industry:'Power & Utilities',terms:'45 days',gst:'',status:'active',notes:''},
      {id:'C004',name:'Gamuda Berhad',contact:'David Ng',email:'d.ng@gamuda.com.my',tel:'+60 3 7491 8000',addr:'Menara Gamuda, PJ Trade Centre, PJ',country:'Malaysia',industry:'Construction',terms:'30 days',gst:'',status:'active',notes:''},
      {id:'C005',name:'Sunway Group',contact:'Clara Lim',email:'clara.lim@sunway.com.my',tel:'+60 3 5639 8889',addr:'Sunway City, 47500 Subang Jaya',country:'Malaysia',industry:'Property',terms:'30 days',gst:'',status:'inactive',notes:'Pending reactivation'},
    ],
    suppliers:[
      {id:'S001',name:'WEG Electric Motor (Malaysia)',contact:'Kevin Loh',email:'kevin.loh@weg.net',tel:'+60 3 8961 0088',addr:'Lot 6, Jalan Astaka U8/83, Shah Alam',country:'Malaysia',category:'Motor Manufacturer',currency:'MYR',terms:'30 days',status:'active',notes:'Preferred — W22 series'},
      {id:'S002',name:'ABB Malaysia Sdn Bhd',contact:'Priya Suresh',email:'priya.suresh@my.abb.com',tel:'+60 3 5565 5388',addr:'Unit 2A-12-1, Plaza Sentral, KL Sentral',country:'Malaysia',category:'Drives & Automation',currency:'MYR',terms:'30 days',status:'active',notes:''},
      {id:'S003',name:'Siemens Malaysia',contact:'Thomas Bauer',email:'thomas.bauer@siemens.com',tel:'+60 3 2785 0100',addr:'Menara Keck Seng, 203 Jalan Bukit Bintang, KL',country:'Malaysia',category:'Electrical Equipment',currency:'MYR',terms:'45 days',status:'active',notes:''},
      {id:'S004',name:'SKF (Malaysia) Sdn Bhd',contact:'Rachel Tan',email:'rachel.tan@skf.com',tel:'+60 3 8080 2288',addr:'Lot 88, Kawasan Perindustrian Balakong',country:'Malaysia',category:'Bearings & Seals',currency:'MYR',terms:'30 days',status:'active',notes:''},
    ],
    products:[
      {id:'P001',code:'MTR-WEG-75KW',name:'WEG W22 AC Motor 75kW 3-Phase',category:'Electric Motors',unit:'pcs',unitPrice:19200,currency:'SGD',supplierId:'S001',status:'active',notes:'IE3 efficiency, IP55, foot mounting'},
      {id:'P002',code:'MTR-WEG-37KW',name:'WEG W22 AC Motor 37kW 3-Phase',category:'Electric Motors',unit:'pcs',unitPrice:10800,currency:'SGD',supplierId:'S001',status:'active',notes:'IE3 efficiency, IP55'},
      {id:'P003',code:'DRV-ABB-ACS880',name:'ABB ACS880 Variable Speed Drive 75kW',category:'Drives & Controls',unit:'pcs',unitPrice:8500,currency:'SGD',supplierId:'S002',status:'active',notes:'Built-in safety functions'},
      {id:'P004',code:'BRG-SKF-6310',name:'SKF Deep Groove Ball Bearing 6310',category:'Bearings',unit:'pcs',unitPrice:85,currency:'SGD',supplierId:'S004',status:'active',notes:'C3 clearance'},
      {id:'P005',code:'SVC-INST',name:'Installation & Commissioning Service',category:'Services',unit:'lot',unitPrice:4800,currency:'SGD',supplierId:'',status:'active',notes:'Includes site visit and testing'},
      {id:'P006',code:'SVC-OVHL',name:'Motor Overhaul & Rewind Service',category:'Services',unit:'lot',unitPrice:3200,currency:'SGD',supplierId:'',status:'active',notes:'Up to 75kW'},
    ],
    clientPOs:[
      {id:'SO-2508-0001',clientId:'C001',date:'2025-06-10',amount:48500,items:'AC Motor Drive, 75kW x2',ref:'ABB-PO-9012',status:'outstanding'},
      {id:'SO-2508-0002',clientId:'C002',date:'2025-06-15',amount:127000,items:'Explosion Proof Motor, IECEx Cert',ref:'PTR-2025-0442',status:'outstanding'},
      {id:'SO-2508-0003',clientId:'C003',date:'2025-06-20',amount:34200,items:'Transformer Maintenance Kit',ref:'TNB-PO-8812',status:'invoiced'},
    ],
    quotations:[
      {id:'Q-2608-0041',clientId:'C001',date:'2025-06-12',amount:48500,valid:'2025-07-12',status:'accepted',ref:'ABB-PO-9012',currency:'SGD',lines:[{desc:'WEG W22 AC Motor 75kW',qty:2,unit:'pcs',unitPrice:19200},{desc:'Installation & Commissioning',qty:1,unit:'lot',unitPrice:10100}],notes:'',attn:'James Tan',terms:'30 days'},
      {id:'Q-2608-0042',clientId:'C004',date:'2025-06-18',amount:22800,valid:'2025-07-18',status:'sent',ref:'',currency:'SGD',lines:[],notes:'',attn:'David Ng',terms:'30 days'},
      {id:'Q-2608-0043',clientId:'C005',date:'2025-06-22',amount:15600,valid:'2025-07-22',status:'draft',ref:'',currency:'SGD',lines:[],notes:'',attn:'Clara Lim',terms:'30 days'},
    ],
    invoices:[
      {id:'MS-IV-2608-0088',clientId:'C001',date:'2025-06-14',due:'2025-07-14',amount:48500,status:'paid',currency:'SGD',ref:'ABB-PO-9012',lines:[],notes:'',attn:'James Tan',terms:'30 days'},
      {id:'MS-IV-2608-0089',clientId:'C003',date:'2025-06-01',due:'2025-07-01',amount:31200,status:'overdue',currency:'SGD',ref:'',lines:[],notes:'',attn:'Lee Mei Ling',terms:'45 days'},
      {id:'MS-IV-2608-0090',clientId:'C003',date:'2025-06-22',due:'2025-07-22',amount:34200,status:'pending',currency:'SGD',ref:'TNB-PO-8812',lines:[],notes:'',attn:'Lee Mei Ling',terms:'45 days'},
    ],
    dos:[
      {id:'MS-DO-2608-0055',clientId:'C001',date:'2025-06-15',inv:'MS-IV-2608-0088',items:'AC Motor Drive x2',status:'issued',notes:'',attn:'James Tan'},
      {id:'MS-DO-2608-0056',clientId:'C003',date:'2025-05-30',inv:'MS-IV-2608-0089',items:'Coupling Set, Bearing Housing',status:'issued',notes:'',attn:'Lee Mei Ling'},
    ],
    pos:[
      {id:'PO-2608-0033',supplierId:'S001',date:'2025-06-11',amount:38400,ref:'Q-2608-0041',status:'sent',currency:'MYR',lines:[],notes:'',attn:'Kevin Loh',terms:'30 days'},
      {id:'PO-2608-0034',supplierId:'S002',date:'2025-06-19',amount:18600,ref:'Q-2608-0042',status:'pending',currency:'MYR',lines:[],notes:'',attn:'Priya Suresh',terms:'30 days'},
    ],
    supInvoices:[
      {id:'SINV-2025-0011',supplierId:'S001',date:'2025-06-14',due:'2025-07-14',amount:38400,status:'paid',currency:'MYR',ref:'PO-2608-0033',supplierRef:'WEG-INV-4421',lines:[{desc:'WEG W22 AC Motor 75kW x2',qty:2,unit:'pcs',unitPrice:19200}],notes:'',attn:'Kevin Loh',terms:'30 days',docGstOn:undefined,docGstRate:undefined},
    ],
    supDOs:[
      {id:'SDO-2025-0007',supplierId:'S001',date:'2025-06-16',items:'WEG W22 AC Motor 75kW x2',status:'received',ref:'PO-2608-0033',sinvRef:'SINV-2025-0011',notes:'',attn:'Kevin Loh',receivedBy:'',receivedDate:'2025-06-16'},
    ],
    creditNotes:[],
    debitNotes:[],
  };
}
// Start empty when this browser holds no copy (first visit, or after sign-out) — the real
// data comes from the cloud after sign-in, and sample data must never be uploaded to it
let DB = JSON.parse(localStorage.getItem('mp_db')||'null') || Object.fromEntries(COLLS.map(c=>[c,[]]));
if(!DB.products)    { DB.products    = defaultDB().products;    }
if(!DB.supInvoices) { DB.supInvoices = defaultDB().supInvoices; }
if(!DB.supDOs)      { DB.supDOs      = defaultDB().supDOs;      }
if(!DB.creditNotes) { DB.creditNotes = []; }
if(!DB.debitNotes)  { DB.debitNotes  = []; }
localStorage.setItem('mp_db', JSON.stringify(DB));
// saveDB defined above as async Supabase function

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
// esc(): make any text safe to put into the page's HTML — inside an element or a "quoted" attribute.
// Use it on everything that comes from data people typed (names, notes, addresses, references…),
// so characters like < > & " ' always show as typed instead of being read as HTML.
const ESC_MAP={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>ESC_MAP[ch]);
const cName = id => { const r=DB.clients.find(x=>x.id===id); return r?r.name:id||'—'; };
const sName = id => { const r=DB.suppliers.find(x=>x.id===id); return r?r.name:id||'—'; };
const pName = id => { const r=DB.products.find(x=>x.id===id); return r?r.name:id||'—'; };
const inits = s  => s.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
const today = ()  => new Date().toISOString().split('T')[0];
const addDays=(d,n)=>{ const dt=new Date(d); dt.setDate(dt.getDate()+n); return dt.toISOString().split('T')[0]; };
const fmt=(n,c)=>`${c||CO.currency} ${Number(n||0).toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

// YYMM helper — e.g. August 2026 → "2608", September 2026 → "2609"
function getYYMM() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);          // "26"
  const mm = String(now.getMonth() + 1).padStart(2,'0'); // "08"
  return yy + mm;                                         // "2608"
}
// Build the full prefix for a given doc type, e.g. "Q-2608", "MS-IV-2608"
// All document types use YYMM prefix (e.g. PO-2608-0001)
function fullPrefix(pfxKey) {
  const base = CO.prefix[pfxKey] || 'DOC';
  return `${base}-${getYYMM()}`;
}
// Reset monthly counters if the month has changed since last save
function checkMonthRollover() {
  const yymm = getYYMM();
  if (CO.counterMonth !== yymm) {
    CO.counter.quotation = 0;
    CO.counter.invoice   = 0;
    CO.counter.do        = 0;
    CO.counter.po        = 0;
    CO.counter.clientPO  = 0;
    CO.counter.creditNote= 0;
    CO.counter.debitNote = 0;
    CO.counterMonth      = yymm;
    saveCOLocal();  // local preview cache only — real numbers come from mp_counters
  }
}

/* ── PAYMENT TERMS ── one list for clients, suppliers and every document */
const PAYMENT_TERMS=['Cash in advance','Cash on delivery','Immediate','7 days','14 days','30 days','45 days','60 days','90 days','120 days'];
// <option>s for a terms <select>. An older free-text value that isn't in the list stays selectable.
function termsOptions(cur){
  cur=cur||'30 days';
  const match=PAYMENT_TERMS.find(t=>t.toLowerCase()===String(cur).trim().toLowerCase());
  const list=match?PAYMENT_TERMS:[...PAYMENT_TERMS,cur];
  const sel=match||cur;
  return list.map(t=>`<option value="${esc(t)}" ${t===sel?'selected':''}>${esc(t)}</option>`).join('');
}
// "45 days" → 45, "Immediate" / "Cash …" → 0, anything else → null (leave the due date alone)
const termsDays=t=>{ const m=/(\d+)\s*days?/i.exec(t||''); return m?+m[1]:(/immediate|cash/i.test(t||'')?0:null); };
// Due date for an invoice dated `date` on these terms (unknown terms → 30 days)
const dueFromTerms=(terms,date)=>{ const n=termsDays(terms); return addDays(date||today(), n===null?30:n); };
// The client's most recent sales document, used to pre-fill currency and addresses
function lastClientDoc(cid){
  return [...DB.invoices,...DB.quotations,...DB.clientPOs,...DB.dos]
    .filter(d=>d.clientId===cid).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0]||null;
}
// Picking terms on an invoice moves its due date to invoice date + N days
function onTermsChange(val,dueId){
  FORM.terms=val;
  const n=termsDays(val), dueEl=dueId&&document.getElementById(dueId);
  if(n===null||!dueEl) return;
  const due=addDays(document.getElementById('f-date')?.value||FORM.date||today(),n);
  dueEl.value=due; FORM.due=due;
}

/* ── AUTOMATIC STATUSES ──
   Invoices / purchase invoices past their due date → overdue; quotations past their
   validity date → expired. Each change remembers the previous status and is undone
   if the date is later extended. */
function applyAutoStatuses(){
  const t=today(); let n=0;
  const flag=(d,dateFld,openStatuses,autoStatus)=>{
    const date=d[dateFld]; if(!date) return;
    if(openStatuses.includes(d.status)&&date<t){ d.autoPrevStatus=d.status; d.status=autoStatus; n++; }
    else if(d.status===autoStatus&&d.autoPrevStatus&&date>=t){ d.status=d.autoPrevStatus; delete d.autoPrevStatus; n++; }
  };
  (DB.invoices||[]).forEach(d=>flag(d,'due',['pending','sent','issued'],'overdue'));
  (DB.supInvoices||[]).forEach(d=>flag(d,'due',['pending'],'overdue'));
  (DB.quotations||[]).forEach(d=>flag(d,'valid',['draft','sent'],'expired'));
  n+=applyLinkedStatuses();
  n+=autoLinkSupInvoices();
  return n;
}

const isLive=d=>d&&d.status!=='cancelled'&&d.status!=='rejected';
// Sales orders not yet invoiced (delivered ones still need an invoice)
const soAwaitingInvoice=d=>!d.status||d.status==='outstanding'||d.status==='delivered';
// Statuses that follow from other documents, recomputed on every save so deletes undo them too:
//   SO: outstanding → delivered (its DO exists)          (invoiced is set by linkSources)
//   PO: pending/sent → invoiced (purchase invoice) / received or partial (goods received) / completed (both)
function applyLinkedStatuses(){
  let n=0;
  const set=(d,s)=>{ if(d.status!==s){ d.status=s; n++; } };
  (DB.clientPOs||[]).forEach(so=>{
    if(so.status&&!['outstanding','delivered'].includes(so.status)) return;
    const hasDO=!!so.linkedDoId&&(DB.dos||[]).some(d=>d.id===so.linkedDoId);
    set(so,hasDO?'delivered':'outstanding');
  });
  (DB.pos||[]).forEach(po=>{
    const derived=['invoiced','received','partial','completed'];
    if(!['pending','sent',...derived].includes(po.status)) return;
    const inv=(DB.supInvoices||[]).some(s=>s.ref===po.id&&isLive(s));
    const grns=(DB.supDOs||[]).filter(g=>g.ref===po.id);
    const full=grns.some(g=>g.status==='received'), part=grns.some(g=>g.status==='partial');
    const want=full&&inv?'completed':full?'received':part?'partial':inv?'invoiced':(po.poBaseStatus||(derived.includes(po.status)?'pending':po.status));
    if(!derived.includes(po.status)&&derived.includes(want)) po.poBaseStatus=po.status;
    set(po,want);
  });
  return n;
}

// The client invoice a reference points at, following QT → SO → invoice links. Only a single unambiguous match counts.
function clientInvoiceFor(ref){
  if(!ref) return null;
  const invs=(DB.invoices||[]).filter(isLive);
  if(invs.some(i=>i.id===ref)) return ref;
  let hits=invs.filter(i=>i.srcSoId===ref);
  if(!hits.length){
    const soIds=(DB.clientPOs||[]).filter(s=>s.srcQtId===ref).map(s=>s.id);
    hits=invs.filter(i=>i.srcQtId===ref||soIds.includes(i.srcSoId));
  }
  return hits.length===1?hits[0].id:null;
}
// Purchase invoice → its PO → the PO's ref (quotation / SO / invoice) → client invoice, for Project P&L
function autoLinkSupInvoices(){
  let n=0;
  (DB.supInvoices||[]).forEach(si=>{
    if(si.clientInvRef||si.noAutoLink) return;
    const po=(DB.pos||[]).find(p=>p.id===si.ref);
    const inv=clientInvoiceFor(po?po.ref:si.ref);
    if(inv){ si.clientInvRef=inv; si.autoLinked=true; n++; }
  });
  return n;
}
// For load / page change / the hourly tick: only saves when something actually changed
function runAutoStatuses(){ if(applyAutoStatuses()){ saveDB(); safeRender(); } }
setInterval(runAutoStatuses, 60*60*1000);

/* ── LINKED STATUSES ── */
// A new SO or invoice made from a quotation converts it; an invoice made from an SO marks it invoiced
function linkSources(rec){
  if(rec.srcQtId){
    const qt=DB.quotations.find(q=>q.id===rec.srcQtId);
    if(qt&&qt.status!=='converted'){ qt.statusBeforeConvert=qt.autoPrevStatus||qt.status; delete qt.autoPrevStatus; qt.status='converted'; touch(qt,'converted → '+rec.id); }
  }
  if(rec.srcSoId){
    const so=DB.clientPOs.find(s=>s.id===rec.srcSoId);
    if(so&&(!so.status||so.status==='outstanding'||so.status==='delivered')){ so.status='invoiced'; touch(so,'invoiced → '+rec.id); }
  }
}
// Deleting that SO / invoice puts the source back, unless another document still uses it
function unlinkSources(doc){
  if(doc.srcQtId&&![...DB.clientPOs,...DB.invoices].some(d=>d!==doc&&isLive(d)&&d.srcQtId===doc.srcQtId)){
    const qt=DB.quotations.find(q=>q.id===doc.srcQtId);
    if(qt&&qt.status==='converted'){ qt.status=qt.statusBeforeConvert||'draft'; delete qt.statusBeforeConvert; }
  }
  if(doc.srcSoId&&!DB.invoices.some(d=>d!==doc&&isLive(d)&&d.srcSoId===doc.srcSoId)){
    const so=DB.clientPOs.find(s=>s.id===doc.srcSoId);
    if(so&&so.status==='invoiced') so.status='outstanding';  // becomes 'delivered' again if it has a DO
  }
}

// Per-document GST: uses FORM overrides if set, else falls back to company defaults
const calcGST = (sub) => {
  const on   = FORM.docGstOn  !== undefined ? FORM.docGstOn  : CO.gstOn;
  const rate = FORM.docGstRate !== undefined ? FORM.docGstRate : CO.gstRate;
  return on ? Math.round(sub * rate) / 100 : 0;
};
const docGstOn   = () => FORM.docGstOn  !== undefined ? FORM.docGstOn  : CO.gstOn;
const docGstRate = () => FORM.docGstRate !== undefined ? FORM.docGstRate : CO.gstRate;

function toast(msg,ok=true){
  const t=document.getElementById('toast');
  t.textContent=msg; t.style.background=ok?'#0B1F4B':'#DC2626';
  t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2400);
}
function pills(){
  const pc=document.getElementById('pill-c');     if(pc) pc.textContent=DB.clients.length;
  const ps=document.getElementById('pill-s');     if(ps) ps.textContent=DB.suppliers.length;
  const pp=document.getElementById('pill-p');     if(pp) pp.textContent=DB.products.length;
  const psi=document.getElementById('pill-sinv'); if(psi) psi.textContent=DB.supInvoices.length;
  const psd=document.getElementById('pill-sdo');  if(psd) psd.textContent=DB.supDOs.length;
}
function sbName(){ const el=document.getElementById('sb-name'); if(el) el.textContent=CO.shortName||CO.name; }
// Letterhead logo. CO.logo: undefined = built-in logo, '' = no logo, otherwise an uploaded data URL.
function coLogo(){ return CO.logo===undefined ? (typeof DEFAULT_LOGO==='string'?DEFAULT_LOGO:'') : CO.logo; }
// onDark: the coloured header bar. The built-in logo has a white version for it; an uploaded logo's
// colours are unknown, so it sits on a white tile to stay visible.
// In a letterhead the logo is column 1 of hdrLeft()'s grid and every text line flows into column 2.
function docLogo(onDark,float){
  let src=coLogo(); if(!src) return '';
  const builtIn=CO.logo===undefined;
  if(onDark&&builtIn&&typeof DEFAULT_LOGO_LIGHT==='string') src=DEFAULT_LOGO_LIGHT;
  const img=`<img src="${esc(src)}" alt="${esc(CO.name)}" style="display:block;height:62px;width:auto;max-width:150px;object-fit:contain">`;
  const place=float?'float:left;margin-right:14px':'grid-row:span 9;align-self:start';
  return onDark&&!builtIn
    ? `<div style="${place};background:#fff;border-radius:6px;padding:5px 8px">${img}</div>`
    : `<div style="${place}">${img}</div>`;
}
function hdrLeft(){
  return 'flex:1;min-width:0;padding-right:16px'+(coLogo()?';display:grid;grid-template-columns:auto 1fr;column-gap:14px;align-content:start':'');
}

/* ═══════════════════════════════════════════════
   NAV
═══════════════════════════════════════════════ */
function nav(p){
  if(typeof closeSidebar==='function') closeSidebar();
  PAGE=p; MODAL=null; DOC_TYPE=null; EDIT_ID=null; DOC_TAB='edit'; PROD_PICKER_IDX=-1;
  if(applyAutoStatuses()) saveDB();
  document.querySelectorAll('.sb-item').forEach(el=>el.classList.remove('on'));
  const el=document.getElementById('nav-'+p); if(el) el.classList.add('on');
  const titles={dash:'Dashboard',clients:'Clients',suppliers:'Suppliers',products:'Products',
    'client-po':'Sales Order',quotation:'Quotations',invoice:'Invoices',do:'Delivery Orders',
    po:'Purchase Orders','sup-invoice':'Purchase Invoices','sup-do':'Goods Received',
    'credit-note':'Credit Notes','debit-note':'Debit Notes',pnl:'Project P&L',
    settings:'Company Settings'};
  document.getElementById('page-title').textContent=titles[p]||p;
  render();
}

/* ═══════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════ */
function render(){
  const C=document.getElementById('content');
  const TA=document.getElementById('tb-acts');
  TA.innerHTML='';
  if(MODAL)   { C.innerHTML=renderModal(); afterRender(); return; }
  if(DOC_TYPE){ C.innerHTML=renderDocForm(); decorateDocForm(); afterRender(); return; }
  switch(PAGE){
    case 'dash':     C.innerHTML=renderDash(); break;
    case 'clients':  TA.innerHTML=`<button class="btn btn-gold" onclick="openModal('client','new')">+ Add client</button>`; C.innerHTML=renderContacts('clients'); break;
    case 'suppliers':TA.innerHTML=`<button class="btn btn-gold" onclick="openModal('supplier','new')">+ Add supplier</button>`; C.innerHTML=renderContacts('suppliers'); break;
    case 'products': TA.innerHTML=`<button class="btn btn-purple" onclick="openModal('product','new')">+ Add product</button>`; C.innerHTML=renderProducts(); break;
    case 'client-po':  TA.innerHTML=`<button class="btn btn-navy" onclick="openDocForm('client-po','new')">+ New sales order</button>`; C.innerHTML=renderCPO(); break;
    case 'sup-invoice':TA.innerHTML=`<button class="btn btn-navy" onclick="openDocForm('sup-invoice','new')">+ New purchase invoice</button>`; C.innerHTML=renderSupInvoiceList(); break;
    case 'sup-do':     TA.innerHTML=`<button class="btn btn-navy" onclick="openDocForm('sup-do','new')">+ New goods received</button>`; C.innerHTML=renderSupDOList(); break;
    case 'credit-note':TA.innerHTML=`<button class="btn btn-navy" onclick="openDocForm('credit-note','new')">+ New credit note</button>`; C.innerHTML=renderCreditDebitList('credit-note'); break;
    case 'debit-note': TA.innerHTML=`<button class="btn btn-navy" onclick="openDocForm('debit-note','new')">+ New debit note</button>`; C.innerHTML=renderCreditDebitList('debit-note'); break;
    case 'pnl':        TA.innerHTML=`<button class="btn" onclick="downloadPnLCSV()">⬇ Export CSV</button>`; C.innerHTML=renderProjectPnL(); break;
    case 'settings': C.innerHTML=renderSettings(); break;
    default:{
      const lbl={quotation:'New Quotation',invoice:'New Invoice',do:'New DO',po:'New PO'};
      TA.innerHTML=`<button class="btn btn-navy" onclick="openDocForm('${PAGE}','new')">+ ${esc(lbl[PAGE]||'New')}</button>`;
      C.innerHTML=renderDocList();
    }
  }
  afterRender();
}

/* ── PHONES (screens up to 600px wide) ──
   Tables turn into stacked cards, each value labelled with its column heading (css/app.css,
   "table.stack"). A document preview is laid out at paper width and shrunk to fit the screen,
   with a large-print summary of the key facts on top. Desktop is unchanged. */
const isPhone=()=>window.matchMedia('(max-width:600px)').matches;
function afterRender(){ labelTables(); phoneSummary(); fitPreview(); }
// Copy each column heading onto its cells (data-label) so a phone can show "Due date  2026-11-25"
function labelTables(root){
  (root||document.getElementById('content')).querySelectorAll('table').forEach(t=>{
    if(t.closest('#print-area')||t.classList.contains('line-tbl')) return;
    const heads=[...t.querySelectorAll(':scope > thead > tr > th')].map(th=>th.textContent.trim());
    if(!heads.length) return;
    t.classList.add('stack');
    t.querySelectorAll(':scope > tbody > tr').forEach(tr=>{
      let i=0;
      [...tr.children].forEach(td=>{ const span=+td.getAttribute('colspan')||1; td.setAttribute('data-label',span>1?'':(heads[i]||'')); i+=span; });
    });
  });
}
// Shrink the paper-width document to the phone's width (Print / PDF / email use their own layout)
function fitPreview(){
  const a=document.getElementById('print-area'); if(!a) return;
  a.style.zoom=''; a.style.width=''; a.style.minWidth='';
  if(!isPhone()) return;
  const box=a.parentElement, cs=getComputedStyle(box);
  const avail=box.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  a.style.width='740px'; a.style.minWidth='740px';
  if(avail>0&&avail<740) a.style.zoom=(avail/740).toFixed(3);
}
window.addEventListener('resize',()=>fitPreview());
// Some tables are filled in after the page is drawn (report / statement previews, search results):
// label those too, as soon as they appear
let _labelQueued=false;
new MutationObserver(()=>{ if(_labelQueued) return; _labelQueued=true;
  setTimeout(()=>{ _labelQueued=false; labelTables(); },0); })
  .observe(document.getElementById('content'),{childList:true,subtree:true});
// Big, readable summary above a document preview on phones: who, when, status, items, total
function phoneSummary(){
  const a=document.getElementById('print-area'); if(!a||!DOC_TYPE||DOC_TAB!=='preview') return;
  const e=escAttr, rec=currentDocRec();
  const isSup=['po','sup-invoice','sup-do'].includes(DOC_TYPE)||FORM.partyType==='supplier';
  const party=(isSup?DB.suppliers.find(s=>s.id===FORM.supplierId):DB.clients.find(c=>c.id===FORM.clientId))||{};
  const status=(rec&&rec.status)||FORM.status||'';
  const cur=FORM.currency||CO.currency, sub=LINE_ITEMS.reduce((s,l)=>s+(+l.qty||0)*(+l.unitPrice||0),0);
  const money=!['do','sup-do'].includes(DOC_TYPE);
  const dates=[FORM.date&&`Date ${FORM.date}`,
    ['invoice','sup-invoice'].includes(DOC_TYPE)&&FORM.due&&`Due ${FORM.due}`,
    DOC_TYPE==='quotation'&&FORM.valid&&`Valid to ${FORM.valid}`].filter(Boolean).join(' · ');
  const items=LINE_ITEMS.filter(l=>(l.desc||'').trim()).map(l=>`<div style="display:flex;gap:10px;padding:6px 0;border-top:1px solid var(--border)">
      <span style="font-weight:700;white-space:nowrap">${e(l.qty)} ${e(l.unit||'')}</span>
      <span style="flex:1;white-space:pre-line;overflow-wrap:anywhere">${e(l.desc)}</span>
      ${money?`<span style="white-space:nowrap">${esc(fmt((+l.qty||0)*(+l.unitPrice||0),cur))}</span>`:''}</div>`).join('')
    ||(FORM.items?`<div style="padding:6px 0;border-top:1px solid var(--border);white-space:pre-line">${e(FORM.items)}</div>`:'');
  const card=document.createElement('div'); card.id='phone-summary'; card.className='panel';
  card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <span style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">${e(DOC_NAME[DOC_TYPE]||'Document')}</span>
      ${status?`<span class="badge b-${e(status)}">${e(LOCK_TYPES[DOC_TYPE]&&status==='cancelled'?'voided':status)}</span>`:''}</div>
    <div class="mono" style="font-size:17px;font-weight:700;color:var(--text);margin:2px 0 6px">${e(EDIT_ID==='new'?'New (not saved)':EDIT_ID)}</div>
    <div style="font-size:15px;font-weight:600">${e(party.name||'—')}</div>
    ${FORM.attn?`<div class="field-hint">Attn: ${e(FORM.attn)}</div>`:''}
    ${dates?`<div class="field-hint" style="margin-top:2px">${e(dates)}</div>`:''}
    ${FORM.deliveryAddr||(DOC_TYPE==='do'&&party.addr)?`<div class="field-hint" style="white-space:pre-line">Deliver to: ${e(FORM.deliveryAddr||party.addr)}</div>`:''}
    <div style="margin-top:10px;font-size:13px">${items}</div>
    ${money?`<div style="display:flex;justify-content:space-between;border-top:2px solid var(--border-str);margin-top:4px;padding-top:8px;font-size:16px;font-weight:700">
      <span>Total</span><span>${esc(fmt(sub+calcGST(sub),cur))}</span></div>`:''}
    <div class="field-hint" style="margin-top:8px">The full document is below — pinch to zoom.</div>`;
  a.before(card);
}

