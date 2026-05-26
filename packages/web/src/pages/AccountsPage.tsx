import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';
import { esc } from '../utils/escapeHtml';

const V_TYPE_OPTS = [
  { label: 'Sales Voucher', value: 'sales' },
  { label: 'Purchase Voucher', value: 'purchase' },
  { label: 'Payment Voucher', value: 'payment' },
  { label: 'Receipt Voucher', value: 'receipt' },
  { label: 'Journal Voucher', value: 'journal' },
  { label: 'Contra', value: 'contra' },
];
const BLANK = { date: new Date().toISOString().slice(0, 10), voucherType: 'journal', narration: '', debitAccountId: '', creditAccountId: '', amount: '', quarryId: '' };

export default function AccountsPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'vouchers' | 'ledger' | 'statements'>('vouchers');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(BLANK);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.getVouchers(), apiClient.getAccounts(), apiClient.getQuarries()])
      .then(([v, a, q]: any) => {
        setVouchers(v.vouchers ?? []);
        setAccounts(Array.isArray(a) ? a : (a.accounts ?? []));
        setQuarries(q.quarries ?? q);
      })
      .catch(() => notify('Failed to load accounts data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    apiClient.getVouchers()
      .then((v: any) => setVouchers(v.vouchers ?? []))
      .catch(() => notify('Failed to reload', 'error'));
  };

  const openAdd = () => { setForm({ ...BLANK, quarryId: quarries[0]?.id || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.narration || !form.debitAccountId || !form.creditAccountId) { notify('Narration and both accounts are required', 'error'); return; }
    const amount = parseFloat(form.amount) || 0;
    if (amount <= 0) { notify('Amount must be greater than 0', 'error'); return; }
    try {
      await apiClient.createVoucher({
        voucherType: form.voucherType,
        voucherDate: form.date,
        narration: form.narration,
        defaultQuarryId: form.quarryId ? Number(form.quarryId) : undefined,
        lines: [
          { accountId: Number(form.debitAccountId), debitAmount: amount, creditAmount: 0 },
          { accountId: Number(form.creditAccountId), debitAmount: 0, creditAmount: amount },
        ]
      } as any);
      notify('Voucher created and posted');
      setShowModal(false);
      reload();
    } catch (err: any) {
      notify(err.message || 'Failed to create voucher', 'error');
    }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const printVoucher = (v: any) => {
    const dateStr = new Date(v.voucher_date ?? v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const html = `<!DOCTYPE html><html><head><title>Voucher — ${esc(v.vno)}</title>
<style>
  @page { size: A5 landscape; margin: 10mm; }
  body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; }
  .outer { border: 2px solid #111; padding: 14px 16px; }
  .hdr { display: flex; justify-content: space-between; margin-bottom: 10px; }
  .co { font-size: 14px; font-weight: 900; }
  .co-sub { font-size: 8px; color: #555; }
  .title { text-align: center; font-size: 12px; font-weight: 700; letter-spacing: 2px;
    border: 1px solid #111; padding: 4px; margin-bottom: 10px; text-transform: uppercase; }
  .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .lbl { color: #666; font-size: 8.5px; text-transform: uppercase; letter-spacing: .5px; }
  .val { font-weight: 600; font-size: 11px; }
  .narration { margin: 10px 0; padding: 8px; background: #f7f7f7; border-left: 3px solid #111; font-size: 10px; }
  .amounts { display: flex; gap: 40px; margin: 10px 0; }
  .amt-box { text-align: center; }
  .amt { font-size: 16px; font-weight: 900; }
  .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 8.5px; }
</style></head><body>
<div class="outer">
  <div class="hdr">
    <div><div class="co">AB GRANITE</div><div class="co-sub">Krishnagiri · TN</div></div>
    <div style="text-align:right"><div class="lbl">Voucher No.</div><div style="font-size:13px;font-weight:700">${esc(v.voucher_no ?? v.vno)}</div></div>
  </div>
  <div class="title">${esc(v.voucher_type ?? v.type)} Voucher</div>
  <div class="row">
    <div><div class="lbl">Date</div><div class="val">${dateStr}</div></div>
    <div><div class="lbl">Quarry / Cost Centre</div><div class="val">${esc(v.quarry_name ?? v.quarry ?? '—')}</div></div>
    <div><div class="lbl">Status</div><div class="val">${esc((v.status ?? '').toUpperCase())}</div></div>
  </div>
  <div class="narration"><b>Narration:</b> ${esc(v.narration ?? '—')}</div>
  <div class="amounts">
    <div class="amt-box"><div class="lbl">Dr. (Debit)</div><div class="amt">₹${(v.debit ?? 0).toLocaleString()}</div></div>
    <div class="amt-box"><div class="lbl">Cr. (Credit)</div><div class="amt">₹${(v.credit ?? 0).toLocaleString()}</div></div>
  </div>
  <div class="footer">
    <div>Prepared by: ____________________</div>
    <div>Checked by: ____________________</div>
    <div>Authorised by: ____________________</div>
  </div>
</div>
<script>window.print(); window.close();<\/script>
</body></html>`;
    const win = window.open('', '_blank', 'width=750,height=500');
    if (!win) { notify('Pop-up blocked', 'error'); return; }
    win.document.write(html);
    win.document.close();
  };

  const printPL = () => {
    const plAccounts = accounts.filter((a: any) => a.account_type === 'Income' || a.account_type === 'Expense');
    const rows = plAccounts.map((a: any) => `<tr>
      <td>${esc(a.account_code)} — ${esc(a.account_name)}</td>
      <td style="text-align:right">—</td>
      <td style="text-align:right">—</td>
      <td style="text-align:right">—</td>
      <td style="text-align:right">—</td>
    </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>P&L — May 2026</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, sans-serif; font-size: 10px; }
  h2 { text-align: center; margin-bottom: 4px; }
  .sub { text-align: center; color: #555; font-size: 9px; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #111; color: #fff; padding: 5px 8px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  .sign { display: flex; justify-content: space-between; margin-top: 40px; font-size: 9px; }
</style></head><body>
<h2>AB GRANITE — Profit &amp; Loss Statement</h2>
<div class="sub">For the month of May 2026 &nbsp;|&nbsp; FY 2025-26 &nbsp;|&nbsp; Subject to Audit</div>
<table>
  <thead><tr><th>Account Head</th><th style="text-align:right">This Month (₹)</th><th style="text-align:right">YTD (₹)</th><th style="text-align:right">Annual Budget (₹)</th><th style="text-align:right">YTD Variance</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="sign">
  <div>Prepared by: __________________</div>
  <div>Reviewed by: __________________</div>
  <div>For Vatsin Granite: __________________</div>
</div>
<script>window.print(); window.close();<\/script>
</body></html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) { notify('Pop-up blocked', 'error'); return; }
    win.document.write(html);
    win.document.close();
  };

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  const postedCount = vouchers.filter((v: any) => v.status === 'posted').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Accounts</div>
          <div className="ph-sub">M11 — Double-entry GL · Schedule III · Multi cost-centre · Vouchers</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-s" onClick={printPL}>🖨 P&L</button>
          <button className="btn btn-p" onClick={openAdd}>+ Voucher</button>
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc s"><div className="sc-lbl">Total Vouchers</div><div className="sc-val">{vouchers.length}</div><div className="sc-sub">All time</div></div>
        <div className="sc g"><div className="sc-lbl">Posted</div><div className="sc-val">{postedCount}</div><div className="sc-sub">In ledger</div></div>
        <div className="sc r"><div className="sc-lbl">GL Accounts</div><div className="sc-val">{accounts.length}</div><div className="sc-sub">Chart of accounts</div></div>
        <div className="sc b"><div className="sc-lbl">Quarries</div><div className="sc-val">{quarries.length}</div><div className="sc-sub">Cost centres</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'vouchers' ? ' on' : ''}`} onClick={() => setTab('vouchers')}>Vouchers</button>
        <button className={`itab${tab === 'ledger' ? ' on' : ''}`} onClick={() => setTab('ledger')}>Chart of Accounts</button>
        <button className={`itab${tab === 'statements' ? ' on' : ''}`} onClick={() => setTab('statements')}>Trial Balance</button>
      </div>

      {tab === 'vouchers' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Voucher Register — {vouchers.length} entries</div></div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Voucher No.</th><th>Date</th><th>Type</th><th>Narration</th><th>Quarry</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {vouchers.map((v: any) => (
                  <tr key={v.id}>
                    <td className="tdm tdc">{v.voucher_no}</td>
                    <td className="tdm">{v.voucher_date}</td>
                    <td><span className="bdg b-g">{v.voucher_type}</span></td>
                    <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.narration || '—'}</td>
                    <td>{v.quarry_name || '—'}</td>
                    <td><span className={`bdg ${v.status === 'posted' ? 'b-s' : 'b-d'}`}>{v.status}</span></td>
                    <td>
                      <button className="btn btn-xs btn-b" onClick={() => printVoucher(v)}>🖨</button>
                    </td>
                  </tr>
                ))}
                {vouchers.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No vouchers yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ledger' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Chart of Accounts — {accounts.length} accounts</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Active</th></tr></thead>
              <tbody>
                {accounts.map((a: any) => (
                  <tr key={a.id}>
                    <td className="tdm tdc">{a.account_code}</td>
                    <td className="tdc">{a.account_name}</td>
                    <td><span className="bdg b-g">{a.account_type}</span></td>
                    <td><span className={`bdg ${a.active ? 'b-s' : 'b-d'}`}>{a.active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'statements' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Trial Balance</div>
          </div>
          <div className="card-body"><div className="empty-state">Trial balance — post invoices and vouchers to populate the ledger</div></div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 540 }}>
            <div className="modal-head">
              <div className="modal-title">New Voucher (Double Entry)</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={form.date} onChange={f('date')} /></div>
                <div className="fg"><label className="fl">Voucher Type</label>
                  <select className="fsel" value={form.voucherType} onChange={f('voucherType')}>
                    {V_TYPE_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg"><label className="fl">Narration *</label><input className="fi" value={form.narration} onChange={f('narration')} placeholder="e.g. Invoice — Customer payment received" /></div>
              <div className="fg">
                <label className="fl">Quarry / Cost Centre</label>
                <select className="fsel" value={form.quarryId} onChange={f('quarryId')}>
                  <option value="">— select —</option>
                  {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Debit Account *</label>
                  <select className="fsel" value={form.debitAccountId} onChange={f('debitAccountId')}>
                    <option value="">— select —</option>
                    {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">Credit Account *</label>
                  <select className="fsel" value={form.creditAccountId} onChange={f('creditAccountId')}>
                    <option value="">— select —</option>
                    {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg"><label className="fl">Amount (₹) *</label><input className="fi" type="number" value={form.amount} onChange={f('amount')} placeholder="0" /></div>
              <div style={{ padding: '8px 12px', background: 'var(--bg3)', borderRadius: 4, fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                Voucher is automatically posted (balanced — debit = credit)
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>Create &amp; Post Voucher</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
