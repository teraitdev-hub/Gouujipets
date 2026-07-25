import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, limit, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "../../store/useAuthStore";
import {
  Plus, Edit, Trash2, X, Clock, DollarSign,
  ToggleLeft, ToggleRight, Package, ChevronDown, Users
} from "lucide-react";
import { ALL_CATEGORIES, getCategoryById, type ServiceCategory } from "../../lib/serviceCategories";

interface Service {
  id: string;
  business_id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration_mins: number;
  capacity?: number;
  is_active: boolean;
  created_at: string;
}

interface ServiceFormData {
  name: string;
  category: string;
  description: string;
  price: string;
  duration_mins: string;
  capacity: string;
  is_active: boolean;
}

const emptyForm: ServiceFormData = {
  name: "",
  category: "boarding",
  description: "",
  price: "",
  duration_mins: "60",
  capacity: "",
  is_active: true,
};

export const PartnerServices = () => {
  const { user } = useAuthStore();
  const [services, setServices] = useState<Service[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showSubPicker, setShowSubPicker] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const bQuery = query(collection(db, 'businesses'), where('owner_id', '==', user.id), limit(1));
        const bSnap = await getDocs(bQuery);
        const businesses = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        let bid = businesses && businesses.length > 0 ? businesses[0].id : `partner-facility-${user.id}`;
        setBusinessId(bid);

        const sQuery = query(collection(db, 'services'), where('business_id', '==', bid));
        
        unsubscribe = onSnapshot(sQuery, (sSnap) => {
          let data: any[] = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setServices(data as Service[]);
          setIsLoading(false);
        }, (err) => {
          console.error("Failed to fetch services:", err);
          setIsLoading(false);
        });

      } catch (err) {
        console.error("Error setting up services listener:", err);
        setIsLoading(false);
      }
    };
    
    fetchData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const selectedCategoryInfo: ServiceCategory | undefined = getCategoryById(form.category);

  const openAddModal = () => {
    setEditingService(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      category: service.category || "boarding",
      description: service.description || "",
      price: String(service.price),
      duration_mins: String(service.duration_mins),
      capacity: service.capacity ? String(service.capacity) : "",
      is_active: service.is_active,
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
    setForm(emptyForm);
    setError("");
    setShowSubPicker(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) { setError("No business found. Please complete your business profile."); return; }
    if (!form.name.trim()) { setError("Service name is required."); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) { setError("Enter a valid price."); return; }

    setIsSaving(true);
    setError("");

    const payload: any = {
      business_id: businessId,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      price: Number(form.price),
      duration_mins: Number(form.duration_mins) || 60,
      is_active: form.is_active,
    };
    if (form.capacity) payload.capacity = Number(form.capacity);

    try {
      let updatedList = [...services];
      if (editingService) {
        const serviceRef = doc(db, 'services', editingService.id);
        await updateDoc(serviceRef, payload);
        const data = { id: editingService.id, ...payload } as any;
        updatedList = services.map(s => s.id === editingService.id ? data as Service : s);
        setServices(updatedList);
      } else {
        const docRef = await addDoc(collection(db, 'services'), payload);
        const data = { id: docRef.id, ...payload } as any;
        updatedList = [data as Service, ...services];
        setServices(updatedList);
      }

      // Sync to businesses.services_offered so marketplace filtering immediately sees it
      try {
        const formattedOffered = updatedList.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category,
          price: s.price,
          description: s.description || '',
          duration_mins: s.duration_mins || 60
        }));
        const bizRef = doc(db, 'businesses', businessId);
        await updateDoc(bizRef, { services_offered: formattedOffered });

        // Also mirror insert into business_services
        if (!editingService) {
          await addDoc(collection(db, 'business_services'), {
            business_id: businessId,
            name: payload.name,
            category: payload.category,
            description: payload.description,
            price: payload.price,
            duration_minutes: payload.duration_mins
          });
        }
      } catch (syncErr) {
        console.error("Mirror sync err:", syncErr);
      }

      closeModal();
    } catch (err: any) {
      setError(err.message || "Failed to save service. Please run the database migration first.");
    } finally {
      setIsSaving(false);
    }
  };

  const syncServicesOffered = async (list: Service[]) => {
    if (!businessId) return;
    try {
      const formattedOffered = list.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        price: s.price,
        description: s.description || '',
        duration_mins: s.duration_mins || 60
      }));
      await updateDoc(doc(db, 'businesses', businessId), { services_offered: formattedOffered });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'services', id));
      const newList = services.filter(s => s.id !== id);
      setServices(newList);
      await syncServicesOffered(newList);
      try { await deleteDoc(doc(db, 'business_services', id)); } catch (e) {}
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirmId(null);
  };

  const toggleActive = async (service: Service) => {
    try {
      const serviceRef = doc(db, 'services', service.id);
      await updateDoc(serviceRef, { is_active: !service.is_active });
      const data = { ...service, is_active: !service.is_active };
      const newList = services.map(s => s.id === service.id ? data as Service : s);
      setServices(newList);
      await syncServicesOffered(newList);
    } catch (err) {
      console.error(err);
    }
  };

  // Group services by category
  const filteredServices = filterCategory === "all"
    ? services
    : services.filter(s => s.category === filterCategory);

  const groupedServices = filteredServices.reduce((acc, s) => {
    const cat = s.category || "boarding";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, Service[]>);

  const activeCategoryIds = [...new Set(services.map(s => s.category).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-purple-950">Manage Services</h2>
          <p className="text-xs text-purple-600 mt-0.5">
            Services added here appear on your public listing and during customer checkout.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 transition-colors shadow-sm text-sm shrink-0"
        >
          <Plus size={18} /> Add Service
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-xl border border-purple-50 shadow-sm text-center">
          <p className="text-xl font-black text-purple-950">{services.length}</p>
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">Total</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-purple-50 shadow-sm text-center">
          <p className="text-xl font-black text-purple-500">{services.filter(s => s.is_active).length}</p>
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">Active</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-purple-50 shadow-sm text-center">
          <p className="text-xl font-black text-gray-400">{services.filter(s => !s.is_active).length}</p>
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">Inactive</p>
        </div>
      </div>

      {/* ── Category Filter Tabs ── */}
      {services.length > 0 && (
        <div className="overflow-x-auto pb-1 -mx-1">
          <div className="flex gap-2 px-1 w-max">
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${filterCategory === "all" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}
            >
              All ({services.length})
            </button>
            {activeCategoryIds.map(catId => {
              const info = getCategoryById(catId);
              const count = services.filter(s => s.category === catId).length;
              return (
                <button
                  key={catId}
                  onClick={() => setFilterCategory(catId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${filterCategory === catId ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}
                >
                  {info && <info.icon size={11} />}
                  {info?.name || catId} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Services Grouped ── */}
      {services.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-purple-200">
          <Package size={36} className="mx-auto text-purple-300 mb-3" />
          <p className="text-purple-700 font-bold">No services added yet</p>
          <p className="text-xs text-purple-500 mt-1 mb-4">Add boarding tiers, grooming packages, vet consultations, and more.</p>
          <button
            onClick={openAddModal}
            className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-colors inline-flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Add Your First Service
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedServices).map(([catId, catServices]) => {
            const catInfo = getCategoryById(catId);
            return (
              <div key={catId}>
                {/* Category Header */}
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${catInfo?.borderColor || "border-gray-200"}`}>
                  {catInfo && (
                    <div className={`w-7 h-7 rounded-lg ${catInfo.color} flex items-center justify-center`}>
                      <catInfo.icon size={14} />
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900 text-sm">{catInfo?.name || catId}</h3>
                  <span className="text-xs text-gray-400 font-medium ml-auto">{catServices.length} service{catServices.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Service Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catServices.map(service => (
                    <div
                      key={service.id}
                      className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${service.is_active ? "border-purple-100 hover:shadow-md" : "border-gray-100 opacity-60"}`}
                    >
                      {/* Top row */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${service.is_active ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-gray-50 text-gray-500 border-gray-100"}`}>
                            {service.is_active ? "● ACTIVE" : "○ INACTIVE"}
                          </span>
                          {service.category && catInfo && (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${catInfo.color} ${catInfo.borderColor}`}>
                              {catInfo.name}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleActive(service)}
                          title={service.is_active ? "Deactivate" : "Activate"}
                          className="text-gray-400 hover:text-purple-600 transition-colors ml-1 shrink-0"
                        >
                          {service.is_active ? <ToggleRight size={20} className="text-purple-500" /> : <ToggleLeft size={20} />}
                        </button>
                      </div>

                      {/* Name & Desc */}
                      <h3 className="font-bold text-sm text-purple-950 leading-tight mb-0.5">{service.name}</h3>
                      <p className="text-purple-600 text-xs mb-3 line-clamp-2 min-h-[2rem]">{service.description || "No description."}</p>

                      {/* Meta */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-1 text-purple-950">
                          <DollarSign size={13} className="text-purple-500" />
                          <span className="text-base font-black">₹{service.price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Clock size={11} />
                          <span>{service.duration_mins}m</span>
                        </div>
                        {service.capacity && (
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <Users size={11} />
                            <span>{service.capacity}/day</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-3 border-t border-gray-50">
                        <button
                          onClick={() => openEditModal(service)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 font-medium text-xs transition-colors"
                        >
                          <Edit size={12} /> Edit
                        </button>
                        {deleteConfirmId === service.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(service.id)}
                              className="flex-1 py-1.5 bg-purple-500 text-white rounded-lg font-bold text-xs hover:bg-purple-600 transition-colors"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2.5 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(service.id)}
                            className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 text-xs transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div
            ref={modalRef}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg relative animate-fade-in max-h-[90vh] overflow-y-auto"
          >
            {/* Drag handle (mobile) */}
            <div className="sm:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

            <div className="p-6">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors z-10"
              >
                <X size={16} />
              </button>

              <h2 className="text-xl font-black text-purple-950 mb-0.5 pr-8">
                {editingService ? "Edit Service" : "Add New Service"}
              </h2>
              <p className="text-xs text-purple-600 mb-5">
                This service will appear on your public listing and during checkout.
              </p>

              {error && (
                <div className="bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium px-3 py-2.5 rounded-xl mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Category *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {ALL_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setForm(f => ({ ...f, category: cat.id, name: "" })); setShowSubPicker(false); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left ${form.category === cat.id ? `${cat.color} ${cat.borderColor} bg-opacity-100 shadow-sm` : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"}`}
                      >
                        <cat.icon size={13} className="shrink-0" />
                        <span className="truncate">{cat.name}</span>
                        {cat.phase === 2 && <span className="text-[8px] bg-purple-400 text-white px-1 rounded-full ml-auto shrink-0">NEW</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-service Quick Pick */}
                {selectedCategoryInfo && selectedCategoryInfo.subServices.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-700">Quick Pick a Sub-service</label>
                      <button type="button" onClick={() => setShowSubPicker(v => !v)} className="text-xs text-purple-600 font-bold flex items-center gap-1">
                        {showSubPicker ? "Hide" : "Show"} <ChevronDown size={12} className={showSubPicker ? "rotate-180 transition-transform" : "transition-transform"} />
                      </button>
                    </div>
                    {showSubPicker && (
                      <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-36 overflow-y-auto">
                        {selectedCategoryInfo.subServices.map(sub => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => { setForm(f => ({ ...f, name: sub.name })); setShowSubPicker(false); }}
                            className={`text-[11px] font-medium px-2 py-1 rounded-full border transition-colors ${form.name === sub.name ? `${selectedCategoryInfo.color} ${selectedCategoryInfo.borderColor}` : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"}`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Service Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Service Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Standard Boarding, Full Grooming Spa..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe what's included..."
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
                  />
                </div>

                {/* Price, Duration, Capacity */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Price (₹) *</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="999"
                      min="1"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Duration (min)</label>
                    <input
                      type="number"
                      value={form.duration_mins}
                      onChange={e => setForm(f => ({ ...f, duration_mins: e.target.value }))}
                      placeholder="60"
                      min="1"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Capacity/day</label>
                    <input
                      type="number"
                      value={form.capacity}
                      onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                      placeholder="10"
                      min="1"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-bold text-gray-800 text-xs">Make service active</p>
                    <p className="text-[10px] text-gray-500">Active services are visible to customers</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? "bg-purple-500" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:bg-purple-300 transition-colors text-sm"
                  >
                    {isSaving ? "Saving..." : editingService ? "Save Changes" : "Add Service"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
