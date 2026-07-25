import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Tag, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { ALL_CATEGORIES, getCategoryById } from '../../lib/serviceCategories';

export const ServicesManager = ({ businessId }: { businessId: string }) => {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: 'boarding', description: '', price: '', duration_minutes: '60', capacity: '' });
  
  useEffect(() => {
    fetchServices();
  }, [businessId]);

  const syncServicesWithBusiness = async (updatedList: any[]) => {
    if (!businessId) return;
    try {
      const formattedServicesOffered = updatedList.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        price: s.price,
        description: s.description || '',
        duration_mins: s.duration_mins || s.duration_minutes || 60
      }));

      await updateDoc(doc(db, 'businesses', businessId), { services_offered: formattedServicesOffered });

      // Removed redundant legacy table sync since we now use `services` as the primary table
    } catch (err) {
      console.error('Error syncing services offered:', err);
    }
  };

  const fetchServices = async () => {
    try {
      const q = query(collection(db, 'services'), where('business_id', '==', businessId));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data) {
        setServices(data);
        syncServicesWithBusiness(data);
      }
    } catch (err) {
      console.error('Failed to fetch services', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) return;
    setIsAdding(true);
    try {
      const insertData: any = {
        business_id: businessId,
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        price: Number(formData.price),
        duration_mins: formData.duration_minutes ? Number(formData.duration_minutes) : 60,
        is_active: true,
      };
      
      if (formData.capacity) {
        insertData.capacity = Number(formData.capacity);
      }
      
      const docRef = await addDoc(collection(db, 'services'), insertData);
      const data = { id: docRef.id, ...insertData };
      
      const newList = [data, ...services];
      setServices(newList);
      await syncServicesWithBusiness(newList);

      setFormData({ name: '', category: 'boarding', description: '', price: '', duration_minutes: '60', capacity: '' });
    } catch (err) {
      console.error('Failed to add service', err);
      alert('Failed to add service. Please check your network or inputs.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await deleteDoc(doc(db, 'services', id));
      const newList = services.filter(s => s.id !== id);
      setServices(newList);
      await syncServicesWithBusiness(newList);
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-purple-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-purple-950 flex items-center gap-2">
            <Tag className="text-purple-600" /> Add & Manage Facility Services
          </h3>
          <span className="text-xs bg-purple-100 text-purple-900 px-3 py-1 rounded-full font-bold flex items-center gap-1">
            <Sparkles size={12} /> Auto-Syncs with Customer Marketplace
          </span>
        </div>
        <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value, name: ''})}
              className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-purple-600 text-sm cursor-pointer"
            >
              {ALL_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Service Name</label>
            <input 
              type="text" 
              placeholder="Type or select a predefined service" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              list="serviceNamesList"
              className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-purple-600 text-sm"
              required
            />
            <datalist id="serviceNamesList">
              {getCategoryById(formData.category)?.subServices.map(sub => (
                <option key={sub.id} value={sub.name} />
              ))}
            </datalist>
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Price (₹)</label>
            <input 
              type="number" 
              placeholder="Price in INR (₹)" 
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
              className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-purple-600 text-sm"
              required
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Duration (Mins)</label>
            <input 
              type="number" 
              placeholder="e.g. 60" 
              value={formData.duration_minutes}
              onChange={e => setFormData({...formData, duration_minutes: e.target.value})}
              className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-purple-600 text-sm"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Daily Capacity (Optional)</label>
            <input 
              type="number" 
              placeholder="e.g. 15" 
              value={formData.capacity}
              onChange={e => setFormData({...formData, capacity: e.target.value})}
              className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-purple-600 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Description (What's included?)</label>
            <input 
              type="text" 
              placeholder="e.g. Includes organic shampoo wash, nail clipping, blow dry & ear cleaning" 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-purple-600 text-sm"
            />
          </div>
          <button 
            type="submit" 
            disabled={isAdding}
            className="bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-xl md:col-span-3 transition-colors flex justify-center items-center gap-2 shadow-md active:scale-95 shadow-2xs"
          >
            {isAdding ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} /> Add & Publish Service to Marketplace</>}
          </button>
        </form>
      </div>

      <div className="space-y-6">
        {Object.entries(
          services.reduce((acc, service) => {
            const cat = service.category || 'boarding';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
          }, {} as Record<string, any[]>)
        ).map(([category, categoryServices]) => (
          <div key={category} className="bg-white rounded-2xl p-5 border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-100">
              <h4 className="text-base font-black text-purple-950 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                {getCategoryById(category)?.name || category}
              </h4>
              <span className="text-xs bg-purple-100 text-purple-900 px-2.5 py-1 rounded-full font-bold">
                {(categoryServices as any[]).length} active
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(categoryServices as any[]).map((service: any) => (
                <div key={service.id} className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200/60 flex justify-between items-start hover:bg-white hover:shadow-md hover:border-purple-600 transition-all group shadow-2xs">
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-slate-900 text-sm group-hover:text-purple-600 transition-colors">{service.name}</h4>
                      <CheckCircle size={14} className="text-purple-600 shrink-0" />
                    </div>
                    {service.description && (
                      <p className="text-xs text-purple-700 mb-2 leading-relaxed">{service.description}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="font-black text-purple-900 text-sm bg-purple-100 px-2.5 py-0.5 rounded-lg">₹{service.price}</span>
                      {service.duration_minutes && <span className="text-xs font-semibold text-purple-600">{service.duration_minutes} mins</span>}
                      {service.capacity && <span className="text-xs font-semibold text-purple-600">Cap: {service.capacity}/day</span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(service.id)} 
                    className="p-2 text-purple-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                    title="Delete Service"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-500">
            <Tag size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="font-bold text-gray-700">No services added yet.</p>
            <p className="text-xs text-gray-400 mt-1">Use the form above to add your boarding suites, grooming packages, or veterinary checkups.</p>
          </div>
        )}
      </div>
    </div>
  );
};
