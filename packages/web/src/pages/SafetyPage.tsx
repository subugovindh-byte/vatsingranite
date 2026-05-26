import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const INC_TYPES = ['near_miss', 'minor_injury', 'major_injury', 'dangerous_occurrence', 'fatal'];
const INC_STATUSES = ['open', 'investigated', 'closed'];
const BLANK_INC = { inc_no: '', date: new Date().toISOString().slice(0, 10), type: 'near_miss', location: '', description: '', injured: 'None', dgms_reported: false, status: 'open' };
const BLANK_PPE = { item: '', qty: '', min_stock: '', issued: '0' };
const BLANK_TB = { date: new Date().toISOString().slice(0, 10), topic: '', conducted_by: '', attendees: '', signed: false };

export default function SafetyPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<'incidents' | 'ppe' | 'toolbox' | 'dgms'>('incidents');

  const [incidents, setIncidents] = useState<any[]>([]);
  const [ppeStock, setPpeStock] = useState<any[]>([]);
  const [toolboxTopics, setToolboxTopics] = useState<any[]>([]);

  useEffect(() => {
    apiClient.getSafetyIncidents().then(r => {
      const rows = Array.isArray(r) ? r : (r as any).incidents ?? [];
      setIncidents(rows);
    }).catch(() => {});
  }, []);

  const [showIncModal, setShowIncModal] = useState(false);
  const [incForm, setIncForm] = useState<any>(BLANK_INC);
  const [editIncId, setEditIncId] = useState<number | null>(null);

  const [showPPEModal, setShowPPEModal] = useState(false);
  const [ppeForm, setPpeForm] = useState<any>(BLANK_PPE);
  const [editPPEId, setEditPPEId] = useState<number | null>(null);

  const [showTBModal, setShowTBModal] = useState(false);
  const [tbForm, setTbForm] = useState<any>(BLANK_TB);
  const [editTBId, setEditTBId] = useState<number | null>(null);

  const nextIncId = () => (incidents.length === 0 ? 1 : Math.max(...incidents.map(i => i.id)) + 1);
  const nextPPEId = () => (ppeStock.length === 0 ? 1 : Math.max(...ppeStock.map(p => p.id)) + 1);
  const nextTBId = () => (toolboxTopics.length === 0 ? 1 : Math.max(...toolboxTopics.map(t => t.id)) + 1);

  const derivePPEStatus = (qty: number, issued: number, min_stock: number) => {
    const inStock = qty - issued;
    if (inStock < min_stock / 2) return 'critical';
    if (inStock < min_stock) return 'low';
    return 'ok';
  };

  const openAddInc = () => {
    const n = nextIncId();
    setIncForm({ ...BLANK_INC, inc_no: `INC-2526-${String(n).padStart(3, '0')}` });
    setEditIncId(null); setShowIncModal(true);
  };
  const openEditInc = (i: any) => { setIncForm({ ...i }); setEditIncId(i.id); setShowIncModal(true); };

  const handleSaveInc = () => {
    if (!incForm.location || !incForm.description) { notify('Location and description are required', 'error'); return; }
    if (editIncId) {
      setIncidents(prev => prev.map(i => i.id === editIncId ? { ...i, ...incForm } : i));
      notify('Incident updated');
    } else {
      setIncidents(prev => [...prev, { ...incForm, id: nextIncId() }]);
      notify('Incident reported');
    }
    setShowIncModal(false);
  };
  const handleDeleteInc = (id: number) => { setIncidents(prev => prev.filter(i => i.id !== id)); notify('Incident deleted'); };

  const openAddPPE = () => { setPpeForm(BLANK_PPE); setEditPPEId(null); setShowPPEModal(true); };
  const openEditPPE = (p: any) => { setPpeForm({ ...p, qty: String(p.qty), issued: String(p.issued), min_stock: String(p.min_stock) }); setEditPPEId(p.id); setShowPPEModal(true); };

  const handleSavePPE = () => {
    if (!ppeForm.item) { notify('PPE item name is required', 'error'); return; }
    const qty = Number(ppeForm.qty) || 0;
    const issued = Number(ppeForm.issued) || 0;
    const min_stock = Number(ppeForm.min_stock) || 0;
    const status = derivePPEStatus(qty, issued, min_stock);
    if (editPPEId) {
      setPpeStock(prev => prev.map(p => p.id === editPPEId ? { ...p, ...ppeForm, qty, issued, min_stock, status } : p));
      notify('PPE stock updated');
    } else {
      setPpeStock(prev => [...prev, { ...ppeForm, id: nextPPEId(), qty, issued, min_stock, status }]);
      notify('PPE item added');
    }
    setShowPPEModal(false);
  };
  const handleDeletePPE = (id: number) => { setPpeStock(prev => prev.filter(p => p.id !== id)); notify('PPE item deleted'); };

  const openAddTB = () => { setTbForm(BLANK_TB); setEditTBId(null); setShowTBModal(true); };
  const openEditTB = (t: any) => { setTbForm({ ...t, attendees: String(t.attendees) }); setEditTBId(t.id); setShowTBModal(true); };

  const handleSaveTB = () => {
    if (!tbForm.topic || !tbForm.conducted_by) { notify('Topic and conductor are required', 'error'); return; }
    if (editTBId) {
      setToolboxTopics(prev => prev.map(t => t.id === editTBId ? { ...t, ...tbForm, attendees: Number(tbForm.attendees) || 0 } : t));
      notify('Toolbox talk updated');
    } else {
      setToolboxTopics(prev => [...prev, { ...tbForm, id: nextTBId(), attendees: Number(tbForm.attendees) || 0 }]);
      notify('Toolbox talk recorded');
    }
    setShowTBModal(false);
  };
  const handleDeleteTB = (id: number) => { setToolboxTopics(prev => prev.filter(t => t.id !== id)); notify('Toolbox talk deleted'); };

  const inf = (k: string) => (e: any) => setIncForm((p: any) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const ppef = (k: string) => (e: any) => setPpeForm((p: any) => ({ ...p, [k]: e.target.value }));
  const tbf = (k: string) => (e: any) => setTbForm((p: any) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Safety & HSE</div>
          <div className="ph-sub">M18 — Incident register · PPE stock · Toolbox talks · DGMS Form-C · Accident reporting</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'incidents' && <button className="btn btn-p" onClick={openAddInc}>+ Report Incident</button>}
          {tab === 'ppe' && <button className="btn btn-p" onClick={openAddPPE}>+ Add PPE Item</button>}
          {tab === 'toolbox' && <button className="btn btn-p" onClick={openAddTB}>+ Add Talk</button>}
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc g"><div className="sc-lbl">LTI-Free Days</div><div className="sc-val">142</div><div className="sc-sub">No lost-time injury</div></div>
        <div className="sc r"><div className="sc-lbl">Incidents YTD</div><div className="sc-val">{incidents.length}</div><div className="sc-sub">Total recorded</div></div>
        <div className="sc a"><div className="sc-lbl">PPE Items Low</div><div className="sc-val">{ppeStock.filter(p => p.status === 'low' || p.status === 'critical').length}</div><div className="sc-sub">Reorder required</div></div>
        <div className="sc s"><div className="sc-lbl">Toolbox Talks MTD</div><div className="sc-val">{toolboxTopics.filter(t => t.date.startsWith('2026-05')).length}</div><div className="sc-sub">May 2026</div></div>
      </div>

      <div className="itabs">
        <button className={`itab${tab === 'incidents' ? ' on' : ''}`} onClick={() => setTab('incidents')}>Incident Register</button>
        <button className={`itab${tab === 'ppe' ? ' on' : ''}`} onClick={() => setTab('ppe')}>PPE Stock</button>
        <button className={`itab${tab === 'toolbox' ? ' on' : ''}`} onClick={() => setTab('toolbox')}>Toolbox Talks</button>
        <button className={`itab${tab === 'dgms' ? ' on' : ''}`} onClick={() => setTab('dgms')}>DGMS Reporting</button>
      </div>

      {tab === 'incidents' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Incident Register — {incidents.length} records</div></div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Inc. No.</th><th>Date</th><th>Type</th><th>Location</th><th>Description</th><th>Injured</th><th>DGMS Reported</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {incidents.map(inc => (
                  <tr key={inc.id}>
                    <td className="tdm tdc">{inc.inc_no}</td>
                    <td className="tdm">{inc.date}</td>
                    <td><span className={`bdg ${inc.type === 'near_miss' ? 'b-a' : inc.type === 'minor_injury' ? 'b-r' : 'b-d'}`}>{inc.type.replace(/_/g, ' ')}</span></td>
                    <td>{inc.location}</td>
                    <td style={{ maxWidth: 240, fontSize: 10 }}>{inc.description}</td>
                    <td style={{ fontSize: 10 }}>{inc.injured}</td>
                    <td><span className={`bdg ${inc.dgms_reported ? 'b-s' : 'b-d'}`}>{inc.dgms_reported ? 'Yes' : 'No'}</span></td>
                    <td><span className={`bdg ${inc.status === 'closed' ? 'b-s' : inc.status === 'investigated' ? 'b-b' : 'b-a'}`}>{inc.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEditInc(inc)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeleteInc(inc.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ppe' && (
        <div className="card">
          <div className="card-head"><div className="card-title">PPE Stock Register — {ppeStock.length} items</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>PPE Item</th><th className="r">Total Qty</th><th className="r">Issued</th><th className="r">In Stock</th><th className="r">Min Stock</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {ppeStock.map(p => (
                  <tr key={p.id}>
                    <td>{p.item}</td>
                    <td className="tda">{p.qty}</td>
                    <td className="tda">{p.issued}</td>
                    <td className="tda" style={{ color: p.status === 'critical' ? 'var(--red)' : p.status === 'low' ? 'var(--amber)' : 'var(--sage)', fontWeight: 600 }}>{p.qty - p.issued}</td>
                    <td className="tda">{p.min_stock}</td>
                    <td><span className={`bdg ${p.status === 'ok' ? 'b-s' : p.status === 'low' ? 'b-a' : 'b-r'}`}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEditPPE(p)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeletePPE(p.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'toolbox' && (
        <div className="card">
          <div className="card-head"><div className="card-title">Toolbox Talk Register — {toolboxTopics.length} sessions</div></div>
          <div className="tw">
            <table className="dt">
              <thead><tr><th>Date</th><th>Topic</th><th>Conducted By</th><th className="r">Attendees</th><th>Signed</th><th>Actions</th></tr></thead>
              <tbody>
                {toolboxTopics.map(t => (
                  <tr key={t.id}>
                    <td className="tdm">{t.date}</td>
                    <td style={{ maxWidth: 300, fontSize: 10 }}>{t.topic}</td>
                    <td>{t.conducted_by}</td>
                    <td className="tda">{t.attendees}</td>
                    <td><span className={`bdg ${t.signed ? 'b-s' : 'b-d'}`}>{t.signed ? 'Signed' : 'Pending'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-xs btn-s" onClick={() => openEditTB(t)}>Edit</button>
                        <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDeleteTB(t.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'dgms' && (
        <div className="card">
          <div className="card-head"><div className="card-title">DGMS Statutory Requirements</div></div>
          <div className="card-body">
            <div className="fg3">
              {[
                ['Form VII — Blasting Record', 'Monthly blasting register — DGMS inspector may call for it anytime. Maintained by certified shotfirer.'],
                ['Form-C — Accident Report', 'Reportable accident (dangerous occurrence / fatal) must be reported within 2 hours to DGMS and District Magistrate.'],
                ['Shotfirer Certificate', 'All blasters must hold valid DGMS shotfirer certificate. Renewal every 3 years. Keep certified copies on site.'],
                ['Safety Committee', 'Mandatory if > 50 workers. Quarterly meeting with minutes filed. Worker representative must be elected.'],
                ['First Aid Training', 'At least 1 trained first-aider per shift. First aid box maintained at each working face. Refresher every 3 years.'],
                ['Dust Sampling', 'Personal dust sampling mandatory for workers exposed to silica dust. Records maintained for 40 years (MMR 1961).'],
                ['Annual Safety Report', 'Annual report to DGMS office — production, accidents, dangerous occurrences, health statistics.'],
              ].map(([k, v]) => (
                <div key={k as string} style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 11, color: 'var(--t2)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showIncModal && (
        <div className="modal-backdrop" onClick={() => setShowIncModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 540 }}>
            <div className="modal-head">
              <div className="modal-title">{editIncId ? 'Edit Incident' : 'Report Incident'}</div>
              <button className="modal-close" onClick={() => setShowIncModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg3">
                <div className="fg"><label className="fl">Inc. No.</label><input className="fi" value={incForm.inc_no} onChange={inf('inc_no')} placeholder="INC-2526-003" /></div>
                <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={incForm.date} onChange={inf('date')} /></div>
                <div className="fg"><label className="fl">Type</label><select className="fsel" value={incForm.type} onChange={inf('type')}>{INC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></div>
              </div>
              <div className="fg"><label className="fl">Location *</label><input className="fi" value={incForm.location} onChange={inf('location')} placeholder="Face-2 Vatsin Granite" /></div>
              <div className="fg"><label className="fl">Description *</label><input className="fi" value={incForm.description} onChange={inf('description')} placeholder="Describe what happened" /></div>
              <div className="fg2">
                <div className="fg"><label className="fl">Injured Person(s)</label><input className="fi" value={incForm.injured} onChange={inf('injured')} placeholder="None" /></div>
                <div className="fg"><label className="fl">Status</label><select className="fsel" value={incForm.status} onChange={inf('status')}>{INC_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input type="checkbox" id="dgms_chk" checked={incForm.dgms_reported} onChange={inf('dgms_reported')} />
                <label htmlFor="dgms_chk" className="fl" style={{ margin: 0 }}>Reported to DGMS</label>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowIncModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveInc}>{editIncId ? 'Update' : 'Report Incident'}</button>
            </div>
          </div>
        </div>
      )}

      {showPPEModal && (
        <div className="modal-backdrop" onClick={() => setShowPPEModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{editPPEId ? 'Edit PPE Item' : 'Add PPE Item'}</div>
              <button className="modal-close" onClick={() => setShowPPEModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg"><label className="fl">PPE Item Name *</label><input className="fi" value={ppeForm.item} onChange={ppef('item')} placeholder="Safety Helmet (IS 2925)" /></div>
              <div className="fg3">
                <div className="fg"><label className="fl">Total Qty</label><input className="fi" type="number" value={ppeForm.qty} onChange={ppef('qty')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Qty Issued</label><input className="fi" type="number" value={ppeForm.issued} onChange={ppef('issued')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Min Stock</label><input className="fi" type="number" value={ppeForm.min_stock} onChange={ppef('min_stock')} placeholder="5" /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowPPEModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSavePPE}>{editPPEId ? 'Update' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}

      {showTBModal && (
        <div className="modal-backdrop" onClick={() => setShowTBModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{editTBId ? 'Edit Toolbox Talk' : 'Record Toolbox Talk'}</div>
              <button className="modal-close" onClick={() => setShowTBModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Date</label><input className="fi" type="date" value={tbForm.date} onChange={tbf('date')} /></div>
                <div className="fg"><label className="fl">No. of Attendees</label><input className="fi" type="number" value={tbForm.attendees} onChange={tbf('attendees')} placeholder="0" /></div>
              </div>
              <div className="fg"><label className="fl">Topic *</label><input className="fi" value={tbForm.topic} onChange={tbf('topic')} placeholder="Safety topic discussed" /></div>
              <div className="fg"><label className="fl">Conducted By *</label><input className="fi" value={tbForm.conducted_by} onChange={tbf('conducted_by')} placeholder="Name of conductor" /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input type="checkbox" id="signed_chk" checked={tbForm.signed} onChange={tbf('signed')} />
                <label htmlFor="signed_chk" className="fl" style={{ margin: 0 }}>Attendance sheet signed</label>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowTBModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSaveTB}>{editTBId ? 'Update' : 'Record Talk'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
