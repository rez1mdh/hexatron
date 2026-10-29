// src/components/ui/MediaGallery.tsx
// Rich media gallery supporting Images, Videos, Embeds, and Offline Downloads

import { useState } from 'react';
import {
  Play, Image as ImageIcon, Video, Download, CheckCircle,
  Cloud, Trash2, X, AlertCircle, RefreshCw, Film
} from 'lucide-react';
import type { EntityImage } from '../../db/schema';
import { downloadMediaForOffline, removeOfflineMediaCopy } from '../../db/operations';
import './MediaGallery.css';

interface Props {
  images: EntityImage[];
  onRefresh?: () => void;
}

export function parseVideoEmbedUrl(url: string): { type: 'youtube' | 'vimeo' | 'direct' | 'unknown'; embedUrl: string } {
  if (!url) return { type: 'unknown', embedUrl: '' };

  // YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/);
  if (vimeoMatch && vimeoMatch[3]) {
    return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}` };
  }

  // Direct video file (mp4, webm, ogg)
  if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return { type: 'direct', embedUrl: url };
  }

  return { type: 'unknown', embedUrl: url };
}

export default function MediaGallery({ images, onRefresh }: Props) {
  const [activeMedia, setActiveMedia] = useState<EntityImage | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  function formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function getMediaUrl(img: EntityImage): string | null {
    if (img.localBlob) {
      return URL.createObjectURL(img.localBlob);
    }
    return img.remoteUrl || img.remotePath || null;
  }

  async function handleDownloadOffline(img: EntityImage) {
    setDownloadingId(img.id);
    setErrorMsg(null);
    try {
      const res = await downloadMediaForOffline(img.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to download media for offline use.');
      } else {
        onRefresh?.();
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleRemoveOffline(img: EntityImage) {
    setErrorMsg(null);
    try {
      await removeOfflineMediaCopy(img.id);
      onRefresh?.();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="media-gallery-container">
      {errorMsg && (
        <div className="alert-banner warning">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="media-gallery-grid">
        {images.map(img => {
          const isVideo = img.mediaType === 'video' || img.role === 'video' || (img.remoteUrl && (img.remoteUrl.includes('youtube') || img.remoteUrl.includes('vimeo') || img.remoteUrl.match(/\.(mp4|webm)/i)));
          const isOfflineReady = Boolean(img.localBlob || img.isOfflineAvailable);
          const url = getMediaUrl(img);

          return (
            <div key={img.id} className="media-card">
              <div
                className="media-card-preview"
                onClick={() => setActiveMedia(img)}
                title={`View ${img.title || img.caption || 'Media'}`}
              >
                {isVideo ? (
                  <div className="media-card-video-thumb">
                    <Film size={28} />
                    <div className="media-play-overlay">
                      <Play size={16} fill="white" />
                    </div>
                  </div>
                ) : url ? (
                  <img src={url} alt={img.caption || img.title || ''} className="media-card-img" />
                ) : (
                  <div className="media-card-video-thumb">
                    <ImageIcon size={28} />
                  </div>
                )}

                {/* Offline Status Badge */}
                <div className={`media-card-badge ${isOfflineReady ? 'offline-ready' : ''}`}>
                  {isOfflineReady ? (
                    <>
                      <CheckCircle size={10} />
                      <span>Offline Ready</span>
                    </>
                  ) : (
                    <>
                      <Cloud size={10} />
                      <span>Online</span>
                    </>
                  )}
                </div>
              </div>

              <div className="media-card-info">
                <div className="media-card-title">{img.title || img.caption || (isVideo ? 'Video' : 'Image')}</div>
                {img.caption && img.title && <div className="media-card-caption">{img.caption}</div>}

                <div className="media-card-actions">
                  <span className="text-muted">{img.fileSize ? formatBytes(img.fileSize) : (isVideo ? 'Video' : 'Image')}</span>
                  
                  {isOfflineReady ? (
                    <button
                      type="button"
                      className="media-offline-btn danger"
                      onClick={() => handleRemoveOffline(img)}
                      title="Remove local offline copy"
                    >
                      <Trash2 size={11} />
                      <span>Remove</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="media-offline-btn"
                      disabled={downloadingId === img.id}
                      onClick={() => handleDownloadOffline(img)}
                      title="Download file into local browser storage for offline viewing"
                    >
                      {downloadingId === img.id ? (
                        <>
                          <RefreshCw size={11} className="spin" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <Download size={11} />
                          <span>Save Offline</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / Video Player Modal */}
      {activeMedia && (
        <div className="media-lightbox-backdrop" onClick={() => setActiveMedia(null)}>
          <div className="media-lightbox-content" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="media-lightbox-close"
              onClick={() => setActiveMedia(null)}
              title="Close viewer"
            >
              <X size={16} />
            </button>

            <div className="media-lightbox-body">
              {(() => {
                const isVideo = activeMedia.mediaType === 'video' || activeMedia.role === 'video';
                const url = getMediaUrl(activeMedia);

                if (!isOnline && !activeMedia.localBlob) {
                  return (
                    <div className="media-offline-notice">
                      <AlertCircle size={28} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--accent)' }} />
                      <p><strong>Offline Media Unavailable</strong></p>
                      <p>This media requires an active internet connection to load. Download it when online to access it offline.</p>
                    </div>
                  );
                }

                if (isVideo) {
                  const target = activeMedia.remoteUrl || activeMedia.remotePath || '';
                  const parsed = parseVideoEmbedUrl(target);

                  if (activeMedia.localBlob) {
                    return (
                      <video
                        src={URL.createObjectURL(activeMedia.localBlob)}
                        controls
                        autoPlay
                        className="media-lightbox-video"
                      />
                    );
                  }

                  if (parsed.type === 'youtube' || parsed.type === 'vimeo') {
                    return (
                      <iframe
                        src={parsed.embedUrl}
                        title={activeMedia.title || 'Video Player'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="media-lightbox-iframe"
                      />
                    );
                  }

                  if (url) {
                    return (
                      <video
                        src={url}
                        controls
                        autoPlay
                        className="media-lightbox-video"
                      />
                    );
                  }
                }

                if (url) {
                  return <img src={url} alt={activeMedia.caption || activeMedia.title || ''} className="media-lightbox-img" />;
                }

                return <div className="media-offline-notice">Unable to load media content.</div>;
              })()}
            </div>

            <div className="media-lightbox-footer">
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {activeMedia.title || activeMedia.caption || 'Media Viewer'}
                </div>
                {activeMedia.description && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {activeMedia.description}
                  </div>
                )}
              </div>

              <div>
                {activeMedia.localBlob ? (
                  <span className="media-card-badge offline-ready">
                    <CheckCircle size={11} /> Saved for Offline ({formatBytes(activeMedia.fileSize)})
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary small"
                    onClick={() => handleDownloadOffline(activeMedia)}
                  >
                    <Download size={13} /> Save Offline
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
