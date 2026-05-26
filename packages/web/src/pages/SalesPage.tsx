import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';
import { esc } from '../utils/escapeHtml';

const BLANK_SO = { customerId: '', orderDate: new Date().toISOString().slice(0, 10), quarryId: '', cbm: '', ratePerCbm: '', gstRate: '5', notes: '' };

export default function SalesPage() {
  const { notify } = useToastStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'orders' | 'customers'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSOModal, setShowSOModal] = useState(false);
  const [soForm, setSOForm] = useState<any>(BLANK_SO);

  useEffect(() => {
    Promise.all([apiClient.getSalesOrders(), apiClient.getCustomers(), apiClient.getQuarries()])
      .then(([o, c, q]: any) => {
        setOrders(o.orders ?? []);
        setCustomers(c.customers ?? []);
        setQuarries(q.quarries ?? q);
      })
      .catch(() => notify('Failed to load sales data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    apiClient.getSalesOrders()
      .then((o: any) => setOrders(o.orders ?? []))
      .catch(() => notify('Failed to reload', 'error'));
  };

  const openAddSO = () => {
    setSOForm({ ...BLANK_SO, quarryId: quarries[0]?.id || '', customerId: customers[0]?.id || '' });
    setShowSOModal(true);
  };

  const handleSaveSO = async () => {
    if (!soForm.customerId || !soForm.quarryId) { notify('Customer and quarry are required', 'error'); return; }
    const cbm = parseFloat(soForm.cbm) || 0;
    const rate = parseFloat(soForm.ratePerCbm) || 0;
    if (cbm <= 0 || rate <= 0) { notify('CBM and rate are required', 'error'); return; }
    try {
      await apiClient.createSalesOrder({
        quarryId: Number(soForm.quarryId),
        customerId: Number(soForm.customerId),
        orderDate: soForm.orderDate,
        notes: soForm.notes,
        lines: [{ quantityCbm: cbm, ratePerCbm: rate, gstRate: Number(soForm.gstRate) || 5 }]
      });
      notify('Sales order created');
      setShowSOModal(false);
      reload();
    } catch {
      notify('Failed to create sales order', 'error');
    }
  };

  const raiseInvoice = async (o: any) => {
    try {
      await apiClient.patchSalesOrderStatus(o.id, 'completed');
      notify(`SO ${o.order_no} — navigate to Invoices to create Tax Invoice`, 'success');
      navigate('/invoices');
    } catch {
      notify('Failed to update status', 'error');
    }
  };

  const sf = (k: string) => (e: any) => setSOForm((p: any) => ({ ...p, [k]: e.target.value }));

  const printReceipt = (o: any) => {
    const cust = customers.find((c: any) => c.id === o.customer_id) ?? {};
    const custName = cust.customer_name ?? cust.name ?? o.customer_name ?? '—';
    const custState = cust.state ?? 'Tamil Nadu';
    const custGstin = cust.gstin ?? '—';
    const custDays = cust.credit_days ?? cust.days ?? 30;
    const isInterState = custState.toLowerCase() !== 'tamil nadu';
    const taxableValue = Number(o.order_value ?? 0);
    const gstRate = Number(o.gst_rate ?? 5);
    const gstAmt = Math.round(taxableValue * gstRate / 100);
    const cgst = isInterState ? 0 : gstAmt / 2;
    const sgst = isInterState ? 0 : gstAmt / 2;
    const igst = isInterState ? gstAmt : 0;
    const total = taxableValue + gstAmt;
    const totalCbm = Number(o.total_cbm ?? 0);
    const ratePerCbm = totalCbm > 0 ? Math.round(taxableValue / totalCbm) : 0;
    const dateStr = new Date(o.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const html = `<!DOCTYPE html><html><head><title>Sale Receipt — ${esc(o.order_no)}</title>
<style>
  @page { size: A4; margin: 15mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; margin: 0; }
  .hdr { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 8px; }
  .hdr h1 { font-size: 15px; margin: 0 0 2px; letter-spacing: 1px; }
  .hdr p { margin: 1px 0; font-size: 9px; color: #444; }
  .doc-title { text-align: center; font-size: 12px; font-weight: bold; letter-spacing: 2px;
    border: 1px solid #111; padding: 4px; margin: 8px 0; text-transform: uppercase; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .meta-box { border: 1px solid #ccc; padding: 6px 8px; width: 48%; font-size: 9px; line-height: 1.7; }
  .meta-box strong { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #666; display: block; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { background: #111; color: #fff; padding: 5px 6px; font-size: 9px; text-align: left; }
  td { padding: 4px 6px; border-bottom: 1px solid #eee; font-size: 9px; }
  .r { text-align: right; }
  .tot-table { margin-top: 4px; }
  .tot-table td { border: none; padding: 2px 6px; }
  .tot-table tr.grand td { font-weight: bold; font-size: 11px; border-top: 2px solid #111; padding-top: 5px; }
  .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 9px; }
  .note { margin-top: 12px; font-size: 8px; color: #666; border-top: 1px solid #ddd; padding-top: 6px; }
</style></head><body>

<div class="hdr">
  <h1>VATSIN GRANITE</h1>
  <p>Dharmapuri District, Tamil Nadu &nbsp;|&nbsp; GSTIN: 33AABCA1234B1Z5 &nbsp;|&nbsp; HSN: 2516</p>
  <p>Email: info@vatsingranite.com &nbsp;|&nbsp; Phone: +91-4362-123456</p>
</div>

<div class="doc-title">Sale Receipt / Delivery Challan</div>

<div class="meta">
  <div class="meta-box">
    <strong>Bill To</strong>
    <b>${esc(custName)}</b><br/>
    GSTIN: ${esc(custGstin)}<br/>
    State: ${esc(custState)}<br/>
    Credit Terms: ${custDays} days
  </div>
  <div class="meta-box" style="text-align:right">
    <strong>Document Details</strong>
    <b>SO No:</b> ${esc(o.order_no)}<br/>
    <b>Date:</b> ${dateStr}<br/>
    <b>Quarry:</b> ${esc(o.quarry_name ?? '—')}<br/>
    <b>Supply Type:</b> ${isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Description</th>
      <th>HSN</th>
      <th class="r">Qty (CBM)</th>
      <th class="r">Rate/CBM (₹)</th>
      <th class="r">Taxable Value (₹)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Granite Blocks — ${esc(o.quarry_name ?? 'Vatsin Granite Quarry')}<br/>
        <span style="color:#666;font-size:8px">Rough granite as per SO ${esc(o.order_no)}</span>
      </td>
      <td>2516</td>
      <td class="r">${totalCbm.toFixed(3)}</td>
      <td class="r">₹${ratePerCbm.toLocaleString()}</td>
      <td class="r">₹${taxableValue.toLocaleString()}</td>
    </tr>
  </tbody>
</table>

<table class="tot-table" style="width:320px;margin-left:auto">
  <tr><td>Taxable Value</td><td class="r">₹${taxableValue.toLocaleString()}</td></tr>
  ${isInterState
    ? `<tr><td>IGST @ ${gstRate}%</td><td class="r">₹${igst.toLocaleString()}</td></tr>`
    : `<tr><td>CGST @ ${gstRate / 2}%</td><td class="r">₹${cgst.toLocaleString()}</td></tr>
       <tr><td>SGST @ ${gstRate / 2}%</td><td class="r">₹${sgst.toLocaleString()}</td></tr>`}
  <tr class="grand"><td>TOTAL AMOUNT</td><td class="r">₹${total.toLocaleString()}</td></tr>
</table>

<div class="footer">
  <div>
    <b>Bank Details for Payment</b><br/>
    Bank: HDFC Bank &nbsp;|&nbsp; A/C: XXXX-XXXX-1234<br/>
    IFSC: HDFC0001234 &nbsp;|&nbsp; Branch: Dharmapuri
  </div>
  <div style="text-align:right">
    For Vatsin Granite Quarry<br/><br/><br/>
    ________________________<br/>
    Authorised Signatory
  </div>
</div>

<div class="note">
  This is a computer-generated receipt. Goods once sold are not returnable. E-Way Bill to be generated for consignments above ₹50,000 / 50 km. Subject to Dharmapuri jurisdiction.
</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { notify('Pop-up blocked — allow pop-ups and retry', 'error'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  const totalValue = orders.reduce((s: number, o: any) => s + Number(o.order_value ?? 0), 0);
  const openOrders = orders.filter((o: any) => o.status === 'draft' || o.status === 'confirmed' || o.status === 'in_progress').length;
  const activeCustomers = customers.filter((c: any) => c.status === 'active' || !c.status).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Sales — Domestic</div>
          <div className="ph-sub">M7 — Local block sales · Quotation → SO → Invoice · GST 5% (HSN 2516)</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'orders' && <button className="btn btn-p" onClick={openAddSO}>+ Sales Order</button>}
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc r"><div className="sc-lbl">Open Orders</div><div className="sc-val">{openOrders}</div><div className="sc-sub">Pending dispatch</div></div>
        <div className="sc s"><div className="sc-lbl">Total Value</div><div className="sc-val">₹{(totalValue / 100000).toFixed(1)}L</div><div className="sc-sub">All orders</div></div>
        <div className="sc g"><div className="sc-lbl">Customers</div><div className="sc-val">{activeCustomers}</div><div className="sc-sub">Active</div></div>
        <div className="sc a"><div className="sc-lbl">Completed</div><div className="sc-val">{orders.filter((o: any) => o.status === 'completed').length}</div><div className="sc-sub">Dispatched</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'orders' ? ' on' : ''}`} onClick={() => setTab('orders')}>Sales Orders</button>
        <button className={`itab${tab === 'customers' ? ' on' : ''}`} onClick={() => setTab('customers')}>Customers</button>
      </div>

      {tab === 'orders' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Sales Order Register — {orders.length} records</div></div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>SO No.</th><th>Date</th><th>Customer</th><th>Quarry</th><th className="r">CBM</th><th className="r">Value (₹)</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id}>
                    <td className="tdm tdc">{o.order_no}</td>
                    <td className="tdm">{o.order_date}</td>
                    <td className="tdc">{o.customer_name}</td>
                    <td className="tdm">{o.quarry_name}</td>
                    <td className="tda">{Number(o.total_cbm ?? 0).toFixed(2)}</td>
                    <td className="tda">₹{Number(o.order_value ?? 0).toLocaleString()}</td>
                    <td><span className={`bdg ${o.status === 'confirmed' ? 'b-b' : o.status === 'completed' ? 'b-s' : o.status === 'cancelled' ? 'b-d' : 'b-a'}`}>{o.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-b" onClick={() => printReceipt(o)}>Receipt</button>
                        {o.status !== 'completed' && o.status !== 'cancelled' && (
                          <button className="btn btn-xs btn-p" onClick={() => raiseInvoice(o)}>→ Invoice</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No sales orders</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'customers' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Customer Master — {customers.length} records</div></div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Code</th><th>Name</th><th>State</th><th>GSTIN</th><th className="r">Credit Days</th><th className="r">Credit Limit (₹)</th><th>Status</th></tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id}>
                    <td className="tdm tdc">{c.customer_code ?? c.code ?? '—'}</td>
                    <td className="tdc">{c.customer_name ?? c.name}</td>
                    <td>{c.state ?? '—'}</td>
                    <td className="tdm">{c.gstin ?? '—'}</td>
                    <td className="tda">{c.credit_days ?? c.days ?? '—'}</td>
                    <td className="tda">{c.credit_limit ? `₹${(Number(c.credit_limit) / 100000).toFixed(1)}L` : '—'}</td>
                    <td><span className={`bdg ${c.status === 'active' || !c.status ? 'b-s' : 'b-d'}`}>{c.status ?? 'active'}</span></td>
                  </tr>
                ))}
                {customers.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No customers</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showSOModal && (
        <div className="modal-backdrop" onClick={() => setShowSOModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div className="modal-head">
              <div className="modal-title">New Sales Order</div>
              <button className="modal-close" onClick={() => setShowSOModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Customer *</label>
                  <select className="fsel" value={soForm.customerId} onChange={sf('customerId')}>
                    <option value="">Select customer…</option>
                    {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customer_name ?? c.name}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">Quarry *</label>
                  <select className="fsel" value={soForm.quarryId} onChange={sf('quarryId')}>
                    <option value="">Select quarry…</option>
                    {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Order Date</label><input className="fi" type="date" value={soForm.orderDate} onChange={sf('orderDate')} /></div>
                <div className="fg"><label className="fl">GST Rate (%)</label><input className="fi" type="number" value={soForm.gstRate} onChange={sf('gstRate')} placeholder="5" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Quantity (CBM) *</label><input className="fi" type="number" step="0.01" value={soForm.cbm} onChange={sf('cbm')} placeholder="0.00" /></div>
                <div className="fg"><label className="fl">Rate per CBM (₹) *</label><input className="fi" type="number" value={soForm.ratePerCbm} onChange={sf('ratePerCbm')} placeholder="0" /></div>
              </div>
              <div className="fg"><label className="fl">Notes</label><input className="fi" value={soForm.notes} onChange={sf('notes')} placeholder="Optional notes" /></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowSOModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveSO}>Create SO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
