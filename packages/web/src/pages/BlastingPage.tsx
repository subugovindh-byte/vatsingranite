import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const blank = (quarries: any[]) => ({
  quarryId: quarries[0]?.id || '',
  blast_date: new Date().toISOString().slice(0, 10),
  holes_drilled: '',
  hole_depth_m: '',
  hole_diameter_mm: '',
  explosives_consumed_kg: '',
  detonators_used: '',
  estimated_yield_cbm: '',
  actual_yield_cbm: '',
  blaster_cert_no: ''
});

export default function BlastingPage() {
  const { notify } = useToastStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [blasts, setBlasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    Promise.all([apiClient.getQuarries(), apiClient.getBlastEvents()])
      .then(([q, b]: any) => {
        setQuarries(q.quarries ?? q);
        setBlasts(Array.isArray(b) ? b : (b.events ?? []));
      })
      .catch(() => notify('Failed to load blasting data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    apiClient.getBlastEvents()
      .then((b: any) => setBlasts(Array.isArray(b) ? b : (b.events ?? [])))
      .catch(() => notify('Failed to reload', 'error'));
  };

  const totalExplosives = blasts.reduce((s: number, b: any) => s + (b.explosives_consumed_kg || 0), 0);
  const totalYield = blasts.reduce((s: number, b: any) => s + (b.actual_yield_cbm || 0), 0);
  const efficiency = totalExplosives > 0 ? (totalYield / totalExplosives).toFixed(3) : '--';

  const openAdd = () => { setForm(blank(quarries)); setEditId(null); setShowForm(true); };
  const openEdit = (b: any) => {
    setForm({ quarryId: b.quarry_id, blast_date: b.blast_date, holes_drilled: String(b.holes_drilled), hole_depth_m: String(b.hole_depth_m), hole_diameter_mm: String(b.hole_diameter_mm), explosives_consumed_kg: String(b.explosives_consumed_kg), detonators_used: String(b.detonators_used), estimated_yield_cbm: String(b.estimated_yield_cbm), actual_yield_cbm: String(b.actual_yield_cbm), blaster_cert_no: b.blaster_cert_no ?? '' });
    setEditId(b.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.quarryId || !form.blast_date) { notify('Quarry and date are required', 'error'); return; }
    try {
      const payload = {
        quarryId: Number(form.quarryId),
        blastDate: form.blast_date,
        holesDrilled: Number(form.holes_drilled) || 0,
        holeDepthM: parseFloat(form.hole_depth_m) || 0,
        holeDiameterMm: Number(form.hole_diameter_mm) || 0,
        explosivesConsumedKg: parseFloat(form.explosives_consumed_kg) || 0,
        detonatorsUsed: Number(form.detonators_used) || 0,
        estimatedYieldCbm: parseFloat(form.estimated_yield_cbm) || 0,
        actualYieldCbm: parseFloat(form.actual_yield_cbm) || 0,
        blasterCertNo: form.blaster_cert_no
      };
      if (editId !== null) {
        await apiClient.updateBlastEvent(editId, payload);
        notify('Blast event updated');
      } else {
        await apiClient.createBlastEvent(payload);
        notify('Blast event recorded');
      }
      setShowForm(false);
      reload();
    } catch {
      notify('Failed to save blast event', 'error');
    }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Blasting</div>
          <div className="ph-sub">M2 — Blast events · Explosives register · PESO licence · MMR 1961 · Atlas Copco ROC D7C</div>
        </div>
        <button className="btn btn-p" onClick={openAdd}>+ New Blast Event</button>
      </div>

      <div className="sc-grid">
        <div className="sc r"><div className="sc-lbl">Total Blasts</div><div className="sc-val">{blasts.length}</div><div className="sc-sub">All time</div></div>
        <div className="sc g"><div className="sc-lbl">Explosives Used</div><div className="sc-val">{totalExplosives.toFixed(1)} kg</div><div className="sc-sub">Total</div></div>
        <div className="sc s"><div className="sc-lbl">Actual Yield</div><div className="sc-val">{totalYield.toFixed(2)}</div><div className="sc-sub">CBM total</div></div>
        <div className="sc b"><div className="sc-lbl">Efficiency</div><div className="sc-val">{efficiency}</div><div className="sc-sub">CBM / kg explosive</div></div>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <div className="modal-title">{editId !== null ? 'Edit Blast Event' : 'Record Blast Event'}</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Quarry</label><select className="fsel" value={form.quarryId} onChange={f('quarryId')}>{quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}</select></div>
                <div className="fg"><label className="fl">Blast Date</label><input className="fi" type="date" value={form.blast_date} onChange={f('blast_date')} /></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Holes Drilled</label><input className="fi" type="number" value={form.holes_drilled} onChange={f('holes_drilled')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Hole Depth (m)</label><input className="fi" type="number" step="0.1" value={form.hole_depth_m} onChange={f('hole_depth_m')} placeholder="0.0" /></div>
                <div className="fg"><label className="fl">Diameter (mm)</label><input className="fi" type="number" value={form.hole_diameter_mm} onChange={f('hole_diameter_mm')} placeholder="89" /></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Explosives (kg)</label><input className="fi" type="number" step="0.1" value={form.explosives_consumed_kg} onChange={f('explosives_consumed_kg')} placeholder="0.0" /></div>
                <div className="fg"><label className="fl">Detonators</label><input className="fi" type="number" value={form.detonators_used} onChange={f('detonators_used')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Blaster Cert No.</label><input className="fi" value={form.blaster_cert_no} onChange={f('blaster_cert_no')} placeholder="DGMS/TN/SFC/..." /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Est. Yield CBM</label><input className="fi" type="number" step="0.01" value={form.estimated_yield_cbm} onChange={f('estimated_yield_cbm')} placeholder="0.00" /></div>
                <div className="fg"><label className="fl">Actual Yield CBM</label><input className="fi" type="number" step="0.01" value={form.actual_yield_cbm} onChange={f('actual_yield_cbm')} placeholder="0.00" /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editId !== null ? 'Update' : 'Save Blast Event'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="card-title">Blast Register — {blasts.length} events</div>
          <span className="bdg b-a">Explosives Rules 2008 · PESO</span>
        </div>
        <div className="tw">
          <table className="dt">
            <thead>
              <tr><th>Blast No.</th><th>Date</th><th>Quarry</th><th className="r">Holes</th><th className="r">Depth (m)</th><th className="r">Explosives (kg)</th><th className="r">Detonators</th><th className="r">Est. CBM</th><th className="r">Actual CBM</th><th>Blaster Cert</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {blasts.map((b: any) => (
                <tr key={b.id}>
                  <td className="tdm tdc">{b.blast_no}</td>
                  <td className="tdm">{b.blast_date}</td>
                  <td>{b.quarry_name}</td>
                  <td className="tda">{b.holes_drilled}</td>
                  <td className="tda">{Number(b.hole_depth_m).toFixed(1)}</td>
                  <td className="tda">{Number(b.explosives_consumed_kg).toFixed(1)}</td>
                  <td className="tda">{b.detonators_used}</td>
                  <td className="tda">{Number(b.estimated_yield_cbm).toFixed(2)}</td>
                  <td className="tda" style={{ color: 'var(--sage)' }}>{Number(b.actual_yield_cbm).toFixed(2)}</td>
                  <td className="tdm" style={{ fontSize: 9 }}>{b.blaster_cert_no || '--'}</td>
                  <td>
                    <button className="btn btn-xs btn-s" onClick={() => openEdit(b)}>Edit</button>
                  </td>
                </tr>
              ))}
              {blasts.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No blast events yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
