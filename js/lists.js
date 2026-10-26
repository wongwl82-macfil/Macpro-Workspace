/* Macpro Document Hub — js/lists.js
   Dashboard and "Needs attention", clients / suppliers / products (views, search, convert),
   edit modals, document lists, project P&L, credit / debit note and goods-received lists.
   Plain script (not a module): index.html loads the js/ files in order and they share one global scope,
   so the onclick="…" handlers in the page can call any function by name. */

/* ═══════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════ */
function renderDash(){
  // All dashboard totals are converted to the base currency
  const base=CO.fxRates?.base||'SGD';
  const sumBase=arr=>arr.reduce((s,d)=>s+toBase(d.amount||0,d.currency),0);
  const now=new Date(), thisMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthQTs=DB.quotations.filter(d=>(d.date||'').startsWith(thisMonth));
  const openQTs=DB.quotations.filter(d=>['draft','sent'].includes(d.status));
  const ovInvs=DB.invoices.filter(d=>d.status==='overdue');
  const activeC=DB.clients.filter(c=>c.status==='active').length;
  return `
  <div class="stats">
    <div class="stat"><div class="stat-label">Outstanding Sales Orders</div><div class="stat-val" style="font-size:18px">${fmt(DB.clientPOs.filter(soAwaitingInvoice).reduce((s,d)=>s+toBase(d.amount||0,d.currency),0),CO.fxRates?.base||'SGD')}</div><div class="stat-sub">${DB.clientPOs.filter(soAwaitingInvoice).length} of ${DB.clientPOs.length} pending · ${CO.fxRates?.base||'SGD'} equiv.</div></div>
    <div class="stat"><div class="stat-label">Invoiced (This Month)</div>
    ${(()=>{
      const now=new Date();
      const yyyymm=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const monthInv=DB.invoices.filter(d=>isIssued(d)&&(d.date||'').startsWith(yyyymm));
      const total=monthInv.reduce((s,d)=>s+toBase(d.amount||0,d.currency),0);
      return `<div class="stat-val" style="font-size:18px">${fmt(total,CO.fxRates?.base||'SGD')}</div><div class="stat-sub">${monthInv.length} invoices · ${CO.fxRates?.base||'SGD'} equiv.</div>`;
    })()}</div>
    <div class="stat"><div class="stat-label">Quotations (This Month)</div><div class="stat-val" style="font-size:18px">${fmt(sumBase(monthQTs),base)}</div><div class="stat-sub">${monthQTs.length} this month · ${openQTs.length} open (${fmt(sumBase(openQTs),base)}) · ${base} equiv.</div></div>
    <div class="stat red"><div class="stat-label">Overdue Invoices</div><div class="stat-val" style="font-size:18px;color:var(--danger)">${fmt(sumBase(ovInvs),base)}</div><div class="stat-sub">${ovInvs.length} invoice${ovInvs.length===1?'':'s'} need follow-up · ${base} equiv.</div></div>
    <div class="stat"><div class="stat-label">FX Rates (vs ${CO.fxRates?.base||'SGD'})</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
        ${(CO.fxRates?.rates||[]).filter(r=>r.rate).map(r=>`
          <div style="background:var(--card2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:11px;text-align:center">
            <span style="font-weight:700;color:var(--navy)">${r.currency}</span>
            <span style="color:var(--muted)"> = ${r.rate}</span>
          </div>`).join('') || '<span style="font-size:12px;color:var(--muted)">No rates set — <button class="alink" onclick="nav(\'settings\');S_TAB=\'currency\';render()">set now</button></span>'}
      </div>
      <div class="stat-sub" style="margin-top:6px">Updated: ${(CO.fxRates?.rates||[]).filter(r=>r.rate).map(r=>r.updatedAt).sort().pop()||'—'}</div>
    </div>
  </div>
  ${renderFollowUps()}
  <div class="sec-hdr"><h3>Quotations</h3><button class="alink" onclick="nav('quotation')">View all →</button></div>
  <div class="tbl-wrap"><table class="dash-tbl">
    <thead><tr><th>QT No.</th><th>Client Ref</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${DB.quotations.map(d=>`<tr>
      <td class="mono">${d.id}</td>
      <td class="mono">${d.ref||'—'}</td>
      <td>${cName(d.clientId)}</td><td>${d.date}</td>
      <td>${fmt(d.amount,d.currency)}</td><td><span class="badge b-${d.status}">${d.status}</span></td>
      <td class="dash-acts">
        <button class="alink" onclick="openDocForm('quotation','${d.id}')">Edit</button>
        ${d.status==='converted'?'':`
        <button class="alink" onclick="fromQTtoSO('${d.id}')"      style="color:var(--warning)">→ SO</button>
        <button class="alink" onclick="fromQTtoInvoice('${d.id}')" style="color:var(--success)">→ Invoice</button>
        <button class="alink" onclick="fromQTtoDO('${d.id}')" style="color:var(--purple-tx)">→ DO</button>`}
      </td>
    </tr>`).join('')}</tbody>
  </table></div>
  <div class="sec-hdr"><h3>Sales Orders</h3><button class="alink" onclick="nav('client-po')">View all →</button></div>
  <div class="tbl-wrap"><table class="dash-tbl">
    <thead><tr><th>SO No.</th><th>Client Ref</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${DB.clientPOs.map(d=>`<tr>
      <td class="mono">${d.id}</td>
      <td class="mono">${d.ref||'—'}</td>
      <td>${cName(d.clientId)}</td><td>${d.date}</td>
      <td>${fmt(d.amount,d.currency)}</td>
      <td><span class="badge b-${d.status||'outstanding'}">${d.status||'outstanding'}</span></td>
      <td class="dash-acts">
        <button class="alink" onclick="openDocForm('client-po','${d.id}')">Edit</button>
        <button class="alink" onclick="fromCPOInv('${d.id}')" style="color:var(--success)">→ Invoice</button>
        <button class="alink" onclick="fromCPOtoDO('${d.id}')" style="color:var(--purple-tx)">→ DO</button>
      </td>
    </tr>`).join('')}
    </tbody>
  </table></div>
  <div class="sec-hdr"><h3>Invoices</h3><button class="alink" onclick="nav('invoice')">View all →</button></div>
  <div class="tbl-wrap"><table class="dash-tbl dash-tbl-do">
    <thead><tr><th>Invoice No.</th><th>Client Ref</th><th>Client</th><th>Due Date</th><th>Amount</th><th>Status</th><th>DO No.</th><th>Action</th></tr></thead>
    <tbody>${DB.invoices.map(d=>`<tr>
      <td class="mono">${d.id}</td>
      <td class="mono">${d.ref||'—'}</td>
      <td>${cName(d.clientId)}</td><td>${d.due}</td>
      <td>${fmt(d.amount,d.currency)}</td><td><span class="badge b-${d.status}">${d.status}</span></td>
      <td class="mono">${d.linkedDoId||'—'}</td>
      <td class="dash-acts">
        <button class="alink" onclick="openDocForm('invoice','${d.id}')">Edit</button>
        <button class="alink" onclick="fromINVtoDO('${d.id}')" style="color:var(--purple-tx)">→ DO</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

/* ── DASHBOARD: NEEDS ATTENTION ──
   Short to-do lists built from the data; each row has the button that moves it on. Empty lists are hidden. */
function renderFollowUps(){
  const t=today(), in7=addDays(t,7), ago7=addDays(t,-7);
  const posWithInv=new Set(DB.supInvoices.filter(isLive).map(s=>s.ref));
  const groups=[
    {title:'Quotes waiting 7+ days for a reply', page:'quotation',
     rows:DB.quotations.filter(q=>['draft','sent'].includes(q.status)&&(q.date||t)<=ago7),
     line:q=>`${cName(q.clientId)} · ${fmt(q.amount,q.currency)} · ${q.date}`,
     acts:q=>`<button class="alink" onclick="fromQTtoSO('${q.id}')" style="color:var(--warning)">→ SO</button>`},
    {title:'Draft invoices / notes not issued yet', page:'invoice',
     rows:[...DB.invoices,...DB.creditNotes,...DB.debitNotes].filter(d=>d.status==='draft'),
     line:d=>`${d.partyType==='supplier'?sName(d.supplierId):cName(d.clientId)} · ${fmt(d.amount,d.currency)} · ${d.date||''}`,
     openJs:d=>`openDocForm('${DB.invoices.includes(d)?'invoice':DB.creditNotes.includes(d)?'credit-note':'debit-note'}','${d.id}')`,
     acts:d=>`<button class="alink" onclick="openDocForm('${DB.invoices.includes(d)?'invoice':DB.creditNotes.includes(d)?'credit-note':'debit-note'}','${d.id}')">Open</button>`},
    {title:'Invoices due in the next 7 days', page:'invoice',
     rows:DB.invoices.filter(i=>['pending','sent','issued'].includes(i.status)&&i.due>=t&&i.due<=in7),
     line:i=>`${cName(i.clientId)} · ${fmt(i.amount,i.currency)} · due ${i.due}`,
     acts:i=>`<button class="alink" onclick="markInvoicePaid('${i.id}')" style="color:var(--success-tx)">✓ Paid</button>`},
    {title:'Sales orders not delivered yet', page:'client-po',
     rows:DB.clientPOs.filter(s=>!s.status||s.status==='outstanding'),
     line:s=>`${cName(s.clientId)} · ${fmt(s.amount,s.currency)} · ${s.date}`,
     acts:s=>`<button class="alink" onclick="fromCPOtoDO('${s.id}')" style="color:var(--purple-tx)">→ DO</button>`},
    {title:'Delivered, not invoiced', page:'client-po',
     rows:DB.clientPOs.filter(s=>s.status==='delivered'),
     line:s=>`${cName(s.clientId)} · ${fmt(s.amount,s.currency)} · DO ${s.linkedDoId}`,
     acts:s=>`<button class="alink" onclick="fromCPOInv('${s.id}')" style="color:var(--success)">→ Invoice</button>`},
    {title:'POs awaiting goods', page:'po',
     rows:DB.pos.filter(p=>['pending','sent','invoiced'].includes(p.status)),
     line:p=>`${sName(p.supplierId)} · ${fmt(p.amount,p.currency)} · ${p.date}`,
     acts:p=>`<button class="alink" onclick="fromPOtoSupDO('${p.id}')" style="color:var(--purple-tx)">→ Goods received</button>`},
    {title:'Goods received, no supplier invoice', page:'po',
     rows:DB.pos.filter(p=>['received','partial'].includes(p.status)&&!posWithInv.has(p.id)),
     line:p=>`${sName(p.supplierId)} · ${fmt(p.amount,p.currency)}`,
     acts:p=>`<button class="alink" onclick="fromPOtoSupInv('${p.id}')" style="color:var(--success)">→ Purchase invoice</button>`},
  ].filter(g=>g.rows.length);
  if(!groups.length) return '';
  return `<div class="sec-hdr"><h3>Needs attention</h3></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:18px">
    ${groups.map(g=>`<div class="panel" style="margin:0;padding:14px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:12px;font-weight:700">${g.title}</span>
        <span class="badge b-pending">${g.rows.length}</span>
      </div>
      ${g.rows.slice(0,5).map(d=>`<div style="display:flex;gap:8px;align-items:center;padding:5px 0;border-top:1px solid var(--border);font-size:12px">
        <span class="mono" style="cursor:pointer;color:var(--accent-tx)" onclick="${g.openJs?g.openJs(d):`openDocForm('${g.page}','${d.id}')`}">${d.id}</span>
        <span style="flex:1;min-width:0;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g.line(d)}</span>
        ${g.acts(d)}
      </div>`).join('')}
      ${g.rows.length>5?`<button class="alink" style="margin-top:6px;font-size:12px" onclick="nav('${g.page}')">+${g.rows.length-5} more →</button>`:''}
    </div>`).join('')}
  </div>`;
}

/* ═══════════════════════════════════════════════
   CONTACTS
═══════════════════════════════════════════════ */
const escAttr=s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
// A multi-line description squeezed onto one line, for item summaries in lists
const oneLine=s=>String(s??'').replace(/\s*\n+\s*/g,' ').trim();
// Does any of these fields contain the search text?
const matches=(q,...fields)=>!q||fields.some(f=>String(f||'').toLowerCase().includes(q));
// Search boxes redraw only their results, so the box keeps focus while you type
function onSearch(key,val){
  SEARCH[key]=val;
  const box=document.getElementById('search-results');
  if(box){ box.innerHTML=key==='products'?productResults():contactResults(key); labelTables(box); }
}
/* ── VIEW SWITCH: Cards / Table / List, plus sort — remembered per page in this browser ── */
let VIEW=(()=>{ try{ return JSON.parse(localStorage.getItem('mp_view')||'{}')||{}; }catch(e){ return {}; } })();
const viewOf=k=>VIEW[k]||'cards', sortOf=k=>VIEW[k+'Sort']||'name';
function setView(k,key,val){
  VIEW[key]=val;
  try{ localStorage.setItem('mp_view',JSON.stringify(VIEW)); }catch(e){}
  const box=document.getElementById('search-results');
  if(box){ box.innerHTML=k==='products'?productResults():contactResults(k); labelTables(box); }
  document.querySelectorAll('.vseg button').forEach(b=>b.classList.toggle('on',b.dataset.v===viewOf(k)));
}
function viewBar(k){
  const sorts=[['name','Name A–Z'],['name-desc','Name Z–A'],['newest','Newest first'],['status','Active first'],
    ...(k==='products'?[['price','Price low–high'],['price-desc','Price high–low'],['category','Category']]:[['country','Country']])];
  return `<div class="vseg" role="group" aria-label="View">
      ${[['cards','▦','Cards'],['table','▤','Table'],['list','☰','List']].map(([v,i,l])=>
        `<button type="button" data-v="${v}" class="${viewOf(k)===v?'on':''}" title="${l} view" aria-label="${l} view" onclick="setView('${k}','${k}','${v}')">${i}<span class="vlbl"> ${l}</span></button>`).join('')}
    </div>
    <select class="vsort" title="Sort" onchange="setView('${k}','${k}Sort',this.value)">
      ${sorts.map(([v,l])=>`<option value="${v}" ${sortOf(k)===v?'selected':''}>${l}</option>`).join('')}
    </select>`;
}
function sortList(list,k){
  const by=sortOf(k), txt=(x,f)=>String(x[f]||'').toLowerCase();
  const num=id=>parseInt(String(id||'').replace(/\D/g,''),10)||0;
  const cmp={
    name:(a,b)=>txt(a,'name').localeCompare(txt(b,'name')),
    'name-desc':(a,b)=>txt(b,'name').localeCompare(txt(a,'name')),
    newest:(a,b)=>num(b.id)-num(a.id),
    status:(a,b)=>((a.status==='inactive')-(b.status==='inactive'))||txt(a,'name').localeCompare(txt(b,'name')),
    country:(a,b)=>txt(a,'country').localeCompare(txt(b,'country'))||txt(a,'name').localeCompare(txt(b,'name')),
    category:(a,b)=>txt(a,'category').localeCompare(txt(b,'category'))||txt(a,'name').localeCompare(txt(b,'name')),
    price:(a,b)=>toBase(a.unitPrice||0,a.currency)-toBase(b.unitPrice||0,b.currency),
    'price-desc':(a,b)=>toBase(b.unitPrice||0,b.currency)-toBase(a.unitPrice||0,a.currency),
  }[by]||(()=>0);
  return [...list].sort(cmp);
}

function renderContacts(type){
  return `
  <div class="search-bar"><input id="search-box" placeholder="Search by name, contact, email or phone…" value="${escAttr(SEARCH[type])}" oninput="onSearch('${type}',this.value)" autocomplete="off"/>${viewBar(type)}</div>
  <div id="search-results">${contactResults(type)}</div>`;
}
function contactResults(type){
  const isC=type==='clients', kind=isC?'client':'supplier';
  const list=isC?DB.clients:DB.suppliers;
  const q=SEARCH[type].trim().toLowerCase();
  const fl=sortList(list.filter(x=>matches(q,x.name,x.contact,x.email,x.tel,x.id,isC?x.industry:x.category)),type);
  const e=escAttr;
  const acts=x=>(isC?`<button class="alink" onclick="event.stopPropagation();fromClient('${x.id}')">New QT</button>
      <button class="alink" onclick="event.stopPropagation();openSOAFromClient('${x.id}')">SOA</button>`
    :`<button class="alink" onclick="event.stopPropagation();fromSupplier('${x.id}')">New PO</button>`)
    +`<button class="alink" onclick="event.stopPropagation();openModal('${kind}','${x.id}')">Edit</button>`;
  if(fl.length===0) return `<div class="empty">No ${type} found${q?` for "${e(SEARCH[type])}"`:''}.</div>`;
  const count=`<div class="field-hint" style="margin-bottom:8px">${fl.length} ${fl.length===1?kind:type}${q?' found':''}</div>`;
  if(viewOf(type)==='table') return count+`<div class="tbl-wrap" style="overflow-x:auto"><table class="vtbl">
    <thead><tr><th>Name</th>${isC?'<th>Industry</th>':'<th>Category</th>'}<th>Contact</th><th>Email</th><th>Tel</th><th>Country</th>${isC?'':'<th>Currency</th>'}<th>Terms</th><th>Status</th><th></th></tr></thead>
    <tbody>${fl.map(x=>`<tr onclick="openModal('${kind}','${x.id}')">
      <td style="font-weight:600">${e(x.name)}</td><td>${e(isC?x.industry:x.category)||'—'}</td>
      <td>${e(x.contact)||'—'}</td><td>${e(x.email)||'—'}</td><td>${e(x.tel)||'—'}</td><td>${e(x.country)||'—'}</td>
      ${isC?'':`<td>${e(x.currency)||'—'}</td>`}<td>${e(x.terms)||'—'}</td>
      <td><div style="display:flex;gap:4px"><span class="badge b-${x.status}">${x.status||'—'}</span>${alsoTag(kind,x)}</div></td>
      <td><div style="display:flex;gap:10px">${acts(x)}</div></td>
    </tr>`).join('')}</tbody></table></div>`;
  if(viewOf(type)==='list') return count+`<div class="clist">${fl.map(x=>`
    <div class="clist-row" onclick="openModal('${kind}','${x.id}')">
      <div class="av ${isC?'av-c':'av-s'}">${inits(x.name||'?')}</div>
      <div class="clist-main"><div class="clist-name">${e(x.name)}</div>
        <div class="clist-sub">${[x.contact,x.email,x.tel,x.country].filter(Boolean).map(e).join(' · ')||'—'}</div></div>
      ${alsoTag(kind,x)}<span class="badge b-${x.status}">${x.status||''}</span>
      <div class="clist-acts">${acts(x)}</div>
    </div>`).join('')}</div>`;
  return count+`
  <div class="contact-grid">${fl.map(x=>`
    <div class="contact-card" onclick="openModal('${isC?'client':'supplier'}','${x.id}')">
      <div class="cc-hdr">
        <div class="av ${isC?'av-c':'av-s'}">${inits(x.name)}</div>
        <div style="flex:1;min-width:0"><div class="cc-name">${x.name}</div><div class="cc-role">${(isC?x.industry:x.category)||''}</div></div>
        <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end"><span class="badge b-${x.status}">${x.status}</span>${alsoTag(kind,x)}</div>
      </div>
      <div class="cc-det">${x.contact||'—'}</div>
      <div class="cc-det">${x.email||'—'}</div>
      <div class="cc-det">${x.tel||'—'}${x.country?' · '+x.country:''}</div>
      <div class="cc-foot">
        ${isC?`<button class="btn btn-sm" onclick="event.stopPropagation();fromClient('${x.id}')">New QT</button>
               <button class="btn btn-sm" onclick="event.stopPropagation();openSOAFromClient('${x.id}')">SOA</button>`
             :`<button class="btn btn-sm" onclick="event.stopPropagation();fromSupplier('${x.id}')">New PO</button>`}
        <button class="btn btn-sm" onclick="event.stopPropagation();openModal('${isC?'client':'supplier'}','${x.id}')">Edit</button>
      </div>
    </div>`).join('')}
  </div>`;
}

/* ═══════════════════════════════════════════════
   PRODUCTS
═══════════════════════════════════════════════ */
function renderProducts(){
  const cats=[...new Set(DB.products.map(p=>p.category).filter(Boolean))];
  return `
  <div class="search-bar">
    <input id="search-box" placeholder="Search by name, code, or category…" value="${escAttr(SEARCH.products)}" oninput="onSearch('products',this.value)" autocomplete="off"/>
    <select onchange="SEARCH.products=this.value;render()" style="padding:8px 10px;border:1px solid var(--border-str);border-radius:var(--radius);background:var(--input);color:var(--text);font-size:13px">
      <option value="">All categories</option>
      ${cats.map(c=>`<option value="${escAttr(c)}" ${SEARCH.products===c?'selected':''}>${c}</option>`).join('')}
    </select>
    ${viewBar('products')}
  </div>
  <div id="search-results">${productResults()}</div>`;
}
function productResults(){
  const q=SEARCH.products.trim().toLowerCase();
  const fl=sortList(DB.products.filter(p=>matches(q,p.name,p.code,p.category,p.notes)),'products');
  const e=escAttr;
  if(fl.length===0) return `<div class="empty">No products found.</div>`;
  const count=`<div class="field-hint" style="margin-bottom:8px">${fl.length} product${fl.length===1?'':'s'}${q?' found':''}</div>`;
  const acts=p=>`<button class="alink" onclick="event.stopPropagation();openModal('product','${p.id}')">Edit</button>
    <button class="alink" onclick="event.stopPropagation();delProduct('${p.id}')">Delete</button>`;
  if(viewOf('products')==='table') return count+`<div class="tbl-wrap" style="overflow-x:auto">
    <table class="vtbl"><thead><tr><th>Code</th><th>Product name</th><th>Category</th><th>Unit</th><th style="text-align:right">Unit price</th><th>Supplier</th><th>Status</th><th></th></tr></thead>
    <tbody>${fl.map(p=>`<tr onclick="openModal('product','${p.id}')">
      <td class="mono">${e(p.code)}</td>
      <td style="font-weight:500">${e(p.name)}</td>
      <td>${e(p.category)||'—'}</td>
      <td>${e(p.unit)||'—'}</td>
      <td style="font-weight:600;text-align:right">${fmt(p.unitPrice,p.currency)}</td>
      <td style="color:var(--muted);font-size:12px">${p.supplierId?e(sName(p.supplierId)):'—'}</td>
      <td><span class="badge b-${p.status}">${p.status||'—'}</span></td>
      <td><div style="display:flex;gap:10px">${acts(p)}</div></td>
    </tr>`).join('')}</tbody>
    </table>
  </div>`;
  if(viewOf('products')==='list') return count+`<div class="clist">${fl.map(p=>`
    <div class="clist-row" onclick="openModal('product','${p.id}')">
      <span class="prod-code" style="margin:0;flex-shrink:0">${e(p.code)}</span>
      <div class="clist-main"><div class="clist-name">${e(p.name)}</div>
        <div class="clist-sub">${[p.category,p.unit,p.supplierId?sName(p.supplierId):''].filter(Boolean).map(e).join(' · ')||'—'}</div></div>
      <span style="font-weight:700;font-size:13px;white-space:nowrap">${fmt(p.unitPrice,p.currency)}</span>
      <span class="badge b-${p.status}">${p.status||''}</span>
      <div class="clist-acts">${acts(p)}</div>
    </div>`).join('')}</div>`;
  return count+`
  <div class="prod-grid">${fl.map(p=>`
    <div class="prod-card" onclick="openModal('product','${p.id}')">
      <div class="prod-code">${p.code}</div>
      <div class="prod-name">${p.name}</div>
      <div class="prod-cat">${p.category||'—'} · ${p.unit||''}</div>
      <div class="prod-price">${fmt(p.unitPrice, p.currency)}</div>
      ${p.supplierId?`<div style="font-size:11px;color:var(--muted);margin-top:4px">Supplier: ${sName(p.supplierId)}</div>`:''}
      ${p.notes?`<div style="font-size:11px;color:var(--muted);margin-top:2px">${p.notes}</div>`:''}
      <div class="prod-foot">
        <span class="badge b-${p.status}">${p.status}</span>
        <button class="btn btn-sm btn-purple" onclick="event.stopPropagation();openModal('product','${p.id}')" style="margin-left:auto">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();delProduct('${p.id}')">Delete</button>
      </div>
    </div>`).join('')}
  </div>`;
}

function delProduct(id){
  if(!confirm('Delete this product?')) return;
  DB.products=DB.products.filter(x=>x.id!==id);
  saveDB(); pills(); toast('Product deleted'); render();
}

/* ═══════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════ */
function openModal(type,id){ MODAL={type,id}; render(); }

function renderModal(){
  const {type,id}=MODAL;
  if(type==='report')        return renderReportModal();
  if(type==='client-report') return renderClientReportModal();
  if(type==='soa')           return renderSOAModal();
  if(type==='payment')       return renderPaymentModal();
  if(type==='product') return renderProductModal(id);
  const isNew=id==='new', isC=type==='client';
  const list=isC?DB.clients:DB.suppliers;
  const rec=isNew?{}:list.find(x=>x.id===id)||{};
  const v=(f,def='')=>rec[f]!=null?rec[f]:def;
  return `<div class="overlay"><div class="modal">
    <div class="modal-hdr">
      <h3>${isNew?'Add':'Edit'} ${isC?'Client':'Supplier'}</h3>
      <button class="modal-close" onclick="MODAL=null;render()">×</button>
    </div>
    <div class="frow c2"><div class="fgrp"><label>Company name *</label><input id="m-name" value="${v('name')}"/></div><div class="fgrp"><label>Contact person</label><input id="m-contact" value="${v('contact')}"/></div></div>
    <div class="frow c2"><div class="fgrp"><label>Email</label><input id="m-email" type="email" value="${v('email')}"/></div><div class="fgrp"><label>Phone</label><input id="m-tel" value="${v('tel')}"/></div></div>
    <div class="frow"><div class="fgrp"><label>Address</label><textarea id="m-addr">${v('addr')}</textarea></div></div>
    <div class="frow c2">
      <div class="fgrp"><label>Country</label><input id="m-country" value="${v('country','Singapore')}"/></div>
      ${isC?`<div class="fgrp"><label>Industry</label><input id="m-ind" value="${v('industry')}"/></div>`
           :`<div class="fgrp"><label>Category</label><input id="m-cat" value="${v('category')}"/></div>`}
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>${isC?'GST Reg No.':'Currency'}</label>
        ${isC?`<input id="m-gst" value="${v('gst')}"/>`:`<select id="m-cur">${[...new Set(['MYR','SGD','USD','EUR','GBP','AUD','JPY','CNY',v('currency','MYR')])].map(c=>`<option ${v('currency','MYR')===c?'selected':''}>${c}</option>`).join('')}</select>`}
      </div>
      <div class="fgrp"><label>Payment terms</label>
        <select id="m-terms">${termsOptions(v('terms'))}</select>
      </div>
    </div>
    <div class="frow c2"><div class="fgrp"><label>Status</label>
      <select id="m-status"><option ${v('status','active')==='active'?'selected':''}>active</option><option ${v('status')==='inactive'?'selected':''}>inactive</option></select>
    </div></div>
    <div class="frow"><div class="fgrp"><label>Notes</label><textarea id="m-notes">${v('notes')}</textarea></div></div>
    ${!isNew&&linkedParty(type,rec)?`<div class="field-hint" style="margin-bottom:8px">⇄ Also a ${isC?'supplier':'client'}: <button class="alink" onclick="openModal('${isC?'supplier':'client'}','${linkedParty(type,rec).id}')">${escAttr(linkedParty(type,rec).name)} (${linkedParty(type,rec).id})</button></div>`:''}
    ${isNew?'':auditLine(rec)}
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px;flex-wrap:wrap">
      ${!isNew?`<button class="btn btn-danger btn-sm" onclick="delContact('${type}','${id}')">Delete</button>
      <button class="btn btn-sm" style="margin-right:auto" onclick="openConvertDialog('${type}','${id}')">⇄ Convert to ${isC?'supplier':'client'}</button>`:''}
      <button class="btn btn-sm" onclick="MODAL=null;render()">Cancel</button>
      <button class="btn btn-navy btn-sm" onclick="saveContact('${type}','${id}')">Save</button>
    </div>
  </div></div>`;
}

function renderProductModal(id){
  const isNew=id==='new';
  const rec=isNew?{}:DB.products.find(x=>x.id===id)||{};
  const v=(f,def='')=>rec[f]!=null?rec[f]:def;
  const cats=[...new Set(DB.products.map(p=>p.category).filter(Boolean)),'Electric Motors','Drives & Controls','Bearings','Gearboxes','Couplings','Services','Spare Parts'];
  const uniqueCats=[...new Set(cats)];
  return `<div class="overlay"><div class="modal">
    <div class="modal-hdr">
      <h3>${isNew?'Add new':'Edit'} product</h3>
      <button class="modal-close" onclick="MODAL=null;render()">×</button>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Product code *</label><input id="p-code" value="${v('code')}" placeholder="e.g. MTR-WEG-75KW"/></div>
      <div class="fgrp"><label>Status</label>
        <select id="p-status"><option ${v('status','active')==='active'?'selected':''}>active</option><option ${v('status')==='inactive'?'selected':''}>inactive</option></select>
      </div>
    </div>
    <div class="frow"><div class="fgrp"><label>Product name *</label><input id="p-name" value="${v('name')}" placeholder="Full product description"/></div></div>
    <div class="frow c2">
      <div class="fgrp"><label>Category</label>
        <input id="p-cat" list="cat-list" value="${v('category')}" placeholder="Select or type new"/>
        <datalist id="cat-list">${uniqueCats.map(c=>`<option value="${c}"/>`).join('')}</datalist>
      </div>
      <div class="fgrp"><label>Unit of measure</label>
        <select id="p-unit">
          ${['pcs','lot','set','unit','hr','kg','m','length'].map(u=>`<option ${v('unit','pcs')===u?'selected':''}>${u}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Unit price *</label><input type="number" id="p-price" value="${v('unitPrice',0)}" min="0" step="0.01"/></div>
      <div class="fgrp"><label>Currency</label>
        <select id="p-cur">${['SGD','MYR','USD','EUR'].map(c=>`<option ${v('currency',CO.currency)===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
    </div>
    <div class="frow"><div class="fgrp"><label>Preferred supplier (optional)</label>
      <select id="p-sup">
        <option value="">— None —</option>
        ${DB.suppliers.map(s=>`<option value="${s.id}" ${v('supplierId')===s.id?'selected':''}>${s.name}</option>`).join('')}
      </select>
    </div></div>
    <div class="frow"><div class="fgrp"><label>Notes / specifications</label><textarea id="p-notes">${v('notes')}</textarea></div></div>
    ${isNew?'':auditLine(rec)}
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
      ${!isNew?`<button class="btn btn-danger btn-sm" onclick="delProduct('${id}');MODAL=null;">Delete</button>`:''}
      <button class="btn btn-sm" onclick="MODAL=null;render()">Cancel</button>
      <button class="btn btn-navy btn-sm" onclick="saveProduct('${id}')">Save product</button>
    </div>
  </div></div>`;
}

// Blocks clicks while a save awaits the server, so a double-click can't save twice
let SAVING=false;
async function withSaving(fn){
  if(SAVING) return; SAVING=true; document.body.style.pointerEvents='none';
  try{ await fn(); } finally{ SAVING=false; document.body.style.pointerEvents=''; }
}

function saveProduct(id){ return withSaving(()=>saveProductInner(id)); }
async function saveProductInner(id){
  const isNew=id==='new';
  const code=document.getElementById('p-code').value.trim();
  const name=document.getElementById('p-name').value.trim();
  if(!code||!name){ toast('Code and name are required',false); return; }
  const rec={
    id:isNew?await allocNo('P','products',null,'',3):id,
    code, name,
    category:document.getElementById('p-cat').value.trim(),
    unit:document.getElementById('p-unit').value,
    unitPrice:parseFloat(document.getElementById('p-price').value)||0,
    currency:document.getElementById('p-cur').value,
    supplierId:document.getElementById('p-sup').value,
    status:document.getElementById('p-status').value,
    notes:document.getElementById('p-notes').value.trim(),
  };
  if(!isNew) keepMeta(rec,DB.products.find(x=>x.id===id));
  touch(rec,isNew?'created':'edited',isNew);
  if(isNew) DB.products.push(rec);
  else { const i=DB.products.findIndex(x=>x.id===id); if(i>=0) DB.products[i]=rec; }
  saveDB(); pills(); MODAL=null; toast(isNew?'Product added':'Product updated'); render();
}

function saveContact(type,id){ return withSaving(()=>saveContactInner(type,id)); }
async function saveContactInner(type,id){
  const isC=type==='client', isNew=id==='new';
  const name=document.getElementById('m-name').value.trim();
  if(!name){ toast('Company name is required',false); return; }
  const newId=isNew?await allocNo(isC?'C':'S',isC?'clients':'suppliers',null,'',3):id;
  const list=isC?DB.clients:DB.suppliers;  // read after the await: a cloud reload may have replaced DB
  const rec={
    id:newId,
    name, contact:document.getElementById('m-contact').value,
    email:document.getElementById('m-email').value, tel:document.getElementById('m-tel').value,
    addr:document.getElementById('m-addr').value, country:document.getElementById('m-country').value,
    terms:document.getElementById('m-terms').value, status:document.getElementById('m-status').value,
    notes:document.getElementById('m-notes').value,
  };
  if(isC){ rec.industry=document.getElementById('m-ind').value; rec.gst=document.getElementById('m-gst').value; }
  else   { rec.category=document.getElementById('m-cat').value; rec.currency=document.getElementById('m-cur').value; }
  if(!isNew) keepMeta(rec,list.find(x=>x.id===id));  // keep fields the form doesn't show (e.g. the client⇄supplier link)
  touch(rec,isNew?'created':'edited',isNew);
  if(isNew) list.push(rec);
  else { const i=list.findIndex(x=>x.id===id); if(i>=0) list[i]=rec; }
  saveDB(); pills(); MODAL=null; toast(isNew?'Record added':'Record updated'); render();
}

function delContact(type,id){
  if(!confirm('Delete this record?')) return;
  if(type==='client') DB.clients=DB.clients.filter(x=>x.id!==id);
  else DB.suppliers=DB.suppliers.filter(x=>x.id!==id);
  saveDB(); pills(); MODAL=null; toast('Deleted'); render();
}

/* ── CONVERT CLIENT ⇄ SUPPLIER ──
   Copy: keep the original and add the company to the other list, the two records linked.
   Move: take it out of this list — only allowed when no documents use it, so none lose their client/supplier. */
const otherKind=k=>k==='client'?'supplier':'client';
// The linked record in the other list, if it still exists
function linkedParty(kind,rec){
  if(!rec) return null;
  const lid=kind==='client'?rec.linkedSupplierId:rec.linkedClientId;
  return lid?(kind==='client'?DB.suppliers:DB.clients).find(x=>x.id===lid)||null:null;
}
// How many documents (and, for suppliers, products) point at this client / supplier
function partyUsage(kind,id){
  const key=kind==='client'?'clientId':'supplierId';
  const colls=kind==='client'?['quotations','clientPOs','invoices','dos','creditNotes','debitNotes']:['pos','supInvoices','supDOs','creditNotes','debitNotes','products'];
  return colls.reduce((n,c)=>n+(DB[c]||[]).filter(d=>d[key]===id).length,0);
}
function openConvertDialog(kind,id){
  const src=(kind==='client'?DB.clients:DB.suppliers).find(x=>x.id===id); if(!src) return;
  const to=otherKind(kind), used=partyUsage(kind,id), e=escAttr;
  const linked=linkedParty(kind,src);
  const same=(to==='client'?DB.clients:DB.suppliers).find(x=>x.id!==(linked&&linked.id)&&(x.name||'').trim().toLowerCase()===(src.name||'').trim().toLowerCase());
  const opt=(mode,title,desc,disabled)=>`<button class="btn" ${disabled?'disabled':''} onclick="convertParty('${kind}','${id}','${mode}')"
      style="display:block;width:100%;text-align:left;white-space:normal;padding:12px 14px;margin-bottom:8px;line-height:1.4;${disabled?'opacity:.5;cursor:not-allowed':''}">
      <strong>${title}</strong><br><span class="field-hint">${desc}</span></button>`;
  const ov=document.createElement('div'); ov.id='convert-dialog';
  ov.style.cssText='position:fixed;inset:0;background:rgba(11,31,75,.45);display:flex;align-items:center;justify-content:center;z-index:9000;padding:16px';
  ov.innerHTML=`<div class="panel" style="width:480px;max-width:100%;margin:0">
    <h4>⇄ ${e(src.name)} as a ${to}</h4>
    ${linked?`<p style="font-size:13px;margin-bottom:12px">Already a ${to}: <strong>${e(linked.name)}</strong> (${linked.id}).</p>
      <button class="btn btn-navy" style="width:100%;margin-bottom:8px" onclick="closeConvertDialog();openModal('${to}','${linked.id}')">Open ${to} ${linked.id}</button>`
    :`${same?`<p class="field-hint" style="margin-bottom:10px">⚠ A ${to} with this name already exists: <strong>${e(same.name)}</strong> (${same.id}).</p>
        ${opt('link',`Link to existing ${to} ${same.id}`,`No new record — just mark the two as the same company.`)}`:''}
      ${opt('copy',`Copy — also add as a ${to}`,`Keeps ${e(src.name)} as a ${kind} and creates a ${to} with the same details. Best when you buy from and sell to the same company.`)}
      ${opt('move',`Move — change to a ${to}`,used
        ?`Not possible: ${used} ${kind==='supplier'?'document(s)/product(s)':'document(s)'} use this ${kind}. Use Copy instead.`
        :`Removes ${e(src.name)} from ${kind}s and adds it as a ${to}.`,used>0)}`}
    <div style="text-align:right;margin-top:4px"><button class="btn btn-sm" onclick="closeConvertDialog()">Cancel</button></div>
  </div>`;
  ov.addEventListener('click',ev=>{ if(ev.target===ov) closeConvertDialog(); });
  document.body.appendChild(ov);
}
function closeConvertDialog(){ const d=document.getElementById('convert-dialog'); if(d) d.remove(); }
function convertParty(kind,id,mode){ return withSaving(()=>convertPartyInner(kind,id,mode)); }
async function convertPartyInner(kind,id,mode){
  const fromKey=kind+'s', to=otherKind(kind), toKey=to+'s';
  const src=DB[fromKey].find(x=>x.id===id); if(!src){ closeConvertDialog(); return; }
  const srcLink=to==='supplier'?'linkedSupplierId':'linkedClientId', newLink=kind==='client'?'linkedClientId':'linkedSupplierId';
  if(mode==='link'){
    const same=DB[toKey].find(x=>(x.name||'').trim().toLowerCase()===(src.name||'').trim().toLowerCase());
    if(!same) return;
    src[srcLink]=same.id; same[newLink]=src.id;
    saveDB(); closeConvertDialog(); toast(`Linked ${src.id} ⇄ ${same.id}`); render(); return;
  }
  if(mode==='move'&&partyUsage(kind,id)){ toast(`Can't move: documents use this ${kind} — use Copy`,false); return; }
  const newId=await allocNo(to==='client'?'C':'S',toKey,null,'',3);
  const src2=DB[fromKey].find(x=>x.id===id)||src;  // re-read after the await (a cloud reload may have replaced DB)
  const rec={id:newId,name:src2.name,contact:src2.contact||'',email:src2.email||'',tel:src2.tel||'',addr:src2.addr||'',
    country:src2.country||'',terms:src2.terms||'30 days',status:src2.status||'active',notes:src2.notes||'',gst:src2.gst||''};
  if(to==='supplier'){ const last=lastClientDoc(id); rec.category=src2.industry||''; rec.currency=(last&&last.currency)||CO.currency; }
  else rec.industry=src2.category||'';
  if(mode==='copy'){ rec[newLink]=id; src2[srcLink]=newId; }
  touch(rec,`created (${mode==='move'?'moved':'copied'} from ${kind} ${id})`,true);
  DB[toKey].push(rec);
  if(mode==='move') DB[fromKey]=DB[fromKey].filter(x=>x.id!==id);
  saveDB(); pills(); closeConvertDialog();
  toast(mode==='move'?`${src2.name} is now ${to} ${newId}`:`${src2.name} added as ${to} ${newId} (still ${kind} ${id})`);
  MODAL={type:to,id:newId}; render();  // open the new record so its details can be checked
}
// Small tag on cards / list rows for companies that are both
function alsoTag(kind,x){
  const l=linkedParty(kind,x);
  return l?`<span class="badge" title="Also ${otherKind(kind)} ${l.id}" style="background:var(--purple-bg);color:var(--purple-tx)">⇄ ${otherKind(kind)}</span>`:'';
}

/* ═══════════════════════════════════════════════
   CLIENT PO LIST
═══════════════════════════════════════════════ */
function renderCPO(){
  const outstanding = DB.clientPOs.filter(soAwaitingInvoice).reduce((s,d)=>s+toBase(d.amount||0,d.currency),0);
  const outCount    = DB.clientPOs.filter(soAwaitingInvoice).length;
  return `
  ${outCount>0?`<div style="background:var(--warning-bg);border:1px solid #fcd34d;border-radius:var(--radius);padding:10px 16px;margin-bottom:14px;font-size:13px;color:var(--warning-tx);display:flex;align-items:center;justify-content:space-between">
    <span>⚠ <strong>${outCount} outstanding</strong> sales order${outCount>1?'s':''} pending invoicing</span>
    <span style="font-weight:700;font-size:15px">${fmt(outstanding,CO.fxRates?.base||'SGD')}</span>
  </div>`:''}
  <div class="tbl-wrap"><table>
    <thead><tr><th>SO No.</th><th>Quotation No.</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${DB.clientPOs.map(d=>`<tr>
      <td class="mono">${d.id}</td>
      <td class="mono">${d.srcQtId||'—'}</td>
      <td>${cName(d.clientId)}</td><td>${d.date}</td><td>${fmt(d.amount,d.currency)}</td>
      <td><span class="badge b-${d.status||'outstanding'}">${d.status||'outstanding'}</span></td>
      <td style="white-space:nowrap;display:flex;gap:8px;align-items:center">
        <button class="alink" onclick="openDocForm('client-po','${d.id}')">Edit</button>
        <button class="alink" onclick="delDoc('client-po','${d.id}')">Delete</button>
        <button class="alink" onclick="fromCPOInv('${d.id}')" style="color:var(--success)">→ Invoice</button>
        <button class="alink" onclick="fromCPOtoDO('${d.id}')" style="color:var(--purple-tx)">→ DO</button>
      </td>
    </tr>`).join('')}
    </tbody>
  </table></div>`;
}

/* ═══════════════════════════════════════════════
   DOC LIST
═══════════════════════════════════════════════ */
function renderDocList(){
  const cfgs={
    quotation:{cols:['Ref','Client','Date','Valid until','Amount','Status'],rows:DB.quotations,flds:['id','clientId','date','valid','amount','status']},
    invoice:  {cols:['Invoice No.','Client','Date','Due date','Amount','Status','Payment'],   rows:DB.invoices,  flds:['id','clientId','date','due','amount','status','_pay']},
    do:       {cols:['DO Ref','Client','Date','Invoice Ref','Items','Status'],rows:DB.dos,     flds:['id','clientId','date','inv','items','status']},
    po:       {cols:['PO Ref','Supplier','Date','Amount','Ref QT','Status'],  rows:DB.pos,     flds:['id','supplierId','date','amount','ref','status']},
  };
  const m=cfgs[PAGE]; if(!m) return '';
  const isPO = PAGE==='po';
  const isQT = PAGE==='quotation';
  const isInv= PAGE==='invoice';
  return `<div class="tbl-wrap"><table>
    <thead><tr>${m.cols.map(c=>`<th>${c}</th>`).join('')}<th></th></tr></thead>
    <tbody>${m.rows.map(d=>`<tr>${m.flds.map(f=>{
      if(f==='clientId')  return `<td>${cName(d[f])}</td>`;
      if(f==='supplierId')return `<td>${sName(d[f])}</td>`;
      if(f==='status')    return `<td><span class="badge b-${d[f]}">${LOCK_TYPES[PAGE]&&d[f]==='cancelled'?'voided':d[f]}</span></td>`;
      if(f==='amount')    return `<td>${fmt(d[f],d.currency)}</td>`;
      if(f==='id')        return `<td class="mono"><span>${isLockedRec(PAGE,d)?'<span title="Issued — locked">🔒</span> ':''}${d[f]}</span></td>`;
      if(f==='_pay')      return `<td style="font-size:11px;color:var(--muted)">${d.status==='paid'?`<span style="color:var(--success-tx)">✓ ${d.paidDate||''}</span>${d.paidRef?' · '+d.paidRef:''}${d.paidMethod?' · '+d.paidMethod:''}` : '—'}</td>`;
      return `<td>${d[f]||'—'}</td>`;
    }).join('')}<td style="white-space:nowrap;display:flex;gap:8px;align-items:center">
      <button class="alink" onclick="openDocForm('${PAGE}','${d.id}')">${isLockedRec(PAGE,d)?'View':'Edit'}</button>
      ${isLockedRec(PAGE,d)?'':`<button class="alink" onclick="delDoc('${PAGE}','${d.id}')">Delete</button>`}
      ${isPO  ? `<button class="alink" onclick="fromPOtoSupInv('${d.id}')" style="color:var(--success)">→ Purchase Invoice</button>
                 <button class="alink" onclick="fromPOtoSupDO('${d.id}')"  style="color:var(--purple-tx)">→ Goods Received</button>` : ''}
      ${isQT  ? `<button class="alink" onclick="fromQTtoSO('${d.id}')"      style="color:var(--warning)">→ SO</button>
                 <button class="alink" onclick="fromQTtoInvoice('${d.id}')" style="color:var(--success)">→ Invoice</button>
                 <button class="alink" onclick="fromQTtoDO('${d.id}')"      style="color:var(--purple-tx)">→ DO</button>` : ''}
      ${isInv ? `<button class="alink" onclick="fromINVtoDO('${d.id}')"     style="color:var(--purple-tx)">→ DO</button>
                 <button class="alink" onclick="openSOAFromClient('${d.clientId||''}')" style="color:var(--accent-tx)">SOA</button>
                 ${d.status==='paid'
                   ? `<button class="alink" onclick="markInvoiceUnpaid('${d.id}')" style="color:var(--muted)">↩ Unpaid</button>`
                   : isIssued(d)  // drafts and voided invoices can't take a payment
                   ? `<button class="alink" onclick="markInvoicePaid('${d.id}')" style="color:var(--success-tx);font-weight:600">✓ Mark paid</button>`
                   : ''
                 }` : ''}
    </td></tr>`).join('')}</tbody>
  </table></div>`;
}

function delDoc(type,id){
  const target=LOCK_TYPES[type]&&(DB[LOCK_TYPES[type]]||[]).find(x=>x.id===id);
  if(isLockedRec(type,target)){ toast(`${id} is issued — it can't be deleted. Void it or issue a credit note instead.`,false); return; }
  if(!confirm('Delete this document?')) return;
  const map={quotation:'quotations',invoice:'invoices',do:'dos',po:'pos','client-po':'clientPOs','sup-invoice':'supInvoices','sup-do':'supDOs','credit-note':'creditNotes','debit-note':'debitNotes'};
  const key=map[type]; if(!key) return;
  const doc=DB[key].find(x=>x.id===id);
  DB[key]=DB[key].filter(x=>x.id!==id);
  if(doc) unlinkSources(doc);
  saveDB(); pills(); toast('Deleted'); render();
}

/* ── SUPPLIER INVOICE LIST ── */
function renderSupInvoiceList(){
  const rows=DB.supInvoices;
  if(!rows.length) return `<div class="empty" style="padding:60px 20px">
    <div style="font-size:32px;margin-bottom:12px">🧾</div>
    <div style="font-weight:600;margin-bottom:6px">No supplier invoices yet</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:16px">Record invoices received from suppliers against your purchase orders.</div>
    <button class="btn btn-navy" onclick="openDocForm('sup-invoice','new')">+ New purchase invoice</button>
  </div>`;
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>Ref</th><th>Supplier ref</th><th>Supplier</th><th>Invoice date</th><th>Due date</th><th>Amount</th><th>PO ref</th><th>Project (client inv.)</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map(d=>`<tr>
      <td class="mono">${d.id}</td>
      <td style="font-size:12px;color:var(--muted)">${d.supplierRef||'—'}</td>
      <td>${sName(d.supplierId)}</td>
      <td>${d.date}</td>
      <td>${d.due||'—'}</td>
      <td>${fmt(d.amount,d.currency)}</td>
      <td class="mono" style="font-size:12px">${d.ref||'—'}</td>
      <td class="mono" style="font-size:12px">${d.clientInvRef||'—'}</td>
      <td><span class="badge b-${d.status}">${d.status}</span></td>
      <td style="white-space:nowrap">
        <button class="alink" onclick="openDocForm('sup-invoice','${d.id}')">Edit</button> &nbsp;
        <button class="alink" onclick="fromSupInvtoDO('${d.id}')" style="color:var(--purple-tx)">→ Goods Received</button> &nbsp;
        <button class="alink" onclick="delDoc('sup-invoice','${d.id}')">Delete</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}


/* ═══════════════════════════════════════════════
   PROJECT P&L  (client invoice = project; linked purchase invoices = its costs)
═══════════════════════════════════════════════ */
let PNL={from:'',to:'',client:'',open:{}};
const docSub=d=>{ const s=(d.lines||[]).reduce((t,l)=>t+(l.qty||0)*(l.unitPrice||0),0); return s>0?s:(d.amount||0); };
function pnlSet(k,v){ PNL[k]=v; render(); }
function pnlToggle(id){ PNL.open[id]=!PNL.open[id]; render(); }
function pnlLink(invId){
  const el=document.getElementById('pnl-link-'+invId); if(!el||!el.value) return;
  const si=DB.supInvoices.find(x=>x.id===el.value); if(!si) return;
  si.clientInvRef=invId; delete si.noAutoLink; delete si.autoLinked;
  saveDB(); toast('Purchase invoice linked'); render();
}
function pnlUnlink(sid){
  const si=DB.supInvoices.find(x=>x.id===sid); if(!si) return;
  si.clientInvRef=''; si.noAutoLink=true; delete si.autoLinked;  // don't auto-link it back
  saveDB(); toast('Unlinked'); render();
}
function pnlData(){
  const base=CO.fxRates?.base||'SGD';
  const invs=DB.invoices.filter(i=>isIssued(i) && (!PNL.client||i.clientId===PNL.client) && (!PNL.from||(i.date||'')>=PNL.from) && (!PNL.to||(i.date||'')<=PNL.to));
  const projects=invs.map(i=>{
    const rev=toBase(docSub(i),i.currency);
    const costs=DB.supInvoices.filter(s=>s.clientInvRef===i.id && s.status!=='cancelled').map(s=>({...s,costBase:toBase(docSub(s),s.currency)}));
    const cost=costs.reduce((a,s)=>a+s.costBase,0);
    const profit=rev-cost;
    return {inv:i,rev,costs,cost,profit,margin:rev?profit/rev*100:0};
  }).sort((a,b)=>(b.inv.date||'').localeCompare(a.inv.date||''));
  const invIds=new Set(DB.invoices.map(i=>i.id));
  const unlinked=DB.supInvoices.filter(s=>s.status!=='cancelled' && !invIds.has(s.clientInvRef||'')).map(s=>({...s,costBase:toBase(docSub(s),s.currency)}));
  const totRev=projects.reduce((a,p)=>a+p.rev,0);
  const totCost=projects.reduce((a,p)=>a+p.cost,0);
  return {base,projects,unlinked,totRev,totCost,totProfit:totRev-totCost,totMargin:totRev?(totRev-totCost)/totRev*100:0,unlinkedTotal:unlinked.reduce((a,s)=>a+s.costBase,0)};
}
function renderProjectPnL(){
  const d=pnlData(); const b=d.base;
  const n=v=>v.toLocaleString('en-SG',{minimumFractionDigits:2,maximumFractionDigits:2});
  const col=v=>v<0?'#991b1b':'#065f46';
  const filters=`<div class="panel" style="margin-bottom:14px"><div class="frow c3">
    <div class="fgrp"><label>Client</label><select onchange="pnlSet('client',this.value)"><option value="">All clients</option>${DB.clients.map(c=>`<option value="${c.id}" ${PNL.client===c.id?'selected':''}>${c.name}</option>`).join('')}</select></div>
    <div class="fgrp"><label>Invoice date from</label><input type="date" value="${PNL.from}" onchange="pnlSet('from',this.value)"/></div>
    <div class="fgrp"><label>Invoice date to</label><input type="date" value="${PNL.to}" onchange="pnlSet('to',this.value)"/></div>
  </div></div>`;
  const stats=`<div class="stats">
    <div class="stat"><div class="stat-label">Revenue (ex-GST)</div><div class="stat-val" style="font-size:18px">${b} ${n(d.totRev)}</div><div class="stat-sub">${d.projects.length} client invoice(s)</div></div>
    <div class="stat"><div class="stat-label">Linked costs (ex-GST)</div><div class="stat-val" style="font-size:18px">${b} ${n(d.totCost)}</div><div class="stat-sub">purchase invoices linked</div></div>
    <div class="stat ${d.totProfit<0?'red':''}"><div class="stat-label">Gross profit</div><div class="stat-val" style="font-size:18px;color:${col(d.totProfit)}">${b} ${n(d.totProfit)}</div><div class="stat-sub">margin ${d.totMargin.toFixed(1)}%</div></div>
    <div class="stat ${d.unlinked.length?'red':''}"><div class="stat-label">Unlinked purchase invoices</div><div class="stat-val" style="font-size:18px">${b} ${n(d.unlinkedTotal)}</div><div class="stat-sub">${d.unlinked.length} not tied to a project</div></div>
  </div>`;
  if(!d.projects.length) return filters+stats+`<div class="empty" style="padding:40px 20px">No client invoices match these filters.</div>`;
  const rows=d.projects.map(p=>{
    const open=!!PNL.open[p.inv.id];
    const unl=DB.supInvoices.filter(s=>s.status!=='cancelled' && !DB.invoices.some(i=>i.id===s.clientInvRef));
    const detail=open?`<tr><td colspan="9" style="background:var(--card2);padding:12px 18px">
      ${p.costs.length?`<table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr>
        <th style="text-align:left;padding:4px 8px">Purchase inv.</th><th style="text-align:left;padding:4px 8px">Supplier</th><th style="text-align:left;padding:4px 8px">Supplier ref</th><th style="text-align:left;padding:4px 8px">Date</th>
        <th style="text-align:right;padding:4px 8px">Amount (ex-GST)</th><th style="text-align:right;padding:4px 8px">${b}</th><th></th></tr></thead><tbody>
        ${p.costs.map(s=>`<tr><td class="mono" style="padding:4px 8px">${s.id}</td><td style="padding:4px 8px">${sName(s.supplierId)}</td><td style="padding:4px 8px">${s.supplierRef||'—'}</td><td style="padding:4px 8px">${s.date||'—'}</td>
          <td style="padding:4px 8px;text-align:right">${s.currency} ${n(docSub(s))}</td><td style="padding:4px 8px;text-align:right">${n(s.costBase)}</td>
          <td style="padding:4px 8px;text-align:right"><button class="alink" onclick="pnlUnlink('${s.id}')">Unlink</button></td></tr>`).join('')}
        </tbody></table>`:`<div style="font-size:12px;color:var(--muted)">No purchase invoices linked yet.</div>`}
      ${unl.length?`<div style="display:flex;gap:8px;align-items:center;margin-top:10px"><select id="pnl-link-${p.inv.id}" style="max-width:380px"><option value="">Link an unlinked purchase invoice…</option>${unl.map(s=>`<option value="${s.id}">${s.id} · ${sName(s.supplierId)} · ${fmt(s.amount,s.currency)}</option>`).join('')}</select><button class="btn btn-sm" onclick="pnlLink('${p.inv.id}')">Link</button></div>`:''}
    </td></tr>`:'';
    return `<tr style="cursor:pointer" onclick="pnlToggle('${p.inv.id}')">
      <td style="width:24px">${open?'▾':'▸'}</td>
      <td>${p.inv.date||'—'}</td><td>${cName(p.inv.clientId)}</td><td class="mono">${p.inv.id}</td>
      <td style="text-align:right">${n(p.rev)}</td><td style="text-align:right">${n(p.cost)}${p.costs.length?'':' <span style="font-size:10px;color:var(--muted)">(none linked)</span>'}</td>
      <td style="text-align:right;font-weight:600;color:${col(p.profit)}">${n(p.profit)}</td>
      <td style="text-align:right;color:${col(p.profit)}">${p.margin.toFixed(1)}%</td>
      <td><span class="badge b-${p.inv.status}">${p.inv.status}</span></td>
    </tr>${detail}`;
  }).join('');
  const unlinkedBlock=d.unlinked.length?`<div class="sec-hdr" style="margin-top:18px"><h3>Purchase invoices not linked to a project</h3></div>
    <div class="tbl-wrap"><table><thead><tr><th>Purchase inv.</th><th>Supplier</th><th>Date</th><th style="text-align:right">Amount (ex-GST, ${b})</th><th></th></tr></thead><tbody>
    ${d.unlinked.map(s=>`<tr><td class="mono">${s.id}</td><td>${sName(s.supplierId)}</td><td>${s.date||'—'}</td><td style="text-align:right">${n(s.costBase)}</td><td><button class="alink" onclick="openDocForm('sup-invoice','${s.id}')">Edit &amp; link</button></td></tr>`).join('')}
    </tbody></table></div>`:'';
  return filters+stats+`<div class="tbl-wrap"><table><thead><tr><th></th><th>Date</th><th>Client</th><th>Client invoice</th>
    <th style="text-align:right">Revenue (${b})</th><th style="text-align:right">Cost (${b})</th><th style="text-align:right">Profit (${b})</th><th style="text-align:right">Margin</th><th>Status</th></tr></thead>
    <tbody>${rows}<tr style="background:var(--card2);font-weight:700"><td></td><td colspan="3" style="text-align:right">Total</td>
      <td style="text-align:right">${n(d.totRev)}</td><td style="text-align:right">${n(d.totCost)}</td><td style="text-align:right;color:${col(d.totProfit)}">${n(d.totProfit)}</td><td style="text-align:right;color:${col(d.totProfit)}">${d.totMargin.toFixed(1)}%</td><td></td></tr></tbody></table></div>`
    +unlinkedBlock
    +`<div style="font-size:11px;color:var(--muted);margin:10px 2px 24px">Figures exclude GST and are converted to ${b} using your FX rates. Cancelled documents are excluded. Credit/debit notes are standalone and are not included.</div>`;
}
function downloadPnLCSV(){
  const d=pnlData();
  const q=v=>`"${String(v).replace(/"/g,'""')}"`;
  const head=['Invoice date','Client','Client invoice','Status','Currency','Revenue ex-GST (orig)',`Revenue (${d.base})`,'Linked purchase invoices',`Cost (${d.base})`,`Profit (${d.base})`,'Margin %'];
  const rows=d.projects.map(p=>[p.inv.date||'',cName(p.inv.clientId),p.inv.id,p.inv.status||'',p.inv.currency||'',docSub(p.inv).toFixed(2),p.rev.toFixed(2),p.costs.map(s=>s.id).join(' '),p.cost.toFixed(2),p.profit.toFixed(2),p.margin.toFixed(1)]);
  rows.push(['TOTAL','','','','','',d.totRev.toFixed(2),'',d.totCost.toFixed(2),d.totProfit.toFixed(2),d.totMargin.toFixed(1)]);
  const csv=[head,...rows].map(r=>r.map(q).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='project-pnl-'+today()+'.csv'; a.click();
}

/* ── CREDIT / DEBIT NOTE LIST ── */
function renderCreditDebitList(type){
  const isCN=type==='credit-note';
  const key=isCN?'creditNotes':'debitNotes';
  const rows=DB[key];
  if(!rows.length) return `<div class="empty" style="padding:60px 20px">
    <div style="font-size:32px;margin-bottom:12px">${isCN?'🟢':'🟠'}</div>
    <div style="font-weight:600;margin-bottom:6px">No ${isCN?'credit':'debit'} notes yet</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:16px">${isCN?'Issue a credit note to reduce what a client or supplier owes — returns, discounts, corrections.':'Issue a debit note to increase what a client or supplier owes — additional charges, corrections.'}</div>
    <button class="btn btn-navy" onclick="openDocForm('${type}','new')">+ New ${isCN?'credit':'debit'} note</button>
  </div>`;
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>${isCN?'CN':'DN'} No.</th><th>Applies to</th><th>Party</th><th>Date</th><th>Reference</th><th>Amount</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map(d=>`<tr>
      <td class="mono"><span>${isLockedRec(type,d)?'<span title="Issued — locked">🔒</span> ':''}${d.id}</span></td>
      <td>${d.partyType==='supplier'?'Supplier':'Client'}</td>
      <td>${d.partyType==='supplier'?sName(d.supplierId):cName(d.clientId)}</td>
      <td>${d.date}</td>
      <td class="mono" style="font-size:12px">${d.ref||'—'}</td>
      <td>${fmt(d.amount,d.currency)}</td>
      <td><span class="badge b-${d.status||'draft'}">${d.status==='cancelled'?'voided':d.status||'draft'}</span></td>
      <td style="white-space:nowrap;display:flex;gap:8px;align-items:center">
        <button class="alink" onclick="openDocForm('${type}','${d.id}')">${isLockedRec(type,d)?'View':'Edit'}</button>
        ${isLockedRec(type,d)?'':`<button class="alink" onclick="delDoc('${type}','${d.id}')">Delete</button>`}
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

/* ── SUPPLIER DO LIST ── */
function renderSupDOList(){
  const rows=DB.supDOs;
  if(!rows.length) return `<div class="empty" style="padding:60px 20px">
    <div style="font-size:32px;margin-bottom:12px">📦</div>
    <div style="font-weight:600;margin-bottom:6px">No supplier delivery orders yet</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:16px">Record goods received from suppliers with delivery details.</div>
    <button class="btn btn-navy" onclick="openDocForm('sup-do','new')">+ New goods received</button>
  </div>`;
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>DO Ref</th><th>Supplier</th><th>Date received</th><th>Items</th><th>PO ref</th><th>Supplier invoice</th><th>Received by</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map(d=>`<tr>
      <td class="mono">${d.id}</td>
      <td>${sName(d.supplierId)}</td>
      <td>${d.receivedDate||d.date}</td>
      <td style="font-size:12px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.items||'—'}</td>
      <td class="mono" style="font-size:12px">${d.ref||'—'}</td>
      <td class="mono" style="font-size:12px">${d.sinvRef||'—'}</td>
      <td style="font-size:12px">${d.receivedBy||'—'}</td>
      <td><span class="badge b-${d.status}">${d.status}</span></td>
      <td style="white-space:nowrap">
        <button class="alink" onclick="openDocForm('sup-do','${d.id}')">Edit</button> &nbsp;
        <button class="alink" onclick="delDoc('sup-do','${d.id}')">Delete</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

