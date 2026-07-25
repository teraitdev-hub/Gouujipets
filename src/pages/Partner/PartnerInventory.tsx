import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, limit, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "../../store/useAuthStore";
import { Package, Plus, Search, AlertTriangle, Loader2, Edit2, Trash2 } from "lucide-react";

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  low_stock_threshold: number;
}

export const PartnerInventory = () => {
  const { user } = useAuthStore();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    item_name: "",
    category: "Food",
    quantity: 0,
    unit: "pcs",
    unit_price: 0,
    low_stock_threshold: 5
  });

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const bQuery = query(collection(db, 'businesses'), where('owner_id', '==', user.id), limit(1));
        const bSnap = await getDocs(bQuery);
        const bList = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const bid = bList && bList.length > 0 ? bList[0].id : `partner-facility-${user.id}`;
        setBusinessId(bid);

        const itemsQuery = query(collection(db, 'inventory'), where('business_id', '==', bid));
        
        unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
          let items: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          items.sort((a, b) => a.item_name.localeCompare(b.item_name));
          setInventory(items);
          setIsLoading(false);
        }, (err) => {
          console.error("Failed to fetch inventory:", err);
          setIsLoading(false);
        });

      } catch (err) {
        console.error("Failed to fetch business id:", err);
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'inventory'), { ...formData, business_id: businessId });
      const data = { id: docRef.id, ...formData, business_id: businessId } as any;

      if (data) {
        setInventory(prev => [...prev, data].sort((a, b) => a.item_name.localeCompare(b.item_name)));
      }
      setShowAddModal(false);
      setFormData({ item_name: "", category: "Food", quantity: 0, unit: "pcs", unit_price: 0, low_stock_threshold: 5 });
    } catch (err) {
      console.error(err);
      alert("Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
      setInventory(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete item");
    }
  };

  const filteredInventory = inventory.filter(i => 
    i.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-purple-950 flex items-center gap-2">
            <Package className="text-purple-600" />
            Inventory & Supplies
          </h2>
          <p className="text-purple-600 mt-1">Manage your stock levels, equipment, and daily supplies.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none w-full sm:w-64 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="p-4 font-bold">Item Name</th>
                  <th className="p-4 font-bold">Category</th>
                  <th className="p-4 font-bold text-center">Stock Level</th>
                  <th className="p-4 font-bold text-center">Unit Price</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredInventory.map(item => {
                  const isLowStock = item.quantity <= item.low_stock_threshold;
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-gray-900">{item.item_name}</td>
                      <td className="p-4 text-gray-600">{item.category}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-bold ${isLowStock ? 'text-red-600' : 'text-purple-700'}`}>
                            {item.quantity} {item.unit}
                          </span>
                          {isLowStock && (
                            <div title="Low Stock">
                              <AlertTriangle size={14} className="text-red-500" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center text-gray-600 font-medium">
                        ₹{item.unit_price}/{item.unit}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-500">
                      No inventory items found. Add some to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add Inventory Item</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Trash2 size={20} className="text-transparent" /> {/* Spacer */}
                <div className="absolute top-6 right-6" onClick={() => setShowAddModal(false)}>✕</div>
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Item Name</label>
                  <input 
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    placeholder="e.g. Premium Dog Food"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    <option>Food</option>
                    <option>Treats</option>
                    <option>Medicines</option>
                    <option>Grooming Supplies</option>
                    <option>Toys</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Quantity</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Unit</label>
                    <input 
                      type="text"
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      placeholder="e.g. kg, pcs, bottles"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Unit Price (₹)</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Low Stock Alert At</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
