import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icons } from '../constants/icons';
import './PhotoGallery.css';

interface Photo {
  id: number;
  file_path: string;
  caption: string | null;
  category: string;
  zone: string | null;
  uploaded_at: string;
  uploaded_by_name: string;
}

interface PhotoGalleryProps {
  entityType: 'quarry' | 'block';
  entityId: number;
  zone?: string;
  category?: string;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  entityType,
  entityId,
  zone,
  category,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['photos', entityType, entityId, zone, category],
    queryFn: async () => {
      const token = localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token
        : null;

      const params = new URLSearchParams();
      if (zone) params.append('zone', zone);
      if (category) params.append('category', category);

      const response = await fetch(
        `/api/photos/${entityType}s/${entityId}/photos?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch photos');
      return response.json();
    },
  });

  const photos: Photo[] = data?.photos || [];

  const deletePhoto = async (photoId: number) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token
        : null;

      const response = await fetch(`/api/photos/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Delete failed');

      // Refresh photos list
      queryClient.invalidateQueries({
        queryKey: ['photos', entityType, entityId],
      });

      setSelectedPhoto(null);
    } catch (error) {
      alert('Failed to delete photo');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading photos...</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">{Icons.camera}</div>
        <h3 className="empty-state-title">No photos yet</h3>
        <p className="empty-state-description">
          Upload photos to document this {entityType}
        </p>
      </div>
    );
  }

  return (
    <div className="photo-gallery">
      <div className="gallery-grid">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="gallery-item"
            onClick={() => setSelectedPhoto(photo)}
          >
            <img
              src={photo.file_path}
              alt={photo.caption || 'Photo'}
              className="gallery-thumbnail"
            />
            <div className="gallery-overlay">
              <span className="gallery-icon">{Icons.expand}</span>
            </div>
            {photo.zone && (
              <div className="gallery-badge">
                {Icons.location} {photo.zone}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <div className="lightbox" onClick={() => setSelectedPhoto(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setSelectedPhoto(null)}
              title="Close"
            >
              {Icons.cancelled}
            </button>

            <img
              src={selectedPhoto.file_path}
              alt={selectedPhoto.caption || 'Photo'}
              className="lightbox-image"
            />

            <div className="lightbox-info">
              {selectedPhoto.caption && (
                <h3 className="lightbox-caption">{selectedPhoto.caption}</h3>
              )}
              
              <div className="lightbox-meta">
                <div className="meta-item">
                  <span className="meta-label">{Icons.user} Uploaded by:</span>
                  <span className="meta-value">{selectedPhoto.uploaded_by_name}</span>
                </div>
                
                <div className="meta-item">
                  <span className="meta-label">{Icons.calendar} Date:</span>
                  <span className="meta-value">
                    {new Date(selectedPhoto.uploaded_at).toLocaleDateString()}
                  </span>
                </div>

                {selectedPhoto.zone && (
                  <div className="meta-item">
                    <span className="meta-label">{Icons.location} Zone:</span>
                    <span className="meta-value">{selectedPhoto.zone}</span>
                  </div>
                )}

                <div className="meta-item">
                  <span className="meta-label">{Icons.tag} Category:</span>
                  <span className="meta-value">{selectedPhoto.category}</span>
                </div>
              </div>

              <div className="lightbox-actions">
                <button
                  className="btn btn-error"
                  onClick={() => deletePhoto(selectedPhoto.id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? <span className="spinner"></span> : Icons.delete}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;