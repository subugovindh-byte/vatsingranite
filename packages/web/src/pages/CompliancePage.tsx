import { useState } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';
import { esc } from '../utils/escapeHtml';

const CATEGORIES = ['DGMS', 'IBM', 'TNPCB', 'PESO', 'Labour', 'GST', 'Other'];
const STATUSES = ['compliant', 'pending', 'not_due', 'overdue'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Half-yearly', 'Annual', 'On-event', 'As required'];

const BLANK = { category: 'DGMS', item: '', authority: '', due: '', frequency: 'Monthly', status: 'pending', remarks: '' };

export default function CompliancePage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'dashboard' | 'dgms' | 'ibm' | 'tnpcb' | 'labour'>('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(BLANK);

  const [complianceItems, setComplianceItems] = useState([
    { id: 'C001', category: 'DGMS', item: 'Blasting Records (Form VII)', authority: 'DGMS Tamil Nadu', due: '15 Jun 2026', frequency: 'Monthly', status: 'compliant', remarks: '' },
    { id: 'C002', category: 'DGMS', item: 'Roster of Shotfirers', authority: 'DGMS Tamil Nadu', due: 'Annual', frequency: 'Annual', status: 'compliant', remarks: '' },
    { id: 'C003', category: 'DGMS', item: 'Accident/Injury Report', authority: 'DGMS Tamil Nadu', due: 'On event', frequency: 'On-event', status: 'compliant', remarks: '' },
    { id: 'C004', category: 'IBM', item: 'Monthly Mineral Return (Form-H)', authority: 'IBM Bengaluru', due: '15 Jun 2026', frequency: 'Monthly', status: 'pending', remarks: '' },
    { id: 'C005', category: 'IBM', item: 'Annual Mineral Return (Form-F1)', authority: 'IBM Bengaluru', due: '30 Apr 2027', frequency: 'Annual', status: 'not_due', remarks: '' },
    { id: 'C006', category: 'IBM', item: 'Mining Plan Compliance', authority: 'IBM Bengaluru', due: 'Annual', frequency: 'Annual', status: 'compliant', remarks: '' },
    { id: 'C007', category: 'TNPCB', item: 'Consent to Operate (Air/Water)', authority: 'TNPCB Krishnagiri', due: '31 Mar 2027', frequency: 'Annual', status: 'compliant', remarks: '' },
    { id: 'C008', category: 'TNPCB', item: 'Monthly Dust Monitoring', authority: 'TNPCB Krishnagiri', due: '30 Jun 2026', frequency: 'Monthly', status: 'pending', remarks: '' },
    { id: 'C009', category: 'PESO', item: 'Magazine Licence Renewal', authority: 'PESO Chennai', due: '31 Dec 2026', frequency: 'Annual', status: 'compliant', remarks: '' },
    { id: 'C010', category: 'PESO', item: 'Quarterly Explosive Return', authority: 'PESO Chennai', due: '15 Jul 2026', frequency: 'Quarterly', status: 'not_due', remarks: '' },
    { id: 'C011', category: 'Labour', item: 'CLRA Principal Employer Return', authority: 'Dy. CLC Krishnagiri', due: '30 Sep 2026', frequency: 'Annual', status: 'not_due', remarks: '' },
    { id: 'C012', category: 'Labour', item: 'POSH Committee Meeting', authority: 'Internal', due: 'Quarterly', frequency: 'Quarterly', status: 'compliant', remarks: '' },
  ]);

  const nextId = () => {
    const nums = complianceItems.map(c => parseInt(c.id.slice(1)));
    return `C${String(Math.max(...nums, 0) + 1).padStart(3, '0')}`;
  };

  const byCategory = (cat: string) => complianceItems.filter(c => c.category === cat);
  const score = Math.round((complianceItems.filter(c => c.status === 'compliant').length / complianceItems.length) * 100);

  const openAdd = () => { setForm(BLANK); setEditId(null); setShowModal(true); };
  const openEdit = (c: any) => { setForm({ ...c }); setEditId(c.id); setShowModal(true); };

  const handleSave = () => {
    if (!form.item || !form.authority) { notify('Item description and authority are required', 'error'); return; }
    if (editId !== null) {
      setComplianceItems(prev => prev.map(c => c.id === editId ? { ...c, ...form } : c));
      notify('Compliance item updated');
    } else {
      setComplianceItems(prev => [...prev, { ...form, id: nextId() }]);
      notify('Compliance item added');
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => { setComplianceItems(prev => prev.filter(c => c.id !== id)); notify('Item deleted'); };
  const handleStatusChange = (id: string, status: string) => {
    setComplianceItems(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    notify(`Status updated to ${status}`);
  };
  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  // ── Form-H ──────────────────────────────────────────────────────────
  const [showFormH, setShowFormH] = useState(false);
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}`;
  const [formHMonth, setFormHMonth] = useState(defaultMonth === '-00' ? `${today.getFullYear()}-01` : defaultMonth);
  const [formHData, setFormHData] = useState<any>(null);
  const [formHLoading, setFormHLoading] = useState(false);

  const loadFormH = async () => {
    setFormHLoading(true);
    try {
      const [year, mon] = formHMonth.split('-');
      const [quarries, prod, salesResp] = await Promise.all([
        apiClient.getQuarries(),
        apiClient.getProductionLogs({ year, month: mon, limit: 1000 } as any).catch(() => []),
        apiClient.getSalesOrders({ year, month: mon, limit: 1000 } as any).catch(() => []),
      ]);
      const sales = Array.isArray(salesResp) ? salesResp : (salesResp as any).sales || [];
      setFormHData({ year, month: mon, quarries, prod: Array.isArray(prod) ? prod : [], sales });
    } catch {
      notify('Failed to load data for Form-H', 'error');
    } finally {
      setFormHLoading(false);
    }
  };

  const printFormH = () => {
    if (!formHData) return;
    const { year, month, quarries, prod, sales } = formHData;
    const monthName = new Date(+year, +month - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    // Aggregate by quarry
    const byQuarry: Record<string, { name: string; gstin: string; extracted_cbm: number; dispatched_cbm: number; closing_cbm: number }> = {};
    quarries.forEach((q: any) => {
      byQuarry[q.id] = { name: q.quarry_name, gstin: q.gstin || '—', extracted_cbm: 0, dispatched_cbm: 0, closing_cbm: 0 };
    });
    (Array.isArray(prod) ? prod : []).forEach((p: any) => {
      if (byQuarry[p.quarry_id]) byQuarry[p.quarry_id].extracted_cbm += Number(p.net_cbm || 0);
    });
    (Array.isArray(sales) ? sales : []).forEach((s: any) => {
      if (byQuarry[s.quarry_id]) byQuarry[s.quarry_id].dispatched_cbm += Number(s.total_cbm || 0);
    });
    Object.values(byQuarry).forEach(q => { q.closing_cbm = Math.max(0, q.extracted_cbm - q.dispatched_cbm); });

    const rows = Object.values(byQuarry);
    const totals = rows.reduce((a, r) => ({ extracted_cbm: a.extracted_cbm + r.extracted_cbm, dispatched_cbm: a.dispatched_cbm + r.dispatched_cbm, closing_cbm: a.closing_cbm + r.closing_cbm }), { extracted_cbm: 0, dispatched_cbm: 0, closing_cbm: 0 });

    const html = `<!DOCTYPE html><html><head><title>Form-H — ${monthName}</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
  h2 { text-align:center; font-size:13px; margin:0 0 2px; }
  h3 { text-align:center; font-size:11px; margin:0 0 10px; font-weight:normal; }
  .meta { width:100%; border-collapse:collapse; margin-bottom:10px; font-size:9px; }
  .meta td { padding:3px 6px; }
  table.dt { width:100%; border-collapse:collapse; margin-top:8px; }
  table.dt th { background:#222; color:#fff; padding:5px 6px; text-align:left; font-size:9px; border:1px solid #999; }
  table.dt td { padding:4px 6px; border:1px solid #ccc; font-size:9px; }
  .tot { font-weight:bold; background:#f5f5f5; }
  .sign { margin-top:40px; display:flex; justify-content:space-between; font-size:9px; }
  .note { margin-top:14px; font-size:8px; color:#555; border-top:1px solid #ddd; padding-top:6px; }
</style></head><body>
<h2>MONTHLY MINERAL RETURN — FORM H</h2>
<h3>[Rule 45 of Mineral Conservation and Development Rules, 2017 — IBM]</h3>
<table class="meta">
  <tr><td><b>Reporting Period:</b></td><td>${monthName}</td><td><b>Organisation:</b></td><td>Vatsin Granite Quarry</td></tr>
  <tr><td><b>Mineral:</b></td><td>Granite (HSN 2516)</td><td><b>State:</b></td><td>Tamil Nadu</td></tr>
  <tr><td><b>Submitted to:</b></td><td>Indian Bureau of Mines, Bengaluru</td><td><b>Date of Submission:</b></td><td>${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td></tr>
</table>

<table class="dt">
  <thead>
    <tr>
      <th>S.No</th>
      <th>Quarry / Mine Name</th>
      <th>GSTIN</th>
      <th>Mineral Extracted (CBM)</th>
      <th>Mineral Dispatched (CBM)</th>
      <th>Closing Stock (CBM)</th>
    </tr>
  </thead>
  <tbody>
    ${rows.map((r, i) => `<tr>
      <td>${i + 1}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.gstin)}</td>
      <td style="text-align:right">${r.extracted_cbm.toFixed(3)}</td>
      <td style="text-align:right">${r.dispatched_cbm.toFixed(3)}</td>
      <td style="text-align:right">${r.closing_cbm.toFixed(3)}</td>
    </tr>`).join('')}
    <tr class="tot">
      <td colspan="3" style="text-align:right">TOTAL</td>
      <td style="text-align:right">${totals.extracted_cbm.toFixed(3)}</td>
      <td style="text-align:right">${totals.dispatched_cbm.toFixed(3)}</td>
      <td style="text-align:right">${totals.closing_cbm.toFixed(3)}</td>
    </tr>
  </tbody>
</table>

<div class="sign">
  <div>Place: Krishnagiri, Tamil Nadu</div>
  <div>Signature of Lessee / Authorised Person<br/><br/>Name: ____________________<br/>Designation: ______________</div>
</div>
<div class="note">
  Note: CBM = Cubic Metres. This return is submitted under Rule 45 of MCDR 2017. Figures represent net mineral extracted, dispatched under valid royalty challans, and closing stock for the period ${monthName}. Dispatch figures include all sales orders invoiced during the period.
</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { notify('Pop-up blocked — allow pop-ups and retry', 'error'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const renderTable = (items: typeof complianceItems) => (
    <div className="tw">
      <table className="dt">
        <thead><tr><th>ID</th><th>Category</th><th>Compliance Item</th><th>Authority</th><th>Due / Frequency</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map(c => (
            <tr key={c.id}>
              <td className="tdm tdc">{c.id}</td>
              <td><span className={`bdg ${c.category === 'DGMS' ? 'b-r' : c.category === 'IBM' ? 'b-b' : c.category === 'TNPCB' ? 'b-g' : c.category === 'PESO' ? 'b-a' : 'b-d'}`}>{c.category}</span></td>
              <td style={{ maxWidth: 260 }}>{c.item}</td>
              <td style={{ fontSize: 10 }}>{c.authority}</td>
              <td className="tdm">{c.due}</td>
              <td>
                <select className="fsel" style={{ fontSize: 9, padding: '2px 4px', width: 100 }} value={c.status} onChange={e => handleStatusChange(c.id, e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-xs btn-s" onClick={() => openEdit(c)}>Edit</button>
                  <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDelete(c.id)}>Del</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Compliance Register</div>
          <div className="ph-sub">M15–M19 — DGMS · IBM/MCDR · TNPCB · PESO · Labour · EC · Lease conditions</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-s" onClick={() => { setShowFormH(true); loadFormH(); }}>⬇ Form-H (IBM)</button>
          <button className="btn btn-p" onClick={openAdd}>+ Add Item</button>
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc g"><div className="sc-lbl">Compliance Score</div><div className="sc-val">{score}%</div><div className="sc-sub">Overall</div></div>
        <div className="sc s"><div className="sc-lbl">Compliant</div><div className="sc-val">{complianceItems.filter(c => c.status === 'compliant').length}</div><div className="sc-sub">of {complianceItems.length} items</div></div>
        <div className="sc r"><div className="sc-lbl">Pending Action</div><div className="sc-val">{complianceItems.filter(c => c.status === 'pending').length}</div><div className="sc-sub">Action required</div></div>
        <div className="sc b"><div className="sc-lbl">Not Due Yet</div><div className="sc-val">{complianceItems.filter(c => c.status === 'not_due').length}</div><div className="sc-sub">Future compliance</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'dashboard' ? ' on' : ''}`} onClick={() => setTab('dashboard')}>All Items</button>
        <button className={`itab${tab === 'dgms' ? ' on' : ''}`} onClick={() => setTab('dgms')}>DGMS</button>
        <button className={`itab${tab === 'ibm' ? ' on' : ''}`} onClick={() => setTab('ibm')}>IBM / MCDR</button>
        <button className={`itab${tab === 'tnpcb' ? ' on' : ''}`} onClick={() => setTab('tnpcb')}>TNPCB / EC</button>
        <button className={`itab${tab === 'labour' ? ' on' : ''}`} onClick={() => setTab('labour')}>Labour / PESO</button>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">
          {tab === 'dashboard' ? `All Compliance Items — ${complianceItems.length} records` : tab.toUpperCase() + ' Compliance'}
        </div></div>
        {tab === 'dashboard' && renderTable(complianceItems)}
        {tab === 'dgms' && renderTable(byCategory('DGMS'))}
        {tab === 'ibm' && renderTable(byCategory('IBM'))}
        {tab === 'tnpcb' && renderTable(byCategory('TNPCB'))}
        {tab === 'labour' && renderTable([...byCategory('PESO'), ...byCategory('Labour')])}
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Regulatory Reference — Key Acts & Rules</div></div>
        <div className="card-body">
          <div className="fg3">
            {[
              ['TNMMCR 1959', 'Tamil Nadu Minor Mineral Concession Rules — governs lease, royalty, seigniorage for granite'],
              ['MCDR 2017', 'Mines & Minerals (Conservation & Development) Rules — IBM Form-H, Form-F1, Plan approval'],
              ['DGMS (Metalliferous Mines)', 'Metalliferous Mines Regulations 1961 — blasting, safety, accident reporting'],
              ['PESO — Explosives Act', 'Explosive Rules 2008 — magazine licence, procurement, stock, quarterly return'],
              ['TNPCB — EC', 'Environment (Protection) Act 1986 — Consent to Operate (Air & Water), dust monitoring'],
              ['CLRA 1970', 'Contract Labour (Regulation & Abolition) Act — principal employer registration, contractor licence'],
              ['EPF & MP Act 1952', 'Employees Provident Fund — ECR, Form-12A, annual return'],
              ['ESI Act 1948', 'Employees State Insurance — half-yearly return, Form-12'],
            ].map(([k, v]) => (
              <div key={k as string} style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 11, color: 'var(--t2)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showFormH && (
        <div className="modal-backdrop" onClick={() => setShowFormH(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Form-H — Monthly Mineral Return (IBM)</div>
              <button className="modal-close" onClick={() => setShowFormH(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 12 }}>
                Rule 45, MCDR 2017 — submitted monthly to Indian Bureau of Mines, Bengaluru by the 15th of the following month.
              </div>
              <div className="fg">
                <label className="fl">Reporting Month</label>
                <input
                  type="month"
                  className="fi"
                  value={formHMonth}
                  onChange={e => setFormHMonth(e.target.value)}
                />
              </div>
              {formHData && (
                <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--bg2)', borderRadius: 4, fontSize: 10 }}>
                  {Object.values(formHData.quarries || []).map((q: any) => (
                    <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: 'var(--t1)' }}>{q.quarry_name}</span>
                      <span style={{ color: 'var(--t3)', fontFamily: 'monospace' }}>
                        {/* computed inline for preview */}
                        {(() => {
                          const extracted = (Array.isArray(formHData.prod) ? formHData.prod : [])
                            .filter((p: any) => p.quarry_id === q.id)
                            .reduce((s: number, p: any) => s + Number(p.net_cbm || 0), 0);
                          const dispatched = (Array.isArray(formHData.sales) ? formHData.sales : [])
                            .filter((s: any) => s.quarry_id === q.id)
                            .reduce((s: number, sale: any) => s + Number(sale.total_cbm || 0), 0);
                          return `${extracted.toFixed(2)} CBM extracted · ${dispatched.toFixed(2)} dispatched`;
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {formHLoading && <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 10, marginTop: 8 }}>Loading data…</div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => { setFormHData(null); loadFormH(); }}>↻ Reload</button>
              <button className="btn btn-s" onClick={() => setShowFormH(false)}>Cancel</button>
              <button className="btn btn-p" onClick={printFormH} disabled={!formHData || formHLoading}>
                🖨 Print / Download Form-H
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{editId !== null ? 'Edit Compliance Item' : 'Add Compliance Item'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Category</label><select className="fsel" value={form.category} onChange={f('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="fg"><label className="fl">Status</label><select className="fsel" value={form.status} onChange={f('status')}>{STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
              </div>
              <div className="fg"><label className="fl">Compliance Item *</label><input className="fi" value={form.item} onChange={f('item')} placeholder="Form-H Monthly Return, DGMS Blasting Record…" /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">Authority *</label><input className="fi" value={form.authority} onChange={f('authority')} placeholder="IBM Bengaluru, DGMS TN…" /></div>
                <div className="fg"><label className="fl">Frequency</label><select className="fsel" value={form.frequency} onChange={f('frequency')}>{FREQUENCIES.map(freq => <option key={freq}>{freq}</option>)}</select></div>
              </div>
              <div className="fg"><label className="fl">Due Date / Period</label><input className="fi" value={form.due} onChange={f('due')} placeholder="15 Jun 2026 / Annual / On-event" /></div>
              <div className="fg"><label className="fl">Remarks</label><input className="fi" value={form.remarks} onChange={f('remarks')} placeholder="Notes, document ref…" /></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editId !== null ? 'Update Item' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
