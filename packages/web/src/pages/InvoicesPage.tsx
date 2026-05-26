import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';
import { esc } from '../utils/escapeHtml';

const STATUSES = ['draft', 'posted', 'cancelled'];
const BLANK = { inv_no: '', date: new Date().toISOString().slice(0, 10), customer: '', gstin: '', state: 'Tamil Nadu', taxable: '', gst_rate: '5', irn: '', ewb: '', status: 'draft', so_ref: '', customerId: '', quarryId: '' };

function numToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  const chunk = (x: number): string => {
    if (x === 0) return '';
    if (x < 20) return ones[x] + ' ';
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '') + ' ';
    return ones[Math.floor(x / 100)] + ' Hundred ' + chunk(x % 100);
  };
  let result = '';
  const cr = Math.floor(n / 10000000); if (cr) result += chunk(cr) + 'Crore ';
  const lk = Math.floor((n % 10000000) / 100000); if (lk) result += chunk(lk) + 'Lakh ';
  const th = Math.floor((n % 100000) / 1000); if (th) result += chunk(th) + 'Thousand ';
  result += chunk(n % 1000);
  return result.trim() + ' Only';
}

function normalize(inv: any) {
  const taxable = inv.taxable_value ?? inv.taxable ?? 0;
  const gst = (inv.cgst_amount ?? 0) + (inv.sgst_amount ?? 0) + (inv.igst_amount ?? 0);
  return {
    ...inv,
    inv_no: inv.invoice_no ?? inv.inv_no,
    date: inv.invoice_date ?? inv.date,
    customer: inv.customer_name ?? inv.customer,
    taxable,
    gst: gst || Math.round(taxable * 0.05),
    total: inv.invoice_value ?? inv.total ?? (taxable + gst),
    irn: inv.irn ?? '',
    ewb: inv.e_way_bill_no ?? inv.ewb ?? '',
    state: inv.place_of_supply ?? inv.state ?? 'Tamil Nadu',
    gstin: inv.gstin_of_buyer ?? inv.gstin ?? '',
    so_ref: inv.so_id ? `SO#${inv.so_id}` : (inv.so_ref ?? ''),
    status: inv.status ?? 'draft'
  };
}

export default function InvoicesPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'all' | 'draft' | 'posted'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(BLANK);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.getInvoices(),
      apiClient.getCustomers(),
      apiClient.getQuarries(),
      apiClient.getAccounts()
    ]).then(([inv, cust, q, accts]: any) => {
      setInvoices((inv.invoices ?? []).map(normalize));
      setCustomers(cust.customers ?? []);
      setQuarries(q.quarries ?? q);
      setAccounts(Array.isArray(accts) ? accts : (accts.accounts ?? []));
    }).catch(() => notify('Failed to load invoices', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    apiClient.getInvoices()
      .then((inv: any) => setInvoices((inv.invoices ?? []).map(normalize)))
      .catch(() => notify('Failed to reload', 'error'));
  };

  const display = invoices.filter((i: any) => tab === 'all' || i.status === tab);

  const openAdd = () => { setForm({ ...BLANK, quarryId: quarries[0]?.id || '' }); setEditId(null); setShowModal(true); };
  const openEdit = (inv: any) => { setForm({ ...inv, taxable: String(inv.taxable), gst_rate: '5' }); setEditId(inv.id); setShowModal(true); };

  const handleSave = async () => {
    if (!form.customerId && !form.customer) { notify('Customer is required', 'error'); return; }
    if (!form.quarryId && !quarries[0]) { notify('Quarry is required', 'error'); return; }
    const taxable = Number(form.taxable) || 0;
    if (taxable <= 0) { notify('Taxable value must be greater than 0', 'error'); return; }
    const gstRate = Number(form.gst_rate) || 5;
    const isInterState = form.state?.toLowerCase() !== 'tamil nadu';
    const gst = Math.round(taxable * gstRate / 100);
    // resolve customer: prefer id stored on form, else find by name
    const customerId = form.customerId
      || customers.find((c: any) => c.customer_name === form.customer)?.id
      || customers[0]?.id;
    const quarryId = form.quarryId || quarries[0]?.id;
    try {
      const payload = {
        despatchQuarryId: Number(quarryId),
        customerId: Number(customerId),
        invoiceDate: form.date,
        placeOfSupply: form.state || 'Tamil Nadu',
        gstinOfBuyer: form.gstin,
        taxableValue: taxable,
        cgstAmount: isInterState ? 0 : gst / 2,
        sgstAmount: isInterState ? 0 : gst / 2,
        igstAmount: isInterState ? gst : 0,
        invoiceValue: taxable + gst,
        irn: form.irn || null,
        eWayBillNo: form.ewb || null,
        status: form.status || 'draft',
      };
      if (editId !== null) {
        await apiClient.patchInvoiceStatus(editId, form.status);
        notify('Invoice updated');
      } else {
        await apiClient.createInvoice(payload);
        notify('Invoice created');
      }
      setShowModal(false);
      reload();
    } catch {
      notify('Failed to save invoice', 'error');
    }
  };

  const postInvoice = async (inv: any) => {
    try {
      const isInterState = inv.state?.toLowerCase() !== 'tamil nadu';
      const arAccount = accounts.find((a: any) => a.account_code === '1103');
      const salesAccount = accounts.find((a: any) => a.account_code === '4101');
      const cgstAccount = accounts.find((a: any) => a.account_code === '2102');
      const sgstAccount = accounts.find((a: any) => a.account_code === '2103');
      const igstAccount = accounts.find((a: any) => a.account_code === '2104');

      if (!arAccount || !salesAccount) {
        await apiClient.patchInvoiceStatus(inv.id, 'posted');
        setInvoices(prev => prev.map((i: any) => i.id === inv.id ? { ...i, status: 'posted' } : i));
        notify(`Invoice posted (GL accounts not found — run migration)`, 'warn');
        return;
      }

      const cgst = isInterState ? 0 : inv.gst / 2;
      const sgst = isInterState ? 0 : inv.gst / 2;
      const igst = isInterState ? inv.gst : 0;

      const lines: any[] = [
        { accountId: arAccount.id, debitAmount: inv.total, creditAmount: 0 },
        { accountId: salesAccount.id, debitAmount: 0, creditAmount: inv.taxable },
      ];
      if (!isInterState && cgstAccount && sgstAccount) {
        lines.push({ accountId: cgstAccount.id, debitAmount: 0, creditAmount: cgst });
        lines.push({ accountId: sgstAccount.id, debitAmount: 0, creditAmount: sgst });
      } else if (isInterState && igstAccount) {
        lines.push({ accountId: igstAccount.id, debitAmount: 0, creditAmount: igst });
      }

      await apiClient.createVoucher({
        voucherType: 'sales',
        voucherDate: inv.date,
        narration: `Invoice ${inv.inv_no} — ${inv.customer}`,
        lines
      });
      await apiClient.patchInvoiceStatus(inv.id, 'posted');
      setInvoices(prev => prev.map((i: any) => i.id === inv.id ? { ...i, status: 'posted' } : i));
      notify(
        `Invoice posted → GL: Dr. AR ₹${inv.total.toLocaleString()} | Cr. Sales ₹${inv.taxable.toLocaleString()} + ${isInterState ? `IGST ₹${igst.toLocaleString()}` : `CGST ₹${cgst.toLocaleString()} + SGST ₹${sgst.toLocaleString()}`}`,
        'success'
      );
    } catch {
      notify('Failed to post invoice', 'error');
    }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));


  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  const printInvoice = (inv: any) => {
    const isInterState = inv.state?.toLowerCase() !== 'tamil nadu';
    const gstRate   = 5;
    const cgst      = isInterState ? 0 : inv.gst / 2;
    const sgst      = isInterState ? 0 : inv.gst / 2;
    const igst      = isInterState ? inv.gst : 0;
    const dateStr   = new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const totalWords = numToWords(inv.total);

    const html = `<!DOCTYPE html><html><head><title>Tax Invoice — ${esc(inv.inv_no)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 9.5px; color: #111; margin: 0; }
  .outer { border: 2px solid #111; padding: 0; }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 10px; border-bottom: 1px solid #111; }
  .co-name { font-size: 16px; font-weight: 900; letter-spacing: 1px; }
  .co-sub  { font-size: 8px; color: #444; margin-top: 2px; }
  .doc-title { text-align: center; font-size: 13px; font-weight: 800; letter-spacing: 3px;
    text-transform: uppercase; background: #111; color: #fff; padding: 5px; }
  .meta { display: flex; border-bottom: 1px solid #111; }
  .meta-l { flex: 1; padding: 8px 10px; border-right: 1px solid #111; }
  .meta-r { flex: 1; padding: 8px 10px; }
  .ml { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 1px; }
  .mv { font-size: 9.5px; font-weight: 600; margin-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; }
  .item-head { background: #f2f2f2; }
  th { padding: 5px 7px; font-size: 8.5px; text-align: left; border: 1px solid #bbb; }
  td { padding: 5px 7px; font-size: 9px; border: 1px solid #ddd; }
  .r { text-align: right; }
  .c { text-align: center; }
  .tax-block { display: flex; justify-content: flex-end; padding: 6px 10px; border-top: 1px solid #ddd; }
  .tax-table { width: 300px; }
  .tax-table td { border: none; padding: 2px 6px; }
  .tax-table .grand td { font-weight: bold; font-size: 11px; border-top: 2px solid #111; }
  .words { padding: 6px 10px; font-size: 9px; border-top: 1px solid #ddd; font-style: italic; }
  .bottom { display: flex; border-top: 1px solid #111; }
  .bank { flex: 1; padding: 8px 10px; border-right: 1px solid #111; font-size: 8.5px; line-height: 1.7; }
  .sign { flex: 1; padding: 8px 10px; text-align: right; font-size: 8.5px; }
  .note { padding: 5px 10px; font-size: 7.5px; color: #666; border-top: 1px solid #ddd; }
  .irn-row { display: flex; gap: 16px; padding: 5px 10px; font-size: 7.5px; background: #fafafa; border-top: 1px solid #ddd; }
</style></head><body>
<div class="outer">

<div class="hdr">
  <div>
    <div class="co-name">AB GRANITE</div>
    <div class="co-sub">Chendrapalli · Krishnagiri District · Tamil Nadu 635 108</div>
    <div class="co-sub">GSTIN: 33AABCA1234B1Z5 &nbsp;|&nbsp; PAN: AABCA1234B</div>
    <div class="co-sub">Email: info@vatsingranite.com &nbsp;|&nbsp; Phone: +91-4362-123456</div>
  </div>
  <div style="text-align:right">
    <div class="co-sub"><b>HSN:</b> 2516 &nbsp;|&nbsp; SAC: N/A</div>
    <div class="co-sub"><b>State:</b> Tamil Nadu (33)</div>
    <div class="co-sub"><b>Supply Type:</b> ${isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</div>
  </div>
</div>

<div class="doc-title">Tax Invoice</div>

<div class="meta">
  <div class="meta-l">
    <div class="ml">Bill To</div>
    <div class="mv">${esc(inv.customer)}</div>
    <div class="mv" style="font-size:8.5px;font-weight:400">GSTIN: ${esc(inv.gstin || '—')}</div>
    <div class="mv" style="font-size:8.5px;font-weight:400">State: ${esc(inv.state || '—')}</div>
    ${inv.so_ref ? `<div style="font-size:8px;color:#666;margin-top:4px">Ref SO: ${esc(inv.so_ref)}</div>` : ''}
  </div>
  <div class="meta-r">
    <div style="display:flex;flex-direction:column;gap:4px">
      <div><div class="ml">Invoice No.</div><div class="mv">${esc(inv.inv_no)}</div></div>
      <div><div class="ml">Invoice Date</div><div class="mv">${dateStr}</div></div>
      <div><div class="ml">Place of Supply</div><div class="mv">${esc(inv.state || 'Tamil Nadu')}</div></div>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr class="item-head">
      <th>#</th>
      <th>Description of Goods</th>
      <th class="c">HSN</th>
      <th class="r">Taxable Value (₹)</th>
      <th class="r">GST Rate</th>
      ${isInterState
        ? '<th class="r">IGST (₹)</th>'
        : '<th class="r">CGST (₹)</th><th class="r">SGST (₹)</th>'}
      <th class="r">Total (₹)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="c">1</td>
      <td>Rough Granite Blocks — Natural finish, as per ${esc(inv.so_ref ? inv.so_ref : 'purchase order')}</td>
      <td class="c">2516</td>
      <td class="r">₹${inv.taxable.toLocaleString()}</td>
      <td class="c">${gstRate}%</td>
      ${isInterState
        ? `<td class="r">₹${igst.toLocaleString()}</td>`
        : `<td class="r">₹${cgst.toLocaleString()}</td><td class="r">₹${sgst.toLocaleString()}</td>`}
      <td class="r"><b>₹${inv.total.toLocaleString()}</b></td>
    </tr>
  </tbody>
</table>

<div class="tax-block">
  <table class="tax-table">
    <tr><td>Taxable Value</td><td class="r">₹${inv.taxable.toLocaleString()}</td></tr>
    ${isInterState
      ? `<tr><td>IGST @ ${gstRate}%</td><td class="r">₹${igst.toLocaleString()}</td></tr>`
      : `<tr><td>CGST @ ${gstRate / 2}%</td><td class="r">₹${cgst.toLocaleString()}</td></tr>
         <tr><td>SGST @ ${gstRate / 2}%</td><td class="r">₹${sgst.toLocaleString()}</td></tr>`}
    <tr class="grand"><td><b>Invoice Total</b></td><td class="r"><b>₹${inv.total.toLocaleString()}</b></td></tr>
  </table>
</div>

<div class="words"><b>Amount in words:</b> Rupees ${totalWords}</div>

${inv.irn || inv.ewb ? `<div class="irn-row">
  ${inv.irn ? `<span><b>IRN:</b> ${esc(inv.irn)}</span>` : ''}
  ${inv.ewb ? `<span><b>E-Way Bill:</b> ${esc(inv.ewb)}</span>` : ''}
</div>` : ''}

<div class="bottom">
  <div class="bank">
    <b>Bank Details for NEFT / RTGS</b><br/>
    Bank: HDFC Bank, Krishnagiri Branch<br/>
    A/C No.: XXXX-XXXX-1234 &nbsp;|&nbsp; IFSC: HDFC0001234<br/>
    Account Name: Vatsin Granite Quarry
  </div>
  <div class="sign">
    For <b>AB GRANITE</b><br/><br/><br/>
    ____________________________<br/>
    Authorised Signatory
  </div>
</div>

<div class="note">
  1. Goods once sold are not returnable. 2. Subject to Krishnagiri jurisdiction. 3. E-Way Bill required for consignments above ₹50,000 / 50 km.
  4. This is a computer-generated tax invoice. 5. GST payable on reverse charge: No.
</div>

</div>
<script>window.print(); window.close();<\/script>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=750');
    if (!win) { notify('Pop-up blocked — allow pop-ups and retry', 'error'); return; }
    win.document.write(html);
    win.document.close();
  };

  const totalTaxable = invoices.filter((i: any) => i.status === 'posted').reduce((s: number, i: any) => s + i.taxable, 0);
  const totalGST     = invoices.filter((i: any) => i.status === 'posted').reduce((s: number, i: any) => s + i.gst, 0);
  const irnCount     = invoices.filter((i: any) => i.irn).length;
  const draftCount   = invoices.filter((i: any) => i.status === 'draft').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Invoices</div>
          <div className="ph-sub">SO → Tax Invoice → GL · e-Invoice (IRN) · E-Way Bill · HSN 2516 · GST 5%</div>
        </div>
        <button className="btn btn-p" onClick={openAdd}>+ New Invoice</button>
      </div>

      <div className="sc-grid">
        <div className="sc r"><div className="sc-lbl">May Invoiced</div><div className="sc-val">₹{(totalTaxable / 100000).toFixed(1)}L</div><div className="sc-sub">{invoices.filter(i => i.status === 'posted').length} invoices</div></div>
        <div className="sc g"><div className="sc-lbl">GST Collected</div><div className="sc-val">₹{(totalGST / 1000).toFixed(1)}K</div><div className="sc-sub">CGST + SGST / IGST</div></div>
        <div className="sc s"><div className="sc-lbl">e-Invoices (IRN)</div><div className="sc-val">{irnCount}</div><div className="sc-sub">IRP registered</div></div>
        <div className="sc a"><div className="sc-lbl">Draft Invoices</div><div className="sc-val">{draftCount}</div><div className="sc-sub">Pending post</div></div>
      </div>

      <div className="itabs">
        {(['all', 'draft', 'posted'] as const).map(t => (
          <button key={t} className={`itab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Invoice Register — {display.length} records</div></div>
        <div className="tw">
          <table className="dt">
            <thead>
              <tr><th>Invoice No.</th><th>Date</th><th>Customer</th><th>SO Ref</th><th className="r">Taxable (₹)</th><th className="r">GST (₹)</th><th className="r">Total (₹)</th><th>IRN</th><th>E-Way</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {display.map(inv => (
                <tr key={inv.id}>
                  <td className="tdm tdc">{inv.inv_no}</td>
                  <td className="tdm">{inv.date}</td>
                  <td className="tdc">{inv.customer}</td>
                  <td className="tdm" style={{ color: 'var(--t3)' }}>{inv.so_ref || '—'}</td>
                  <td className="tda">₹{inv.taxable.toLocaleString()}</td>
                  <td className="tda">₹{inv.gst.toLocaleString()}</td>
                  <td className="tda" style={{ color: 'var(--sage)' }}>₹{inv.total.toLocaleString()}</td>
                  <td className="tdm">{inv.irn ? <span className="bdg b-s">GENERATED</span> : <span className="bdg b-d">PENDING</span>}</td>
                  <td className="tdm">{inv.ewb ? <span className="bdg b-b">{inv.ewb}</span> : <span className="bdg b-d">NIL</span>}</td>
                  <td><span className={`bdg ${inv.status === 'posted' ? 'b-s' : inv.status === 'cancelled' ? 'b-r' : 'b-d'}`}>{inv.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-xs btn-b" onClick={() => printInvoice(inv)}>🖨 Print</button>
                      {inv.status === 'draft' && (
                        <button className="btn btn-xs btn-p" onClick={() => postInvoice(inv)}>Post → GL</button>
                      )}
                      <button className="btn btn-xs btn-s" onClick={() => openEdit(inv)}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modal-head">
              <div className="modal-title">{editId !== null ? 'Edit Invoice' : 'New Invoice'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Date *</label><input className="fi" type="date" value={form.date} onChange={f('date')} /></div>
                <div className="fg"><label className="fl">Despatch Quarry *</label>
                  <select className="fsel" value={form.quarryId} onChange={f('quarryId')}>
                    <option value="">Select quarry…</option>
                    {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Customer *</label>
                  <select className="fsel" value={form.customerId} onChange={e => {
                    const cust = customers.find((c: any) => String(c.id) === e.target.value);
                    setForm((p: any) => ({ ...p, customerId: e.target.value, customer: cust?.customer_name || '', gstin: cust?.gstin || '', state: cust?.state || 'Tamil Nadu' }));
                  }}>
                    <option value="">Select customer…</option>
                    {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customer_name ?? c.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">SO Reference</label><input className="fi" value={form.so_ref} onChange={f('so_ref')} placeholder="SO/2026/000001" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Customer GSTIN</label><input className="fi" value={form.gstin} onChange={f('gstin')} placeholder="Auto-filled from customer" /></div>
                <div className="fg"><label className="fl">Customer State</label><input className="fi" value={form.state} onChange={f('state')} placeholder="Tamil Nadu" /></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Taxable Value (₹)</label><input className="fi" type="number" value={form.taxable} onChange={f('taxable')} placeholder="0" /></div>
                <div className="fg"><label className="fl">GST Rate %</label><input className="fi" type="number" value={form.gst_rate} onChange={f('gst_rate')} placeholder="5" /></div>
                <div className="fg"><label className="fl">Status</label><select className="fsel" value={form.status} onChange={f('status')}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">IRN (e-Invoice)</label><input className="fi" value={form.irn} onChange={f('irn')} placeholder="Auto via IRP" /></div>
                <div className="fg"><label className="fl">E-Way Bill No.</label><input className="fi" value={form.ewb} onChange={f('ewb')} placeholder="EWB-XXXXXX" /></div>
              </div>
              {form.taxable && (
                <div style={{ padding: '8px 12px', background: 'var(--bg3)', borderRadius: 4, fontSize: 10, color: 'var(--t2)', display: 'flex', gap: 16 }}>
                  {form.state?.toLowerCase() !== 'tamil nadu'
                    ? <><span>IGST: ₹{Math.round((Number(form.taxable)||0)*(Number(form.gst_rate)||5)/100).toLocaleString()}</span></>
                    : <><span>CGST: ₹{Math.round((Number(form.taxable)||0)*(Number(form.gst_rate)||5)/200).toLocaleString()}</span>
                       <span>SGST: ₹{Math.round((Number(form.taxable)||0)*(Number(form.gst_rate)||5)/200).toLocaleString()}</span></>}
                  <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                    Total: ₹{((Number(form.taxable)||0)+Math.round((Number(form.taxable)||0)*(Number(form.gst_rate)||5)/100)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editId !== null ? 'Update Invoice' : 'Create Invoice'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
