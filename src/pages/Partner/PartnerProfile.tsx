import { useState, useEffect } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, limit, onSnapshot } from "firebase/firestore";
import { User as UserIcon, Mail } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { BusinessSettings } from "../../components/partner/BusinessSettings";

export const PartnerProfile = () => {
  const { user, loadUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    phone: user?.phone || ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchBusiness = () => {
      if (user?.id) {
        try {
          const bQuery = query(collection(db, 'businesses'), where('owner_id', '==', user.id), limit(1));
          unsubscribe = onSnapshot(bQuery, (bSnap) => {
            const bList = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            let data: any = bList?.[0];
            if (!data) {
              data = {
                id: `partner-facility-${user.id}`,
                owner_id: user.id,
                name: `${user.full_name || user.email?.split('@')[0] || 'Care Partner'}'s Facility`,
                category: 'Pet Boarding & Care Center',
                address: 'Bengaluru, Karnataka, India',
                base_rate_per_day: 999,
                rating: 4.9,
                is_verified: true,
                services_offered: ['boarding', 'grooming', 'veterinary', 'daycare']
              };
            }
            setBusiness(data);
          }, (err) => {
            console.error("Failed to fetch business", err);
          });
        } catch (err) {
          console.error("Error setting up business listener", err);
        }
      }
    };
    
    fetchBusiness();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError("");
    try {
      const userRef = doc(db, 'users', user?.id || '');
      await updateDoc(userRef, {
        full_name: editForm.name,
        phone: editForm.phone
      });
      
      await loadUser();
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageTransition className="pb-24 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#2D2D2D] mb-4 px-2">Partner Profile</h1>
        <div className="bg-[#FDFBF7] rounded-[24px] p-6 shadow-sm border border-[#EBE6DF] flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            {(business?.image_url || user?.photoUrl) ? (
              <img src={business?.image_url || user?.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={40} />
            )}
          </div>
          
          <div className="flex-1 w-full text-center md:text-left">
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            {isEditing ? (
              <div className="flex flex-col gap-3 w-full max-w-xs mx-auto md:mx-0">
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 font-bold"
                  placeholder="Full Name"
                />
                <input 
                  type="tel" 
                  value={editForm.phone} 
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2"
                  placeholder="Phone Number"
                />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black text-[#2D2D2D]">{user?.name || "Partner Name"}</h2>
                <div className="flex items-center justify-center md:justify-start gap-2 text-[#7A7A7A] mt-2">
                  <Mail size={16} />
                  <span className="font-medium">{user?.email || "No email provided"}</span>
                </div>
                <div className="mt-3 inline-block px-3 py-1 bg-purple-100 text-purple-700 font-bold text-xs rounded-full uppercase tracking-wider">
                  Partner Account
                </div>
              </>
            )}
          </div>
          
          <div className="w-full md:w-auto flex flex-col gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors w-full"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({ name: user?.name || "", phone: user?.phone || "" });
                  }}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors w-full"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button 
                onClick={() => {
                  setEditForm({ name: user?.name || "", phone: user?.phone || "" });
                  setIsEditing(true);
                }}
                className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors w-full"
              >
                Edit Details
              </button>
            )}
          </div>
        </div>
      </div>
      
      {business && (
        <BusinessSettings business={business} onUpdate={setBusiness} />
      )}
    </PageTransition>
  );
};
