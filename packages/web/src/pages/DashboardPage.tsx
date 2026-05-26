import { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';

function fmt(n: number, unit = '') {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + (unit ? ' ' + unit : '');
}

function fmtMoney(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

export default function DashboardPage() {
  const [quarries, setQuarries] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [qRes, bRes, sRes] = await Promise.all([
          apiClient.getQuarries(),
          apiClient.getBlocks({ limit: 5, status: 'available' }),
          apiClient.getFinanceSummary(),
        ]);
        setQuarries(Array.isArray(qRes) ? qRes : (qRes as any).quarries ?? []);
        setBlocks((bRes as any).blocks ?? []);
        setSummary(sRes);
      } catch { /* show empty state */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const activeQ = quarries.filter(q => q.operational_status === 'active');
  const availableBlocks = blocks.filter((b: any) => b.status === 'available');
  const availCbm = availableBlocks.reduce((s: number, b: any) => s + (Number(b.net_cbm) || 0), 0);
  const receivables = summary?.receivables ?? summary?.total_receivables ?? 0;
  const production = summary?.production_cbm ?? summary?.month_production ?? 0;
  const royalty = summary?.royalty_payable ?? 0;

  return (
    <div className="page">
      <div className="ph-title">Dashboard</div>
      <div className="ph-sub">Vatsin Granite Quarry · Real-time Operations Overview · FY 2025-26</div>

      {loading && <div style={{ color: 'var(--t3)', fontSize: 11, padding: '8px 0' }}>Loading…</div>}

      <div className="sc-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <div className="sc r">
          <div className="sc-lbl">Active Quarries</div>
          <div className="sc-val">{activeQ.length}</div>
          <div className="sc-sub">Operational sites</div>
        </div>
        <div className="sc g">
          <div className="sc-lbl">Available Blocks</div>
          <div className="sc-val">{availableBlocks.length}</div>
          <div className="sc-sub">In stockyard</div>
        </div>
        <div className="sc s">
          <div className="sc-lbl">Available CBM</div>
          <div className="sc-val">{fmt(availCbm)}</div>
          <div className="sc-sub">Net cubic metres</div>
        </div>
        <div className="sc b">
          <div className="sc-lbl">Production</div>
          <div className="sc-val">{fmt(production)}</div>
          <div className="sc-sub">m³ this period</div>
        </div>
        <div className="sc r">
          <div className="sc-lbl">Royalty Payable</div>
          <div className="sc-val">{royalty ? fmtMoney(royalty) : '—'}</div>
          <div className="sc-sub">Estimated</div>
        </div>
        <div className="sc a">
          <div className="sc-lbl">Receivables</div>
          <div className="sc-val">{receivables ? fmtMoney(receivables) : '—'}</div>
          <div className="sc-sub">Outstanding</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Quarry Sites</div>
            <a href="/quarries" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'var(--rust)', letterSpacing: 1 }}>VIEW ALL →</a>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {quarries.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--t3)', fontSize: 11 }}>No quarries found</div>
            ) : (
              <table className="dt">
                <thead>
                  <tr><th>Code</th><th>Name</th><th>Mineral</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {quarries.map(q => (
                    <tr key={q.id}>
                      <td className="tdm">{q.quarry_code}</td>
                      <td className="tdc">{q.quarry_name}</td>
                      <td>{q.mineral_type}</td>
                      <td><span className={`bdg ${q.operational_status === 'active' ? 'b-s' : 'b-d'}`}>{q.operational_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Block Stockyard</div>
            <a href="/blocks" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: 'var(--rust)', letterSpacing: 1 }}>ALL BLOCKS →</a>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {blocks.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--t3)', fontSize: 11 }}>No available blocks</div>
            ) : (
              <table className="dt">
                <thead>
                  <tr><th>Block No</th><th>Color / Variety</th><th>Grade</th><th className="r">CBM</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {blocks.slice(0, 5).map((b: any) => (
                    <tr key={b.id}>
                      <td className="tdm">{b.block_no}</td>
                      <td style={{ fontSize: 10 }}>{b.variety_name ?? b.color ?? '—'}</td>
                      <td><span className="bdg b-b">{b.grade ?? '—'}</span></td>
                      <td className="tda">{Number(b.net_cbm || 0).toFixed(3)}</td>
                      <td>
                        <span className={`bdg ${b.status === 'available' ? 'b-s' : b.status === 'reserved' ? 'b-a' : b.status === 'dispatched' ? 'b-g' : 'b-d'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Quick Actions</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { lbl: 'Log Production', path: '/production', icon: '◉' },
                { lbl: 'New Blast Event', path: '/blasting', icon: '◢' },
                { lbl: 'Weigh Block', path: '/weighbridge', icon: '⊞' },
                { lbl: 'Create Invoice', path: '/invoices', icon: '◳' },
                { lbl: 'Run Payroll', path: '/payroll', icon: '◑' },
                { lbl: 'Royalty Challan', path: '/royalty', icon: '◑' },
              ].map(a => (
                <a
                  key={a.path}
                  href={a.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
                    background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 4,
                    color: 'var(--t2)', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ color: 'var(--rust)' }}>{a.icon}</span> {a.lbl}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
