import { useState, useEffect, useRef } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { Search, Image as ImageIcon, Plus, Trash2, Loader2, UploadCloud } from "lucide-react";
import { motion } from "framer-motion";
import { db, storage } from "../../lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useAuthStore } from "../../store/useAuthStore";

interface Photo {
  id: string;
  url: string;
  aspect: string;
}

export const Gallery = () => {
  const { user } = useAuthStore();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPhotos();
    
    if (!user) return;
    
    // Subscribe to real-time changes
    const q = query(collection(db, 'gallery_photos'), where('user_id', '==', user.id));
    const unsubscribe = onSnapshot(q, () => {
      fetchPhotos();
    });
      
    return () => {
      unsubscribe();
    };
  }, [user]);

  const fetchPhotos = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'gallery_photos'),
        where('user_id', '==', user.id)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setPhotos(data as Photo[]);
    } catch (err) {
      console.error("Failed to fetch photos", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setIsUploading(true);
    try {
      // 1. Upload to Storage Bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `gallery/${user.id}/${fileName}`;
      
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      
      // 2. Get Public URL
      const publicUrl = await getDownloadURL(storageRef);
        
      // Randomly assign aspect ratio for masonry look if we can't determine it
      const aspects = ["aspect-square", "aspect-[4/3]", "aspect-[3/4]"];
      const randomAspect = aspects[Math.floor(Math.random() * aspects.length)];
        
      // 3. Save to database
      await addDoc(collection(db, 'gallery_photos'), {
        user_id: user.id,
        url: publicUrl,
        aspect: randomAspect,
        created_at: new Date().toISOString()
      });
      fetchPhotos(); // Refresh immediately
      
    } catch (error) {
      console.error("Upload error:", error);
      alert("An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    
    try {
      // Delete from DB first
      await deleteDoc(doc(db, 'gallery_photos', id));
      
      // Try to delete from storage (extract path from URL)
      try {
        const imageRef = ref(storage, url);
        await deleteObject(imageRef);
      } catch (storageErr) {
        console.error("Could not delete from storage, but removed from DB", storageErr);
      }
      
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Failed to delete photo");
    }
  };

  const filteredPhotos = photos.filter(photo => 
    searchQuery === "" ? true : true // We don't have titles yet, so search is visually decorative for now
  );

  return (
    <PageTransition className="pb-24 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 transition-all hover:shadow-lg hover:-translate-y-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
            <ImageIcon className="text-brand-600" /> Pet Gallery
          </h1>
          <p className="text-sm text-slate-500">A collection of your favorite memories.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto items-center">
          <div className="relative flex-1 md:w-64 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-600 transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search albums..." 
              className="w-full h-12 bg-white/50 border border-white/80 rounded-[16px] pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all focus:bg-white"
            />
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-12 px-6 bg-slate-900 text-white font-bold rounded-[16px] flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-70 shrink-0 shadow-sm"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <><UploadCloud size={18} /> Upload</>}
          </button>
        </div>
      </div>

      {/* Masonry-like Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={40} className="animate-spin mb-4 text-brand-600" />
          <p>Loading your gallery...</p>
        </div>
      ) : filteredPhotos.length > 0 ? (
        <div className="columns-2 lg:columns-3 gap-4 space-y-4">
          {filteredPhotos.map((photo, index) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(index * 0.05, 0.5) }}
              key={photo.id}
              className="break-inside-avoid"
            >
              <div className={`rounded-[24px] overflow-hidden ${photo.aspect} bg-white/50 backdrop-blur-sm border border-white/80 shadow-sm relative group hover:-translate-y-2 hover:shadow-xl transition-all duration-300`}>
                <img src={photo.url} alt="Pet Memory" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <a href={photo.url} target="_blank" rel="noreferrer" className="text-white font-bold bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-full text-sm shadow-sm transition-colors">
                    View Full
                  </a>
                  <button onClick={(e) => handleDelete(photo.id, photo.url, e)} className="text-purple-100 font-bold bg-purple-500/80 hover:bg-purple-600 backdrop-blur-md p-2 rounded-full shadow-sm transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white/50 backdrop-blur-xl border-2 border-white/80 border-dashed rounded-[32px] p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No photos yet</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">Your gallery is currently empty. Upload photos of your pets to keep your favorite memories all in one place!</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
          >
            <UploadCloud size={18} /> Upload Your First Photo
          </button>
        </div>
      )}
    </PageTransition>
  );
};

