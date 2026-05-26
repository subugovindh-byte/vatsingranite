import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const PERMIT_TYPES = ['ML', 'MDP', 'EC', 'PESO', 'TNPCB', 'Factory', 'Other'];
const PERMIT_STATUSES = ['active', 'expired', 'renewal_pending'];
const BLANK = { name: '', type: 'ML', authority: '', reference: '', issued: '', valid_till: '', area_ha: '', quarry: 'Vatsin Granite', renewal_lead_months: '6', status: 'active', notes: '' };

export default function PermitsPage() {
  const { notify } = useToastStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(BLANK);

  const [permits, setPermits] = useState<any[]>([]);

  useEffect(() => {
    apiClient.getPermits().then(r => setPermits(Array.isArray(r) ? r : r.permits ?? [])).catch(() => {});
  }, []);

  const today = new Date('2026-05-23');
  const getMonthsLeft = (valid_till: string) => {
    const d = new Date(valid_till);
    return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.5));
  };
  const getStatusColor = (p: any) => {
    if (p.status === 'expired') return 'b-r';
    const ml = getMonthsLeft(p.valid_till);
    if (ml <= p.renewal_lead_months) return 'b-a';
    return 'b-s';
  };
  const getStatusLabel = (p: any) => {
    if (p.status === 'expired') return 'EXPIRED';
    const ml = getMonthsLeft(p.valid_till);
    if (ml <= p.renewal_lead_months) return 'RENEWAL DUE';
    return 'ACTIVE';
  };

  const nextId = () => {
    const nums = permits.map(p => parseInt(p.id.replace('PER-', ''))).filter(n => !isNaN(n));
    return `PER-${String(Math.max(...nums, 0) + 1).padStart(3, '0')}`;
  };

  const openAdd = () => { setForm(BLANK); setEditId(null); setShowModal(true); };
  const openEdit = (p: any) => { setForm({ ...p, area_ha: p.area_ha ?? '', renewal_lead_months: String(p.renewal_lead_months) }); setEditId(p.id); setShowModal(true); };

  const handleSave = () => {
    if (!form.name || !form.reference) { notify('Name and reference number are required', 'error'); return; }
    const rec = { ...form, area_ha: form.area_ha ? Number(form.area_ha) : null, renewal_lead_months: Number(form.renewal_lead_months) || 6 };
    if (editId) {
      setPermits(prev => prev.map(p => p.id === editId ? { ...p, ...rec } : p));
      notify('Permit updated');
    } else {
      setPermits(prev => [...prev, { ...rec, id: nextId() }]);
      notify('Permit added');
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => { setPermits(prev => prev.filter(p => p.id !== id)); notify('Permit deleted'); };
  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Permits & Licences</div>
          <div className="ph-sub">M19 — Mining Lease · MDP · EC · PESO · TNPCB · Factory Licence · Lease conditions</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-s" onClick={() => notify('Upload permit document', 'warn')}>Upload Doc</button>
          <button className="btn btn-p" onClick={openAdd}>+ Add Permit</button>
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc g"><div className="sc-lbl">Active Permits</div><div className="sc-val">{permits.filter(p => p.status === 'active').length}</div><div className="sc-sub">of {permits.length} total</div></div>
        <div className="sc r"><div className="sc-lbl">Expired</div><div className="sc-val">{permits.filter(p => p.status === 'expired').length}</div><div className="sc-sub">Immediate action</div></div>
        <div className="sc a"><div className="sc-lbl">Renewal Due</div><div className="sc-val">{permits.filter(p => p.status === 'active' && getMonthsLeft(p.valid_till) <= p.renewal_lead_months).length}</div><div className="sc-sub">Within lead time</div></div>
        <div className="sc b"><div className="sc-lbl">Safe (12+ months)</div><div className="sc-val">{permits.filter(p => p.status === 'active' && getMonthsLeft(p.valid_till) > 12).length}</div><div className="sc-sub">No action needed</div></div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Permits & Licences Register — {permits.length} records</div></div>
        <div className="tw">
          <table className="dt">
            <thead>
              <tr><th>ID</th><th>Permit / Licence</th><th>Type</th><th>Authority</th><th>Reference</th><th>Quarry</th><th>Issued</th><th>Valid Till</th><th className="r">Months Left</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {permits.map(p => {
                const ml = p.status === 'expired' ? 0 : getMonthsLeft(p.valid_till);
                return (
                  <tr key={p.id}>
                    <td className="tdm tdc">{p.id}</td>
                    <td className="tdc" style={{ maxWidth: 180 }}>{p.name}</td>
                    <td><span className={`bdg ${p.type === 'ML' ? 'b-b' : p.type === 'PESO' ? 'b-r' : p.type === 'TNPCB' ? 'b-g' : p.type === 'EC' ? 'b-s' : 'b-d'}`}>{p.type}</span></td>
                    <td style={{ fontSize: 9.5 }}>{p.authority}</td>
                    <td className="tdm" style={{ fontSize: 9 }}>{p.reference}</td>
                    <td style={{ fontSize: 10 }}>{p.quarry}</td>
                    <td className="tdm">{p.issued}</td>
                    <td className="tdm">{p.valid_till}</td>
                    <td className="tda" style={{ color: ml <= 3 ? 'var(--red)' : ml <= 12 ? 'var(--amber)' : 'var(--sage)', fontWeight: 600 }}>
                      {p.status === 'expired' ? 'EXPIRED' : ml}
                    </td>
                    <td><span className={`bdg ${getStatusColor(p)}`}>{getStatusLabel(p)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEdit(p)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDelete(p.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Permit Notes & Conditions</div></div>
        <div className="card-body">
          <div className="fg3">
            {permits.map(p => (
              <div key={p.id} style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 4, borderLeft: `3px solid ${getStatusColor(p) === 'b-r' ? 'var(--red)' : getStatusColor(p) === 'b-a' ? 'var(--amber)' : 'var(--sage)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8.5, color: 'var(--rust)', textTransform: 'uppercase', letterSpacing: 1 }}>{p.id} — {p.name}</div>
                  <span className={`bdg ${getStatusColor(p)}`}>{getStatusLabel(p)}</span>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--t2)' }}>{p.notes}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modal-head">
              <div className="modal-title">{editId ? 'Edit Permit' : 'Add Permit / Licence'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Permit Name *</label><input className="fi" value={form.name} onChange={f('name')} placeholder="Mining Lease" /></div>
                <div className="fg"><label className="fl">Type</label><select className="fsel" value={form.type} onChange={f('type')}>{PERMIT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              </div>
              <div className="fg"><label className="fl">Issuing Authority</label><input className="fi" value={form.authority} onChange={f('authority')} placeholder="Authority name" /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">Reference No. *</label><input className="fi" value={form.reference} onChange={f('reference')} placeholder="ML/KRG/2019/0041" /></div>
                <div className="fg"><label className="fl">Quarry</label><input className="fi" value={form.quarry} onChange={f('quarry')} placeholder="Vatsin Granite" /></div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Issue Date</label><input className="fi" type="date" value={form.issued} onChange={f('issued')} /></div>
                <div className="fg"><label className="fl">Valid Till</label><input className="fi" type="date" value={form.valid_till} onChange={f('valid_till')} /></div>
                <div className="fg"><label className="fl">Status</label><select className="fsel" value={form.status} onChange={f('status')}>{PERMIT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Area (ha)</label><input className="fi" type="number" step="0.1" value={form.area_ha} onChange={f('area_ha')} placeholder="N/A" /></div>
                <div className="fg"><label className="fl">Renewal Lead (months)</label><input className="fi" type="number" value={form.renewal_lead_months} onChange={f('renewal_lead_months')} placeholder="6" /></div>
              </div>
              <div className="fg"><label className="fl">Notes / Conditions</label><input className="fi" value={form.notes} onChange={f('notes')} placeholder="Key conditions, remarks" /></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editId ? 'Update Permit' : 'Add Permit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
