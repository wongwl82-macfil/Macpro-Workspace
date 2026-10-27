/* Macpro Document Hub — js/documents.js
   Creating documents from other documents, the document form, line items, type-to-search picker,
   save / issue / lock / void, previews, print & PDF, supplier invoice / goods received / credit & debit note forms.
   Plain script (not a module): index.html loads the js/ files in order and they share one global scope,
   so the onclick="…" handlers in the page can call any function by name. */

/* ── FROM PO: QUICK-CREATE ── */
function fromPOtoSupInv(poId){
  const po=DB.pos.find(x=>x.id===poId); if(!po) return;
  DOC_TYPE='sup-invoice'; EDIT_ID='new'; DOC_TAB='edit';
  const sp=DB.suppliers.find(x=>x.id===po.supplierId)||{};
  LINE_ITEMS=po.lines&&po.lines.length?po.lines.map(l=>({...l})):[{desc:'Goods as per '+poId,qty:1,unit:'lot',unitPrice:po.amount}];
  FORM={supplierId:po.supplierId,date:today(),due:addDays(today(),30),ref:poId,supplierRef:'',
    terms:po.terms||'30 days',currency:po.currency||CO.currency,notes:'',attn:po.attn||sp.contact||'',
    docGstOn:undefined,docGstRate:undefined};
  FORM.due=dueFromTerms(FORM.terms,FORM.date);
  nav('sup-invoice'); setTimeout(()=>{DOC_TYPE='sup-invoice';EDIT_ID='new';render();},10);
}
function fromPOtoSupDO(poId){
  const po=DB.pos.find(x=>x.id===poId); if(!po) return;
  DOC_TYPE='sup-do'; EDIT_ID='new'; DOC_TAB='edit';
  const sp=DB.suppliers.find(x=>x.id===po.supplierId)||{};
  const items=po.lines&&po.lines.length?po.lines.map(l=>oneLine(l.desc)).join(', '):'Goods as per '+poId;
  FORM={supplierId:po.supplierId,date:today(),receivedDate:today(),ref:poId,sinvRef:'',
    items,notes:'',attn:po.attn||sp.contact||'',receivedBy:'',status:'received'};
  nav('sup-do'); setTimeout(()=>{DOC_TYPE='sup-do';EDIT_ID='new';render();},10);
}
function fromSupInvtoDO(sinvId){
  const si=DB.supInvoices.find(x=>x.id===sinvId); if(!si) return;
  DOC_TYPE='sup-do'; EDIT_ID='new'; DOC_TAB='edit';
  const sp=DB.suppliers.find(x=>x.id===si.supplierId)||{};
  const items=si.lines&&si.lines.length?si.lines.map(l=>oneLine(l.desc)).join(', '):'Goods as per '+si.ref;
  FORM={supplierId:si.supplierId,date:today(),receivedDate:today(),ref:si.ref||'',sinvRef:sinvId,
    items,notes:'',attn:si.attn||sp.contact||'',receivedBy:'',status:'received'};
  nav('sup-do'); setTimeout(()=>{DOC_TYPE='sup-do';EDIT_ID='new';render();},10);
}

/* ── QUOTATION → INVOICE / DO ── */
function fromQTtoInvoice(qtId){
  const qt=DB.quotations.find(x=>x.id===qtId); if(!qt) return;
  DOC_TYPE='invoice'; EDIT_ID='new'; DOC_TAB='edit';
  const cl=DB.clients.find(x=>x.id===qt.clientId)||{};
  LINE_ITEMS=qt.lines&&qt.lines.length?qt.lines.map(l=>({...l})):[{desc:'As per '+qtId,qty:1,unit:'lot',unitPrice:qt.amount}];
  FORM={
    clientId:qt.clientId, date:today(), due:addDays(today(),30),
    ref:qt.ref||qtId, terms:qt.terms||cl.terms||'30 days',
    currency:qt.currency||CO.currency, notes:qt.notes||'', attn:qt.attn||cl.contact||'',
    valid:addDays(today(),30),
    docGstOn:qt.docGstOn, docGstRate:qt.docGstRate,
    billingAddr:'', deliveryAddr:'', deliveryAttn:'',
    transport:'', ourRef:'', doRef:'', invRef:'', poRef:qt.ref||'',
    srcQtId:qtId,
  };
  FORM.due=dueFromTerms(FORM.terms,FORM.date);
  nav('invoice'); setTimeout(()=>{DOC_TYPE='invoice';EDIT_ID='new';render();},10);
}

function fromQTtoDO(qtId){
  const qt=DB.quotations.find(x=>x.id===qtId); if(!qt) return;
  DOC_TYPE='do'; EDIT_ID='new'; DOC_TAB='edit';
  const cl=DB.clients.find(x=>x.id===qt.clientId)||{};
  LINE_ITEMS=qt.lines&&qt.lines.length?qt.lines.map(l=>({...l})):[{desc:'As per '+qtId,qty:1,unit:'lot',unitPrice:0}];
  FORM={
    clientId:qt.clientId, date:today(),
    ref:qt.ref||qtId, terms:qt.terms||cl.terms||'30 days',
    currency:qt.currency||CO.currency, notes:qt.notes||'', attn:qt.attn||cl.contact||'',
    valid:addDays(today(),30), due:addDays(today(),30),
    docGstOn:undefined, docGstRate:undefined,
    billingAddr:'', deliveryAddr:'', deliveryAttn:'',
    transport:'', ourRef:'', doRef:'', invRef:'', poRef:qt.ref||'',
    srcType:'quotation', srcId:qtId,
  };
  nav('do'); setTimeout(()=>{DOC_TYPE='do';EDIT_ID='new';render();},10);
}

function fromQTtoSO(qtId){
  const qt=DB.quotations.find(x=>x.id===qtId); if(!qt) return;
  DOC_TYPE='client-po'; EDIT_ID='new'; DOC_TAB='edit';
  const cl=DB.clients.find(x=>x.id===qt.clientId)||{};
  LINE_ITEMS=qt.lines&&qt.lines.length?qt.lines.map(l=>({...l})):[{desc:'As per '+qtId,qty:1,unit:'lot',unitPrice:qt.amount||0}];
  FORM={
    clientId:qt.clientId, date:today(),
    ref:qt.ref||qtId, terms:qt.terms||cl.terms||'30 days',
    currency:qt.currency||CO.currency, notes:qt.notes||'', attn:qt.attn||cl.contact||'',
    valid:addDays(today(),30), due:addDays(today(),30),
    docGstOn:qt.docGstOn, docGstRate:qt.docGstRate,
    billingAddr:'', deliveryAddr:'', deliveryAttn:'',
    transport:'', ourRef:'', doRef:'', invRef:'', poRef:qt.ref||'',
    soStatus:'outstanding', srcQtId:qtId,
  };
  // The quotation is marked converted when the SO is saved (see linkSources)
  nav('client-po'); setTimeout(()=>{DOC_TYPE='client-po';EDIT_ID='new';render();},10);
}

function fromINVtoDO(invId){
  const inv=DB.invoices.find(x=>x.id===invId); if(!inv) return;
  DOC_TYPE='do'; EDIT_ID='new'; DOC_TAB='edit';
  const cl=DB.clients.find(x=>x.id===inv.clientId)||{};
  LINE_ITEMS=inv.lines&&inv.lines.length
    ? inv.lines.map(l=>({...l}))
    : [{desc:'As per invoice '+invId,qty:1,unit:'lot',unitPrice:0}];
  FORM={
    clientId:inv.clientId, date:today(),
    ref:inv.ref||invId, terms:inv.terms||cl.terms||'30 days',
    currency:inv.currency||CO.currency, notes:inv.notes||'', attn:inv.attn||cl.contact||'',
    valid:addDays(today(),30), due:addDays(today(),30),
    docGstOn:undefined, docGstRate:undefined,
    billingAddr:inv.billingAddr||'', deliveryAddr:inv.deliveryAddr||'',
    deliveryAttn:inv.deliveryAttn||'', transport:inv.transport||'',
    ourRef:inv.ourRef||'', doRef:'', invRef:invId, poRef:inv.poRef||inv.ref||'',
    srcType:'invoice', srcId:invId,
  };
  nav('do'); setTimeout(()=>{DOC_TYPE='do';EDIT_ID='new';render();},10);
}

/* ═══════════════════════════════════════════════
   DOC FORM
═══════════════════════════════════════════════ */
function openDocForm(type,id){
  DOC_TYPE=type; EDIT_ID=id; DOC_TAB='edit'; PROD_PICKER_IDX=-1;
  const isNew=id==='new';
  const map={quotation:DB.quotations,invoice:DB.invoices,do:DB.dos,po:DB.pos,'client-po':DB.clientPOs,'sup-invoice':DB.supInvoices,'sup-do':DB.supDOs,'credit-note':DB.creditNotes,'debit-note':DB.debitNotes};
  const rec=isNew?{}:(map[type]||[]).find(x=>x.id===id)||{};

  if(type==='sup-do'){
    // Supplier DO — no line items, different FORM shape
    FORM={
      supplierId:rec.supplierId||'', date:rec.date||today(),
      receivedDate:rec.receivedDate||today(), ref:rec.ref||'',
      sinvRef:rec.sinvRef||'', items:rec.items||'', notes:rec.notes||'',
      attn:rec.attn||'', receivedBy:rec.receivedBy||'', status:rec.status||'received',
    };
    LINE_ITEMS=[];
  } else {
    LINE_ITEMS=rec.lines&&rec.lines.length?rec.lines.map(l=>({...l})):[{desc:rec.items||'',qty:1,unit:'lot',unitPrice:rec.amount||0}];
    FORM={
      clientId:rec.clientId||'', supplierId:rec.supplierId||'',
      partyType:rec.partyType||'client',
      date:rec.date||today(), ref:rec.ref||'', terms:rec.terms||'30 days',
      currency:rec.currency||CO.currency, notes:rec.notes||'', attn:rec.attn||'',
      valid:rec.valid||addDays(today(),30), due:rec.due||addDays(today(),30),
      supplierRef:rec.supplierRef||'',
      status:rec.status,  // so a form shows (and re-saves) the document's real status
      clientInvRef:rec.clientInvRef||'',
      // Invoice / DO extra fields
      billingAddr:rec.billingAddr||'',
      deliveryAddr:rec.deliveryAddr||'',
      deliveryAttn:rec.deliveryAttn||'',
      doRef:rec.doRef||'',
      invRef:rec.invRef||'',
      poRef:rec.poRef||'',
      bankId:rec.bankId||'',
      ourRef:rec.ourRef||'',
      transport:rec.transport||'',
      soStatus:rec.status||'outstanding',      // Quotation-specific
      srcQtId:rec.srcQtId||'',
      pic:rec.pic||'', picTel:rec.picTel||'',
      validityText:rec.validityText||'30 Days',
      deliveryTerm:rec.deliveryTerm||'Ex-Singapore',
      delivery:rec.delivery||'',
      // Per-document GST
      docGstOn:  rec.docGstOn  !== undefined ? rec.docGstOn  : undefined,
      docGstRate:rec.docGstRate !== undefined ? rec.docGstRate : undefined,
    };
  }
  render();
}

function fromCPO(cpoId){
  const cpo=DB.clientPOs.find(d=>d.id===cpoId); if(!cpo) return;
  DOC_TYPE='quotation'; EDIT_ID='new'; DOC_TAB='edit';
  LINE_ITEMS=[{desc:cpo.items,qty:1,unit:'lot',unitPrice:cpo.amount}];
  const cl=DB.clients.find(x=>x.id===cpo.clientId)||{};
  FORM={clientId:cpo.clientId,date:today(),ref:cpo.ref,terms:cl.terms||'30 days',currency:CO.currency,notes:'',attn:cl.contact||'',valid:addDays(today(),30),due:addDays(today(),30),docGstOn:undefined,docGstRate:undefined};
  nav('quotation'); setTimeout(()=>{DOC_TYPE='quotation';EDIT_ID='new';render();},10);
}
function fromCPOInv(cpoId){
  const cpo=DB.clientPOs.find(d=>d.id===cpoId); if(!cpo) return;
  DOC_TYPE='invoice'; EDIT_ID='new'; DOC_TAB='edit';
  LINE_ITEMS=cpo.lines&&cpo.lines.length?cpo.lines.map(l=>({...l})):[{desc:cpo.items,qty:1,unit:'lot',unitPrice:cpo.amount}];
  const cl=DB.clients.find(x=>x.id===cpo.clientId)||{};
  FORM={clientId:cpo.clientId,date:today(),ref:cpo.ref,terms:cpo.terms||cl.terms||'30 days',currency:cpo.currency||CO.currency,notes:cpo.notes||'',attn:cpo.attn||cl.contact||'',valid:addDays(today(),30),due:addDays(today(),30),docGstOn:undefined,docGstRate:undefined,srcSoId:cpoId};
  // The SO is marked invoiced when the invoice is saved (see linkSources)
  FORM.due=dueFromTerms(FORM.terms,FORM.date);
  nav('invoice'); setTimeout(()=>{DOC_TYPE='invoice';EDIT_ID='new';render();},10);
}
function fromCPOtoDO(cpoId){
  const cpo=DB.clientPOs.find(d=>d.id===cpoId); if(!cpo) return;
  DOC_TYPE='do'; EDIT_ID='new'; DOC_TAB='edit';
  const cl=DB.clients.find(x=>x.id===cpo.clientId)||{};
  LINE_ITEMS=cpo.lines&&cpo.lines.length?cpo.lines.map(l=>({...l})):[{desc:cpo.items||('As per '+cpoId),qty:1,unit:'lot',unitPrice:0}];
  FORM={
    clientId:cpo.clientId, date:today(),
    ref:cpo.ref||cpoId, terms:cpo.terms||cl.terms||'30 days',
    currency:cpo.currency||CO.currency, notes:cpo.notes||'', attn:cpo.attn||cl.contact||'',
    valid:addDays(today(),30), due:addDays(today(),30),
    docGstOn:undefined, docGstRate:undefined,
    billingAddr:'', deliveryAddr:'', deliveryAttn:'',
    transport:'', ourRef:'', doRef:'', invRef:'', poRef:cpo.ref||'',
    srcType:'client-po', srcId:cpoId,
  };
  nav('do'); setTimeout(()=>{DOC_TYPE='do';EDIT_ID='new';render();},10);
}
function fromClient(cid){
  const cl=DB.clients.find(x=>x.id===cid)||{};
  DOC_TYPE='quotation'; EDIT_ID='new'; DOC_TAB='edit';
  LINE_ITEMS=[{desc:'',qty:1,unit:'pcs',unitPrice:0}];
  FORM={clientId:cid,date:today(),ref:'',terms:cl.terms||'30 days',currency:CO.currency,notes:'',attn:cl.contact||'',valid:addDays(today(),30),due:addDays(today(),30),docGstOn:undefined,docGstRate:undefined};
  nav('quotation'); setTimeout(()=>{DOC_TYPE='quotation';EDIT_ID='new';render();},10);
}
function fromSupplier(sid){
  const sp=DB.suppliers.find(x=>x.id===sid)||{};
  DOC_TYPE='po'; EDIT_ID='new'; DOC_TAB='edit';
  LINE_ITEMS=[{desc:'',qty:1,unit:'pcs',unitPrice:0}];
  FORM={supplierId:sid,date:today(),ref:'',terms:sp.terms||'30 days',currency:sp.currency||'MYR',notes:'',attn:sp.contact||'',valid:addDays(today(),30),due:addDays(today(),30),docGstOn:undefined,docGstRate:undefined};
  nav('po'); setTimeout(()=>{DOC_TYPE='po';EDIT_ID='new';render();},10);
}

// Product price in the document's currency, converted through the base currency at today's rates
function priceInDocCurrency(prod){
  const docCur=FORM.currency||CO.currency, pCur=prod.currency||CO.currency;
  if(pCur===docCur) return prod.unitPrice;
  const rate=getRate(docCur);
  if(!rate||!getRate(pCur)){ toast(`No ${!rate?docCur:pCur} rate set — price left in ${pCur}`,false); return prod.unitPrice; }
  const v=Math.round(toBase(prod.unitPrice,pCur)/rate*100)/100;
  toast(`${prod.code}: ${pCur} ${prod.unitPrice} → ${docCur} ${v}`);
  return v;
}
function selectProduct(idx, prodId){
  const prod=DB.products.find(p=>p.id===prodId); if(!prod) return;
  LINE_ITEMS[idx].desc=prod.name;
  LINE_ITEMS[idx].unit=prod.unit;
  LINE_ITEMS[idx].unitPrice=priceInDocCurrency(prod);
  PROD_PICKER_IDX=-1;
  const lb=document.getElementById('line-body'); if(lb){ lb.innerHTML=renderLines(); recalc(); }
}

function togglePicker(idx){
  PROD_PICKER_IDX=PROD_PICKER_IDX===idx?-1:idx;
  const lb=document.getElementById('line-body'); if(lb) lb.innerHTML=renderLines();
}

function renderDocForm(){
  if(DOC_TYPE==='sup-invoice') return renderSupInvoiceForm();
  if(DOC_TYPE==='sup-do')      return renderSupDOForm();
  if(DOC_TYPE==='credit-note'||DOC_TYPE==='debit-note') return renderCreditDebitForm();
  const isPO=DOC_TYPE==='po';
  const isC=['quotation','invoice','do','client-po'].includes(DOC_TYPE);
  const sub=LINE_ITEMS.reduce((s,l)=>s+(l.qty*l.unitPrice),0);
  const gst=calcGST(sub);
  const tot=sub+gst;
  const cur=FORM.currency||CO.currency;
  const lbl={quotation:'Quotation',invoice:'Tax Invoice','client-po':'Sales Order',po:'Purchase Order',do:'Delivery Order'};
  const party=isC?DB.clients.find(x=>x.id===FORM.clientId)||null:DB.suppliers.find(x=>x.id===FORM.supplierId)||null;
  const cOpts=DB.clients.map(c=>`<option value="${esc(c.id)}" ${FORM.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('');
  const sOpts=DB.suppliers.map(s=>`<option value="${esc(s.id)}" ${FORM.supplierId===s.id?'selected':''}>${esc(s.name)}</option>`).join('');

  return `
  <div class="tabs">
    <div class="tab ${DOC_TAB==='edit'?'on':''}" onclick="DOC_TAB='edit';render()">✏️ Edit</div>
    <div class="tab ${DOC_TAB==='preview'?'on':''}" onclick="DOC_TAB='preview';render()">👁 Preview</div>
  </div>
  ${DOC_TAB==='preview' ? renderPreview(lbl[DOC_TYPE]||DOC_TYPE,cur,sub,gst,tot,party) : `

  <div class="ai-box">
    <div class="ai-hdr">✦ AI Assist — auto-fill line items</div>
    <div class="ai-row">
      <input type="text" id="ai-inp" placeholder="e.g. 2x WEG 75kW motor with installation at 25% margin"/>
      <button class="btn btn-gold btn-sm" onclick="runAI()">Generate</button>
    </div>
    <div id="ai-out" class="ai-out"></div>
  </div>

  <div class="panel"><h4>${isPO?'Supplier':'Client'} Details</h4>
    <div class="frow c2">
      <div class="fgrp"><label>${isPO?'Select supplier':'Select client'}</label>
        ${partyPicker(isC?'client':'supplier',isC?FORM.clientId:FORM.supplierId,onParty)}
      </div>
      <div class="fgrp"><label>Attention to</label><input id="f-attn" value="${esc(FORM.attn||'')}" oninput="FORM.attn=this.value"/></div>
    </div>
    ${party?`<div style="background:var(--card2);border:1px solid var(--border);border-radius:var(--radius);padding:9px 12px;font-size:12px;color:var(--muted)">${esc(party.addr||'')} · ${esc(party.email||'')} · ${esc(party.tel||'')}</div>`:''}
  </div>

  <div class="panel"><h4>Document Details</h4>
    <!-- Document No. display -->
    <div style="background:var(--accent-bg);border:1px solid #bfdbfe;border-radius:var(--radius);padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:10px;font-weight:700;color:var(--accent-tx);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Document No.</div>
        <div style="font-size:16px;font-weight:700;color:var(--navy);font-family:'SF Mono',Monaco,Consolas,monospace;letter-spacing:.5px">
          ${EDIT_ID==='new' ? (()=>{ const _pk={quotation:'quotation',invoice:'invoice',po:'po',do:'do','client-po':'clientPO'}[DOC_TYPE]||DOC_TYPE; return `${fullPrefix(_pk)}-${String((CO.counter[_pk]||0)+1).padStart(4,'0')}`; })() : EDIT_ID}
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);text-align:right">
        ${EDIT_ID==='new'?'<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">NEW</span>':(isLockedDoc()?'<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">🔒 LOCKED</span>':'<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">EDITING</span>')}
      </div>
    </div>
    <div class="frow c3">
      <div class="fgrp"><label>Date</label><input type="date" id="f-date" value="${esc(FORM.date||today())}" oninput="FORM.date=this.value"/></div>
      <div class="fgrp"><label>Their ref / PO no.</label><input id="f-ref" value="${esc(FORM.ref||'')}" oninput="FORM.ref=this.value"/></div>
      <div class="fgrp"><label>Currency</label>
        <select id="f-cur" onchange="FORM.currency=this.value;(DOC_TAB==='preview'||DOC_TYPE==='invoice')?render():recalc()">
          ${['SGD','MYR','USD','EUR','GBP','AUD','JPY','CNY'].map(c=>`<option ${cur===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Payment terms</label><select id="f-terms" onchange="onTermsChange(this.value,DOC_TYPE==='invoice'?'f-valid':null)">${termsOptions(FORM.terms)}</select></div>
      <div class="fgrp"><label>${DOC_TYPE==='invoice'?'Due date':'Valid until'}</label>
        <input type="date" id="f-valid" value="${esc(DOC_TYPE==='invoice'?FORM.due:FORM.valid)}" oninput="DOC_TYPE==='invoice'?FORM.due=this.value:FORM.valid=this.value"/>
      </div>
    </div>
    ${DOC_TYPE==='quotation'?`
    <div class="frow c2">
      <div class="fgrp"><label>PIC (person in charge)</label>
        <select id="f-pic" onchange="onPICChange(this.value)">
          <option value="">— Select PIC —</option>
          ${(CO.staff||[]).map(s=>`<option value="${esc(s.name)}" ${FORM.pic===s.name?'selected':''}>${esc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="fgrp"><label>PIC mobile / contact</label>
        <input id="f-pictel" value="${esc(FORM.picTel||'')}" oninput="FORM.picTel=this.value" placeholder="Auto-filled from PIC selection"/>
      </div>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Validity text (for footer)</label><input id="f-validtext" value="${esc(FORM.validityText||'30 Days')}" oninput="FORM.validityText=this.value" placeholder="e.g. 30 Days"/></div>
      <div class="fgrp"><label>Delivery term</label><input id="f-delterm" value="${esc(FORM.deliveryTerm||'Ex-Singapore')}" oninput="FORM.deliveryTerm=this.value" placeholder="e.g. Ex-Singapore"/></div>
    </div>
    <div class="frow">
      <div class="fgrp"><label>Delivery remarks</label><input id="f-delivery" value="${esc(FORM.delivery||'')}" oninput="FORM.delivery=this.value" placeholder="e.g. Ex-stock, approx. 2–3 working weeks to Singapore"/></div>
    </div>`:''}
    ${(DOC_TYPE==='invoice'||DOC_TYPE==='do')?`
    <div style="border-top:1px solid var(--border);margin-top:6px;padding-top:12px">
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Address &amp; reference details</div>
      <div class="frow">
        <div class="fgrp"><label>Billing address (if different from client card)</label>
          <textarea id="f-billingaddr" oninput="FORM.billingAddr=this.value" placeholder="Leave blank to use client address on file">${esc(FORM.billingAddr||'')}</textarea>
        </div>
      </div>
      <div class="frow">
        <div class="fgrp"><label>Delivery address</label>
          <textarea id="f-deliveryaddr" oninput="FORM.deliveryAddr=this.value" placeholder="Delivery / ship-to address">${esc(FORM.deliveryAddr||'')}</textarea>
        </div>
      </div>
      <div class="frow c2">
        <div class="fgrp"><label>Delivery attention (person / contact)</label>
          <input id="f-deliveryattn" value="${esc(FORM.deliveryAttn||'')}" oninput="FORM.deliveryAttn=this.value" placeholder="Name and contact no."/>
        </div>
        <div class="fgrp"><label>Transport mode</label>
          <input id="f-transport" value="${esc(FORM.transport||'')}" oninput="FORM.transport=this.value" placeholder="e.g. LAND, SEA, AIR"/>
        </div>
      </div>
      <div class="frow c2">
        <div class="fgrp"><label>Our reference</label>
          <input id="f-ourref" value="${esc(FORM.ourRef||'')}" oninput="FORM.ourRef=this.value" placeholder="Internal ref no."/>
        </div>
        ${DOC_TYPE==='invoice'?`<div class="fgrp"><label>Delivery order no. (linked DO)</label>
          <input id="f-doref" value="${esc(FORM.doRef||'')}" oninput="FORM.doRef=this.value" placeholder="e.g. MS-DO-2608-0001"/>
        </div>`:`<div class="fgrp"><label>Invoice no. (linked invoice)</label>
          <input id="f-invref" value="${esc(FORM.invRef||'')}" oninput="FORM.invRef=this.value" placeholder="e.g. MS-IV-2608-0001"/>
        </div>`}
      </div>
      <div class="frow c2">
        <div class="fgrp"><label>Client PO no.</label>
          <input id="f-poref" value="${esc(FORM.poRef||FORM.ref||'')}" oninput="FORM.poRef=this.value" placeholder="Client purchase order no."/>
        </div>
        ${DOC_TYPE==='invoice'?`<div class="fgrp"><label>Bank account (for payment)</label>
          <select id="f-bankid" onchange="FORM.bankId=this.value;render()">
            <option value="">Auto (match invoice currency)</option>
            ${CO.banks.map(b=>`<option value="${esc(b.id)}" ${FORM.bankId===b.id?'selected':''}>${esc(b.bank)} — ${esc(b.accNo)}${b.currency?` (${esc(b.currency)})`:''}</option>`).join('')}
          </select>
          ${(()=>{const pb=pickBank(FORM.currency||CO.currency);return pb?`<div style="font-size:11px;color:var(--muted);margin-top:4px">${FORM.bankId?'Selected':'Auto-selected'}: ${esc(pb.bank)} — ${esc(pb.accNo)} (${esc(pb.currency||CO.currency)})</div>`:'<div style="font-size:11px;color:var(--danger)">No bank account set up — add one in Settings</div>';})()}
        </div>`:''}
      </div>
    </div>`:''}
    ${DOC_TYPE==='client-po'?`
    <div class="frow c2">
      <div class="fgrp"><label>Status</label>
        <select id="f-so-status" onchange="FORM.soStatus=this.value">
          <option value="outstanding" ${(FORM.soStatus||'outstanding')==='outstanding'?'selected':''}>Outstanding</option>
          <option value="delivered"   ${FORM.soStatus==='delivered'?'selected':''}>Delivered</option>
          <option value="invoiced"    ${FORM.soStatus==='invoiced'?'selected':''}>Invoiced</option>
          <option value="cancelled"   ${FORM.soStatus==='cancelled'?'selected':''}>Cancelled</option>
        </select>
      </div>
    </div>`:''}
    <!-- ── PER-DOCUMENT GST OVERRIDE ── -->
    <div style="border-top:1px solid var(--border);margin-top:6px;padding-top:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--text)">GST / Tax on this document</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">
            Override the company default (${esc(CO.gstOn ? CO.gstRate+'%' : 'Off')}) for this document only
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:var(--muted)">Use company default</span>
          <label class="toggle">
            <input type="checkbox" id="f-gst-override" ${docGstOn()!==CO.gstOn||docGstRate()!==CO.gstRate||FORM.docGstOn!==undefined?'checked':''}
              onchange="onGstOverrideToggle(this.checked)"/>
            <span class="toggle-slider"></span>
          </label>
          <span style="font-size:12px;color:var(--muted)">Override</span>
        </div>
      </div>
      <div id="gst-override-panel" style="${FORM.docGstOn!==undefined?'':'display:none'}">
        <div class="frow c3" style="margin-bottom:0">
          <div class="fgrp">
            <label>GST applicable on this doc</label>
            <select id="f-gst-on" onchange="FORM.docGstOn=this.value==='yes';recalc();toggleGstRateRow()">
              <option value="yes" ${docGstOn()?'selected':''}>Yes — GST applies</option>
              <option value="no"  ${!docGstOn()?'selected':''}>No — GST exempt / not applicable</option>
            </select>
          </div>
          <div class="fgrp" id="f-gst-rate-wrap" style="${docGstOn()?'':'opacity:.4;pointer-events:none'}">
            <label>GST rate (%)</label>
            <input type="number" id="f-gst-rate" value="${docGstRate()}" min="0" max="30" step="0.1"
              oninput="FORM.docGstRate=parseFloat(this.value)||0;recalc()"/>
          </div>
          <div class="fgrp" style="justify-content:flex-end;padding-top:18px">
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-sm" onclick="setDocGst(true,9)"  title="Singapore standard">SG 9%</button>
              <button class="btn btn-sm" onclick="setDocGst(true,6)"  title="Malaysia SST">MY 6%</button>
              <button class="btn btn-sm" onclick="setDocGst(true,0)"  title="Zero-rated">0%</button>
              <button class="btn btn-sm" onclick="setDocGst(false,0)" title="Exempt">Exempt</button>
            </div>
          </div>
        </div>
        <div id="gst-doc-status" style="margin-top:8px;font-size:12px;padding:7px 12px;border-radius:6px;background:${docGstOn()?'var(--success-bg)':'var(--warning-bg)'};color:${docGstOn()?'var(--success-tx)':'var(--warning-tx)'}">
          ${docGstOn() ? `✓ GST at <strong>${docGstRate()}%</strong> applied to this document` : '⚠ GST not applied to this document'}
        </div>
      </div>
      <div id="gst-default-note" style="${FORM.docGstOn!==undefined?'display:none':''}">
        <div style="font-size:12px;padding:7px 12px;border-radius:6px;background:var(--card2);color:var(--muted)">
          Using company default: ${CO.gstOn ? `GST <strong>${esc(CO.gstRate)}%</strong> applied` : 'GST <strong>not applicable</strong>'}
        </div>
      </div>
    </div>
  </div>

  <div class="panel"><h4>Line Items
    <span id="gst-line-label" style="float:right;font-size:10px;color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0">
      GST: ${docGstOn() ? docGstRate()+'% applied' : 'Not applicable'}
      ${FORM.docGstOn!==undefined?`<span style="background:var(--warning-bg);color:var(--warning-tx);padding:1px 6px;border-radius:4px;margin-left:4px;font-size:10px">Override active</span>`:''}
    </span>
  </h4>
    <div style="margin-bottom:8px;font-size:12px;color:var(--muted)">💡 Click <strong>Pick product</strong> on any row to auto-fill from your product database.</div>
    <table class="line-tbl">
      <thead><tr><th style="width:5%;text-align:center">#</th><th style="width:36%">Description</th><th style="width:8%;text-align:center">Qty</th><th style="width:10%">Unit</th><th style="width:18%">Unit price</th><th style="width:13%;text-align:right">Amount</th><th style="width:10%;text-align:center"></th></tr></thead>
      <tbody id="line-body">${renderLines()}</tbody>
    </table>
    <button class="btn btn-sm" style="margin-top:8px" onclick="addLine()">+ Add line</button>
    <div class="totals">
      <div class="trow"><span>Subtotal</span><span id="t-sub">${esc(fmt(sub,cur))}</span></div>
      <div class="trow gst-row"><span id="t-gst-label">GST ${docGstOn()?docGstRate()+'%':'—'}</span><span id="t-gst">${esc(docGstOn()?fmt(gst,cur):'Not applicable')}</span></div>
      <div class="trow grand"><span>Total</span><span id="t-tot">${esc(fmt(tot,cur))}</span></div>
    </div>
  </div>

  <div class="panel"><h4>Notes</h4>
    <textarea id="f-notes" oninput="FORM.notes=this.value">${esc(FORM.notes||'')}</textarea>
  </div>

  <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:28px">
    <button class="btn" onclick="DOC_TYPE=null;render()">Cancel</button>
    <button class="btn" onclick="DOC_TAB='preview';render()">Preview</button>
    ${LOCK_TYPES[DOC_TYPE]
      ?`<button class="btn" onclick="saveDoc()">Save draft</button>
         <button class="btn btn-navy" onclick="saveDoc({issue:true})" title="Locks the invoice — corrections then go through a credit / debit note">✓ Save &amp; issue</button>`
      :`<button class="btn btn-navy" onclick="saveDoc()">Save document</button>`}
  </div>`}`;
}

/* ── TYPE-TO-SEARCH CLIENT / SUPPLIER PICKER ──
   Type any part of a name (or contact / email) and the list narrows as you type.
   onPick(id) runs once one client or supplier is chosen; '' when the box is cleared. */
const PARTY_PICK={};
function partyPicker(kind,selectedId,onPick){
  const list=kind==='client'?DB.clients:DB.suppliers;
  const sel=list.find(x=>x.id===selectedId);
  PARTY_PICK[kind]=onPick;
  return `<input id="f-party" list="party-${kind}" value="${escAttr(sel?sel.name:'')}" placeholder="Type to search ${kind}s…" autocomplete="off"
      onfocus="this.select()" onchange="pickParty('${kind}',this)"
      oninput="if(event.inputType==='insertReplacementText'||!event.inputType)pickParty('${kind}',this)"/>
    <datalist id="party-${kind}">${list.filter(x=>x.status!=='inactive'||x.id===selectedId)
      .map(x=>`<option value="${escAttr(x.name)}">${escAttr([x.contact,x.email].filter(Boolean).join(' · '))}</option>`).join('')}</datalist>`;
}
function pickParty(kind,el){
  const list=kind==='client'?DB.clients:DB.suppliers, pick=PARTY_PICK[kind];
  const q=el.value.trim().toLowerCase();
  if(!pick) return;
  if(!q){ pick(''); return; }
  const exact=list.filter(x=>(x.name||'').trim().toLowerCase()===q);
  const hits=exact.length?exact:list.filter(x=>matches(q,x.name,x.contact,x.email));
  if(hits.length===1){ el.value=hits[0].name; pick(hits[0].id); return; }
  toast(hits.length?`${hits.length} ${kind}s match "${el.value.trim()}" — pick one from the list`
    :`No ${kind} called "${el.value.trim()}" — add it under ${kind==='client'?'Clients':'Suppliers'} first`,false);
}
// Supplier picked on a purchase invoice / goods received note
function onSupInvParty(id){
  const sp=DB.suppliers.find(x=>x.id===id)||{};
  FORM.supplierId=id; FORM.terms=sp.terms||'30 days'; FORM.due=dueFromTerms(FORM.terms,FORM.date);
  FORM.currency=sp.currency||CO.currency; FORM.attn=sp.contact||''; render();
}
function onSupDOParty(id){ const sp=DB.suppliers.find(x=>x.id===id)||{}; FORM.supplierId=id; FORM.attn=sp.contact||''; render(); }

function onParty(val){
  const isPO=DOC_TYPE==='po';
  if(isPO){ FORM.supplierId=val; const sp=DB.suppliers.find(x=>x.id===val); if(sp){FORM.terms=sp.terms;FORM.currency=sp.currency;FORM.attn=sp.contact;} }
  else    { FORM.clientId=val;   const cl=DB.clients.find(x=>x.id===val);   if(cl){FORM.terms=cl.terms;FORM.attn=cl.contact;
    // Fill what this client usually gets: last-used currency, their address, due date from their terms
    const last=lastClientDoc(val);
    if(last&&last.currency) FORM.currency=last.currency;
    if(!FORM.billingAddr) FORM.billingAddr=(last&&last.billingAddr)||cl.addr||'';
    if(!FORM.deliveryAddr&&last&&last.deliveryAddr) FORM.deliveryAddr=last.deliveryAddr;
    if(DOC_TYPE==='invoice') FORM.due=dueFromTerms(FORM.terms,FORM.date);
  } }
  render();
}

// Size a description box to its text (for browsers without CSS field-sizing)
function growDesc(el){ el.style.height='auto'; el.style.height=(el.scrollHeight+2)+'px'; }
function renderLines(){
  setTimeout(()=>document.querySelectorAll('textarea.line-desc').forEach(growDesc),0);
  const activeProds=DB.products.filter(p=>p.status==='active');
  return LINE_ITEMS.map((l,i)=>`<tr>
    <td style="text-align:center;color:var(--muted);font-size:12px;font-weight:600">${i+1}</td>
    <td>
      <div class="prod-picker">
        <textarea class="line-desc" rows="1" oninput="LINE_ITEMS[${i}].desc=this.value;growDesc(this)" placeholder="Description — press Enter for a new line, or pick a product ↓">${escAttr(l.desc)}</textarea>
        <div class="prod-dropdown ${PROD_PICKER_IDX===i?'open':''}">
          ${activeProds.map(p=>`<div class="prod-dd-item" onclick="selectProduct(${i},'${esc(p.id)}')">
            <span class="prod-dd-code">${esc(p.code)}</span>${esc(p.name)}
            <span class="prod-dd-price">${esc(fmt(p.unitPrice,p.currency))}</span>
          </div>`).join('')}
        </div>
      </div>
    </td>
    <td><input type="text" inputmode="decimal" value="${esc(l.qty||'')}" placeholder="0"
      onfocus="this.select()"
      oninput="LINE_ITEMS[${i}].qty=parseFloat(this.value.replace(/,/g,''))||0;recalc()"
      style="width:60px;text-align:right;-moz-appearance:textfield;font-variant-numeric:tabular-nums"/></td>
    <td><select onchange="LINE_ITEMS[${i}].unit=this.value" style="width:auto;padding:5px 4px">
      ${['pcs','lot','set','unit','hr','kg','m','length'].map(u=>`<option ${l.unit===u?'selected':''}>${u}</option>`).join('')}
    </select></td>
    <td><input type="text" inputmode="decimal" value="${esc(l.unitPrice||'')}" placeholder="0.00"
      onfocus="this.select()"
      onblur="if(!this.value)this.value='';LINE_ITEMS[${i}].unitPrice=parseFloat(this.value.replace(/,/g,''))||0;recalc()"
      oninput="LINE_ITEMS[${i}].unitPrice=parseFloat(this.value.replace(/,/g,''))||0"
      style="text-align:right;width:100%;border:1px solid var(--border-str);border-radius:6px;padding:5px 8px;font-size:13px;background:var(--input);color:var(--text);font-family:inherit"/></td>
    <td style="text-align:right;font-size:13px;font-weight:600;color:var(--text);padding-right:10px;white-space:nowrap">${esc((l.qty*l.unitPrice).toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
    <td style="white-space:nowrap">
      <button onclick="togglePicker(${i})" style="background:none;border:1px solid var(--border-str);border-radius:4px;cursor:pointer;color:var(--purple-tx);font-size:10px;padding:3px 5px" title="Pick from products">📦</button>
      <button onclick="remLine(${i})" style="background:none;border:none;cursor:pointer;color:var(--danger);font-size:18px;line-height:1;margin-left:2px">×</button>
    </td>
  </tr>`).join('');
}

function onPICChange(name){
  FORM.pic = name;
  const staff = (CO.staff||[]).find(s=>s.name===name);
  if(staff){
    FORM.picTel = staff.mobile;
    const el = document.getElementById('f-pictel');
    if(el) el.value = staff.mobile;
  }
}
function recalc(){
  const lb=document.getElementById('line-body'); if(lb) lb.innerHTML=renderLines();
  const cur=FORM.currency||CO.currency;
  const sub=LINE_ITEMS.reduce((s,l)=>s+(l.qty*l.unitPrice),0);
  const gstOn=docGstOn(), rate=docGstRate();
  const gst=gstOn ? Math.round(sub*rate)/100 : 0;
  const tot=sub+gst;
  const ts=document.getElementById('t-sub'),tg=document.getElementById('t-gst'),tt=document.getElementById('t-tot'),tgl=document.getElementById('t-gst-label');
  if(ts)  ts.textContent=fmt(sub,cur);
  if(tg)  tg.textContent=gstOn?fmt(gst,cur):'Not applicable';
  if(tgl) tgl.textContent=gstOn?`GST ${rate}%`:'GST —';
  if(tt)  tt.textContent=fmt(tot,cur);
  // Update line-items header label
  const ll=document.getElementById('gst-line-label');
  if(ll) ll.innerHTML=`GST: ${gstOn?rate+'% applied':'Not applicable'}${FORM.docGstOn!==undefined?'<span style="background:var(--warning-bg);color:var(--warning-tx);padding:1px 6px;border-radius:4px;margin-left:4px;font-size:10px">Override active</span>':''}`;
}
function onGstOverrideToggle(checked){
  if(checked){
    // Activate override — start with company defaults so user just tweaks
    FORM.docGstOn=CO.gstOn; FORM.docGstRate=CO.gstRate;
    document.getElementById('gst-override-panel').style.display='';
    document.getElementById('gst-default-note').style.display='none';
  } else {
    // Revert to company default
    FORM.docGstOn=undefined; FORM.docGstRate=undefined;
    document.getElementById('gst-override-panel').style.display='none';
    document.getElementById('gst-default-note').style.display='';
  }
  recalc(); updateGstStatus();
}
function toggleGstRateRow(){
  const wrap=document.getElementById('f-gst-rate-wrap');
  if(wrap) wrap.style.cssText=FORM.docGstOn?'':'opacity:.4;pointer-events:none';
  updateGstStatus();
}
function setDocGst(on, rate){
  FORM.docGstOn=on; FORM.docGstRate=rate;
  const sel=document.getElementById('f-gst-on'); if(sel) sel.value=on?'yes':'no';
  const inp=document.getElementById('f-gst-rate'); if(inp) inp.value=rate;
  toggleGstRateRow(); recalc(); updateGstStatus();
}
function updateGstStatus(){
  const on=docGstOn(), rate=docGstRate();
  const el=document.getElementById('gst-doc-status');
  if(!el) return;
  el.style.background=on?'var(--success-bg)':'var(--warning-bg)';
  el.style.color=on?'var(--success-tx)':'var(--warning-tx)';
  el.innerHTML=on?`✓ GST at <strong>${rate}%</strong> applied to this document`:'⚠ GST not applied to this document';
}
function addLine(){ LINE_ITEMS.push({desc:'',qty:1,unit:'pcs',unitPrice:0}); const lb=document.getElementById('line-body'); if(lb)lb.innerHTML=renderLines(); }
function remLine(i){ LINE_ITEMS.splice(i,1); recalc(); }

// Before saving a NEW document, warn if it looks like one that already exists. false = user cancelled.
function confirmNoDuplicate(){
  if(EDIT_ID!=='new') return true;
  const val=id=>{ const el=document.getElementById(id); return ((el?el.value:'')||'').trim(); };
  const same=(a,b)=>!!a&&!!b&&a.toLowerCase()===b.toLowerCase();
  let dup=null, why='';
  if(DOC_TYPE==='client-po'){
    const ref=val('f-ref')||FORM.ref;
    dup=DB.clientPOs.find(s=>s.clientId===FORM.clientId&&same(s.ref,ref)&&isLive(s)); why=`client PO no. "${ref}"`;
    if(!dup&&FORM.srcQtId){ dup=DB.clientPOs.find(s=>s.srcQtId===FORM.srcQtId&&isLive(s)); why=`quotation ${FORM.srcQtId}`; }
  } else if(DOC_TYPE==='invoice'){
    if(FORM.srcSoId){ dup=DB.invoices.find(i=>i.srcSoId===FORM.srcSoId&&isLive(i)); why=`sales order ${FORM.srcSoId}`; }
    if(!dup&&FORM.srcQtId){ dup=DB.invoices.find(i=>i.srcQtId===FORM.srcQtId&&isLive(i)); why=`quotation ${FORM.srcQtId}`; }
  } else if(DOC_TYPE==='sup-invoice'){
    const sref=val('f-supref')||FORM.supplierRef;
    dup=DB.supInvoices.find(s=>s.supplierId===FORM.supplierId&&same(s.supplierRef,sref)&&isLive(s)); why=`supplier invoice no. "${sref}"`;
  }
  return !dup||confirm(`${dup.id} already exists for ${why}.\n\nSave this new document anyway?`);
}
// opts.issue: save and issue (locks invoices / credit notes / debit notes)
function saveDoc(opts){ return withSaving(()=>saveDocInner(opts)); }
// Editing rebuilds a record from the form; keep fields the form doesn't show
// (email log, reminders sent, links, payment details) so an edit never wipes them
function keepMeta(rec,existing){
  if(existing) Object.keys(existing).forEach(k=>{ if(!(k in rec)) rec[k]=existing[k]; });
  return rec;
}

/* ── WHO DID WHAT: created by / last edited by + a short history on each record ── */
const whoAmI=()=>(AUTH_USER&&AUTH_USER.email)||'unknown';
// isNew: stamp "created" too (records from before tracking began just show "created before tracking")
function touch(rec,action,isNew=false){
  const at=new Date().toISOString(), by=whoAmI();
  if(isNew&&!rec.createdAt){ rec.createdAt=at; rec.createdBy=by; }
  rec.updatedAt=at; rec.updatedBy=by;
  rec.history=[...(rec.history||[]),{at,by,action}].slice(-30);
  return rec;
}
const fmtWhen=s=>s?new Date(s).toLocaleString('en-SG',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
function auditLine(rec){
  if(!rec||(!rec.createdAt&&!rec.updatedAt)) return '';
  const e=escAttr;
  return `<div class="field-hint" style="margin:6px 0">${rec.createdAt?`Created ${esc(fmtWhen(rec.createdAt))} by ${e(rec.createdBy)}`:'Created before tracking began'}${rec.updatedAt?` · Last edited ${esc(fmtWhen(rec.updatedAt))} by ${e(rec.updatedBy)}`:''}</div>`;
}

/* ── ISSUED DOCUMENTS ARE LOCKED ──
   Invoices, credit notes and debit notes start as drafts and can be edited freely. Once issued
   they can't be edited or deleted: only payment status, emailing and voiding remain, and any
   correction is made with a credit / debit note. The database enforces the same rule
   (supabase_lock_setup.sql), so it holds even outside this app. */
const LOCK_TYPES={invoice:'invoices','credit-note':'creditNotes','debit-note':'debitNotes'};
const isLockedRec=(type,rec)=>!!LOCK_TYPES[type]&&!!rec&&!!rec.status&&rec.status!=='draft';
// Counts in totals, statements and reports (drafts and voided documents don't)
const isIssued=d=>!!d&&!!d.status&&!['draft','cancelled','rejected'].includes(d.status);
function currentDocRec(){ return EDIT_ID&&EDIT_ID!=='new'?(DB[DOC_COLL[DOC_TYPE]]||[]).find(x=>x.id===EDIT_ID):null; }
const isLockedDoc=()=>isLockedRec(DOC_TYPE,currentDocRec());
function confirmIssue(){
  return confirm(`Issue this ${DOC_NAME[DOC_TYPE]||'document'}?\n\nOnce issued it is locked: it can't be edited or deleted. `
    +`Corrections are made with a credit or debit note${DOC_TYPE==='invoice'?', or by voiding it':''}.`);
}
function markIssued(rec){ rec.issuedAt=new Date().toISOString(); rec.issuedBy=whoAmI(); }

// Void: keeps the number (no gaps), stops it counting anywhere
function voidDoc(type,id){
  const rec=(DB[LOCK_TYPES[type]]||[]).find(x=>x.id===id); if(!rec||rec.status==='cancelled') return;
  if(rec.status==='paid'){ toast('This invoice is paid — mark it unpaid first, or issue a credit note',false); return; }
  const reason=prompt(`Void ${id}?\n\nIt keeps its number but no longer counts as owed. This can't be undone.\n\nReason:`);
  if(reason===null) return;
  if(!reason.trim()){ toast('A reason is needed to void a document',false); return; }
  rec.status='cancelled'; delete rec.autoPrevStatus;
  rec.voidReason=reason.trim(); rec.voidedAt=new Date().toISOString(); rec.voidedBy=whoAmI();
  touch(rec,'voided — '+reason.trim());
  if(type==='invoice') unlinkSources(rec);
  saveDB(); toast(`${id} voided`); render();
}
// Correct an issued invoice: start a credit note (copy of its lines, to trim) or a debit note
function fromINVtoNote(invId,type){
  const inv=DB.invoices.find(x=>x.id===invId); if(!inv) return;
  const isCN=type==='credit-note';
  DOC_TYPE=type; EDIT_ID='new'; DOC_TAB='edit'; PROD_PICKER_IDX=-1;
  LINE_ITEMS=isCN&&inv.lines&&inv.lines.length?inv.lines.map(l=>({...l}))
    :[{desc:`${isCN?'Credit':'Additional charge'} — invoice ${invId}`,qty:1,unit:'lot',unitPrice:0}];
  FORM={partyType:'client',clientId:inv.clientId,date:today(),ref:invId,currency:inv.currency||CO.currency,
    attn:inv.attn||'',notes:`${isCN?'Credit':'Debit'} note for invoice ${invId}`,status:'draft',
    docGstOn:inv.docGstOn,docGstRate:inv.docGstRate};
  nav(type); setTimeout(()=>{DOC_TYPE=type;EDIT_ID='new';render();},10);
}

// Lock bar + audit line on top of an open document; an issued one becomes read-only
function decorateDocForm(){
  const rec=currentDocRec(); if(!rec) return;
  const C=document.getElementById('content'), e=escAttr, locked=isLockedDoc();
  const isInv=DOC_TYPE==='invoice', id=rec.id;
  const hist=(rec.history||[]).slice().reverse();
  const bar=document.createElement('div'); bar.className='doc-infobar';
  bar.style.cssText=`border-radius:var(--radius);padding:10px 14px;margin-bottom:14px;font-size:12px;border:1px solid ${locked?'#fcd34d':'var(--border)'};background:${locked?'var(--warning-bg)':'var(--card)'}`;
  bar.innerHTML=`${locked?`<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--warning-tx)">
      <div style="flex:1;min-width:220px">${rec.status==='cancelled'
        ?`<strong>🚫 Voided</strong>${rec.voidedAt?` ${esc(fmtWhen(rec.voidedAt))} by ${e(rec.voidedBy)}`:''}${rec.voidReason?` — “${e(rec.voidReason)}”`:''}. Kept for the record; it no longer counts.`
        :`<strong>🔒 Issued — locked.</strong>${rec.issuedAt?` Issued ${esc(fmtWhen(rec.issuedAt))} by ${e(rec.issuedBy)}.`:''} It can't be edited or deleted; correct it with a credit or debit note${isInv?' or void it':''}.`}</div>
      ${rec.status!=='cancelled'?`<div style="display:flex;gap:6px;flex-wrap:wrap">
        ${isInv?`<button class="btn btn-sm" onclick="fromINVtoNote('${id}','credit-note')">+ Credit note</button>
        <button class="btn btn-sm" onclick="fromINVtoNote('${id}','debit-note')">+ Debit note</button>`:''}
        ${rec.status!=='paid'?`<button class="btn btn-sm btn-danger" onclick="voidDoc('${DOC_TYPE}','${id}')">Void</button>`:''}
      </div>`:''}
    </div>`:''}
    <div style="color:var(--muted);${locked?'margin-top:6px':''}">${rec.createdAt?`Created ${esc(fmtWhen(rec.createdAt))} by ${e(rec.createdBy)}`:'Created before tracking began'}${rec.updatedAt?` · Last edited ${esc(fmtWhen(rec.updatedAt))} by ${e(rec.updatedBy)}`:''}
      ${hist.length?`<details style="margin-top:4px"><summary style="cursor:pointer">History (${esc(hist.length)})</summary>
        <div style="margin-top:4px;line-height:1.7">${hist.map(h=>`${fmtWhen(h.at)} — ${e(h.by)}: ${e(h.action)}`).join('<br>')}</div></details>`:''}</div>`;
  C.prepend(bar);
  if(!locked||DOC_TAB==='preview') return;
  C.querySelectorAll('input,select,textarea').forEach(el=>{ if(!el.closest('.doc-infobar')) el.disabled=true; });
  C.querySelectorAll('button').forEach(b=>{ if(/saveDoc|addLine|remLine|togglePicker|runAI|setDocGst|onGstOverride/.test(b.getAttribute('onclick')||'')) b.style.display='none'; });
  const ai=C.querySelector('.ai-box'); if(ai) ai.style.display='none';
}
async function saveDocInner(opts){
  const issuing=!!(opts&&opts.issue);
  if(isLockedDoc()){ toast('This document is issued and locked — correct it with a credit / debit note',false); return; }
  // ── CREDIT NOTE / DEBIT NOTE ──
  if(DOC_TYPE==='credit-note'||DOC_TYPE==='debit-note'){
    const isCN=DOC_TYPE==='credit-note';
    const isC=FORM.partyType!=='supplier';
    if(isC && !FORM.clientId){ toast('Select a client',false); return; }
    if(!isC && !FORM.supplierId){ toast('Select a supplier',false); return; }
    if(issuing&&!confirmIssue()) return;
    const sub=LINE_ITEMS.reduce((s,l)=>s+(l.qty*l.unitPrice),0);
    const gstOnEl=document.getElementById('f-gst-on'); if(gstOnEl) FORM.docGstOn=gstOnEl.value==='yes';
    const gstRateEl=document.getElementById('f-gst-rate'); if(gstRateEl&&FORM.docGstOn!==undefined) FORM.docGstRate=parseFloat(gstRateEl.value)||0;
    const gst=calcGST(sub); const tot=sub+gst;
    const cur=document.getElementById('f-cur')?document.getElementById('f-cur').value:(FORM.currency||CO.currency);
    const dateV =document.getElementById('f-date') ?document.getElementById('f-date').value :FORM.date;
    const refV  =document.getElementById('f-ref')  ?document.getElementById('f-ref').value  :FORM.ref;
    const notesV=document.getElementById('f-notes')?document.getElementById('f-notes').value:FORM.notes;
    const statV =document.getElementById('f-status')?document.getElementById('f-status').value:(FORM.status||'draft');
    const isNew=EDIT_ID==='new';
    const pfxKey=isCN?'creditNote':'debitNote';
    const key=isCN?'creditNotes':'debitNotes';
    const docId=isNew?await allocDocNo(pfxKey,key):EDIT_ID;
    const existingRec=isNew?null:DB[key].find(x=>x.id===EDIT_ID);
    const rec={id:docId,partyType:isC?'client':'supplier',date:dateV,ref:refV,currency:cur,notes:notesV,attn:FORM.attn,
      status:issuing?'issued':(existingRec?existingRec.status:'draft'),
      lines:LINE_ITEMS.map(l=>({...l})),amount:Math.round(tot*100)/100,
      docGstOn:FORM.docGstOn,docGstRate:FORM.docGstRate};
    if(isC) rec.clientId=FORM.clientId; else rec.supplierId=FORM.supplierId;
    keepMeta(rec,existingRec);
    if(issuing) markIssued(rec);
    touch(rec,isNew?(issuing?'created and issued':'created as draft'):(issuing?'issued':'edited'),isNew);
    if(isNew) DB[key].push(rec);
    else { const idx=DB[key].findIndex(x=>x.id===EDIT_ID); if(idx>=0)DB[key][idx]=rec; }
    saveDB(); pills(); DOC_TYPE=null; toast(`${isCN?'Credit':'Debit'} note ${issuing?'issued':'saved as draft'}`); render(); return;
  }

  // ── SUPPLIER DO (no line items, special fields) ──
  if(DOC_TYPE==='sup-do'){
    if(!FORM.supplierId){ toast('Select a supplier',false); return; }
    const itemsV = document.getElementById('f-items') ? document.getElementById('f-items').value : FORM.items;
    const notesV = document.getElementById('f-notes') ? document.getElementById('f-notes').value : FORM.notes;
    const dateV  = document.getElementById('f-date')  ? document.getElementById('f-date').value  : FORM.date;
    const recdV  = document.getElementById('f-recdate')? document.getElementById('f-recdate').value : FORM.receivedDate;
    const recbyV = document.getElementById('f-recby') ? document.getElementById('f-recby').value : FORM.receivedBy;
    const statV  = document.getElementById('f-status')? document.getElementById('f-status').value : FORM.status;
    const refV   = document.getElementById('f-ref')   ? document.getElementById('f-ref').value   : FORM.ref;
    const sinvV  = document.getElementById('f-sinvref')? document.getElementById('f-sinvref').value: FORM.sinvRef;
    const isNew=EDIT_ID==='new';
    const docId=isNew?await allocNo('SDO','supDOs','supDO'):EDIT_ID;
    const rec={id:docId,supplierId:FORM.supplierId,date:dateV,receivedDate:recdV,ref:refV,sinvRef:sinvV,
      items:itemsV,notes:notesV,attn:FORM.attn,receivedBy:recbyV,status:statV};
    if(!isNew) keepMeta(rec,DB.supDOs.find(x=>x.id===EDIT_ID));
    touch(rec,isNew?'created':'edited',isNew);
    if(isNew) DB.supDOs.push(rec);
    else { const idx=DB.supDOs.findIndex(x=>x.id===EDIT_ID); if(idx>=0)DB.supDOs[idx]=rec; }
    saveDB(); pills(); DOC_TYPE=null; toast('Goods received saved'); render(); return;
  }

  // ── SUPPLIER INVOICE ──
  if(DOC_TYPE==='sup-invoice'){
    if(!FORM.supplierId){ toast('Select a supplier',false); return; }
    if(!confirmNoDuplicate()) return;
    const sub=LINE_ITEMS.reduce((s,l)=>s+(l.qty*l.unitPrice),0);
    const gstOnEl=document.getElementById('f-gst-on'); if(gstOnEl) FORM.docGstOn=gstOnEl.value==='yes';
    const gstRateEl=document.getElementById('f-gst-rate'); if(gstRateEl&&FORM.docGstOn!==undefined) FORM.docGstRate=parseFloat(gstRateEl.value)||0;
    const gst=calcGST(sub); const tot=sub+gst;
    const cur=FORM.currency||CO.currency;
    const dateV  = document.getElementById('f-date')  ? document.getElementById('f-date').value  : FORM.date;
    const dueV   = document.getElementById('f-due')   ? document.getElementById('f-due').value   : FORM.due;
    const termsV = document.getElementById('f-terms') ? document.getElementById('f-terms').value : FORM.terms;
    const notesV = document.getElementById('f-notes') ? document.getElementById('f-notes').value : FORM.notes;
    const supRefV= document.getElementById('f-supref')? document.getElementById('f-supref').value: FORM.supplierRef;
    const refV   = document.getElementById('f-ref')   ? document.getElementById('f-ref').value   : FORM.ref;
    const statV  = document.getElementById('f-status')? document.getElementById('f-status').value: FORM.status||'pending';
    const isNew=EDIT_ID==='new';
    const docId=isNew?await allocNo('SINV','supInvoices','supInvoice'):EDIT_ID;
    const rec={id:docId,supplierId:FORM.supplierId,date:dateV,due:dueV,ref:refV,supplierRef:supRefV,clientInvRef:FORM.clientInvRef||'',
      currency:cur,terms:termsV,notes:notesV,attn:FORM.attn,status:statV,
      lines:LINE_ITEMS.map(l=>({...l})),amount:Math.round(tot*100)/100,
      docGstOn:FORM.docGstOn,docGstRate:FORM.docGstRate};
    if(!isNew) keepMeta(rec,DB.supInvoices.find(x=>x.id===EDIT_ID));
    touch(rec,isNew?'created':'edited',isNew);
    if(isNew) DB.supInvoices.push(rec);
    else { const idx=DB.supInvoices.findIndex(x=>x.id===EDIT_ID); if(idx>=0)DB.supInvoices[idx]=rec; }
    saveDB(); pills(); DOC_TYPE=null; toast('Purchase invoice saved'); render(); return;
  }

  // ── STANDARD SALES / PO DOCUMENTS ──
  const isPO=DOC_TYPE==='po';
  const isC=['quotation','invoice','do','client-po'].includes(DOC_TYPE);
  const pid=isC?FORM.clientId:FORM.supplierId;
  if(!pid){ toast(isC?'Select a client':'Select a supplier',false); return; }
  if(!confirmNoDuplicate()) return;
  if(issuing&&!confirmIssue()) return;
  const sub=LINE_ITEMS.reduce((s,l)=>s+(l.qty*l.unitPrice),0);
  const gstOnEl=document.getElementById('f-gst-on'); if(gstOnEl) FORM.docGstOn=gstOnEl.value==='yes';
  const gstRateEl=document.getElementById('f-gst-rate'); if(gstRateEl&&FORM.docGstOn!==undefined) FORM.docGstRate=parseFloat(gstRateEl.value)||0;
  const gst=calcGST(sub); const tot=sub+gst;
  const cur=FORM.currency||CO.currency;
  const dateV  = document.getElementById('f-date')  ? document.getElementById('f-date').value  : FORM.date;
  const validV = document.getElementById('f-valid') ? document.getElementById('f-valid').value : FORM.valid;
  const termsV = document.getElementById('f-terms') ? document.getElementById('f-terms').value : FORM.terms;
  const notesV = document.getElementById('f-notes') ? document.getElementById('f-notes').value : FORM.notes;
  const map={quotation:'quotations',invoice:'invoices',do:'dos',po:'pos','client-po':'clientPOs'};
  const key=map[DOC_TYPE]; if(!key) return;
  const isNew=EDIT_ID==='new';
  const pfxMap={quotation:'quotation',invoice:'invoice',po:'po',do:'do','client-po':'clientPO'};
  const pfxKey=pfxMap[DOC_TYPE]||DOC_TYPE;
  const docId=isNew?await allocDocNo(pfxKey,key):EDIT_ID;
  const rec={id:docId,date:dateV,ref:FORM.ref,currency:cur,terms:termsV,notes:notesV,attn:FORM.attn,lines:LINE_ITEMS.map(l=>({...l})),amount:Math.round(tot*100)/100,
    docGstOn:FORM.docGstOn, docGstRate:FORM.docGstRate,
    // Quotation-specific extra fields
    pic:     document.getElementById('f-pic')      ? document.getElementById('f-pic').value      : FORM.pic||'',
    picTel:  document.getElementById('f-pictel')   ? document.getElementById('f-pictel').value   : FORM.picTel||'',
    validityText: document.getElementById('f-validtext') ? document.getElementById('f-validtext').value : FORM.validityText||'30 Days',
    deliveryTerm: document.getElementById('f-delterm')   ? document.getElementById('f-delterm').value   : FORM.deliveryTerm||'Ex-Singapore',
    delivery:document.getElementById('f-delivery') ? document.getElementById('f-delivery').value : FORM.delivery||'',
    // Invoice / DO extra fields
    billingAddr: document.getElementById('f-billingaddr')  ? document.getElementById('f-billingaddr').value  : FORM.billingAddr||'',
    deliveryAddr:document.getElementById('f-deliveryaddr') ? document.getElementById('f-deliveryaddr').value : FORM.deliveryAddr||'',
    deliveryAttn:document.getElementById('f-deliveryattn') ? document.getElementById('f-deliveryattn').value : FORM.deliveryAttn||'',
    transport:   document.getElementById('f-transport')    ? document.getElementById('f-transport').value    : FORM.transport||'',
    ourRef:      document.getElementById('f-ourref')       ? document.getElementById('f-ourref').value       : FORM.ourRef||'',
    doRef:       document.getElementById('f-doref')        ? document.getElementById('f-doref').value        : FORM.doRef||'',
    invRef:      document.getElementById('f-invref')       ? document.getElementById('f-invref').value       : FORM.invRef||'',
    poRef:       document.getElementById('f-poref')        ? document.getElementById('f-poref').value        : FORM.poRef||FORM.ref||'',
    bankId:      document.getElementById('f-bankid')       ? document.getElementById('f-bankid').value       : FORM.bankId||'',
  };
  if(isC)  rec.clientId=FORM.clientId;
  else     rec.supplierId=FORM.supplierId;
  const existingRec=isNew?null:DB[key].find(x=>x.id===EDIT_ID);
  // Carry forward fields that are only ever set outside this form (DO links, payment records)
  // so that editing a document afterward never silently erases them.
  if(existingRec){
    if(existingRec.linkedDoId!==undefined) rec.linkedDoId=existingRec.linkedDoId;
    if(existingRec.srcQtId!==undefined) rec.srcQtId=existingRec.srcQtId;
    if(existingRec.srcSoId!==undefined) rec.srcSoId=existingRec.srcSoId;
    if(existingRec.autoPrevStatus!==undefined) rec.autoPrevStatus=existingRec.autoPrevStatus;
    if(existingRec.statusBeforeConvert!==undefined) rec.statusBeforeConvert=existingRec.statusBeforeConvert;
    if(existingRec.poBaseStatus!==undefined) rec.poBaseStatus=existingRec.poBaseStatus;
    if(existingRec.status==='paid'){
      rec.paidDate=existingRec.paidDate; rec.paidRef=existingRec.paidRef;
      rec.paidMethod=existingRec.paidMethod; rec.paidAmount=existingRec.paidAmount;
      rec.paidNote=existingRec.paidNote;
    }
  }
  if(DOC_TYPE==='quotation'){rec.valid=validV;rec.status=existingRec?existingRec.status:'draft';}
  if(DOC_TYPE==='invoice')  {rec.due=validV;rec.status=issuing?'pending':(existingRec?existingRec.status:'draft');
    if(isNew&&FORM.srcQtId) rec.srcQtId=FORM.srcQtId;
    if(isNew&&FORM.srcSoId) rec.srcSoId=FORM.srcSoId;}
  if(DOC_TYPE==='po')       {rec.status=existingRec?existingRec.status:'pending';}
  if(DOC_TYPE==='do')       {rec.status='issued';rec.items=LINE_ITEMS.map(l=>oneLine(l.desc)).join(', ');}
  if(DOC_TYPE==='do' && isNew && FORM.srcType && FORM.srcId){
    const srcMap={quotation:DB.quotations,'client-po':DB.clientPOs,invoice:DB.invoices};
    const arr=srcMap[FORM.srcType];
    const src=arr&&arr.find(x=>x.id===FORM.srcId);
    if(src) src.linkedDoId=docId;
  }
  if(DOC_TYPE==='client-po'){
    const soSel=document.getElementById('f-so-status');
    rec.status=soSel?soSel.value:(FORM.soStatus||'outstanding');
    rec.items=LINE_ITEMS.map(l=>oneLine(l.desc)).filter(Boolean).join(', ')||rec.items||'';
    if(isNew && FORM.srcQtId) rec.srcQtId=FORM.srcQtId;
  }
  keepMeta(rec,existingRec);
  if(issuing) markIssued(rec);
  touch(rec,isNew?(issuing?'created and issued':DOC_TYPE==='invoice'?'created as draft':'created'):(issuing?'issued':'edited'),isNew);
  if(isNew) DB[key].push(rec);
  else { const idx=DB[key].findIndex(x=>x.id===EDIT_ID); if(idx>=0)DB[key][idx]=rec; }
  if(isNew) linkSources(rec);
  const msg=issuing?`${docId} issued`:LOCK_TYPES[DOC_TYPE]&&rec.status==='draft'?'Draft saved':'Document saved';
  saveDB(); DOC_TYPE=null; toast(msg); render();
}

/* ═══════════════════════════════════════════════
   PREVIEW + PRINT
═══════════════════════════════════════════════ */
function renderPreview(label,cur,sub,gst,tot,party){
  const isPO  = DOC_TYPE==='po';
  const isQT  = DOC_TYPE==='quotation';
  const pfxMap={quotation:'quotation',invoice:'invoice',po:'po',do:'do','client-po':'clientPO'};
  const pfxKey=pfxMap[DOC_TYPE]||DOC_TYPE;
  const num   = EDIT_ID==='new'?`[${fullPrefix(pfxKey)}-PREVIEW]`:EDIT_ID;
  const dateStr = FORM.date ? new Date(FORM.date).toLocaleDateString('en-SG',{day:'2-digit',month:'2-digit',year:'numeric'}) : today();

  // ── QUOTATION: use reference layout ──────────────────────────────────────
  if(isQT){
    return `
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px">
      <button class="btn" onclick="DOC_TAB='edit';render()">← Back to edit</button>
      <button class="btn" onclick="printDoc('print')">🖨 Print</button><button class="btn btn-navy" onclick="printDoc('pdf')">⬇ Download PDF</button>${emailButton()}
    </div>
    <div class="preview-doc" id="print-area" style="padding:0;max-width:740px;font-family:Arial,sans-serif;font-size:12px">

      <!-- ① HEADER BAR -->
      <div style="background:${esc(CO.brand)};padding:14px 24px 12px;display:flex;justify-content:space-between;align-items:flex-start">
        <div style="${hdrLeft()}">${docLogo(true)}
          <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:.3px">${esc(CO.name)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:4px;white-space:pre-line">${esc(CO.addr)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:2px">Tel : ${esc(CO.tel)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px">Email : ${esc(CO.email)}</div>
        </div>
        <div style="text-align:right">
          <div style="color:${esc(CO.accent)};font-size:22px;font-weight:700;letter-spacing:1px">QUOTATION</div>
          <div style="color:rgba(255,255,255,.7);font-size:10px;margin-top:6px">Company Reg No : ${esc(CO.uen)}</div>
          <div style="color:rgba(255,255,255,.7);font-size:10px">GST Reg No : ${esc(CO.gst)}</div>
        </div>
      </div>

      <!-- ② TO / QUOTATION DETAILS BLOCK -->
      <div style="display:grid;grid-template-columns:1fr auto;gap:0;border-bottom:1px solid #ddd">
        <!-- Left: client info -->
        <div style="padding:14px 24px;border-right:1px solid #ddd">
          <table style="font-size:12px;border-collapse:collapse;width:100%">
            <tr><td style="color:#555;padding:2px 0;width:60px;white-space:nowrap;text-align:right">To :</td><td style="font-weight:700;padding:2px 0;padding-left:8px">${esc(party?party.name:'')}</td></tr>
            ${party&&party.addr?`<tr><td></td><td style="padding:2px 0;padding-left:8px;color:#333;white-space:pre-line">${esc(party.addr)}</td></tr>`:''}
            ${party&&party.tel?`<tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Tel :</td><td style="padding:2px 0;padding-left:8px">${esc(party.tel)}</td></tr>`:''}
            <tr><td style="color:#555;padding:2px 0;padding-top:6px;text-align:right;white-space:nowrap">Attn :</td><td style="padding:2px 0;padding-top:6px;padding-left:8px;font-weight:600">${esc(FORM.attn||'')}</td></tr>
          </table>
        </div>
        <!-- Right: quotation meta -->
        <div style="padding:14px 24px;min-width:220px">
          <table style="font-size:12px;border-collapse:collapse;width:100%">
            <tr><td style="color:#555;padding:2px 0;white-space:nowrap;width:105px;text-align:right">Quotation No :</td><td style="padding:2px 0;padding-left:10px;font-weight:700;color:${esc(CO.brand)}">${num}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Date :</td><td style="padding:2px 0;padding-left:10px">${dateStr}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">PIC :</td><td style="padding:2px 0;padding-left:10px">${esc(FORM.pic||'')}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Contact No :</td><td style="padding:2px 0;padding-left:10px">${esc(FORM.picTel||'—')}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Client Ref :</td><td style="padding:2px 0;padding-left:10px">${esc(FORM.ref||'—')}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Page No :</td><td style="padding:2px 0;padding-left:10px">1/1</td></tr>
          </table>
        </div>
      </div>

      <!-- ③ SALUTATION -->
      <div style="padding:12px 24px 6px;font-size:12px">
        Dear Sir/Madam,<br>
        <span style="color:#555">We have pleasure in submitting this quotation in accordance with our General Terms And Conditions of Tenders and Sales overleaf:-</span>
      </div>

      <!-- ④ LINE ITEMS TABLE -->
      <div style="padding:0 24px">
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
          <thead>
            <tr style="background:#f0f4ff">
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:5%;border:1px solid #c7d7f4">No</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:left;border:1px solid #c7d7f4">Description</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:14%;border:1px solid #c7d7f4">Unit Price</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:6%;border:1px solid #c7d7f4">Qty</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:14%;border:1px solid #c7d7f4">Total (${cur})</th>
            </tr>
          </thead>
          <tbody>
            ${LINE_ITEMS.map((l,i)=>`<tr>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${i+1}</td>
              <td style="padding:7px 8px;border:1px solid #ddd;white-space:pre-line;overflow-wrap:anywhere;word-break:break-word;vertical-align:top;color:#1a1a1a">${escAttr(l.desc)||'—'}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.unitPrice.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.qty)}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc((l.qty*l.unitPrice).toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>`).join('')}
            <!-- Sub-total row -->
            <tr>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;color:#555;font-size:11px">${esc(FORM.notes||'')}</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:600;color:#1a1a1a;white-space:nowrap">Sub-Total (${cur})</td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center;font-weight:600">${esc(sub.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>
            <!-- GST row -->
            <tr>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;color:#333">GST</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${docGstOn()?docGstRate()+'%':'N/A'}</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${esc(docGstOn()?gst.toLocaleString('en-SG',{minimumFractionDigits:2}):'—')}</td>
            </tr>
            <!-- Total row -->
            <tr style="background:#f5f5f5">
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:7px 8px;text-align:right;font-weight:700;white-space:nowrap">Total (${cur})</td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:7px 8px;text-align:center;font-weight:700">${esc(tot.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ⑤ TERMS BLOCK -->
      <div style="padding:14px 24px 10px;font-size:12px">
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="color:#555;padding:3px 0;width:120px;white-space:nowrap;vertical-align:top;text-align:right">Price :</td><td style="padding:3px 0;padding-left:8px">Prices are in ${cur} Nett and subject to GST if applicable</td></tr>
          <tr><td style="color:#555;padding:3px 0;vertical-align:top;text-align:right;white-space:nowrap">Delivery :</td><td style="padding:3px 0;padding-left:8px">${esc(FORM.delivery||'Delivery stated above are subject to factory final confirmation and excluding holidays')}</td></tr>
          <tr><td style="color:#555;padding:3px 0;vertical-align:top;text-align:right;white-space:nowrap">Delivery term :</td><td style="padding:3px 0;padding-left:8px">${esc(FORM.deliveryTerm||'Ex-Singapore')}</td></tr>
          <tr><td style="color:#555;padding:3px 0;vertical-align:top;text-align:right;white-space:nowrap">Payment term :</td><td style="padding:3px 0;padding-left:8px">${esc(FORM.terms||'30 days')}</td></tr>
          <tr><td style="color:#555;padding:3px 0;vertical-align:top;text-align:right;white-space:nowrap">Validity :</td><td style="padding:3px 0;padding-left:8px">${esc(FORM.validityText||'30 Days')}</td></tr>
        </table>
      </div>

      <!-- ⑥ SIGN-OFF -->
      <div style="padding:10px 24px 8px;font-size:12px">
        Best Regards<br><br>
        <strong>${esc(FORM.pic||CO.signoff||'Wong WL')} / Mobile : ${esc(FORM.pic?(FORM.picTel||'—'):CO.tel)}</strong>
      </div>

      <!-- ⑦ DISCLAIMER -->
      <div style="background:#f7f7f7;border-top:1px solid #ddd;padding:8px 24px;font-size:10px;color:#888;text-align:center;letter-spacing:.3px">
        THIS FORM IS COMPUTER GENERATED AND DOES NOT REQUIRE A SIGNATURE
      </div>
    </div>`;
  }

  // ── SALES ORDER: reference layout ─────────────────────────────────────────
  if(DOC_TYPE==='client-po'){
    return `
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px">
      <button class="btn" onclick="DOC_TAB='edit';render()">← Back to edit</button>
      <button class="btn" onclick="printDoc('print')">🖨 Print</button><button class="btn btn-navy" onclick="printDoc('pdf')">⬇ Download PDF</button>${emailButton()}
    </div>
    <div class="preview-doc" id="print-area" style="padding:0;max-width:740px;font-family:Arial,sans-serif;font-size:12px">

      <!-- ① HEADER BAR -->
      <div style="background:${esc(CO.brand)};padding:14px 24px 12px;display:flex;justify-content:space-between;align-items:flex-start">
        <div style="${hdrLeft()}">${docLogo(true)}
          <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:.3px">${esc(CO.name)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:4px;white-space:pre-line">${esc(CO.addr)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:2px">Tel : ${esc(CO.tel)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px">Email : ${esc(CO.email)}</div>
        </div>
        <div style="text-align:right">
          <div style="color:${esc(CO.accent)};font-size:22px;font-weight:700;letter-spacing:1px">SALES ORDER</div>
          <div style="color:rgba(255,255,255,.7);font-size:10px;margin-top:6px">Company Reg No : ${esc(CO.uen)}</div>
          <div style="color:rgba(255,255,255,.7);font-size:10px">GST Reg No : ${esc(CO.gst)}</div>
        </div>
      </div>

      <!-- ② TO / SO DETAILS BLOCK -->
      <div style="display:grid;grid-template-columns:1fr auto;gap:0;border-bottom:1px solid #ddd">
        <!-- Left: client info -->
        <div style="padding:14px 24px;border-right:1px solid #ddd">
          <table style="font-size:12px;border-collapse:collapse;width:100%">
            <tr><td style="color:#555;padding:2px 0;width:60px;white-space:nowrap;text-align:right">To :</td><td style="font-weight:700;padding:2px 0;padding-left:8px">${esc(party?party.name:'')}</td></tr>
            ${party&&party.addr?`<tr><td></td><td style="padding:2px 0;padding-left:8px;color:#333;white-space:pre-line">${esc(party.addr)}</td></tr>`:''}
            ${party&&party.tel?`<tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Tel :</td><td style="padding:2px 0;padding-left:8px">${esc(party.tel)}</td></tr>`:''}
            <tr><td style="color:#555;padding:2px 0;padding-top:6px;text-align:right;white-space:nowrap">Attn :</td><td style="padding:2px 0;padding-top:6px;padding-left:8px;font-weight:600">${esc(FORM.attn||'')}</td></tr>
          </table>
        </div>
        <!-- Right: SO meta -->
        <div style="padding:14px 24px;min-width:220px">
          <table style="font-size:12px;border-collapse:collapse;width:100%">
            <tr><td style="color:#555;padding:2px 0;white-space:nowrap;width:110px;text-align:right">SO No :</td><td style="padding:2px 0;padding-left:10px;font-weight:700;color:${esc(CO.brand)}">${num}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Date :</td><td style="padding:2px 0;padding-left:10px">${dateStr}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">PIC :</td><td style="padding:2px 0;padding-left:10px">${esc(FORM.pic||'')}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Contact No :</td><td style="padding:2px 0;padding-left:10px">${esc(FORM.picTel||'—')}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">PO No :</td><td style="padding:2px 0;padding-left:10px">${esc(FORM.ref||'—')}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Quotation No :</td><td style="padding:2px 0;padding-left:10px">${esc(FORM.srcQtId||'—')}</td></tr>
            <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Page No :</td><td style="padding:2px 0;padding-left:10px">1/1</td></tr>
          </table>
        </div>
      </div>

      <!-- ③ LINE ITEMS TABLE -->
      <div style="padding:0 24px">
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px">
          <thead>
            <tr style="background:#f0f4ff">
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:5%;border:1px solid #c7d7f4">No</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:left;border:1px solid #c7d7f4">Description</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:14%;border:1px solid #c7d7f4">Unit Price</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:6%;border:1px solid #c7d7f4">Qty</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:14%;border:1px solid #c7d7f4">Total (${cur})</th>
            </tr>
          </thead>
          <tbody>
            ${LINE_ITEMS.map((l,i)=>`<tr>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${i+1}</td>
              <td style="padding:7px 8px;border:1px solid #ddd;white-space:pre-line;overflow-wrap:anywhere;word-break:break-word;vertical-align:top;color:#1a1a1a">${escAttr(l.desc)||'—'}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.unitPrice.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.qty)}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc((l.qty*l.unitPrice).toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>`).join('')}
            <tr>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;color:#555;font-size:11px">${esc(FORM.notes||'')}</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:600;color:#1a1a1a;white-space:nowrap">Sub-Total (${cur})</td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center;font-weight:600">${esc(sub.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>
            <tr>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;color:#333">GST</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${docGstOn()?docGstRate()+'%':'N/A'}</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${esc(docGstOn()?gst.toLocaleString('en-SG',{minimumFractionDigits:2}):'—')}</td>
            </tr>
            <tr style="background:#f5f5f5">
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:7px 8px;text-align:right;font-weight:700;white-space:nowrap">Total (${cur})</td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:7px 8px;text-align:center;font-weight:700">${esc(tot.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ④ TERMS BLOCK -->
      <div style="padding:14px 24px 10px;font-size:12px">
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="color:#555;padding:3px 0;width:120px;white-space:nowrap;vertical-align:top;text-align:right">Delivery :</td><td style="padding:3px 0;padding-left:8px">${esc(FORM.delivery||'Delivery stated above are subject to factory final confirmation and excluding holidays')}</td></tr>
          <tr><td style="color:#555;padding:3px 0;vertical-align:top;text-align:right;white-space:nowrap">Delivery term :</td><td style="padding:3px 0;padding-left:8px">${esc(FORM.deliveryTerm||'Ex-Singapore')}</td></tr>
          <tr><td style="color:#555;padding:3px 0;vertical-align:top;text-align:right;white-space:nowrap">Payment term :</td><td style="padding:3px 0;padding-left:8px">${esc(FORM.terms||'30 days')}</td></tr>
        </table>
      </div>

      <!-- ⑤ DISCLAIMER -->
      <div style="background:#f7f7f7;border-top:1px solid #ddd;padding:8px 24px;font-size:10px;color:#888;text-align:center;letter-spacing:.3px">
        THIS FORM IS COMPUTER GENERATED AND DOES NOT REQUIRE A SIGNATURE
      </div>
    </div>`;
  }

  // ── INVOICE: reference layout ─────────────────────────────────────────────
  if(DOC_TYPE==='invoice'){
    const bank = pickBank(cur);
    const dateStr = FORM.date ? new Date(FORM.date).toLocaleDateString('en-SG',{day:'2-digit',month:'2-digit',year:'numeric'}) : today();
    return `
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px">
      <button class="btn" onclick="DOC_TAB='edit';render()">← Back to edit</button>
      <button class="btn" onclick="printDoc('print')">🖨 Print</button><button class="btn btn-navy" onclick="printDoc('pdf')">⬇ Download PDF</button>${emailButton()}
    </div>
    <div class="preview-doc" id="print-area" style="padding:0;max-width:740px;font-family:Arial,sans-serif;font-size:12px">

      <!-- ① HEADER BAR -->
      <div style="background:${esc(CO.brand)};padding:14px 24px 12px;display:flex;justify-content:space-between;align-items:flex-start">
        <div style="${hdrLeft()}">${docLogo(true)}
          <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:.3px">${esc(CO.name)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:4px;white-space:pre-line">${esc(CO.addr)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:2px">Tel : ${esc(CO.tel)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px">Email : ${esc(CO.email)}</div>
        </div>
        <div style="text-align:right">
          <div style="color:${esc(CO.accent)};font-size:22px;font-weight:700;letter-spacing:1px">TAX INVOICE</div>
          <div style="color:rgba(255,255,255,.7);font-size:10px;margin-top:6px">Company Reg No : ${esc(CO.uen)}</div>
          <div style="color:rgba(255,255,255,.7);font-size:10px">GST Reg No : ${esc(CO.gst)}</div>
        </div>
      </div>

      <!-- ② META ROW -->
      <div style="background:#f7f8fa;border-bottom:1px solid #ddd;padding:10px 24px;font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:2px 24px">
        <table style="border-collapse:collapse;width:100%"><tbody>
          <tr><td style="color:#555;padding:2px 0;width:110px;white-space:nowrap">Invoice No</td><td style="padding:2px 4px 2px 0">:</td><td style="padding:2px 0;font-weight:700">${num}</td></tr>
          <tr><td style="color:#555;padding:2px 0;white-space:nowrap">Delivery Order No</td><td style="padding:2px 4px 2px 0">:</td><td style="padding:2px 0">${esc(FORM.doRef||'—')}</td></tr>
          <tr><td style="color:#555;padding:2px 0;white-space:nowrap">Our Reference</td><td style="padding:2px 4px 2px 0">:</td><td style="padding:2px 0">${esc(FORM.ourRef||'—')}</td></tr>
        </tbody></table>
        <table style="border-collapse:collapse;width:100%"><tbody>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Date</td><td style="padding:2px 4px 2px 8px">:</td><td style="padding:2px 0">${dateStr}</td></tr>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Purchase Order No</td><td style="padding:2px 4px 2px 8px">:</td><td style="padding:2px 0">${esc(FORM.ref||'—')}</td></tr>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Payment Term</td><td style="padding:2px 4px 2px 8px">:</td><td style="padding:2px 0">${esc(FORM.terms||'30 Days')}</td></tr>
        </tbody></table>
      </div>

      <!-- ③ BILLING / DELIVERY ADDRESS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #ddd">
        <div style="padding:12px 24px;border-right:1px solid #ddd;font-size:12px">
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Billing Address</div>
          <div style="font-weight:700">${esc(party?party.name:'')}</div>
          <div style="white-space:pre-line;color:#333">${esc(FORM.billingAddr||(party?party.addr||'':''))}</div>
          ${FORM.attn?`<div style="margin-top:4px">Attn: <strong>${esc(FORM.attn)}</strong></div>`:''}
        </div>
        <div style="padding:12px 24px;font-size:12px">
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Delivery Address</div>
          <div style="white-space:pre-line;color:#333">${esc(FORM.deliveryAddr||'')}</div>
          ${FORM.deliveryAttn?`<div style="margin-top:4px">Attention: <strong>${esc(FORM.deliveryAttn)}</strong></div>`:''}
        </div>
      </div>

      <!-- ④ LINE ITEMS TABLE -->
      <div style="padding:0 24px">
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px">
          <thead>
            <tr style="background:#f0f4ff">
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:5%;border:1px solid #c7d7f4">No</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:left;border:1px solid #c7d7f4">Description</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:14%;border:1px solid #c7d7f4">Unit Price</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:6%;border:1px solid #c7d7f4">Qty</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:14%;border:1px solid #c7d7f4">Total</th>
            </tr>
          </thead>
          <tbody>
            ${LINE_ITEMS.map((l,i)=>`<tr>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${i+1}</td>
              <td style="padding:7px 8px;border:1px solid #ddd;white-space:pre-line;overflow-wrap:anywhere;word-break:break-word;vertical-align:top;color:#1a1a1a">${escAttr(l.desc)||'—'}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.unitPrice.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.qty)}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc((l.qty*l.unitPrice).toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>`).join('')}
            <tr>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;color:#555;font-size:11px">Transport : ${esc(FORM.transport||'—')}</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:600;color:#1a1a1a;white-space:nowrap">Sub-Total (${cur})</td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center;font-weight:600">${esc(sub.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>
            <tr>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;color:#333">GST</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${docGstOn()?docGstRate()+'%':'N/A'}</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${esc(docGstOn()?gst.toLocaleString('en-SG',{minimumFractionDigits:2}):'—')}</td>
            </tr>
            <tr style="background:#f5f5f5">
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:7px 8px;text-align:right;font-weight:700;white-space:nowrap">Total (${cur})</td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:7px 8px;text-align:center;font-weight:700">${esc(tot.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ⑤ BANK DETAILS -->
      ${bank?`<div style="padding:14px 24px 10px;font-size:12px;border-top:1px solid #eee;margin-top:12px">
        <table style="border-collapse:collapse;font-size:12px">
          <tr><td style="color:#555;padding:2px 0;width:100px;white-space:nowrap;text-align:right">Account Name :</td><td style="font-weight:600;padding:2px 0;padding-left:8px">${esc(bank.accName)}</td></tr>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Account No :</td><td style="padding:2px 0;padding-left:8px">${esc(bank.accNo)}</td></tr>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Currency :</td><td style="padding:2px 0;padding-left:8px">${esc(bank.currency||CO.currency)}</td></tr>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Bank Name :</td><td style="padding:2px 0;padding-left:8px">${esc(bank.bank)}</td></tr>
          ${bank.branch?`<tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Address :</td><td style="padding:2px 0;padding-left:8px">${esc(bank.branch)}</td></tr>`:''}
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Swift Code :</td><td style="padding:2px 0;padding-left:8px">${esc(bank.swift)}</td></tr>
        </table>
      </div>`:''}

      <!-- ⑥ TERMS NOTES -->
      <div style="padding:10px 24px;font-size:11px;color:#555;border-top:1px solid #eee">
        <div>1/ Any discrepancies regarding this invoice should be lodged within THREE (3) days</div>
        <div>2/ Administration and interest charge at the rate 1% per month after the expiry of the Credit period given by the company.</div>
        <div>3/ Payment by cheque should be crossed and made payable to ${esc(CO.name)}</div>
        ${FORM.notes?`<div style="margin-top:6px">${esc(FORM.notes)}</div>`:''}
      </div>

      <!-- ⑦ DISCLAIMER -->
      <div style="background:#f7f7f7;border-top:1px solid #ddd;padding:8px 24px;font-size:10px;color:#888;text-align:center;letter-spacing:.3px">
        THIS FORM IS COMPUTER GENERATED AND DOES NOT REQUIRE A SIGNATURE
      </div>
    </div>`;
  }

  // ── DELIVERY ORDER: reference layout ─────────────────────────────────────
  if(DOC_TYPE==='do'){
    const dateStr = FORM.date ? new Date(FORM.date).toLocaleDateString('en-SG',{day:'2-digit',month:'2-digit',year:'numeric'}) : today();
    return `
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px">
      <button class="btn" onclick="DOC_TAB='edit';render()">← Back to edit</button>
      <button class="btn" onclick="printDoc('print')">🖨 Print</button><button class="btn btn-navy" onclick="printDoc('pdf')">⬇ Download PDF</button>${emailButton()}
    </div>
    <div class="preview-doc" id="print-area" style="padding:0;max-width:740px;font-family:Arial,sans-serif;font-size:12px">

      <!-- ① HEADER BAR -->
      <div style="background:${esc(CO.brand)};padding:14px 24px 12px;display:flex;justify-content:space-between;align-items:flex-start">
        <div style="${hdrLeft()}">${docLogo(true)}
          <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:.3px">${esc(CO.name)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:4px;white-space:pre-line">${esc(CO.addr)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:2px">Tel : ${esc(CO.tel)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px">Email : ${esc(CO.email)}</div>
        </div>
        <div style="text-align:right">
          <div style="color:${esc(CO.accent)};font-size:22px;font-weight:700;letter-spacing:1px">DELIVERY ORDER</div>
          <div style="color:rgba(255,255,255,.7);font-size:10px;margin-top:6px">Company Reg No : ${esc(CO.uen)}</div>
          <div style="color:rgba(255,255,255,.7);font-size:10px">GST Reg No : ${esc(CO.gst)}</div>
        </div>
      </div>

      <!-- ② META ROW -->
      <div style="background:#f7f8fa;border-bottom:1px solid #ddd;padding:10px 24px;font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:2px 24px">
        <table style="border-collapse:collapse;width:100%"><tbody>
          <tr><td style="color:#555;padding:2px 0;width:110px;white-space:nowrap">Delivery Order No</td><td style="padding:2px 4px 2px 0">:</td><td style="padding:2px 0;font-weight:700">${num}</td></tr>
          <tr><td style="color:#555;padding:2px 0;white-space:nowrap">Invoice No</td><td style="padding:2px 4px 2px 0">:</td><td style="padding:2px 0">${esc(FORM.invRef||FORM.ref||'—')}</td></tr>
          <tr><td style="color:#555;padding:2px 0;white-space:nowrap">Our Reference</td><td style="padding:2px 4px 2px 0">:</td><td style="padding:2px 0">${esc(FORM.ourRef||'—')}</td></tr>
        </tbody></table>
        <table style="border-collapse:collapse;width:100%"><tbody>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Date</td><td style="padding:2px 4px 2px 8px">:</td><td style="padding:2px 0">${dateStr}</td></tr>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Purchase Order No</td><td style="padding:2px 4px 2px 8px">:</td><td style="padding:2px 0">${esc(FORM.poRef||'—')}</td></tr>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Payment Term</td><td style="padding:2px 4px 2px 8px">:</td><td style="padding:2px 0">${esc(FORM.terms||'30 Days')}</td></tr>
        </tbody></table>
      </div>

      <!-- ③ BILLING / DELIVERY ADDRESS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #ddd">
        <div style="padding:12px 24px;border-right:1px solid #ddd;font-size:12px">
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Billing Address</div>
          <div style="font-weight:700">${esc(party?party.name:'')}</div>
          <div style="white-space:pre-line;color:#333">${esc(FORM.billingAddr||(party?party.addr||'':''))}</div>
          ${FORM.attn?`<div style="margin-top:4px">Attn: <strong>${esc(FORM.attn)}</strong></div>`:''}
        </div>
        <div style="padding:12px 24px;font-size:12px">
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Delivery Address</div>
          <div style="white-space:pre-line;color:#333">${esc(FORM.deliveryAddr||'')}</div>
          ${FORM.deliveryAttn?`<div style="margin-top:4px">Attention: <strong>${esc(FORM.deliveryAttn)}</strong></div>`:''}
        </div>
      </div>

      <!-- ④ LINE ITEMS TABLE (no price cols for DO) -->
      <div style="padding:0 24px">
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px">
          <thead>
            <tr style="background:#f0f4ff">
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:5%;border:1px solid #c7d7f4">No</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:left;border:1px solid #c7d7f4">Description</th>
              <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:14%;border:1px solid #c7d7f4">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${LINE_ITEMS.map((l,i)=>`<tr>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${i+1}</td>
              <td style="padding:7px 8px;border:1px solid #ddd;white-space:pre-line;overflow-wrap:anywhere;word-break:break-word;vertical-align:top;color:#1a1a1a">${escAttr(l.desc)||'—'}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.qty.toFixed(2))}</td>
            </tr>`).join('')}
            <tr>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;color:#555;font-size:11px">Transport : ${esc(FORM.transport||'—')}</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center;font-weight:600">Total ${esc(LINE_ITEMS.reduce((s,l)=>s+l.qty,0).toFixed(2))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ⑤ COMPLAINTS NOTE -->
      <div style="padding:14px 24px 10px;font-size:11px;color:#555">
        Complaints if any should be lodged within (3) days after delivery of goods. We will not be held responsible for any defects if brought to our notice
        ${FORM.notes?`<div style="margin-top:6px">${esc(FORM.notes)}</div>`:''}
      </div>

      <!-- ⑥ SIGNATURE BLOCK -->
      <div style="padding:10px 24px 20px;font-size:12px">
        <div style="font-weight:600;margin-bottom:14px">Received Above goods In Good Order And Condition,</div>
        <div style="color:#555;margin-bottom:28px">Goods received by :</div>
        <div style="border-bottom:1px solid #aaa;width:340px;margin-bottom:6px"></div>
        <div style="font-size:11px;color:#888">Name, Signature, Date &amp; company Stamp</div>
      </div>

      <!-- ⑦ DISCLAIMER -->
      <div style="background:#f7f7f7;border-top:1px solid #ddd;padding:8px 24px;font-size:10px;color:#888;text-align:center;letter-spacing:.3px">
        THIS FORM IS COMPUTER GENERATED AND DOES NOT REQUIRE A SIGNATURE
      </div>
    </div>`;
  }

  // ── PURCHASE ORDER: reference layout ─────────────────────────────────────
  if(DOC_TYPE==='po'){
    const dateStr = FORM.date ? new Date(FORM.date).toLocaleDateString('en-SG',{day:'2-digit',month:'2-digit',year:'numeric'}) : today();
    return `
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px">
      <button class="btn" onclick="DOC_TAB='edit';render()">← Back to edit</button>
      <button class="btn" onclick="printDoc('print')">🖨 Print</button><button class="btn btn-navy" onclick="printDoc('pdf')">⬇ Download PDF</button>${emailButton()}
    </div>
    <div class="preview-doc" id="print-area" style="padding:0;max-width:740px;font-family:Arial,sans-serif;font-size:12px">

      <!-- ① HEADER BAR -->
      <div style="background:${esc(CO.brand)};padding:14px 24px 12px;display:flex;justify-content:space-between;align-items:flex-start">
        <div style="${hdrLeft()}">${docLogo(true)}
          <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:.3px">${esc(CO.name)} (${esc(CO.uen)})</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:4px;white-space:pre-line">${esc(CO.addr)}</div>
          <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:2px">Tel : ${esc(CO.tel)}</div>
        </div>
        <div style="text-align:right">
          <div style="color:${esc(CO.accent)};font-size:22px;font-weight:700;letter-spacing:1px">PURCHASE ORDER</div>
          <div style="color:rgba(255,255,255,.7);font-size:10px;margin-top:6px">Company Reg No : ${esc(CO.uen)}</div>
          <div style="color:rgba(255,255,255,.7);font-size:10px">GST Reg No : ${esc(CO.gst)}</div>
        </div>
      </div>

      <!-- ② TO / PO DETAILS BLOCK -->
      <div style="display:grid;grid-template-columns:1fr auto;gap:0;border-bottom:1px solid #ddd">
        <div style="padding:14px 24px;border-right:1px solid #ddd">
          <table style="font-size:12px;border-collapse:collapse;width:100%">
            <tr><td style="color:#555;padding:2px 0;width:50px;white-space:nowrap;vertical-align:top">To :</td><td style="font-weight:700;padding:2px 0">${esc(party?party.name:'')}</td></tr>
            ${party&&party.addr?`<tr><td></td><td style="padding:2px 0;color:#333;white-space:pre-line">${esc(party.addr)}</td></tr>`:''}
            ${party&&party.tel?`<tr><td style="color:#555;padding:2px 0">Tel :</td><td style="padding:2px 0">${esc(party.tel)}</td></tr>`:''}
            <tr><td style="color:#555;padding:6px 0 2px;vertical-align:top">Attn :</td><td style="padding:6px 0 2px;font-weight:600">${esc(FORM.attn||'')}</td></tr>
          </table>
        </div>
        <div style="padding:14px 24px;min-width:220px">
          <table style="font-size:12px;border-collapse:collapse;width:100%">
            <tr><td style="color:#555;padding:2px 0;white-space:nowrap;padding-right:10px">PO No :</td><td style="padding:2px 0;font-weight:700;color:${esc(CO.brand)}">${num}</td></tr>
            <tr><td style="color:#555;padding:2px 0">Date :</td><td style="padding:2px 0">${dateStr}</td></tr>
            <tr><td style="color:#555;padding:2px 0">Terms :</td><td style="padding:2px 0">${esc(FORM.terms||'—')}</td></tr>
            <tr><td style="color:#555;padding:2px 0">Our Ref No :</td><td style="padding:2px 0">${esc(FORM.ref||'—')}</td></tr>
            <tr><td style="color:#555;padding:2px 0">Page No :</td><td style="padding:2px 0">1/1</td></tr>
          </table>
        </div>
      </div>

      <!-- ③ LINE ITEMS TABLE -->
      <div style="padding:0 24px">
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px">
          <thead>
            <tr style="background:#f0f4ff">
              <th style="color:#1e3a5f;font-weight:700;padding:9px 8px;text-align:center;width:5%;border:1px solid #c7d7f4">No</th>
              <th style="color:#1e3a5f;font-weight:700;padding:9px 8px;text-align:left;border:1px solid #c7d7f4">Description</th>
              <th style="color:#1e3a5f;font-weight:700;padding:9px 8px;text-align:center;width:16%;border:1px solid #c7d7f4">Unit Price (${cur})</th>
              <th style="color:#1e3a5f;font-weight:700;padding:9px 8px;text-align:center;width:6%;border:1px solid #c7d7f4">Qty</th>
              <th style="color:#1e3a5f;font-weight:700;padding:9px 8px;text-align:center;width:15%;border:1px solid #c7d7f4">Total (${cur})</th>
            </tr>
          </thead>
          <tbody>
            ${LINE_ITEMS.map((l,i)=>`<tr>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${i+1}</td>
              <td style="padding:7px 8px;border:1px solid #ddd;white-space:pre-line;overflow-wrap:anywhere;word-break:break-word;vertical-align:top;color:#1a1a1a">${escAttr(l.desc)||'—'}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.unitPrice.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.qty)}</td>
              <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc((l.qty*l.unitPrice).toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>`).join('')}
            <!-- Transport + Sub-Total row -->
            <tr>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;color:#555;font-size:11px">Transport : ${esc(FORM.transport||'—')}</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:600;color:#1a1a1a;white-space:nowrap">Sub-Total (${cur})</td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center;font-weight:600;color:#1a1a1a">${esc(sub.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>
            <!-- GST row -->
            <tr>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;color:#333">GST</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center;color:#333">${docGstOn()?docGstRate()+'%':'0%'}</td>
              <td style="border:1px solid #ddd;padding:6px 8px;text-align:center;color:#333">${esc(docGstOn()?gst.toLocaleString('en-SG',{minimumFractionDigits:2}):'-')}</td>
            </tr>
            <!-- Total row -->
            <tr style="background:#f5f5f5">
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:7px 8px;text-align:right;font-weight:700;color:#1a1a1a;white-space:nowrap">Total (${cur})</td>
              <td style="border:1px solid #ddd"></td>
              <td style="border:1px solid #ddd;padding:7px 8px;text-align:center;font-weight:700;color:#1a1a1a">${esc(tot.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ④ PRICE / DELIVERY TERMS -->
      ${(FORM.deliveryTerm||FORM.delivery)?`
      <div style="padding:12px 24px 6px;font-size:12px">
        <table style="border-collapse:collapse;width:100%">
          ${FORM.deliveryTerm?`<tr><td style="color:#555;padding:3px 0;width:100px;white-space:nowrap">Price :</td><td style="padding:3px 0">${esc(FORM.deliveryTerm)}</td></tr>`:''}
          ${FORM.delivery?`<tr><td style="color:#555;padding:3px 0">Delivery :</td><td style="padding:3px 0">${esc(FORM.delivery)}</td></tr>`:''}
        </table>
      </div>`:''}

      <!-- ⑤ STANDARD NOTES -->
      <div style="padding:12px 24px 10px;font-size:11px;color:#555;border-top:1px solid #eee;margin-top:8px">
        <div style="margin-bottom:3px">1/ Please Quote Our PO Number On All Correspondence, Invoice And Delivery Order.</div>
        <div style="margin-bottom:3px">2/ The Company will not be responsible for the payment of an invoice for which an official order has not been issued.</div>
        <div style="margin-bottom:3px">3/ If prices are higher than specified, please advise us immediately for approval.</div>
        <div>4/ Goods will be rejected, if found not in conformity with the terms of order.</div>
        ${FORM.notes?`<div style="margin-top:6px">${esc(FORM.notes)}</div>`:''}
      </div>

      <!-- ⑥ SIGN-OFF -->
      <div style="padding:10px 24px 8px;font-size:12px">
        Best Regards<br><br>
        <strong>${esc(CO.signoff||'Wong WL')} / Mobile : ${esc(CO.tel)}</strong>
      </div>

      <!-- ⑦ DISCLAIMER -->
      <div style="background:#f7f7f7;border-top:1px solid #ddd;padding:8px 24px;font-size:10px;color:#888;text-align:center;letter-spacing:.3px">
        THIS FORM IS COMPUTER GENERATED AND DOES NOT REQUIRE A SIGNATURE
      </div>
    </div>`;
  }

  // ── ALL OTHER DOC TYPES: generic layout ──────────────────────────────────
  const bank = CO.banks[0];
  return `
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px">
    <button class="btn" onclick="DOC_TAB='edit';render()">← Back to edit</button>
    <button class="btn" onclick="printDoc('print')">🖨 Print</button><button class="btn btn-navy" onclick="printDoc('pdf')">⬇ Download PDF</button>${emailButton()}
  </div>
  <div class="preview-doc" id="print-area" style="border-top:4px solid ${esc(CO.brand)}">
    <div class="prev-hdr">
      <div style="${hdrLeft()}">${docLogo(false)}
        <div style="font-size:15px;font-weight:700;color:${esc(CO.brand)}">${esc(CO.name)}</div>
        <div style="font-size:11px;color:#555;white-space:pre-line;margin-top:3px">${esc(CO.addr)}</div>
        <div style="font-size:11px;color:#555">Tel: ${esc(CO.tel)}${esc(CO.fax?' · Fax: '+CO.fax:'')}</div>
        <div style="font-size:11px;color:#555">${esc(CO.email)}${esc(CO.website?' · '+CO.website:'')}</div>
        <div style="font-size:11px;color:#555">UEN: ${esc(CO.uen)}${esc(CO.gstOn?' · GST Reg: '+CO.gst:'')}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:700;color:${esc(CO.brand)}">${label}</div>
        <div style="font-size:12px;font-family:monospace;color:#666">${num}</div>
        <div style="font-size:11px;color:#666;margin-top:3px">Date: ${esc(FORM.date||today())}</div>
        ${FORM.ref?`<div style="font-size:11px;color:#666">Your ref: ${esc(FORM.ref)}</div>`:''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;padding-bottom:12px;border-bottom:1.5px solid ${esc(CO.brand)};font-size:12px">
      <div>
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">${isPO?'To (Supplier)':'Bill / Ship to'}</div>
        <div style="font-weight:700;font-size:13px">${esc(party?party.name:'—')}</div>
        ${FORM.attn?`<div>Attn: ${esc(FORM.attn)}</div>`:''}
        <div style="color:#555;white-space:pre-line">${esc(party?party.addr||'':'')}</div>
      </div>
      <div>
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Payment terms</div>
        <div>${esc(FORM.terms||'30 days')}</div>
        <div style="margin-top:6px;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px">Currency</div>
        <div>${cur}</div>
      </div>
    </div>
    <table class="prev-tbl">
      <thead><tr style="background:${esc(CO.brand)}"><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th class="r">Unit price</th><th class="r">Amount (${cur})</th></tr></thead>
      <tbody>${LINE_ITEMS.map((l,i)=>`<tr><td style="vertical-align:top">${i+1}</td><td style="white-space:pre-line;overflow-wrap:anywhere;word-break:break-word">${escAttr(l.desc)||'—'}</td><td>${esc(l.qty)}</td><td>${esc(l.unit)}</td><td class="r">${esc(l.unitPrice.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td><td class="r">${esc((l.qty*l.unitPrice).toLocaleString('en-SG',{minimumFractionDigits:2}))}</td></tr>`).join('')}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end">
      <table style="width:230px;font-size:12px">
        <tr><td>Subtotal</td><td class="r">${cur} ${esc(sub.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td></tr>
        ${docGstOn()?`<tr><td>GST (${docGstRate()}%)</td><td class="r">${cur} ${esc(gst.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td></tr>`:'<tr style="color:#888"><td>GST</td><td class="r">Not applicable</td></tr>'}
        <tr style="font-weight:700;border-top:2px solid ${esc(CO.brand)}"><td style="padding-top:5px">Total</td><td class="r" style="padding-top:5px">${cur} ${esc(tot.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td></tr>
      </table>
    </div>
    ${FORM.notes?`<div style="margin-top:12px;font-size:11px"><strong>Notes:</strong> ${esc(FORM.notes)}</div>`:''}
    ${CO.terms[DOC_TYPE]?`<div style="margin-top:8px;font-size:11px;color:#555">${esc(CO.terms[DOC_TYPE])}</div>`:''}
    <div style="margin-top:16px;padding-top:10px;border-top:1px solid #eee;font-size:11px;color:#888">
      ${bank?`Payment: ${esc(bank.bank)} · Acc name: ${esc(bank.accName)} · ${esc(bank.accNo)} · Swift: ${esc(bank.swift)}<br>`:''}
      ${esc(CO.footer)}
    </div>
  </div>`;
}

function printDoc(mode='print'){
  const area=document.getElementById('print-area'); if(!area) return;
  const css=`
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;max-width:800px;margin:0 auto;padding:16px}
    table{border-collapse:collapse;width:100%}
    th,td{padding:7px 10px}
    .prev-hdr{display:flex;justify-content:space-between;margin-bottom:16px;padding-bottom:12px}
    .prev-tbl th{text-align:left;font-size:11px;font-weight:700;color:#1e3a5f;background:#f0f4ff;border:1px solid #c7d7f4}
    .prev-tbl td{border-bottom:1px solid #ddd;color:#111;vertical-align:top}
    .prev-tbl tr:nth-child(even) td{background:#f8f9fb}
    .r{text-align:right}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
    .b-draft,.b-pending,.b-outstanding{background:#fef3c7;color:#92400e}
    .b-sent,.b-issued{background:#dbeafe;color:#1d4ed8}
    .b-accepted,.b-paid,.b-active,.b-delivered,.b-received{background:#d1fae5;color:#065f46}
    .b-overdue,.b-cancelled,.b-rejected{background:#fee2e2;color:#991b1b}
    .b-invoiced{background:#ede9fe;color:#5b21b6}
    button{display:none!important}
    @media print{body{padding:0;max-width:100%}@page{margin:12mm}}
  `;
  const pfxKey={quotation:'quotation',invoice:'invoice',po:'po',do:'do','client-po':'clientPO'}[DOC_TYPE]||DOC_TYPE;
  const docNum=EDIT_ID==='new'?`${fullPrefix(pfxKey)}-${String((CO.counter[pfxKey]||0)+1).padStart(4,'0')}`:EDIT_ID;
  const html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+esc(docNum)+'</title><style>'+css+'</style></head><body>'+area.innerHTML+'</body></html>';

  if(mode==='print'){
    // Use hidden iframe — triggers print dialog on current page, connects to printer
    let iframe=document.getElementById('_print_frame');
    if(iframe) document.body.removeChild(iframe);
    iframe=document.createElement('iframe');
    iframe.id='_print_frame';
    iframe.style.cssText='position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0';
    document.body.appendChild(iframe);
    iframe.srcdoc=html;
    iframe.onload=function(){
      try{
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }catch(e){
        // fallback for browsers that block iframe print
        const blob=new Blob([html],{type:'text/html'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a'); a.href=url; a.target='_blank';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),5000);
        toast('Opened in new tab — press Ctrl+P / ⌘+P to print');
      }
    };
  } else {
    // PDF — open in new tab, user chooses Save as PDF in print dialog
    const blob=new Blob([html],{type:'text/html'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.target='_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    toast('Opened in new tab — choose "Save as PDF" in the print dialog');
  }
}

/* ═══════════════════════════════════════════════
   SUPPLIER INVOICE FORM
═══════════════════════════════════════════════ */
function renderSupInvoiceForm(){
  const sub=LINE_ITEMS.reduce((s,l)=>s+(l.qty*l.unitPrice),0);
  const gst=calcGST(sub); const tot=sub+gst;
  const cur=FORM.currency||CO.currency;
  const party=DB.suppliers.find(x=>x.id===FORM.supplierId)||null;
  const sOpts=DB.suppliers.map(s=>`<option value="${esc(s.id)}" ${FORM.supplierId===s.id?'selected':''}>${esc(s.name)}</option>`).join('');
  const poOpts=`<option value="">— None —</option>`+DB.pos.map(p=>`<option value="${esc(p.id)}" ${FORM.ref===p.id?'selected':''}>${esc(p.id)} · ${esc(sName(p.supplierId))}</option>`).join('');
  return `
  <div class="tabs">
    <div class="tab ${DOC_TAB==='edit'?'on':''}" onclick="DOC_TAB='edit';render()">✏️ Edit</div>
    <div class="tab ${DOC_TAB==='preview'?'on':''}" onclick="DOC_TAB='preview';render()">👁 Preview</div>
  </div>
  ${DOC_TAB==='preview' ? renderSupInvoicePreview(cur,sub,gst,tot,party) : `

  <div class="panel"><h4>Supplier details</h4>
    <div class="frow c2">
      <div class="fgrp"><label>Supplier *</label>
        ${partyPicker('supplier',FORM.supplierId,onSupInvParty)}
      </div>
      <div class="fgrp"><label>Attention to</label><input id="f-attn" value="${esc(FORM.attn||'')}" oninput="FORM.attn=this.value"/></div>
    </div>
    ${party?`<div style="background:var(--card2);border:1px solid var(--border);border-radius:var(--radius);padding:9px 12px;font-size:12px;color:var(--muted)">${esc(party.addr||'')} · ${esc(party.email||'')} · ${esc(party.tel||'')}</div>`:''}
  </div>

  <div class="panel"><h4>Invoice details</h4>
    <div style="background:var(--accent-bg);border:1px solid #bfdbfe;border-radius:var(--radius);padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:10px;font-weight:700;color:var(--accent-tx);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Purchase Invoice No.</div>
        <div style="font-size:16px;font-weight:700;color:var(--navy);font-family:'SF Mono',Monaco,Consolas,monospace;letter-spacing:.5px">
          ${EDIT_ID==='new'?`SINV-${esc(String((CO.counter.supInvoice||0)+1).padStart(4,'0'))}`:EDIT_ID}
        </div>
      </div>
      <div>${EDIT_ID==='new'?'<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">NEW</span>':(isLockedDoc()?'<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">🔒 LOCKED</span>':'<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">EDITING</span>')}</div>
    </div>
    <div class="frow c3">
      <div class="fgrp"><label>Invoice date *</label><input type="date" id="f-date" value="${esc(FORM.date||today())}" oninput="FORM.date=this.value"/></div>
      <div class="fgrp"><label>Due date</label><input type="date" id="f-due" value="${FORM.due||addDays(today(),30)}" oninput="FORM.due=this.value"/></div>
      <div class="fgrp"><label>Currency</label>
        <select id="f-cur" onchange="FORM.currency=this.value;recalc()">
          ${['SGD','MYR','USD','EUR','GBP'].map(c=>`<option ${cur===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Supplier's invoice no. *</label><input id="f-supref" value="${esc(FORM.supplierRef||'')}" oninput="FORM.supplierRef=this.value" placeholder="Their invoice reference"/></div>
      <div class="fgrp"><label>Our PO reference</label>
        <select id="f-ref" onchange="FORM.ref=this.value;const po=DB.pos.find(x=>x.id===this.value);if(po){FORM.supplierId=po.supplierId;FORM.currency=po.currency||CO.currency;FORM.terms=po.terms||FORM.terms;FORM.attn=po.attn||FORM.attn;FORM.notes=po.notes||FORM.notes;LINE_ITEMS=po.lines&&po.lines.length?po.lines.map(l=>({...l})):LINE_ITEMS;}render()">${poOpts}</select>
      </div>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Linked client invoice (project)</label>
        <select id="f-clinv" onchange="FORM.clientInvRef=this.value">
          <option value="">— Not linked —</option>
          ${DB.invoices.map(i=>`<option value="${esc(i.id)}" ${FORM.clientInvRef===i.id?'selected':''}>${esc(i.id)} · ${esc(cName(i.clientId))} · ${esc(fmt(i.amount,i.currency))}</option>`).join('')}
        </select>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Costs on this purchase invoice count against that client invoice in Project P&amp;L.</div>
      </div>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Payment terms</label><select id="f-terms" onchange="onTermsChange(this.value,'f-due')">${termsOptions(FORM.terms)}</select></div>
      <div class="fgrp"><label>Status</label>
        <select id="f-status" onchange="FORM.status=this.value">
          ${['pending','paid','overdue','disputed'].map(s=>`<option ${(FORM.status||'pending')===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <!-- GST override (reuse same logic) -->
    <div style="border-top:1px solid var(--border);margin-top:6px;padding-top:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div><div style="font-size:12px;font-weight:600">GST on this invoice</div><div style="font-size:11px;color:var(--muted);margin-top:2px">Company default: ${esc(CO.gstOn?CO.gstRate+'%':'Off')}</div></div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:var(--muted)">Default</span>
          <label class="toggle"><input type="checkbox" id="f-gst-override" ${FORM.docGstOn!==undefined?'checked':''} onchange="onGstOverrideToggle(this.checked)"/><span class="toggle-slider"></span></label>
          <span style="font-size:12px;color:var(--muted)">Override</span>
        </div>
      </div>
      <div id="gst-override-panel" style="${FORM.docGstOn!==undefined?'':'display:none'}">
        <div class="frow c3" style="margin-bottom:0">
          <div class="fgrp"><label>GST applicable</label>
            <select id="f-gst-on" onchange="FORM.docGstOn=this.value==='yes';recalc();toggleGstRateRow()">
              <option value="yes" ${docGstOn()?'selected':''}>Yes</option>
              <option value="no"  ${!docGstOn()?'selected':''}>No</option>
            </select>
          </div>
          <div class="fgrp" id="f-gst-rate-wrap" style="${docGstOn()?'':'opacity:.4;pointer-events:none'}">
            <label>GST rate (%)</label>
            <input type="number" id="f-gst-rate" value="${docGstRate()}" min="0" max="30" step="0.1" oninput="FORM.docGstRate=parseFloat(this.value)||0;recalc()"/>
          </div>
          <div class="fgrp" style="justify-content:flex-end;padding-top:18px">
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm" onclick="setDocGst(true,9)">SG 9%</button>
              <button class="btn btn-sm" onclick="setDocGst(true,6)">MY 6%</button>
              <button class="btn btn-sm" onclick="setDocGst(false,0)">Exempt</button>
            </div>
          </div>
        </div>
        <div id="gst-doc-status" style="margin-top:8px;font-size:12px;padding:7px 12px;border-radius:6px;background:${docGstOn()?'var(--success-bg)':'var(--warning-bg)'};color:${docGstOn()?'var(--success-tx)':'var(--warning-tx)'}">
          ${docGstOn()?`✓ GST at <strong>${docGstRate()}%</strong> applied`:'⚠ GST not applied'}
        </div>
      </div>
      <div id="gst-default-note" style="${FORM.docGstOn!==undefined?'display:none':''}">
        <div style="font-size:12px;padding:7px 12px;border-radius:6px;background:var(--card2);color:var(--muted)">Using company default: ${CO.gstOn?`GST <strong>${esc(CO.gstRate)}%</strong> applied`:'GST <strong>not applicable</strong>'}</div>
      </div>
    </div>
  </div>

  <div class="panel"><h4>Line items &nbsp;<span id="gst-line-label" style="font-size:10px;font-weight:400;color:var(--muted)">GST: ${docGstOn()?docGstRate()+'% applied':'Not applicable'}</span></h4>
    <div style="margin-bottom:8px;font-size:12px;color:var(--muted)">💡 Click 📦 to pick from products database.</div>
    <table class="line-tbl">
      <thead><tr><th style="width:5%;text-align:center">#</th><th style="width:38%">Description</th><th style="width:8%;text-align:center">Qty</th><th style="width:10%">Unit</th><th style="width:18%">Unit price</th><th style="width:13%;text-align:right">Amount</th><th style="width:8%;text-align:center"></th></tr></thead>
      <tbody id="line-body">${renderLines()}</tbody>
    </table>
    <button class="btn btn-sm" style="margin-top:8px" onclick="addLine()">+ Add line</button>
    <div class="totals">
      <div class="trow"><span>Subtotal</span><span id="t-sub">${esc(fmt(sub,cur))}</span></div>
      <div class="trow gst-row"><span id="t-gst-label">GST ${docGstOn()?docGstRate()+'%':'—'}</span><span id="t-gst">${esc(docGstOn()?fmt(gst,cur):'Not applicable')}</span></div>
      <div class="trow grand"><span>Total</span><span id="t-tot">${esc(fmt(tot,cur))}</span></div>
    </div>
  </div>

  <div class="panel"><h4>Notes</h4><textarea id="f-notes" oninput="FORM.notes=this.value">${esc(FORM.notes||'')}</textarea></div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:28px">
    <button class="btn" onclick="DOC_TYPE=null;render()">Cancel</button>
    <button class="btn" onclick="DOC_TAB='preview';render()">Preview</button>
    <button class="btn btn-navy" onclick="saveDoc()">Save invoice</button>
  </div>`}`;
}

function renderSupInvoicePreview(cur,sub,gst,tot,party){
  const num=EDIT_ID==='new'?'[SINV-PREVIEW]':EDIT_ID;
  return `
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px">
    <button class="btn" onclick="DOC_TAB='edit';render()">← Back</button>
    <button class="btn" onclick="printDoc('print')">🖨 Print</button><button class="btn btn-navy" onclick="printDoc('pdf')">⬇ Download PDF</button>${emailButton()}
  </div>
  <div class="preview-doc" id="print-area" style="border-top:4px solid ${esc(CO.brand)}">
    <div class="prev-hdr">
      <div style="${hdrLeft()}">${docLogo(false)}
        <div style="font-size:15px;font-weight:700;color:${esc(CO.brand)}">${esc(CO.name)}</div>
        <div style="font-size:11px;color:#555;white-space:pre-line;margin-top:3px">${esc(CO.addr)}</div>
        <div style="font-size:11px;color:#555">Tel: ${esc(CO.tel)} · ${esc(CO.email)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:17px;font-weight:700;color:${esc(CO.brand)}">Purchase Invoice</div>
        <div style="font-size:12px;font-family:monospace;color:#666">${num}</div>
        <div style="font-size:11px;color:#666;margin-top:3px">Date: ${esc(FORM.date||today())}</div>
        <div style="font-size:11px;color:#c0392b;font-weight:600">Due: ${esc(FORM.due||'—')}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;padding-bottom:12px;border-bottom:1.5px solid ${esc(CO.brand)};font-size:12px">
      <div>
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">From (Supplier)</div>
        <div style="font-weight:700;font-size:13px">${esc(party?party.name:'—')}</div>
        ${FORM.attn?`<div>Attn: ${esc(FORM.attn)}</div>`:''}
        <div style="color:#555;white-space:pre-line">${esc(party?party.addr||'':'')}</div>
      </div>
      <div>
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">References</div>
        <div>Supplier's Invoice No.: <strong>${esc(FORM.supplierRef||'—')}</strong></div>
        <div>Our PO ref: <strong>${esc(FORM.ref||'—')}</strong></div>
        <div style="margin-top:6px">Terms: ${esc(FORM.terms||'—')}</div>
        <div>Status: <strong>${esc(FORM.status||'pending')}</strong></div>
      </div>
    </div>
    <table class="prev-tbl">
      <thead><tr style="background:${esc(CO.brand)}"><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th class="r">Unit price</th><th class="r">Amount (${cur})</th></tr></thead>
      <tbody>${LINE_ITEMS.map((l,i)=>`<tr><td style="vertical-align:top">${i+1}</td><td style="white-space:pre-line;overflow-wrap:anywhere;word-break:break-word">${escAttr(l.desc)||'—'}</td><td>${esc(l.qty)}</td><td>${esc(l.unit)}</td><td class="r">${esc(l.unitPrice.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td><td class="r">${esc((l.qty*l.unitPrice).toLocaleString('en-SG',{minimumFractionDigits:2}))}</td></tr>`).join('')}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end">
      <table style="width:230px;font-size:12px">
        <tr><td>Subtotal</td><td class="r">${cur} ${esc(sub.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td></tr>
        ${docGstOn()?`<tr><td>GST (${docGstRate()}%)</td><td class="r">${cur} ${esc(gst.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td></tr>`:'<tr style="color:#888"><td>GST</td><td class="r">Not applicable</td></tr>'}
        <tr style="font-weight:700;border-top:2px solid ${esc(CO.brand)}"><td style="padding-top:5px">Total</td><td class="r" style="padding-top:5px">${cur} ${esc(tot.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td></tr>
      </table>
    </div>
    ${FORM.notes?`<div style="margin-top:12px;font-size:11px"><strong>Notes:</strong> ${esc(FORM.notes)}</div>`:''}
    <div style="margin-top:16px;padding-top:10px;border-top:1px solid #eee;font-size:11px;color:#888">
      Internal record — ${esc(CO.name)} · ${esc(CO.email)}
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════
   SUPPLIER DO FORM
═══════════════════════════════════════════════ */
function renderSupDOForm(){
  const party=DB.suppliers.find(x=>x.id===FORM.supplierId)||null;
  const sOpts=DB.suppliers.map(s=>`<option value="${esc(s.id)}" ${FORM.supplierId===s.id?'selected':''}>${esc(s.name)}</option>`).join('');
  const poOpts=`<option value="">— None —</option>`+DB.pos.map(p=>`<option value="${esc(p.id)}" ${FORM.ref===p.id?'selected':''}>${esc(p.id)} · ${esc(sName(p.supplierId))}</option>`).join('');
  const siOpts=`<option value="">— None —</option>`+DB.supInvoices.map(si=>`<option value="${esc(si.id)}" ${FORM.sinvRef===si.id?'selected':''}>${esc(si.id)} · ${esc(si.supplierRef||'no sup. ref')}</option>`).join('');
  return `
  <div class="tabs">
    <div class="tab ${DOC_TAB==='edit'?'on':''}" onclick="DOC_TAB='edit';render()">✏️ Edit</div>
    <div class="tab ${DOC_TAB==='preview'?'on':''}" onclick="DOC_TAB='preview';render()">👁 Preview</div>
  </div>
  ${DOC_TAB==='preview' ? renderSupDOPreview(party) : `

  <div class="panel"><h4>Supplier details</h4>
    <div class="frow c2">
      <div class="fgrp"><label>Supplier *</label>
        ${partyPicker('supplier',FORM.supplierId,onSupDOParty)}
      </div>
      <div class="fgrp"><label>Attention to / Delivered by</label><input id="f-attn" value="${esc(FORM.attn||'')}" oninput="FORM.attn=this.value"/></div>
    </div>
    ${party?`<div style="background:var(--card2);border:1px solid var(--border);border-radius:var(--radius);padding:9px 12px;font-size:12px;color:var(--muted)">${esc(party.name)} · ${esc(party.tel||'')} · ${esc(party.email||'')}</div>`:''}
  </div>

  <div class="panel"><h4>Delivery details</h4>
    <div style="background:var(--accent-bg);border:1px solid #bfdbfe;border-radius:var(--radius);padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:10px;font-weight:700;color:var(--accent-tx);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px">Goods Received No.</div>
        <div style="font-size:16px;font-weight:700;color:var(--navy);font-family:'SF Mono',Monaco,Consolas,monospace;letter-spacing:.5px">
          ${EDIT_ID==='new'?`SDO-${esc(String((CO.counter.supDO||0)+1).padStart(4,'0'))}`:EDIT_ID}
        </div>
      </div>
      <div>${EDIT_ID==='new'?'<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">NEW</span>':(isLockedDoc()?'<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">🔒 LOCKED</span>':'<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">EDITING</span>')}</div>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Delivery date (on DO)</label><input type="date" id="f-date" value="${esc(FORM.date||today())}" oninput="FORM.date=this.value"/></div>
      <div class="fgrp"><label>Date goods received *</label><input type="date" id="f-recdate" value="${esc(FORM.receivedDate||today())}" oninput="FORM.receivedDate=this.value"/></div>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Our PO reference</label><select id="f-ref" onchange="FORM.ref=this.value">${poOpts}</select></div>
      <div class="fgrp"><label>Linked purchase invoice</label>
        <select id="f-sinvref" onchange="FORM.sinvRef=this.value;const si=DB.supInvoices.find(x=>x.id===this.value);if(si){FORM.supplierId=si.supplierId;FORM.attn=si.attn||FORM.attn;FORM.ref=si.ref||FORM.ref;FORM.items=si.lines&&si.lines.length?si.lines.map(l=>oneLine(l.desc)+(l.qty?' x'+l.qty:'')).join(', '):FORM.items;}render()">${siOpts}</select>
      </div>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Received by (staff name)</label><input id="f-recby" value="${esc(FORM.receivedBy||'')}" oninput="FORM.receivedBy=this.value" placeholder="Name of person who received goods"/></div>
      <div class="fgrp"><label>Goods condition / status</label>
        <select id="f-status" onchange="FORM.status=this.value">
          ${['received','partial','rejected','pending'].map(s=>`<option ${(FORM.status||'received')===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
  </div>

  <div class="panel"><h4>Items received</h4>
    <div class="fgrp" style="margin-bottom:10px"><label>Description of goods received *</label>
      <textarea id="f-items" oninput="FORM.items=this.value" style="min-height:80px" placeholder="List items received, quantities, and any discrepancies…">${esc(FORM.items||'')}</textarea>
    </div>
    <div class="fgrp"><label>Notes / remarks (discrepancies, damage, short delivery, etc.)</label>
      <textarea id="f-notes" oninput="FORM.notes=this.value" placeholder="Note any issues, short delivery, damaged items…">${esc(FORM.notes||'')}</textarea>
    </div>
  </div>

  <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:28px">
    <button class="btn" onclick="DOC_TYPE=null;render()">Cancel</button>
    <button class="btn" onclick="DOC_TAB='preview';render()">Preview</button>
    <button class="btn btn-navy" onclick="saveDoc()">Save DO</button>
  </div>`}`;
}

function renderCreditDebitForm(){
  const isCN=DOC_TYPE==='credit-note';
  const isC=FORM.partyType!=='supplier';
  const sub=LINE_ITEMS.reduce((s,l)=>s+(l.qty*l.unitPrice),0);
  const gst=calcGST(sub);
  const tot=sub+gst;
  const cur=FORM.currency||CO.currency;
  const party=isC?DB.clients.find(x=>x.id===FORM.clientId)||null:DB.suppliers.find(x=>x.id===FORM.supplierId)||null;
  const cOpts=DB.clients.map(c=>`<option value="${esc(c.id)}" ${FORM.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('');
  const sOpts=DB.suppliers.map(s=>`<option value="${esc(s.id)}" ${FORM.supplierId===s.id?'selected':''}>${esc(s.name)}</option>`).join('');

  return `
  <div class="tabs">
    <div class="tab ${DOC_TAB==='edit'?'on':''}" onclick="DOC_TAB='edit';render()">✏️ Edit</div>
    <div class="tab ${DOC_TAB==='preview'?'on':''}" onclick="DOC_TAB='preview';render()">👁 Preview</div>
  </div>
  ${DOC_TAB==='preview' ? renderCreditDebitPreview(isCN,cur,sub,gst,tot,party) : `

  <div class="panel"><h4>${isCN?'Credit Note':'Debit Note'} details</h4>
    <div class="frow c2">
      <div class="fgrp"><label>Applies to</label>
        <select onchange="FORM.partyType=this.value;FORM.clientId='';FORM.supplierId='';render()">
          <option value="client" ${isC?'selected':''}>Client</option>
          <option value="supplier" ${!isC?'selected':''}>Supplier</option>
        </select>
      </div>
      <div class="fgrp"><label>${isC?'Client':'Supplier'} *</label>
        ${partyPicker(isC?'client':'supplier',isC?FORM.clientId:FORM.supplierId,id=>{ FORM[isC?'clientId':'supplierId']=id; render(); })}
      </div>
    </div>
    <div class="frow c3">
      <div class="fgrp"><label>Date</label><input type="date" id="f-date" value="${esc(FORM.date||today())}" oninput="FORM.date=this.value"/></div>
      <div class="fgrp"><label>Reason / Reference</label><input id="f-ref" value="${esc(FORM.ref||'')}" oninput="FORM.ref=this.value" placeholder="e.g. Against Invoice MS-IV-2609-0001"/></div>
      <div class="fgrp"><label>Currency</label>
        <select id="f-cur" onchange="FORM.currency=this.value;recalc()">
          ${['SGD','MYR','USD','EUR','GBP','AUD','JPY','CNY'].map(c=>`<option ${cur===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="frow c2">
      <div class="fgrp"><label>Status</label>
        <div style="padding:8px 0"><span class="badge b-${esc(FORM.status||'draft')}">${esc(FORM.status==='cancelled'?'voided':FORM.status||'draft')}</span>
          <span class="field-hint">${(FORM.status||'draft')==='draft'?' Use “Save & issue” when it is final.':''}</span></div>
      </div>
      <div class="fgrp"><label>Attention to</label><input value="${esc(FORM.attn||'')}" oninput="FORM.attn=this.value"/></div>
    </div>
  </div>

  <div class="panel"><h4>Line Items</h4>
    <table class="line-tbl">
      <thead><tr><th style="width:5%;text-align:center">#</th><th style="width:36%">Description</th><th style="width:8%;text-align:center">Qty</th><th style="width:10%">Unit</th><th style="width:18%">Unit price</th><th style="width:13%;text-align:right">Amount</th><th style="width:10%;text-align:center"></th></tr></thead>
      <tbody id="line-body">${renderLines()}</tbody>
    </table>
    <button class="btn btn-sm" style="margin-top:8px" onclick="addLine()">+ Add line</button>
    <div class="totals">
      <div class="trow"><span>Subtotal</span><span id="t-sub">${esc(fmt(sub,cur))}</span></div>
      <div class="trow gst-row"><span id="t-gst-label">GST ${docGstOn()?docGstRate()+'%':'—'}</span><span id="t-gst">${esc(docGstOn()?fmt(gst,cur):'Not applicable')}</span></div>
      <div class="trow grand"><span>${isCN?'Total Credit':'Total Debit'}</span><span id="t-tot">${esc(fmt(tot,cur))}</span></div>
    </div>
  </div>

  <div class="panel"><h4>Notes</h4>
    <textarea id="f-notes" oninput="FORM.notes=this.value">${esc(FORM.notes||'')}</textarea>
  </div>

  <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:28px">
    <button class="btn" onclick="DOC_TYPE=null;render()">Cancel</button>
    <button class="btn" onclick="DOC_TAB='preview';render()">Preview</button>
    <button class="btn" onclick="saveDoc()">Save draft</button>
    <button class="btn btn-navy" onclick="saveDoc({issue:true})">✓ Save &amp; issue ${isCN?'credit':'debit'} note</button>
  </div>`}`;
}

function renderCreditDebitPreview(isCN,cur,sub,gst,tot,party){
  const num=EDIT_ID==='new'?`[${isCN?'CN':'DN'}-PREVIEW]`:EDIT_ID;
  const dateStr=FORM.date?new Date(FORM.date).toLocaleDateString('en-SG',{day:'2-digit',month:'2-digit',year:'numeric'}):today();
  const isC=FORM.partyType!=='supplier';
  return `
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px">
    <button class="btn" onclick="DOC_TAB='edit';render()">← Back to edit</button>
    <button class="btn" onclick="printDoc('print')">🖨 Print</button><button class="btn btn-navy" onclick="printDoc('pdf')">⬇ Download PDF</button>${emailButton()}
  </div>
  <div class="preview-doc" id="print-area" style="padding:0;max-width:740px;font-family:Arial,sans-serif;font-size:12px">
    <div style="background:${esc(CO.brand)};padding:14px 24px 12px;display:flex;justify-content:space-between;align-items:flex-start">
      <div style="${hdrLeft()}">${docLogo(true)}
        <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:.3px">${esc(CO.name)}</div>
        <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:4px;white-space:pre-line">${esc(CO.addr)}</div>
        <div style="color:rgba(255,255,255,.75);font-size:11px;margin-top:2px">Tel : ${esc(CO.tel)}</div>
        <div style="color:rgba(255,255,255,.75);font-size:11px">Email : ${esc(CO.email)}</div>
      </div>
      <div style="text-align:right">
        <div style="color:${isCN?'#4ade80':'#fb923c'};font-size:22px;font-weight:700;letter-spacing:1px">${isCN?'CREDIT NOTE':'DEBIT NOTE'}</div>
        <div style="color:rgba(255,255,255,.7);font-size:10px;margin-top:6px">Company Reg No : ${esc(CO.uen)}</div>
        <div style="color:rgba(255,255,255,.7);font-size:10px">GST Reg No : ${esc(CO.gst)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr auto;gap:0;border-bottom:1px solid #ddd">
      <div style="padding:14px 24px;border-right:1px solid #ddd">
        <table style="font-size:12px;border-collapse:collapse;width:100%">
          <tr><td style="color:#555;padding:2px 0;width:70px;white-space:nowrap;text-align:right">${isC?'To':'Supplier'} :</td><td style="font-weight:700;padding:2px 0;padding-left:8px">${esc(party?party.name:'')}</td></tr>
          ${party&&party.addr?`<tr><td></td><td style="padding:2px 0;padding-left:8px;color:#333;white-space:pre-line">${esc(party.addr)}</td></tr>`:''}
          <tr><td style="color:#555;padding:2px 0;padding-top:6px;text-align:right;white-space:nowrap">Attn :</td><td style="padding:2px 0;padding-top:6px;padding-left:8px;font-weight:600">${esc(FORM.attn||'')}</td></tr>
        </table>
      </div>
      <div style="padding:14px 24px;min-width:220px">
        <table style="font-size:12px;border-collapse:collapse;width:100%">
          <tr><td style="color:#555;padding:2px 0;white-space:nowrap;width:105px;text-align:right">${isCN?'Credit':'Debit'} Note No :</td><td style="padding:2px 0;padding-left:10px;font-weight:700;color:${esc(CO.brand)}">${num}</td></tr>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Date :</td><td style="padding:2px 0;padding-left:10px">${dateStr}</td></tr>
          <tr><td style="color:#555;padding:2px 0;text-align:right;white-space:nowrap">Reference :</td><td style="padding:2px 0;padding-left:10px">${esc(FORM.ref||'—')}</td></tr>
        </table>
      </div>
    </div>

    <div style="padding:0 24px">
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px">
        <thead>
          <tr style="background:#f0f4ff">
            <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:5%;border:1px solid #c7d7f4">No</th>
            <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:left;border:1px solid #c7d7f4">Description</th>
            <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:14%;border:1px solid #c7d7f4">Unit Price</th>
            <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:6%;border:1px solid #c7d7f4">Qty</th>
            <th style="color:#1e3a5f;font-weight:700;font-size:12px;padding:9px 8px;text-align:center;width:14%;border:1px solid #c7d7f4">Amount (${cur})</th>
          </tr>
        </thead>
        <tbody>
          ${LINE_ITEMS.map((l,i)=>`<tr>
            <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${i+1}</td>
            <td style="padding:7px 8px;border:1px solid #ddd;white-space:pre-line;overflow-wrap:anywhere;word-break:break-word;vertical-align:top;color:#1a1a1a">${escAttr(l.desc)||'—'}</td>
            <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.unitPrice.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
            <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc(l.qty)}</td>
            <td style="padding:7px 8px;text-align:center;border:1px solid #ddd;vertical-align:top;color:#1a1a1a">${esc((l.qty*l.unitPrice).toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
          </tr>`).join('')}
          <tr>
            <td style="border:1px solid #ddd"></td>
            <td style="border:1px solid #ddd;padding:6px 8px;color:#555;font-size:11px">${esc(FORM.notes||'')}</td>
            <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:600;color:#1a1a1a;white-space:nowrap">Sub-Total (${cur})</td>
            <td style="border:1px solid #ddd"></td>
            <td style="border:1px solid #ddd;padding:6px 8px;text-align:center;font-weight:600">${esc(sub.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
          </tr>
          <tr>
            <td style="border:1px solid #ddd"></td>
            <td style="border:1px solid #ddd"></td>
            <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;color:#333;white-space:nowrap">GST</td>
            <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${docGstOn()?docGstRate()+'%':'N/A'}</td>
            <td style="border:1px solid #ddd;padding:6px 8px;text-align:center">${esc(docGstOn()?gst.toLocaleString('en-SG',{minimumFractionDigits:2}):'—')}</td>
          </tr>
          <tr style="background:#f5f5f5">
            <td style="border:1px solid #ddd"></td>
            <td style="border:1px solid #ddd"></td>
            <td style="border:1px solid #ddd;padding:7px 8px;text-align:right;font-weight:700;white-space:nowrap">Total ${isCN?'Credit':'Debit'} (${cur})</td>
            <td style="border:1px solid #ddd"></td>
            <td style="border:1px solid #ddd;padding:7px 8px;text-align:center;font-weight:700">${esc(tot.toLocaleString('en-SG',{minimumFractionDigits:2}))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="background:#f7f7f7;border-top:1px solid #ddd;padding:8px 24px;font-size:10px;color:#888;text-align:center;letter-spacing:.3px;margin-top:14px">
      THIS FORM IS COMPUTER GENERATED AND DOES NOT REQUIRE A SIGNATURE
    </div>
  </div>`;
}

function renderSupDOPreview(party){
  const num=EDIT_ID==='new'?'[SDO-PREVIEW]':EDIT_ID;
  return `
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px">
    <button class="btn" onclick="DOC_TAB='edit';render()">← Back</button>
    <button class="btn" onclick="printDoc('print')">🖨 Print</button><button class="btn btn-navy" onclick="printDoc('pdf')">⬇ Download PDF</button>${emailButton()}
  </div>
  <div class="preview-doc" id="print-area" style="border-top:4px solid ${esc(CO.brand)}">
    <div class="prev-hdr">
      <div style="${hdrLeft()}">${docLogo(false)}
        <div style="font-size:15px;font-weight:700;color:${esc(CO.brand)}">${esc(CO.name)}</div>
        <div style="font-size:11px;color:#555;white-space:pre-line;margin-top:3px">${esc(CO.addr)}</div>
        <div style="font-size:11px;color:#555">Tel: ${esc(CO.tel)} · ${esc(CO.email)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:17px;font-weight:700;color:${esc(CO.brand)}">Goods Received Note</div>
        <div style="font-size:12px;font-family:monospace;color:#666">${num}</div>
        <div style="font-size:11px;color:#666;margin-top:3px">DO Date: ${esc(FORM.date||today())}</div>
        <div style="font-size:11px;font-weight:600;color:${esc(CO.brand)}">Received: ${esc(FORM.receivedDate||today())}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;padding-bottom:12px;border-bottom:1.5px solid ${esc(CO.brand)};font-size:12px">
      <div>
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">From (Supplier)</div>
        <div style="font-weight:700;font-size:13px">${esc(party?party.name:'—')}</div>
        ${FORM.attn?`<div>Delivered by: ${esc(FORM.attn)}</div>`:''}
        <div style="color:#555;white-space:pre-line">${esc(party?party.addr||'':'')}</div>
      </div>
      <div>
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">References &amp; receipt</div>
        <div>Our PO ref: <strong>${esc(FORM.ref||'—')}</strong></div>
        <div>Purchase invoice: <strong>${esc(FORM.sinvRef||'—')}</strong></div>
        <div style="margin-top:6px">Received by: <strong>${esc(FORM.receivedBy||'—')}</strong></div>
        <div>Condition: <strong style="text-transform:capitalize">${esc(FORM.status||'received')}</strong></div>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Items received</div>
      <div style="font-size:12px;white-space:pre-line;padding:10px 12px;background:#f9f9f9;border-radius:6px">${esc(FORM.items||'—')}</div>
    </div>
    ${FORM.notes?`<div style="margin-bottom:12px"><div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Notes / discrepancies</div><div style="font-size:12px;padding:8px 12px;background:#fffbeb;border-radius:6px;color:#92400e">${esc(FORM.notes)}</div></div>`:''}
    <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:30px;padding-top:14px;border-top:1px solid #eee">
      <div style="font-size:11px;color:#555">Received by:<br><br><div style="border-bottom:1px solid #ccc;margin-top:24px;padding-bottom:2px">${esc(FORM.receivedBy||'___________________________')}</div><div style="font-size:10px;color:#888;margin-top:4px">Name &amp; signature · Date: ${esc(FORM.receivedDate||today())}</div></div>
      <div style="font-size:11px;color:#555">Verified by:<br><br><div style="border-bottom:1px solid #ccc;margin-top:24px;padding-bottom:2px">___________________________</div><div style="font-size:10px;color:#888;margin-top:4px">Name &amp; signature · Date: ____________</div></div>
    </div>
    <div style="margin-top:14px;padding-top:10px;border-top:1px solid #eee;font-size:11px;color:#888">Internal record — ${esc(CO.name)} · ${esc(CO.email)}</div>
  </div>`;
}

