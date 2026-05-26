# Photo Upload System

Complete photo management system for quarries and blocks with camera capture and file upload capabilities.

## Features

### 📸 Photo Capture & Upload
- **Camera Capture**: Take photos directly from device camera (mobile/desktop)
- **File Upload**: Upload existing photos from device gallery
- **Multiple Formats**: Support for JPEG, PNG, GIF, WebP
- **File Size**: Up to 10MB per photo
- **Batch Upload**: Upload up to 10 photos at once

### 🗂️ Organization
- **Zone-wise Photos**: Organize quarry photos by zones (Zone A, B, C, D)
- **Categories**: Categorize photos by type:
  - General
  - Blasting
  - Cutting
  - Gangsaw
  - Polishing
  - Quality Check
  - Defects
  - Packaging
  - Inspection
  - Safety
  
### 🔍 Gallery Features
- **Responsive Grid**: Adaptive photo grid layout
- **Lightbox View**: Full-size photo viewer with metadata
- **Filtering**: Filter by zone and category
- **Metadata Display**: View upload date, uploader, zone, category
- **Delete**: Remove unwanted photos

## API Endpoints

### Upload Photo to Quarry
```
POST /api/photos/quarries/:id/photos
Content-Type: multipart/form-data

Body:
- photo: File (required)
- caption: string (optional)
- zone: string (optional) - Zone A, B, C, D
- category: string (optional) - default: 'general'
```

### Upload Photo to Block
```
POST /api/photos/blocks/:id/photos
Content-Type: multipart/form-data

Body:
- photo: File (required)
- caption: string (optional)
- category: string (optional) - default: 'general'
- view_angle: string (optional) - stored in metadata
```

### Batch Upload
```
POST /api/photos/upload/batch
Content-Type: multipart/form-data

Body:
- photos: File[] (max 10)
- entity_type: 'quarry' | 'block' (required)
- entity_id: number (required)
- category: string (optional)
- zone: string (optional)
```

### Get Quarry Photos
```
GET /api/photos/quarries/:id/photos?zone=ZoneA&category=blast

Response:
{
  "photos": [
    {
      "id": 1,
      "file_path": "/uploads/photos/123456-7890.jpg",
      "caption": "Blast site Zone A",
      "category": "blast",
      "zone": "Zone A",
      "uploaded_at": "2026-05-23T10:30:00Z",
      "uploaded_by_name": "John Doe"
    }
  ]
}
```

### Get Block Photos
```
GET /api/photos/blocks/:id/photos?category=gangsaw

Response: Same as above
```

### Update Photo Metadata
```
PATCH /api/photos/photos/:id

Body:
{
  "caption": "Updated caption",
  "category": "quality",
  "zone": "Zone B"
}
```

### Delete Photo
```
DELETE /api/photos/photos/:id
```

## Components

### PhotoUpload Component
Reusable photo capture/upload component with camera access.

```tsx
import PhotoUpload from '../components/PhotoUpload';

<PhotoUpload
  entityType="quarry" // or "block"
  entityId={quarryId}
  category="blast"
  zone="Zone A"
  onUploadSuccess={(photoId) => {
    console.log('Photo uploaded:', photoId);
  }}
  multiple={false}
/>
```

**Props:**
- `entityType`: 'quarry' | 'block' (required)
- `entityId`: number (required)
- `category`: string (optional, default: 'general')
- `zone`: string (optional, for quarries)
- `onUploadSuccess`: (photoId: number) => void (optional)
- `multiple`: boolean (optional, default: false)

### PhotoGallery Component
Display photos in responsive grid with lightbox viewer.

```tsx
import PhotoGallery from '../components/PhotoGallery';

<PhotoGallery
  entityType="quarry"
  entityId={quarryId}
  zone="Zone A"
  category="blast"
/>
```

**Props:**
- `entityType`: 'quarry' | 'block' (required)
- `entityId`: number (required)
- `zone`: string (optional, filter by zone)
- `category`: string (optional, filter by category)

## Usage Examples

### Quarry Photo Management
See [QuarryPhotosPage.tsx](packages/web/src/pages/QuarryPhotosPage.tsx)

Features:
- Zone-wise filtering
- Category filtering
- Camera capture for field documentation
- Upload existing photos
- View full-size with metadata
- Delete photos

### Block Photo Management
See [BlockPhotosPage.tsx](packages/web/src/pages/BlockPhotosPage.tsx)

Features:
- Block info display
- Gangsaw photos
- Quality check documentation
- Defect tracking
- Category-based organization

## Database Schema

### photos Table
```sql
CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,        -- 'quarry' or 'block'
  entity_id INTEGER NOT NULL,       -- quarry_id or block_id
  org_id INTEGER NOT NULL,
  quarry_id INTEGER NOT NULL,       -- Always present for location tracking
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,          -- Relative path from uploads/
  file_size INTEGER,                -- Bytes
  mime_type TEXT,                   -- image/jpeg, etc.
  caption TEXT,
  category TEXT DEFAULT 'general',  -- Photo category
  zone TEXT,                        -- For quarry zone photos
  metadata TEXT,                    -- JSON for additional data
  uploaded_by INTEGER,              -- User ID
  uploaded_at TEXT DEFAULT (datetime('now')),
  active INTEGER DEFAULT 1,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (quarry_id) REFERENCES quarries(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_photos_entity ON photos(entity_type, entity_id);
CREATE INDEX idx_photos_quarry ON photos(quarry_id);
CREATE INDEX idx_photos_zone ON photos(zone);
CREATE INDEX idx_photos_category ON photos(category);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at);
```

## File Storage

### Location
Photos are stored in: `/packages/api/uploads/photos/`

### Naming Convention
Files are automatically named: `{timestamp}-{random}.{ext}`

Example: `1716461400000-123456789.jpg`

### Serving Static Files
Photos are served via Express static middleware:
```js
app.use('/uploads', express.static('uploads'));
```

Access photos at: `http://localhost:8080/uploads/photos/{filename}`

## Security

1. **Authentication**: All endpoints require JWT authentication
2. **Authorization**: Users can only access photos from their organization
3. **File Validation**: 
   - Only image files allowed (jpeg, jpg, png, gif, webp)
   - Max file size: 10MB
4. **File Cleanup**: Files are automatically deleted when photo record is removed

## Camera Access

### Browser Permissions
The PhotoUpload component requests camera access using:
```js
navigator.mediaDevices.getUserMedia({ 
  video: { facingMode: 'environment' },  // Use back camera on mobile
  audio: false 
})
```

### Mobile Optimization
- Uses back camera by default on mobile devices
- Responsive capture controls
- Touch-friendly interface

### Fallback
If camera access is denied, users can still upload from device gallery.

## Icons

Photo-related icons from centralized icon system:
- `Icons.camera` 📷 - Camera/capture
- `Icons.photo` 🖼️ - Photo image
- `Icons.gallery` 🎬 - Gallery/collection
- `Icons.upload` ⬆️ - Upload action
- `Icons.tag` 🏷️ - Category tag
- `Icons.location` 📍 - Zone/location
- `Icons.expand` ➕ - Expand view

## Future Enhancements

- [ ] Photo compression before upload
- [ ] Thumbnail generation
- [ ] GPS coordinates extraction from EXIF
- [ ] Cloud storage integration (S3, Google Cloud)
- [ ] Photo annotations and markup
- [ ] AI-based quality assessment
- [ ] Photo comparison tools
- [ ] Export to PDF reports
- [ ] Bulk photo operations
- [ ] Photo tags and advanced search
