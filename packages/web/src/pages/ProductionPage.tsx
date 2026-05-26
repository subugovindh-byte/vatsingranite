import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const SHIFTS = ['day', 'night', 'general'];
const blank = (quarries: any[]) => ({
  quarryId: quarries[0]?.id || '',
  production_date: new Date().toISOString().slice(0, 10),
  blocks_produced: '',
  gross_cbm: '',
  net_cbm: '',
  shift_type: 'day',
  notes: ''
});

export default function ProductionPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'log' | 'summary'>('log');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    Promise.all([apiClient.getQuarries(), apiClient.getProductionLogs()])
      .then(([q, res]: any) => {
        const qs = q.quarries ?? q;
        setQuarries(qs);
        setLogs(res.logs ?? []);
        setSummary(res.summary);
      })
      .catch(() => notify('Failed to load production data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    apiClient.getProductionLogs()
      .then((res: any) => { setLogs(res.logs ?? []); setSummary(res.summary); })
      .catch(() => notify('Failed to reload', 'error'));
  };

  const today = new Date().toISOString().slice(0, 10);
  const totalCbm = summary?.total_net_cbm ?? 0;
  const totalBlocks = summary?.total_blocks ?? 0;
  const todayCbm = logs.filter(l => l.production_date === today).reduce((s: number, l: any) => s + (l.net_cbm || 0), 0);

  const openAdd = () => { setForm(blank(quarries)); setEditId(null); setShowForm(true); };
  const openEdit = (l: any) => {
    setForm({ quarryId: l.quarry_id, production_date: l.production_date, blocks_produced: String(l.blocks_produced), gross_cbm: String(l.gross_cbm), net_cbm: String(l.net_cbm), shift_type: l.shift_type, notes: l.notes ?? '' });
    setEditId(l.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.quarryId || !form.production_date) { notify('Quarry and date are required', 'error'); return; }
    try {
      const payload = {
        quarryId: Number(form.quarryId),
        productionDate: form.production_date,
        shiftType: form.shift_type,
        blocksProduced: Number(form.blocks_produced) || 0,
        grossCbm: parseFloat(form.gross_cbm) || 0,
        netCbm: parseFloat(form.net_cbm) || 0,
        notes: form.notes
      };
      if (editId !== null) {
        await apiClient.updateProductionLog(editId, payload);
        notify('Production log updated');
      } else {
        await apiClient.createProductionLog(payload);
        notify('Production log added');
      }
      setShowForm(false);
      reload();
    } catch {
      notify('Failed to save production log', 'error');
    }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const byMonth = logs.reduce((acc: any, l: any) => {
    const mon = l.production_date.slice(0, 7);
    if (!acc[mon]) acc[mon] = { blocks: 0, cbm: 0, logs: 0 };
    acc[mon].blocks += l.blocks_produced;
    acc[mon].cbm += l.net_cbm;
    acc[mon].logs++;
    return acc;
  }, {});

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Production</div>
          <div className="ph-sub">M1 — Daily production logs · Block extraction · Bench-wise m³</div>
        </div>
        <button className="btn btn-p" onClick={openAdd}>+ Log Production</button>
      </div>

      <div className="sc-grid">
        <div className="sc r"><div className="sc-lbl">Total Logs</div><div className="sc-val">{logs.length}</div><div className="sc-sub">All time</div></div>
        <div className="sc g"><div className="sc-lbl">Total CBM</div><div className="sc-val">{Number(totalCbm).toFixed(2)}</div><div className="sc-sub">Net cubic metres</div></div>
        <div className="sc s"><div className="sc-lbl">Total Blocks</div><div className="sc-val">{totalBlocks}</div><div className="sc-sub">Produced</div></div>
        <div className="sc b"><div className="sc-lbl">Today</div><div className="sc-val">{todayCbm > 0 ? todayCbm.toFixed(2) : '--'}</div><div className="sc-sub">CBM logged today</div></div>
      </div>

      <div className="itabs">
        {(['log', 'summary'] as const).map(t => (
          <button key={t} className={`itab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t === 'log' ? 'Daily Production Log' : 'Monthly Summary'}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{editId !== null ? 'Edit Production Log' : 'Log Production'}</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg">
                <label className="fl">Quarry</label>
                <select className="fsel" value={form.quarryId} onChange={f('quarryId')}>
                  {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={form.production_date} onChange={f('production_date')} /></div>
                <div className="fg"><label className="fl">Shift</label><select className="fsel" value={form.shift_type} onChange={f('shift_type')}>{SHIFTS.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Blocks Produced</label><input className="fi" type="number" value={form.blocks_produced} onChange={f('blocks_produced')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Gross CBM</label><input className="fi" type="number" step="0.01" value={form.gross_cbm} onChange={f('gross_cbm')} placeholder="0.00" /></div>
                <div className="fg"><label className="fl">Net CBM</label><input className="fi" type="number" step="0.01" value={form.net_cbm} onChange={f('net_cbm')} placeholder="0.00" /></div>
              </div>
              <div className="fg"><label className="fl">Notes</label><input className="fi" type="text" value={form.notes} onChange={f('notes')} placeholder="Bench details, observations…" /></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editId !== null ? 'Update Log' : 'Save Log'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Production Logs — {logs.length} records</div></div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Date</th><th>Quarry</th><th>Shift</th><th className="r">Blocks</th><th className="r">Gross CBM</th><th className="r">Net CBM</th><th>Notes</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {logs.map((l: any) => (
                  <tr key={l.id}>
                    <td className="tdm">{l.production_date}</td>
                    <td className="tdc">{l.quarry_name}</td>
                    <td><span className="bdg b-d">{l.shift_type}</span></td>
                    <td className="tda">{l.blocks_produced}</td>
                    <td className="tda">{Number(l.gross_cbm).toFixed(2)}</td>
                    <td className="tda">{Number(l.net_cbm).toFixed(2)}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>{l.notes || '--'}</td>
                    <td>
                      <button className="btn btn-xs btn-s" onClick={() => openEdit(l)}>Edit</button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No production logs yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'summary' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Monthly Summary</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Month</th><th className="r">Logs</th><th className="r">Total Blocks</th><th className="r">Net CBM</th><th className="r">Avg CBM/Block</th></tr></thead>
              <tbody>
                {(Object.entries(byMonth) as [string, any][]).sort((a, b) => b[0].localeCompare(a[0])).map(([mon, d]) => (
                  <tr key={mon}>
                    <td className="tdm">{mon}</td>
                    <td className="tda">{d.logs}</td>
                    <td className="tda">{d.blocks}</td>
                    <td className="tda" style={{ color: 'var(--sage)', fontWeight: 600 }}>{d.cbm.toFixed(2)}</td>
                    <td className="tda">{d.blocks ? (d.cbm / d.blocks).toFixed(2) : '--'}</td>
                  </tr>
                ))}
                {Object.keys(byMonth).length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
