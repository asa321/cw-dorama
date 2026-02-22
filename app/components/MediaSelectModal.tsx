import { useState, useEffect } from "react";

interface MediaItem {
  key: string;
  url: string;
  size: number;
  uploadedAt: string;
  contentType: string;
}

interface MediaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, alt: string) => void;
}

export function MediaSelectModal({ isOpen, onClose, onSelect }: MediaSelectModalProps) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen]);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/media/list");
      const data = await res.json() as { media: MediaItem[] };
      if (data.media) {
        setMediaList(data.media);
      }
    } catch (e) {
      console.error("Failed to fetch media", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json() as any;
      if (data.success) {
        // アップロード成功後、一覧を再取得するか、先頭に追加する
        await fetchMedia();
      } else {
        alert(data.error || "アップロードに失敗しました");
      }
    } catch (e) {
      alert("エラーが発生しました");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">画像を挿入</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Upload Area */}
        <div className="p-5 border-b border-gray-50 bg-gray-50/50">
          <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isUploading ? 'bg-gray-100 border-gray-300' : 'bg-white border-pink-300 hover:bg-pink-50 hover:border-pink-500'}`}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? (
                <div className="flex items-center gap-3 text-pink-600 font-medium">
                  <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  アップロード中...
                </div>
              ) : (
                <>
                  <svg className="w-6 h-6 text-pink-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  <p className="text-sm font-medium text-gray-700">クリックして新しい画像をアップロード</p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              disabled={isUploading}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin"></div>
            </div>
          ) : mediaList.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mediaList.map((item) => (
                <div
                  key={item.key}
                  onClick={() => onSelect(item.url, item.key.split('/').pop() || 'image')}
                  className="group relative aspect-square bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:border-pink-500 hover:ring-2 hover:ring-pink-200 transition-all flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZjBmMGYwIi8+CjxyZWN0IHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz4KPHJlY3QgeD0iNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2ZmZiIvPgo8cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZjBmMGYwIi8+Cjwvc3ZnPg==')] opacity-30 z-0"></div>
                  <img
                    src={item.url}
                    alt={item.key}
                    className="w-full h-full object-contain relative z-10 group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <p className="text-white text-[10px] font-mono truncate">{item.key.replace("uploads/", "")}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
              <span className="text-3xl mb-2">📸</span>
              画像がありません
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
