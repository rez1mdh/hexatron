// src/components/ui/InsertMediaModal.tsx
// Modal for uploading, previewing, and inserting Images and Videos into articles or entity gallery

import { useState } from 'react';
import {
  X, Image as ImageIcon, Video, Upload, Link2, Film, Check, AlertCircle
} from 'lucide-react';
import type { ImageRole } from '../../db/schema';
import { parseVideoEmbedUrl } from './MediaGallery';
import './InsertMediaModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allowInlineOption?: boolean;
  onSaveMedia: (data: {
    file?: File;
    remoteUrl?: string;
    caption?: string;
    title?: string;
    description?: string;
    role: ImageRole;
    mediaType: 'image' | 'video';
    insertInline?: boolean;
  }) => Promise<void> | void;
}

export default function InsertMediaModal({
  isOpen,
  onClose,
  allowInlineOption = false,
  onSaveMedia
}: Props) {
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [sourceType, setSourceType] = useState<'upload' | 'url'>('upload');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState('');
  
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState<ImageRole>('gallery');
  const [insertInline, setInsertInline] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 50MB for video, 15MB for image)
    const maxSize = mediaType === 'video' ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg(`File exceeds maximum supported limit of ${mediaType === 'video' ? '50MB' : '15MB'}.`);
      return;
    }

    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (sourceType === 'upload' && !selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }
    if (sourceType === 'url' && !remoteUrl.trim()) {
      setErrorMsg('Please provide a valid media URL.');
      return;
    }

    setLoading(true);
    try {
      await onSaveMedia({
        file: selectedFile || undefined,
        remoteUrl: sourceType === 'url' ? remoteUrl.trim() : undefined,
        caption: caption.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        role: mediaType === 'video' ? 'video' : role,
        mediaType,
        insertInline,
      });
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const parsedEmbed = sourceType === 'url' && mediaType === 'video' ? parseVideoEmbedUrl(remoteUrl) : null;

  return (
    <div className="media-modal-backdrop" onClick={onClose}>
      <div className="media-modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="media-modal-header">
          <div className="media-modal-title">
            {mediaType === 'video' ? <Video size={18} /> : <ImageIcon size={18} />}
            <span>Insert Image or Video</span>
          </div>
          <button type="button" className="icon-btn small" onClick={onClose} title="Close">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSave} className="media-modal-body">
          {errorMsg && (
            <div className="alert-banner warning">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Media Type Selector */}
          <div className="media-type-selector">
            <button
              type="button"
              className={`media-type-option ${mediaType === 'image' ? 'active' : ''}`}
              onClick={() => { setMediaType('image'); setSelectedFile(null); setFilePreview(null); }}
            >
              <ImageIcon size={14} />
              <span>Image</span>
            </button>
            <button
              type="button"
              className={`media-type-option ${mediaType === 'video' ? 'active' : ''}`}
              onClick={() => { setMediaType('video'); setRole('video'); setSelectedFile(null); setFilePreview(null); }}
            >
              <Film size={14} />
              <span>Video / Embed</span>
            </button>
          </div>

          {/* Source Tabs */}
          <div className="media-source-tabs">
            <button
              type="button"
              className={`media-source-tab ${sourceType === 'upload' ? 'active' : ''}`}
              onClick={() => setSourceType('upload')}
            >
              Upload Local File
            </button>
            <button
              type="button"
              className={`media-source-tab ${sourceType === 'url' ? 'active' : ''}`}
              onClick={() => setSourceType('url')}
            >
              External URL / Embed
            </button>
          </div>

          {/* Upload Input */}
          {sourceType === 'upload' ? (
            <div>
              <label className="media-dropzone">
                <Upload size={24} style={{ margin: '0 auto 6px', color: 'var(--text-muted)' }} />
                <p style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {selectedFile ? selectedFile.name : `Choose or drag a ${mediaType === 'video' ? 'video (.mp4, .webm)' : 'photo (.jpg, .png, .webp)'}`}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {mediaType === 'video' ? 'Max 50MB file size' : 'Max 15MB file size'}
                </p>
                <input
                  type="file"
                  accept={mediaType === 'video' ? 'video/mp4,video/webm,video/ogg' : 'image/*'}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              {filePreview && (
                <div className="media-preview-container">
                  {mediaType === 'video' ? (
                    <video src={filePreview} controls className="media-preview-video" />
                  ) : (
                    <img src={filePreview} alt="Preview" className="media-preview-img" />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="form-label">
                {mediaType === 'video' ? 'Video URL (Direct MP4, YouTube, or Vimeo)' : 'Direct Image URL'}
              </label>
              <input
                type="url"
                className="form-input"
                placeholder={mediaType === 'video' ? 'https://www.youtube.com/watch?v=... or .mp4' : 'https://example.com/photo.jpg'}
                value={remoteUrl}
                onChange={e => setRemoteUrl(e.target.value)}
              />

              {parsedEmbed && (parsedEmbed.type === 'youtube' || parsedEmbed.type === 'vimeo') && (
                <div className="media-preview-container" style={{ marginTop: 8 }}>
                  <iframe
                    src={parsedEmbed.embedUrl}
                    title="Preview"
                    className="media-preview-video"
                    style={{ border: 'none', width: '100%', height: '180px' }}
                  />
                </div>
              )}
              {parsedEmbed && parsedEmbed.type === 'direct' && (
                <div className="media-preview-container" style={{ marginTop: 8 }}>
                  <video src={remoteUrl} controls className="media-preview-video" />
                </div>
              )}
              {sourceType === 'url' && mediaType === 'image' && remoteUrl && (
                <div className="media-preview-container" style={{ marginTop: 8 }}>
                  <img src={remoteUrl} alt="Preview" className="media-preview-img" />
                </div>
              )}
            </div>
          )}

          {/* Metadata Fields */}
          <div>
            <label className="form-label">Title / Heading</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Map of the Eastern Provinces"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Caption / Subtitle</label>
            <input
              type="text"
              className="form-input"
              placeholder="Brief caption shown beneath media"
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Description / Transcript</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Detailed description, context, or transcript notes"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {mediaType === 'image' && (
            <div>
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={role}
                onChange={e => setRole(e.target.value as ImageRole)}
              >
                <option value="gallery">Gallery Photo</option>
                <option value="portrait">Portrait / Cover Image</option>
                <option value="map">Geographical Map</option>
                <option value="flag">Flag / Heraldic Seal</option>
                <option value="other">Other Attachment</option>
              </select>
            </div>
          )}

          {allowInlineOption && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', marginTop: 4 }}>
              <input
                type="checkbox"
                checked={insertInline}
                onChange={e => setInsertInline(e.target.checked)}
              />
              <span>Also insert directly into article body text</span>
            </label>
          )}

          <div className="media-modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Processing…' : 'Attach Media'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

