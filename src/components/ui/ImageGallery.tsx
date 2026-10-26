// src/components/ui/ImageGallery.tsx

import { useState } from 'react';
import { X } from 'lucide-react';
import type { EntityImage } from '../../db/schema';

interface Props { images: EntityImage[]; }

export default function ImageGallery({ images }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  function getUrl(img: EntityImage): string | null {
    if (img.localBlob) return URL.createObjectURL(img.localBlob);
    if (img.remotePath) return img.remotePath;
    return null;
  }

  return (
    <>
      <div className="image-gallery">
        {images.map(img => {
          const url = getUrl(img);
          if (!url) return null;
          return (
            <button key={img.id} className="gallery-thumb" onClick={() => setLightbox(url)} title={img.caption}>
              <img src={url} alt={img.caption ?? ''} />
            </button>
          );
        })}
      </div>

      {lightbox && (
        <div className="modal-backdrop" onClick={() => setLightbox(null)}>
          <div className="lightbox" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}><X size={20}/></button>
            <img src={lightbox} alt="Full view" className="lightbox-img" />
          </div>
        </div>
      )}
    </>
  );
}
