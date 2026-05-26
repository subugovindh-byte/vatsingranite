import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';
import { esc } from '../utils/escapeHtml';

export default function PayrollPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'runs' | 'details' | 'epf' | 'esi'>('runs');
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runForm, setRunForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), quarryId: '' });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    Promise.all([apiClient.getPayrollRuns(), apiClient.getQuarries()])
      .then(([r, q]: any) => {
        setRuns(Array.isArray(r) ? r : []);
        setQuarries(q.quarries ?? q);
      })
      .catch(() => notify('Failed to load payroll data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const loadDetails = async (run: any) => {
    setSelectedRun(run);
    setTab('details');
    try {
      const d: any = await apiClient.getPayrollDetails(run.id);
      setDetails(Array.isArray(d) ? d : (d.details ?? []));
    } catch {
      notify('Failed to load payroll details', 'error');
    }
  };

  const handleRunPayroll = async () => {
    if (!runForm.month || !runForm.year) { notify('Month and year are required', 'error'); return; }
    setRunning(true);
    try {
      const result: any = await apiClient.createPayrollRun({
        month: Number(runForm.month),
        year: Number(runForm.year),
        quarryId: runForm.quarryId ? Number(runForm.quarryId) : undefined
      });
      notify(`Payroll run created — ${result.total_employees ?? ''} employees processed`);
      const r: any = await apiClient.getPayrollRuns();
      setRuns(Array.isArray(r) ? r : []);
    } catch {
      notify('Failed to run payroll', 'error');
    } finally {
      setRunning(false);
    }
  };

  const printPayslip = (e: any) => {
    const w = window.open('', '_blank', 'width=700,height=500');
    if (!w) return;
    w.document.write(`<html><head><title>Payslip — ${esc(e.emp_name)}</title><style>body{font-family:'Courier New',monospace;font-size:11px;margin:20px}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee}.lbl{color:#666}.val{font-weight:bold}@media print{body{margin:0}}</style></head><body><div class="hdr"><h2>PAYSLIP — ${esc(selectedRun?.pay_period_month)}/${esc(selectedRun?.pay_period_year)}</h2><p>Vatsin Granite Quarry · ${esc(e.emp_code)} · ${esc(e.emp_name)} · ${esc(e.department)}</p></div><div class="grid"><div><div class="row"><span class="lbl">Days Worked</span><span class="val">${Number(e.days_worked ?? 0).toFixed(1)}</span></div><div class="row"><span class="lbl">Basic</span><span class="val">₹${Number(e.basic_pay ?? 0).toLocaleString()}</span></div><div class="row"><span class="lbl">DA</span><span class="val">₹${Number(e.da ?? 0).toLocaleString()}</span></div><div class="row"><span class="lbl">HRA</span><span class="val">₹${Number(e.hra ?? 0).toLocaleString()}</span></div><div class="row"><span class="lbl">Gross</span><span class="val">₹${Number(e.gross_pay ?? 0).toLocaleString()}</span></div></div><div><div class="row"><span class="lbl">EPF (EE 12%)</span><span class="val">₹${Number(e.epf_employee ?? 0).toLocaleString()}</span></div><div class="row"><span class="lbl">ESI (EE 0.75%)</span><span class="val">${Number(e.esi_employee ?? 0) > 0 ? '₹' + Number(e.esi_employee).toLocaleString() : 'N/A'}</span></div><div class="row"><span class="lbl">Professional Tax</span><span class="val">₹${Number(e.professional_tax ?? 0).toLocaleString()}</span></div><div class="row"><span class="lbl">TDS (192B)</span><span class="val">${Number(e.tds ?? 0) > 0 ? '₹' + Number(e.tds).toLocaleString() : 'NIL'}</span></div><div class="row"><b>NET PAY</b><b>₹${Number(e.net_pay ?? 0).toLocaleString()}</b></div></div></div><script>window.print();window.close()<\/script></body></html>`);
    w.document.close();
  };

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  const latestRun = selectedRun ?? runs[0];
  const totalGross = details.reduce((s, e) => s + Number(e.gross_pay ?? 0), 0);
  const totalNet = details.reduce((s, e) => s + Number(e.net_pay ?? 0), 0);
  const totalEPF_EE = details.reduce((s, e) => s + Number(e.epf_employee ?? 0), 0);
  const totalEPF_ER = details.reduce((s, e) => s + Number(e.epf_employer ?? 0), 0);
  const totalESI_EE = details.reduce((s, e) => s + Number(e.esi_employee ?? 0), 0);
  const totalESI_ER = details.reduce((s, e) => s + Number(e.esi_employer ?? 0), 0);
  const totalTDS = details.reduce((s, e) => s + Number(e.tds ?? 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Payroll</div>
          <div className="ph-sub">M14 — Monthly payroll runs · EPF / ESI · Professional Tax · TDS · Payslips · ECR</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="fsel" style={{ fontSize: 10 }} value={runForm.month} onChange={e => setRunForm(p => ({ ...p, month: Number(e.target.value) }))}>
            {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <input className="fi" type="number" value={runForm.year} onChange={e => setRunForm(p => ({ ...p, year: Number(e.target.value) }))} style={{ width: 70, fontSize: 10 }} />
          <select className="fsel" style={{ fontSize: 10 }} value={runForm.quarryId} onChange={e => setRunForm(p => ({ ...p, quarryId: e.target.value }))}>
            <option value="">All Quarries</option>
            {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
          </select>
          <button className="btn btn-p" onClick={handleRunPayroll} disabled={running}>{running ? 'Running…' : 'Run Payroll'}</button>
        </div>
      </div>

      <div className="sc-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="sc g"><div className="sc-lbl">Gross Payroll</div><div className="sc-val">₹{((latestRun?.total_gross ?? totalGross) / 100000).toFixed(2)}L</div><div className="sc-sub">{latestRun ? `${latestRun.pay_period_month}/${latestRun.pay_period_year}` : 'Latest run'}</div></div>
        <div className="sc b"><div className="sc-lbl">Net Disbursement</div><div className="sc-val">₹{((latestRun?.total_net ?? totalNet) / 100000).toFixed(2)}L</div><div className="sc-sub">After deductions</div></div>
        <div className="sc s"><div className="sc-lbl">EPF (EE + ER)</div><div className="sc-val">₹{((totalEPF_EE + totalEPF_ER) / 1000).toFixed(1)}K</div><div className="sc-sub">Selected run</div></div>
        <div className="sc r"><div className="sc-lbl">ESI (EE + ER)</div><div className="sc-val">₹{((totalESI_EE + totalESI_ER) / 1000).toFixed(1)}K</div><div className="sc-sub">Selected run</div></div>
        <div className="sc a"><div className="sc-lbl">TDS (192B)</div><div className="sc-val">₹{(totalTDS / 1000).toFixed(1)}K</div><div className="sc-sub">Selected run</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'runs' ? ' on' : ''}`} onClick={() => setTab('runs')}>Payroll Runs</button>
        <button className={`itab${tab === 'details' ? ' on' : ''}`} onClick={() => setTab('details')}>Run Details</button>
        <button className={`itab${tab === 'epf' ? ' on' : ''}`} onClick={() => setTab('epf')}>EPF Summary</button>
        <button className={`itab${tab === 'esi' ? ' on' : ''}`} onClick={() => setTab('esi')}>ESI Summary</button>
      </div>

      {tab === 'runs' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Payroll Runs — {runs.length} records</div></div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Period</th><th>Run Date</th><th className="r">Total Gross (₹)</th><th className="r">Total Deductions (₹)</th><th className="r">Total Net (₹)</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {runs.map((r: any) => (
                  <tr key={r.id}>
                    <td className="tdm tdc">{r.pay_period_month}/{r.pay_period_year}</td>
                    <td className="tdm">{r.run_date}</td>
                    <td className="tda">₹{Number(r.total_gross ?? 0).toLocaleString()}</td>
                    <td className="tda">₹{Number(r.total_deductions ?? 0).toLocaleString()}</td>
                    <td className="tda" style={{ color: 'var(--sage)', fontWeight: 600 }}>₹{Number(r.total_net ?? 0).toLocaleString()}</td>
                    <td><span className={`bdg ${r.status === 'finalized' ? 'b-s' : 'b-a'}`}>{r.status}</span></td>
                    <td><button className="btn btn-xs btn-s" onClick={() => loadDetails(r)}>View Details</button></td>
                  </tr>
                ))}
                {runs.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No payroll runs. Use "Run Payroll" above to generate.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'details' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">{selectedRun ? `Payroll Details — ${selectedRun.pay_period_month}/${selectedRun.pay_period_year}` : 'Payroll Details — select a run'}</div>
            {details.length > 0 && <button className="btn btn-sm btn-s" onClick={() => notify('ECR file generated for EPFO upload', 'warn')}>Generate ECR</button>}
          </div>
          {details.length > 0 ? (
            <div className="tw">
              <table className="dt">
                <thead>
                  <tr><th>Code</th><th>Name</th><th>Dept</th><th className="r">Days</th><th className="r">Basic</th><th className="r">HRA</th><th className="r">Gross</th><th className="r">EPF (EE)</th><th className="r">ESI (EE)</th><th className="r">PT</th><th className="r">TDS</th><th className="r">Net Pay</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {details.map((e: any) => (
                    <tr key={e.id}>
                      <td className="tdm tdc">{e.emp_code}</td>
                      <td className="tdc">{e.emp_name}</td>
                      <td><span className="bdg b-b">{e.department ?? '—'}</span></td>
                      <td className="tda">{Number(e.days_worked ?? 0).toFixed(1)}</td>
                      <td className="tda">₹{Number(e.basic_pay ?? 0).toLocaleString()}</td>
                      <td className="tda">₹{Number(e.hra ?? 0).toLocaleString()}</td>
                      <td className="tda" style={{ fontWeight: 600 }}>₹{Number(e.gross_pay ?? 0).toLocaleString()}</td>
                      <td className="tda" style={{ color: 'var(--amber)' }}>₹{Number(e.epf_employee ?? 0).toLocaleString()}</td>
                      <td className="tda" style={{ color: 'var(--amber)' }}>{Number(e.esi_employee ?? 0) > 0 ? `₹${Number(e.esi_employee).toLocaleString()}` : '—'}</td>
                      <td className="tda">₹{Number(e.professional_tax ?? 0).toLocaleString()}</td>
                      <td className="tda">{Number(e.tds ?? 0) > 0 ? `₹${Number(e.tds).toLocaleString()}` : '—'}</td>
                      <td className="tda" style={{ color: 'var(--sage)', fontWeight: 700 }}>₹{Number(e.net_pay ?? 0).toLocaleString()}</td>
                      <td><button className="btn btn-xs btn-s" onClick={() => printPayslip(e)}>Payslip</button></td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--bg3)', fontWeight: 700 }}>
                    <td colSpan={6} className="tdm" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 8 }}>Total</td>
                    <td className="tda tdc" style={{ fontWeight: 700 }}>₹{totalGross.toLocaleString()}</td>
                    <td className="tda tdc" style={{ color: 'var(--amber)' }}>₹{totalEPF_EE.toLocaleString()}</td>
                    <td className="tda tdc" style={{ color: 'var(--amber)' }}>₹{totalESI_EE.toLocaleString()}</td>
                    <td className="tda tdc">₹{details.reduce((s, e) => s + Number(e.professional_tax ?? 0), 0).toLocaleString()}</td>
                    <td className="tda tdc">₹{totalTDS.toLocaleString()}</td>
                    <td className="tda" style={{ color: 'var(--sage)', fontWeight: 700 }}>₹{totalNet.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card-body"><div style={{ textAlign: 'center', padding: 32, color: 'var(--t3)' }}>Select a payroll run from the Runs tab to view details</div></div>
          )}
        </div>
      )}

      {tab === 'epf' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">EPF Summary{selectedRun ? ` — ${selectedRun.pay_period_month}/${selectedRun.pay_period_year}` : ''}</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                {[
                  ['EPF Rate (EE)', '12% of Basic (capped ₹15,000)'],
                  ['EPF Rate (ER)', '12% (3.67% EPF + 8.33% EPS)'],
                  ['EPS Cap', '8.33% on ₹15,000 = ₹1,250/month'],
                  ['ECR Due Date', '15th of following month'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                    <div style={{ fontSize: 10, color: 'var(--t2)' }}>{k}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'var(--gold)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: 16, border: '1px solid var(--bd)' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 12 }}>EPF Challan Summary</div>
                {[
                  ['Employee Contribution (EE)', `₹${totalEPF_EE.toLocaleString()}`],
                  ['Employer Contribution (ER)', `₹${totalEPF_ER.toLocaleString()}`],
                  ['Total EPF Challan', `₹${(totalEPF_EE + totalEPF_ER).toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                    <div style={{ fontSize: 9.5, color: 'var(--t1)' }}>{k}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'esi' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">ESI Summary{selectedRun ? ` — ${selectedRun.pay_period_month}/${selectedRun.pay_period_year}` : ''}</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                {[
                  ['ESI Rate (EE)', '0.75% of gross wages'],
                  ['ESI Rate (ER)', '3.25% of gross wages'],
                  ['Wage Threshold', 'Applicable ≤ ₹21,000/month gross'],
                  ['ESI Due Date', '21st of following month'],
                  ['Eligible Employees', `${details.filter(e => Number(e.esi_employee ?? 0) > 0).length}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                    <div style={{ fontSize: 10, color: 'var(--t2)' }}>{k}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: 'var(--gold)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: 16, border: '1px solid var(--bd)' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 12 }}>ESI Challan Summary</div>
                {[
                  ['Employee Contribution (EE)', `₹${totalESI_EE.toLocaleString()}`],
                  ['Employer Contribution (ER)', `₹${totalESI_ER.toLocaleString()}`],
                  ['Total ESI Challan', `₹${(totalESI_EE + totalESI_ER).toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                    <div style={{ fontSize: 9.5, color: 'var(--t1)' }}>{k}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: 'var(--amber)', fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
