import { useState, useEffect } from "react";
import { Shield, ShieldAlert, Activity, UserPlus, Server, ActivitySquare } from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, updateDoc, doc, addDoc, where } from "firebase/firestore";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";

export const SuperAdminPortal = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'superadmin' && user.role !== 'super_admin')) {
      navigate('/admin/dashboard');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all admins
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', 'in', ['admin', 'super_admin', 'superadmin']));
      const querySnapshot = await getDocs(q);
      const adminList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdmins(adminList);

      // Fetch audit logs
      const logsRef = collection(db, 'audit_logs');
      const logsSnapshot = await getDocs(logsRef);
      const logList = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      logList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(logList.slice(0, 50));
    } catch (err) {
      console.error("Error fetching super admin data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const promoteToAdmin = async (email: string) => {
    if (!email) return;
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("No user found with this email. They must create a customer account first.");
        return;
      }
      const targetUser = snap.docs[0];
      await updateDoc(doc(db, 'users', targetUser.id), { role: 'admin' });
      
      // Create audit log
      await addDoc(collection(db, 'audit_logs'), {
        action: 'PROMOTED_ADMIN',
        target_user: email,
        performed_by: user?.email,
        created_at: new Date().toISOString()
      });

      alert("User promoted to Admin successfully!");
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  if (isLoading) return <div className="p-8 flex justify-center"><ActivitySquare className="animate-spin text-purple-600 w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-10 h-10 text-red-600" />
        <div>
          <h1 className="text-3xl font-black text-slate-900">Super Admin Portal</h1>
          <p className="text-slate-500 font-medium mt-1">High-level system management & security controls</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Admin Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Administrative Accounts
            </h2>
            <button 
              onClick={() => {
                const email = prompt("Enter the email of the existing user to promote to Admin:");
                if (email) promoteToAdmin(email);
              }}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm"
            >
              <UserPlus size={16} />
              Add Admin
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {admins.map(admin => (
              <div key={admin.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                    {admin.full_name?.charAt(0) || admin.email?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{admin.full_name || 'Unnamed'}</h3>
                    <p className="text-sm text-slate-500">{admin.email}</p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${admin.role === 'superadmin' || admin.role === 'super_admin' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                    {admin.role.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health & Audit Logs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              System Audit Logs
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {logs.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">No audit logs found.</div>
            ) : logs.map(log => (
              <div key={log.id} className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 text-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">{log.action}</span>
                  <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="text-slate-600 mt-1">Target: <span className="font-medium text-slate-800">{log.target_user || log.target_id || 'N/A'}</span></p>
                <p className="text-slate-500 text-xs mt-2">Performed by: {log.performed_by || 'System'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
