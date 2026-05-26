import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useToastStore } from '../store';
import { apiClient, UPLOADS_BASE } from '../utils/api';

const CATEGORIES = ['general', 'gangsaw', 'cutting', 'polishing', 'quality', 'defect', 'packaging'];

export default function BlockPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const { notify } = useToastStore();
  const blockId = Number(id);

  const [block, setBlock] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lightbox, setLightbox] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('general');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadPhotos = () =>
    apiClient.getBlockPhotos(blockId).then(r => setPhotos(r.photos ?? [])).catch(() => notify('Failed to load photos', 'error'));

  useEffect(() => {
    if (!blockId) return;
    Promise.all([
      apiClient.getBlock(blockId),
      apiClient.getBlockPhotos(blockId),
    ]).then(([b, pr]) => {
      setBlock(b);
      setPhotos(pr.photos ?? []);
    }).catch(() => notify('Failed to load block data', 'error'))
      .finally(() => setLoading(false));
  }, [blockId]);

  // Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setShowCamera(true);
    } catch { notify('Camera access denied or unavailable', 'error'); }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const f = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setFile(f);
      setPreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const resetForm = () => {
    setCaption(''); setCategory('general'); setPreview(null); setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    stopCamera();
  };

  const handleUpload = async () => {
    if (!caption) { notify('Caption is required', 'error'); return; }
    if (!file) { notify('Please take or choose a photo first', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('caption', caption);
      fd.append('category', category);
      await apiClient.uploadBlockPhoto(blockId, fd);
      notify('Photo uploaded');
      resetForm();
      setShowAdd(false);
      loadPhotos();
    } catch { notify('Upload failed', 'error'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (photoId: number) => {
    try {
      await apiClient.deletePhoto(photoId);
      notify('Photo deleted');
      setLightbox(null);
      loadPhotos();
    } catch { notify('Delete failed', 'error'); }
  };

  const photoUrl = (p: any) =>
    p.file_path ? `${UPLOADS_BASE}${p.file_path}` : p.url ?? '';

  if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--t3)' }}>Loading…</div></div>;

  if (!block) {
    return (
      <div className="page">
        <div className="page-header"><div className="ph-title">Block Photos</div></div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
            Block not found. Return to <a href="/blocks" style={{ color: 'var(--rust)' }}>Blocks</a>.
          </div>
        </div>
      </div>
    );
  }

  const filtered = selectedCategory ? photos.filter(p => p.category === selectedCategory) : photos;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Block Photos — {block.block_no}</div>
          <div className="ph-sub">{block.color ?? block.variety_name ?? ''} · Grade {block.grade ?? '—'} · {block.net_cbm ?? block.gross_cbm ?? '—'} CBM</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/blocks" className="btn btn-s">← Blocks</a>
          <button className="btn btn-p" onClick={() => { setShowAdd(s => !s); if (showAdd) resetForm(); }}>
            {showAdd ? 'Cancel' : '+ Add Photo'}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card">
          <div className="card-head"><div className="card-title">Add Photo</div></div>
          <div className="card-body">
            <div className="fg2">
              <div className="fg"><label className="fl">Caption *</label><input className="fi" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Front face, QC check…" /></div>
              <div className="fg"><label className="fl">Category</label>
                <select className="fsel" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* video always in DOM so ref is never null */}
            <div style={{ marginTop: 12, background: 'var(--bg0)', borderRadius: 6, overflow: 'hidden', display: showCamera ? 'block' : 'none' }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: 280, display: 'block', objectFit: 'cover' }} />
              <div style={{ display: 'flex', gap: 8, padding: 10 }}>
                <button className="btn btn-p" onClick={capturePhoto}>Capture</button>
                <button className="btn btn-s" onClick={stopCamera}>Cancel</button>
              </div>
            </div>

            {preview && !showCamera && (
              <div style={{ marginTop: 12, position: 'relative', display: 'inline-block' }}>
                <img src={preview} alt="preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 6, border: '1px solid var(--bd)', display: 'block' }} />
                <button className="btn btn-xs btn-s" onClick={() => { setPreview(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  style={{ position: 'absolute', top: 6, right: 6 }}>✕</button>
              </div>
            )}

            {/* file input always in DOM */}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

            {!showCamera && !preview && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-s" onClick={startCamera}>📷 Take Photo</button>
                <button className="btn btn-s" onClick={() => fileInputRef.current?.click()}>📁 Choose File</button>
              </div>
            )}

            <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-s" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</button>
              <button className="btn btn-p" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="card-title">Photo Gallery — {filtered.length} photo{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="fsel" style={{ fontSize: 10, padding: '3px 6px' }} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {selectedCategory && <button className="btn btn-xs btn-s" onClick={() => setSelectedCategory('')}>Clear</button>}
          </div>
        </div>
        <div className="card-body">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
              {photos.length === 0 ? 'No photos yet — click "+ Add Photo" to upload the first one' : 'No photos in this category'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {filtered.map(p => (
                <div key={p.id} style={{ border: '1px solid var(--bd)', borderRadius: 6, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightbox(p)}>
                  <img src={photoUrl(p)} alt={p.caption} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                    onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/400x300/374151/ffffff?text=${encodeURIComponent(p.caption ?? 'Photo')}`; }} />
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>{p.caption}</div>
                    <div style={{ fontSize: 8.5, color: 'var(--t3)', fontFamily: 'IBM Plex Mono, monospace' }}>{p.category} · {(p.uploaded_at ?? '').slice(0, 10)}</div>
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
              <img src={photoUrl(lightbox)} alt={lightbox.caption}
                style={{ width: '100%', display: 'block', maxHeight: 380, objectFit: 'contain', background: 'var(--bg2)' }}
                onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/600x400/374151/ffffff?text=${encodeURIComponent(lightbox.caption ?? 'Photo')}`; }} />
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                <div><span style={{ color: 'var(--t3)' }}>Category:</span> {lightbox.category}</div>
                <div><span style={{ color: 'var(--t3)' }}>Date:</span> {(lightbox.uploaded_at ?? '').slice(0, 10)}</div>
                <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--t3)' }}>Uploaded by:</span> {lightbox.uploaded_by_name ?? lightbox.uploaded_by ?? '—'}</div>
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
