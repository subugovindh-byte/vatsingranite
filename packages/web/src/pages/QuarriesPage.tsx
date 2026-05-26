import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const BLANK = { quarryName: '', quarryCode: '', quarryType: 'opencast', district: '', state: 'Tamil Nadu', village: '', taluk: '', address: '', gstin: '', operationalStatus: 'active', dgmsRegistrationNo: '', ibmCode: '', commencementDate: '' };

export default function QuarriesPage() {
  const { notify } = useToastStore();
  const [search, setSearch] = useState('');
  const [quarries, setQuarries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(BLANK);
  const [busy, setBusy] = useState<number | null>(null);

  const load = () => {
    apiClient.getQuarries()
      .then((q: any) => setQuarries(q.quarries ?? q))
      .catch(() => notify('Failed to load quarries', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = quarries.filter(q =>
    !search || q.quarry_name?.toLowerCase().includes(search.toLowerCase()) || q.quarry_code?.toLowerCase().includes(search.toLowerCase())
  );

  const active = quarries.filter(q => (q.operational_status ?? q.status) === 'active');

  const openAdd = () => { setForm(BLANK); setEditId(null); setShowModal(true); };
  const openEdit = (q: any) => {
    setForm({
      quarryName: q.quarry_name ?? '', quarryCode: q.quarry_code ?? '',
      quarryType: q.quarry_type ?? 'opencast', district: q.district ?? '',
      state: q.state ?? 'Tamil Nadu', village: q.village ?? '', taluk: q.taluk ?? '',
      address: q.address ?? '', gstin: q.gstin ?? '',
      operationalStatus: q.operational_status ?? 'active',
      dgmsRegistrationNo: q.dgms_registration_no ?? '', ibmCode: q.ibm_code ?? '',
      commencementDate: q.commencement_date ?? ''
    });
    setEditId(q.id); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.quarryName || !form.quarryCode) { notify('Quarry name and code are required', 'error'); return; }
    try {
      if (editId !== null) {
        await apiClient.updateQuarry(editId, form);
        notify('Quarry updated');
      } else {
        await apiClient.createQuarry(form);
        notify('Quarry created');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      notify(err?.message || 'Failed to save quarry', 'error');
    }
  };

  const handleSetDefault = async (q: any) => {
    setBusy(q.id);
    try {
      await apiClient.setDefaultQuarry(q.id);
      notify(`"${q.quarry_name}" is now the default quarry`);
      load();
    } catch (err: any) {
      notify(err?.message || 'Failed to set default', 'error');
    } finally { setBusy(null); }
  };

  const handleRemove = async (q: any) => {
    if (!window.confirm(`Remove quarry "${q.quarry_name}"?\n\nThis cannot be undone.`)) return;
    setBusy(q.id);
    try {
      await apiClient.deleteQuarry(q.id);
      notify(`Quarry "${q.quarry_name}" removed`);
      load();
    } catch (err: any) {
      notify(err?.message || 'Cannot remove quarry', 'error');
    } finally { setBusy(null); }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Quarries</div>
          <div className="ph-sub">M1 — Lease master · Multi-site management · DGMS / IBM registration</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="fi" placeholder="Search quarries…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 180 }} />
          <button className="btn btn-p" onClick={openAdd}>+ Add Quarry</button>
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc r"><div className="sc-lbl">Total Quarries</div><div className="sc-val">{quarries.length}</div><div className="sc-sub">All leases</div></div>
        <div className="sc s"><div className="sc-lbl">Active Leases</div><div className="sc-val">{active.length}</div><div className="sc-sub">TNMMCR 1959</div></div>
        <div className="sc g"><div className="sc-lbl">Granite Quarries</div><div className="sc-val">{quarries.filter(q => (q.mineral_type ?? '').toLowerCase().includes('granite')).length}</div><div className="sc-sub">HSN 2516</div></div>
        <div className="sc b"><div className="sc-lbl">With GSTIN</div><div className="sc-val">{quarries.filter(q => q.gstin).length}</div><div className="sc-sub">GST registered</div></div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Quarry Register — {filtered.length} records</div></div>
        <div className="tw">
          <table className="dt">
            <thead>
              <tr><th>Code</th><th>Quarry Name</th><th>District</th><th>Village / Taluk</th><th>GSTIN</th><th>DGMS Reg.</th><th>IBM Code</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id}>
                  <td className="tdm tdc">
                    {q.quarry_code}
                    {q.is_default ? <span className="bdg b-p" style={{ marginLeft: 6, fontSize: 9 }}>Default</span> : null}
                  </td>
                  <td className="tdc">{q.quarry_name}</td>
                  <td>{q.district || '—'}</td>
                  <td style={{ fontSize: 9 }}>{[q.village, q.taluk].filter(Boolean).join(', ') || '—'}</td>
                  <td className="tdm" style={{ fontSize: 9 }}>{q.gstin || '—'}</td>
                  <td className="tdm" style={{ fontSize: 9 }}>{q.dgms_registration_no || '—'}</td>
                  <td className="tdm" style={{ fontSize: 9 }}>{q.ibm_code || '—'}</td>
                  <td><span className={`bdg ${(q.operational_status ?? q.status) === 'active' ? 'b-s' : 'b-d'}`}>{q.operational_status ?? q.status ?? 'active'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-xs btn-s" onClick={() => openEdit(q)} disabled={busy === q.id}>Edit</button>
                      {!q.is_default && (
                        <button className="btn btn-xs" onClick={() => handleSetDefault(q)} disabled={busy === q.id} style={{ background: 'var(--accent2)', color: '#fff' }}>
                          Set Default
                        </button>
                      )}
                      {!q.is_default && (
                        <button className="btn btn-xs btn-d" onClick={() => handleRemove(q)} disabled={busy === q.id}>
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No quarries found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 600 }}>
            <div className="modal-head">
              <div className="modal-title">{editId !== null ? 'Edit Quarry' : 'Add Quarry'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Quarry Name *</label><input className="fi" value={form.quarryName} onChange={f('quarryName')} placeholder="Vatsin Granite Quarry" /></div>
                <div className="fg"><label className="fl">Quarry Code *</label><input className="fi" value={form.quarryCode} onChange={f('quarryCode')} placeholder="ABG001" disabled={editId !== null} /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Type</label>
                  <select className="fsel" value={form.quarryType} onChange={f('quarryType')}>
                    <option value="opencast">Opencast</option>
                    <option value="underground">Underground</option>
                    <option value="wire_saw">Wire Saw</option>
                  </select>
                </div>
                <div className="fg"><label className="fl">Status</label>
                  <select className="fsel" value={form.operationalStatus} onChange={f('operationalStatus')}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">District</label><input className="fi" value={form.district} onChange={f('district')} placeholder="Dharmapuri" /></div>
                <div className="fg"><label className="fl">State</label><input className="fi" value={form.state} onChange={f('state')} placeholder="Tamil Nadu" /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Village</label><input className="fi" value={form.village} onChange={f('village')} placeholder="Village name" /></div>
                <div className="fg"><label className="fl">Taluk</label><input className="fi" value={form.taluk} onChange={f('taluk')} placeholder="Taluk name" /></div>
              </div>
              <div className="fg"><label className="fl">Address</label><input className="fi" value={form.address} onChange={f('address')} placeholder="Full address" /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">GSTIN</label><input className="fi" value={form.gstin} onChange={f('gstin')} placeholder="33AABCA1234B1Z5" /></div>
                <div className="fg"><label className="fl">Commencement Date</label><input className="fi" type="date" value={form.commencementDate} onChange={f('commencementDate')} /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">DGMS Reg. No.</label><input className="fi" value={form.dgmsRegistrationNo} onChange={f('dgmsRegistrationNo')} placeholder="DGMS/TN/XXX" /></div>
                <div className="fg"><label className="fl">IBM Code</label><input className="fi" value={form.ibmCode} onChange={f('ibmCode')} placeholder="IBM/TN/XX/XXX" /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>{editId !== null ? 'Update Quarry' : 'Add Quarry'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
