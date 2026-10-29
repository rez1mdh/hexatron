// src/pages/WelcomePage.tsx
// Dedicated Welcome, Introduction, About, and Visitor Guide Page

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass, BookOpen, Users, Globe, Network, Shield,
  Film, Sparkles, ExternalLink, Edit3, Save, X, Plus, Trash2,
  Check, ArrowRight, Star, ChevronRight, Layers, Eye, Play
} from 'lucide-react';
import {
  getWelcomeGuideContent,
  saveWelcomeGuideContent,
  parseVideoUrl,
  type WelcomeGuideContent,
  type VideoMediaItem,
  type FeaturedArticleItem
} from '../services/welcomeGuideService';
import { useAppStore } from '../store/appStore';
import { getWorlds, getEntities, type World, type Entity } from '../db/operations';
import './WelcomePage.css';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { isOwner } = useAppStore();

  const [content, setContent] = useState<WelcomeGuideContent | null>(null);
  const [defaultWorld, setDefaultWorld] = useState<World | null>(null);
  const [entityCounts, setEntityCounts] = useState<{
    characters: number;
    nations: number;
    cultures: number;
    locations: number;
    events: number;
    religions: number;
  }>({
    characters: 0,
    nations: 0,
    cultures: 0,
    locations: 0,
    events: 0,
    religions: 0
  });

  // User preference: Show Welcome on startup
  const [alwaysShowWelcome, setAlwaysShowWelcome] = useState<boolean>(() => {
    return localStorage.getItem('hexatron_always_show_welcome') === 'true';
  });

  // Edit Mode state (Owner only)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<WelcomeGuideContent | null>(null);
  const [activeEditTab, setActiveEditTab] = useState<'general' | 'creator' | 'featured' | 'videos' | 'notes'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active playing video modal
  const [activeVideo, setActiveVideo] = useState<VideoMediaItem | null>(null);

  // Load content & default world
  useEffect(() => {
    getWelcomeGuideContent().then(data => {
      setContent(data);
      setEditForm(JSON.parse(JSON.stringify(data)));
    });

    getWorlds().then(worlds => {
      if (worlds.length > 0) {
        setDefaultWorld(worlds[0]);
        getEntities(worlds[0].id).then(allEnts => {
          setEntityCounts({
            characters: allEnts.filter(e => e.typeId === 'et-character').length,
            nations: allEnts.filter(e => e.typeId === 'et-nation' || e.typeId === 'et-state').length,
            cultures: allEnts.filter(e => e.typeId === 'et-culture' || e.typeId === 'et-ethnicity').length,
            locations: allEnts.filter(e => e.typeId === 'et-location' || e.typeId === 'et-planet' || e.typeId === 'et-city').length,
            events: allEnts.filter(e => e.typeId === 'et-event' || e.typeId === 'et-era').length,
            religions: allEnts.filter(e => e.typeId === 'et-religion').length,
          });
        });
      }
    });
  }, []);

  function handleStartExploring() {
    localStorage.setItem('hexatron_visited_welcome', 'true');
    if (defaultWorld) {
      navigate(`/world/${defaultWorld.id}`);
    } else {
      navigate('/');
    }
  }

  function handleToggleAlwaysShow(checked: boolean) {
    setAlwaysShowWelcome(checked);
    if (checked) {
      localStorage.setItem('hexatron_always_show_welcome', 'true');
    } else {
      localStorage.removeItem('hexatron_always_show_welcome');
    }
  }

  async function handleSaveEdit() {
    if (!editForm) return;
    setIsSaving(true);
    try {
      await saveWelcomeGuideContent(editForm);
      setContent(JSON.parse(JSON.stringify(editForm)));
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save guide changes:', err);
      alert('Failed to save guide changes. Please check console.');
    } finally {
      setIsSaving(false);
    }
  }

  const targetWorldId = defaultWorld?.id || '';

  if (!content) {
    return (
      <div className="welcome-page-loading">
        <div className="welcome-loading-spinner" />
        <p>Loading Welcome &amp; Visitor Guide…</p>
      </div>
    );
  }

  return (
    <div className="welcome-page-container">
      {/* ── Top Floating Action Bar ────────────────────────────────────── */}
      <div className="welcome-top-strip">
        <div className="welcome-top-strip-left">
          <span className="welcome-badge">
            <Compass size={13} /> Official Visitor Guide
          </span>
          {saveSuccess && (
            <span className="welcome-save-pill success">
              <Check size={12} /> Changes saved successfully!
            </span>
          )}
        </div>

        <div className="welcome-top-strip-right">
          <label className="welcome-startup-checkbox-label" title="Remember this preference on this browser">
            <input
              type="checkbox"
              checked={alwaysShowWelcome}
              onChange={e => handleToggleAlwaysShow(e.target.checked)}
            />
            <span>Show on startup</span>
          </label>

          {isOwner && (
            <button
              type="button"
              className="welcome-btn-edit"
              onClick={() => {
                setEditForm(JSON.parse(JSON.stringify(content)));
                setIsEditing(true);
              }}
              title="Edit Welcome Guide Content (Owner only)"
            >
              <Edit3 size={13} /> Edit Guide
            </button>
          )}

          <button
            type="button"
            className="welcome-btn-primary small"
            onClick={handleStartExploring}
          >
            Enter Archive <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* ── A. Hero Section ────────────────────────────────────────────── */}
      <header className="welcome-hero-card">
        {content.bannerImageUrl && (
          <div className="welcome-hero-banner-image-wrap">
            <img src={content.bannerImageUrl} alt={content.projectTitle} className="welcome-hero-banner-img" />
            <div className="welcome-hero-banner-gradient" />
          </div>
        )}

        <div className="welcome-hero-content">
          <span className="welcome-hero-kicker">Fictional Universe &amp; Lore Archive</span>
          <h1 className="welcome-hero-title">{content.projectTitle}</h1>
          <p className="welcome-hero-subtitle">{content.projectSubtitle}</p>
          <p className="welcome-hero-lead">{content.heroIntro}</p>

          <div className="welcome-hero-actions">
            <button
              type="button"
              className="welcome-btn-primary large"
              onClick={handleStartExploring}
            >
              <BookOpen size={16} />
              <span>Start Exploring Articles</span>
              <ArrowRight size={16} />
            </button>

            {defaultWorld && (
              <button
                type="button"
                className="welcome-btn-secondary large"
                onClick={() => navigate(`/world/${defaultWorld.id}/graph`)}
              >
                <Network size={16} />
                <span>Open Relationship Graph</span>
              </button>
            )}

            <a href="#visitor-guide" className="welcome-btn-ghost large">
              <Compass size={16} />
              <span>Beginner Guide</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── B. About Creator & Purpose ─────────────────────────────────── */}
      <section className="welcome-section" id="about-creator">
        <div className="welcome-section-header">
          <span className="welcome-section-tag">Archive Genesis</span>
          <h2 className="welcome-section-title">About the Creator &amp; Purpose</h2>
          <p className="welcome-section-desc">The creative vision and motivations behind this interconnected worldbuilding encyclopedia.</p>
        </div>

        <div className="welcome-creator-grid">
          <div className="welcome-creator-card main">
            <div className="welcome-card-header-icon">
              <Users size={18} className="text-accent" />
              <h3>The Creator</h3>
            </div>
            <div className="welcome-creator-meta">
              <span className="welcome-creator-name">{content.aboutCreator.creatorName}</span>
              <span className="welcome-creator-role">{content.aboutCreator.creatorRole}</span>
            </div>
            <p className="welcome-creator-body">{content.aboutCreator.bio}</p>
            <p className="welcome-creator-wishes"><em>"{content.aboutCreator.visitorWishes}"</em></p>
          </div>

          <div className="welcome-creator-card">
            <div className="welcome-card-header-icon">
              <Sparkles size={18} className="text-accent" />
              <h3>Purpose of the Archive</h3>
            </div>
            <p className="welcome-creator-body">{content.aboutCreator.purpose}</p>
          </div>

          <div className="welcome-creator-card">
            <div className="welcome-card-header-icon">
              <Globe size={18} className="text-accent" />
              <h3>Inspiration &amp; Distinction</h3>
            </div>
            <p className="welcome-creator-body">{content.aboutCreator.inspiration}</p>
            <div className="welcome-card-callout">
              <strong>Setting Pillars:</strong> {content.aboutCreator.distinctiveElements}
            </div>
          </div>
        </div>
      </section>

      {/* ── C. What You Can Find Here ──────────────────────────────────── */}
      <section className="welcome-section" id="what-you-can-find">
        <div className="welcome-section-header">
          <span className="welcome-section-tag">Browse the Setting</span>
          <h2 className="welcome-section-title">What You Can Find Here</h2>
          <p className="welcome-section-desc">Explore fully indexed records categorized across key dimensions of this fictional universe.</p>
        </div>

        <div className="welcome-categories-grid">
          {/* Characters */}
          <div
            className="welcome-cat-card"
            onClick={() => targetWorldId && navigate(`/world/${targetWorldId}?type=et-character`)}
            role="button"
            tabIndex={0}
          >
            <div className="welcome-cat-top">
              <div className="welcome-cat-icon red"><Users size={20} /></div>
              <span className="welcome-cat-count">{entityCounts.characters || '110+'} Entries</span>
            </div>
            <h3 className="welcome-cat-title">Characters &amp; Figures</h3>
            <p className="welcome-cat-desc">Warriors, chieftains, presidents, senators, and founders including Hannik Armanas and the heroes of Trafloriede.</p>
            <span className="welcome-cat-link">Browse Characters <ChevronRight size={13} /></span>
          </div>

          {/* Nations */}
          <div
            className="welcome-cat-card"
            onClick={() => targetWorldId && navigate(`/world/${targetWorldId}?type=et-nation`)}
            role="button"
            tabIndex={0}
          >
            <div className="welcome-cat-top">
              <div className="welcome-cat-icon blue"><Shield size={20} /></div>
              <span className="welcome-cat-count">{entityCounts.nations || '30+'} Realms</span>
            </div>
            <h3 className="welcome-cat-title">Nations &amp; Civilizations</h3>
            <p className="welcome-cat-desc">The Federated States of Aurythar (FSA), tribal alliances, autonomous governorates, and sovereign plains.</p>
            <span className="welcome-cat-link">Browse Nations <ChevronRight size={13} /></span>
          </div>

          {/* Cultures & Armanites */}
          <div
            className="welcome-cat-card"
            onClick={() => navigate('/entity/culture-armanites')}
            role="button"
            tabIndex={0}
          >
            <div className="welcome-cat-top">
              <div className="welcome-cat-icon purple"><Users size={20} /></div>
              <span className="welcome-cat-count">110 Members</span>
            </div>
            <h3 className="welcome-cat-title">Armanites &amp; Cultures</h3>
            <p className="welcome-cat-desc">The direct descendants of Hannik Armanas, family-name-first naming law, and multi-generation family trees.</p>
            <span className="welcome-cat-link">Open Armanites Lineage <ChevronRight size={13} /></span>
          </div>

          {/* Geography */}
          <div
            className="welcome-cat-card"
            onClick={() => targetWorldId && navigate(`/world/${targetWorldId}?type=et-location`)}
            role="button"
            tabIndex={0}
          >
            <div className="welcome-cat-top">
              <div className="welcome-cat-icon green"><Globe size={20} /></div>
              <span className="welcome-cat-count">{entityCounts.locations || '20+'} Places</span>
            </div>
            <h3 className="welcome-cat-title">Planets &amp; Geography</h3>
            <p className="welcome-cat-desc">The planetary sphere of Aurythar, native territories, the Plains of Sorivinsenzio, and fortified river passes.</p>
            <span className="welcome-cat-link">Explore Locations <ChevronRight size={13} /></span>
          </div>

          {/* History */}
          <div
            className="welcome-cat-card"
            onClick={() => targetWorldId && navigate(`/world/${targetWorldId}?type=et-event`)}
            role="button"
            tabIndex={0}
          >
            <div className="welcome-cat-top">
              <div className="welcome-cat-icon amber"><Sparkles size={20} /></div>
              <span className="welcome-cat-count">{entityCounts.events || '15+'} Chronicles</span>
            </div>
            <h3 className="welcome-cat-title">History &amp; Battles</h3>
            <p className="welcome-cat-desc">Chronicles of native resistance, colonization, treaties, and the turning point at The Battle of Trafloriede (50 A.C.).</p>
            <span className="welcome-cat-link">View Historical Events <ChevronRight size={13} /></span>
          </div>

          {/* Religions */}
          <div
            className="welcome-cat-card"
            onClick={() => targetWorldId && navigate(`/world/${targetWorldId}?type=et-religion`)}
            role="button"
            tabIndex={0}
          >
            <div className="welcome-cat-top">
              <div className="welcome-cat-icon teal"><BookOpen size={20} /></div>
              <span className="welcome-cat-count">{entityCounts.religions || '5'} Faiths</span>
            </div>
            <h3 className="welcome-cat-title">Religions &amp; Faiths</h3>
            <p className="welcome-cat-desc">Spiritual traditions, ancestral rites, Inkarism, and theological schisms that shape political loyalties.</p>
            <span className="welcome-cat-link">Read Religions <ChevronRight size={13} /></span>
          </div>

          {/* Relationship Network Graph */}
          <div
            className="welcome-cat-card accent"
            onClick={() => navigate('/graph')}
            role="button"
            tabIndex={0}
          >
            <div className="welcome-cat-top">
              <div className="welcome-cat-icon accent"><Network size={20} /></div>
              <span className="welcome-cat-count">Interactive 2D</span>
            </div>
            <h3 className="welcome-cat-title">Relationship Graph</h3>
            <p className="welcome-cat-desc">Interactive force-directed node visualization connecting kinships, alliances, rivalries, and institutions.</p>
            <span className="welcome-cat-link">Open Full Graph <ChevronRight size={13} /></span>
          </div>

          {/* Media & Videos */}
          <div
            className="welcome-cat-card"
            onClick={() => {
              const el = document.getElementById('videos-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            role="button"
            tabIndex={0}
          >
            <div className="welcome-cat-top">
              <div className="welcome-cat-icon rose"><Film size={20} /></div>
              <span className="welcome-cat-count">{content.videos.length} Videos</span>
            </div>
            <h3 className="welcome-cat-title">Videos &amp; Media</h3>
            <p className="welcome-cat-desc">Creator videos, narrated lore, and visual presentations expanding upon the written encyclopedia.</p>
            <span className="welcome-cat-link">Watch Videos <ChevronRight size={13} /></span>
          </div>
        </div>
      </section>

      {/* ── D. Videos & Media Section ───────────────────────────────────── */}
      <section className="welcome-section" id="videos-section">
        <div className="welcome-section-header">
          <span className="welcome-section-tag">Multimedia</span>
          <h2 className="welcome-section-title">Videos &amp; Project Media</h2>
          <p className="welcome-section-desc">Watch videos and multimedia presentations detailing the history and universe lore.</p>
        </div>

        {content.videos.length > 0 ? (
          <div className="welcome-videos-grid">
            {content.videos.map(v => {
              const embed = parseVideoUrl(v.url);
              return (
                <div key={v.id} className="welcome-video-card">
                  <div
                    className="welcome-video-thumb-container"
                    onClick={() => setActiveVideo(v)}
                    title={`Play ${v.title}`}
                  >
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt={v.title} className="welcome-video-thumb" />
                    ) : (
                      <div className="welcome-video-thumb-fallback">
                        <Film size={36} />
                      </div>
                    )}
                    <div className="welcome-video-play-overlay">
                      <div className="welcome-play-button">
                        <Play size={22} fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <div className="welcome-video-meta">
                    <h3 className="welcome-video-title" onClick={() => setActiveVideo(v)}>{v.title}</h3>
                    {v.description && <p className="welcome-video-desc">{v.description}</p>}
                    <div className="welcome-video-actions">
                      <button
                        type="button"
                        className="welcome-video-play-btn"
                        onClick={() => setActiveVideo(v)}
                      >
                        <Play size={12} fill="currentColor" /> Watch Video
                      </button>
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="welcome-video-ext-link"
                        title="Open on host site"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="welcome-empty-media-box">
            <Film size={36} className="text-muted" />
            <h3>No Videos Published Yet</h3>
            <p>Video records, trailers, and narrated lore clips will be posted here as they become available.</p>
            {isOwner && (
              <button
                type="button"
                className="welcome-btn-primary"
                onClick={() => {
                  setEditForm(JSON.parse(JSON.stringify(content)));
                  setActiveEditTab('videos');
                  setIsEditing(true);
                }}
              >
                <Plus size={14} /> Add First Video
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── E. How to Explore the Archive ──────────────────────────────── */}
      <section className="welcome-section" id="visitor-guide">
        <div className="welcome-section-header">
          <span className="welcome-section-tag">Visitor Guide</span>
          <h2 className="welcome-section-title">How to Explore the Archive</h2>
          <p className="welcome-section-desc">Six simple ways to navigate, discover, and cross-reference entries in this encyclopedia.</p>
        </div>

        <div className="welcome-guide-steps-grid">
          <div className="welcome-step-card">
            <div className="welcome-step-number">1</div>
            <h3>Start with Featured Entries</h3>
            <p>Begin with seminal historical anchors such as <strong className="text-accent">Hannik Armanas</strong> or <strong className="text-accent">The Battle of Trafloriede</strong> to orient yourself in the setting's core events.</p>
          </div>

          <div className="welcome-step-card">
            <div className="welcome-step-number">2</div>
            <h3>Follow Interconnected Lore Links</h3>
            <p>Every article features <span className="entity-link-demo">underlined blue links</span>. Click any mentioned character, faction, or battle to open their full dossier seamlessly.</p>
          </div>

          <div className="welcome-step-card">
            <div className="welcome-step-number">3</div>
            <h3>Use the Left Hierarchy Tree</h3>
            <p>Tap the <strong className="text-accent">Tree</strong> button on the bottom bar or topbar to open the nested taxonomy drawer, organizing articles by planet, state, and tribe.</p>
          </div>

          <div className="welcome-step-card">
            <div className="welcome-step-number">4</div>
            <h3>Inspect the 2D Relationship Graph</h3>
            <p>Switch to <strong className="text-accent">Graph View</strong> anytime to visually explore alliances, rivalries, bloodlines, and political memberships in an interactive node cloud.</p>
          </div>

          <div className="welcome-step-card">
            <div className="welcome-step-number">5</div>
            <h3>Switch to Clean Reader Mode</h3>
            <p>On any article, tap <strong className="text-accent">Reader</strong> for a distraction-free, beautifully formatted reading layout optimized for deep immersion and customized font sizing.</p>
          </div>

          <div className="welcome-step-card">
            <div className="welcome-step-number">6</div>
            <h3>Instant Search with Ctrl+K</h3>
            <p>Press <kbd>Ctrl+K</kbd> (or tap the search handle on mobile) to instantly search all articles, entry numbers, alternate spellings, and historical aliases.</p>
          </div>
        </div>
      </section>

      {/* ── F. Featured Starting Points ────────────────────────────────── */}
      <section className="welcome-section" id="featured-starting-points">
        <div className="welcome-section-header">
          <span className="welcome-section-tag">Recommended Reading</span>
          <h2 className="welcome-section-title">Featured Starting Points</h2>
          <p className="welcome-section-desc">Hand-picked foundational articles to begin your journey through the history of Aurythar.</p>
        </div>

        <div className="welcome-featured-grid">
          {content.featuredArticles.map((item, idx) => (
            <div
              key={item.entityId || idx}
              className="welcome-featured-card"
              onClick={() => navigate(`/entity/${item.entityId}`)}
              role="button"
              tabIndex={0}
            >
              <div className="welcome-featured-card-top">
                {item.badge && <span className="welcome-featured-badge">{item.badge}</span>}
                <span className="welcome-featured-card-num">#0{idx + 1}</span>
              </div>
              <h3 className="welcome-featured-title">{item.title}</h3>
              {item.subtitle && <p className="welcome-featured-sub">{item.subtitle}</p>}
              <div className="welcome-featured-footer">
                <span>Read Full Article</span>
                <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── G. Project Notes & Acknowledgements (if present) ───────────── */}
      {(content.projectNotes || content.acknowledgements) && (
        <section className="welcome-section" id="notes-acknowledgements">
          <div className="welcome-notes-grid">
            {content.projectNotes && (
              <div className="welcome-notes-box">
                <h3>Project Notes &amp; Status</h3>
                <p>{content.projectNotes}</p>
              </div>
            )}
            {content.acknowledgements && (
              <div className="welcome-notes-box">
                <h3>Acknowledgements &amp; Credits</h3>
                <p>{content.acknowledgements}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Bottom Call To Action ──────────────────────────────────────── */}
      <footer className="welcome-bottom-cta">
        <div className="welcome-bottom-cta-content">
          <h2>Ready to Explore the Universe?</h2>
          <p>Begin reading articles, examining genealogical bloodlines, and following historical chronicles.</p>
          <div className="welcome-bottom-cta-buttons">
            <button
              type="button"
              className="welcome-btn-primary large"
              onClick={handleStartExploring}
            >
              <span>Enter the Encyclopedia</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="welcome-btn-secondary large"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to Top
            </button>
          </div>
        </div>
        <p className="welcome-disclaimer-note">
          Notice: Visitor preferences (such as dismissing this introduction or toggling startup view) are stored locally in your browser.
        </p>
      </footer>

      {/* ── Active Video Player Modal ──────────────────────────────────── */}
      {activeVideo && (
        <div className="welcome-modal-overlay" onClick={() => setActiveVideo(null)} role="dialog">
          <div className="welcome-video-modal-card" onClick={e => e.stopPropagation()}>
            <div className="welcome-video-modal-header">
              <h3>{activeVideo.title}</h3>
              <button
                type="button"
                className="welcome-modal-close-btn"
                onClick={() => setActiveVideo(null)}
                aria-label="Close video player"
              >
                <X size={18} />
              </button>
            </div>
            <div className="welcome-video-player-container">
              {(() => {
                const parsed = parseVideoUrl(activeVideo.url);
                if (parsed.type === 'youtube' && parsed.embedUrl) {
                  return (
                    <iframe
                      src={parsed.embedUrl}
                      title={activeVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="welcome-video-iframe"
                    />
                  );
                } else if (parsed.type === 'vimeo' && parsed.embedUrl) {
                  return (
                    <iframe
                      src={parsed.embedUrl}
                      title={activeVideo.title}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="welcome-video-iframe"
                    />
                  );
                } else if (parsed.type === 'direct') {
                  return (
                    <video
                      controls
                      autoPlay
                      src={parsed.originalUrl}
                      className="welcome-video-native"
                    />
                  );
                } else {
                  return (
                    <div className="welcome-video-fallback-box">
                      <p>This video is hosted externally.</p>
                      <a
                        href={activeVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="welcome-btn-primary"
                      >
                        <ExternalLink size={14} /> Open in New Tab
                      </a>
                    </div>
                  );
                }
              })()}
            </div>
            {activeVideo.description && (
              <p className="welcome-video-modal-desc">{activeVideo.description}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Owner Edit Modal (Owner Only) ───────────────────────────────── */}
      {isEditing && editForm && isOwner && (
        <div className="welcome-modal-overlay" role="dialog" aria-modal="true">
          <div className="welcome-edit-modal-card">
            <div className="welcome-edit-modal-header">
              <div className="welcome-edit-title-group">
                <Edit3 size={18} className="text-accent" />
                <h2>Edit Welcome Guide &amp; Introduction</h2>
              </div>
              <button
                type="button"
                className="welcome-modal-close-btn"
                onClick={() => setIsEditing(false)}
                aria-label="Close editor"
              >
                <X size={18} />
              </button>
            </div>

            {/* Edit Tabs */}
            <div className="welcome-edit-tabs">
              <button
                type="button"
                className={`welcome-edit-tab ${activeEditTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('general')}
              >
                General &amp; Hero
              </button>
              <button
                type="button"
                className={`welcome-edit-tab ${activeEditTab === 'creator' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('creator')}
              >
                About Creator
              </button>
              <button
                type="button"
                className={`welcome-edit-tab ${activeEditTab === 'featured' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('featured')}
              >
                Featured Articles ({editForm.featuredArticles.length})
              </button>
              <button
                type="button"
                className={`welcome-edit-tab ${activeEditTab === 'videos' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('videos')}
              >
                Videos &amp; Media ({editForm.videos.length})
              </button>
              <button
                type="button"
                className={`welcome-edit-tab ${activeEditTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveEditTab('notes')}
              >
                Notes &amp; Credits
              </button>
            </div>

            <div className="welcome-edit-body">
              {/* General Tab */}
              {activeEditTab === 'general' && (
                <div className="welcome-edit-pane">
                  <div className="welcome-form-group">
                    <label>Project / Universe Title</label>
                    <input
                      type="text"
                      value={editForm.projectTitle}
                      onChange={e => setEditForm({ ...editForm, projectTitle: e.target.value })}
                      placeholder="e.g. Aurythar"
                    />
                  </div>
                  <div className="welcome-form-group">
                    <label>Project Subtitle</label>
                    <input
                      type="text"
                      value={editForm.projectSubtitle}
                      onChange={e => setEditForm({ ...editForm, projectSubtitle: e.target.value })}
                      placeholder="e.g. An Interconnected Worldbuilding Encyclopedia"
                    />
                  </div>
                  <div className="welcome-form-group">
                    <label>Welcome / Hero Introduction Text</label>
                    <textarea
                      rows={4}
                      value={editForm.heroIntro}
                      onChange={e => setEditForm({ ...editForm, heroIntro: e.target.value })}
                    />
                  </div>
                  <div className="welcome-form-group">
                    <label>Banner Image URL (optional)</label>
                    <input
                      type="text"
                      value={editForm.bannerImageUrl || ''}
                      onChange={e => setEditForm({ ...editForm, bannerImageUrl: e.target.value })}
                      placeholder="https://... (or leave empty)"
                    />
                  </div>
                </div>
              )}

              {/* Creator Tab */}
              {activeEditTab === 'creator' && (
                <div className="welcome-edit-pane">
                  <div className="welcome-form-row">
                    <div className="welcome-form-group">
                      <label>Creator Display Name</label>
                      <input
                        type="text"
                        value={editForm.aboutCreator.creatorName}
                        onChange={e => setEditForm({
                          ...editForm,
                          aboutCreator: { ...editForm.aboutCreator, creatorName: e.target.value }
                        })}
                      />
                    </div>
                    <div className="welcome-form-group">
                      <label>Creator Role / Title</label>
                      <input
                        type="text"
                        value={editForm.aboutCreator.creatorRole}
                        onChange={e => setEditForm({
                          ...editForm,
                          aboutCreator: { ...editForm.aboutCreator, creatorRole: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div className="welcome-form-group">
                    <label>Biography &amp; Creator Introduction</label>
                    <textarea
                      rows={3}
                      value={editForm.aboutCreator.bio}
                      onChange={e => setEditForm({
                        ...editForm,
                        aboutCreator: { ...editForm.aboutCreator, bio: e.target.value }
                      })}
                    />
                  </div>
                  <div className="welcome-form-group">
                    <label>Why this encyclopedia exists (Purpose)</label>
                    <textarea
                      rows={3}
                      value={editForm.aboutCreator.purpose}
                      onChange={e => setEditForm({
                        ...editForm,
                        aboutCreator: { ...editForm.aboutCreator, purpose: e.target.value }
                      })}
                    />
                  </div>
                  <div className="welcome-form-group">
                    <label>Project Inspiration</label>
                    <textarea
                      rows={3}
                      value={editForm.aboutCreator.inspiration}
                      onChange={e => setEditForm({
                        ...editForm,
                        aboutCreator: { ...editForm.aboutCreator, inspiration: e.target.value }
                      })}
                    />
                  </div>
                  <div className="welcome-form-group">
                    <label>Distinctive Elements / Setting Pillars</label>
                    <textarea
                      rows={3}
                      value={editForm.aboutCreator.distinctiveElements}
                      onChange={e => setEditForm({
                        ...editForm,
                        aboutCreator: { ...editForm.aboutCreator, distinctiveElements: e.target.value }
                      })}
                    />
                  </div>
                  <div className="welcome-form-group">
                    <label>What you hope visitors will discover</label>
                    <input
                      type="text"
                      value={editForm.aboutCreator.visitorWishes}
                      onChange={e => setEditForm({
                        ...editForm,
                        aboutCreator: { ...editForm.aboutCreator, visitorWishes: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}

              {/* Featured Articles Tab */}
              {activeEditTab === 'featured' && (
                <div className="welcome-edit-pane">
                  <div className="welcome-edit-header-row">
                    <p className="welcome-edit-desc">Select existing articles to highlight on the welcome page.</p>
                    <button
                      type="button"
                      className="welcome-btn-secondary small"
                      onClick={() => {
                        const newItems = [...editForm.featuredArticles, {
                          entityId: '',
                          title: 'New Featured Article',
                          subtitle: 'Description of this key lore entry',
                          badge: 'Featured'
                        }];
                        setEditForm({ ...editForm, featuredArticles: newItems });
                      }}
                    >
                      <Plus size={13} /> Add Article
                    </button>
                  </div>

                  <div className="welcome-edit-items-list">
                    {editForm.featuredArticles.map((fa, idx) => (
                      <div key={idx} className="welcome-edit-item-row">
                        <div className="welcome-edit-item-fields">
                          <input
                            type="text"
                            placeholder="Entity ID (e.g. char-hannik-armanas)"
                            value={fa.entityId}
                            onChange={e => {
                              const updated = [...editForm.featuredArticles];
                              updated[idx].entityId = e.target.value;
                              setEditForm({ ...editForm, featuredArticles: updated });
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Display Title"
                            value={fa.title}
                            onChange={e => {
                              const updated = [...editForm.featuredArticles];
                              updated[idx].title = e.target.value;
                              setEditForm({ ...editForm, featuredArticles: updated });
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Subtitle / Description"
                            value={fa.subtitle || ''}
                            onChange={e => {
                              const updated = [...editForm.featuredArticles];
                              updated[idx].subtitle = e.target.value;
                              setEditForm({ ...editForm, featuredArticles: updated });
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Badge (e.g. Historical Figure)"
                            value={fa.badge || ''}
                            onChange={e => {
                              const updated = [...editForm.featuredArticles];
                              updated[idx].badge = e.target.value;
                              setEditForm({ ...editForm, featuredArticles: updated });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="welcome-edit-item-del-btn"
                          onClick={() => {
                            const updated = editForm.featuredArticles.filter((_, i) => i !== idx);
                            setEditForm({ ...editForm, featuredArticles: updated });
                          }}
                          title="Remove featured article"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos Tab */}
              {activeEditTab === 'videos' && (
                <div className="welcome-edit-pane">
                  <div className="welcome-edit-header-row">
                    <p className="welcome-edit-desc">Add YouTube, Vimeo, or direct MP4 video links to showcase your creative media.</p>
                    <button
                      type="button"
                      className="welcome-btn-secondary small"
                      onClick={() => {
                        const newV: VideoMediaItem = {
                          id: `vid-${Date.now()}`,
                          title: 'New Video Presentation',
                          url: '',
                          description: 'Short summary of video contents.'
                        };
                        setEditForm({ ...editForm, videos: [...editForm.videos, newV] });
                      }}
                    >
                      <Plus size={13} /> Add Video
                    </button>
                  </div>

                  <div className="welcome-edit-items-list">
                    {editForm.videos.map((vid, idx) => (
                      <div key={vid.id || idx} className="welcome-edit-item-row">
                        <div className="welcome-edit-item-fields">
                          <input
                            type="text"
                            placeholder="Video Title"
                            value={vid.title}
                            onChange={e => {
                              const updated = [...editForm.videos];
                              updated[idx].title = e.target.value;
                              setEditForm({ ...editForm, videos: updated });
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Video URL (YouTube, Vimeo, or direct link)"
                            value={vid.url}
                            onChange={e => {
                              const updated = [...editForm.videos];
                              updated[idx].url = e.target.value;
                              setEditForm({ ...editForm, videos: updated });
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Short Description"
                            value={vid.description || ''}
                            onChange={e => {
                              const updated = [...editForm.videos];
                              updated[idx].description = e.target.value;
                              setEditForm({ ...editForm, videos: updated });
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Thumbnail Image URL (optional)"
                            value={vid.thumbnailUrl || ''}
                            onChange={e => {
                              const updated = [...editForm.videos];
                              updated[idx].thumbnailUrl = e.target.value;
                              setEditForm({ ...editForm, videos: updated });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="welcome-edit-item-del-btn"
                          onClick={() => {
                            const updated = editForm.videos.filter((_, i) => i !== idx);
                            setEditForm({ ...editForm, videos: updated });
                          }}
                          title="Remove video"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes & Credits Tab */}
              {activeEditTab === 'notes' && (
                <div className="welcome-edit-pane">
                  <div className="welcome-form-group">
                    <label>Project Notes (optional — hidden when empty)</label>
                    <textarea
                      rows={4}
                      value={editForm.projectNotes || ''}
                      onChange={e => setEditForm({ ...editForm, projectNotes: e.target.value })}
                      placeholder="Notes regarding project status, roadmap, or lore scope..."
                    />
                  </div>
                  <div className="welcome-form-group">
                    <label>Acknowledgements &amp; Credits (optional — hidden when empty)</label>
                    <textarea
                      rows={4}
                      value={editForm.acknowledgements || ''}
                      onChange={e => setEditForm({ ...editForm, acknowledgements: e.target.value })}
                      placeholder="Special thanks, historical inspirations, or community mentions..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="welcome-edit-modal-footer">
              <button
                type="button"
                className="welcome-btn-ghost"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="welcome-btn-primary"
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                <Save size={14} /> {isSaving ? 'Saving Changes…' : 'Save & Publish Guide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
