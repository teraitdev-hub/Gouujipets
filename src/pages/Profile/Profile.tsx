import { useState } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { db, auth, storage } from "../../lib/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updatePassword } from "firebase/auth";
import { Plus, Settings, ChevronRight, Check, User as UserIcon, Mail, MapPin, Home, Briefcase, Star, Trash2, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePet } from "../../context/PetContext";
import { useAuthStore } from "../../store/useAuthStore";
import { AddPetModal } from "../../components/pets/AddPetModal";
import { computePetCompletion } from "../../utils/petCompletion";
import { useLocationStore } from "../../store/useLocationStore";
import { useEffect } from "react";
import { LocationSelectorSheet } from "../../components/location/LocationSelectorSheet";

export const Profile = () => {
  const { pets, activePet, setActivePetId } = usePet();
  const { user, loadUser } = useAuthStore();
  const [ownerDetailsOpen, setOwnerDetailsOpen] = useState(false);
  const [isAddPetModalOpen, setIsAddPetModalOpen] = useState(false);
  const [petToEdit, setPetToEdit] = useState<any>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  
  const { savedAddresses, loadSavedAddresses, removeSavedAddress, setDefaultAddress } = useLocationStore();

  useEffect(() => {
    if (user?.id) loadSavedAddresses(user.id);
  }, [user?.id, loadSavedAddresses]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    photoUrl: user?.photoUrl || ""
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user?.id || '');
      try {
        await updateDoc(userRef, {
          full_name: editForm.name,
          phone: editForm.phone,
          avatar_url: editForm.photoUrl
        });
      } catch (err: any) {
        if (err.code === 'not-found' && user) {
          await setDoc(userRef, {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: editForm.name,
            phone: editForm.phone,
            avatar_url: editForm.photoUrl
          });
        } else {
          throw err;
        }
      }
      
      await loadUser();
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to update profile: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      if (!auth.currentUser) throw new Error("No user logged in");
      await updatePassword(auth.currentUser, newPassword);
      alert("Password updated successfully!");
      setNewPassword("");
      setPrivacyOpen(false);
    } catch (err: any) {
      console.error(err);
      alert("Failed to update password: " + err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `owner_${user.id}_${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const storageRef = ref(storage, `pet-photos/${filePath}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      setEditForm({ ...editForm, photoUrl: downloadUrl });
    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <PageTransition className="pb-24 max-w-3xl mx-auto space-y-8">
      {/* User Details Section */}
      <div>
        <h1 className="text-2xl font-black text-purple-950 mb-4 px-2">My Profile</h1>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-200 hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center shrink-0 border-4 border-purple-200 shadow-sm overflow-hidden">
              {isUploadingPhoto ? (
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              ) : (isEditing && editForm.photoUrl) || (!isEditing && user?.photoUrl) ? (
                <img src={isEditing ? editForm.photoUrl : user?.photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <UserIcon size={40} />
              )}
            </div>
            {isEditing && (
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-purple-700 transition-colors cursor-pointer z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
          </div>
          
          <div className="flex-1 w-full text-center md:text-left">
            {isEditing ? (
              <div className="flex flex-col gap-3 w-full max-w-xs mx-auto md:mx-0">
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-white/50 border border-white/80 rounded-xl px-4 py-2 font-bold focus:bg-white outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Full Name"
                />
                <input 
                  type="tel" 
                  value={editForm.phone} 
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full bg-white/50 border border-white/80 rounded-xl px-4 py-2 focus:bg-white outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Phone Number"
                />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black text-slate-900">{user?.name || "Pet Parent"}</h2>
                <div className="flex items-center justify-center md:justify-start gap-2 text-purple-700 mt-2 text-xs">
                  <Mail size={16} className="text-purple-600" />
                  <span className="font-bold">{user?.email || "No email provided"}</span>
                </div>
                <div className="mt-3 inline-block px-3 py-1 bg-purple-100 text-purple-900 font-black text-xs rounded-full uppercase tracking-wider border border-purple-300">
                  {user?.role || "Customer"} Account
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
                  className="px-6 py-2.5 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700 transition-colors w-full text-xs shadow-2xs"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({ name: user?.name || "", phone: user?.phone || "", photoUrl: user?.photoUrl || "" });
                  }}
                  className="px-6 py-2.5 bg-purple-100 text-purple-900 font-black rounded-xl hover:bg-purple-200 transition-colors w-full text-xs"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button 
                onClick={() => {
                  setEditForm({ name: user?.name || "", phone: user?.phone || "", photoUrl: user?.photoUrl || "" });
                  setIsEditing(true);
                }}
                className="px-6 py-2.5 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700 transition-colors w-full text-xs shadow-sm"
              >
                Edit Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Saved Addresses Section ─────────────────────────────── */}
      <div className="pt-4 border-t border-purple-200">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-xl font-black text-purple-950 flex items-center gap-2">
            <MapPin size={20} className="text-purple-600" /> Saved Addresses
          </h2>
          <button
            onClick={() => setLocationSheetOpen(true)}
            className="bg-purple-600 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 hover:bg-purple-700 transition-colors shadow-2xs"
          >
            <Plus size={16} className="stroke-[3]" /> Add Address
          </button>
        </div>

        {savedAddresses.length === 0 ? (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-8 text-center">
            <MapPin size={28} className="text-purple-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-purple-500">No saved addresses yet</p>
            <p className="text-xs text-purple-400 mt-1">Add home, work, or frequently visited locations for quicker checkout</p>
            <button
              onClick={() => setLocationSheetOpen(true)}
              className="mt-4 text-xs font-black text-purple-600 border border-purple-300 px-4 py-2 rounded-xl hover:bg-purple-100 transition-colors"
            >
              + Add First Address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedAddresses.map((addr) => {
              const icon = addr.label === 'home' ? <Home size={16} /> : addr.label === 'work' ? <Briefcase size={16} /> : <Star size={16} />;
              const colorClass = addr.label === 'home' ? 'bg-blue-100 text-blue-700' : addr.label === 'work' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700';
              return (
                <div key={addr.id} className={`bg-white border rounded-2xl p-4 flex items-start gap-3 shadow-sm ${addr.isDefault ? 'border-purple-400 ring-2 ring-purple-100' : 'border-slate-200'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-black text-slate-900 capitalize">{addr.title || addr.label}</p>
                      {addr.isDefault && <span className="text-[9px] font-black bg-purple-600 text-white px-1.5 py-0.5 rounded-full">DEFAULT</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{addr.formatted_address}</p>
                    {addr.area && <p className="text-[10px] text-slate-400">{addr.area}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {!addr.isDefault && (
                      <button
                        onClick={() => user?.id && setDefaultAddress(addr.id, user.id)}
                        title="Set as Default"
                        className="w-7 h-7 rounded-lg bg-purple-50 text-purple-500 hover:bg-purple-100 hover:text-purple-700 flex items-center justify-center transition-colors"
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => user?.id && removeSavedAddress(addr.id, user.id)}
                      title="Remove"
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Location Selector Sheet */}
      <LocationSelectorSheet open={locationSheetOpen} onClose={() => setLocationSheetOpen(false)} />

      <div className="pt-4 border-t border-purple-200">
        <div className="flex items-center justify-between mb-4 px-2">
          <h1 className="text-2xl font-black text-purple-950">My Pets & Profile Strength</h1>
          <button 
            onClick={() => setIsAddPetModalOpen(true)}
            className="bg-purple-600 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 hover:bg-purple-700 transition-colors shadow-2xs"
          >
            <Plus size={16} className="stroke-[3]" /> Add Pet
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pets.map((pet, index) => {
          const isActive = activePet?.id === pet.id;
          const completion = computePetCompletion(pet);
          
          return (
            <motion.div 
              key={pet.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setActivePetId(pet.id)}
              className={`rounded-2xl p-5 cursor-pointer transition-all border-2 relative overflow-hidden group flex flex-col justify-between
                ${isActive 
                  ? "bg-purple-50 border-purple-600 shadow-md" 
                  : "bg-white border-purple-200 hover:-translate-y-1 hover:shadow-md hover:border-purple-400"
                }`}
            >
              {isActive && (
                <div className="absolute top-4 right-4 bg-purple-600 text-white p-1 rounded-full shadow-sm">
                  <Check size={16} strokeWidth={3} />
                </div>
              )}
              
              <div className="flex items-center gap-4 relative z-10 mb-4">
                <img 
                  src={pet.avatar_url || pet.photo_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300"} 
                  alt={pet.name} 
                  className={`w-20 h-20 rounded-full object-cover border-4 shadow-sm transition-colors
                    ${isActive ? "border-purple-200" : "border-purple-100"}`} 
                />
                <div>
                  <h2 className="text-xl font-black text-purple-950 mb-1 group-hover:text-purple-700 transition-colors">{pet.name}</h2>
                  <p className="text-xs text-purple-700 font-bold">{pet.breed}</p>
                  <p className="text-xs text-purple-600 mt-0.5">{pet.age} Years • {pet.gender}</p>
                </div>
              </div>

              {/* LinkedIn Inspired Profile Strength Meter right on Pet Card */}
              <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200/80 mb-4">
                <div className="flex items-center justify-between text-xs font-black text-purple-950 mb-1">
                  <span className="flex items-center gap-1">
                    <span>{completion.levelEmoji}</span>
                    <span>Profile Strength: {completion.level}</span>
                  </span>
                  <span className="text-purple-600">{completion.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-purple-200/60 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      completion.percentage === 100 ? "bg-purple-600" :
                      completion.percentage >= 80 ? "bg-purple-500" :
                      completion.percentage >= 60 ? "bg-purple-400" : "bg-purple-300"
                    }`}
                    style={{ width: `${completion.percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-purple-700 mt-1 font-bold">
                  {completion.percentage === 100 
                    ? "✓ 100% Completed! All pet health & diet records verified." 
                    : `${completion.filledCount}/${completion.totalCount} details filled. Complete profile to 100% for faster bookings.`}
                </p>
              </div>
              
              <div className="flex justify-end gap-2 relative z-20">
                <button 
                  onClick={(e) => { e.stopPropagation(); setPetToEdit(pet); setIsAddPetModalOpen(true); }}
                  className="text-xs font-black bg-white px-3.5 py-1.5 rounded-lg border border-purple-200 text-purple-900 hover:bg-purple-50 shadow-2xs transition-all"
                >
                  Complete / Edit
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AddPetModal 
        isOpen={isAddPetModalOpen} 
        onClose={() => { setIsAddPetModalOpen(false); setPetToEdit(null); }} 
        petToEdit={petToEdit} 
      />

      <h3 className="text-lg font-black text-purple-950 mt-8 mb-4 px-2">Account Settings</h3>
      <div className="space-y-3">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setOwnerDetailsOpen(!ownerDetailsOpen)}
          className="bg-white rounded-2xl p-4 flex flex-col border border-purple-200 hover:border-purple-400 cursor-pointer group shadow-2xs hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center border border-purple-200">
                <Settings size={18} />
              </div>
              <h3 className="font-black text-purple-950 text-sm">Owner Details</h3>
            </div>
            <ChevronRight size={18} className={`text-purple-400 transition-transform ${ownerDetailsOpen ? 'rotate-90' : ''}`} />
          </div>
          
          <AnimatePresence>
            {ownerDetailsOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-purple-100 flex flex-col gap-3 px-2 text-xs font-bold">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-600">Full Name</span>
                    <span className="text-purple-950">{user?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-600">Email Address</span>
                    <span className="text-purple-950">{user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-600">Phone Number</span>
                    <span className="text-purple-950">{user?.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-600">Role</span>
                    <span className="text-purple-950 capitalize">{user?.role}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setPrivacyOpen(!privacyOpen)}
          className="bg-white rounded-2xl p-4 flex flex-col border border-purple-200 hover:border-purple-400 cursor-pointer group shadow-2xs hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center border border-purple-200">
                <Settings size={18} />
              </div>
              <h3 className="font-black text-purple-950 text-sm">Privacy & Security</h3>
            </div>
            <ChevronRight size={18} className={`text-purple-400 transition-transform ${privacyOpen ? 'rotate-90' : ''}`} />
          </div>
          
          <AnimatePresence>
            {privacyOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleUpdatePassword} className="pt-4 mt-4 border-t border-purple-100 flex flex-col gap-3 px-2">
                  <p className="text-xs font-bold text-purple-700 mb-2">Update your account password here.</p>
                  <input 
                    type="password"
                    placeholder="New Password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-purple-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                    required
                    minLength={6}
                  />
                  <button 
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="mt-2 w-full bg-purple-600 text-white font-black text-xs py-2.5 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <button 
        onClick={async () => {
          await useAuthStore.getState().logout();
          window.location.href = '/';
        }}
        className="w-full py-3.5 mt-6 text-purple-900 font-black text-xs bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-xl transition-colors shadow-2xs"
      >
        Log Out
      </button>
      </div>
    </PageTransition>
  );
};
