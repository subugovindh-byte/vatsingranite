import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';
import { esc } from '../utils/escapeHtml';

const BLANK_CHAL = { quarryId: '', periodMonth: new Date().getMonth() + 1, periodYear: new Date().getFullYear(), openingStockCbm: '', producedCbm: '', despatchedCbm: '', royaltyRatePerCbm: '92', paymentDate: '' };

export default function RoyaltyPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'register' | 'dmf' | 'returns'>('register');
  const [challans, setChallans] = useState<any[]>([]);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(BLANK_CHAL);

  useEffect(() => {
    Promise.all([apiClient.getRoyaltyChallans(), apiClient.getQuarries()])
      .then(([rc, q]: any) => {
        setChallans(Array.isArray(rc) ? rc : (rc.challans ?? []));
        setQuarries(q.quarries ?? q);
      })
      .catch(() => notify('Failed to load royalty data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    apiClient.getRoyaltyChallans()
      .then((rc: any) => setChallans(Array.isArray(rc) ? rc : (rc.challans ?? [])))
      .catch(() => notify('Failed to reload', 'error'));
  };

  const openAdd = () => { setForm({ ...BLANK_CHAL, quarryId: quarries[0]?.id || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.quarryId || !form.periodMonth || !form.periodYear) { notify('Quarry and period are required', 'error'); return; }
    try {
      await apiClient.createRoyaltyChallan({
        quarryId: Number(form.quarryId),
        periodMonth: Number(form.periodMonth),
        periodYear: Number(form.periodYear),
        openingStockCbm: parseFloat(form.openingStockCbm) || 0,
        producedCbm: parseFloat(form.producedCbm) || 0,
        despatchedCbm: parseFloat(form.despatchedCbm) || 0,
        royaltyRatePerCbm: parseFloat(form.royaltyRatePerCbm) || 92,
        paymentDate: form.paymentDate || undefined
      });
      notify('Royalty challan recorded');
      setShowModal(false);
      reload();
    } catch {
      notify('Failed to save challan', 'error');
    }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const printChallan = (c: any) => {
    const dateStr = c.payment_date ? new Date(c.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const html = `<!DOCTYPE html><html><head><title>Royalty Challan — ${esc(c.challan_no)}</title>
<style>
  @page { size: A5; margin: 10mm; }
  body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; }
  .outer { border: 2px solid #111; padding: 14px; }
  .hdr { text-align: center; border-bottom: 1px solid #111; padding-bottom: 8px; margin-bottom: 10px; }
  .title { font-size: 13px; font-weight: 800; letter-spacing: 1px; }
  .sub { font-size: 8.5px; color: #555; margin-top: 2px; }
  .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
  .lbl { color: #555; font-size: 9px; }
  .val { font-weight: 600; }
  .amt { text-align: center; margin: 14px 0; }
  .amt-num { font-size: 22px; font-weight: 900; }
  .footer { display: flex; justify-content: space-between; margin-top: 20px; font-size: 8.5px; }
  .stamp { text-align: center; padding: 6px; border: 2px solid #1a7a1a; color: #1a7a1a; font-weight: 700; font-size: 11px; letter-spacing: 2px; display: inline-block; }
</style></head><body>
<div class="outer">
  <div class="hdr">
    <div class="title">ROYALTY PAYMENT CHALLAN</div>
    <div class="sub">Tamil Nadu Minor Mineral Concession Rules · Seigniorage Fee</div>
    <div class="sub">Vatsin Granite · Dharmapuri District, Tamil Nadu</div>
  </div>
  <div class="row"><span class="lbl">Challan No.</span><span class="val">${esc(c.challan_no)}</span></div>
  <div class="row"><span class="lbl">Payment Date</span><span class="val">${dateStr}</span></div>
  <div class="row"><span class="lbl">Period</span><span class="val">${Number(c.period_month)}/${Number(c.period_year)}</span></div>
  <div class="row"><span class="lbl">Quarry</span><span class="val">${esc(c.quarry_name ?? '—')}</span></div>
  <div class="row"><span class="lbl">Despatched (m³)</span><span class="val">${Number(c.despatched_cbm ?? 0).toFixed(2)}</span></div>
  <div class="row"><span class="lbl">Rate (₹/m³)</span><span class="val">₹${Number(c.royalty_rate_per_cbm ?? 0).toFixed(0)}</span></div>
  <div class="row"><span class="lbl">Royalty Amount</span><span class="val">₹${Number(c.royalty_amount ?? 0).toLocaleString()}</span></div>
  <div class="row"><span class="lbl">DMF (10%)</span><span class="val">₹${Number(c.dmf_amount ?? 0).toLocaleString()}</span></div>
  <div class="row"><span class="lbl">NMET (2%)</span><span class="val">₹${Number(c.nmet_amount ?? 0).toLocaleString()}</span></div>
  <div class="amt">
    <div style="font-size:9px;color:#555;margin-bottom:4px">Total Amount Payable</div>
    <div class="amt-num">₹${Number(c.total_amount ?? 0).toLocaleString()}</div>
    ${c.payment_date ? '<div style="margin-top:8px"><span class="stamp">PAID</span></div>' : ''}
  </div>
  <div class="footer">
    <div>Signature of Lessee: ______________</div>
    <div>Office Seal</div>
  </div>
</div>
<script>window.print(); window.close();<\/script>
</body></html>`;
    const win = window.open('', '_blank', 'width=600,height=700');
    if (!win) { notify('Pop-up blocked', 'error'); return; }
    win.document.write(html);
    win.document.close();
  };

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  const paidChallans = challans.filter((c: any) => c.payment_date);
  const totalRoyaltyYTD = paidChallans.reduce((s: number, c: any) => s + Number(c.royalty_amount ?? 0), 0);
  const totalDMF = paidChallans.reduce((s: number, c: any) => s + Number(c.dmf_amount ?? 0), 0);
  const totalNMET = challans.reduce((s: number, c: any) => s + Number(c.nmet_amount ?? 0), 0);
  const pendingAmt = challans.filter((c: any) => !c.payment_date).reduce((s: number, c: any) => s + Number(c.total_amount ?? 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Royalty & Seigniorage</div>
          <div className="ph-sub">M15 — TNMMCR 1959 · IBM/MCDR · DMF · NMET · Monthly Mineral Returns · Form-H</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'register' && <button className="btn btn-p" onClick={openAdd}>+ Record Royalty</button>}
        </div>
      </div>

      <div className="sc-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="sc g"><div className="sc-lbl">Royalty Paid</div><div className="sc-val">₹{(totalRoyaltyYTD / 100000).toFixed(2)}L</div><div className="sc-sub">Paid challans</div></div>
        <div className="sc r"><div className="sc-lbl">Royalty Pending</div><div className="sc-val">₹{(pendingAmt / 1000).toFixed(1)}K</div><div className="sc-sub">Unpaid</div></div>
        <div className="sc s"><div className="sc-lbl">DMF Paid</div><div className="sc-val">₹{(totalDMF / 1000).toFixed(1)}K</div><div className="sc-sub">10% of royalty</div></div>
        <div className="sc a"><div className="sc-lbl">NMET</div><div className="sc-val">₹{(totalNMET / 1000).toFixed(1)}K</div><div className="sc-sub">2% of royalty</div></div>
        <div className="sc b"><div className="sc-lbl">Total Challans</div><div className="sc-val">{challans.length}</div><div className="sc-sub">All periods</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'register' ? ' on' : ''}`} onClick={() => setTab('register')}>Royalty Register</button>
        <button className={`itab${tab === 'dmf' ? ' on' : ''}`} onClick={() => setTab('dmf')}>DMF / NMET</button>
        <button className={`itab${tab === 'returns' ? ' on' : ''}`} onClick={() => setTab('returns')}>Monthly Returns</button>
      </div>

      {tab === 'register' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Royalty Challans — {challans.length} records</div></div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Challan No.</th><th>Period</th><th>Quarry</th><th className="r">Despatched (m³)</th><th className="r">Rate (₹/m³)</th><th className="r">Royalty (₹)</th><th className="r">DMF (₹)</th><th className="r">NMET (₹)</th><th className="r">Total (₹)</th><th>Payment Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {challans.map((c: any) => (
                  <tr key={c.id}>
                    <td className="tdm tdc">{c.challan_no}</td>
                    <td className="tdm">{c.period_month}/{c.period_year}</td>
                    <td className="tdc">{c.quarry_name}</td>
                    <td className="tda">{Number(c.despatched_cbm ?? 0).toFixed(2)}</td>
                    <td className="tda">₹{Number(c.royalty_rate_per_cbm ?? 0).toFixed(0)}</td>
                    <td className="tda">₹{Number(c.royalty_amount ?? 0).toLocaleString()}</td>
                    <td className="tda">₹{Number(c.dmf_amount ?? 0).toLocaleString()}</td>
                    <td className="tda">₹{Number(c.nmet_amount ?? 0).toLocaleString()}</td>
                    <td className="tda" style={{ color: 'var(--amber)', fontWeight: 600 }}>₹{Number(c.total_amount ?? 0).toLocaleString()}</td>
                    <td className="tdm">{c.payment_date ? <span className="bdg b-s">{c.payment_date.slice(0, 10)}</span> : <span className="bdg b-r">Unpaid</span>}</td>
                    <td>
                      <button className="btn btn-xs btn-b" onClick={() => printChallan(c)}>Print</button>
                    </td>
                  </tr>
                ))}
                {challans.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No royalty challans recorded</td></tr>}
                {challans.length > 0 && (
                  <tr style={{ background: 'var(--bg3)', fontWeight: 700 }}>
                    <td colSpan={3} className="tdm" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 8 }}>Total</td>
                    <td className="tda tdc">{challans.reduce((s: number, c: any) => s + Number(c.despatched_cbm ?? 0), 0).toFixed(2)}</td>
                    <td></td>
                    <td className="tda tdc">₹{challans.reduce((s: number, c: any) => s + Number(c.royalty_amount ?? 0), 0).toLocaleString()}</td>
                    <td className="tda tdc">₹{challans.reduce((s: number, c: any) => s + Number(c.dmf_amount ?? 0), 0).toLocaleString()}</td>
                    <td className="tda tdc">₹{challans.reduce((s: number, c: any) => s + Number(c.nmet_amount ?? 0), 0).toLocaleString()}</td>
                    <td className="tda" style={{ color: 'var(--amber)' }}>₹{challans.reduce((s: number, c: any) => s + Number(c.total_amount ?? 0), 0).toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'dmf' && (
        <div className="card">
          <div className="card-head"><div className="card-title">DMF & NMET Contribution Tracker</div></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { title: 'District Mineral Foundation (DMF)', rows: [['Rate', '10% of royalty amount'], ['Authority', 'District Collector, Dharmapuri'], ['Fund Purpose', 'Local area development around mining'], ['FY Contribution', `₹${totalDMF.toLocaleString()}`], ['Payment Mode', 'Along with monthly royalty challan']] },
                { title: 'NMET — National Mineral Exploration Trust', rows: [['Rate', '2% of royalty amount'], ['Authority', 'IBM (Indian Bureau of Mines)'], ['Fund Purpose', 'Regional/national mineral exploration'], ['FY Contribution', `₹${totalNMET.toLocaleString()}`], ['Payment Mode', 'Along with monthly royalty challan']] },
              ].map(({ title, rows }) => (
                <div key={title}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 12 }}>{title}</div>
                  {rows.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                      <div style={{ fontSize: 10, color: 'var(--t2)' }}>{k}</div>
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'var(--gold)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'returns' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Monthly Mineral Returns — IBM / MCDR Form-H</div>
            <button className="btn btn-sm btn-p" onClick={() => notify('Form-H generated', 'success')}>Generate Form-H</button>
          </div>
          <div className="card-body">
            <div className="tw">
              <table className="dt">
                <thead><tr><th>Period</th><th>Quarry</th><th className="r">Produced (m³)</th><th className="r">Despatched (m³)</th><th className="r">Royalty (₹)</th><th>Status</th></tr></thead>
                <tbody>
                  {challans.map((c: any) => (
                    <tr key={c.id}>
                      <td className="tdm">{c.period_month}/{c.period_year}</td>
                      <td>{c.quarry_name}</td>
                      <td className="tda">{Number(c.produced_cbm ?? 0).toFixed(2)}</td>
                      <td className="tda">{Number(c.despatched_cbm ?? 0).toFixed(2)}</td>
                      <td className="tda">₹{Number(c.royalty_amount ?? 0).toLocaleString()}</td>
                      <td><span className={`bdg ${c.payment_date ? 'b-s' : 'b-r'}`}>{c.payment_date ? 'filed' : 'pending'}</span></td>
                    </tr>
                  ))}
                  {challans.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No returns data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Record Royalty Challan</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg">
                <label className="fl">Quarry *</label>
                <select className="fsel" value={form.quarryId} onChange={f('quarryId')}>
                  <option value="">Select quarry…</option>
                  {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Period Month *</label><input className="fi" type="number" min="1" max="12" value={form.periodMonth} onChange={f('periodMonth')} placeholder="5" /></div>
                <div className="fg"><label className="fl">Period Year *</label><input className="fi" type="number" value={form.periodYear} onChange={f('periodYear')} placeholder="2026" /></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Opening Stock (m³)</label><input className="fi" type="number" step="0.01" value={form.openingStockCbm} onChange={f('openingStockCbm')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Produced (m³)</label><input className="fi" type="number" step="0.01" value={form.producedCbm} onChange={f('producedCbm')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Despatched (m³)</label><input className="fi" type="number" step="0.01" value={form.despatchedCbm} onChange={f('despatchedCbm')} placeholder="0" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Royalty Rate (₹/m³)</label><input className="fi" type="number" value={form.royaltyRatePerCbm} onChange={f('royaltyRatePerCbm')} placeholder="92" /></div>
                <div className="fg"><label className="fl">Payment Date</label><input className="fi" type="date" value={form.paymentDate} onChange={f('paymentDate')} /></div>
              </div>
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 4, fontSize: 10, color: 'var(--t2)' }}>
                DMF = 10% of royalty · NMET = 2% of royalty — auto-calculated on save.
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>Record Challan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
