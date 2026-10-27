/* Macpro Document Hub — js/settings.js
   Company settings, automation settings, exchange rates (auto-fetch), counters, staff, banks, dark mode.
   Plain script (not a module): index.html loads the js/ files in order and they share one global scope,
   so the onclick="…" handlers in the page can call any function by name. */

/* ═══════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════ */
function renderSettings(){
  const tabs=[
    {id:'profile',label:'Company profile'},
    {id:'contact', label:'Contact details'},
    {id:'gst',     label:'GST / Tax settings'},
    {id:'banking', label:'Banking'},
    {id:'currency',label:'💱 Currency & FX'},
    {id:'staff',   label:'Staff / PIC'},
    {id:'documents',label:'Document settings'},
    {id:'branding', label:'Branding'},
    {id:'automation',label:'⚙ Automation'},
  ];
  return `<div class="settings-layout">
    <div>
      <div class="s-nav">${tabs.map(t=>`<div class="s-nav-item ${S_TAB===t.id?'on':''}" onclick="S_TAB='${esc(t.id)}';render()">${esc(t.label)}</div>`).join('')}</div>
      <div class="panel" style="margin-top:12px;padding:14px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div style="width:42px;height:42px;border-radius:10px;background:${esc(CO.brand)};color:${esc(CO.accent)};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700">${esc(inits(CO.shortName||CO.name))}</div>
          <div><div style="font-weight:600;font-size:13px">${esc(CO.name)}</div><div style="font-size:11px;color:var(--muted)">${esc(CO.country)}</div></div>
        </div>
        <div style="font-size:11px;color:var(--muted);border-top:1px solid var(--border);padding-top:8px">
          UEN: ${esc(CO.uen)}<br>GST: ${esc(CO.gstOn?CO.gstRate+'% (registered)':'Not registered')}<br>Currency: ${esc(CO.currency)}
        </div>
      </div>
    </div>
    <div>${renderSettingsPanel()}</div>
  </div>`;
}

function renderSettingsPanel(){
  if(S_TAB==='profile') return `
    <div class="panel"><h4>Company identity</h4>
      <div class="frow c2"><div class="fgrp"><label>Full company name</label><input id="s-name" value="${esc(CO.name)}"/></div><div class="fgrp"><label>Short / display name</label><input id="s-short" value="${esc(CO.shortName||'')}"/></div></div>
      <div class="frow c2"><div class="fgrp"><label>Country</label><input id="s-country" value="${esc(CO.country)}"/></div><div class="fgrp"><label>Industry</label><input id="s-ind" value="${esc(CO.industry)}"/></div></div>
      <div class="frow"><div class="fgrp"><label>Description</label><textarea id="s-desc">${esc(CO.desc)}</textarea></div></div>
      <div class="frow c2"><div class="fgrp"><label>Sign-off name (quotation footer)</label><input id="s-signoff" value="${esc(CO.signoff||'')}" placeholder="e.g. Wong WL"/></div></div>
    </div>
    <div class="panel"><h4>Registration numbers</h4>
      <div class="frow c2"><div class="fgrp"><label>UEN / Company reg. no.</label><input id="s-uen" value="${esc(CO.uen)}"/></div><div class="fgrp"><label>GST / Tax reg. no.</label><input id="s-gstreg" value="${esc(CO.gst)}"/></div></div>
    </div>
    <div style="display:flex;justify-content:flex-end"><button class="btn btn-navy" onclick="saveSetting('profile')">Save changes</button></div>`;

  if(S_TAB==='contact') return `
    <div class="panel"><h4>Contact information</h4>
      <div class="frow"><div class="fgrp"><label>Registered address</label><textarea id="s-addr" style="min-height:70px">${esc(CO.addr)}</textarea></div></div>
      <div class="frow c2"><div class="fgrp"><label>Telephone</label><input id="s-tel" value="${esc(CO.tel)}"/></div><div class="fgrp"><label>Fax</label><input id="s-fax" value="${esc(CO.fax||'')}"/></div></div>
      <div class="frow c2"><div class="fgrp"><label>Email</label><input id="s-email" type="email" value="${esc(CO.email)}"/></div><div class="fgrp"><label>Website</label><input id="s-web" value="${esc(CO.website||'')}"/></div></div>
      <div class="frow c2"><div class="fgrp"><label>Default currency</label><select id="s-cur">${['SGD','MYR','USD','EUR','GBP'].map(c=>`<option ${CO.currency===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
    </div>
    <div style="display:flex;justify-content:flex-end"><button class="btn btn-navy" onclick="saveSetting('contact')">Save changes</button></div>`;

  if(S_TAB==='gst') return `
    <div class="panel"><h4>GST / Tax settings</h4>
      <div class="gst-box">
        <div class="gst-box-hdr">
          <div>
            <div style="font-size:13px;font-weight:600">GST registered</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">Toggle whether GST applies to your documents</div>
          </div>
          <label class="toggle"><input type="checkbox" id="s-gston" ${CO.gstOn?'checked':''} onchange="document.getElementById('gst-rate-row').style.display=this.checked?'':'none'"/><span class="toggle-slider"></span></label>
        </div>
        <div style="font-size:12px;color:var(--muted);background:${CO.gstOn?'var(--success-bg)':'var(--warning-bg)'};color:${CO.gstOn?'var(--success-tx)':'var(--warning-tx)'};padding:8px 12px;border-radius:6px">
          ${CO.gstOn?`✓ GST is <strong>enabled</strong> at <strong>${esc(CO.gstRate)}%</strong>. It will be applied and shown on all documents.`:'⚠ GST is <strong>disabled</strong>. No GST will be shown on documents.'}
        </div>
      </div>
      <div id="gst-rate-row" style="${CO.gstOn?'':'display:none'}">
        <div class="frow c2" style="margin-top:12px">
          <div class="fgrp">
            <label>GST rate (%)</label>
            <input type="number" id="s-gstrate" value="${esc(CO.gstRate)}" min="0" max="30" step="0.1"/>
            <div class="field-hint">Singapore standard rate: 9% · Malaysia SST: 6% · Custom: enter any rate</div>
          </div>
          <div class="fgrp">
            <label>Quick set</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">
              <button class="btn btn-sm" onclick="document.getElementById('s-gstrate').value=9">SG 9%</button>
              <button class="btn btn-sm" onclick="document.getElementById('s-gstrate').value=6">MY SST 6%</button>
              <button class="btn btn-sm" onclick="document.getElementById('s-gstrate').value=8">8%</button>
              <button class="btn btn-sm" onclick="document.getElementById('s-gstrate').value=0">0%</button>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top:14px">
        <div class="frow">
          <div class="fgrp">
            <label>GST registration number</label>
            <input id="s-gstno" value="${esc(CO.gst)}" placeholder="e.g. 201912345G"/>
            <div class="field-hint">Displayed on tax invoices and quotations</div>
          </div>
        </div>
      </div>
    </div>
    <div class="panel" style="background:var(--accent-bg);border-color:#BFDBFE"><h4 style="color:var(--accent-tx)">How GST appears on documents</h4>
      <div style="font-size:13px;line-height:1.8">
        <div>• <strong>GST on:</strong> Subtotal → GST line → Total (GST-inclusive)</div>
        <div>• <strong>GST off:</strong> Subtotal → "GST: Not applicable" → Total</div>
        <div>• Changes apply immediately to all new and previewed documents</div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end"><button class="btn btn-navy" onclick="saveSetting('gst')">Save GST settings</button></div>`;

  if(S_TAB==='banking') return `
    <div class="panel"><h4>Bank accounts</h4>
      ${CO.banks.map((b,i)=>`<div class="bank-item">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><strong>${esc(b.bank||'New account')}${b.currency?` (${esc(b.currency)})`:''}</strong><button class="btn btn-danger btn-sm" onclick="removeBank('${esc(b.id)}')">Remove</button></div>
        <div class="frow c3"><div class="fgrp"><label>Bank name</label><input id="bk-bank-${i}" value="${esc(b.bank)}"/></div><div class="fgrp"><label>Account name</label><input id="bk-an-${i}" value="${esc(b.accName)}"/></div>
        <div class="fgrp"><label>Currency</label><select id="bk-cur-${i}">${['SGD','MYR','USD','EUR','GBP','AUD','JPY','CNY'].map(c=>`<option ${(b.currency||CO.currency)===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
        <div class="frow c3"><div class="fgrp"><label>Account number</label><input id="bk-no-${i}" value="${esc(b.accNo)}"/></div><div class="fgrp"><label>Swift / BIC</label><input id="bk-sw-${i}" value="${esc(b.swift||'')}"/></div><div class="fgrp"><label>Branch</label><input id="bk-br-${i}" value="${esc(b.branch||'')}"/></div></div>
        <div style="display:flex;justify-content:flex-end;margin-top:6px"><button class="btn btn-sm" onclick="saveBank(${i},'${esc(b.id)}')">Save account</button></div>
      </div>`).join('')}
      <button class="btn btn-gold" onclick="addBank()">+ Add bank account</button>
    </div>`;

  if(S_TAB==='documents') return `
    <div class="panel"><h4>Document number prefixes</h4>
      <div class="frow c2">
        <div class="fgrp"><label>Quotation base code</label><input id="dp-qt" value="${esc(CO.prefix.quotation)}" placeholder="e.g. Q"/></div>
        <div class="fgrp"><label>Sales invoice base code</label><input id="dp-inv" value="${esc(CO.prefix.invoice)}" placeholder="e.g. MS-IV"/></div>
      </div>
      <div class="frow c2">
        <div class="fgrp"><label>Sales DO base code</label><input id="dp-do" value="${esc(CO.prefix.do)}" placeholder="e.g. MS-DO"/></div>
        <div class="fgrp"><label>Sales order base code</label><input id="dp-so" value="${esc(CO.prefix.clientPO)}" placeholder="e.g. SO"/></div>
      </div>
      <div class="frow c2">
        <div class="fgrp"><label>Purchase order base code</label><input id="dp-po" value="${esc(CO.prefix.po)}" placeholder="e.g. PO"/></div>
      </div>
      <div class="frow c2">
        <div class="fgrp"><label>Credit note base code</label><input id="dp-cn" value="${esc(CO.prefix.creditNote)}" placeholder="e.g. CN"/></div>
        <div class="fgrp"><label>Debit note base code</label><input id="dp-dn" value="${esc(CO.prefix.debitNote)}" placeholder="e.g. DN"/></div>
      </div>
      <div style="background:var(--accent-bg);border:1px solid #bfdbfe;border-radius:var(--radius);padding:10px 14px;font-size:12px;color:var(--accent-tx)">
        ℹ️ The YYMM code (e.g. <strong>2608</strong> for Aug 2026, <strong>2609</strong> for Sep 2026) is appended automatically. You only need to store the base code above.<br>
        Full format: <strong>${esc(CO.prefix.quotation)}-${esc(getYYMM())}-XXXX</strong> &nbsp;·&nbsp; <strong>${esc(CO.prefix.invoice)}-${esc(getYYMM())}-XXXX</strong> &nbsp;·&nbsp; <strong>${esc(CO.prefix.do)}-${esc(getYYMM())}-XXXX</strong> &nbsp;·&nbsp; <strong>${esc(CO.prefix.po)}-${esc(getYYMM())}-XXXX</strong> &nbsp;·&nbsp; <strong>${esc(CO.prefix.clientPO)}-${esc(getYYMM())}-XXXX</strong> &nbsp;·&nbsp; <strong>${esc(CO.prefix.creditNote)}-${esc(getYYMM())}-XXXX</strong> &nbsp;·&nbsp; <strong>${esc(CO.prefix.debitNote)}-${esc(getYYMM())}-XXXX</strong>
      </div>
      <div style="background:var(--card2);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;font-size:12px;color:var(--muted)">
        Next: <strong>${esc(fullPrefix('quotation'))}-${esc(String(CO.counter.quotation+1).padStart(4,'0'))}</strong> &nbsp;|&nbsp; <strong>${esc(fullPrefix('invoice'))}-${esc(String(CO.counter.invoice+1).padStart(4,'0'))}</strong>
        &nbsp;|&nbsp; <strong>${esc(fullPrefix('do'))}-${esc(String(CO.counter.do+1).padStart(4,'0'))}</strong>
        &nbsp;|&nbsp; <strong>${esc(fullPrefix('creditNote'))}-${esc(String(CO.counter.creditNote+1).padStart(4,'0'))}</strong>
        &nbsp;|&nbsp; <strong>${esc(fullPrefix('debitNote'))}-${esc(String(CO.counter.debitNote+1).padStart(4,'0'))}</strong>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">YYMM code auto-updates each month (current: <strong>${esc(getYYMM())}</strong> = ${esc(new Date().toLocaleString('en-SG',{month:'long',year:'numeric'}))}). Counters reset to 0001 on the 1st of each month.</div>
      </div>
    </div>

    <div class="panel"><h4>Serial number counter reset</h4>
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px">
        ⚠️ Use this to manually reset or set the starting number for any document type. The <strong>next</strong> document created will use the number you set + 1.
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Document type</th><th>Current counter</th><th>Next number</th><th>Reset to</th><th></th></tr></thead>
          <tbody>
            ${[
              {label:'Quotation',        key:'quotation',  pfx:fullPrefix('quotation')},
              {label:'Sales Invoice',    key:'invoice',    pfx:fullPrefix('invoice')},
              {label:'Sales DO',         key:'do',         pfx:fullPrefix('do')},
              {label:'Sales Order',      key:'clientPO',   pfx:fullPrefix('clientPO')},
              {label:'Purchase Order',   key:'po',         pfx:fullPrefix('po')},
              {label:'Credit Note',      key:'creditNote', pfx:fullPrefix('creditNote')},
              {label:'Debit Note',       key:'debitNote',  pfx:fullPrefix('debitNote')},
            ].map(r=>`<tr>
              <td style="font-weight:600">${esc(r.label)}</td>
              <td style="font-family:monospace;color:var(--muted)">${esc(CO.counter[r.key]||0)}</td>
              <td style="font-family:monospace;color:var(--accent-tx)">${esc(r.pfx)}-${esc(String((CO.counter[r.key]||0)+1).padStart(4,'0'))}</td>
              <td><input type="number" id="ctr-${esc(r.key)}" value="${esc(CO.counter[r.key]||0)}" min="0" step="1"
                style="width:90px;padding:5px 8px;border:1px solid var(--border-str);border-radius:6px;background:var(--input);color:var(--text);font-size:13px;font-family:inherit;text-align:right"/></td>
              <td><button class="btn btn-sm btn-danger" onclick="resetCounter('${esc(r.key)}')">Reset</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:10px;font-size:11px;color:var(--muted)">
        💡 Enter <strong>0</strong> and click Reset to start from 0001 again. Enter <strong>49</strong> to make the next document 0050.
      </div>
    </div>

    <div class="panel"><h4>Default terms &amp; footer text</h4>
      <div class="frow"><div class="fgrp"><label>Quotation terms</label><textarea id="dt-qt">${esc(CO.terms.quotation)}</textarea></div></div>
      <div class="frow"><div class="fgrp"><label>Invoice payment note</label><textarea id="dt-inv">${esc(CO.terms.invoice)}</textarea></div></div>
      <div class="frow"><div class="fgrp"><label>Purchase order note</label><textarea id="dt-po">${esc(CO.terms.po)}</textarea></div></div>
      <div class="frow"><div class="fgrp"><label>Delivery order note</label><textarea id="dt-do">${esc(CO.terms.do)}</textarea></div></div>
      <div class="frow"><div class="fgrp"><label>Document footer</label><textarea id="dt-footer">${esc(CO.footer)}</textarea></div></div>
    </div>
    <div style="display:flex;justify-content:flex-end"><button class="btn btn-navy" onclick="saveSetting('documents')">Save changes</button></div>`;

  if(S_TAB==='currency'){
    const base = CO.fxRates?.base || 'SGD';
    const rates = CO.fxRates?.rates || [];
    const allCurrencies = ['USD','MYR','EUR','GBP','AUD','JPY','CNY'];
    return `
    <div class="panel"><h4>Base Currency</h4>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
        All multi-currency amounts are converted to the base currency for consolidated reporting.
      </div>
      <div class="frow c2">
        <div class="fgrp"><label>Base / reporting currency</label>
          <select id="fx-base" onchange="CO.fxRates.base=this.value">
            ${['SGD','USD','MYR'].map(c=>`<option value="${c}" ${base===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="panel"><h4>Exchange Rates <span style="font-size:11px;font-weight:400;color:var(--muted)">— 1 unit of foreign currency = X ${base}</span></h4>
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px">
        Enter the rate for converting each currency to <strong>${base}</strong>. Update regularly for accurate reporting.
        Example: if 1 USD = 1.34 SGD, enter <strong>1.34</strong> in the USD row.
      </div>
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;background:var(--accent-bg);border:1px solid #bfdbfe;border-radius:var(--radius);padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--accent-tx)">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600">
          <input type="checkbox" ${CO.fxRates?.auto!==false?'checked':''} onchange="setFxAuto(this.checked)"/>
          Update automatically every day
        </label>
        <span style="flex:1;min-width:200px">European Central Bank reference rates. Manual edits are replaced at the next daily update while this is on.</span>
        <button class="btn btn-sm" onclick="fetchFxRates(true)">↻ Fetch latest now</button>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Currency</th><th>Rate (1 unit → ${base})</th><th>Last updated</th><th></th></tr></thead>
          <tbody>
            ${allCurrencies.filter(c=>c!==base).map(c=>{
              const r=rates.find(x=>x.currency===c)||{currency:c,rate:'',updatedAt:''};
              return `<tr>
                <td style="font-weight:600;font-family:monospace;font-size:13px">${c}</td>
                <td><input type="text" inputmode="decimal" id="fx-rate-${c}" value="${esc(r.rate||'')}" placeholder="e.g. 1.3400"
                  style="width:120px;padding:6px 9px;border:1px solid var(--border-str);border-radius:var(--radius);background:var(--input);color:var(--text);font-size:13px;font-family:inherit;text-align:right"/></td>
                <td style="font-size:11px;color:var(--muted)">${esc(r.updatedAt||'—')}</td>
                <td><button class="btn btn-sm" onclick="saveFxRate('${c}')">Save</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn btn-gold" style="margin-top:12px" onclick="saveAllFxRates()">Save all rates</button>
    </div>

    <div class="panel"><h4>Current rates summary</h4>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${allCurrencies.filter(c=>c!==base).map(c=>{
          const r=rates.find(x=>x.currency===c);
          return `<div style="background:var(--card2);border:1px solid var(--border);border-radius:var(--radius);padding:10px 16px;text-align:center;min-width:100px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">1 ${c}</div>
            <div style="font-size:16px;font-weight:700;color:var(--navy);margin-top:2px">${esc(r?.rate ? r.rate+' '+base : '—')}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${esc(r?.updatedAt||'not set')}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  if(S_TAB==='staff') return `
    <div class="panel"><h4>Staff / PIC list</h4>
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px">Staff listed here appear in the PIC dropdown on quotations. Selecting a name auto-fills the mobile number.</div>
      <div class="tbl-wrap" style="margin-bottom:14px">
        <table>
          <thead><tr><th style="width:5%">#</th><th>Name</th><th>Mobile / Contact</th><th style="width:18%">Actions</th></tr></thead>
          <tbody>
            ${(CO.staff||[]).length===0
              ? `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">No staff added yet. Click "+ Add staff" below.</td></tr>`
              : (CO.staff||[]).map((s,i)=>`<tr>
              <td style="color:var(--muted);font-size:12px">${i+1}</td>
              <td><input id="stf-name-${i}" value="${esc(s.name)}" placeholder="Full name" style="width:100%;padding:6px 9px;border:1px solid var(--border-str);border-radius:var(--radius);background:var(--input);color:var(--text);font-size:13px;font-family:inherit"/></td>
              <td><input id="stf-mob-${i}" value="${esc(s.mobile||'')}" placeholder="+65 XXXX XXXX" style="width:100%;padding:6px 9px;border:1px solid var(--border-str);border-radius:var(--radius);background:var(--input);color:var(--text);font-size:13px;font-family:inherit"/></td>
              <td style="white-space:nowrap">
                <button class="btn btn-sm" onclick="saveStaffRow(${i})">Save</button>
                &nbsp;<button class="btn btn-danger btn-sm" onclick="removeStaff(${i})">Remove</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn btn-gold" onclick="addStaff()">+ Add staff</button>
    </div>`;

  if(S_TAB==='branding') return `
    <div class="panel"><h4>Brand colours</h4>
      <div class="color-row"><div class="color-swatch" id="bc-sw" style="background:${esc(CO.brand)}"></div><span style="flex:1;font-size:13px">Primary / header colour</span><input type="color" id="s-brand" value="${esc(CO.brand)}" oninput="document.getElementById('bc-sw').style.background=this.value" style="width:80px;height:32px;border:none;cursor:pointer;border-radius:6px"/></div>
      <div class="color-row"><div class="color-swatch" id="ac-sw" style="background:${esc(CO.accent)}"></div><span style="flex:1;font-size:13px">Accent / highlight colour</span><input type="color" id="s-accent" value="${esc(CO.accent)}" oninput="document.getElementById('ac-sw').style.background=this.value" style="width:80px;height:32px;border:none;cursor:pointer;border-radius:6px"/></div>
    </div>
    <div class="panel"><h4>Letterhead logo</h4>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="width:170px;height:80px;border:1px dashed var(--border-str);border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden">
          ${coLogo()?`<img src="${esc(coLogo())}" alt="Logo" style="max-width:150px;max-height:66px;object-fit:contain">`:'<span style="font-size:12px;color:#888">No logo</span>'}</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label class="btn btn-gold" style="cursor:pointer">Upload logo…<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onchange="uploadLogo(this)" style="display:none"/></label>
          <div style="display:flex;gap:6px">
            ${CO.logo!==undefined?'<button class="btn" onclick="setLogo(undefined)">Use built-in logo</button>':''}
            ${coLogo()?'<button class="btn" onclick="setLogo(\'\')">Remove logo</button>':''}
          </div>
          <div style="font-size:11px;color:var(--muted)">PNG with a transparent background works best. Max 300 KB. Shown on quotations, orders, invoices, DOs, notes and statements.</div>
        </div>
      </div>
    </div>
    <div class="panel"><h4>Document header preview</h4>
      <div style="border-radius:8px;overflow:hidden;border:1px solid var(--border)">
        <div style="background:${esc(CO.brand)};padding:14px 18px;display:flex;justify-content:space-between;align-items:center">
          <div style="${hdrLeft()}">${docLogo(true)}<div style="color:#fff;font-size:14px;font-weight:600">${esc(CO.name)}</div><div style="color:rgba(255,255,255,.5);font-size:11px">${esc(CO.addr.split('\n')[0])}</div></div>
          <div style="text-align:right"><div style="color:${esc(CO.accent)};font-size:16px;font-weight:700">Quotation</div><div style="color:rgba(255,255,255,.4);font-size:11px">${esc(fullPrefix('quotation'))}-XXXX</div></div>
        </div>
        <div style="background:#fff;padding:12px 18px;font-size:12px;color:#111">
          <div style="border-bottom:2px solid ${esc(CO.brand)};padding-bottom:6px;margin-bottom:8px">Bill to: <strong>ABB Pte Ltd</strong></div>
          <table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:${esc(CO.brand)}"><th style="color:#fff;padding:5px 8px;text-align:left">Description</th><th style="color:#fff;padding:5px 8px;text-align:right">Amount</th></tr><tr><td style="padding:5px 8px;border-bottom:1px solid #eee">WEG W22 AC Motor 75kW × 2</td><td style="padding:5px 8px;text-align:right;border-bottom:1px solid #eee">SGD 38,400.00</td></tr></table>
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end"><button class="btn btn-navy" onclick="saveSetting('branding')">Save &amp; apply</button></div>`;
  if(S_TAB==='automation') return renderAutomationSettings();
}

/* ── SETTINGS → AUTOMATION (read by the daily-jobs function every morning at 08:00 SGT) ── */
const AUTOMATION_DEFAULTS={dailySummary:true,summaryTo:'',reminders:false,reminderBeforeDays:3,reminderAfterDays:7,monthlySOA:false,monthlyReport:true,backup:true};
let AUTO_PREVIEW=null;
function renderAutomationSettings(){
  const a={...AUTOMATION_DEFAULTS,...(CO.automation||{})};
  const chk=(id,on,label,hint)=>`<label style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--border);cursor:pointer">
    <input type="checkbox" id="au-${id}" ${on?'checked':''} style="margin-top:3px"/>
    <span><span style="font-weight:600;font-size:13px">${label}</span><br><span class="field-hint">${hint}</span></span></label>`;
  const p=AUTO_PREVIEW;
  return `
  <div class="panel"><h4>Backups</h4>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-navy" onclick="downloadFullBackup()">🗄 Download full backup (JSON)</button>
      <span class="field-hint">${lastBackupText()}</span>
    </div>
    <div class="field-hint" style="margin-top:8px">One file with every document, client, supplier and product, plus company settings and numbering.
      Keep copies somewhere other than this computer (e.g. Google Drive / OneDrive). The nightly backup below also keeps 30 days in Supabase Storage once the daily job is set up.</div>
  </div>
  <div class="panel"><h4>For your team</h4>
    <div class="frow"><div class="fgrp"><label>Send team emails to</label><input id="au-summaryTo" value="${esc(a.summaryTo||'')}" placeholder="${esc(CO.email||'you@company.com')} (default: company email)"/></div></div>
    ${chk('dailySummary',a.dailySummary,'Morning summary (08:00)','Overdue and due-soon invoices, expiring and unanswered quotes, orders to deliver or invoice, POs awaiting goods.')}
    ${chk('monthlyReport',a.monthlyReport,'Monthly report (1st of each month)','Last month: invoiced, payments received, purchases, quotations and win rate, outstanding and overdue.')}
    ${chk('backup',a.backup,'Nightly backup','A full copy of all data in Supabase Storage → backups (last 30 days kept).')}
  </div>
  <div class="panel"><h4>Emails to clients</h4>
    <div class="field-hint" style="margin-bottom:6px">Off until you switch them on. Clients need an email address on their record; your company email is copied on every message.</div>
    ${chk('reminders',a.reminders,'Payment reminders','One friendly reminder before the due date, one after it if still unpaid. Each is sent only once per invoice.')}
    <div class="frow c2" style="margin:4px 0 8px 26px">
      <div class="fgrp"><label>Days before due</label><input type="number" id="au-reminderBeforeDays" min="0" max="30" value="${esc(a.reminderBeforeDays)}"/></div>
      <div class="fgrp"><label>Days after due</label><input type="number" id="au-reminderAfterDays" min="1" max="90" value="${esc(a.reminderAfterDays)}"/></div>
    </div>
    ${chk('monthlySOA',a.monthlySOA,'Monthly statement of account (1st of each month)','Each client with unpaid invoices gets a statement listing them.')}
  </div>
  <div class="panel"><h4>Check it</h4>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="previewAutomation()">👁 What would go out today?</button>
      <button class="btn" onclick="sendSummaryNow()">✉ Send the team summary now</button>
    </div>
    ${p?`<div style="margin-top:12px;font-size:12px;line-height:1.7">
      <strong>${esc(p.today)}</strong> · team emails to ${p.teamTo.join(', ')||'<span style="color:var(--danger)">nobody — add an address above</span>'}<br>
      Summary: ${p.summary.map(s=>`${s.title} (${s.count})`).join(' · ')||'nothing needs attention'}<br>
      Reminders ${p.settings.reminders?'':'<em>(off)</em>'}: ${p.reminders.map(r=>`${r.invoice} ${r.kind} due → ${r.to}`).join(' · ')||'none due today'}<br>
      Statements on the 1st ${p.settings.monthlySOA?'':'<em>(off)</em>'}: ${p.statementsOn1st.map(s=>`${s.client} (${s.invoices})`).join(' · ')||'none'}
    </div>`:''}
  </div>
  <div style="display:flex;justify-content:flex-end"><button class="btn btn-navy" onclick="saveAutomation()">Save changes</button></div>`;
}
function saveAutomation(){
  const on=id=>document.getElementById('au-'+id).checked;
  const num=(id,d)=>{ const n=parseInt(document.getElementById('au-'+id).value,10); return isNaN(n)?d:n; };
  const to=document.getElementById('au-summaryTo').value.trim();
  const bad=to.split(/[,;]/).map(s=>s.trim()).filter(s=>s&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
  if(bad.length){ toast('Not a valid email: '+bad.join(', '),false); return; }
  CO.automation={dailySummary:on('dailySummary'),summaryTo:to,monthlyReport:on('monthlyReport'),backup:on('backup'),
    reminders:on('reminders'),reminderBeforeDays:num('reminderBeforeDays',3),reminderAfterDays:num('reminderAfterDays',7),monthlySOA:on('monthlySOA')};
  saveCO(); AUTO_PREVIEW=null; toast('Automation settings saved'); render();
}
async function previewAutomation(){
  try{ toast('Checking…'); AUTO_PREVIEW=await callFn('daily-jobs',{job:'preview'}); render(); }
  catch(e){ toast(e.message,false); }
}
async function sendSummaryNow(){
  try{ const r=await callFn('daily-jobs',{job:'summary'}); const line=(r.log||[])[0]||'';
    toast(line.startsWith('✗')?line:'Summary sent',!line.startsWith('✗')); }
  catch(e){ toast(e.message,false); }
}

function saveSetting(tab){
  if(tab==='profile'){
    CO.name    =document.getElementById('s-name').value.trim()||CO.name;
    CO.shortName=document.getElementById('s-short').value.trim();
    CO.country =document.getElementById('s-country').value.trim();
    CO.industry=document.getElementById('s-ind').value.trim();
    CO.desc    =document.getElementById('s-desc').value.trim();
    CO.signoff =document.getElementById('s-signoff').value.trim();
    if(!CO.staff) CO.staff=[];
    CO.uen     =document.getElementById('s-uen').value.trim();
    CO.gst     =document.getElementById('s-gstreg').value.trim();
  } else if(tab==='contact'){
    CO.addr    =document.getElementById('s-addr').value;
    CO.tel     =document.getElementById('s-tel').value;
    CO.fax     =document.getElementById('s-fax').value;
    CO.email   =document.getElementById('s-email').value;
    CO.website =document.getElementById('s-web').value;
    CO.currency=document.getElementById('s-cur').value;
  } else if(tab==='gst'){
    CO.gstOn   =document.getElementById('s-gston').checked;
    CO.gstRate =parseFloat(document.getElementById('s-gstrate')?.value)||0;
    CO.gst     =document.getElementById('s-gstno').value.trim();
    toast(`GST ${CO.gstOn?'enabled at '+CO.gstRate+'%':'disabled'}. All documents updated.`);
  } else if(tab==='documents'){
    CO.prefix.quotation =document.getElementById('dp-qt').value||'Q';
    CO.prefix.invoice   =document.getElementById('dp-inv').value||'MS-IV';
    CO.prefix.po        =document.getElementById('dp-po').value||'PO';
    CO.prefix.do        =document.getElementById('dp-do').value||'MS-DO';
    CO.prefix.clientPO  =document.getElementById('dp-so').value||'SO';
    CO.prefix.creditNote=document.getElementById('dp-cn').value||'CN';
    CO.prefix.debitNote =document.getElementById('dp-dn').value||'DN';
    CO.terms.quotation =document.getElementById('dt-qt').value;
    CO.terms.invoice   =document.getElementById('dt-inv').value;
    CO.terms.po        =document.getElementById('dt-po').value;
    CO.terms.do        =document.getElementById('dt-do').value;
    CO.footer          =document.getElementById('dt-footer').value;
  } else if(tab==='branding'){
    CO.brand  =document.getElementById('s-brand').value;
    CO.accent =document.getElementById('s-accent').value;
  }
  saveCO(); sbName();
  if(tab!=='gst') toast('Settings saved');
  render();
}

// Logo is stored inside the company settings as a data URL, so print windows, PDFs and emails can use it.
function uploadLogo(input){
  const f=input.files&&input.files[0]; if(!f) return;
  if(!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) return toast('Please choose a PNG, JPG, WEBP or SVG image',false);
  if(f.size>300*1024) return toast('Logo is too large — please keep it under 300 KB',false);
  const r=new FileReader();
  r.onload=()=>setLogo(r.result);
  r.onerror=()=>toast('Could not read that file',false);
  r.readAsDataURL(f);
}
function setLogo(v){
  if(v===undefined) delete CO.logo; else CO.logo=v;
  saveCO(); toast(v===''?'Logo removed':'Logo updated'); render();
}
function addBank(){ CO.banks.push({id:'b'+Date.now(),bank:'',accName:CO.name,accNo:'',swift:'',branch:'',currency:CO.currency}); render(); }
function saveFxRate(currency){
  const el=document.getElementById('fx-rate-'+currency); if(!el) return;
  const rate=parseFloat(el.value);
  if(!rate||rate<=0){ toast('Enter a valid rate', false); return; }
  if(!CO.fxRates) CO.fxRates={base:'SGD',rates:[]};
  const idx=CO.fxRates.rates.findIndex(x=>x.currency===currency);
  const entry={currency,rate,updatedAt:today()};
  if(idx>=0) CO.fxRates.rates[idx]=entry; else CO.fxRates.rates.push(entry);
  saveCO(); toast(`${currency} rate saved: 1 ${currency} = ${rate} ${CO.fxRates.base}`); render();
}
function saveAllFxRates(){
  if(!CO.fxRates) CO.fxRates={base:CO.currency||'SGD',rates:[]};
  const base=document.getElementById('fx-base')?.value||CO.fxRates.base;
  CO.fxRates.base=base;
  const currencies=['USD','MYR','EUR','GBP','AUD','JPY','CNY'].filter(c=>c!==base);
  currencies.forEach(c=>{
    const el=document.getElementById('fx-rate-'+c); if(!el||!el.value) return;
    const rate=parseFloat(el.value); if(!rate||rate<=0) return;
    const idx=CO.fxRates.rates.findIndex(x=>x.currency===c);
    const entry={currency:c,rate,updatedAt:today()};
    if(idx>=0) CO.fxRates.rates[idx]=entry; else CO.fxRates.rates.push(entry);
  });
  saveCO(); toast('All FX rates saved'); render();
}

/* ── AUTOMATIC FX RATES ──
   Daily reference rates from the European Central Bank via frankfurter.dev
   (free, no API key). Bank buy/sell rates differ slightly — turn auto off to keep manual rates. */
const FX_CURRENCIES=['USD','MYR','EUR','GBP','AUD','JPY','CNY'];
async function fetchFxRates(manual){
  if(!CO.fxRates) CO.fxRates={base:CO.currency||'SGD',rates:[]};
  const base=CO.fxRates.base||'SGD';
  const symbols=FX_CURRENCIES.filter(c=>c!==base);
  try{
    const r=await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${symbols.join(',')}`);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    // API gives 1 base = x foreign; the app stores 1 foreign = rate base
    Object.entries(d.rates||{}).forEach(([cur,x])=>{
      if(!x) return;
      const entry={currency:cur,rate:Math.round(1e6/x)/1e6,updatedAt:d.date,source:'ECB'};
      const idx=CO.fxRates.rates.findIndex(e=>e.currency===cur);
      if(idx>=0) CO.fxRates.rates[idx]=entry; else CO.fxRates.rates.push(entry);
    });
    CO.fxRates.fetchedOn=today();
    saveCO();
    if(manual){ toast(`Rates updated (ECB, ${d.date})`); render(); } else safeRender();
    return true;
  }catch(e){
    console.warn('fetchFxRates:',e);
    if(manual) toast('Could not fetch rates: '+e.message,false);
    return false;
  }
}
// Once a day, after sign-in, unless switched off in Settings → Currency
function autoFetchFxRates(){
  if(!CO.fxRates||CO.fxRates.auto===false||CO.fxRates.fetchedOn===today()) return;
  fetchFxRates(false);
}
function setFxAuto(on){
  if(!CO.fxRates) CO.fxRates={base:CO.currency||'SGD',rates:[]};
  CO.fxRates.auto=on; saveCO();
  toast(on?'Rates will update automatically each day':'Automatic rates off — manual rates kept');
  if(on) fetchFxRates(true); else render();
}
async function resetCounter(key){
  const el=document.getElementById('ctr-'+key);
  if(!el) return;
  const val=parseInt(el.value)||0;
  if(!confirm(`Reset ${key} counter to ${val}?\nNext document will be numbered ${String(val+1).padStart(4,'0')}.`)) return;
  const sb=getSB();
  if(!sb||!AUTH_USER){ toast('Sign in to reset counters — they are shared by all users',false); return; }
  const {error}=await sb.rpc('mp_set_seq',{p_prefix:counterPrefix(key),p_n:val});
  if(error){ console.warn('mp_set_seq:',error); toast('Counter reset failed: '+error.message,false); return; }
  CO.counter[key]=val; saveCOLocal();
  // The server never issues a number already in use, so it may still skip past existing documents
  toast(`Counter reset — next number: ${String(val+1).padStart(4,'0')} (or above the highest existing)`);
  render();
}
function addStaff(){ if(!CO.staff) CO.staff=[]; CO.staff.push({name:'',mobile:''}); render(); }
function saveStaffRow(i){
  const n=document.getElementById(`stf-name-${i}`); const m=document.getElementById(`stf-mob-${i}`);
  if(!n||!m) return;
  if(!CO.staff) CO.staff=[];
  CO.staff[i]={name:n.value.trim(), mobile:m.value.trim()};
  saveCO(); toast('Staff saved');
}
function removeStaff(i){ CO.staff.splice(i,1); saveCO(); toast('Removed'); render(); }
function saveBank(idx,id){
  const b=CO.banks.find(x=>x.id===id); if(!b) return;
  b.bank   =document.getElementById(`bk-bank-${idx}`).value;
  b.accName=document.getElementById(`bk-an-${idx}`).value;
  b.accNo  =document.getElementById(`bk-no-${idx}`).value;
  b.swift  =document.getElementById(`bk-sw-${idx}`).value;
  b.branch =document.getElementById(`bk-br-${idx}`).value;
  b.currency=document.getElementById(`bk-cur-${idx}`).value;
  saveCO(); toast('Bank account saved');
}
function removeBank(id){ CO.banks=CO.banks.filter(x=>x.id!==id); saveCO(); toast('Removed'); render(); }
function pickBank(currency){
  if(!CO.banks||!CO.banks.length) return null;
  if(FORM.bankId){ const chosen=CO.banks.find(x=>x.id===FORM.bankId); if(chosen) return chosen; }
  const exact=CO.banks.find(x=>(x.currency||CO.currency)===currency);
  if(exact) return exact;
  const base=CO.banks.find(x=>(x.currency||CO.currency)===(CO.currency||'SGD'));
  return base||CO.banks[0];
}

/* ═══════════════════════════════════════════════
   DARK MODE
═══════════════════════════════════════════════ */
function toggleDark(){
  DARK=!DARK;
  document.documentElement.setAttribute('data-dark',DARK?'1':'');
  if(!DARK) document.documentElement.removeAttribute('data-dark');
  const btn=document.getElementById('dark-btn');
  if(btn) btn.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;flex-shrink:0">${DARK?'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>':'<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>'}</svg> ${DARK?'Light mode':'Dark mode'}`;
}

