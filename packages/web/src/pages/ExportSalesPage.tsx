import { useState } from 'react';
import { useToastStore } from '../store';
import { esc } from '../utils/escapeHtml';

const EDPMS_STATUSES = ['not_shipped', 'open', 'realised', 'overdue'];
const RODTEP_STATUSES = ['pending', 'received', 'na'];
const COUNTRIES = ['China', 'Italy', 'UAE', 'USA', 'Spain', 'Germany', 'Brazil', 'Australia', 'UK', 'Singapore'];

const BLANK_EXP = { date: new Date().toISOString().slice(0, 10), buyer: '', country: 'China', blocks: '', cbm: '', usd: '', bl_date: '', sb: '', edpms: 'not_shipped', due: '', rodtep: 'pending' };
const BLANK_BUYER = { name: '', country: 'China', contact: '', email: '', currency: 'USD', payment_terms: 'LC at sight' };

export default function ExportSalesPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'orders' | 'edpms' | 'buyers'>('orders');

  const [exports, setExports] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);

  const [showExpModal, setShowExpModal] = useState(false);
  const [expForm, setExpForm] = useState<any>(BLANK_EXP);
  const [editExpId, setEditExpId] = useState<number | null>(null);

  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [buyerForm, setBuyerForm] = useState<any>(BLANK_BUYER);
  const [editBuyerId, setEditBuyerId] = useState<number | null>(null);

  const nextExpId = () => (exports.length === 0 ? 1 : Math.max(...exports.map(e => e.id)) + 1);
  const nextExpNo = () => `EXP-${new Date().getFullYear()}-${String(nextExpId()).padStart(3, '0')}`;
  const nextBuyerId = () => (buyers.length === 0 ? 1 : Math.max(...buyers.map(b => b.id)) + 1);

  const openAddExp = () => { setExpForm(BLANK_EXP); setEditExpId(null); setShowExpModal(true); };
  const openEditExp = (e: any) => { setExpForm({ ...e, blocks: String(e.blocks), cbm: String(e.cbm), usd: String(e.usd) }); setEditExpId(e.id); setShowExpModal(true); };
  const handleSaveExp = () => {
    if (!expForm.buyer || !expForm.date) { notify('Buyer and date are required', 'error'); return; }
    const usd = Number(expForm.usd) || 0;
    const rec = { ...expForm, blocks: Number(expForm.blocks) || 0, cbm: parseFloat(expForm.cbm) || 0, usd, inr: Math.round(usd * 83.6) };
    if (editExpId !== null) {
      setExports(prev => prev.map(e => e.id === editExpId ? { ...e, ...rec } : e));
      notify('Export order updated');
    } else {
      setExports(prev => [{ ...rec, id: nextExpId(), so: nextExpNo() }, ...prev]);
      notify('Export order created');
    }
    setShowExpModal(false);
  };
  const handleDeleteExp = (id: number) => { setExports(prev => prev.filter(e => e.id !== id)); notify('Export order deleted'); };

  const openAddBuyer = () => { setBuyerForm(BLANK_BUYER); setEditBuyerId(null); setShowBuyerModal(true); };
  const openEditBuyer = (b: any) => { setBuyerForm({ ...b }); setEditBuyerId(b.id); setShowBuyerModal(true); };
  const handleSaveBuyer = () => {
    if (!buyerForm.name) { notify('Buyer name is required', 'error'); return; }
    if (editBuyerId !== null) {
      setBuyers(prev => prev.map(b => b.id === editBuyerId ? { ...b, ...buyerForm } : b));
      notify('Buyer updated');
    } else {
      setBuyers(prev => [...prev, { ...buyerForm, id: nextBuyerId() }]);
      notify('Buyer added');
    }
    setShowBuyerModal(false);
  };
  const handleDeleteBuyer = (id: number) => { setBuyers(prev => prev.filter(b => b.id !== id)); notify('Buyer deleted'); };

  const ef = (k: string) => (e: any) => setExpForm((p: any) => ({ ...p, [k]: e.target.value }));
  const bf = (k: string) => (e: any) => setBuyerForm((p: any) => ({ ...p, [k]: e.target.value }));

  const printCommercialInvoice = (exp: typeof exports[0]) => {
    const buyer = buyers.find(b => b.name === exp.buyer) || { name: exp.buyer, country: exp.country, contact: '', email: '', currency: 'USD', payment_terms: 'LC at sight' };
    const dateStr  = exp.date   ? new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const blStr    = exp.bl_date ? new Date(exp.bl_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const invNo    = `ABG/EXP/${exp.so.replace('EXP-', '').replace('-', '/')}`;
    const unitRate = exp.cbm > 0 ? (exp.usd / exp.cbm).toFixed(2) : '—';

    const html = `<!DOCTYPE html><html><head><title>Commercial Invoice — ${esc(invNo)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 9.5px; color: #111; margin: 0; }
  .outer { border: 2px solid #111; }
  .hdr { display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid #111; }
  .co-name { font-size: 16px; font-weight: 900; }
  .co-sub { font-size: 8px; color: #555; margin-top: 2px; }
  .doc-title { text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 3px;
    background: #111; color: #fff; padding: 5px; }
  .meta { display: flex; border-bottom: 1px solid #111; }
  .ml { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 1px; }
  .mv { font-size: 9.5px; font-weight: 600; margin-bottom: 5px; }
  .meta-l { flex: 1; padding: 8px 10px; border-right: 1px solid #111; }
  .meta-r { flex: 1; padding: 8px 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f2f2f2; padding: 5px 7px; font-size: 8.5px; border: 1px solid #bbb; }
  td { padding: 5px 7px; font-size: 9px; border: 1px solid #ddd; }
  .r { text-align: right; }
  .c { text-align: center; }
  .tot { display: flex; justify-content: flex-end; padding: 6px 10px; }
  .tot table { width: 260px; }
  .tot td { border: none; padding: 2px 6px; }
  .tot .grand td { font-weight: bold; font-size: 11px; border-top: 2px solid #111; }
  .bottom { display: flex; border-top: 1px solid #111; }
  .bank { flex: 1; padding: 8px 10px; border-right: 1px solid #111; font-size: 8.5px; line-height: 1.8; }
  .sign { flex: 1; padding: 8px 10px; text-align: right; font-size: 8.5px; }
  .note { padding: 5px 10px; font-size: 7.5px; color: #666; border-top: 1px solid #ddd; }
</style></head><body>
<div class="outer">

<div class="hdr">
  <div>
    <div class="co-name">AB GRANITE</div>
    <div class="co-sub">Chendrapalli · Krishnagiri District · Tamil Nadu 635 108 · India</div>
    <div class="co-sub">IEC: AABCA1234B &nbsp;|&nbsp; GSTIN: 33AABCA1234B1Z5 &nbsp;|&nbsp; AD Code: HDFC0001234</div>
    <div class="co-sub">Email: info@vatsingranite.com &nbsp;|&nbsp; Phone: +91-4362-123456</div>
  </div>
  <div style="text-align:right">
    <div class="co-sub">HS Code: 2516.12.00</div>
    <div class="co-sub">Export under LUT (Zero-rated)</div>
    <div class="co-sub">RCMC: CAPEXIL</div>
  </div>
</div>

<div class="doc-title">Commercial Invoice</div>

<div class="meta">
  <div class="meta-l">
    <div class="ml">Buyer / Consignee</div>
    <div class="mv">${esc(buyer.name)}</div>
    <div class="mv" style="font-weight:400;font-size:8.5px">${esc(buyer.country)}</div>
    ${buyer.contact ? `<div style="font-size:8px;color:#555">Attn: ${esc(buyer.contact)}</div>` : ''}
    ${buyer.email   ? `<div style="font-size:8px;color:#555">${esc(buyer.email)}</div>` : ''}
    <div style="font-size:8px;color:#555;margin-top:4px">Payment Terms: ${esc(buyer.payment_terms)}</div>
  </div>
  <div class="meta-r">
    <div style="display:flex;flex-direction:column;gap:4px">
      <div><div class="ml">Invoice No.</div><div class="mv">${esc(invNo)}</div></div>
      <div><div class="ml">Invoice Date</div><div class="mv">${dateStr}</div></div>
      <div><div class="ml">Shipping Bill</div><div class="mv">${esc(exp.sb || '—')}</div></div>
      <div><div class="ml">B/L Date</div><div class="mv">${blStr}</div></div>
      <div><div class="ml">Port of Loading</div><div class="mv">Chennai Sea Port (INMAS1)</div></div>
      <div><div class="ml">Port of Discharge</div><div class="mv">${esc(exp.country)}</div></div>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>#</th><th>Description of Goods</th><th class="c">HS Code</th>
      <th class="c">No. of Blocks</th><th class="r">CBM</th>
      <th class="r">Unit Rate (USD/CBM)</th><th class="r">Total (USD)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="c">1</td>
      <td>Rough Granite Blocks, Natural Finish — ${exp.country === 'China' ? 'Paradiso Classico / Galaxy Black' : 'Premium Granite'}<br/>
        <span style="color:#666;font-size:8px">Country of Origin: India · Export Ref: ${esc(exp.so)}</span></td>
      <td class="c">2516.12.00</td>
      <td class="c">${exp.blocks}</td>
      <td class="r">${exp.cbm.toFixed(3)}</td>
      <td class="r">USD ${unitRate}</td>
      <td class="r"><b>USD ${exp.usd.toLocaleString()}</b></td>
    </tr>
  </tbody>
</table>

<div class="tot">
  <table>
    <tr><td>FOB Value</td><td class="r">USD ${exp.usd.toLocaleString()}</td></tr>
    <tr><td style="color:#666;font-size:8px">Freight &amp; Insurance</td><td class="r" style="font-size:8px">As per Incoterms</td></tr>
    <tr class="grand"><td>TOTAL</td><td class="r">USD ${exp.usd.toLocaleString()}</td></tr>
    <tr><td colspan="2" style="font-size:8px;color:#666;border:none;padding-top:4px">INR Equivalent (@ ₹83.60): ₹${exp.inr.toLocaleString()}</td></tr>
  </table>
</div>

<div class="bottom">
  <div class="bank">
    <b>Beneficiary Bank Details</b><br/>
    Bank: HDFC Bank, Krishnagiri Branch<br/>
    A/C No.: XXXX-XXXX-1234 &nbsp;|&nbsp; IFSC: HDFC0001234<br/>
    SWIFT Code: HDFCINBBXXX<br/>
    Account Name: Vatsin Granite Quarry
  </div>
  <div class="sign">
    For <b>AB GRANITE</b><br/><br/><br/>
    ____________________________<br/>
    Authorised Signatory
  </div>
</div>

<div class="note">
  We certify that this invoice is true and correct and that the goods described above have originated in India.
  Export under Letter of Undertaking (LUT) — GST zero-rated. Subject to Krishnagiri jurisdiction.
</div>

</div>
<script>window.print(); window.close();<\/script>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=750');
    if (!win) { notify('Pop-up blocked — allow pop-ups and retry', 'error'); return; }
    win.document.write(html);
    win.document.close();
  };

  const printPackingList = (exp: typeof exports[0]) => {
    const dateStr = exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const avgCbm  = exp.blocks > 0 ? (exp.cbm / exp.blocks).toFixed(3) : '—';

    const html = `<!DOCTYPE html><html><head><title>Packing List — ${esc(exp.so)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 9px; color: #111; margin: 0; }
  .outer { border: 2px solid #111; }
  .hdr { padding: 8px 10px; border-bottom: 1px solid #111; display: flex; justify-content: space-between; }
  .co-name { font-size: 15px; font-weight: 900; }
  .co-sub { font-size: 8px; color: #555; margin-top: 1px; }
  .doc-title { text-align: center; font-size: 12px; font-weight: 800; letter-spacing: 3px; background: #111; color: #fff; padding: 5px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f2f2f2; padding: 5px 7px; font-size: 8px; border: 1px solid #bbb; }
  td { padding: 4px 7px; font-size: 8.5px; border: 1px solid #ddd; }
  .r { text-align: right; }
  .c { text-align: center; }
  .summary { display: flex; gap: 0; border-top: 1px solid #111; }
  .sum-box { flex: 1; padding: 8px 10px; border-right: 1px solid #111; }
  .sum-box:last-child { border-right: none; }
  .sum-lbl { font-size: 7.5px; color: #666; text-transform: uppercase; letter-spacing: .5px; }
  .sum-val { font-size: 14px; font-weight: 700; margin-top: 2px; }
</style></head><body>
<div class="outer">
<div class="hdr">
  <div>
    <div class="co-name">AB GRANITE</div>
    <div class="co-sub">Chendrapalli · Krishnagiri District · Tamil Nadu · India</div>
    <div class="co-sub">IEC: AABCA1234B</div>
  </div>
  <div style="text-align:right;font-size:9px">
    <b>Ref:</b> ${esc(exp.so)} &nbsp;|&nbsp; <b>Date:</b> ${dateStr}<br/>
    <b>Buyer:</b> ${esc(exp.buyer)}<br/>
    <b>Destination:</b> ${esc(exp.country)}
  </div>
</div>
<div class="doc-title">Packing List</div>
<table>
  <thead>
    <tr>
      <th class="c">Sl.</th><th>Block No.</th><th class="c">Colour / Type</th>
      <th class="r">L (mm)</th><th class="r">W (mm)</th><th class="r">H (mm)</th>
      <th class="r">Vol (CBM)</th><th class="r">Gross Wt (kg)</th>
    </tr>
  </thead>
  <tbody>
    ${Array.from({ length: exp.blocks }, (_, i) => {
      const l = 2200 + Math.round(Math.random() * 800);
      const w = 1400 + Math.round(Math.random() * 400);
      const h = 800  + Math.round(Math.random() * 300);
      const vol = (l * w * h / 1e9).toFixed(3);
      const kg  = Math.round(Number(vol) * 2700).toLocaleString();
      return `<tr>
        <td class="c">${i + 1}</td>
        <td>ABG/2026/${String(20 + i).padStart(5, '0')}</td>
        <td class="c">Paradiso</td>
        <td class="r">${l}</td><td class="r">${w}</td><td class="r">${h}</td>
        <td class="r">${vol}</td><td class="r">${kg}</td>
      </tr>`;
    }).join('')}
  </tbody>
  <tfoot>
    <tr style="font-weight:700;background:#f9f9f9">
      <td colspan="6" class="r"><b>TOTAL</b></td>
      <td class="r">${exp.cbm.toFixed(3)}</td>
      <td class="r">${Math.round(exp.cbm * 2700).toLocaleString()}</td>
    </tr>
  </tfoot>
</table>
<div class="summary">
  <div class="sum-box"><div class="sum-lbl">Total Blocks</div><div class="sum-val">${exp.blocks}</div></div>
  <div class="sum-box"><div class="sum-lbl">Total CBM</div><div class="sum-val">${exp.cbm.toFixed(3)}</div></div>
  <div class="sum-box"><div class="sum-lbl">Gross Weight</div><div class="sum-val">${Math.round(exp.cbm * 2700).toLocaleString()} kg</div></div>
  <div class="sum-box"><div class="sum-lbl">Avg CBM/Block</div><div class="sum-val">${avgCbm}</div></div>
  <div class="sum-box" style="text-align:right">For <b>AB GRANITE</b><br/><br/>___________<br/>Auth. Sign.</div>
</div>
</div>
<script>window.print(); window.close();<\/script>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { notify('Pop-up blocked — allow pop-ups and retry', 'error'); return; }
    win.document.write(html);
    win.document.close();
  };

  const realised = exports.filter(e => e.edpms === 'realised');
  const open = exports.filter(e => e.edpms === 'open');
  const pendingRodtep = exports.filter(e => e.rodtep === 'pending');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Export Sales — Paradiso</div>
          <div className="ph-sub">M8 — Export SO · Packing list · Stuffing report · EDPMS · RoDTEP · LUT</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-s" onClick={() => notify('LUT valid till 31 Mar 2027', 'warn')}>LUT Status</button>
          {tab === 'orders' && <button className="btn btn-p" onClick={openAddExp}>+ Export Order</button>}
          {tab === 'buyers' && <button className="btn btn-p" onClick={openAddBuyer}>+ Add Buyer</button>}
        </div>
      </div>

      <div className="sc-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="sc r"><div className="sc-lbl">Active Shipments</div><div className="sc-val">{open.length + exports.filter(e => e.edpms === 'not_shipped').length}</div><div className="sc-sub">In progress</div></div>
        <div className="sc g"><div className="sc-lbl">USD Realised (YTD)</div><div className="sc-val">${realised.reduce((s, e) => s + e.usd, 0).toLocaleString()}</div><div className="sc-sub">FY 2025-26</div></div>
        <div className="sc s"><div className="sc-lbl">EDPMS Open</div><div className="sc-val">{open.length}</div><div className="sc-sub">Within 9-month</div></div>
        <div className="sc b"><div className="sc-lbl">RoDTEP Pending</div><div className="sc-val">{pendingRodtep.length}</div><div className="sc-sub">Scrip to receive</div></div>
        <div className="sc a"><div className="sc-lbl">LUT Valid Till</div><div className="sc-val">31 Mar 27</div><div className="sc-sub">Zero-rated export</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'orders' ? ' on' : ''}`} onClick={() => setTab('orders')}>Export Orders</button>
        <button className={`itab${tab === 'edpms' ? ' on' : ''}`} onClick={() => setTab('edpms')}>EDPMS / FIRC</button>
        <button className={`itab${tab === 'buyers' ? ' on' : ''}`} onClick={() => setTab('buyers')}>Buyers</button>
      </div>

      {tab === 'orders' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Export Order Register — {exports.length} orders</div></div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>SO / Ref</th><th>Buyer</th><th>Country</th><th className="r">Blocks</th><th className="r">CBM</th><th className="r">USD</th><th className="r">INR</th><th>B/L Date</th><th>Shipping Bill</th><th>EDPMS</th><th>RoDTEP</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {exports.map(e => (
                  <tr key={e.id}>
                    <td className="tdm tdc">{e.so}</td>
                    <td className="tdc">{e.buyer}</td>
                    <td>{e.country}</td>
                    <td className="tda">{e.blocks}</td>
                    <td className="tda">{e.cbm.toFixed(1)}</td>
                    <td className="tda">${e.usd.toLocaleString()}</td>
                    <td className="tda">₹{(e.inr / 100000).toFixed(1)}L</td>
                    <td className="tdm">{e.bl_date || '--'}</td>
                    <td className="tdm">{e.sb || '--'}</td>
                    <td><span className={`bdg ${e.edpms === 'realised' ? 'b-s' : e.edpms === 'open' ? 'b-a' : 'b-d'}`}>{e.edpms}</span></td>
                    <td><span className={`bdg ${e.rodtep === 'received' ? 'b-s' : 'b-d'}`}>{e.rodtep}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-xs btn-b" onClick={() => printCommercialInvoice(e)}>🖨 Invoice</button>
                        <button className="btn btn-xs btn-b" onClick={() => printPackingList(e)}>📦 Pack List</button>
                        <button className="btn btn-xs btn-s" onClick={() => openEditExp(e)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeleteExp(e.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'edpms' && (
        <div className="card">
          <div className="card-head"><div className="card-title">EDPMS Realisation Tracker</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>SO / Ref</th><th>Buyer</th><th className="r">USD</th><th>B/L Date</th><th>Due Date</th><th>EDPMS Status</th><th>FIRC / BRC</th></tr></thead>
              <tbody>
                {exports.filter(e => e.bl_date).map(e => (
                  <tr key={e.id}>
                    <td className="tdm tdc">{e.so}</td>
                    <td>{e.buyer}</td>
                    <td className="tda">${e.usd.toLocaleString()}</td>
                    <td className="tdm">{e.bl_date || '--'}</td>
                    <td className="tdm">{e.due || '--'}</td>
                    <td><span className={`bdg ${e.edpms === 'realised' ? 'b-s' : e.edpms === 'open' ? 'b-a' : 'b-d'}`}>{e.edpms}</span></td>
                    <td>{e.edpms === 'realised' ? <span className="bdg b-s">FIRC RECEIVED</span> : <span className="bdg b-d">PENDING</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'buyers' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Overseas Buyer Master — {buyers.length} buyers</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Buyer Name</th><th>Country</th><th>Contact</th><th>Email</th><th>Currency</th><th>Payment Terms</th><th>Actions</th></tr></thead>
              <tbody>
                {buyers.map(b => (
                  <tr key={b.id}>
                    <td className="tdc">{b.name}</td>
                    <td>{b.country}</td>
                    <td>{b.contact}</td>
                    <td className="tdm">{b.email}</td>
                    <td>{b.currency}</td>
                    <td>{b.payment_terms}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEditBuyer(b)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeleteBuyer(b.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showExpModal && (
        <div className="modal-backdrop" onClick={() => setShowExpModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-head">
              <div className="modal-title">{editExpId !== null ? 'Edit Export Order' : 'New Export Order'}</div>
              <button className="modal-close" onClick={() => setShowExpModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Buyer *</label><input className="fi" value={expForm.buyer} onChange={ef('buyer')} placeholder="Xiamen Stone Co., Ltd." /></div>
                <div className="fg"><label className="fl">Country</label><select className="fsel" value={expForm.country} onChange={ef('country')}>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Order Date *</label><input className="fi" type="date" value={expForm.date} onChange={ef('date')} /></div>
                <div className="fg"><label className="fl">EDPMS Status</label><select className="fsel" value={expForm.edpms} onChange={ef('edpms')}>{EDPMS_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Blocks</label><input className="fi" type="number" value={expForm.blocks} onChange={ef('blocks')} placeholder="0" /></div>
                <div className="fg"><label className="fl">CBM</label><input className="fi" type="number" step="0.1" value={expForm.cbm} onChange={ef('cbm')} placeholder="0.0" /></div>
                <div className="fg"><label className="fl">USD Value</label><input className="fi" type="number" value={expForm.usd} onChange={ef('usd')} placeholder="0" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">B/L Date</label><input className="fi" type="date" value={expForm.bl_date} onChange={ef('bl_date')} /></div>
                <div className="fg"><label className="fl">Shipping Bill No.</label><input className="fi" value={expForm.sb} onChange={ef('sb')} placeholder="SB/XXXX/2026" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">EDPMS Due Date</label><input className="fi" type="date" value={expForm.due} onChange={ef('due')} /></div>
                <div className="fg"><label className="fl">RoDTEP</label><select className="fsel" value={expForm.rodtep} onChange={ef('rodtep')}>{RODTEP_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              {expForm.usd && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 4, fontSize: 10, color: 'var(--t2)' }}>
                  INR (@ ₹83.6): ₹{Math.round(Number(expForm.usd) * 83.6).toLocaleString()}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowExpModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveExp}>{editExpId !== null ? 'Update Order' : 'Create Order'}</button>
            </div>
          </div>
        </div>
      )}

      {showBuyerModal && (
        <div className="modal-backdrop" onClick={() => setShowBuyerModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{editBuyerId !== null ? 'Edit Buyer' : 'Add Buyer'}</div>
              <button className="modal-close" onClick={() => setShowBuyerModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg"><label className="fl">Buyer Name *</label><input className="fi" value={buyerForm.name} onChange={bf('name')} placeholder="Xiamen Stone Co., Ltd." /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">Country</label><select className="fsel" value={buyerForm.country} onChange={bf('country')}>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="fg"><label className="fl">Currency</label><input className="fi" value={buyerForm.currency} onChange={bf('currency')} placeholder="USD" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Contact Person</label><input className="fi" value={buyerForm.contact} onChange={bf('contact')} placeholder="Mr. Chen Wei" /></div>
                <div className="fg"><label className="fl">Email</label><input className="fi" type="email" value={buyerForm.email} onChange={bf('email')} placeholder="buyer@company.com" /></div>
              </div>
              <div className="fg"><label className="fl">Payment Terms</label><input className="fi" value={buyerForm.payment_terms} onChange={bf('payment_terms')} placeholder="LC at sight / TT 30 days" /></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowBuyerModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveBuyer}>{editBuyerId !== null ? 'Update Buyer' : 'Save Buyer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
