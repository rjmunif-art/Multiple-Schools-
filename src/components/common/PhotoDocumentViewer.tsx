import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, ZoomIn, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';

export const PhotoDocumentViewer: React.FC = () => {
  const { photoModal, closePhotoModal } = useApp();

  if (!photoModal || !photoModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 truncate">
            <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-sm font-bold truncate">{photoModal.title}</h3>
          </div>
          <button
            onClick={closePhotoModal}
            className="p-1.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[300px]">
          {photoModal.imageUrl ? (
            <img
              src={photoModal.imageUrl}
              alt={photoModal.title}
              className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
              onError={(e) => {
                // Fallback placeholder if image load fails
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><text x="50%" y="50%" fill="%2394a3b8" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16">SEF Document / Photo Preview</text></svg>';
              }}
            />
          ) : (
            <div className="text-center text-slate-400 p-8">
              <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-sm">No image file attached</p>
            </div>
          )}
        </div>

        {/* Footer info & close */}
        {photoModal.caption && (
          <div className="px-4 py-2 bg-slate-800/80 text-xs text-slate-300 border-t border-slate-700/60">
            {photoModal.caption}
          </div>
        )}
      </div>
    </div>
  );
};
