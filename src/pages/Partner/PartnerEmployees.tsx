import { useState, useEffect } from "react";
import { Users, Plus } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "../../store/useAuthStore";

export const PartnerEmployees = () => {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchEmployees = async () => {
      try {
        setIsLoading(true);
        const qUsers = query(collection(db, 'users'), where('role', 'in', ['partner_employee', 'partner']));
        
        unsubscribe = onSnapshot(qUsers, (snap) => {
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
          setEmployees(data || []);
          setIsLoading(false);
        }, (err) => {
          console.error("Error fetching employees:", err);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Error setting up employees listener:", err);
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchEmployees();
    } else {
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="text-purple-600" />
            Staff & Employees
          </h2>
          <p className="text-slate-500 mt-1">Manage your facility's groomers, trainers, and support staff.</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95">
          <Plus size={16} />
          <span>Add Employee</span>
        </button>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-black">Employee</th>
                <th className="p-4 font-black">Role / Specialty</th>
                <th className="p-4 font-black text-center">Status</th>
                <th className="p-4 font-black text-center">Active Bookings</th>
                <th className="p-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                    Loading staff...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-slate-900">{emp.full_name || emp.name || 'Unnamed Staff'}</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">{emp.phone || emp.email || 'No contact info'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{emp.job_title || 'Staff Member'}</div>
                      <div className="text-[10px] text-slate-500">{emp.role}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        (emp.status || 'active') === 'active' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-amber-700 bg-amber-50 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${(emp.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {emp.status || 'active'}
                      </span>
                    </td>
                    <td className="p-4 text-center font-black text-slate-700">
                      0
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-black rounded-lg transition-all shadow-sm">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
