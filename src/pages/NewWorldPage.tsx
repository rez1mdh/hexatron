// src/pages/NewWorldPage.tsx — create a world (and optionally a universe)

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { createWorld, getUniverses, createUniverse } from '../db/operations';
import { useAppStore } from '../store/appStore';
import { pushWorldToCloud, pushUniverseToCloud } from '../services/cloudSync';
import type { Universe } from '../db/schema';
import './pages.css';

const WORLD_COLORS = [
  '#7c6af7','#4f9ef7','#f7a14f','#f75f5f','#6af7c8',
  '#f7d44f','#e07cf7','#4af79a','#f74fa1','#a1f74f',
];

export default function NewWorldPage() {
  const navigate = useNavigate();
  const { isOwner, currentUser } = useAppStore();
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [universeId, setUniverseId] = useState('');
  const [newUniverseName, setNewUniverseName] = useState('');
  const [createNewUniverse, setCreateNewUniverse] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(WORLD_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUniverses().then(us => {
      setUniverses(us);
      if (us.length > 0) setUniverseId(us[0].id);
      else setCreateNewUniverse(true);
    });
  }, []);

  async function handleSave() {
    if (!title.trim()) return alert('World name is required.');
    setSaving(true);
    try {
      let uId = universeId;
      if (createNewUniverse) {
        const u = await createUniverse(newUniverseName.trim() || 'My Universe');
        uId = u.id;
        if (currentUser) {
          await pushUniverseToCloud(u, currentUser.id);
        }
      }
      const world = await createWorld(uId, title.trim(), description.trim() || undefined, color);
      if (currentUser) {
        await pushWorldToCloud(world, currentUser.id);
      }
      navigate(`/world/${world.id}`);
    } finally {
      setSaving(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="page-container narrow" style={{ paddingTop: 60, textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--surface-raised)', padding: 32, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Owner Access Required</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Only the verified owner can create new worlds. Public visitors have read-only access.
          </p>
          <button className="btn-primary small" onClick={() => navigate('/')}>
            Return to Encyclopedia
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container narrow">
      <div className="edit-header">
        <h2 className="edit-title">New World</h2>
        <div className="edit-actions">
          <button className="btn-ghost small" onClick={() => navigate(-1)}><X size={14}/> Cancel</button>
          <button className="btn-primary small" onClick={handleSave} disabled={saving}>
            <Save size={14}/> {saving ? 'Creating…' : 'Create World'}
          </button>
        </div>
      </div>

      <div className="form-card">
        {/* Universe */}
        {universes.length > 0 && !createNewUniverse && (
          <>
            <label className="form-label">Universe</label>
            <select className="form-select" value={universeId} onChange={e => setUniverseId(e.target.value)}>
              {universes.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
            </select>
            <button className="btn-link" style={{ marginTop: 4 }} onClick={() => setCreateNewUniverse(true)}>
              + Create new universe instead
            </button>
          </>
        )}

        {(createNewUniverse || universes.length === 0) && (
          <>
            <label className="form-label">Universe Name</label>
            <input className="form-input" value={newUniverseName} onChange={e => setNewUniverseName(e.target.value)}
              placeholder="e.g. The Aetherian Mythos" />
            {universes.length > 0 && (
              <button className="btn-link" style={{ marginTop: 4 }} onClick={() => setCreateNewUniverse(false)}>
                ← Use existing universe
              </button>
            )}
          </>
        )}

        {/* World name */}
        <label className="form-label" style={{ marginTop: 16 }}>World Name *</label>
        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Aetheron Prime" />

        {/* Description */}
        <label className="form-label">Description</label>
        <textarea className="form-textarea" rows={3} value={description}
          onChange={e => setDescription(e.target.value)} placeholder="Brief overview of this world…" />

        {/* Color */}
        <label className="form-label">World Color</label>
        <div className="color-picker">
          {WORLD_COLORS.map(c => (
            <button key={c} className={`color-swatch ${color === c ? 'active' : ''}`}
              style={{ '--swatch': c } as React.CSSProperties}
              onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
    </div>
  );
}
