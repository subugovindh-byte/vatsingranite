import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToastStore } from '../store';

const QUARRIES_DEMO: Record<string, { quarry_code: string; quarry_name: string; district: string }> = {
  '1': { quarry_code: 'VATSIN-001', quarry_name: 'Vatsin Granite', district: 'Krishnagiri' },
  '2': { quarry_code: 'PARA-001', quarry_name: 'Paradiso Quarry', district: 'Krishnagiri' },
};

const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
const CATEGORIES = ['general', 'blast', 'cutting', 'zone', 'inspection', 'safety'];

const DEMO_PHOTOS: any[] = [];

export default function QuarryPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const { notify } = useToastStore();
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lightbox, setLightbox] = useState<any>(null);
  const [photos, setPhotos] = useState(DEMO_PHOTOS);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ caption: '', zone: 'Zone A', category: 'general', url: '' });

  const quarry = id ? QUARRIES_DEMO[id] : null;

  if (!quarry) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="ph-title">Quarry Photos</div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
            Quarry not found. Return to <a href="/quarries" style={{ color: 'var(--rust)' }}>Quarries</a>.
          </div>
        </div>
      </div>
    );
  }

  const filtered = photos.filter(p =>
    (!selectedZone || p.zone === selectedZone) &&
    (!selectedCategory || p.category === selectedCategory)
  );

  const handleAdd = () => {
    if (!addForm.caption) { notify('Caption is required', 'error'); return; }
    const url = addForm.url || `https://placehold.co/400x300/4b5563/ffffff?text=${encodeURIComponent(addForm.caption)}`;
    setPhotos(prev => [...prev, {
      id: Math.max(...prev.map(p => p.id), 0) + 1,
      url, caption: addForm.caption, zone: addForm.zone, category: addForm.category,
      uploaded_at: new Date().toISOString().slice(0, 10), uploaded_by: 'Current User',
    }]);
    setAddForm({ caption: '', zone: 'Zone A', category: 'general', url: '' });
    setShowAdd(false);
    notify('Photo added');
  };

  const handleDelete = (photoId: number) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    setLightbox(null);
    notify('Photo deleted');
  };

  const clearFilters = () => { setSelectedZone(''); setSelectedCategory(''); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Quarry Photos — {quarry.quarry_name}</div>
          <div className="ph-sub">{quarry.quarry_code} · {quarry.district}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/quarries" className="btn btn-s">← Quarries</a>
          <button className="btn btn-p" onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : '+ Add Photo'}</button>
        </div>
      </div>

      {showAdd && (
        <div className="card">
          <div className="card-head"><div className="card-title">Add Photo</div></div>
          <div className="card-body">
            <div className="fg2">
              <div className="fg"><label className="fl">Caption *</label><input className="fi" value={addForm.caption} onChange={e => setAddForm(p => ({ ...p, caption: e.target.value }))} placeholder="Zone A overview, blast setup…" /></div>
              <div className="fg"><label className="fl">Zone</label><select className="fsel" value={addForm.zone} onChange={e => setAddForm(p => ({ ...p, zone: e.target.value }))}>{ZONES.map(z => <option key={z}>{z}</option>)}</select></div>
            </div>
            <div className="fg2">
              <div className="fg"><label className="fl">Category</label><select className="fsel" value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="fg"><label className="fl">Image URL (optional)</label><input className="fi" value={addForm.url} onChange={e => setAddForm(p => ({ ...p, url: e.target.value }))} placeholder="Leave blank for placeholder" /></div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-s" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-p" onClick={handleAdd}>Add Photo</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="card-title">Photo Gallery — {filtered.length} photos</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="fsel" style={{ fontSize: 10, padding: '3px 6px' }} value={selectedZone} onChange={e => setSelectedZone(e.target.value)}>
              <option value="">All zones</option>
              {ZONES.map(z => <option key={z}>{z}</option>)}
            </select>
            <select className="fsel" style={{ fontSize: 10, padding: '3px 6px' }} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {(selectedZone || selectedCategory) && <button className="btn btn-xs btn-s" onClick={clearFilters}>Clear</button>}
          </div>
        </div>
        <div className="card-body">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>No photos match the selected filter</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {filtered.map(p => (
                <div key={p.id} style={{ border: '1px solid var(--bd)', borderRadius: 6, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightbox(p)}>
                  <div style={{ position: 'relative' }}>
                    <img src={p.url} alt={p.caption} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                    <span style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 7.5, padding: '2px 5px', borderRadius: 3, fontFamily: 'IBM Plex Mono, monospace' }}>{p.zone}</span>
                  </div>
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>{p.caption}</div>
                    <div style={{ fontSize: 8.5, color: 'var(--t3)', fontFamily: 'IBM Plex Mono, monospace' }}>{p.category} · {p.uploaded_at}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="modal-backdrop" onClick={() => setLightbox(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <div className="modal-title">{lightbox.caption}</div>
              <button className="modal-close" onClick={() => setLightbox(null)}>✕</button>
            </div>
            <div style={{ padding: 0 }}>
              <img src={lightbox.url} alt={lightbox.caption} style={{ width: '100%', display: 'block', maxHeight: 380, objectFit: 'contain', background: 'var(--bg2)' }} />
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                <div><span style={{ color: 'var(--t3)' }}>Zone:</span> {lightbox.zone}</div>
                <div><span style={{ color: 'var(--t3)' }}>Category:</span> {lightbox.category}</div>
                <div><span style={{ color: 'var(--t3)' }}>Date:</span> {lightbox.uploaded_at}</div>
                <div><span style={{ color: 'var(--t3)' }}>Uploaded by:</span> {lightbox.uploaded_by}</div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setLightbox(null)}>Close</button>
              <button className="btn btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDelete(lightbox.id)}>Delete Photo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
