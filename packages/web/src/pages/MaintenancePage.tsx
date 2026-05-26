import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const JOB_TYPES = [{ value: 'preventive', label: 'Preventive Maintenance (PM)' }, { value: 'corrective', label: 'Breakdown (BD)' }, { value: 'predictive', label: 'Predictive' }];
const STATUSES = ['upcoming', 'open', 'in_progress', 'completed', 'cancelled'];
const BLANK = { jobType: 'preventive', assetId: '', description: '', status: 'upcoming', downtimeHours: '', labourCost: '', partsCost: '', scheduledDate: '', completedAt: '' };

export default function MaintenancePage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'pm' | 'bd' | 'schedule'>('pm');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(BLANK);

  useEffect(() => {
    Promise.all([apiClient.getAssets(), apiClient.getMaintenanceJobs()])
      .then(([a, m]: any) => {
        setAssets(Array.isArray(a) ? a : (a.assets ?? []));
        setJobs(m.jobs ?? []);
      })
      .catch(() => notify('Failed to load maintenance data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    apiClient.getMaintenanceJobs()
      .then((m: any) => setJobs(m.jobs ?? []))
      .catch(() => notify('Failed to reload', 'error'));
  };

  const pmJobs = jobs.filter((j: any) => j.job_type === 'preventive' || j.job_type === 'predictive');
  const bdJobs = jobs.filter((j: any) => j.job_type === 'corrective');
  const completedPM = pmJobs.filter((j: any) => j.status === 'completed').length;

  const openAdd = (type: 'preventive' | 'corrective') => { setForm({ ...BLANK, jobType: type, assetId: assets[0]?.id || '' }); setEditId(null); setShowModal(true); };
  const openEdit = (j: any) => {
    setForm({ jobType: j.job_type, assetId: j.asset_id, description: j.description || '', status: j.status, downtimeHours: j.downtime_hours || '', labourCost: j.labour_cost || '', partsCost: j.parts_cost || '', scheduledDate: j.scheduled_date || '', completedAt: j.completed_at?.slice(0, 10) || '' });
    setEditId(j.id); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.assetId || !form.description) { notify('Asset and description are required', 'error'); return; }
    const asset = assets.find((a: any) => a.id === Number(form.assetId));
    try {
      const payload = {
        quarryId: asset?.current_quarry_id,
        assetId: Number(form.assetId),
        jobType: form.jobType,
        description: form.description,
        status: form.status,
        scheduledDate: form.scheduledDate || undefined,
        completedAt: form.completedAt ? `${form.completedAt}T00:00:00.000Z` : undefined,
        labourCost: parseFloat(form.labourCost) || 0,
        partsCost: parseFloat(form.partsCost) || 0,
        downtimeHours: parseFloat(form.downtimeHours) || 0
      };
      if (editId !== null) {
        await apiClient.updateMaintenanceJob(editId, payload);
        notify('Job card updated');
      } else {
        await apiClient.createMaintenanceJob(payload);
        notify('Job card created');
      }
      setShowModal(false);
      reload();
    } catch {
      notify('Failed to save job card', 'error');
    }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const renderTable = (list: any[]) => (
    <div className="tw">
      <table className="dt">
        <thead>
          <tr><th>Job No.</th><th>Asset</th><th>Description</th><th className="r">Downtime (h)</th><th>Scheduled</th><th className="r">Labour (₹)</th><th className="r">Parts (₹)</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {list.map((j: any) => (
            <tr key={j.id}>
              <td className="tdm tdc">{j.job_no}</td>
              <td>{j.asset_name} <span style={{ fontSize: 9, color: 'var(--t3)' }}>({j.asset_no})</span></td>
              <td>{j.description}</td>
              <td className="tda">{j.downtime_hours || '--'}</td>
              <td className="tdm">{j.scheduled_date || '--'}</td>
              <td className="tda">{j.labour_cost ? `₹${Number(j.labour_cost).toLocaleString()}` : '--'}</td>
              <td className="tda">{j.parts_cost ? `₹${Number(j.parts_cost).toLocaleString()}` : '--'}</td>
              <td><span className={`bdg ${j.status === 'completed' ? 'b-s' : j.status === 'in_progress' ? 'b-b' : j.status === 'open' || j.status === 'upcoming' ? 'b-a' : 'b-d'}`}>{j.status}</span></td>
              <td>
                <button className="btn btn-xs btn-s" onClick={() => openEdit(j)}>Edit</button>
              </td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No jobs</td></tr>}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Maintenance</div>
          <div className="ph-sub">M5 — Preventive maintenance · Breakdown jobs · PM compliance · MTBF / MTTR</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-s" onClick={() => openAdd('corrective')}>+ Breakdown Job</button>
          <button className="btn btn-p" onClick={() => openAdd('preventive')}>+ PM Job Card</button>
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc s"><div className="sc-lbl">PM Compliance</div><div className="sc-val">{pmJobs.length ? Math.round((completedPM / pmJobs.length) * 100) : 0}%</div><div className="sc-sub">Target: &gt;95%</div></div>
        <div className="sc r"><div className="sc-lbl">Open Breakdowns</div><div className="sc-val">{bdJobs.filter((j: any) => j.status === 'in_progress' || j.status === 'open').length}</div><div className="sc-sub">In progress</div></div>
        <div className="sc a"><div className="sc-lbl">PM Due</div><div className="sc-val">{pmJobs.filter((j: any) => j.status === 'open').length}</div><div className="sc-sub">Overdue</div></div>
        <div className="sc g"><div className="sc-lbl">Upcoming PM</div><div className="sc-val">{pmJobs.filter((j: any) => j.status === 'upcoming').length}</div><div className="sc-sub">Scheduled</div></div>
      </div>

      <div className="itabs">
        {([['pm', 'Preventive Maintenance'], ['bd', 'Breakdown Jobs'], ['schedule', 'PM Schedule']] as const).map(([k, l]) => (
          <button key={k} className={`itab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">{tab === 'pm' ? `PM Jobs — ${pmJobs.length} records` : tab === 'bd' ? `Breakdown Jobs — ${bdJobs.length} records` : 'PM Schedule Matrix'}</div>
        </div>
        {tab === 'pm' && renderTable(pmJobs)}
        {tab === 'bd' && renderTable(bdJobs)}
        {tab === 'schedule' && (
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {['250hr', '500hr', '1000hr', '2000hr', 'Annual'].map(sched => (
                <div key={sched} style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 4, padding: '10px 12px' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7.5, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>{sched}</div>
                  {assets.slice(0, 5).map((a: any) => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
                      <span style={{ color: 'var(--t3)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 8 }}>{a.asset_no}</span>
                      <span className="bdg b-s" style={{ fontSize: 7 }}>OK</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div className="modal-head">
              <div className="modal-title">{editId ? 'Edit Job Card' : `New ${form.jobType === 'preventive' ? 'PM' : 'Breakdown'} Job Card`}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Type</label>
                  <select className="fsel" value={form.jobType} onChange={f('jobType')}>
                    {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">Status</label>
                  <select className="fsel" value={form.status} onChange={f('status')}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg">
                <label className="fl">Asset *</label>
                <select className="fsel" value={form.assetId} onChange={f('assetId')}>
                  <option value="">Select asset…</option>
                  {assets.map((a: any) => <option key={a.id} value={a.id}>{a.asset_name} ({a.asset_no})</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Description *</label>
                <input className="fi" value={form.description} onChange={f('description')} placeholder="e.g. 500hr engine oil change" />
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Downtime (hrs)</label><input className="fi" type="number" value={form.downtimeHours} onChange={f('downtimeHours')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Labour Cost (₹)</label><input className="fi" type="number" value={form.labourCost} onChange={f('labourCost')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Parts Cost (₹)</label><input className="fi" type="number" value={form.partsCost} onChange={f('partsCost')} placeholder="0" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Scheduled Date</label><input className="fi" type="date" value={form.scheduledDate} onChange={f('scheduledDate')} /></div>
                <div className="fg"><label className="fl">Completed Date</label><input className="fi" type="date" value={form.completedAt} onChange={f('completedAt')} /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editId ? 'Update' : 'Create Job Card'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
