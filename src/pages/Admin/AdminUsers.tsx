import { useState, useEffect } from "react";
import { Users, Search, Filter, X } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";

export const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserForManage, setSelectedUserForManage] = useState<any | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data || []);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to users:", error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const name = u.full_name || u.name || '';
    return name.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="text-purple-600" />
            Manage Users
          </h2>
          <p className="text-slate-500 mt-1">View and manage all registered platform users.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none w-full sm:w-64 text-sm"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-black">User Details</th>
                <th className="p-4 font-black text-center">Role</th>
                <th className="p-4 font-black">Joined Date</th>
                <th className="p-4 font-black text-center">Status</th>
                <th className="p-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-slate-900">{user.full_name || user.name || 'Unnamed User'}</div>
                      <div className="text-xs text-slate-500">{user.email || 'No email provided'}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        user.role === 'admin' || user.role === 'superadmin' ? 'bg-purple-600 text-white shadow-sm' :
                        user.role === 'partner' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {user.role || 'customer'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-medium text-sm">
                      {user.created_at || user.createdDate ? new Date(user.created_at || user.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        (user.status || 'active') === 'active' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-red-700 bg-red-50 border border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${(user.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedUserForManage(user)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-black rounded-lg transition-all shadow-sm"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-bold">
          <span>Showing {filteredUsers.length} users</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50" disabled>Previous</button>
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50" disabled>Next</button>
          </div>
        </div>
      </div>

      {selectedUserForManage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl p-6 relative border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setSelectedUserForManage(null)} 
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-1">Manage User</h3>
            <p className="text-xs font-bold text-purple-600 mb-6 uppercase tracking-wider">
              {selectedUserForManage.email || "No Email Address"}
            </p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const userRef = doc(db, 'users', selectedUserForManage.id);
                await updateDoc(userRef, {
                  full_name: selectedUserForManage.full_name || selectedUserForManage.name || '',
                  role: selectedUserForManage.role || 'customer',
                  status: selectedUserForManage.status || 'active'
                });
                
                // State is updated automatically by onSnapshot!
                setSelectedUserForManage(null);
                alert("User updated successfully!");
              } catch (err: any) {
                console.error(err);
                alert("Failed to update user: " + err.message);
              }
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={selectedUserForManage.full_name || selectedUserForManage.name || ""} 
                  onChange={(e) => setSelectedUserForManage({ ...selectedUserForManage, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Platform Role</label>
                <select 
                  value={selectedUserForManage.role || "customer"} 
                  onChange={(e) => setSelectedUserForManage({ ...selectedUserForManage, role: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none cursor-pointer transition-all"
                >
                  <option value="customer">Customer / Pet Parent</option>
                  <option value="partner">Partner / Business Owner</option>
                  <option value="admin">Administrator</option>
                  <option value="superadmin">Super Administrator</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Account Status</label>
                <select 
                  value={selectedUserForManage.status || "active"} 
                  onChange={(e) => setSelectedUserForManage({ ...selectedUserForManage, status: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none cursor-pointer transition-all"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setSelectedUserForManage(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl transition-all shadow-md shadow-purple-600/10 active:scale-[0.98]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
