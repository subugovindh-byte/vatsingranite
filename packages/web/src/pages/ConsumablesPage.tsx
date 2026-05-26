import { useState, useEffect } from 'react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const CATEGORIES = ['diamond_wire', 'blade', 'fuel', 'explosive', 'drill_bit', 'lubricant', 'other'];
const UNITS = ['pcs', 'kg', 'm', 'L', 'nos', 'm²', 'coil'];
const BLANK = { quarryId: '', itemName: '', itemCategory: 'fuel', unit: 'L', recordDate: new Date().toISOString().slice(0, 10), openingStock: '', receivedQty: '', consumedQty: '', unitCost: '', purpose: '', notes: '' };

const CAT_TABS: [string, string][] = [
  ['fuel', 'Fuel (HSD)'],
  ['diamond_wire', 'Diamond Wire'],
  ['blade', 'Blades'],
  ['explosive', 'Explosives'],
  ['drill_bit', 'Drill Bits'],
  ['all', 'All Items'],
];

export default function ConsumablesPage() {
  const { notify } = useToastStore();
  const [tab, setTab] = useState<string>('fuel');
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(BLANK);

  useEffect(() => {
    Promise.all([apiClient.getConsumables(), apiClient.getQuarries()])
      .then(([c, q]: any) => {
        setItems(c.items ?? []);
        setSummary(c.summary ?? []);
        setQuarries(q.quarries ?? q);
      })
      .catch(() => notify('Failed to load consumables data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    apiClient.getConsumables()
      .then((c: any) => { setItems(c.items ?? []); setSummary(c.summary ?? []); })
      .catch(() => notify('Failed to reload', 'error'));
  };

  const openAdd = () => { setForm({ ...BLANK, quarryId: quarries[0]?.id || '', itemCategory: tab === 'all' ? 'fuel' : tab }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.quarryId || !form.itemName || !form.recordDate) { notify('Quarry, item name, and date are required', 'error'); return; }
    try {
      await apiClient.createConsumable({
        quarryId: Number(form.quarryId),
        itemName: form.itemName,
        itemCategory: form.itemCategory,
        unit: form.unit,
        recordDate: form.recordDate,
        openingStock: parseFloat(form.openingStock) || 0,
        receivedQty: parseFloat(form.receivedQty) || 0,
        consumedQty: parseFloat(form.consumedQty) || 0,
        unitCost: parseFloat(form.unitCost) || 0,
        purpose: form.purpose,
        notes: form.notes
      });
      notify('Consumable recorded');
      setShowModal(false);
      reload();
    } catch {
      notify('Failed to save consumable', 'error');
    }
  };

  const ff = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  const displayed = tab === 'all' ? items : items.filter((i: any) => i.item_category === tab);
  const totalFuelL = items.filter((i: any) => i.item_category === 'fuel').reduce((s: number, i: any) => s + Number(i.consumed_qty ?? 0), 0);
  const totalFuelCost = items.filter((i: any) => i.item_category === 'fuel').reduce((s: number, i: any) => s + Number(i.total_value ?? 0), 0);
  const activeWire = items.filter((i: any) => i.item_category === 'diamond_wire' && Number(i.closing_stock ?? 0) > 0).length;
  const activeBlades = items.filter((i: any) => i.item_category === 'blade' && Number(i.closing_stock ?? 0) > 0).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Consumables & Parts</div>
          <div className="ph-sub">M6 — Diamond wire rope · Blades · Fuel · Explosives · Drill bits · Cost/m³</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-p" onClick={openAdd}>+ Add Entry</button>
        </div>
      </div>

      <div className="sc-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="sc r"><div className="sc-lbl">Wire Coils Active</div><div className="sc-val">{activeWire}</div><div className="sc-sub">In stock</div></div>
        <div className="sc s"><div className="sc-lbl">HSD Consumed</div><div className="sc-val">{totalFuelL.toFixed(0)}</div><div className="sc-sub">Litres total</div></div>
        <div className="sc b"><div className="sc-lbl">Fuel Cost</div><div className="sc-val">₹{(totalFuelCost / 1000).toFixed(1)}K</div><div className="sc-sub">Total HSD spend</div></div>
        <div className="sc a"><div className="sc-lbl">Active Blades</div><div className="sc-val">{activeBlades}</div><div className="sc-sub">In service</div></div>
        <div className="sc g"><div className="sc-lbl">Total Records</div><div className="sc-val">{items.length}</div><div className="sc-sub">All categories</div></div>
      </div>

      <div className="itabs">
        {CAT_TABS.map(([k, l]) => (
          <button key={k} className={`itab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">{CAT_TABS.find(([k]) => k === tab)?.[1] ?? 'Items'} — {displayed.length} records</div>
        </div>
        {displayed.length > 0 ? (
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Date</th><th>Quarry</th><th>Item</th><th>Category</th><th className="r">Received</th><th className="r">Consumed</th><th className="r">Closing Stock</th><th className="r">Unit Cost</th><th className="r">Total Value (₹)</th><th>Purpose</th></tr>
              </thead>
              <tbody>
                {displayed.map((i: any) => (
                  <tr key={i.id}>
                    <td className="tdm">{i.record_date}</td>
                    <td className="tdm">{i.quarry_name}</td>
                    <td className="tdc">{i.item_name}</td>
                    <td><span className="bdg b-g">{i.item_category}</span></td>
                    <td className="tda">{Number(i.received_qty ?? 0).toFixed(2)} {i.unit}</td>
                    <td className="tda">{Number(i.consumed_qty ?? 0).toFixed(2)} {i.unit}</td>
                    <td className="tda">{Number(i.closing_stock ?? 0).toFixed(2)} {i.unit}</td>
                    <td className="tda">{i.unit_cost ? `₹${Number(i.unit_cost).toLocaleString()}` : '--'}</td>
                    <td className="tda">{i.total_value ? `₹${Number(i.total_value).toLocaleString()}` : '--'}</td>
                    <td style={{ fontSize: 10, color: 'var(--t2)' }}>{i.purpose || '--'}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg3)', fontWeight: 700 }}>
                  <td colSpan={4} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--t3)' }}>Total</td>
                  <td className="tda tdc">{displayed.reduce((s: number, i: any) => s + Number(i.received_qty ?? 0), 0).toFixed(2)}</td>
                  <td className="tda tdc">{displayed.reduce((s: number, i: any) => s + Number(i.consumed_qty ?? 0), 0).toFixed(2)}</td>
                  <td className="tda tdc">{displayed.reduce((s: number, i: any) => s + Number(i.closing_stock ?? 0), 0).toFixed(2)}</td>
                  <td></td>
                  <td className="tda tdc">₹{displayed.reduce((s: number, i: any) => s + Number(i.total_value ?? 0), 0).toLocaleString()}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-body">
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--t3)' }}>No {tab === 'all' ? '' : tab} records. Use "+ Add Entry" to record consumption.</div>
          </div>
        )}
      </div>

      {summary.length > 0 && tab === 'all' && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-head"><div className="card-title">Stock Summary by Item</div></div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr><th>Item</th><th>Category</th><th>Unit</th><th className="r">Total Received</th><th className="r">Total Consumed</th><th className="r">Closing Stock</th><th className="r">Total Value (₹)</th></tr>
              </thead>
              <tbody>
                {summary.map((s: any, i: number) => (
                  <tr key={i}>
                    <td className="tdc">{s.item_name}</td>
                    <td><span className="bdg b-g">{s.item_category}</span></td>
                    <td>{s.unit}</td>
                    <td className="tda">{Number(s.total_received ?? 0).toFixed(2)}</td>
                    <td className="tda">{Number(s.total_consumed ?? 0).toFixed(2)}</td>
                    <td className="tda">{Number(s.closing_stock ?? 0).toFixed(2)}</td>
                    <td className="tda">₹{Number(s.total_value ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 540 }}>
            <div className="modal-head">
              <div className="modal-title">Add Consumable Entry</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Quarry *</label>
                  <select className="fsel" value={form.quarryId} onChange={ff('quarryId')}>
                    <option value="">Select quarry…</option>
                    {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Date *</label><input className="fi" type="date" value={form.recordDate} onChange={ff('recordDate')} /></div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Item Name *</label><input className="fi" value={form.itemName} onChange={ff('itemName')} placeholder="e.g. HSD Diesel, Diamond Wire" /></div>
                <div className="fg">
                  <label className="fl">Category</label>
                  <select className="fsel" value={form.itemCategory} onChange={ff('itemCategory')}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg3">
                <div className="fg"><label className="fl">Received Qty</label><input className="fi" type="number" step="0.01" value={form.receivedQty} onChange={ff('receivedQty')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Consumed Qty</label><input className="fi" type="number" step="0.01" value={form.consumedQty} onChange={ff('consumedQty')} placeholder="0" /></div>
                <div className="fg">
                  <label className="fl">Unit</label>
                  <select className="fsel" value={form.unit} onChange={ff('unit')}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="fl">Opening Stock</label><input className="fi" type="number" step="0.01" value={form.openingStock} onChange={ff('openingStock')} placeholder="0" /></div>
                <div className="fg"><label className="fl">Unit Cost (₹)</label><input className="fi" type="number" step="0.01" value={form.unitCost} onChange={ff('unitCost')} placeholder="0" /></div>
              </div>
              <div className="fg"><label className="fl">Purpose / Machine</label><input className="fi" value={form.purpose} onChange={ff('purpose')} placeholder="e.g. EXC-001, WS-001" /></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
