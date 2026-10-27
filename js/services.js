/* Macpro Document Hub — js/services.js
   Calls to the Supabase Edge Functions: AI line-item helper and emailing documents (PDF).
   Plain script (not a module): index.html loads the js/ files in order and they share one global scope,
   so the onclick="…" handlers in the page can call any function by name. */

/* ═══════════════════════════════════════════════
   AI ASSIST
═══════════════════════════════════════════════ */
async function runAI(){
  const inp=document.getElementById('ai-inp');
  const out=document.getElementById('ai-out');
  if(!inp||!out||!inp.value.trim()) return;
  out.style.display='block'; out.textContent='Generating line items…';
  try{
    // Runs in the ai-assist Supabase function, which holds the API key; the product
    // catalogue is sent so it can use real codes and prices
    const d=await callFn('ai-assist',{
      docType:DOC_TYPE, request:inp.value.trim(), currency:FORM.currency||CO.currency,
      company:{name:CO.name,industry:CO.industry,country:CO.country},
      products:DB.products.filter(p=>p.status==='active').map(p=>({code:p.code,name:p.name,unit:p.unit,unitPrice:p.unitPrice,currency:p.currency||CO.currency})),
    });
    const lines=(d.lines||[]).map(({desc,qty,unit,unitPrice})=>({desc,qty,unit,unitPrice}));
    if(lines.length){ LINE_ITEMS=lines; const lb=document.getElementById('line-body'); if(lb)lb.innerHTML=renderLines(); recalc(); }
    // The AI's notes are for staff (e.g. which prices are estimates), so they stay here, not on the document
    out.textContent=`✓ ${lines.length} line(s) added — check prices before saving.${d.notes?' AI note: '+d.notes:''}`;
  }catch(e){ out.textContent='⚠ '+e.message; }
}

/* ── SUPABASE FUNCTIONS ── */
// Calls an Edge Function as the signed-in user; throws with the function's own error message
async function callFn(name,body){
  const sb=getSB(); if(!sb||!AUTH_USER) throw new Error('Sign in first — this needs the cloud');
  const {data,error}=await sb.functions.invoke(name,{body});
  if(error){
    let msg=error.message;
    try{ const j=await error.context.json(); if(j&&j.error) msg=j.error; }catch(e){}
    if(/Failed to send a request|not found/i.test(msg)) msg=`The ${name} function isn't deployed yet (see deployment guide, Part 8)`;
    throw new Error(msg);
  }
  if(data&&data.error) throw new Error(data.error);
  return data;
}

/* ── EMAIL DOCUMENTS (PDF attached, sent by the send-email function) ── */
const DOC_COLL={quotation:'quotations',invoice:'invoices',do:'dos',po:'pos','client-po':'clientPOs','sup-invoice':'supInvoices','sup-do':'supDOs','credit-note':'creditNotes','debit-note':'debitNotes'};
const DOC_NAME={quotation:'Quotation',invoice:'Invoice',do:'Delivery Order',po:'Purchase Order','client-po':'Sales Order','sup-invoice':'Purchase Invoice','sup-do':'Goods Received Note','credit-note':'Credit Note','debit-note':'Debit Note'};
// Shown next to Print / Download PDF once the document has been saved (it needs its final number)
function emailButton(){ return EDIT_ID&&EDIT_ID!=='new'?`<button class="btn btn-gold" onclick="openEmailDialog()">✉ Email</button>`:''; }
function docParty(rec){
  const toSupplier=['po','sup-invoice','sup-do'].includes(DOC_TYPE)||rec.partyType==='supplier';
  return (toSupplier?DB.suppliers.find(s=>s.id===rec.supplierId):DB.clients.find(c=>c.id===rec.clientId))||{};
}
function emailTemplate(rec,party){
  const no=rec.id, amt=fmt(rec.amount,rec.currency);
  const body={
    quotation:`Please find attached our quotation ${no} (${amt}) for your consideration. It is valid until ${rec.valid||'the date stated'}.`,
    invoice:`Please find attached invoice ${no} for ${amt}, due on ${rec.due||'the date stated'}.`,
    do:`Please find attached delivery order ${no}. Kindly sign and return a copy upon receipt of the goods.`,
    po:`Please find attached our purchase order ${no}. Kindly confirm receipt and the expected delivery date.`,
    'client-po':`Please find attached our order acknowledgement ${no}.`,
    'credit-note':`Please find attached credit note ${no} for ${amt}.`,
    'debit-note':`Please find attached debit note ${no} for ${amt}.`,
  }[DOC_TYPE]||`Please find attached ${DOC_NAME[DOC_TYPE]||'document'} ${no}.`;
  return [`Dear ${rec.attn||party.contact||'Sir/Madam'},`,'',body,
    ...(rec.ref?[`Your reference: ${rec.ref}`]:[]),'','Please let us know if you have any questions.','',
    'Best regards,',rec.pic||CO.signoff||'',CO.name,...(rec.pic&&rec.picTel?[`Mobile: ${rec.picTel}`]:[]),...(CO.tel?[`Tel: ${CO.tel}`]:[])].join('\n');
}

// PDF of the preview on screen, as base64. html2pdf is loaded only the first time it's needed.
async function loadHtml2Pdf(){
  if(window.html2pdf) return;
  await new Promise((res,rej)=>{ const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    s.integrity='sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg=='; s.crossOrigin='anonymous';   // refuse a tampered copy
    s.onload=res; s.onerror=()=>rej(new Error('Could not load the PDF tool — check your internet connection')); document.head.appendChild(s); });
}
async function docPdfBase64(bodyHtml,filename){
  await loadHtml2Pdf();
  const host=document.createElement('div');
  host.style.cssText='position:fixed;left:-10000px;top:0;width:780px;background:#fff;color:#111';
  // Same look as printDoc, scoped so it can't touch the app's own styles
  host.innerHTML=`<style>
    .pdf-root{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:8px}
    .pdf-root table{border-collapse:collapse;width:100%} .pdf-root th,.pdf-root td{padding:7px 10px}
    .pdf-root .prev-tbl th{text-align:left;font-size:11px;font-weight:700;color:#1e3a5f;background:#f0f4ff;border:1px solid #c7d7f4}
    .pdf-root .prev-tbl td{border-bottom:1px solid #ddd;vertical-align:top} .pdf-root .r{text-align:right}
    .pdf-root button{display:none!important}</style><div class="pdf-root">${bodyHtml}</div>`;
  document.body.appendChild(host);
  try{
    const uri=await html2pdf().set({margin:[8,8,8,8],filename,image:{type:'jpeg',quality:0.95},
      html2canvas:{scale:2,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
      pagebreak:{mode:['css','legacy']}}).from(host.querySelector('.pdf-root')).outputPdf('datauristring');
    return uri.split(',')[1];
  } finally { host.remove(); }
}

let EMAIL_JOB=null; // {rec, pdf: Promise<base64>, filename}
function openEmailDialog(){
  const area=document.getElementById('print-area');
  const rec=(DB[DOC_COLL[DOC_TYPE]]||[]).find(x=>x.id===EDIT_ID);
  if(!area||!rec){ toast('Open the saved document preview first',false); return; }
  if(LOCK_TYPES[DOC_TYPE]&&rec.status==='draft'){ toast('Issue this document before emailing it',false); return; }
  const party=docParty(rec);
  const filename=`${rec.id}${party.name?' - '+party.name:''}.pdf`.replace(/[\\/:*?"<>|]/g,'_');
  EMAIL_JOB={rec, docType:DOC_TYPE, filename, pdf:docPdfBase64(area.innerHTML,filename)};
  EMAIL_JOB.pdf.catch(()=>{}); // reported when sending
  const sent=(rec.emailLog||[]).slice(-1)[0];
  const ov=document.createElement('div'); ov.id='email-dialog';
  ov.style.cssText='position:fixed;inset:0;background:rgba(11,31,75,.45);display:flex;align-items:center;justify-content:center;z-index:9000;padding:16px';
  ov.innerHTML=`<div class="panel" style="width:560px;max-width:100%;max-height:92vh;overflow:auto;margin:0">
    <h4>✉ Email ${esc(DOC_NAME[DOC_TYPE]||'document')} ${esc(rec.id)}</h4>
    ${sent?`<div class="field-hint" style="margin-bottom:10px">Last sent ${esc(sent.at.slice(0,16).replace('T',' '))} to ${esc(sent.to)}</div>`:''}
    <div class="frow"><div class="fgrp"><label>To</label><input id="em-to" value="${esc(party.email)}" placeholder="name@company.com, other@company.com"/></div></div>
    <div class="frow"><div class="fgrp"><label>CC</label><input id="em-cc" value="${esc(CO.email)}"/></div></div>
    <div class="frow"><div class="fgrp"><label>Subject</label><input id="em-subj" value="${esc(`${esc(DOC_NAME[DOC_TYPE]||'Document')} ${esc(rec.id)} — ${esc(CO.shortName||CO.name)}`)}"/></div></div>
    <div class="frow"><div class="fgrp"><label>Message</label><textarea id="em-body" rows="10">${esc(emailTemplate(rec,party))}</textarea></div></div>
    <label style="display:flex;gap:8px;align-items:center;font-size:12px;margin-bottom:12px"><input type="checkbox" id="em-pdf" checked/> Attach ${esc(filename)}</label>
    <div id="em-status" class="field-hint" style="margin-bottom:10px"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px">
      <button class="btn" onclick="closeEmailDialog()">Cancel</button>
      <button class="btn btn-navy" id="em-send" onclick="sendDocEmail()">Send</button>
    </div></div>`;
  document.body.appendChild(ov);
  if(!party.email) document.getElementById('em-status').textContent=`No email on file for ${party.name||'this party'} — add one under Clients / Suppliers to pre-fill next time.`;
}
function closeEmailDialog(){ const d=document.getElementById('email-dialog'); if(d) d.remove(); EMAIL_JOB=null; }
async function sendDocEmail(){
  const job=EMAIL_JOB; if(!job) return;
  const v=id=>document.getElementById(id).value.trim();
  const st=document.getElementById('em-status'), btn=document.getElementById('em-send');
  const to=v('em-to'), cc=v('em-cc'), subject=v('em-subj'), text=document.getElementById('em-body').value;
  if(!to){ st.textContent='Add a recipient.'; return; }
  btn.disabled=true;
  try{
    let attachments=[];
    if(document.getElementById('em-pdf').checked){ st.textContent='Preparing PDF…'; attachments=[{filename:job.filename,content:await job.pdf}]; }
    st.textContent='Sending…';
    await callFn('send-email',{to,cc,subject,text,replyTo:CO.email,attachments});
    // Log it on the document; a draft quotation that has been emailed is now "sent"
    const rec=(DB[DOC_COLL[job.docType]]||[]).find(x=>x.id===job.rec.id)||job.rec;
    rec.emailLog=[...(rec.emailLog||[]),{at:new Date().toISOString(),to,by:AUTH_USER&&AUTH_USER.email}];
    touch(rec,'emailed to '+to);
    if(job.docType==='quotation'&&rec.status==='draft') rec.status='sent';
    saveDB(); closeEmailDialog(); toast(`Emailed to ${to}`); render();
  }catch(e){ st.textContent='⚠ '+e.message; btn.disabled=false; }
}

