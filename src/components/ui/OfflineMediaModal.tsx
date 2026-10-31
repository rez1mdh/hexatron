// src/components/ui/OfflineMediaModal.tsx
// Offline Media Manager: browse, inspect storage usage, and manage locally saved media

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HardDrive, Trash2, X, AlertCircle, Film, Image as ImageIcon,
  ExternalLink, CheckCircle, RefreshCw, Info
} from 'lucide-react';
import type { EntityImage } from '../../db/schema';
import {
  getAllOfflineMedia, removeOfflineMediaCopy, getTotalOfflineStorageUsage, getEntity
} from '../../db/operations';
import './OfflineMediaModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function OfflineMediaModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const [offlineItems, setOfflineItems] = useState<EntityImage[]>([]);
  const [entityTitles, setEntityTitles] = useState<Record<string, string>>({});
  const [totalSize, setTotalSize] = useState(0);
  const [storageEstimate, setStorageEstimate] = useState<{ quota?: number; usage?: number }>({});
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOfflineData();
    }
  }, [isOpen]);

  async function loadOfflineData() {
    setLoading(true);
    setActionError(null);
    try {
      const items = await getAllOfflineMedia();
      setOfflineItems(items);

      const usage = await getTotalOfflineStorageUsage();
      setTotalSize(usage);

      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        setStorageEstimate({ quota: est.quota, usage: est.usage });
      }

      // Fetch titles of associated entities
      const titles: Record<string, string> = {};
      await Promise.all(
        items.map(async item => {
          if (item.entityId && !titles[item.entityId]) {
            const ent = await getEntity(item.entityId);
            if (ent) titles[item.entityId] = ent.title;
          }
        })
      );
      setEntityTitles(titles);
    } catch (err) {
      console.error('Failed to load offline media:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async function handleRemove(id: string) {
    setActionError(null);
    try {
      await removeOfflineMediaCopy(id);
      await loadOfflineData();
    } catch (err) {
      setActionError((err as Error).message);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="offline-modal-backdrop" onClick={onClose}>
      <div className="offline-modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="offline-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <HardDrive size={18} className="text-accent" />
            <span>Offline Media Manager</span>
          </div>
          <button type="button" className="icon-btn small" onClick={onClose} title="Close">
            <X size={15} />
          </button>
        </div>

        <div className="offline-modal-body">
          {actionError && (
            <div className="alert-banner warning">
              <AlertCircle size={14} />
              <span>{actionError}</span>
            </div>
          )}

          {/* Storage Summary */}
          <div className="offline-storage-summary">
            <div className="offline-storage-metric">
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Downloaded Media</span>
              <span className="offline-storage-val">{formatBytes(totalSize)}</span>
            </div>
            <div className="offline-storage-metric" style={{ textAlign: 'right' }}>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Saved Items</span>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>{offlineItems.length} files</span>
            </div>
            {storageEstimate.quota && (
              <div className="offline-storage-metric" style={{ textAlign: 'right' }}>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Browser Quota Available</span>
                <span style={{ fontSize: '0.85rem' }}>{formatBytes(storageEstimate.quota - (storageEstimate.usage || 0))}</span>
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <Info size={13} className="text-secondary" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>Offline media is stored locally in this browser's IndexedDB. Downloaded files remain accessible when disconnected from the internet. Removing an offline copy does not delete the original from cloud storage.</span>
          </p>

          {/* Media List */}
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={18} className="spin" style={{ margin: '0 auto 6px', display: 'block' }} />
              Scanning offline storage…
            </div>
          ) : offlineItems.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              <HardDrive size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
              <p>No media files are currently saved for offline use.</p>
              <p style={{ fontSize: '0.75rem', marginTop: 4 }}>
                Click "Save Offline" on any image or video in an entity's gallery to download it locally.
              </p>
            </div>
          ) : (
            <div className="offline-media-list">
              {offlineItems.map(item => {
                const isVideo = item.mediaType === 'video' || item.role === 'video';
                const thumbUrl = item.localBlob ? URL.createObjectURL(item.localBlob) : item.remoteUrl;
                const entityTitle = entityTitles[item.entityId] || 'Associated Entity';

                return (
                  <div key={item.id} className="offline-media-row">
                    <div className="offline-media-thumb">
                      {isVideo ? (
                        <Film size={20} color="var(--accent)" />
                      ) : thumbUrl ? (
                        <img src={thumbUrl} alt="" />
                      ) : (
                        <ImageIcon size={20} color="var(--text-muted)" />
                      )}
                    </div>

                    <div className="offline-media-details">
                      <div className="offline-media-title">
                        {item.title || item.caption || (isVideo ? 'Video File' : 'Image File')}
                      </div>
                      <div className="offline-media-meta">
                        <span>{formatBytes(item.fileSize || item.localBlob?.size)}</span>
                        <span> • </span>
                        <button
                          type="button"
                          className="btn-link"
                          style={{ fontSize: '0.72rem' }}
                          onClick={() => {
                            navigate(`/entity/${item.entityId}`);
                            onClose();
                          }}
                        >
                          {entityTitle} <ExternalLink size={10} style={{ display: 'inline' }} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="icon-btn small"
                      onClick={() => handleRemove(item.id)}
                      title="Remove offline copy from this device"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

