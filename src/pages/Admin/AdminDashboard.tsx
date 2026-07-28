import { useState, useEffect } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { 
  Users, 
  PawPrint, 
  Store, 
  DollarSign, 
  ArrowUpRight, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  CheckCircle, 
  MessageSquare, 
  Send, 
  BookOpen, 
  Activity,
  AlertTriangle,
  FolderOpen
} from "lucide-react";
import { formatRupee } from "../../utils/currency";
import { useAuthStore } from "../../store/useAuthStore";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, onSnapshot, deleteDoc, doc, updateDoc, addDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  fetchAllJournalEntriesPlatform, 
  fetchHelpdeskTickets, 
  addTicketReply, 
  updateTicketStatus
} from "../../utils/dbFallback";
import type { 
  HelpdeskTicket, 
  JournalEntry,
  TicketReply
} from "../../utils/dbFallback";
import { filterRealBusinesses } from "../../utils/filterRealBusinesses";
import { AdminAIPanel } from "../../components/ai/AdminAIPanel";

export const AdminDashboard = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  const getTabFromPath = () => {
    const path = location.pathname.split('/').pop();
    if (path === 'users') return 'users';
    if (path === 'businesses') return 'businesses';
    if (path === 'finance') return 'finance';
    if (path === 'helpdesk') return 'helpdesk';
    if (path === 'ai-insights') return 'ai-insights';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [analytics, setAnalytics] = useState<any>({
    totalPlatformRevenue: 0,
    totalExpenses: 0,
    totalUsers: 0,
    totalPets: 0,
    allUsers: [],
    allBusinesses: [],
    recentBookings: [],
    allPets: [],
    allBookingsRaw: []
  });

  // Global Ledger & Tickets State
  const [globalJournal, setGlobalJournal] = useState<JournalEntry[]>([]);
  const [helpdeskTickets, setHelpdeskTickets] = useState<HelpdeskTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<HelpdeskTicket | null>(null);
  const [replyText, setReplyText] = useState("");

  // Partner Inspector State
  const [selectedPartnerBiz, setSelectedPartnerBiz] = useState<any | null>(null);

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchQuery("");
    if (tabId === 'overview') navigate('/admin/dashboard');
    if (tabId === 'users') navigate('/admin/users');
    if (tabId === 'businesses') navigate('/admin/businesses');
    if (tabId === 'finance') navigate('/admin/finance');
    if (tabId === 'helpdesk') navigate('/admin/helpdesk');
    if (tabId === 'ai-insights') navigate('/admin/ai-insights');
  };

  const fetchData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch core database data
      const [uRes, bRes, pRes, bkRes] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'businesses')),
        getDocs(collection(db, 'pets')),
        getDocs(collection(db, 'bookings'))
      ]);

      const rawUsers = uRes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const rawBusinesses = bRes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const allUsers = rawUsers;
      const allBusinesses = filterRealBusinesses(rawBusinesses);
      const rawPets = pRes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const rawBookings = bkRes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const allPets = rawPets;
      const allBookingsRaw = rawBookings;

      // 2. Fetch general ledger & tickets via fallback api
      const ledgerEntries = await fetchAllJournalEntriesPlatform();
      setGlobalJournal(ledgerEntries);

      const tickets = await fetchHelpdeskTickets(user?.role || 'superadmin', user?.id || '');
      setHelpdeskTickets(tickets);

      // Create quick lookups
      const uMap: Record<string, any> = {};
      allUsers.forEach((u: any) => { if (u.id) uMap[u.id] = u; });
      const bMap: Record<string, any> = {};
      allBusinesses.forEach((b: any) => { if (b.id) bMap[b.id] = b; });

      // Link owner detail in memory for businesses
      allBusinesses.forEach((b: any) => {
        if (b.owner_id) {
          b.owner_details = uMap[b.owner_id] || { full_name: 'Care Partner', email: '' };
        }
      });

      // Attach joined relations in memory safely for pets
      allPets.forEach((p: any) => {
        if (p.owner_id) {
          p.owner_details = uMap[p.owner_id] || { full_name: 'Pet Parent' };
        }
      });

      let totalRev = 0;
      const recentB = allBookingsRaw.map((b: any) => {
        const cost = (Number(b.total_amount) || 0) + (Number(b.extra_expenses) || 0);
        if (b.status === 'confirmed' || b.status === 'checked_in' || b.status === 'completed') {
          totalRev += cost;
        }
        const customer = typeof b.customer_id === 'object' && b.customer_id !== null ? b.customer_id : (uMap[b.customer_id] || { full_name: 'Customer' });
        const facility = typeof b.business_id === 'object' && b.business_id !== null ? b.business_id : (bMap[b.business_id] || { name: 'Care Center' });
        return {
          _id: b.id,
          created_at: b.created_at,
          status: b.status || 'pending',
          totalAmount: cost,
          customerId: { name: customer?.full_name || 'Customer' },
          facilityId: { name: facility?.name || 'Care Center' },
          customer_id: customer,
          business_id: facility
        };
      });

      setAnalytics({
        totalPlatformRevenue: totalRev,
        totalUsers: allUsers.length,
        totalPets: allPets.length,
        allUsers,
        allBusinesses,
        recentBookings: recentB,
        allPets,
        allBookingsRaw
      });
    } catch (err: any) {
      setFetchError(err.message || "Failed to load admin data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleUpdate = () => { fetchData(); };
    window.addEventListener('helpdesk-update', handleUpdate);
    window.addEventListener('journal-update', handleUpdate);
    // Real-time listeners for core collections
    const unsubUsers = onSnapshot(collection(db, 'users'), () => fetchData());
    const unsubBiz = onSnapshot(collection(db, 'businesses'), () => fetchData());
    const unsubBk = onSnapshot(collection(db, 'bookings'), () => fetchData());
    return () => {
      window.removeEventListener('helpdesk-update', handleUpdate);
      window.removeEventListener('journal-update', handleUpdate);
      unsubUsers();
      unsubBiz();
      unsubBk();
    };
  }, [user]);

  // Handle support ticket reply submission
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    const reply: TicketReply = {
      sender_id: user!.id,
      sender_name: `System Admin (${user?.full_name || 'Admin'})`,
      message: replyText,
      created_at: new Date().toISOString()
    };

    const success = await addTicketReply(activeTicket.id!, reply);
    if (success) {
      setReplyText("");
      // Refresh local list
      const refreshedTickets = await fetchHelpdeskTickets(user?.role || 'superadmin', user?.id || '');
      setHelpdeskTickets(refreshedTickets);
      const updated = refreshedTickets.find(t => t.id === activeTicket.id);
      if (updated) setActiveTicket(updated);
    }
  };

  const handleToggleTicketStatus = async (status: 'open' | 'in_progress' | 'resolved') => {
    if (!activeTicket) return;
    const success = await updateTicketStatus(activeTicket.id!, status);
    if (success) {
      const refreshedTickets = await fetchHelpdeskTickets(user?.role || 'superadmin', user?.id || '');
      setHelpdeskTickets(refreshedTickets);
      const updated = refreshedTickets.find(t => t.id === activeTicket.id);
      if (updated) setActiveTicket(updated);
    }
  };

  // Finance metrics for System Ledger
  const globalCashInflow = globalJournal
    .filter(e => e.entry_type === 'revenue' || e.entry_type === 'lending_borrowed' || (e.entry_type === 'settlement' && e.category.toLowerCase().includes('received')))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const globalCashOutflow = globalJournal
    .filter(e => e.entry_type === 'expense' || e.entry_type === 'lending_lent' || e.entry_type === 'loss' || (e.entry_type === 'settlement' && !e.category.toLowerCase().includes('received')))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const globalLendingLent = globalJournal
    .filter(e => e.entry_type === 'lending_lent' && e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const globalLendingBorrowed = globalJournal
    .filter(e => e.entry_type === 'lending_borrowed' && e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Tabs structure
  const tabs = [
    { id: 'overview', label: '📊 Command Center' },
    { id: 'ai-insights', label: '✨ AI Insights' },
    { id: 'businesses', label: '🏨 Partner Resorts Directory' },
    { id: 'users', label: '👥 Registered Customers' },
    { id: 'finance', label: '📖 Platform Ledger' },
    { id: 'helpdesk', label: '🎟 Central Helpdesk' }
  ];

  // Filtering lists by search text
  const filteredUsers = analytics.allUsers.filter((u: any) => 
    u.role === 'customer' && (
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredBusinesses = analytics.allBusinesses.filter((b: any) => 
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.owner_details?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLedger = globalJournal.filter(e => 
    e.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.party_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTickets = helpdeskTickets.filter(t => 
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Partner Inspector calculations
  const inspectPartnerDetails = (biz: any) => {
    // Filter ledger entries for this business
    const bizEntries = globalJournal.filter(e => e.business_id === biz.id);
    const rev = bizEntries
      .filter(e => e.entry_type === 'revenue' || (e.entry_type === 'settlement' && e.category.toLowerCase().includes('received')))
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const exp = bizEntries
      .filter(e => e.entry_type === 'expense' || (e.entry_type === 'settlement' && e.category.toLowerCase().includes('paid')))
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const losses = bizEntries
      .filter(e => e.entry_type === 'loss')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    
    // Calculate running cash
    let cash = 0;
    bizEntries.forEach(e => {
      if (e.entry_type === 'revenue' || e.entry_type === 'lending_borrowed') cash += Number(e.amount);
      else if (e.entry_type === 'expense' || e.entry_type === 'lending_lent' || e.entry_type === 'loss') cash -= Number(e.amount);
      else if (e.entry_type === 'settlement') {
        if (e.category.toLowerCase().includes('received')) cash += Number(e.amount);
        else cash -= Number(e.amount);
      }
    });

    const lent = bizEntries
      .filter(e => e.entry_type === 'lending_lent' && e.status === 'pending')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const borrowed = bizEntries
      .filter(e => e.entry_type === 'lending_borrowed' && e.status === 'pending')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    setSelectedPartnerBiz({
      ...biz,
      revenue: rev,
      expenses: exp,
      losses: losses,
      cash: cash,
      lent: lent,
      borrowed: borrowed,
      entries: bizEntries
    });
  };

  const handleApprovePartner = async (biz: any) => {
    try {
      const bizRef = doc(db, 'businesses', biz.id);
      await updateDoc(bizRef, { status: 'approved' });

      // Trigger Firebase Email Extension (Trigger Email from Firestore)
      if (biz.owner_details?.email) {
        await addDoc(collection(db, 'mail'), {
          to: biz.owner_details.email,
          message: {
            subject: 'Your Partner Account is Approved!',
            text: `Hi ${biz.owner_details.full_name || 'Partner'},\n\nYour pet care partner account has been approved by the Admin. You can now log in to the GouujiPets Partner Portal.\n\nLogin here: https://gouujipets.web.app/partner/login\n\nWelcome aboard!`,
            html: `<p>Hi ${biz.owner_details.full_name || 'Partner'},</p><p>Your pet care partner account has been <strong>approved</strong> by the Admin. You can now log in to the GouujiPets Partner Portal.</p><p><a href="https://gouujipets.web.app/partner/login">Login here</a></p><p>Welcome aboard!</p>`
          }
        });
      }

      // Trigger Firebase Twilio SMS Extension (Send Messages with Twilio)
      if (biz.owner_details?.phone) {
        await addDoc(collection(db, 'messages'), {
          to: biz.owner_details.phone,
          body: `Hi ${biz.owner_details.full_name || 'Partner'}, your GouujiPets partner account is approved! You can now log in. https://gouujipets.web.app/partner/login`
        });
      }
      
      // Update local state without waiting for snapshot
      fetchData();
    } catch (error) {
      console.error("Error approving partner:", error);
    }
  };

  return (
    <PageTransition className="max-w-7xl mx-auto space-y-6 font-sans pb-24">
      {/* Top Banner Control Panel */}
      <div className="bg-purple-950 text-white rounded-3xl p-6 shadow-sm border border-purple-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <h1 className="text-xl font-black text-white leading-none">Super Admin Root Control</h1>
            <span className="bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-inner ml-2">
              PLATFORM KERNEL ACTIVE
            </span>
          </div>
          <p className="text-xs text-purple-200 mt-1 font-medium">
            Real-time unified command center displaying complete partner bookkeeping journals, registered customer accounts, and ticketing databases.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-purple-900/60 p-1 rounded-xl border border-purple-700 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none max-w-full shadow-inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-purple-200 hover:text-white hover:bg-purple-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {fetchError && (
        <div className="bg-purple-100 text-purple-900 p-4 rounded-xl border border-purple-300 font-bold text-xs">
          Sync Error: {fetchError}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* =========================================
            0. AI INSIGHTS TAB
        ========================================= */}
        {activeTab === 'ai-insights' && (
          <motion.div key="ai-insights" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <AdminAIPanel />
          </motion.div>
        )}

        {/* ============================================================
            1. COMMAND CENTER OVERVIEW
            ============================================================ */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm hover:border-purple-600 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider">Gross Platform Revenue</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-black">₹</div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{formatRupee(globalCashInflow)}</h2>
                  <p className="text-[10px] text-purple-600 font-bold mt-1">Total Platform Cash Inflow</p>
                </div>
              </div>

              <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm hover:border-purple-600 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider">Verified Care Resorts</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Store size={16} />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{analytics.allBusinesses.length}</h2>
                  <p className="text-[10px] text-purple-600 font-bold mt-1">Active Partner Facilities</p>
                </div>
              </div>

              <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm hover:border-purple-600 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider">Registered Pet Parents</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Users size={16} />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{analytics.allUsers.filter((u: any) => u.role === 'customer').length}</h2>
                  <p className="text-[10px] text-purple-600 font-bold mt-1">Active Client Profiles</p>
                </div>
              </div>

              <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm hover:border-purple-600 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider">Helpdesk Tickets</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                    <MessageSquare size={16} />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{helpdeskTickets.filter(t => t.status !== 'resolved').length}</h2>
                  <p className="text-[10px] text-purple-600 font-bold mt-1">Open Tickets Requiring Action</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Bookings */}
              <div className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-50">
                  <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider">Live Stay Transactions Feed</h3>
                  <button onClick={() => navigate('/admin/bookings')} className="text-[10px] font-black text-purple-600 hover:underline">
                    View Live Bookings →
                  </button>
                </div>
                <div className="space-y-2.5 overflow-y-auto max-h-[350px]">
                  {analytics.recentBookings.slice(0, 5).map((booking: any) => (
                    <div key={booking._id} className="border border-purple-100 rounded-xl p-3 bg-purple-50/20 flex items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <p className="text-xs font-black text-slate-900">{booking.customerId?.name || 'Customer'}</p>
                        <p className="text-[9px] text-purple-700 font-bold mt-0.5">@ {booking.facilityId?.name || 'Resort'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900 block">{formatRupee(booking.totalAmount)}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-0.5 ${booking.status === 'confirmed' ? 'bg-purple-100 text-purple-700' : 'bg-purple-600 text-white animate-pulse'}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support Inbox Preview */}
              <div className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-50">
                  <h3 className="text-xs font-black text-purple-950 uppercase tracking-wider">Unresolved Helpdesk Tickets</h3>
                  <button onClick={() => handleTabChange('helpdesk')} className="text-[10px] font-black text-purple-600 hover:underline">
                    Manage Helpdesk →
                  </button>
                </div>
                <div className="space-y-2.5 overflow-y-auto max-h-[350px]">
                  {helpdeskTickets.filter(t => t.status !== 'resolved').slice(0, 5).map(t => (
                    <div key={t.id} className="border border-purple-100 rounded-xl p-3 bg-purple-50/20 flex items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 line-clamp-1">{t.title}</h4>
                        <p className="text-[9px] text-purple-700 font-bold mt-0.5 uppercase">
                          From: {t.user_name || 'User'} ({t.type}) • Category: {t.category}
                        </p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${
                        t.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
                  {helpdeskTickets.filter(t => t.status !== 'resolved').length === 0 && (
                    <p className="text-center text-xs text-purple-400 py-10 font-bold">No unresolved tickets in inbox.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================
            2. REGISTERED CUSTOMERS TAB
            ============================================================ */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-purple-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-purple-100 pb-3">
              <h2 className="text-sm font-black text-purple-950 uppercase">Registered Customer Pet Parents ({filteredUsers.length})</h2>
              <div className="relative w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                <input 
                  type="text" 
                  placeholder="Search customer account..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-9 pr-4 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-purple-50 border-y border-purple-200 text-[10px] uppercase font-black text-purple-900">
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Contact Info</th>
                    <th className="py-2.5 px-4 text-center">Pets Registered</th>
                    <th className="py-2.5 px-4 text-right">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100 text-xs font-medium">
                  {filteredUsers.map((u: any) => {
                    const petCount = analytics.allPets?.filter((p: any) => p.owner_id?.id === u.id || p.owner_id === u.id).length || 0;
                    return (
                      <tr key={u.id} className="hover:bg-purple-50/20">
                        <td className="py-3.5 px-4 font-black text-slate-900">{u.full_name || 'Customer Parent'}</td>
                        <td className="py-3.5 px-4">
                          <span className="flex items-center gap-1 text-slate-800"><Mail size={12} className="text-purple-400" /> {u.email}</span>
                          {u.phone && <span className="flex items-center gap-1 text-slate-500 text-[10px] mt-0.5"><Phone size={10} className="text-purple-400" /> {u.phone}</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-purple-600">{petCount} Pets</td>
                        <td className="py-3.5 px-4 text-right text-purple-500">{new Date(u.created_at || Date.now()).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ============================================================
            3. PARTNER DIRECTORY & INSPECTOR TAB
            ============================================================ */}
        {activeTab === 'businesses' && (
          <motion.div key="businesses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white border border-purple-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-purple-100 pb-3">
                <h2 className="text-sm font-black text-purple-950 uppercase">Assured Resorts & Partners ({filteredBusinesses.length})</h2>
                <div className="relative w-64">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input 
                    type="text" 
                    placeholder="Search resort or owner..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-9 pr-4 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-purple-50 border-y border-purple-200 text-[10px] uppercase font-black text-purple-900">
                      <th className="py-2.5 px-4">Resort Facility</th>
                      <th className="py-2.5 px-4">Owner Partner</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Address</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Starting Price</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100 text-xs font-medium">
                    {filteredBusinesses.map((b: any) => (
                      <tr key={b.id} className="hover:bg-purple-50/20">
                        <td className="py-3.5 px-4 font-black text-slate-900">{b.name}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{b.owner_details?.full_name || 'Care Partner'}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{b.owner_details?.email}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-700">
                            {b.type || 'boarding'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-purple-700 font-bold">{b.address || 'Bangalore'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            b.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            b.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {b.status || 'approved'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">₹{b.price_per_night || 999}/night</td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {b.status === 'pending' && (
                            <button
                              onClick={() => handleApprovePartner(b)}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] rounded-lg transition-all shadow-2xs inline-block"
                            >
                              Approve
                            </button>
                          )}
                          <button 
                            onClick={() => inspectPartnerDetails(b)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] rounded-lg transition-all shadow-2xs inline-block"
                          >
                            Inspect Ledger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PARTNER DETAILED LEDGER DRAWER/MODAL */}
            {selectedPartnerBiz && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-purple-200 rounded-2xl p-5 shadow-md space-y-5">
                <div className="flex justify-between items-center border-b border-purple-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-purple-950 uppercase">Audit Sheet: {selectedPartnerBiz.name}</h3>
                    <p className="text-[10px] text-purple-500 font-bold uppercase mt-0.5">Partner Name: {selectedPartnerBiz.owner_details?.full_name || 'Care Partner'}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedPartnerBiz(null)}
                    className="text-purple-500 font-bold text-xs"
                  >
                    ✕ Close Audit
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                    <span className="text-[9px] font-black text-purple-700 uppercase">Cash Reserve</span>
                    <h4 className="text-lg font-black text-slate-900 mt-1">{formatRupee(selectedPartnerBiz.cash)}</h4>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                    <span className="text-[9px] font-black text-purple-700 uppercase">Book Revenue</span>
                    <h4 className="text-lg font-black text-slate-900 mt-1">{formatRupee(selectedPartnerBiz.revenue)}</h4>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                    <span className="text-[9px] font-black text-purple-700 uppercase">Outstanding Lent</span>
                    <h4 className="text-lg font-black text-amber-600 mt-1">{formatRupee(selectedPartnerBiz.lent)}</h4>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                    <span className="text-[9px] font-black text-purple-700 uppercase">Total Debts</span>
                    <h4 className="text-lg font-black text-rose-600 mt-1">{formatRupee(selectedPartnerBiz.borrowed)}</h4>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-purple-950 mb-3 flex items-center gap-1">
                    <BookOpen size={12} /> Partner Journal Entries
                  </h4>
                  <table className="w-full text-left text-xs font-medium">
                    <thead>
                      <tr className="bg-purple-50 text-[9px] uppercase font-black text-purple-900 border-y border-purple-200">
                        <th className="py-2 px-4">Date</th>
                        <th className="py-2 px-4">Category</th>
                        <th className="py-2 px-4">Party</th>
                        <th className="py-2 px-4">Description</th>
                        <th className="py-2 px-4 text-right">Debit (Inflow)</th>
                        <th className="py-2 px-4 text-right">Credit (Outflow)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                      {selectedPartnerBiz.entries.map((e: JournalEntry) => {
                        const isDebit = e.entry_type === 'revenue' || e.entry_type === 'lending_borrowed' || (e.entry_type === 'settlement' && e.category.toLowerCase().includes('received'));
                        const isCredit = e.entry_type === 'expense' || e.entry_type === 'lending_lent' || e.entry_type === 'loss' || (e.entry_type === 'settlement' && !e.category.toLowerCase().includes('received'));
                        
                        return (
                          <tr key={e.id} className="hover:bg-purple-50/20">
                            <td className="py-2.5 px-4 text-purple-600">{new Date(e.date).toLocaleDateString()}</td>
                            <td className="py-2.5 px-4">
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-purple-100 text-purple-700">{e.category}</span>
                            </td>
                            <td className="py-2.5 px-4 font-bold">{e.party_name || '—'}</td>
                            <td className="py-2.5 px-4 text-slate-600 truncate max-w-[200px]">{e.description}</td>
                            <td className="py-2.5 px-4 text-right font-black text-slate-900">{isDebit ? formatRupee(e.amount) : '—'}</td>
                            <td className="py-2.5 px-4 text-right font-black text-slate-900">{isCredit ? formatRupee(e.amount) : '—'}</td>
                          </tr>
                        );
                      })}
                      {selectedPartnerBiz.entries.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-purple-400 font-bold">No ledger logs found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ============================================================
            4. PLATFORM GENERAL LEDGER TAB
            ============================================================ */}
        {activeTab === 'finance' && (
          <motion.div key="finance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-purple-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-purple-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-purple-950 uppercase">Platform Consolidated Journal Logs</h2>
                <p className="text-[10px] text-purple-500 font-bold uppercase mt-0.5">Audit Trail across all registered pet resorts</p>
              </div>

              <div className="relative w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                <input 
                  type="text" 
                  placeholder="Search ledger category, memo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-9 pr-4 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <span className="text-[9px] font-black text-purple-700 uppercase">Gross Platform Cash In</span>
                <h4 className="text-lg font-black text-slate-900 mt-0.5">{formatRupee(globalCashInflow)}</h4>
              </div>
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <span className="text-[9px] font-black text-purple-700 uppercase">Gross Platform Cash Out</span>
                <h4 className="text-lg font-black text-slate-900 mt-0.5">{formatRupee(globalCashOutflow)}</h4>
              </div>
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <span className="text-[9px] font-black text-purple-700 uppercase">Total System Receivables</span>
                <h4 className="text-lg font-black text-amber-600 mt-0.5">{formatRupee(globalLendingLent)}</h4>
              </div>
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <span className="text-[9px] font-black text-purple-700 uppercase">Total System Borrowed</span>
                <h4 className="text-lg font-black text-rose-600 mt-0.5">{formatRupee(globalLendingBorrowed)}</h4>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-purple-50 border-y border-purple-200 text-[10px] uppercase font-black text-purple-900">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Resort Center</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 font-bold text-right">Debit (Cash In)</th>
                    <th className="py-2.5 px-4 font-bold text-right">Credit (Cash Out)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100 text-xs font-medium">
                  {filteredLedger.map((e: JournalEntry) => {
                    const isDebit = e.entry_type === 'revenue' || e.entry_type === 'lending_borrowed' || (e.entry_type === 'settlement' && e.category.toLowerCase().includes('received'));
                    const isCredit = e.entry_type === 'expense' || e.entry_type === 'lending_lent' || e.entry_type === 'loss' || (e.entry_type === 'settlement' && !e.category.toLowerCase().includes('received'));
                    const bizName = analytics.allBusinesses?.find((b: any) => b.id === e.business_id)?.name || 'Platform Admin';

                    return (
                      <tr key={e.id} className="hover:bg-purple-50/20">
                        <td className="py-3 px-4 text-purple-600 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{bizName}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            e.entry_type === 'revenue' ? 'bg-emerald-100 text-emerald-800' :
                            e.entry_type === 'expense' ? 'bg-amber-100 text-amber-800' :
                            e.entry_type === 'loss' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>{e.category}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]">{e.description}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">{isDebit ? formatRupee(e.amount) : '—'}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">{isCredit ? formatRupee(e.amount) : '—'}</td>
                      </tr>
                    );
                  })}
                  {filteredLedger.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-purple-400 font-bold">No global journal logs matched your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ============================================================
            5. CENTRAL HELPDESK TICKETS TAB
            ============================================================ */}
        {activeTab === 'helpdesk' && (
          <motion.div key="helpdesk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Ticket List Column */}
            <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-sm flex flex-col h-[550px]">
              <div className="flex justify-between items-center pb-3 border-b border-purple-100 mb-3">
                <span className="text-xs font-black text-purple-950 uppercase tracking-widest">Active Tickets ({filteredTickets.length})</span>
                <div className="relative w-36">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input 
                    type="text" 
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-7 pl-7 pr-2 bg-purple-50 border border-purple-200 rounded-lg text-[10px] font-bold focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {filteredTickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className={`w-full text-left border rounded-xl p-3 transition-all flex flex-col hover:bg-purple-50/40 ${
                      activeTicket?.id === t.id 
                        ? 'border-purple-600 bg-purple-50/20 shadow-2xs' 
                        : 'border-purple-100 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-black text-slate-900 line-clamp-1 flex-1">{t.title}</h4>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${
                        t.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-700'
                      }`}>{t.priority}</span>
                    </div>
                    
                    <p className="text-[9px] font-bold text-purple-700 mt-1 uppercase">
                      From: {t.user_name || 'User'} ({t.type})
                    </p>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-purple-50 text-[10px]">
                      <span className="text-[9px] text-purple-400 font-mono">#{t.id?.split('-')[0]}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        t.status === 'open' ? 'bg-emerald-100 text-emerald-800' :
                        t.status === 'in_progress' ? 'bg-purple-600 text-white animate-pulse' :
                        'bg-slate-100 text-slate-600'
                      }`}>{t.status}</span>
                    </div>
                  </button>
                ))}
                {filteredTickets.length === 0 && (
                  <div className="text-center py-20 text-purple-400 font-bold text-xs">No matching tickets found.</div>
                )}
              </div>
            </div>

            {/* Right Chat Column */}
            <div className="lg:col-span-2 bg-white border border-purple-200 rounded-2xl shadow-sm flex flex-col h-[550px] overflow-hidden">
              {activeTicket ? (
                <div className="flex flex-col h-full">
                  {/* Top Bar Details */}
                  <div className="bg-purple-50 p-4 border-b border-purple-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{activeTicket.title}</h4>
                      <p className="text-[10px] text-purple-700 font-bold uppercase mt-0.5">
                        Client: {activeTicket.user_name} ({activeTicket.user_email}) • Role: {activeTicket.type}
                      </p>
                    </div>

                    <div className="flex bg-white p-0.5 border border-purple-200 rounded-lg shrink-0">
                      <button 
                        onClick={() => handleToggleTicketStatus('open')}
                        className={`px-2.5 py-1 text-[9px] font-black rounded-md ${activeTicket.status === 'open' ? 'bg-emerald-500 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'}`}
                      >
                        Open
                      </button>
                      <button 
                        onClick={() => handleToggleTicketStatus('in_progress')}
                        className={`px-2.5 py-1 text-[9px] font-black rounded-md ${activeTicket.status === 'in_progress' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'}`}
                      >
                        In Progress
                      </button>
                      <button 
                        onClick={() => handleToggleTicketStatus('resolved')}
                        className={`px-2.5 py-1 text-[9px] font-black rounded-md ${activeTicket.status === 'resolved' ? 'bg-slate-600 text-white shadow-xs' : 'text-purple-700 hover:bg-purple-50'}`}
                      >
                        Resolved
                      </button>
                    </div>
                  </div>

                  {/* Thread History */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
                    {/* Filing description */}
                    <div className="bg-white border border-purple-100 p-4 rounded-2xl flex items-start gap-3 max-w-[85%] font-semibold shadow-2xs">
                      <div className="w-8 h-8 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">📝</div>
                      <div>
                        <span className="text-[9px] font-black text-purple-700 uppercase">Original Filing Case</span>
                        <p className="text-xs text-slate-800 leading-relaxed mt-1">{activeTicket.description}</p>
                        <span className="text-[8px] text-purple-400 mt-2 block">{new Date(activeTicket.created_at || Date.now()).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Chat replies */}
                    {activeTicket.replies?.map((r, idx) => (
                      <div key={idx} className={`flex items-start gap-2.5 ${r.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                        {r.sender_id !== user?.id && (
                          <div className="w-8 h-8 rounded bg-purple-950 text-white font-black flex items-center justify-center text-xs shrink-0">
                            {r.is_bot ? '🤖' : '👤'}
                          </div>
                        )}
                        <div className={`p-3 rounded-2xl text-xs max-w-[80%] font-semibold shadow-2xs ${
                          r.sender_id === user?.id 
                            ? 'bg-purple-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 border border-purple-100 rounded-tl-none'
                        }`}>
                          <p className="font-black text-[9px] uppercase tracking-wider mb-1 opacity-75">{r.sender_name}</p>
                          <p className="leading-relaxed">{r.message}</p>
                          <span className="text-[8px] opacity-60 mt-1.5 block text-right">{new Date(r.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Send Admin Response form */}
                  <form onSubmit={handleSendAdminReply} className="p-3 border-t border-purple-100 flex gap-2 bg-white">
                    <input
                      type="text"
                      disabled={activeTicket.status === 'resolved'}
                      placeholder={activeTicket.status === 'resolved' ? "Closed" : "Write response message to user..."}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 px-4 h-10 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-purple-400 focus:outline-none focus:border-purple-600 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={activeTicket.status === 'resolved'}
                      className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 transition-all shadow-md shrink-0 disabled:opacity-50"
                    >
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-purple-400 space-y-2">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-2xs">
                    🎟
                  </div>
                  <h4 className="font-black text-purple-950 text-sm mt-2 font-black uppercase">No Ticket Selected</h4>
                  <p className="text-[11px] max-w-xs font-medium">Select a customer or partner care request from the directory panel to begin communication.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};
export default AdminDashboard;
