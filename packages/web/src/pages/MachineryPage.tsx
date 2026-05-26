import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const CATEGORIES = ['Excavator', 'Drill', 'Compressor', 'Wire Saw', 'Tipper', 'DG Set', 'Loader', 'Other'];
const STATUSES = ['active', 'breakdown', 'idle', 'sold'];
const BLANK = { assetNo: '', assetName: '', make: '', model: '', assetCategory: 'Excavator', operationalStatus: 'active', hourMeterReading: '', insuranceExpiryDate: '', fitnessExpiryDate: '', purchaseCost: '', purchaseDate: '' };

export default function MachineryPage() {
  const { notify } = useToastStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(BLANK);

  useEffect(() => {
    Promise.all([apiClient.getQuarries(), apiClient.getAssets()])
      .then(([q, a]: any) => {
        setQuarries(q.quarries ?? q);
        setAssets(Array.isArray(a) ? a : (a.assets ?? []));
      })
      .catch(() => notify('Failed to load assets', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    apiClient.getAssets()
      .then((a: any) => setAssets(Array.isArray(a) ? a : (a.assets ?? [])))
      .catch(() => notify('Failed to reload', 'error'));
  };

  const today = new Date();
  const daysUntil = (d: string) => d ? Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000) : 999;

  const displayed = assets.filter((a: any) =>
    !search || a.asset_name?.toLowerCase().includes(search.toLowerCase()) || a.asset_no?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm({ ...BLANK, currentQuarryId: quarries[0]?.id || '' }); setEditId(null); setShowModal(true); };
  const openEdit = (a: any) => {
    setForm({ assetNo: a.asset_no, assetName: a.asset_name, make: a.make || '', model: a.model || '', assetCategory: a.asset_category || 'Other', operationalStatus: a.operational_status, hourMeterReading: a.hour_meter_reading || '', insuranceExpiryDate: a.insurance_expiry_date || '', fitnessExpiryDate: a.fitness_expiry_date || '', purchaseCost: a.purchase_cost || '', purchaseDate: a.purchase_date || '', currentQuarryId: a.current_quarry_id || '' });
    setEditId(a.id); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.assetNo || !form.assetName) { notify('Asset No. and Name are required', 'error'); return; }
    try {
      const payload = {
        assetNo: form.assetNo,
        assetName: form.assetName,
        assetCategory: form.assetCategory,
        make: form.make,
        model: form.model,
        currentQuarryId: form.currentQuarryId ? Number(form.currentQuarryId) : undefined,
        operationalStatus: form.operationalStatus,
        hourMeterReading: Number(form.hourMeterReading) || 0,
        insuranceExpiryDate: form.insuranceExpiryDate || undefined,
        fitnessExpiryDate: form.fitnessExpiryDate || undefined,
        purchaseCost: parseFloat(form.purchaseCost) || undefined,
        purchaseDate: form.purchaseDate || undefined
      };
      if (editId !== null) {
        await apiClient.updateAsset(editId, payload);
        notify('Asset updated');
      } else {
        await apiClient.createAsset(payload);
        notify('Asset added');
      }
      setShowModal(false);
      reload();
    } catch {
      notify('Failed to save asset', 'error');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await apiClient.updateAsset(id, { operationalStatus: status });
      setAssets(prev => prev.map((a: any) => a.id === id ? { ...a, operational_status: status } : a));
      notify(`Status updated to ${status}`);
    } catch {
      notify('Failed to update status', 'error');
    }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Assets & Machinery</div>
          <div className="ph-sub">M4 — Equipment register · Hour-meter · Insurance & fitness tracking</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="fi" placeholder="Search assets…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 180 }} />
          <button className="btn btn-p" onClick={openAdd}>+ Add Asset</button>
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc r"><div className="sc-lbl">Total Assets</div><div className="sc-val">{assets.length}</div><div className="sc-sub">All equipment</div></div>
        <div className="sc s"><div className="sc-lbl">Operational</div><div className="sc-val">{assets.filter((a: any) => a.operational_status === 'active').length}</div><div className="sc-sub">Active</div></div>
        <div className="sc a"><div className="sc-lbl">Breakdown</div><div className="sc-val">{assets.filter((a: any) => a.operational_status === 'breakdown').length}</div><div className="sc-sub">Under repair</div></div>
        <div className="sc g"><div className="sc-lbl">Insurance Expiring</div><div className="sc-val">{assets.filter((a: any) => daysUntil(a.insurance_expiry_date) <= 60).length}</div><div className="sc-sub">Within 60 days</div></div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Asset Register — {displayed.length} records</div></div>
        <div className="tw">
          <table className="dt">
            <thead>
              <tr><th>Asset No.</th><th>Name</th><th>Category</th><th>Make / Model</th><th className="r">Hours</th><th>Insurance Exp.</th><th>Fitness Exp.</th><th className="r">Cost (₹)</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {displayed.map((a: any) => {
                const insWarn = daysUntil(a.insurance_expiry_date) <= 60;
                const fitWarn = a.fitness_expiry_date && daysUntil(a.fitness_expiry_date) <= 60;
                return (
                  <tr key={a.id}>
                    <td className="tdm tdc">{a.asset_no}</td>
                    <td className="tdc">{a.asset_name}</td>
                    <td><span className="bdg b-g">{a.asset_category}</span></td>
                    <td className="tdm">{a.make} {a.model}</td>
                    <td className="tda">{Number(a.hour_meter_reading).toLocaleString()}</td>
                    <td className="tdm" style={{ color: insWarn ? 'var(--amber)' : undefined }}>{a.insurance_expiry_date || '--'}{insWarn ? ' ⚠' : ''}</td>
                    <td className="tdm" style={{ color: fitWarn ? 'var(--amber)' : undefined }}>{a.fitness_expiry_date || 'N/A'}</td>
                    <td className="tda">{a.purchase_cost ? `₹${(Number(a.purchase_cost) / 100000).toFixed(1)}L` : '--'}</td>
                    <td>
                      <select className="fsel" style={{ fontSize: 9, padding: '2px 4px', width: 90 }} value={a.operational_status} onChange={e => handleStatusChange(a.id, e.target.value)}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-xs btn-s" onClick={() => openEdit(a)}>Edit</button>
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No assets registered</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modal-head">
              <div className="modal-title">{editId ? 'Edit Asset' : 'Add New Asset'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Asset No. *</label><input className="fi" value={form.assetNo} onChange={f('assetNo')} placeholder="EXC-001" /></div>
                <div className="fg"><label className="fl">Category</label>
                  <select className="fsel" value={form.assetCategory} onChange={f('assetCategory')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                </div>
              </div>
              <div className="fg"><label className="fl">Asset Name *</label><input className="fi" value={form.assetName} onChange={f('assetName')} placeholder="e.g. Komatsu PC200 Excavator" /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">Make</label><input className="fi" value={form.make} onChange={f('make')} placeholder="Komatsu" /></div>
                <div className="fg"><label className="fl">Model</label><input className="fi" value={form.model} onChange={f('model')} placeholder="PC200-8" /></div>
              </div>
              <div className="fg">
                <label className="fl">Quarry</label>
                <select className="fsel" value={form.currentQuarryId} onChange={f('currentQuarryId')}>
                  <option value="">Select quarry…</option>
                  {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Purchase Cost (₹)</label><input className="fi" type="number" value={form.purchaseCost} onChange={f('purchaseCost')} placeholder="4500000" /></div>
                <div className="fg"><label className="fl">Purchase Date</label><input className="fi" type="date" value={form.purchaseDate} onChange={f('purchaseDate')} /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Hour Meter Reading</label><input className="fi" type="number" value={form.hourMeterReading} onChange={f('hourMeterReading')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Status</label>
                  <select className="fsel" value={form.operationalStatus} onChange={f('operationalStatus')}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
                </div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Insurance Expiry</label><input className="fi" type="date" value={form.insuranceExpiryDate} onChange={f('insuranceExpiryDate')} /></div>
                <div className="fg"><label className="fl">Fitness Certificate Expiry</label><input className="fi" type="date" value={form.fitnessExpiryDate} onChange={f('fitnessExpiryDate')} /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editId ? 'Update Asset' : 'Add Asset'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
