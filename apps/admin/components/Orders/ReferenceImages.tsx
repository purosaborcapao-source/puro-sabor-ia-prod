import React, { useState, useEffect } from 'react';
import { supabase } from '@atendimento-ia/supabase';
import { ImagePlus, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface ReferenceImagesProps {
  orderId: string;
  customerId: string;
}

interface ChatImage {
  id: string;
  media_url: string;
  created_at: string;
  content?: string;
}

export function ReferenceImages({ orderId, customerId }: ReferenceImagesProps) {
  const [images, setImages] = useState<string[]>([]);
  const [chatImages, setChatImages] = useState<ChatImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, customerId]);

  const loadImages = async () => {
    setLoading(true);
    // Busca imagens salvas no pedido
    const { data: orderData } = await supabase
      .from('orders')
      .select('reference_images')
      .eq('id', orderId)
      .single();

    setImages((orderData as any)?.reference_images || []);

    // Busca imagens do histórico do chat desse cliente
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, media_url, created_at, content')
      .eq('customer_id', customerId)
      .not('media_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    setChatImages((msgs || []).filter((m: any) => m.media_url) as ChatImage[]);
    setLoading(false);
  };

  const addImage = async (url: string) => {
    if (images.includes(url)) return;
    const next = [...images, url];
    setSaving(true);
    const updateData = { reference_images: next } as any;
    await supabase.from('orders').update(updateData).eq('id', orderId);
    setImages(next);
    setSaving(false);
    setShowPicker(false);
  };

  const removeImage = async (url: string) => {
    const next = images.filter(u => u !== url);
    const updateData = { reference_images: next } as any;
    await supabase.from('orders').update(updateData).eq('id', orderId);
    setImages(next);
  };

  const openLightbox = (url: string) => {
    const idx = images.indexOf(url);
    setLightboxIdx(idx);
    setLightbox(url);
  };

  const navLightbox = (dir: number) => {
    const next = (lightboxIdx + dir + images.length) % images.length;
    setLightboxIdx(next);
    setLightbox(images[next]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
          🖼️ Imagens de Referência
        </h3>
        <button
          onClick={() => setShowPicker(v => !v)}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 border border-blue-600/20 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all"
        >
          <ImagePlus className="w-3 h-3" />
          {saving ? 'Salvando...' : 'Adicionar do Chat'}
        </button>
      </div>

      {/* Miniaturas salvas no pedido */}
      {loading ? (
        <p className="text-xs text-gray-400 py-2">Carregando...</p>
      ) : images.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-xs text-gray-400">Nenhuma imagem de referência anexada.</p>
          <p className="text-[10px] text-gray-300 mt-1">Clique em &quot;Adicionar do Chat&quot; para selecionar uma imagem do histórico.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50">
              <img
                src={url}
                alt="Referência"
                className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-300"
                onClick={() => openLightbox(url)}
              />
              <button
                onClick={() => removeImage(url)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                title="Remover"
              >
                <X className="w-3 h-3" />
              </button>
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity cursor-zoom-in"
                onClick={() => openLightbox(url)}
              >
                <ZoomIn className="w-5 h-5 text-white drop-shadow" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Picker de imagens do chat */}
      {showPicker && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-3">
            Selecione uma imagem do histórico do WhatsApp
          </p>
          {chatImages.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhuma imagem encontrada no histórico deste cliente.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {chatImages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => addImage(msg.media_url)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 ${
                    images.includes(msg.media_url)
                      ? 'border-blue-500 opacity-60'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                  }`}
                  title={images.includes(msg.media_url) ? 'Já adicionada' : 'Clique para adicionar'}
                >
                  <img
                    src={msg.media_url}
                    alt="Do chat"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {images.includes(msg.media_url) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-600/30 text-white text-lg">✓</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                    <p className="text-[8px] text-white truncate">
                      {new Date(msg.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowPicker(false)}
            className="mt-3 text-[10px] text-gray-400 hover:text-gray-600 uppercase font-bold tracking-widest"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightbox}
              alt="Referência ampliada"
              className="w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => navLightbox(-1)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => navLightbox(1)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-center text-white/50 text-xs mt-3">
              Clique fora para fechar {images.length > 1 ? `· ${lightboxIdx + 1}/${images.length}` : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
