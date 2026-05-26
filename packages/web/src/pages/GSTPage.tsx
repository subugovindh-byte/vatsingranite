import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const INV_TYPES = ['B2B', 'B2B (IGST)', 'B2C', 'Export (LUT)', 'Credit Note'];
const BLANK = { inv: '', date: new Date().toISOString().slice(0, 10), party: '', gstin: '', hsn: '2516', type: 'B2B', taxable: '', gst_rate: '5', igst_flag: false };

export default function GSTPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'gstr1' | 'gstr3b' | 'itc' | 'tds'>('gstr1');
  const [showModal, setShowModal] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<any>(BLANK);
  const [loading, setLoading] = useState(true);

  const [gstr1Data, setGstr1Data] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      (apiClient as any).getInvoices({ limit: 200 }),
      apiClient.getCustomers(),
    ]).then(([invResp, custResp]: any) => {
      const invoices = invResp.invoices ?? [];
      const custs = custResp.customers ?? [];
      // Map invoices to GSTR-1 format
      const mapped = invoices.map((inv: any, i: number) => {
        const cust = custs.find((c: any) => c.id === inv.customer_id) ?? {};
        const isIGST = Number(inv.igst_amount || 0) > 0;
        return {
          id: inv.id ?? i + 1,
          inv: inv.invoice_no ?? '—',
          date: inv.invoice_date ?? '—',
          party: inv.customer_name ?? cust.customer_name ?? '—',
          gstin: inv.gstin_of_buyer ?? cust.gstin ?? '—',
          hsn: '2516',
          taxable: Number(inv.taxable_value ?? 0),
          cgst: Number(inv.cgst_amount ?? 0),
          sgst: Number(inv.sgst_amount ?? 0),
          igst: Number(inv.igst_amount ?? 0),
          total: Number(inv.invoice_value ?? 0),
          type: inv.invoice_type === 'export' ? 'Export (LUT)' : isIGST ? 'B2B (IGST)' : 'B2B',
        };
      });
      setGstr1Data(mapped);
    }).catch(() => notify('Failed to load GST data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const nextId = () => Math.max(...gstr1Data.map(g => g.id), 0) + 1;

  const calcGST = (taxable: number, rate: number, isIGST: boolean) => {
    const tax = Math.round(taxable * rate / 100);
    if (isIGST) return { cgst: 0, sgst: 0, igst: tax, total: taxable + tax };
    return { cgst: Math.round(tax / 2), sgst: Math.round(tax / 2), igst: 0, total: taxable + tax };
  };

  const openAdd = () => { setForm(BLANK); setEditIdx(null); setShowModal(true); };
  const openEdit = (g: any) => {
    setForm({ ...g, taxable: String(g.taxable), gst_rate: '5', igst_flag: g.igst > 0 });
    setEditIdx(g.id);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.inv || !form.party) { notify('Invoice No. and party are required', 'error'); return; }
    const taxable = Number(form.taxable) || 0;
    const rate = Number(form.gst_rate) || 5;
    const isIGST = form.igst_flag || form.type === 'B2B (IGST)' || form.type === 'Export (LUT)';
    const gst = calcGST(taxable, rate, isIGST);
    const rec = { ...form, taxable, ...gst };
    if (editIdx !== null) {
      setGstr1Data(prev => prev.map(g => g.id === editIdx ? { ...g, ...rec } : g));
      notify('GSTR-1 entry updated');
    } else {
      setGstr1Data(prev => [...prev, { ...rec, id: nextId() }]);
      notify('Invoice added to GSTR-1');
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => { setGstr1Data(prev => prev.filter(g => g.id !== id)); notify('Entry removed'); };
  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const totalTaxable = gstr1Data.reduce((s, g) => s + g.taxable, 0);
  const totalCGST = gstr1Data.reduce((s, g) => s + g.cgst, 0);
  const totalSGST = gstr1Data.reduce((s, g) => s + g.sgst, 0);
  const totalIGST = gstr1Data.reduce((s, g) => s + g.igst, 0);
  const totalGST = totalCGST + totalSGST + totalIGST;
  const itcAvail = 0;
  const netGST = Math.max(0, totalGST - itcAvail);

  const today = new Date();
  const monthName = today.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">GST & Tax</div>
          <div className="ph-sub">M12 — GSTR-1 · GSTR-3B · ITC ledger · TDS 194C · e-Invoice IRN · HSN 2516</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-s" onClick={() => notify('Download GSTR-2B from GST portal', 'warn')}>GSTR-2B</button>
          {tab === 'gstr1' && <button className="btn btn-p" onClick={openAdd}>+ Add Invoice</button>}
          {tab !== 'gstr1' && <button className="btn btn-p" onClick={() => notify('File on GST portal — gstin.gov.in', 'warn')}>File GSTR-1</button>}
        </div>
      </div>

      <div className="sc-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="sc r"><div className="sc-lbl">CGST Payable</div><div className="sc-val">₹{totalCGST.toLocaleString()}</div><div className="sc-sub">{monthName}</div></div>
        <div className="sc r"><div className="sc-lbl">SGST Payable</div><div className="sc-val">₹{totalSGST.toLocaleString()}</div><div className="sc-sub">{monthName}</div></div>
        <div className="sc r"><div className="sc-lbl">IGST Payable</div><div className="sc-val">₹{totalIGST.toLocaleString()}</div><div className="sc-sub">{monthName}</div></div>
        <div className="sc s"><div className="sc-lbl">ITC Available</div><div className="sc-val">₹{itcAvail.toLocaleString()}</div><div className="sc-sub">GSTR-2B matched</div></div>
        <div className="sc g"><div className="sc-lbl">Net GST Payable</div><div className="sc-val">₹{netGST.toLocaleString()}</div><div className="sc-sub">After ITC setoff</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'gstr1' ? ' on' : ''}`} onClick={() => setTab('gstr1')}>GSTR-1 (Outward)</button>
        <button className={`itab${tab === 'gstr3b' ? ' on' : ''}`} onClick={() => setTab('gstr3b')}>GSTR-3B Summary</button>
        <button className={`itab${tab === 'itc' ? ' on' : ''}`} onClick={() => setTab('itc')}>ITC Ledger</button>
        <button className={`itab${tab === 'tds' ? ' on' : ''}`} onClick={() => setTab('tds')}>TDS Register</button>
      </div>

      {tab === 'gstr1' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">GSTR-1 — {monthName} — {gstr1Data.length} invoices</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="bdg b-a">HSN: 2516 (Granite)</span>
              <button className="btn btn-sm btn-p" onClick={() => notify('Upload JSON to GSP portal', 'warn')}>Upload to GSP</button>
            </div>
          </div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Invoice No.</th><th>Date</th><th>Party</th><th>GSTIN</th><th>HSN</th><th>Type</th><th className="r">Taxable (₹)</th><th className="r">CGST (₹)</th><th className="r">SGST (₹)</th><th className="r">IGST (₹)</th><th className="r">Total (₹)</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {gstr1Data.map(g => (
                  <tr key={g.id}>
                    <td className="tdm tdc">{g.inv}</td>
                    <td className="tdm">{g.date}</td>
                    <td>{g.party}</td>
                    <td className="tdm">{g.gstin}</td>
                    <td className="tdm">{g.hsn}</td>
                    <td><span className="bdg b-g">{g.type}</span></td>
                    <td className="tda">₹{g.taxable.toLocaleString()}</td>
                    <td className="tda">{g.cgst > 0 ? `₹${g.cgst.toLocaleString()}` : '--'}</td>
                    <td className="tda">{g.sgst > 0 ? `₹${g.sgst.toLocaleString()}` : '--'}</td>
                    <td className="tda">{g.igst > 0 ? `₹${g.igst.toLocaleString()}` : '--'}</td>
                    <td className="tda" style={{ color: 'var(--sage)' }}>₹{g.total.toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEdit(g)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDelete(g.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {gstr1Data.length > 0 && (
                  <tr style={{ background: 'var(--bg3)', fontWeight: 700 }}>
                    <td colSpan={6} className="tdm" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 8 }}>Total</td>
                    <td className="tda tdc">₹{totalTaxable.toLocaleString()}</td>
                    <td className="tda tdc">₹{totalCGST.toLocaleString()}</td>
                    <td className="tda tdc">₹{totalSGST.toLocaleString()}</td>
                    <td className="tda tdc">₹{totalIGST.toLocaleString()}</td>
                    <td className="tda" style={{ color: 'var(--sage)' }}>₹{gstr1Data.reduce((s, g) => s + g.total, 0).toLocaleString()}</td>
                    <td></td>
                  </tr>
                )}
                {gstr1Data.length === 0 && (
                  <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No invoices found — add invoices from the Sales → Invoices module</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'gstr3b' && (
        <div className="card">
          <div className="card-head"><div className="card-title">GSTR-3B — {monthName}</div></div>
          <div className="card-body">
            {[
              ['3.1 Outward Taxable Supplies', `₹${totalTaxable.toLocaleString()}`, 'Intra + Inter-state'],
              ['3.1 Outward — CGST', `₹${totalCGST.toLocaleString()}`, '5% on intra-state'],
              ['3.1 Outward — SGST', `₹${totalSGST.toLocaleString()}`, '5% on intra-state'],
              ['3.1 Outward — IGST', `₹${totalIGST.toLocaleString()}`, '5% on inter-state'],
              ['4 ITC Available (GSTR-2B)', `₹${itcAvail.toLocaleString()}`, 'Input tax credit'],
              ['6 Net Tax Payable', `₹${netGST.toLocaleString()}`, 'After ITC setoff'],
            ].map(([label, value, note]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--t1)' }}>{label}</div>
                  <div style={{ fontSize: 9, color: 'var(--t3)' }}>{note}</div>
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: 'var(--t1)', fontWeight: 600 }}>{value}</div>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-p" onClick={() => notify('File GSTR-3B on GST portal — gstin.gov.in', 'warn')}>File GSTR-3B on Portal</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'itc' && (
        <div className="card">
          <div className="card-head"><div className="card-title">ITC Ledger — Input Tax Credit</div></div>
          <div className="card-body">
            <div className="empty-state" style={{ padding: 32, color: 'var(--t3)', textAlign: 'center' }}>
              ITC ledger — auto-populated from purchase vouchers and GSTR-2B reconciliation.<br/>
              Add purchase invoices in the Accounts → Vouchers module to track ITC.
            </div>
          </div>
        </div>
      )}

      {tab === 'tds' && (
        <div className="card">
          <div className="card-head"><div className="card-title">TDS Register — Sec 194C / 194J</div></div>
          <div className="card-body">
            <div className="empty-state" style={{ padding: 32, color: 'var(--t3)', textAlign: 'center' }}>
              TDS deductions are tracked from payroll (Salary TDS) and purchase vouchers (194C/194J).<br/>
              View payroll TDS in the People → Payroll module.
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-head">
              <div className="modal-title">{editIdx !== null ? 'Edit GSTR-1 Entry' : 'Add Invoice to GSTR-1'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Invoice No. *</label><input className="fi" value={form.inv} onChange={f('inv')} placeholder="VAT/INV/2526/001" /></div>
                <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={form.date} onChange={f('date')} /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Party Name *</label><input className="fi" value={form.party} onChange={f('party')} placeholder="Customer name" /></div>
                <div className="fg"><label className="fl">Type</label><select className="fsel" value={form.type} onChange={f('type')}>{INV_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">GSTIN</label><input className="fi" value={form.gstin} onChange={f('gstin')} placeholder="33ABCDE1234F1Z1" /></div>
                <div className="fg"><label className="fl">HSN Code</label><input className="fi" value={form.hsn} onChange={f('hsn')} placeholder="2516" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Taxable Value (₹)</label><input className="fi" type="number" value={form.taxable} onChange={f('taxable')} placeholder="0" /></div>
                <div className="fg"><label className="fl">GST Rate (%)</label><input className="fi" type="number" value={form.gst_rate} onChange={f('gst_rate')} placeholder="5" /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editIdx !== null ? 'Update Entry' : 'Add Invoice'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
