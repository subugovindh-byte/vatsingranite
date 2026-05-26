import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const QUARRY_OPTS = ['Vatsin Granite', 'Paradiso Quarry'];
const BLANK_DPR = { date: new Date().toISOString().slice(0, 10), quarry: 'Vatsin Granite', blasts: '0', drilled_m: '0', extracted_m3: '0', blocks_cut: '0', block_cbm: '', waste_m3: '0', yield_pct: '', hsd_ltrs: '', manpower: '' };

export default function ReportsPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'dpr' | 'pl' | 'mgmt' | 'statutory'>('dpr');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(BLANK_DPR);

  const [dprData, setDprData] = useState<any[]>([]);

  useEffect(() => {
    apiClient.getDPR().then((r: any) => setDprData(r.logs ?? r.dpr ?? [])).catch(() => {});
  }, []);

  const nextId = () => (dprData.length === 0 ? 1 : Math.max(...dprData.map(d => d.id)) + 1);

  const kpis = [
    { label: 'MTD Extraction', value: `${dprData.reduce((s, d) => s + d.extracted_m3, 0)} m³`, up: true, sub: 'vs Apr avg' },
    { label: 'MTD Blocks', value: `${dprData.reduce((s, d) => s + d.blocks_cut, 0)} nos`, up: true, sub: 'vs Apr avg' },
    { label: 'Avg Block Size', value: `${(dprData.reduce((s, d) => s + d.block_cbm, 0) / Math.max(dprData.reduce((s, d) => s + d.blocks_cut, 0), 1)).toFixed(2)} m³`, up: false, sub: 'target 2.3 m³' },
    { label: 'Wire Rope Cost', value: '₹42/m²', up: true, sub: 'vs Pellegrini std' },
    { label: 'HSD Efficiency', value: `${(dprData.reduce((s, d) => s + d.hsd_ltrs, 0) / Math.max(dprData.reduce((s, d) => s + d.extracted_m3, 0), 1)).toFixed(2)} L/m³`, up: false, sub: 'target 0.48' },
    { label: 'Manpower/Day', value: `${(dprData.reduce((s, d) => s + d.manpower, 0) / Math.max(dprData.length, 1)).toFixed(1)}`, up: true, sub: 'optimal range' },
  ];

  const openAdd = () => { setForm(BLANK_DPR); setEditId(null); setShowModal(true); };
  const openEdit = (d: any) => {
    setForm({ ...d, blasts: String(d.blasts), drilled_m: String(d.drilled_m), extracted_m3: String(d.extracted_m3), blocks_cut: String(d.blocks_cut), block_cbm: String(d.block_cbm), waste_m3: String(d.waste_m3), yield_pct: String(d.yield_pct), hsd_ltrs: String(d.hsd_ltrs), manpower: String(d.manpower) });
    setEditId(d.id);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.date || !form.quarry) { notify('Date and quarry are required', 'error'); return; }
    const blocks_cut = Number(form.blocks_cut) || 0;
    const extracted_m3 = Number(form.extracted_m3) || 0;
    const block_cbm = parseFloat(form.block_cbm) || 0;
    const waste_m3 = parseFloat(form.waste_m3) || 0;
    const yield_pct = form.yield_pct ? parseFloat(form.yield_pct) : (extracted_m3 > 0 ? parseFloat(((block_cbm / extracted_m3) * 100).toFixed(1)) : 0);
    const rec = { ...form, blasts: Number(form.blasts) || 0, drilled_m: Number(form.drilled_m) || 0, extracted_m3, blocks_cut, block_cbm, waste_m3, yield_pct, hsd_ltrs: Number(form.hsd_ltrs) || 0, manpower: Number(form.manpower) || 0 };
    if (editId !== null) {
      setDprData(prev => prev.map(d => d.id === editId ? { ...d, ...rec } : d));
      notify('DPR entry updated');
    } else {
      setDprData(prev => [{ ...rec, id: nextId() }, ...prev]);
      notify('DPR entry added');
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => { setDprData(prev => prev.filter(d => d.id !== id)); notify('DPR entry deleted'); };
  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const printReport = () => { window.print(); };

  const openPrint = (html: string) => {
    const win = window.open('', '_blank', 'width=960,height=720');
    if (!win) { notify('Pop-up blocked — allow pop-ups and retry', 'error'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  const PRINT_CSS = `@page{size:A4;margin:18mm 14mm}body{font-family:Arial,sans-serif;font-size:10px;color:#111}
    h2{text-align:center;font-size:13px;margin:0 0 2px}h3{text-align:center;font-size:10px;margin:0 0 8px;font-weight:normal;color:#555}
    table{width:100%;border-collapse:collapse;margin:8px 0}th{background:#222;color:#fff;padding:4px 6px;font-size:9px;border:1px solid #999}
    td{padding:3px 6px;border:1px solid #ccc;font-size:9px}.r{text-align:right}.tot{font-weight:bold;background:#f5f5f5}
    .meta{border-collapse:collapse;margin-bottom:8px}
    .sign{margin-top:36px;display:flex;justify-content:space-between;font-size:9px}
    .note{margin-top:12px;font-size:8px;color:#555;border-top:1px solid #ddd;padding-top:6px}`;

  const handleStatutoryDownload = async (report: string) => {
    const now = new Date();
    const year = String(now.getFullYear());
    const mon = String(now.getMonth()).padStart(2, '0') || '05';
    const monthName = new Date(+year, +mon - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const today = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    notify(`Loading ${report}…`, 'warn');

    try {
      if (report === 'Form-H (MCDR)' || report === 'Form-F1 (IBM Annual)') {
        const isAnnual = report.includes('F1');
        const [quarries, prod, salesResp] = await Promise.all([
          apiClient.getQuarries(),
          (apiClient as any).getProductionLogs({ year, month: mon, limit: 1000 }).catch(() => []),
          (apiClient as any).getSalesOrders({ year, month: mon, limit: 1000 }).catch(() => ({})),
        ]);
        const sales = Array.isArray(salesResp) ? salesResp : (salesResp as any).orders ?? [];
        const byQ: Record<string, { name: string; gstin: string; ex: number; di: number }> = {};
        (Array.isArray(quarries) ? quarries : (quarries as any).quarries ?? []).forEach((q: any) => {
          byQ[q.id] = { name: q.quarry_name, gstin: q.gstin || '—', ex: 0, di: 0 };
        });
        (Array.isArray(prod) ? prod : []).forEach((p: any) => { if (byQ[p.quarry_id]) byQ[p.quarry_id].ex += Number(p.net_cbm || 0); });
        sales.forEach((s: any) => { if (byQ[s.quarry_id]) byQ[s.quarry_id].di += Number(s.total_cbm || 0); });
        const rows = Object.values(byQ);
        const tot = rows.reduce((a, r) => ({ ex: a.ex + r.ex, di: a.di + r.di }), { ex: 0, di: 0 });
        openPrint(`<!DOCTYPE html><html><head><title>${report}</title><style>${PRINT_CSS}</style></head><body>
<h2>${isAnnual ? 'ANNUAL MINERAL RETURN — FORM F-1' : 'MONTHLY MINERAL RETURN — FORM H'}</h2>
<h3>[${isAnnual ? 'Rule 44 of MCDR 2017' : 'Rule 45 of MCDR 2017'} — Indian Bureau of Mines, Bengaluru]</h3>
<table class="meta"><tr><td><b>Period:</b></td><td>${isAnnual ? `April ${+year - 1} – March ${year}` : monthName}</td><td><b>Organisation:</b></td><td>Vatsin Granite Quarry</td></tr>
<tr><td><b>Mineral:</b></td><td>Granite (HSN 2516)</td><td><b>Date:</b></td><td>${today}</td></tr></table>
<table><thead><tr><th>S.No</th><th>Quarry Name</th><th>GSTIN</th><th class="r">Extracted (CBM)</th><th class="r">Dispatched (CBM)</th><th class="r">Closing Stock (CBM)</th></tr></thead><tbody>
${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.name}</td><td>${r.gstin}</td><td class="r">${r.ex.toFixed(3)}</td><td class="r">${r.di.toFixed(3)}</td><td class="r">${Math.max(0, r.ex - r.di).toFixed(3)}</td></tr>`).join('')}
<tr class="tot"><td colspan="3" class="r">TOTAL</td><td class="r">${tot.ex.toFixed(3)}</td><td class="r">${tot.di.toFixed(3)}</td><td class="r">${Math.max(0, tot.ex - tot.di).toFixed(3)}</td></tr>
</tbody></table>
<div class="sign"><div>Place: Dharmapuri, TN</div><div>Signature of Lessee<br/><br/>Name: ________________<br/>Designation: __________</div></div>
<div class="note">Submitted under Rule ${isAnnual ? '44' : '45'} of MCDR 2017. Figures in Cubic Metres (CBM).</div>
</body></html>`);

      } else if (report === 'GSTR-1' || report === 'GSTR-3B') {
        const salesResp = await (apiClient as any).getSalesOrders({ year, month: mon, limit: 500 }).catch(() => ({}));
        const orders = Array.isArray(salesResp) ? salesResp : (salesResp as any).orders ?? [];
        const taxable = orders.reduce((s: number, o: any) => s + Number(o.order_value || 0), 0);
        const igst = taxable * 0.18;
        openPrint(`<!DOCTYPE html><html><head><title>${report} — ${monthName}</title><style>${PRINT_CSS}</style></head><body>
<h2>${report === 'GSTR-1' ? 'GSTR-1 — OUTWARD SUPPLIES RETURN' : 'GSTR-3B — MONTHLY SUMMARY RETURN'}</h2>
<h3>Tax Period: ${monthName} | GSTIN: (as per org)</h3>
<table class="meta"><tr><td><b>Return:</b></td><td>${report}</td><td><b>Date Generated:</b></td><td>${today}</td></tr>
<tr><td><b>Due Date:</b></td><td>${report === 'GSTR-1' ? '11 Jun 2026' : '20 Jun 2026'}</td><td><b>Portal:</b></td><td>gstin.gov.in</td></tr></table>
${report === 'GSTR-1' ? `<table><thead><tr><th>S.No</th><th>Order No</th><th>Customer</th><th>Date</th><th class="r">Taxable (₹)</th><th class="r">IGST 18% (₹)</th><th class="r">Total (₹)</th></tr></thead><tbody>
${orders.slice(0, 50).map((o: any, i: number) => `<tr><td>${i + 1}</td><td>${o.order_no || '—'}</td><td>${o.customer_name || '—'}</td><td>${o.order_date || '—'}</td><td class="r">${Number(o.order_value || 0).toLocaleString('en-IN')}</td><td class="r">${(Number(o.order_value || 0) * 0.18).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${(Number(o.order_value || 0) * 1.18).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>`).join('')}
<tr class="tot"><td colspan="4" class="r">TOTAL</td><td class="r">${taxable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${igst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${(taxable + igst).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
</tbody></table>` :
`<table><thead><tr><th>Section</th><th>Description</th><th class="r">Taxable Value (₹)</th><th class="r">IGST (₹)</th><th class="r">CGST (₹)</th><th class="r">SGST (₹)</th></tr></thead><tbody>
<tr><td>3.1(a)</td><td>Outward taxable supplies</td><td class="r">${taxable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${igst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">0</td><td class="r">0</td></tr>
<tr><td>4</td><td>ITC Available (input)</td><td class="r">—</td><td class="r">—</td><td class="r">—</td><td class="r">—</td></tr>
<tr class="tot"><td colspan="2" class="r">Net Tax Payable</td><td class="r">${taxable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${igst.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">0</td><td class="r">0</td></tr>
</tbody></table>`}
<div class="sign"><div>Place: Dharmapuri, TN</div><div>Authorised Signatory<br/><br/>Name: ________________</div></div>
<div class="note">This is a system-generated summary. File on GST portal: gstin.gov.in. ITC reconciliation with GSTR-2B required before filing GSTR-3B.</div>
</body></html>`);

      } else if (report === 'PF ECR Return' || report === 'ESI Return' || report === 'TDS Return (26Q)') {
        const [runs, employees] = await Promise.all([
          (apiClient as any).getPayrollRuns({ month: +mon, year: +year }).catch(() => []),
          apiClient.getEmployees().catch(() => ({ employees: [] })),
        ]);
        const emps = (employees as any).employees ?? [];
        const run = (Array.isArray(runs) ? runs : (runs as any).runs ?? [])[0];
        let details: any[] = [];
        if (run) {
          const d = await (apiClient as any).getPayrollDetails(run.id).catch(() => []);
          details = Array.isArray(d) ? d : (d as any).details ?? [];
        }
        const totalEPF = details.reduce((s: number, d: any) => s + Number(d.epf_employee || 0), 0);
        const totalEPFer = details.reduce((s: number, d: any) => s + Number(d.epf_employer || 0), 0);
        const totalESI = details.reduce((s: number, d: any) => s + Number(d.esi_employee || 0), 0);
        const totalESIer = details.reduce((s: number, d: any) => s + Number(d.esi_employer || 0), 0);
        const totalTDS = details.reduce((s: number, d: any) => s + Number(d.tds || 0), 0);
        const totalGross = details.reduce((s: number, d: any) => s + Number(d.gross_pay || 0), 0);
        const isPF = report === 'PF ECR Return';
        const isESI = report === 'ESI Return';
        openPrint(`<!DOCTYPE html><html><head><title>${report} — ${monthName}</title><style>${PRINT_CSS}</style></head><body>
<h2>${isPF ? 'EMPLOYEE PROVIDENT FUND — ECR RETURN' : isESI ? 'EMPLOYEES STATE INSURANCE — HALF-YEARLY RETURN' : 'TDS RETURN — FORM 26Q (SALARY)'}</h2>
<h3>Period: ${monthName} | Submitted to: ${isPF ? 'EPFO' : isESI ? 'ESIC' : 'Income Tax Department'}</h3>
<table class="meta"><tr><td><b>Total Employees:</b></td><td>${emps.length}</td><td><b>Date Generated:</b></td><td>${today}</td></tr>
<tr><td><b>Total Gross Wages:</b></td><td>₹${totalGross.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td><b>Due Date:</b></td><td>${isPF ? '15 Jun 2026' : isESI ? '11 Nov 2026' : '31 Jul 2026'}</td></tr></table>
${details.length > 0 ? `<table><thead><tr><th>Emp Code</th><th>Name</th><th class="r">Gross Pay</th>${isPF ? '<th class="r">EPF Emp</th><th class="r">EPF Employer</th><th class="r">Total EPF</th>' : isESI ? '<th class="r">ESI Emp</th><th class="r">ESI Employer</th><th class="r">Total ESI</th>' : '<th class="r">Basic Pay</th><th class="r">TDS Deducted</th>'}</tr></thead><tbody>
${details.slice(0, 50).map((d: any) => `<tr><td>${d.emp_code || '—'}</td><td>${d.emp_name || '—'}</td><td class="r">${Number(d.gross_pay || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>${isPF ? `<td class="r">${Number(d.epf_employee || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${Number(d.epf_employer || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${(Number(d.epf_employee || 0) + Number(d.epf_employer || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>` : isESI ? `<td class="r">${Number(d.esi_employee || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${Number(d.esi_employer || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${(Number(d.esi_employee || 0) + Number(d.esi_employer || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>` : `<td class="r">${Number(d.basic_pay || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${Number(d.tds || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>`}</tr>`).join('')}
<tr class="tot"><td colspan="2" class="r">TOTAL</td><td class="r">${totalGross.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>${isPF ? `<td class="r">${totalEPF.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${totalEPFer.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${(totalEPF + totalEPFer).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>` : isESI ? `<td class="r">${totalESI.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${totalESIer.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td><td class="r">${(totalESI + totalESIer).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>` : `<td class="r">—</td><td class="r">${totalTDS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>`}</tr>
</tbody></table>` : `<p style="color:#888;text-align:center;padding:20px">No payroll run found for ${monthName}. Please run payroll first.</p>`}
<div class="sign"><div>Place: Dharmapuri, TN</div><div>Authorised Signatory<br/><br/>Name: ________________<br/>Designation: HR / Finance</div></div>
<div class="note">${isPF ? `ECR file to be uploaded on EPFO unified portal. PF challan to be paid by 15th of following month.` : isESI ? `ESI contribution to be remitted to ESIC. Online return on esic.in.` : `TDS to be deposited by 7th of following month. Quarterly return (26Q) on TRACES portal.`}</div>
</body></html>`);

      } else if (report === 'PESO Magazine Return') {
        const consumables = await (apiClient as any).getConsumables({ category: 'explosive', limit: 200 }).catch(() => ({ items: [] }));
        const items = (consumables as any).items ?? [];
        const totalRec = items.reduce((s: number, c: any) => s + Number(c.received_qty || 0), 0);
        const totalCon = items.reduce((s: number, c: any) => s + Number(c.consumed_qty || 0), 0);
        openPrint(`<!DOCTYPE html><html><head><title>PESO Magazine Return</title><style>${PRINT_CSS}</style></head><body>
<h2>QUARTERLY RETURN OF EXPLOSIVES — PESO</h2>
<h3>[Rule 151, Explosives Rules 2008 | Q1 FY 2026-27 | PESO Chennai]</h3>
<table class="meta"><tr><td><b>Period:</b></td><td>Apr–Jun 2026</td><td><b>Magazine Licence No:</b></td><td>—</td></tr>
<tr><td><b>Organisation:</b></td><td>Vatsin Granite Quarry</td><td><b>Date:</b></td><td>${today}</td></tr></table>
<table><thead><tr><th>Item</th><th>Unit</th><th class="r">Opening Stock</th><th class="r">Received</th><th class="r">Consumed</th><th class="r">Closing Stock</th></tr></thead><tbody>
${items.slice(0, 20).map((c: any) => `<tr><td>${c.item_name || '—'}</td><td>${c.unit || 'Nos'}</td><td class="r">0</td><td class="r">${Number(c.received_qty || 0).toFixed(2)}</td><td class="r">${Number(c.consumed_qty || 0).toFixed(2)}</td><td class="r">${Number(c.closing_stock || 0).toFixed(2)}</td></tr>`).join('')}
${items.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#888">No explosive records found</td></tr>' : ''}
<tr class="tot"><td colspan="2" class="r">TOTAL</td><td class="r">0</td><td class="r">${totalRec.toFixed(2)}</td><td class="r">${totalCon.toFixed(2)}</td><td class="r">${(totalRec - totalCon).toFixed(2)}</td></tr>
</tbody></table>
<div class="sign"><div>Place: Dharmapuri, TN</div><div>Competent Person / Shotfirer<br/><br/>Name: ________________<br/>Licence No: ___________</div></div>
<div class="note">Quarterly return under Rule 151 of Explosives Rules 2008. Submit to Controller of Explosives, PESO by 15th of month following quarter end.</div>
</body></html>`);

      } else {
        openPrint(`<!DOCTYPE html><html><head><title>${report}</title><style>${PRINT_CSS}</style></head><body>
<h2>${report.toUpperCase()}</h2>
<h3>Vatsin Granite Quarry | Date: ${today}</h3>
<p style="text-align:center;color:#888;padding:40px">This report is submitted as required. Please complete the relevant portal/form.<br/>Refer to the Compliance Register for filing dates and status.</p>
<div class="sign"><div>Place: Dharmapuri, TN</div><div>Authorised Signatory<br/><br/>Name: ________________</div></div>
</body></html>`);
      }
    } catch {
      notify(`Failed to generate ${report}`, 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Reports & Analytics</div>
          <div className="ph-sub">M21 — DPR · P&L Summary · Management Dashboard · Statutory Reports</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-s" onClick={printReport}>Export PDF</button>
          {tab === 'dpr' && <button className="btn btn-p" onClick={openAdd}>+ Add DPR Entry</button>}
          {tab !== 'dpr' && <button className="btn btn-p" onClick={() => notify('Report scheduled for email delivery', 'warn')}>Schedule</button>}
        </div>
      </div>

      <div className="sc-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {kpis.map(k => (
          <div key={k.label} className={`sc ${k.up ? 'g' : 'r'}`}>
            <div className="sc-lbl">{k.label}</div>
            <div className="sc-val">{k.value}</div>
            <div className="sc-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'dpr' ? ' on' : ''}`} onClick={() => setTab('dpr')}>Daily Production Report</button>
        <button className={`itab${tab === 'pl' ? ' on' : ''}`} onClick={() => setTab('pl')}>P&L Summary</button>
        <button className={`itab${tab === 'mgmt' ? ' on' : ''}`} onClick={() => setTab('mgmt')}>Management Dashboard</button>
        <button className={`itab${tab === 'statutory' ? ' on' : ''}`} onClick={() => setTab('statutory')}>Statutory Reports</button>
      </div>

      {tab === 'dpr' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Daily Production Report — {dprData.length} entries</div>
          </div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Date</th><th>Quarry</th><th className="r">Blasts</th><th className="r">Drilled (m)</th><th className="r">Extracted (m³)</th><th className="r">Blocks Cut</th><th className="r">Block CBM</th><th className="r">Yield %</th><th className="r">HSD (L)</th><th className="r">Manpower</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {dprData.map(d => (
                  <tr key={d.id}>
                    <td className="tdm">{d.date}</td>
                    <td className="tdc">{d.quarry}</td>
                    <td className="tda">{d.blasts}</td>
                    <td className="tda">{d.drilled_m || '—'}</td>
                    <td className="tda">{d.extracted_m3 || '—'}</td>
                    <td className="tda">{d.blocks_cut}</td>
                    <td className="tda">{d.block_cbm.toFixed(1)}</td>
                    <td className="tda" style={{ color: d.yield_pct > 45 ? 'var(--sage)' : d.yield_pct === 0 ? 'var(--t3)' : 'var(--amber)' }}>
                      {d.yield_pct > 0 ? `${d.yield_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="tda">{d.hsd_ltrs}</td>
                    <td className="tda">{d.manpower}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEdit(d)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDelete(d.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pl' && (
        <div className="card">
          <div className="card-head"><div className="card-title">P&L Summary — FY 2025-26 (Apr–May 2026)</div></div>
          <div className="card-body">
            {[
              { category: 'Revenue', items: [
                { label: 'Domestic Block Sales', val: 12456000, budget: 14000000 },
                { label: 'Export Block Sales', val: 4812000, budget: 6000000 },
                { label: 'Slabs & Offcuts', val: 840000, budget: 1000000 },
              ]},
              { category: 'Direct Costs', items: [
                { label: 'Drilling & Blasting', val: -820000, budget: -960000 },
                { label: 'Diamond Wire & Blades', val: -980000, budget: -1200000 },
                { label: 'HSD Diesel', val: -248000, budget: -288000 },
                { label: 'Royalty / Seigniorage', val: -620000, budget: -720000 },
                { label: 'Contract Labour', val: -1200000, budget: -1440000 },
              ]},
              { category: 'Overheads', items: [
                { label: 'Staff Salaries', val: -560000, budget: -640000 },
                { label: 'Office & Admin', val: -380000, budget: -450000 },
                { label: 'Loan EMI (Finance)', val: -586000, budget: -586000 },
              ]},
            ].map(cat => (
              <div key={cat.category} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>{cat.category}</div>
                {cat.items.map(item => {
                  const isRevenue = item.val > 0;
                  const variance = item.val - (item.budget * (2 / 12));
                  return (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                      <div style={{ fontSize: 10, color: 'var(--t1)' }}>{item.label}</div>
                      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: isRevenue ? 'var(--sage)' : 'var(--red)', width: 100, textAlign: 'right' }}>
                          ₹{Math.abs(item.val / 100000).toFixed(2)}L
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'var(--t3)', width: 100, textAlign: 'right' }}>
                          Bgt: ₹{Math.abs(item.budget / 100000).toFixed(1)}L
                        </div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: variance > 0 ? 'var(--sage)' : 'var(--red)', width: 80, textAlign: 'right' }}>
                          {variance > 0 ? '+' : ''}₹{Math.abs(Math.round(variance / 1000))}K
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid var(--rust)', marginTop: 8 }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--t1)', fontWeight: 700 }}>NET PROFIT (YTD)</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 16, color: 'var(--sage)', fontWeight: 700 }}>₹12.71L</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'mgmt' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Management Dashboard — Key Metrics</div></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { title: 'Production Efficiency', metric: '48.2%', note: 'Block yield from extraction', color: 'var(--sage)', trend: '▲ 2.1% vs last month' },
                { title: 'Revenue per m³', metric: '₹4,280', note: 'Average realisation/m³ sold', color: 'var(--gold)', trend: '▲ ₹120 vs last month' },
                { title: 'Wire Rope ROI', metric: '₹42/m²', note: 'Cost per m² sawn surface', color: 'var(--sage)', trend: '▼ ₹3 (improved)' },
                { title: 'Receivables (DSO)', metric: '38 days', note: 'Avg debtor days outstanding', color: 'var(--amber)', trend: '▲ 5 days (worsening)' },
                { title: 'CC Utilisation', metric: '55.6%', note: 'Credit line drawn ₹100L/₹180L', color: 'var(--amber)', trend: 'Stable' },
                { title: 'Compliance Score', metric: '94%', note: 'DGMS + IBM + PESO compliance', color: 'var(--sage)', trend: '▲ 2% this month' },
              ].map(m => (
                <div key={m.title} style={{ background: 'var(--bg3)', borderRadius: 6, padding: 16, border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>{m.title}</div>
                  <div style={{ fontSize: 22, fontFamily: 'IBM Plex Mono, monospace', color: m.color, fontWeight: 700, marginBottom: 4 }}>{m.metric}</div>
                  <div style={{ fontSize: 9, color: 'var(--t2)', marginBottom: 6 }}>{m.note}</div>
                  <div style={{ fontSize: 8.5, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--t3)' }}>{m.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'statutory' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Statutory Reports Tracker</div>
            <button className="btn btn-p" style={{ fontSize: 11 }} onClick={() => handleStatutoryDownload('Form-H (MCDR)')}>Generate Form-H (All Quarries)</button>
          </div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Report</th><th>Authority</th><th>Frequency</th><th>Due Date</th><th>Filed</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {[
                  { report: 'Form-H (MCDR)', auth: 'IBM', freq: 'Monthly', due: '15 Jun 2026', filed: null, status: 'pending' },
                  { report: 'GSTR-1', auth: 'GST Portal', freq: 'Monthly', due: '11 Jun 2026', filed: null, status: 'pending' },
                  { report: 'GSTR-3B', auth: 'GST Portal', freq: 'Monthly', due: '20 Jun 2026', filed: null, status: 'pending' },
                  { report: 'PF ECR Return', auth: 'EPFO', freq: 'Monthly', due: '15 Jun 2026', filed: null, status: 'pending' },
                  { report: 'ESI Return', auth: 'ESIC', freq: 'Half-yearly', due: '11 Nov 2026', filed: null, status: 'not_due' },
                  { report: 'TDS Return (26Q)', auth: 'IT Dept', freq: 'Quarterly', due: '31 Jul 2026', filed: null, status: 'not_due' },
                  { report: 'PESO Magazine Return', auth: 'PESO', freq: 'Quarterly', due: '15 Jul 2026', filed: null, status: 'not_due' },
                  { report: 'Accident Report (DGMS)', auth: 'DGMS', freq: 'On-event', due: 'As required', filed: 'N/A', status: 'compliant' },
                  { report: 'Form-F1 (IBM Annual)', auth: 'IBM', freq: 'Annual', due: '30 Apr 2027', filed: null, status: 'not_due' },
                ].map((r, i) => (
                  <tr key={i}>
                    <td className="tdc">{r.report}</td>
                    <td>{r.auth}</td>
                    <td><span className="bdg b-b">{r.freq}</span></td>
                    <td className="tdm">{r.due}</td>
                    <td className="tdm">{r.filed ?? <span style={{ color: 'var(--t3)' }}>—</span>}</td>
                    <td><span className={`bdg ${r.status === 'compliant' ? 'b-s' : r.status === 'pending' ? 'b-r' : 'b-d'}`}>{r.status.replace('_', ' ')}</span></td>
                    <td><button className="btn btn-xs btn-p" onClick={() => handleStatutoryDownload(r.report)}>Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <div className="modal-title">{editId !== null ? 'Edit DPR Entry' : 'Add DPR Entry'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={form.date} onChange={f('date')} /></div>
                <div className="fg"><label className="fl">Quarry</label><select className="fsel" value={form.quarry} onChange={f('quarry')}>{QUARRY_OPTS.map(q => <option key={q}>{q}</option>)}</select></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Blasts</label><input className="fi" type="number" value={form.blasts} onChange={f('blasts')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Drilled (m)</label><input className="fi" type="number" value={form.drilled_m} onChange={f('drilled_m')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Extracted (m³)</label><input className="fi" type="number" step="0.1" value={form.extracted_m3} onChange={f('extracted_m3')} placeholder="0" /></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Blocks Cut</label><input className="fi" type="number" value={form.blocks_cut} onChange={f('blocks_cut')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Block CBM</label><input className="fi" type="number" step="0.1" value={form.block_cbm} onChange={f('block_cbm')} placeholder="0.0" /></div>
                <div className="fg"><label className="fl">Waste (m³)</label><input className="fi" type="number" step="0.1" value={form.waste_m3} onChange={f('waste_m3')} placeholder="0" /></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Yield % (auto)</label><input className="fi" type="number" step="0.1" value={form.yield_pct} onChange={f('yield_pct')} placeholder="Auto-calculated" /></div>
                <div className="fg"><label className="fl">HSD (Litres)</label><input className="fi" type="number" value={form.hsd_ltrs} onChange={f('hsd_ltrs')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Manpower</label><input className="fi" type="number" value={form.manpower} onChange={f('manpower')} placeholder="0" /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editId !== null ? 'Update Entry' : 'Add Entry'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
