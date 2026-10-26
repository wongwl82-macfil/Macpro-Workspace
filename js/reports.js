/* Macpro Document Hub — js/reports.js
   Export report (documents / clients / suppliers / products, CSV & PDF), full JSON backup,
   client report, statement of account, payment recording, mobile sidebar.
   Plain script (not a module): index.html loads the js/ files in order and they share one global scope,
   so the onclick="…" handlers in the page can call any function by name. */

/* ═══════════════════════════════════════════════
   MONTHLY REPORT — CSV EXPORT
═══════════════════════════════════════════════ */
function openReportModal(){ openModal('report', null); }

function renderReportModal(){
  const allDocs = [
    ...DB.quotations.map(d=>({...d,_type:'Quotation'})),
    ...DB.invoices.map(d=>({...d,_type:'Invoice'})),
    ...DB.dos.map(d=>({...d,_type:'Delivery Order'})),
    ...DB.pos.map(d=>({...d,_type:'Purchase Order'})),
    ...DB.clientPOs.map(d=>({...d,_type:'Sales Order'})),
    ...DB.supInvoices.map(d=>({...d,_type:'Purchase Invoice'})),
    ...DB.supDOs.map(d=>({...d,_type:'Goods Received'})),
    ...DB.creditNotes.map(d=>({...d,_type:'Credit Note'})),
    ...DB.debitNotes.map(d=>({...d,_type:'Debit Note'})),
  ];
  const months = [...new Set(allDocs.map(d=>(d.date||'').slice(0,7)).filter(Boolean))].sort().reverse();
  const now = new Date();
  const curYYYYMM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const firstDay = curYYYYMM+'-01';
  const lastDay  = today();

  const html = `<div class="overlay"><div class="modal" style="width:640px;max-height:92vh;overflow-y:auto">
    <div class="modal-hdr">
      <h3>📊 Export Report</h3>
      <button class="modal-close" onclick="MODAL=null;render()">×</button>
    </div>

    <!-- Report category tabs -->
    <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--card2);border-radius:var(--radius);padding:4px">
      ${[['docs','📄 Documents'],['clients','👥 Clients'],['suppliers','🏭 Suppliers'],['products','📦 Products']].map(([v,l])=>
        `<button id="rcat-${v}" onclick="rptSetCat('${v}')"
          style="flex:1;padding:7px 4px;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;
          background:${v==='docs'?'var(--accent-tx)':'transparent'};color:${v==='docs'?'#fff':'var(--text)'};">${l}</button>`
      ).join('')}
    </div>

    <!-- DOCUMENTS FILTERS -->
    <div id="rpt-docs-filters">
      <div style="margin-bottom:10px">
        <label style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Period</label>
        <div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer"><input type="radio" name="rpt-mode" value="month" checked onchange="rptToggleMode(this.value)"> Monthly</label>
          <label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer"><input type="radio" name="rpt-mode" value="custom" onchange="rptToggleMode(this.value)"> Custom range</label>
          <label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer"><input type="radio" name="rpt-mode" value="all" onchange="rptToggleMode(this.value)"> All time</label>
        </div>
      </div>
      <div id="rpt-monthly-row" class="frow c2" style="margin-bottom:10px">
        <div class="fgrp"><label>Month</label>
          <select id="rpt-month" onchange="previewReport()">
            ${months.map(m=>`<option value="${m}" ${m===curYYYYMM?'selected':''}>${esc(fmtMonthLabel(m))}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="rpt-custom-row" class="frow c2" style="margin-bottom:10px;display:none">
        <div class="fgrp"><label>From date</label><input type="date" id="rpt-from" value="${firstDay}" onchange="previewReport()"/></div>
        <div class="fgrp"><label>To date</label><input type="date" id="rpt-to" value="${lastDay}" onchange="previewReport()"/></div>
      </div>
      <div class="frow c2" style="margin-bottom:14px">
        <div class="fgrp"><label>Document type</label>
          <select id="rpt-type" onchange="previewReport()">
            <option value="all">All documents</option>
            <option value="Quotation">Quotations</option>
            <option value="Sales Order">Sales Orders</option>
            <option value="Invoice">Invoices</option>
            <option value="Delivery Order">Delivery Orders</option>
            <option value="Purchase Order">Purchase Orders</option>
            <option value="Purchase Invoice">Purchase Invoices</option>
            <option value="Goods Received">Goods Received</option>
            <option value="Credit Note">Credit Notes</option>
            <option value="Debit Note">Debit Notes</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Summary chips + preview table (shared) -->
    <div id="rpt-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:14px;max-height:280px;overflow-y:auto">
      <div id="rpt-summary" style="font-size:12px;color:var(--muted)">Loading…</div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
      <button class="btn" onclick="MODAL=null;render()">Cancel</button>
      <button class="btn btn-navy" onclick="previewReport()">🔄 Refresh</button>
      <button class="btn" onclick="printReport('print')">🖨 Print</button><button class="btn btn-navy" onclick="printReport('pdf')">⬇ Download PDF</button>
      <button class="btn btn-gold" onclick="downloadCSV()">⬇ Download CSV</button>
      <button class="btn" onclick="downloadFullBackup()" title="Everything — documents, clients, suppliers, products, settings — in one file">🗄 Full backup (JSON)</button>
    </div>
  </div></div>`;
  setTimeout(()=>{ window._rptCat='docs'; previewReport(); }, 60);
  return html;
}

function rptSetCat(cat){
  window._rptCat=cat;  // preview, print, PDF and CSV all read this
  // Style tabs
  ['docs','clients','suppliers','products'].forEach(v=>{
    const btn=document.getElementById('rcat-'+v);
    if(!btn) return;
    btn.style.background = v===cat ? 'var(--accent-tx)' : 'transparent';
    btn.style.color      = v===cat ? '#fff' : 'var(--text)';
  });
  // Show/hide doc filters
  const df=document.getElementById('rpt-docs-filters');
  if(df) df.style.display = cat==='docs' ? '' : 'none';
  previewReport();
}

function rptToggleMode(mode){
  document.getElementById('rpt-monthly-row').style.display = mode==='month'  ? '' : 'none';
  document.getElementById('rpt-custom-row').style.display  = mode==='custom' ? '' : 'none';
  previewReport();
}

function fmtMonthLabel(yyyymm){
  if(!yyyymm) return '—';
  const [y,m] = yyyymm.split('-');
  const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${mNames[parseInt(m)-1]} ${y}`;
}

function getRptPeriodLabel(){
  const mode = document.querySelector('input[name="rpt-mode"]:checked')?.value || 'month';
  if(mode==='all') return 'All_Time';
  if(mode==='custom'){
    const f=document.getElementById('rpt-from')?.value||'';
    const t=document.getElementById('rpt-to')?.value||'';
    return `${f}_to_${t}`;
  }
  return fmtMonthLabel(document.getElementById('rpt-month')?.value||'').replace(' ','_');
}

function getReportDocs(){
  const mode = document.querySelector('input[name="rpt-mode"]:checked')?.value || 'month';
  const type = document.getElementById('rpt-type')?.value || 'all';
  const month= document.getElementById('rpt-month')?.value || '';
  const from = document.getElementById('rpt-from')?.value  || '';
  const to   = document.getElementById('rpt-to')?.value    || '';
  const all = [
    ...DB.quotations.map(d=>({...d,_type:'Quotation',    _party:cName(d.clientId)})),
    ...DB.invoices.map(d=>({...d,_type:'Invoice',         _party:cName(d.clientId)})),
    ...DB.dos.map(d=>({...d,_type:'Delivery Order',       _party:cName(d.clientId)})),
    ...DB.pos.map(d=>({...d,_type:'Purchase Order',       _party:sName(d.supplierId)})),
    ...DB.clientPOs.map(d=>({...d,_type:'Sales Order',    _party:cName(d.clientId)})),
    ...DB.supInvoices.map(d=>({...d,_type:'Purchase Invoice',_party:sName(d.supplierId)})),
    ...DB.supDOs.map(d=>({...d,_type:'Goods Received',    _party:sName(d.supplierId),amount:0})),
    ...DB.creditNotes.map(d=>({...d,_type:'Credit Note',  _party:d.partyType==='supplier'?sName(d.supplierId):cName(d.clientId)})),
    ...DB.debitNotes.map(d=>({...d,_type:'Debit Note',    _party:d.partyType==='supplier'?sName(d.supplierId):cName(d.clientId)})),
  ];
  return all.filter(d=>{
    const dt=d.date||'';
    let ok=true;
    if(mode==='month')  ok=dt.startsWith(month);
    if(mode==='custom') ok=(!from||dt>=from)&&(!to||dt<=to);
    return ok&&(type==='all'||d._type===type);
  }).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}

function previewReport(){
  const cat = window._rptCat || 'docs';
  const chips = document.getElementById('rpt-chips');
  const el    = document.getElementById('rpt-summary');
  if(!el) return;

  // ── DATABASE REPORTS (no date filter needed) — same columns as the CSV / PDF ──
  if(cat!=='docs'){
    const r=masterReport(cat);
    if(chips) chips.innerHTML=r.chips.map(([t,n])=>`<span style="background:var(--accent-bg);color:var(--accent-tx);padding:2px 10px;border-radius:20px;font-size:12px">${t}: <strong>${n}</strong></span>`).join('');
    if(!r.rows.length){ el.innerHTML=`<div style="text-align:center;padding:16px;color:var(--muted)">No ${cat} yet.</div>`; return; }
    el.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap">
      <thead><tr style="background:var(--card2)">${r.headers.map(h=>`<th style="padding:5px 8px;border-bottom:1px solid var(--border);text-align:left">${h}</th>`).join('')}</tr></thead>
      <tbody>${r.rows.map(row=>`<tr style="border-bottom:1px solid var(--border)">${row.map((v,i)=>`<td style="padding:5px 8px;${i===1?'font-weight:600':''}">${escAttr(v)||'—'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`; return;
  }

  // ── DOCUMENTS ──
  const docs=getReportDocs();
  const totalAmt=docs.reduce((s,d)=>s+(d.amount||0),0);
  const byType={};
  docs.forEach(d=>{ byType[d._type]=(byType[d._type]||0)+1; });
  if(chips) chips.innerHTML=Object.entries(byType).map(([t,c])=>
    `<span style="background:var(--accent-bg);color:var(--accent-tx);padding:2px 10px;border-radius:20px;font-size:12px">${t}: <strong>${c}</strong></span>`
  ).join('')+`<span style="background:var(--card2);border:1px solid var(--border);padding:2px 10px;border-radius:20px;font-size:12px">Total: <strong>${esc(fmt(totalAmt))}</strong></span>`;
  if(!docs.length){ el.innerHTML='<div style="text-align:center;padding:16px;color:var(--muted)">No records found.</div>'; return; }
  el.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--card2)">
      <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border)">Type</th>
      <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border)">Doc No.</th>
      <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border)">Date</th>
      <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border)">Party</th>
      <th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--border)">Amount</th>
      <th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--border)">${esc(CO.fxRates?.base||'SGD')} Equiv.</th>
      <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border)">Status</th>
    </tr></thead>
    <tbody>${docs.map(d=>`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:5px 8px;color:var(--muted)">${esc(d._type)}</td>
      <td style="padding:5px 8px;font-family:monospace">${esc(d.id)}</td>
      <td style="padding:5px 8px">${esc(d.date||'—')}</td>
      <td style="padding:5px 8px">${esc(d._party||'—')}</td>
      <td style="padding:5px 8px;text-align:right">${esc(d.amount?fmt(d.amount,d.currency):'—')}</td>
      <td style="padding:5px 8px;text-align:right;color:var(--accent-tx)">${esc(d.amount?fmtBase(d.amount,d.currency):'—')}</td>
      <td style="padding:5px 8px"><span class="badge b-${esc(d.status||'')}">${esc(d.status||'—')}</span></td>
    </tr>`).join('')}
    <tr style="background:var(--card2);font-weight:700">
      <td colspan="4" style="padding:6px 8px;text-align:right">Total (${esc(CO.fxRates?.base||'SGD')} equivalent)</td>
      <td></td>
      <td style="padding:6px 8px;text-align:right">${esc(fmt(docs.reduce((s,d)=>s+toBase(d.amount||0,d.currency),0),CO.fxRates?.base||'SGD'))}</td>
      <td></td>
    </tr></tbody></table>`;
}

// One quoted CSV cell. Text Excel would run as a formula is neutralised: "=…"/"@…" get a leading ',
// and "+…"/"-…" that isn't a plain number (e.g. phone "+65 8838 6949") gets a leading space so it stays text.
function csvCell(v){
  let s=String(v??'');
  if(/^[=@]/.test(s)) s="'"+s;
  else if(/^[+\-]/.test(s)&&!/^-?\d+(\.\d+)?$/.test(s)) s=' '+s;
  return `"${s.replace(/"/g,'""')}"`;
}

// Clients / suppliers / products as one table: headers, rows and summary chips.
// Preview, Print/PDF and CSV all use this, so they always show the same thing.
function masterReport(cat){
  const status=list=>[['Active',list.filter(x=>(x.status||'active')==='active').length],['Inactive',list.filter(x=>x.status==='inactive').length]];
  if(cat==='clients') return {title:'Client List', label:'Clients',
    headers:['ID','Name','Contact','Tel','Email','Address','Country','Industry','GST Reg No.','Payment Terms','Status','Notes'],
    rows:DB.clients.map(c=>[c.id,c.name,c.contact,c.tel,c.email,c.addr,c.country,c.industry,c.gst,c.terms,c.status,c.notes].map(v=>v??'')),
    chips:[['Total clients',DB.clients.length],...status(DB.clients)]};
  if(cat==='suppliers') return {title:'Supplier List', label:'Suppliers',
    headers:['ID','Name','Contact','Tel','Email','Address','Country','Category','Currency','Payment Terms','Status','Notes'],
    rows:DB.suppliers.map(s=>[s.id,s.name,s.contact,s.tel,s.email,s.addr,s.country,s.category,s.currency,s.terms,s.status,s.notes].map(v=>v??'')),
    chips:[['Total suppliers',DB.suppliers.length],...status(DB.suppliers)]};
  return {title:'Product List', label:'Products',
    headers:['Code','Name','Category','Unit','Unit Price','Currency','Supplier','Status','Notes'],
    rows:DB.products.map(p=>[p.code,p.name,p.category,p.unit,p.unitPrice!=null&&p.unitPrice!==''?Number(p.unitPrice).toFixed(2):'',p.currency||CO.currency,p.supplierId?sName(p.supplierId):'',p.status,p.notes].map(v=>v??'')),
    chips:[['Total products',DB.products.length],...status(DB.products)]};
}

function printReport(mode='print'){
  const cat=window._rptCat||'docs';
  let title='', headers=[], rows=[], chips='', period='';

  if(cat!=='docs'){
    const r=masterReport(cat);
    title=r.title; period='All'; headers=r.headers;
    rows=r.rows.map(row=>row.map(v=>escAttr(v).replace(/\n/g,'<br>')));
    chips=r.chips.map(([t,n])=>`<span class="chip">${t}: ${n}</span>`).join('');
  } else {
    const docs=getReportDocs();
    const totalAmt=docs.reduce((s,d)=>s+(d.amount||0),0);
    const byType={};
    docs.forEach(d=>{ byType[d._type]=(byType[d._type]||0)+1; });
    title='Document Report'; period=getRptPeriodLabel().replace(/_/g,' ');
    headers=['#','Type','Doc No.','Date','Party','Ref','Amount','Status'];
    rows=docs.map((d,i)=>[i+1,d._type,d.id,d.date||'',d._party||'',d.ref||d.supplierRef||'',d.amount?(d.currency||CO.currency)+' '+d.amount.toLocaleString('en-SG',{minimumFractionDigits:2}):'—',d.status||''].map(v=>esc(v)));
    chips=Object.entries(byType).map(([t,c])=>`<span class="chip">${t}: ${c}</span>`).join('')+`<span class="chip" style="background:#f0f4ff;color:#1e3a5f">Total: ${esc(CO.currency)} ${esc(totalAmt.toLocaleString('en-SG',{minimumFractionDigits:2}))}</span>`;
  }

  const printHtml='<!DOCTYPE html><html><head><title>'+esc(CO.name)+' — '+title+'</title>'
    +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px}'
    +'h1{font-size:18px;color:#1e3a5f;margin-bottom:2px}.sub{font-size:12px;color:#666;margin-bottom:10px}'
    +'.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.chip{background:#e8f0fe;color:#1a56db;padding:3px 12px;border-radius:20px;font-size:11px}'
    +'table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:#fff;padding:7px 8px;text-align:left;font-size:11px}'
    +'td{padding:6px 8px;border-bottom:1px solid #eee}tr:nth-child(even){background:#f9f9f9}'
    +'.footer{margin-top:14px;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:8px}'
    +'@media print{body{padding:8mm}@page{margin:8mm}}</style></head><body>'
    +'<h1>'+esc(CO.name)+'</h1>'
    +'<div class="sub">'+title+(period&&period!=='All'?' &nbsp;·&nbsp; Period: <strong>'+period+'</strong>':'')+' &nbsp;·&nbsp; Generated: '+esc(today())+'</div>'
    +'<div class="chips">'+chips+'</div>'
    +'<table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead>'
    +'<tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table>'
    +'<div class="footer">'+esc(CO.name)+' · '+esc(CO.email)+' · '+esc(CO.tel)+' · Printed '+esc(new Date().toLocaleString('en-SG'))+'</div>'
    +'</body></html>';
  const blob=new Blob([printHtml],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  if(mode==='print'){
    let fr=document.getElementById('_print_frame');
    if(fr) document.body.removeChild(fr);
    fr=document.createElement('iframe');
    fr.id='_print_frame';
    fr.style.cssText='position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0';
    document.body.appendChild(fr);
    fr.srcdoc=printHtml;
    fr.onload=function(){
      try{ fr.contentWindow.focus(); fr.contentWindow.print(); }
      catch(e){ const a=document.createElement('a');a.href=url;a.target='_blank';document.body.appendChild(a);a.click();document.body.removeChild(a); }
    };
  } else {
    const a=document.createElement('a'); a.href=url; a.target='_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    toast('Opened in new tab — choose "Save as PDF" in the print dialog');
  }
}

/* ── FULL BACKUP (JSON) ──
   One file with everything: every document, client, supplier and product, company settings
   and the numbering counters. Taken from the cloud when signed in, so it is complete even if
   this browser is behind; otherwise from this browser's copy (and says so in the file). */
async function downloadFullBackup(){
  toast('Preparing backup…');
  let records=null, settings=CO, counters=null, source='this browser (not signed in or offline)';
  const sb=getSB();
  if(sb&&AUTH_USER){
    try{
      const [rows,coRes,ctrRes]=await Promise.all([fetchAllRecords(sb),
        sb.from('mp_settings').select('value').eq('key','co').maybeSingle(), sb.from('mp_counters').select('prefix,n')]);
      records={}; rows.forEach(r=>{ (records[r.coll]=records[r.coll]||[]).push(r.data); });
      if(coRes.data&&coRes.data.value) settings=coRes.data.value;
      if(!ctrRes.error) counters=ctrRes.data;
      source='cloud';
    }catch(e){ console.warn('backup: cloud read failed, using local copy',e); }
  }
  if(!records){ records={}; COLLS.forEach(c=>{ records[c]=DB[c]||[]; }); }
  COLLS.forEach(c=>{ if(!records[c]) records[c]=[]; });
  const counts=Object.fromEntries(Object.entries(records).map(([c,a])=>[c,a.length]));
  const now=new Date(), p2=n=>String(n).padStart(2,'0');
  const stamp=`${now.getFullYear()}${p2(now.getMonth()+1)}${p2(now.getDate())}_${p2(now.getHours())}${p2(now.getMinutes())}`;  // local time
  const backup={app:'Macpro Document Hub',format:1,takenAt:now.toISOString(),takenBy:whoAmI(),source,
    counts,records,settings,counters};
  const blob=new Blob([JSON.stringify(backup,null,1)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=Object.assign(document.createElement('a'),{href:url,download:`${(CO.shortName||'Macpro').replace(/[^\w]+/g,'_').replace(/^_+|_+$/g,'')}_Backup_${stamp}.json`});
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(url),5000);
  try{ localStorage.setItem('mp_lastBackup',now.toISOString()); }catch(e){}
  const total=Object.values(counts).reduce((s,n)=>s+n,0);
  toast(`Backup downloaded: ${total} records${source==='cloud'?'':' (from this browser only)'}`,source==='cloud');
  if(PAGE==='settings'&&!MODAL) render();
}
function lastBackupText(){
  let at=null; try{ at=localStorage.getItem('mp_lastBackup'); }catch(e){}
  if(!at) return 'No backup downloaded on this computer yet.';
  const days=Math.floor((Date.now()-new Date(at))/864e5);
  return `Last downloaded on this computer: ${fmtWhen(at)}${days>=7?` — <strong style="color:var(--danger)">${days} days ago</strong>`:''}`;
}

function downloadCSV(){
  const cat=window._rptCat||'docs';
  let headers=[], rows=[], label='';

  if(cat!=='docs'){
    const r=masterReport(cat);
    label=`${r.label}_${today()}`; headers=r.headers; rows=r.rows;
  } else {
    const docs=getReportDocs();
    label=getRptPeriodLabel();
    const base=CO.fxRates?.base||'SGD';
    headers=['Document Type','Document No.','Date','Party (Client/Supplier)','Reference','Currency','Amount',base+' Equivalent','Status','Notes'];
    rows=docs.map(d=>[d._type,d.id,d.date||'',d._party||'',d.ref||d.supplierRef||'',d.currency||CO.currency,(d.amount||0).toFixed(2),toBase(d.amount||0,d.currency).toFixed(2),d.status||'',(d.notes||'').replace(/"/g,"'")]);
  }

  const csv=[headers,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=Object.assign(document.createElement('a'),{href:url,download:`${CO.shortName||'Macpro'}_${label}.csv`});
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  toast(`Downloaded: ${a.download}`);
}

/* ═══════════════════════════════════════════════
   CLIENT REPORT
═══════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════
   STATEMENT OF ACCOUNT (SOA)
═══════════════════════════════════════════════ */
function openSOAFromClient(cid){
  openModal('soa', null);
  setTimeout(()=>{
    const sel=document.getElementById('soa-client');
    if(sel){ sel.value=cid; previewSOA(); }
  }, 100);
}
function openSOAModal(){ openModal('soa', null); }

/* ═══════════════════════════════════════════════
   PAYMENT RECEIPT
═══════════════════════════════════════════════ */
function markInvoicePaid(invId){
  const inv = DB.invoices.find(x=>x.id===invId); if(!inv) return;
  if(inv.status==='draft'){ toast('Issue the invoice before recording a payment',false); return; }
  if(inv.status==='cancelled'){ toast('This invoice is voided',false); return; }
  // Show payment modal
  MODAL = {type:'payment', id:invId};
  render();
}

function markInvoiceUnpaid(invId){
  if(!confirm('Mark this invoice as unpaid / pending?')) return;
  const inv = DB.invoices.find(x=>x.id===invId); if(!inv) return;
  inv.status    = 'pending';
  inv.paidDate  = '';
  inv.paidRef   = '';
  inv.paidNote  = '';
  touch(inv,'marked unpaid');
  saveDB(); toast('Invoice marked as unpaid'); render();
}

function renderPaymentModal(){
  const invId = MODAL.id;
  const inv   = DB.invoices.find(x=>x.id===invId); if(!inv) return '';
  const cl    = DB.clients.find(x=>x.id===inv.clientId)||{};
  return `<div class="overlay"><div class="modal" style="width:480px">
    <div class="modal-hdr">
      <h3>✓ Record Payment</h3>
      <button class="modal-close" onclick="MODAL=null;render()">×</button>
    </div>

    <!-- Invoice summary -->
    <div style="background:var(--accent-bg);border:1px solid #bfdbfe;border-radius:var(--radius);padding:12px 14px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:10px;color:var(--accent-tx);text-transform:uppercase;letter-spacing:.5px;font-weight:700">Invoice</div>
          <div style="font-size:15px;font-weight:700;color:var(--navy);font-family:monospace">${invId}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(cl.name||'—')}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--accent-tx);text-transform:uppercase;letter-spacing:.5px;font-weight:700">Amount due</div>
          <div style="font-size:18px;font-weight:800;color:var(--navy)">${esc(fmt(inv.amount, inv.currency))}</div>
          <div style="font-size:11px;color:var(--muted)">Due: ${esc(inv.due||'—')}</div>
        </div>
      </div>
    </div>

    <div class="frow c2">
      <div class="fgrp"><label>Date payment received *</label>
        <input type="date" id="pay-date" value="${esc(today())}"/>
      </div>
      <div class="fgrp"><label>Payment method</label>
        <select id="pay-method">
          <option>Bank transfer</option>
          <option>Cheque</option>
          <option>Cash</option>
          <option>PayNow</option>
          <option>Credit card</option>
          <option>Other</option>
        </select>
      </div>
    </div>
    <div class="fgrp"><label>Payment reference / cheque no.</label>
      <input id="pay-ref" placeholder="e.g. TT ref, cheque no., transaction ID"/>
    </div>
    <div class="fgrp"><label>Amount received</label>
      <input type="text" inputmode="decimal" id="pay-amount" value="${esc(inv.amount)}" style="text-align:right"
        placeholder="${esc(inv.amount)}"/>
    </div>
    <div class="fgrp"><label>Notes (optional)</label>
      <input id="pay-note" placeholder="e.g. partial payment, bank charges deducted"/>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
      <button class="btn" onclick="MODAL=null;render()">Cancel</button>
      <button class="btn btn-navy" onclick="confirmPayment('${invId}')">✓ Confirm payment</button>
    </div>
  </div></div>`;
}

function confirmPayment(invId){
  const inv = DB.invoices.find(x=>x.id===invId); if(!inv) return;
  const date   = document.getElementById('pay-date')?.value   || today();
  const method = document.getElementById('pay-method')?.value || '';
  const ref    = document.getElementById('pay-ref')?.value    || '';
  const amount = parseFloat(document.getElementById('pay-amount')?.value)||inv.amount;
  const note   = document.getElementById('pay-note')?.value   || '';

  if(!date){ toast('Enter the payment date', false); return; }

  inv.status   = 'paid';
  inv.paidDate = date;
  inv.paidRef  = ref;
  inv.paidMethod = method;
  inv.paidAmount = amount;
  inv.paidNote = note;
  touch(inv,`payment recorded: ${fmt(amount,inv.currency)} on ${date}${method?' by '+method:''}${ref?' (ref '+ref+')':''}`);

  saveDB();
  MODAL = null;
  toast(`✓ Payment recorded — ${invId} marked as paid`);
  render();
}

function renderSOAModal(){
  const now = new Date();
  const curYYYYMM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const firstDay  = curYYYYMM+'-01';
  const lastDay   = today();
  const clientOpts = DB.clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');

  const html=`<div class="overlay"><div class="modal" style="width:660px;max-height:92vh;overflow-y:auto">
    <div class="modal-hdr">
      <h3>📋 Statement of Account</h3>
      <button class="modal-close" onclick="MODAL=null;render()">×</button>
    </div>

    <div class="frow c2" style="margin-bottom:10px">
      <div class="fgrp"><label>Client *</label>
        <select id="soa-client" onchange="previewSOA()">
          <option value="">— Select client —</option>${clientOpts}
        </select>
      </div>
      <div class="fgrp"><label>Currency view</label>
        <select id="soa-cur" onchange="previewSOA()">
          <option value="all">All currencies</option>
          <option value="SGD">SGD only</option>
          <option value="USD">USD only</option>
          <option value="MYR">MYR only</option>
          <option value="base">Converted to ${esc(CO.fxRates?.base||'SGD')}</option>
        </select>
      </div>
    </div>

    <div class="frow c2" style="margin-bottom:14px">
      <div class="fgrp"><label>From date</label>
        <input type="date" id="soa-from" value="${firstDay}" onchange="previewSOA()"/>
      </div>
      <div class="fgrp"><label>To date</label>
        <input type="date" id="soa-to" value="${lastDay}" onchange="previewSOA()"/>
      </div>
    </div>

    <!-- Client card -->
    <div id="soa-client-card" style="display:none;background:var(--accent-bg);border:1px solid #bfdbfe;border-radius:var(--radius);padding:10px 14px;margin-bottom:10px;font-size:12px"></div>

    <!-- Summary chips -->
    <div id="soa-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>

    <!-- Preview -->
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:14px;max-height:300px;overflow-y:auto">
      <div id="soa-preview" style="font-size:12px;color:var(--muted)">Select a client to generate statement.</div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
      <button class="btn" onclick="MODAL=null;render()">Cancel</button>
      <button class="btn btn-navy" onclick="previewSOA()">🔄 Refresh</button>
      <button class="btn" onclick="printSOA('print')">🖨 Print</button>
      <button class="btn btn-navy" onclick="printSOA('pdf')">⬇ Download PDF</button>
      <button class="btn btn-gold" onclick="downloadSOACSV()">⬇ Download CSV</button>
    </div>
  </div></div>`;
  setTimeout(()=>{ if(DB.clients.length===1){ document.getElementById('soa-client').value=DB.clients[0].id; previewSOA(); } }, 80);
  return html;
}

function getSOAData(){
  const cid  = document.getElementById('soa-client')?.value||'';
  const from = document.getElementById('soa-from')?.value||'';
  const to   = document.getElementById('soa-to')?.value||'';
  const curV = document.getElementById('soa-cur')?.value||'all';
  if(!cid) return {cl:null,rows:[],totalInvoiced:0,totalPaid:0,balance:0,base:CO.fxRates?.base||'SGD'};

  const cl = DB.clients.find(x=>x.id===cid)||{};
  const base = CO.fxRates?.base||'SGD';
  const inPeriod = d => { const dt=d.date||''; return (!from||dt>=from) && (!to||dt<=to); };

  // Invoices for this client in period
  const invoices = DB.invoices.filter(d=>isIssued(d) && d.clientId===cid && inPeriod(d));
  const invRows = invoices.map(d=>{
    const origAmt = d.amount||0;
    const dispAmt = curV==='base' ? toBase(origAmt,d.currency) : origAmt;
    const dispCur  = curV==='base' ? base : d.currency;
    const isPaid   = d.status==='paid';
    return {
      date:d.date, docNo:d.id, ref:d.ref||'—', currency:d.currency, docType:'Invoice',
      origAmt, dispAmt, dispCur,
      invoiced: isPaid ? 0 : dispAmt,
      paid:     isPaid ? dispAmt : 0,
      status:d.status
    };
  });

  // Credit Notes for this client in period — reduce the balance, like a payment
  const cnRows = DB.creditNotes.filter(d=>isIssued(d) && d.partyType!=='supplier' && d.clientId===cid && inPeriod(d)).map(d=>{
    const origAmt = d.amount||0;
    const dispAmt = curV==='base' ? toBase(origAmt,d.currency) : origAmt;
    const dispCur  = curV==='base' ? base : d.currency;
    return { date:d.date, docNo:d.id, ref:d.ref||'—', currency:d.currency, docType:'Credit Note',
      origAmt, dispAmt, dispCur, invoiced:0, paid:dispAmt, status:d.status||'draft' };
  });

  // Debit Notes for this client in period — increase the balance, like an invoice
  const dnRows = DB.debitNotes.filter(d=>isIssued(d) && d.partyType!=='supplier' && d.clientId===cid && inPeriod(d)).map(d=>{
    const origAmt = d.amount||0;
    const dispAmt = curV==='base' ? toBase(origAmt,d.currency) : origAmt;
    const dispCur  = curV==='base' ? base : d.currency;
    return { date:d.date, docNo:d.id, ref:d.ref||'—', currency:d.currency, docType:'Debit Note',
      origAmt, dispAmt, dispCur, invoiced:dispAmt, paid:0, status:d.status||'draft' };
  });

  // Build rows
  const rows = [...invRows, ...cnRows, ...dnRows]
    .filter(r=> curV==='all'||curV==='base'||(r.currency===curV))
    .sort((a,b)=>a.date.localeCompare(b.date));

  // Running balance
  let balance=0;
  rows.forEach(r=>{
    r.invoiced_amt=r.invoiced;
    const rawPaid = r.docType==='Invoice'
      ? (r.status==='paid' ? (r.paidAmount?toBase(r.paidAmount,r.currency):r.dispAmt) : 0)
      : r.paid;
    r.paid_amt=rawPaid;
    balance+=r.invoiced_amt-r.paid_amt;
    r.balance=balance;
  });

  const totalInvoiced = rows.reduce((s,r)=>s+r.invoiced_amt,0);
  const totalPaid     = rows.reduce((s,r)=>s+r.paid_amt,0);
  const dispCur       = curV==='base'?base:(curV==='all'?'(multi)':curV);

  return {cl,rows,totalInvoiced,totalPaid,balance,dispCur,base};
}

function previewSOA(){
  const {cl,rows,totalInvoiced,totalPaid,balance,dispCur} = getSOAData();
  const card=document.getElementById('soa-client-card');
  const chips=document.getElementById('soa-chips');
  const el=document.getElementById('soa-preview');

  if(card){
    if(cl?.name){
      card.style.display='';
      card.innerHTML=`<strong>${esc(cl.name)}</strong>${cl.tel?' &nbsp;·&nbsp; '+esc(cl.tel):''}${cl.email?' &nbsp;·&nbsp; '+esc(cl.email):''}${cl.contact?' &nbsp;·&nbsp; Attn: '+esc(cl.contact):''}${cl.addr?'<br><span style="color:var(--muted);white-space:pre-line">'+esc(cl.addr)+'</span>':''}`;
    } else card.style.display='none';
  }

  if(!cl?.name){ if(el) el.innerHTML='<div style="text-align:center;padding:16px;color:var(--muted)">Select a client above.</div>'; return; }

  if(chips) chips.innerHTML=`
    <span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:20px;font-size:12px">Invoiced: <strong>${dispCur!=='(multi)'?dispCur+' ':''} ${esc(totalInvoiced.toLocaleString('en-SG',{minimumFractionDigits:2}))}</strong></span>
    <span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:20px;font-size:12px">Paid: <strong>${esc(totalPaid.toLocaleString('en-SG',{minimumFractionDigits:2}))}</strong></span>
    <span style="background:${balance>0?'#fee2e2':'#d1fae5'};color:${balance>0?'#991b1b':'#065f46'};padding:2px 10px;border-radius:20px;font-size:12px">Balance: <strong>${esc(balance.toLocaleString('en-SG',{minimumFractionDigits:2}))}</strong></span>
    <span style="background:var(--card2);border:1px solid var(--border);padding:2px 10px;border-radius:20px;font-size:12px">${esc(rows.length)} entries</span>`;

  if(!rows.length){ if(el) el.innerHTML='<div style="text-align:center;padding:16px;color:var(--muted)">No transactions found for this client in the selected period.</div>'; return; }

  if(el) el.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--card2)">
      <th style="padding:5px 8px;border-bottom:1px solid var(--border)">Date</th>
      <th style="padding:5px 8px;border-bottom:1px solid var(--border)">Type</th>
      <th style="padding:5px 8px;border-bottom:1px solid var(--border)">Doc No.</th>
      <th style="padding:5px 8px;border-bottom:1px solid var(--border)">Ref</th>
      <th style="padding:5px 8px;border-bottom:1px solid var(--border)">Currency</th>
      <th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--border)">Invoiced</th>
      <th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--border)">Paid</th>
      <th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--border)">Balance</th>
      <th style="padding:5px 8px;border-bottom:1px solid var(--border)">Status</th>
    </tr></thead>
    <tbody>${rows.map(r=>`<tr style="border-bottom:1px solid var(--border);${r.status==='overdue'?'background:#fff5f5':''}">
      <td style="padding:5px 8px">${esc(r.date)}</td>
      <td style="padding:5px 8px;font-size:11px;color:var(--muted)">${esc(r.docType)}</td>
      <td style="padding:5px 8px;font-family:monospace;font-size:11px">${esc(r.docNo)}</td>
      <td style="padding:5px 8px;color:var(--muted)">${esc(r.ref)}</td>
      <td style="padding:5px 8px;font-size:11px">${esc(r.currency)}</td>
      <td style="padding:5px 8px;text-align:right">${esc(r.invoiced_amt.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
      <td style="padding:5px 8px;text-align:right;color:var(--success-tx)">${esc(r.paid_amt>0?r.paid_amt.toLocaleString('en-SG',{minimumFractionDigits:2}):'—')}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:600;color:${r.balance>0?'#991b1b':'#065f46'}">${esc(r.balance.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
      <td style="padding:5px 8px"><span class="badge b-${esc(r.status)}">${esc(r.status)}</span></td>
    </tr>`).join('')}
    <tr style="background:var(--card2);font-weight:700">
      <td colspan="5" style="padding:6px 8px;text-align:right">Total</td>
      <td style="padding:6px 8px;text-align:right">${esc(totalInvoiced.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
      <td style="padding:6px 8px;text-align:right;color:var(--success-tx)">${esc(totalPaid.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
      <td style="padding:6px 8px;text-align:right;color:${balance>0?'#991b1b':'#065f46'}">${esc(balance.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
      <td></td>
    </tr></tbody></table>`;
}

function buildSOAHtml(){
  const {cl,rows,totalInvoiced,totalPaid,balance,dispCur} = getSOAData();
  const from=document.getElementById('soa-from')?.value||'';
  const to  =document.getElementById('soa-to')?.value||'';
  const css=`*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px;max-width:760px;margin:0 auto}
  h1{font-size:18px;color:#0B1F4B;margin-bottom:2px}.sub{font-size:12px;color:#666;margin-bottom:10px}
  .info{background:#f0f4ff;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:12px}
  .chips{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
  .chip{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
  table{width:100%;border-collapse:collapse}
  th{background:#0B1F4B;color:#fff;padding:8px 10px;text-align:left;font-size:11px}
  td{padding:7px 10px;border-bottom:1px solid #eee;font-size:12px}
  tr:nth-child(even){background:#f9f9f9}.r{text-align:right}
  .tot td{background:#f0f4ff;font-weight:700}
  .overdue{background:#fff5f5}
  .footer{margin-top:16px;border-top:1px solid #eee;padding-top:10px;font-size:10px;color:#aaa}
  .balance-box{border:2px solid #0B1F4B;border-radius:8px;padding:12px 18px;text-align:right;margin-top:14px;display:inline-block;min-width:220px}
  @media print{body{padding:8mm}@page{margin:8mm}}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SOA — ${esc(cl?.name||'')}</title><style>${css}</style></head><body>
  <h1>${esc(CO.name)}</h1>
  <div class="sub">Statement of Account &nbsp;·&nbsp; Period: <strong>${from}</strong> to <strong>${to}</strong></div>
  <div class="info">
    <strong>${esc(cl?.name||'—')}</strong>${cl?.tel?' &nbsp;·&nbsp; '+esc(cl.tel):''}${cl?.email?' &nbsp;·&nbsp; '+esc(cl.email):''}<br>
    ${esc(cl?.addr||'')}${cl?.contact?'<br>Attn: '+esc(cl.contact):''}
  </div>
  <table><thead><tr>
    <th>Date</th><th>Type</th><th>Doc No.</th><th>Reference</th><th>Currency</th>
    <th class="r">Invoiced</th><th class="r">Paid</th><th class="r">Balance</th><th>Status</th>
  </tr></thead><tbody>
  ${rows.map(r=>`<tr class="${r.status==='overdue'?'overdue':''}">
    <td>${esc(r.date)}</td>
    <td style="color:#666;font-size:11px">${esc(r.docType)}</td>
    <td style="font-family:monospace">${esc(r.docNo)}</td>
    <td>${esc(r.ref)}</td>
    <td>${esc(r.currency)}</td>
    <td class="r">${esc(r.invoiced_amt.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
    <td class="r" style="color:#065f46">${esc(r.paid_amt>0?r.paid_amt.toLocaleString('en-SG',{minimumFractionDigits:2}):'—')}</td>
    <td class="r" style="color:${r.balance>0?'#991b1b':'#065f46'};font-weight:600">${esc(r.balance.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
    <td>${esc(r.status)}</td>
  </tr>`).join('')}
  <tr class="tot">
    <td colspan="5" class="r">Total</td>
    <td class="r">${esc(totalInvoiced.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
    <td class="r" style="color:#065f46">${esc(totalPaid.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
    <td class="r" style="color:${balance>0?'#991b1b':'#065f46'}">${esc(balance.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
    <td></td>
  </tr></tbody></table>
  <div style="text-align:right;margin-top:14px">
    <div class="balance-box">
      <div style="font-size:11px;color:#666;margin-bottom:4px">AMOUNT DUE</div>
      <div style="font-size:22px;font-weight:800;color:${balance>0?'#991b1b':'#065f46'}">${dispCur!=='(multi)'?dispCur+' ':''} ${esc(balance.toLocaleString('en-SG',{minimumFractionDigits:2}))}</div>
    </div>
  </div>
  <div class="footer">${esc(CO.name)} · ${esc(CO.email)} · ${esc(CO.tel)} · ${esc(CO.addr)}<br>Generated ${esc(new Date().toLocaleString('en-SG'))} · This is a computer-generated statement.</div>
  </body></html>`;
}

function printSOA(mode='print'){
  const {cl,rows} = getSOAData();
  if(!cl?.name){ toast('Select a client first', false); return; }
  if(!rows.length){ toast('No invoices found for this period', false); return; }
  const html=buildSOAHtml();
  if(mode==='print'){
    let fr=document.getElementById('_print_frame');
    if(fr) document.body.removeChild(fr);
    fr=document.createElement('iframe');
    fr.id='_print_frame';
    fr.style.cssText='position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0';
    document.body.appendChild(fr);
    fr.srcdoc=html;
    fr.onload=function(){ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){} };
  } else {
    const from=document.getElementById('soa-from')?.value||today();
    const to  =document.getElementById('soa-to')?.value||today();
    const fname=`SOA_${cl.name.replace(/\s+/g,'_')}_${from}_${to}`;
    const blob=new Blob([html],{type:'text/html'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.target='_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    toast('Opened — choose "Save as PDF" in print dialog');
  }
}

function downloadSOACSV(){
  const {cl,rows,totalInvoiced,totalPaid,balance,dispCur} = getSOAData();
  if(!cl?.name){ toast('Select a client first', false); return; }
  const from=document.getElementById('soa-from')?.value||'';
  const to  =document.getElementById('soa-to')?.value||'';
  const headers=['Date','Type','Doc No.','Reference','Currency','Invoiced','Paid','Balance','Status'];
  const csvRows=rows.map(r=>[r.date,r.docType,r.docNo,r.ref,r.currency,r.invoiced_amt.toFixed(2),r.paid_amt.toFixed(2),r.balance.toFixed(2),r.status]);
  csvRows.push([]);
  csvRows.push(['','','','','Total',totalInvoiced.toFixed(2),totalPaid.toFixed(2),balance.toFixed(2),'']);
  const csv=[
    [`Statement of Account — ${cl.name}`],
    [`Period: ${from} to ${to}`],
    [`Generated: ${today()}`],
    [],
    headers,
    ...csvRows
  ].map(r=>r.map?r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','):'').join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=Object.assign(document.createElement('a'),{href:url,download:`SOA_${cl.name.replace(/\s+/g,'_')}_${from}_${to}.csv`});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  toast('SOA CSV downloaded');
}

function openClientReportModal(){ openModal('client-report', null); }

function renderClientReportModal(){
  const now = new Date();
  const curYYYYMM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const firstDay = curYYYYMM+'-01';
  const lastDay  = today();
  const clientOpts = DB.clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');

  const html = `<div class="overlay"><div class="modal" style="width:620px;max-height:90vh;overflow-y:auto">
    <div class="modal-hdr">
      <h3>👤 Client Report</h3>
      <button class="modal-close" onclick="MODAL=null;render()">×</button>
    </div>

    <div class="frow c2" style="margin-bottom:10px">
      <div class="fgrp"><label>Client *</label>
        <select id="cr-client" onchange="previewClientReport()">
          <option value="">— Select client —</option>
          ${clientOpts}
        </select>
      </div>
      <div class="fgrp"><label>Document type</label>
        <select id="cr-type" onchange="previewClientReport()">
          <option value="all">All documents</option>
          <option value="Sales Order">Sales Orders</option>
          <option value="Quotation">Quotations</option>
          <option value="Invoice">Invoices</option>
          <option value="Delivery Order">Delivery Orders</option>
        </select>
      </div>
    </div>

    <div style="margin-bottom:10px">
      <label style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Period</label>
      <div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer"><input type="radio" name="cr-mode" value="month" checked onchange="crToggleMode(this.value)"> Monthly</label>
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer"><input type="radio" name="cr-mode" value="custom" onchange="crToggleMode(this.value)"> Custom range</label>
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer"><input type="radio" name="cr-mode" value="all" onchange="crToggleMode(this.value)"> All time</label>
      </div>
    </div>

    <div id="cr-monthly-row" class="frow c2" style="margin-bottom:10px">
      <div class="fgrp"><label>Month</label>
        <select id="cr-month" onchange="previewClientReport()">
          ${[...new Set([
              ...DB.quotations,...DB.invoices,...DB.dos,...DB.clientPOs
            ].map(d=>(d.date||'').slice(0,7)).filter(Boolean))].sort().reverse()
            .map(m=>`<option value="${m}" ${m===curYYYYMM?'selected':''}>${esc(fmtMonthLabel(m))}</option>`).join('')}
        </select>
      </div>
    </div>

    <div id="cr-custom-row" class="frow c2" style="margin-bottom:10px;display:none">
      <div class="fgrp"><label>From date</label><input type="date" id="cr-from" value="${firstDay}" onchange="previewClientReport()"/></div>
      <div class="fgrp"><label>To date</label><input type="date" id="cr-to" value="${lastDay}" onchange="previewClientReport()"/></div>
    </div>

    <!-- Client summary card -->
    <div id="cr-client-card" style="display:none;background:var(--accent-bg);border:1px solid #bfdbfe;border-radius:var(--radius);padding:10px 14px;margin-bottom:10px;font-size:12px"></div>

    <!-- Summary chips -->
    <div id="cr-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px"></div>

    <!-- Preview table -->
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:14px;max-height:260px;overflow-y:auto">
      <div id="cr-summary" style="font-size:12px;color:var(--muted)">Select a client to preview their documents.</div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
      <button class="btn" onclick="MODAL=null;render()">Cancel</button>
      <button class="btn btn-navy" onclick="previewClientReport()">🔄 Refresh</button>
      <button class="btn" onclick="printClientReport('print')">🖨 Print</button><button class="btn btn-navy" onclick="printClientReport('pdf')">⬇ Download PDF</button>
      <button class="btn btn-gold" onclick="downloadClientCSV()">⬇ Download CSV</button>
    </div>
  </div></div>`;
  return html;
}

function crToggleMode(mode){
  document.getElementById('cr-monthly-row').style.display = mode==='month'  ? '' : 'none';
  document.getElementById('cr-custom-row').style.display  = mode==='custom' ? '' : 'none';
  previewClientReport();
}

function getClientReportDocs(){
  const cid  = document.getElementById('cr-client')?.value || '';
  const type = document.getElementById('cr-type')?.value   || 'all';
  const mode = document.querySelector('input[name="cr-mode"]:checked')?.value || 'month';
  const month= document.getElementById('cr-month')?.value  || '';
  const from = document.getElementById('cr-from')?.value   || '';
  const to   = document.getElementById('cr-to')?.value     || '';
  if(!cid) return [];
  const all = [
    ...DB.quotations.map(d=>({...d,_type:'Quotation',    _party:cName(d.clientId)})),
    ...DB.invoices.map(d=>({...d,_type:'Invoice',         _party:cName(d.clientId)})),
    ...DB.dos.map(d=>({...d,_type:'Delivery Order',       _party:cName(d.clientId)})),
    ...DB.clientPOs.map(d=>({...d,_type:'Sales Order',    _party:cName(d.clientId)})),
  ].filter(d=>d.clientId===cid);
  return all.filter(d=>{
    const dt=d.date||'';
    let ok=true;
    if(mode==='month')  ok=dt.startsWith(month);
    if(mode==='custom') ok=(!from||dt>=from)&&(!to||dt<=to);
    return ok&&(type==='all'||d._type===type);
  }).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}

function getCrPeriodLabel(){
  const mode=document.querySelector('input[name="cr-mode"]:checked')?.value||'month';
  if(mode==='all') return 'All_Time';
  if(mode==='custom'){
    const f=document.getElementById('cr-from')?.value||'';
    const t=document.getElementById('cr-to')?.value||'';
    return `${f}_to_${t}`;
  }
  return fmtMonthLabel(document.getElementById('cr-month')?.value||'').replace(' ','_');
}

function previewClientReport(){
  const cid = document.getElementById('cr-client')?.value || '';
  const cl  = DB.clients.find(x=>x.id===cid);

  // Client card
  const card = document.getElementById('cr-client-card');
  if(card){
    if(cl){
      card.style.display='';
      card.innerHTML=`<strong>${esc(cl.name)}</strong> &nbsp;·&nbsp; ${esc(cl.contact||'')} &nbsp;·&nbsp; ${esc(cl.tel||'')} &nbsp;·&nbsp; ${esc(cl.email||'')}${cl.addr?`<br><span style="color:var(--muted)">${esc(cl.addr)}</span>`:''}`;
    } else { card.style.display='none'; }
  }

  const docs=getClientReportDocs();
  const totalAmt=docs.reduce((s,d)=>s+(d.amount||0),0);
  const byType={};
  docs.forEach(d=>{ byType[d._type]=(byType[d._type]||0)+1; });

  const chips=document.getElementById('cr-chips');
  if(chips) chips.innerHTML = !cid ? '' : Object.entries(byType).map(([t,c])=>
    `<span style="background:var(--accent-bg);color:var(--accent-tx);padding:2px 10px;border-radius:20px;font-size:12px">${t}: <strong>${c}</strong></span>`
  ).join('')+`<span style="background:var(--card2);border:1px solid var(--border);padding:2px 10px;border-radius:20px;font-size:12px">Total: <strong>${esc(fmt(totalAmt))}</strong></span>`;

  const el=document.getElementById('cr-summary');
  if(!el) return;
  if(!cid){ el.innerHTML='<div style="text-align:center;padding:16px;color:var(--muted)">Select a client above.</div>'; return; }
  if(!docs.length){ el.innerHTML='<div style="text-align:center;padding:16px;color:var(--muted)">No documents found for this client and period.</div>'; return; }
  el.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:var(--card2)">
      <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border)">Type</th>
      <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border)">Doc No.</th>
      <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border)">Date</th>
      <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border)">Ref</th>
      <th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--border)">Amount</th>
      <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border)">Status</th>
    </tr></thead>
    <tbody>${docs.map(d=>`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:5px 8px;color:var(--muted)">${esc(d._type)}</td>
      <td style="padding:5px 8px;font-family:monospace">${esc(d.id)}</td>
      <td style="padding:5px 8px">${esc(d.date||'—')}</td>
      <td style="padding:5px 8px;color:var(--muted)">${esc(d.ref||'—')}</td>
      <td style="padding:5px 8px;text-align:right">${esc(d.amount?fmt(d.amount,d.currency):'—')}</td>
      <td style="padding:5px 8px"><span class="badge b-${esc(d.status||'')}">${esc(d.status||'—')}</span></td>
    </tr>`).join('')}
    <tr style="background:var(--card2);font-weight:700">
      <td colspan="4" style="padding:6px 8px;text-align:right">Total</td>
      <td style="padding:6px 8px;text-align:right">${esc(fmt(totalAmt))}</td><td></td>
    </tr></tbody></table>`;
}

function printClientReport(mode='print'){
  const cid=document.getElementById('cr-client')?.value||'';
  const cl=DB.clients.find(x=>x.id===cid)||{name:'Unknown Client'};
  const docs=getClientReportDocs();
  const period=getCrPeriodLabel().replace(/_/g,' ');
  const type=document.getElementById('cr-type')?.value||'all';
  const totalAmt=docs.reduce((s,d)=>s+(d.amount||0),0);
  const byType={};
  docs.forEach(d=>{ byType[d._type]=(byType[d._type]||0)+1; });
  const rows=docs.map((d,i)=>
    '<tr><td>'+(i+1)+'</td><td>'+esc(d._type)+'</td>'
    +'<td style="font-family:monospace">'+esc(d.id)+'</td>'
    +'<td>'+esc(d.date)+'</td><td>'+(esc(d.ref||'—'))+'</td>'
    +'<td style="text-align:right">'+(esc(d.amount?(d.currency||CO.currency)+' '+d.amount.toLocaleString('en-SG',{minimumFractionDigits:2}):'—'))+'</td>'
    +'<td>'+(esc(d.status||'—'))+'</td></tr>'
  ).join('');
  const chips=Object.entries(byType).map(([t,c])=>'<span class="chip">'+t+': '+c+'</span>').join('')
    +'<span class="chip" style="background:#f0f4ff;color:#1e3a5f">Total: '+esc(CO.currency)+' '+esc(totalAmt.toLocaleString('en-SG',{minimumFractionDigits:2}))+'</span>';
  const html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>Client Report — '+esc(cl.name)+'</title>'
    +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px}'
    +'h1{font-size:18px;color:#1e3a5f;margin-bottom:2px}'
    +'.sub{font-size:12px;color:#666;margin-bottom:10px}'
    +'.info{font-size:12px;color:#444;margin-bottom:14px;padding:8px 12px;background:#f0f4ff;border-radius:6px}'
    +'.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}'
    +'.chip{background:#e8f0fe;color:#1a56db;padding:3px 12px;border-radius:20px;font-size:11px}'
    +'table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:#fff;padding:7px 8px;text-align:left}'
    +'td{padding:6px 8px;border-bottom:1px solid #eee}tr:nth-child(even){background:#f9f9f9}'
    +'.r{text-align:right}.footer{margin-top:14px;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:8px}'
    +'@media print{body{padding:8mm}@page{margin:8mm}}</style></head><body>'
    +'<h1>'+esc(CO.name)+'</h1>'
    +'<div class="sub">Client Report &nbsp;·&nbsp; Period: <strong>'+period+'</strong> &nbsp;·&nbsp; Type: <strong>'+(type==='all'?'All':type)+'</strong></div>'
    +'<div class="info"><strong>'+esc(cl.name)+'</strong>'+(cl.tel?' &nbsp;·&nbsp; '+esc(cl.tel):'')+(cl.email?' &nbsp;·&nbsp; '+esc(cl.email):'')+(cl.contact?' &nbsp;·&nbsp; Attn: '+esc(cl.contact):'')+'</div>'
    +'<div class="chips">'+chips+'</div>'
    +'<table><thead><tr><th>#</th><th>Type</th><th>Doc No.</th><th>Date</th><th>Ref</th><th class="r">Amount</th><th>Status</th></tr></thead>'
    +'<tbody>'+rows
    +'<tr style="background:#f0f4ff;font-weight:700"><td colspan="5" style="text-align:right">Total</td><td style="text-align:right">'+esc(CO.currency)+' '+esc(totalAmt.toLocaleString('en-SG',{minimumFractionDigits:2}))+'</td><td></td></tr>'
    +'</tbody></table>'
    +'<div class="footer">'+esc(CO.name)+' · '+esc(CO.email)+' · '+esc(CO.tel)+' · Generated '+esc(new Date().toLocaleString('en-SG'))+'</div>'
    +'</body></html>';
  const blob=new Blob([html],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const fname=`ClientReport_${cl.name.replace(/\s+/g,'_')}_${getCrPeriodLabel()}`;
  if(mode==='print'){
    let fr=document.getElementById('_print_frame');
    if(fr) document.body.removeChild(fr);
    fr=document.createElement('iframe');
    fr.id='_print_frame';
    fr.style.cssText='position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0';
    document.body.appendChild(fr);
    fr.srcdoc=html;
    fr.onload=function(){
      try{ fr.contentWindow.focus(); fr.contentWindow.print(); }
      catch(e){ const a=document.createElement('a');a.href=url;a.target='_blank';document.body.appendChild(a);a.click();document.body.removeChild(a); }
    };
  } else {
    const a=document.createElement('a'); a.href=url; a.target='_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    toast('Opened in new tab — choose "Save as PDF" in the print dialog');
  }
}

function downloadClientCSV(){
  const cid=document.getElementById('cr-client')?.value||'';
  const cl=DB.clients.find(x=>x.id===cid)||{name:'Client'};
  const docs=getClientReportDocs();
  const label=`${cl.name.replace(/\s+/g,'_')}_${getCrPeriodLabel()}`;
  const base=CO.fxRates?.base||'SGD';
  const headers=['Document Type','Document No.','Date','Reference','Currency','Amount',base+' Equivalent','Status','Notes'];
  const rows=docs.map(d=>[d._type,d.id,d.date||'',d.ref||'',d.currency||CO.currency,(d.amount||0).toFixed(2),toBase(d.amount||0,d.currency).toFixed(2),d.status||'',(d.notes||'').replace(/"/g,"'")]);
  const csv=[headers,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=Object.assign(document.createElement('a'),{href:url,download:`ClientReport_${label}.csv`});
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  toast(`Downloaded: ${a.download}`);
}

function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const ov=document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('open');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

