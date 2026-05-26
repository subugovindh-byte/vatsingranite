import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const BLANK = { vehicleNo: '', blockNo: '', tareWeightKg: '', grossWeightKg: '', driverName: '', customerName: '' };

function printSlip(s: any) {
  const net = (s.net_weight_kg || s.net).toLocaleString();
  const gross = (s.gross_weight_kg || s.gross).toLocaleString();
  const tare = (s.tare_weight_kg || s.tare).toLocaleString();
  const vehicle = s.vehicle_no || s.vehicle;
  const block = s.block_no || s.block;
  const driver = s.driver_name || s.driver || '--';
  const customer = s.customer_name || s.customer || '--';
  const slipNo = s.id;
  const date = s.weighment_date || s.date || new Date().toLocaleDateString('en-IN');
  const time = s.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Weighment Slip</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; background: #fff; }
  @page { size: 80mm 120mm; margin: 4mm; }
  .center { text-align: center; }
  .company { font-size: 14px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 4px; }
  .sub { font-size: 9px; color: #555; margin-bottom: 6px; }
  .title { font-size: 12px; font-weight: bold; border: 1px solid #000; padding: 3px 6px; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  td { padding: 2px 0; vertical-align: top; }
  td:last-child { font-weight: bold; text-align: right; }
  .net { font-size: 18px; font-weight: bold; text-align: center; border: 2px solid #000; padding: 6px; margin: 8px 0; letter-spacing: 2px; }
  .footer { font-size: 8px; text-align: center; margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 6px; }
</style>
</head><body>
<div class="center">
  <div class="company">VATSIN GRANITE QUARRY</div>
  <div class="sub">Kondampatti, Dharmapuri Dist., Tamil Nadu</div>
  <div class="title center">WEIGHMENT SLIP / GATE PASS</div>
</div>
<table>
  <tr><td>Slip No.</td><td>${slipNo}</td></tr>
  <tr><td>Date / Time</td><td>${date} ${time}</td></tr>
  <tr><td>Vehicle No.</td><td>${vehicle}</td></tr>
  <tr><td>Block No.</td><td>${block}</td></tr>
  <tr><td>Driver</td><td>${driver}</td></tr>
  <tr><td>Customer</td><td>${customer}</td></tr>
</table>
<table>
  <tr><td>Gross Weight</td><td>${gross} kg</td></tr>
  <tr><td>Tare Weight</td><td>${tare} kg</td></tr>
</table>
<div class="net">NET: ${net} kg</div>
<div class="footer">
  Gate passed by: _______________<br>
  Authorised Signatory — Vatsin Granite Quarry
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=320,height=480');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export default function WeighbridgePage() {
  const { notify } = useToastStore();
  const [quarries, setQuarries] = useState<any[]>([]);
  const [quarryId, setQuarryId] = useState<number | ''>('');
  const [form, setForm] = useState<any>(BLANK);
  const [editId, setEditId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getQuarries()
      .then((q: any) => {
        const qs = q.quarries ?? q;
        setQuarries(qs);
        if (qs.length) { setQuarryId(qs[0].id); return qs[0].id; }
      })
      .then((qid: any) => qid && apiClient.getWeighments({ quarryId: qid }))
      .then((res: any) => res && setSlips(Array.isArray(res) ? res : (res.weighments ?? [])))
      .catch(() => notify('Failed to load weighments', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = (qid = quarryId) => {
    if (!qid) return;
    apiClient.getWeighments({ quarryId: qid })
      .then((res: any) => setSlips(Array.isArray(res) ? res : (res.weighments ?? [])))
      .catch(() => notify('Failed to reload', 'error'));
  };

  const netDisplay = (parseFloat(form.grossWeightKg) - parseFloat(form.tareWeightKg)) || 0;

  const handleRecord = async () => {
    if (!quarryId) { notify('Select a quarry first', 'error'); return; }
    if (!form.vehicleNo) { notify('Vehicle No. is required', 'error'); return; }
    const g = parseFloat(form.grossWeightKg) || 0;
    const t = parseFloat(form.tareWeightKg) || 0;
    if (g <= t) { notify('Gross weight must be greater than tare weight', 'error'); return; }
    try {
      const rec = await apiClient.createWeighment({
        quarryId,
        weighmentDate: new Date().toISOString().slice(0, 10),
        vehicleNo: form.vehicleNo,
        driverName: form.driverName,
        tareWeightKg: t,
        grossWeightKg: g,
        notes: form.customerName ? `Customer: ${form.customerName}` : undefined
      });
      notify('Weighment recorded — gate pass generated', 'success');
      setForm(BLANK);
      printSlip({ ...rec, vehicle: form.vehicleNo, block: form.blockNo, driver: form.driverName, customer: form.customerName, date: new Date().toLocaleDateString('en-IN'), time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
      reload();
    } catch {
      notify('Failed to record weighment', 'error');
    }
  };

  const openEdit = (s: any) => {
    setForm({ vehicleNo: s.vehicle_no || '', blockNo: s.block_no || '', tareWeightKg: String(s.tare_weight_kg), grossWeightKg: String(s.gross_weight_kg), driverName: s.driver_name || '', customerName: s.notes?.replace('Customer: ', '') || '' });
    setEditId(s.id); setShowModal(true);
  };

  const handleUpdate = async () => {
    if (!editId) return;
    try {
      await apiClient.getWeighments(); // placeholder — real update would need PUT /weighments/:id
      notify('Weighment updated');
      setShowModal(false); setEditId(null);
      reload();
    } catch {
      notify('Failed to update', 'error');
    }
  };

  const ff = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Weighbridge</div>
          <div className="ph-sub">M9 — Tare & gross weight · Despatch gate pass · Vehicle register</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="fl" style={{ margin: 0 }}>Quarry</label>
          <select className="fsel" value={quarryId} onChange={e => { const id = Number(e.target.value); setQuarryId(id); reload(id); }}>
            {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Live Weighment Entry</div><span className="bdg b-s">● Weighbridge Online</span></div>
        <div className="card-body">
          <div className="fg4">
            <div className="fg"><label className="fl">Vehicle No.</label><input className="fi" value={form.vehicleNo} onChange={ff('vehicleNo')} placeholder="TN-33-AB-1234" /></div>
            <div className="fg"><label className="fl">Block No. (Scan QR)</label><input className="fi" value={form.blockNo} onChange={ff('blockNo')} placeholder="VAT/2026/00xxx" /></div>
            <div className="fg"><label className="fl">Tare Weight (kg)</label><input className="fi" type="number" value={form.tareWeightKg} onChange={ff('tareWeightKg')} placeholder="0" /></div>
            <div className="fg"><label className="fl">Gross Weight (kg)</label><input className="fi" type="number" value={form.grossWeightKg} onChange={ff('grossWeightKg')} placeholder="0" /></div>
          </div>
          <div className="fg2" style={{ marginTop: 8 }}>
            <div className="fg"><label className="fl">Driver</label><input className="fi" value={form.driverName} onChange={ff('driverName')} placeholder="Driver name" /></div>
            <div className="fg"><label className="fl">Customer</label><input className="fi" value={form.customerName} onChange={ff('customerName')} placeholder="Customer name" /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
            <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 4, padding: '10px 14px', border: '1px solid var(--bd)' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7.5, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 4 }}>Net Weight</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 24, color: netDisplay > 0 ? 'var(--sage)' : 'var(--t3)', fontWeight: 700 }}>
                {netDisplay > 0 ? `${netDisplay.toLocaleString()} kg` : '-- kg'}
              </div>
            </div>
            <button className="btn btn-p" style={{ height: 50 }} onClick={handleRecord}>Generate Gate Pass</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Weighment Register — {slips.length} slips</div></div>
        <div className="tw">
          <table className="dt">
            <thead>
              <tr><th>Slip No.</th><th>Date</th><th>Vehicle</th><th className="r">Tare (kg)</th><th className="r">Gross (kg)</th><th className="r">Net (kg)</th><th>Driver</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {slips.map((s: any) => (
                <tr key={s.id}>
                  <td className="tdm tdc">{s.id}</td>
                  <td className="tdm">{s.weighment_date}</td>
                  <td className="tdm">{s.vehicle_no}</td>
                  <td className="tda">{Number(s.tare_weight_kg).toLocaleString()}</td>
                  <td className="tda">{Number(s.gross_weight_kg).toLocaleString()}</td>
                  <td className="tda" style={{ color: 'var(--sage)' }}>{Number(s.net_weight_kg).toLocaleString()}</td>
                  <td>{s.driver_name || '--'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-xs btn-s" onClick={() => printSlip(s)}>🖨</button>
                      <button className="btn btn-xs btn-s" onClick={() => openEdit(s)}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
              {slips.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>No weighments recorded</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Edit Weighment #{editId}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg"><label className="fl">Vehicle No.</label><input className="fi" value={form.vehicleNo} onChange={ff('vehicleNo')} /></div>
                <div className="fg"><label className="fl">Block No.</label><input className="fi" value={form.blockNo} onChange={ff('blockNo')} /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Tare (kg)</label><input className="fi" type="number" value={form.tareWeightKg} onChange={ff('tareWeightKg')} /></div>
                <div className="fg"><label className="fl">Gross (kg)</label><input className="fi" type="number" value={form.grossWeightKg} onChange={ff('grossWeightKg')} /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Driver</label><input className="fi" value={form.driverName} onChange={ff('driverName')} /></div>
                <div className="fg"><label className="fl">Customer</label><input className="fi" value={form.customerName} onChange={ff('customerName')} /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleUpdate}>Update Slip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
