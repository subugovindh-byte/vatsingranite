import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useToastStore } from '../store';
import { apiClient } from '../utils/api';

const STATUS_OPTS = ['available', 'reserved', 'dispatched', 'sold', 'rejected'];
const GRADES = ['A', 'A+', 'B', 'C'];
const BLANK = { quarryId: '', varietyId: '', extractionDate: new Date().toISOString().slice(0, 10), lengthMm: '', widthMm: '', heightMm: '', grade: 'A', color: '', status: 'available' };

function BlockSticker({ block }: { block: any }) {
  const qrValue = [
    block.block_no,
    block.quarry_name,
    block.color ?? block.variety_name,
    `Grade ${block.grade}`,
    `${block.length_mm}×${block.width_mm}×${block.height_mm}mm`,
    `${Number(block.net_cbm).toFixed(3)} m³`,
    `${Number(block.weight_kg ?? 0).toLocaleString()} kg`,
    block.extraction_date,
  ].join(' | ');

  return (
    <div className="block-sticker">
      <div className="bs-header">
        <div className="bs-company">AB GRANITE</div>
        <div className="bs-tagline">HSN 2516 · DGMS · IBM · TNMMCR</div>
      </div>
      <div className="bs-body">
        <div className="bs-qr">
          <QRCodeSVG value={qrValue} size={90} level="M" />
        </div>
        <div className="bs-info">
          <div className="bs-block-no">{block.block_no}</div>
          <div className="bs-color">{block.color ?? block.variety_name ?? '—'}</div>
          <div className="bs-grade-row">
            <span className="bs-tag">GRD {block.grade}</span>
            <span className="bs-tag">{block.status?.toUpperCase()}</span>
          </div>
        </div>
      </div>
      <div className="bs-dims">
        <div className="bs-dim-row">
          <span className="bs-dim-label">DIMENSIONS</span>
          <span className="bs-dim-val">{block.length_mm} × {block.width_mm} × {block.height_mm} mm</span>
        </div>
        <div className="bs-dim-row">
          <span className="bs-dim-label">NET CBM</span>
          <span className="bs-dim-val">{Number(block.net_cbm).toFixed(3)} m³</span>
          <span className="bs-dim-label" style={{ marginLeft: 10 }}>GROSS</span>
          <span className="bs-dim-val">{Number(block.gross_cbm).toFixed(3)} m³</span>
        </div>
        <div className="bs-dim-row">
          <span className="bs-dim-label">WEIGHT</span>
          <span className="bs-dim-val">{Number(block.weight_kg ?? 0).toLocaleString()} kg · {(Number(block.weight_kg ?? 0) / 1000).toFixed(2)} T</span>
        </div>
        <div className="bs-dim-row">
          <span className="bs-dim-label">EXTRACTED</span>
          <span className="bs-dim-val">{block.extraction_date}</span>
          <span className="bs-dim-label" style={{ marginLeft: 10 }}>QUARRY</span>
          <span className="bs-dim-val">{(block.quarry_name ?? '').split('—')[0].trim()}</span>
        </div>
      </div>
    </div>
  );
}

export default function BlocksPage() {
  const { notify } = useToastStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(BLANK);
  const [printBlock, setPrintBlock] = useState<any | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [quarries, setQuarries] = useState<any[]>([]);
  const [varieties, setVarieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.getBlocks({ limit: 500 }), apiClient.getQuarries(), apiClient.getVarieties()])
      .then(([b, q, v]: any) => {
        setBlocks((b as any).blocks ?? []);
        setQuarries(q.quarries ?? q);
        setVarieties(Array.isArray(v) ? v : []);
      })
      .catch(() => notify('Failed to load blocks data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    apiClient.getBlocks({ limit: 500 })
      .then((b: any) => setBlocks(b.blocks ?? []))
      .catch(() => notify('Failed to reload', 'error'));
  };

  const filtered = blocks.filter(b => {
    const matchSearch = !search || b.block_no?.toLowerCase().includes(search.toLowerCase()) || (b.color ?? b.variety_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const available = blocks.filter(b => b.status === 'available');
  const totalCbm = blocks.reduce((s, b) => s + Number(b.net_cbm ?? 0), 0);

  const openAdd = () => { setForm({ ...BLANK, quarryId: quarries[0]?.id || '', varietyId: varieties[0]?.id || '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.quarryId || !form.varietyId || !form.lengthMm || !form.widthMm || !form.heightMm) {
      notify('Quarry, variety, and dimensions are required', 'error'); return;
    }
    try {
      await apiClient.createBlock({
        quarryId: Number(form.quarryId),
        varietyId: Number(form.varietyId),
        grade: form.grade,
        color: form.color || undefined,
        extractionDate: form.extractionDate,
        lengthMm: Number(form.lengthMm),
        widthMm: Number(form.widthMm),
        heightMm: Number(form.heightMm),
      });
      notify('Block registered');
      setShowForm(false);
      reload();
    } catch {
      notify('Failed to register block', 'error');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await apiClient.updateBlockStatus(id, status);
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      notify(`Status updated to ${status}`);
    } catch {
      notify('Failed to update status', 'error');
    }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Block Sticker — ${printBlock?.block_no}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: white; }
        @page { size: 100mm 70mm; margin: 0; }
        @media print { body { margin: 0; } }
        .block-sticker { width: 100mm; height: 70mm; border: 1.5px solid #222; padding: 4mm; background: white; page-break-inside: avoid; }
        .bs-header { border-bottom: 1px solid #333; padding-bottom: 2mm; margin-bottom: 2mm; display: flex; justify-content: space-between; align-items: baseline; }
        .bs-company { font-size: 8pt; font-weight: 800; letter-spacing: 0.5px; color: #111; }
        .bs-tagline { font-size: 5.5pt; color: #555; letter-spacing: 0.5px; }
        .bs-body { display: flex; gap: 3mm; margin-bottom: 2mm; }
        .bs-qr { flex-shrink: 0; }
        .bs-info { flex: 1; }
        .bs-block-no { font-size: 13pt; font-weight: 800; font-family: 'Courier New', monospace; color: #111; line-height: 1.1; }
        .bs-color { font-size: 8pt; color: #333; margin-top: 1mm; font-style: italic; }
        .bs-grade-row { display: flex; gap: 2mm; margin-top: 2mm; }
        .bs-tag { font-size: 7pt; font-weight: 700; letter-spacing: 0.5px; border: 1px solid #333; padding: 0.5mm 2mm; border-radius: 2px; color: #333; }
        .bs-dims { border-top: 1px solid #ccc; padding-top: 2mm; }
        .bs-dim-row { display: flex; align-items: baseline; gap: 1.5mm; margin-bottom: 1mm; flex-wrap: wrap; }
        .bs-dim-label { font-size: 5.5pt; color: #888; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
        .bs-dim-val { font-size: 7pt; font-family: 'Courier New', monospace; color: #111; font-weight: 600; }
      </style></head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Blocks</div>
          <div className="ph-sub">M3 — Stockyard management · QR/RFID · Block master · Grade &amp; colour</div>
        </div>
        <button className="btn btn-p" onClick={openAdd}>+ Register Block</button>
      </div>

      <div className="sc-grid">
        <div className="sc r"><div className="sc-lbl">Total Blocks</div><div className="sc-val">{blocks.length}</div><div className="sc-sub">All statuses</div></div>
        <div className="sc s"><div className="sc-lbl">Available</div><div className="sc-val">{available.length}</div><div className="sc-sub">In stockyard</div></div>
        <div className="sc g"><div className="sc-lbl">Stock CBM</div><div className="sc-val">{totalCbm.toFixed(2)}</div><div className="sc-sub">Net cubic metres</div></div>
        <div className="sc b"><div className="sc-lbl">Dispatched</div><div className="sc-val">{blocks.filter(b => b.status === 'dispatched').length}</div><div className="sc-sub">Total</div></div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Block Register</div>
          <div className="sbar" style={{ margin: 0 }}>
            <input className="si" placeholder="Search block no, colour…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 180 }} />
            <select className="sf" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="tw">
          <table className="dt">
            <thead>
              <tr><th>Block No.</th><th>Quarry</th><th>Date</th><th>Grade</th><th>Colour / Variety</th><th>Dims (mm)</th><th className="r">Net CBM</th><th className="r">Weight (kg)</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map(b => (
                <tr key={b.id}>
                  <td className="tdm tdc">{b.block_no}</td>
                  <td>{b.quarry_name}</td>
                  <td className="tdm">{b.extraction_date}</td>
                  <td><span className="bdg b-g">{b.grade || '--'}</span></td>
                  <td>{b.color ?? b.variety_name ?? '--'}</td>
                  <td className="tdm">{b.length_mm ? `${b.length_mm}×${b.width_mm}×${b.height_mm}` : '--'}</td>
                  <td className="tda">{Number(b.net_cbm).toFixed(3)}</td>
                  <td className="tda">{Number(b.weight_kg ?? 0).toLocaleString()}</td>
                  <td>
                    <select className="fsel" style={{ fontSize: 9, padding: '2px 4px', width: 90 }} value={b.status} onChange={e => handleStatusChange(b.id, e.target.value)}>
                      {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <a className="btn btn-xs btn-s" href={`/blocks/${b.id}/photos`}>Photos</a>
                      <button className="btn btn-xs btn-blue" onClick={() => setPrintBlock(b)}>QR</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={10}><div className="empty-state">No blocks found</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {printBlock && (
        <div className="modal-backdrop" onClick={() => setPrintBlock(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <div className="modal-title">Block Sticker — {printBlock.block_no}</div>
              <button className="modal-close" onClick={() => setPrintBlock(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, textTransform: 'uppercase' }}>
                Preview · 100 mm × 70 mm label
              </div>
              <div style={{ background: 'white', padding: 8, borderRadius: 4, border: '1px solid var(--bd)' }}>
                <div ref={printRef}>
                  <BlockSticker block={printBlock} />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setPrintBlock(null)}>Close</button>
              <button className="btn btn-p" onClick={handlePrint}>Print Sticker</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <div className="modal-title">Register Block</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Quarry *</label>
                  <select className="fsel" value={form.quarryId} onChange={f('quarryId')}>
                    <option value="">Select quarry…</option>
                    {quarries.map((q: any) => <option key={q.id} value={q.id}>{q.quarry_name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">Extraction Date</label><input className="fi" type="date" value={form.extractionDate} onChange={f('extractionDate')} /></div>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Variety *</label>
                  <select className="fsel" value={form.varietyId} onChange={f('varietyId')}>
                    <option value="">Select variety…</option>
                    {varieties.filter((v: any) => !form.quarryId || v.quarry_id === Number(form.quarryId)).map((v: any) => <option key={v.id} value={v.id}>{v.variety_name}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">Grade</label>
                  <select className="fsel" value={form.grade} onChange={f('grade')}>{GRADES.map(g => <option key={g}>{g}</option>)}</select>
                </div>
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 7.5, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--t3)', margin: '6px 0 8px' }}>Dimensions (mm)</div>
              <div className="fg3">
                <div className="fg"><label className="fl">Length</label><input className="fi" type="number" value={form.lengthMm} onChange={f('lengthMm')} placeholder="mm" /></div>
                <div className="fg"><label className="fl">Width</label><input className="fi" type="number" value={form.widthMm} onChange={f('widthMm')} placeholder="mm" /></div>
                <div className="fg"><label className="fl">Height</label><input className="fi" type="number" value={form.heightMm} onChange={f('heightMm')} placeholder="mm" /></div>
              </div>
              <div className="fg"><label className="fl">Colour Override</label><input className="fi" value={form.color} onChange={f('color')} placeholder="Leave blank to use variety colour" /></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleSave}>Register Block</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
