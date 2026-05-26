import { useState, useRef } from 'react';
import { Icons } from '../constants/icons';
import './PhotoUpload.css';

interface PhotoUploadProps {
  entityType: 'quarry' | 'block';
  entityId: number;
  category?: string;
  zone?: string;
  onUploadSuccess?: (photoId: number) => void;
  multiple?: boolean;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  entityType,
  entityId,
  category = 'general',
  zone,
  onUploadSuccess,
  multiple = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
        setError(null);
      }
    } catch (err) {
      setError('Camera access denied or not available');
      console.error('Camera error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedImage(file);
          setPreview(canvas.toDataURL('image/jpeg'));
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setCapturedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload photo
  const uploadPhoto = async () => {
    if (!capturedImage) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('photo', capturedImage);
      formData.append('category', category);
      if (zone) formData.append('zone', zone);

      const token = localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.token
        : null;

      const response = await fetch(`/api/photos/${entityType}s/${entityId}/photos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      if (onUploadSuccess) {
        onUploadSuccess(data.photoId);
      }

      // Reset
      setCapturedImage(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Clear preview
  const clearPreview = () => {
    setCapturedImage(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="photo-upload">
      {error && (
        <div className="alert alert-error">
          {Icons.error} {error}
        </div>
      )}

      {!showCamera && !preview && (
        <div className="upload-actions">
          <button
            className="btn btn-primary"
            onClick={startCamera}
            title="Take Photo"
          >
            {Icons.camera} Take Photo
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            title="Upload from Device"
          >
            {Icons.upload} Upload File
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            multiple={multiple}
          />
        </div>
      )}

      {showCamera && (
        <div className="camera-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="camera-video"
          />
          <div className="camera-controls">
            <button
              className="btn btn-primary btn-lg"
              onClick={capturePhoto}
              title="Capture"
            >
              {Icons.camera} Capture
            </button>
            <button
              className="btn btn-secondary"
              onClick={stopCamera}
              title="Cancel"
            >
              {Icons.cancelled} Cancel
            </button>
          </div>
        </div>
      )}

      {preview && (
        <div className="preview-container">
          <img src={preview} alt="Preview" className="preview-image" />
          <div className="preview-actions">
            <button
              className="btn btn-primary"
              onClick={uploadPhoto}
              disabled={uploading}
              title="Upload"
            >
              {uploading ? <span className="spinner"></span> : Icons.upload}
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={clearPreview}
              disabled={uploading}
              title="Retake"
            >
              {Icons.refresh} Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;