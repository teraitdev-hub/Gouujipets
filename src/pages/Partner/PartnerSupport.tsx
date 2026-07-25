import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { 
  MessageSquare, 
  Send, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Bot, 
  ShieldCheck, 
  Clock, 
  FolderLock
} from "lucide-react";
import { 
  fetchHelpdeskTickets, 
  createHelpdeskTicket, 
  addTicketReply
} from "../../utils/dbFallback";
import type { 
  HelpdeskTicket, 
  TicketReply 
} from "../../utils/dbFallback";

export const PartnerSupport = () => {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<HelpdeskTicket | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeView, setActiveView] = useState<'bot' | 'tickets'>('bot');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Interactive Bot Chat State
  const [botMessages, setBotMessages] = useState<any[]>([
    {
      id: 1,
      sender: 'bot',
      name: 'Gouuji Partner Bot 🤖',
      message: 'Hello Partner! Welcome to Gouuji Partner Care. I can assist with payouts, inventory, listing configurations, or booking check-in alerts. How can I help you today?',
      created_at: new Date().toISOString()
    }
  ]);
  const [botInput, setBotInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Thread Reply Input
  const [replyText, setReplyText] = useState('');

  const loadTickets = async () => {
    if (!user) return;
    const data = await fetchHelpdeskTickets(user.role || 'partner', user.id || '');
    setTickets(data);
    
    // Sync active ticket
    if (activeTicket) {
      const refreshed = data.find(t => t.id === activeTicket.id);
      if (refreshed) setActiveTicket(refreshed);
    }
  };

  useEffect(() => {
    loadTickets();
    
    const handleUpdate = () => {
      loadTickets();
    };
    window.addEventListener('helpdesk-update', handleUpdate);
    return () => {
      window.removeEventListener('helpdesk-update', handleUpdate);
    };
  }, [user, activeTicket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [botMessages, activeTicket?.replies, isBotTyping]);

  const handleBotFAQ = (faqKey: string) => {
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      name: user?.full_name || 'Care Partner',
      message: faqKey,
      created_at: new Date().toISOString()
    };
    setBotMessages(prev => [...prev, userMsg]);
    setIsBotTyping(true);

    setTimeout(() => {
      let botText = '';
      if (faqKey.includes('Payout')) {
        botText = 'Commission settlements and partner payouts are processed bi-weekly (on the 15th and 30th of each month). You can review all completed bookings under "Stay Reservations" to calculate net receivables.';
      } else if (faqKey.includes('Check-in')) {
        botText = 'If a client is unable to present their booking confirmation, search for their pet name or email in the "Client Directory". You can manually check them in from the "Stay Reservations" tab.';
      } else if (faqKey.includes('Inventory')) {
        botText = 'To configure low-stock warnings, navigate to the "Facility Inventory" tab, edit the specific product, and set the alert threshold. This helps prevent running out of key supplies.';
      } else {
        botText = 'If you need human verification, please file a formal support request by clicking "Raise a Partner Ticket".';
      }

      setBotMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        name: 'Gouuji Partner Bot 🤖',
        message: botText,
        created_at: new Date().toISOString()
      }]);
      setIsBotTyping(false);
    }, 1000);
  };

  const handleBotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botInput.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      name: user?.full_name || 'Care Partner',
      message: botInput,
      created_at: new Date().toISOString()
    };
    setBotMessages(prev => [...prev, userMsg]);
    const inputLower = botInput.toLowerCase();
    setBotInput('');
    setIsBotTyping(true);

    setTimeout(() => {
      let botText = '';
      if (inputLower.includes('payout') || inputLower.includes('finance') || inputLower.includes('commission')) {
        botText = 'Payout audits are managed by our root accounts team. If you detect a calculation mismatch, please raise a support ticket under the billing category so we can fix it.';
      } else if (inputLower.includes('check-in') || inputLower.includes('check-out') || inputLower.includes('booking')) {
        botText = 'Manual bookings and status overrides can be done via your Stay Reservations panel. For customer booking issues, check active customer tickets or write to Super Admin support.';
      } else if (inputLower.includes('inventory') || inputLower.includes('stock')) {
        botText = 'Stock levels are updated locally on your facility inventory desk. If you need assistance linking item charges to booking balances, check "General Ledger" options.';
      } else if (inputLower.includes('ticket') || inputLower.includes('human') || inputLower.includes('agent')) {
        botText = 'Please click the "Raise a Partner Ticket" button to submit your concern to our Super Admin desk.';
      } else {
        botText = "I have logged your question. If you require direct platform assistance, please raise a partner support ticket, and our administrators will respond shortly.";
      }

      setBotMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        name: 'Gouuji Partner Bot 🤖',
        message: botText,
        created_at: new Date().toISOString()
      }]);
      setIsBotTyping(false);
    }, 1000);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert("Please fill in the fields");
      return;
    }

    const payload: HelpdeskTicket = {
      user_id: user!.id,
      title,
      description,
      status: 'open',
      priority,
      category,
      type: 'partner',
      replies: []
    };

    const newTicket = await createHelpdeskTicket(payload);
    setTickets(prev => [newTicket, ...prev]);
    setTitle('');
    setDescription('');
    setShowCreateForm(false);
    setActiveTicket(newTicket);
    setActiveView('tickets');
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    const reply: TicketReply = {
      sender_id: user!.id,
      sender_name: user?.full_name || 'Care Partner',
      message: replyText,
      created_at: new Date().toISOString()
    };

    const success = await addTicketReply(activeTicket.id!, reply);
    if (success) {
      setReplyText('');
      loadTickets();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans pb-24">
      {/* Title Header */}
      <div className="bg-purple-950 text-white rounded-3xl p-5 shadow-sm border border-purple-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            <h1 className="text-lg font-black tracking-tight">Partner Support Care & Help Desk</h1>
          </div>
          <p className="text-xs text-purple-200 mt-1 font-medium">Get automated business answers, or contact platform root administrators through verified support tickets.</p>
        </div>

        <div className="flex bg-purple-900/60 border border-purple-700 p-0.5 rounded-xl">
          <button 
            onClick={() => setActiveView('bot')}
            className={`px-4 py-1.5 font-black text-xs rounded-lg transition-all ${activeView === 'bot' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-200 hover:text-white'}`}
          >
            💬 Partner Bot
          </button>
          <button 
            onClick={() => setActiveView('tickets')}
            className={`px-4 py-1.5 font-black text-xs rounded-lg transition-all ${activeView === 'tickets' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-200 hover:text-white'}`}
          >
            🎟 Partner Tickets ({tickets.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT PANEL: TICKET LIST */}
        {activeView === 'tickets' ? (
          <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm flex flex-col h-[550px]">
            <div className="flex justify-between items-center pb-3 border-b border-purple-100 mb-3">
              <span className="text-xs font-black text-purple-950 uppercase tracking-widest">Support History</span>
              <button 
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] rounded-lg transition-all"
              >
                <Plus size={12} className="stroke-[3]" /> Raise Ticket
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {tickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTicket(t);
                    setShowCreateForm(false);
                  }}
                  className={`w-full text-left border rounded-xl p-3.5 transition-all flex flex-col justify-between hover:bg-purple-50/40 ${
                    activeTicket?.id === t.id 
                      ? 'border-purple-600 bg-purple-50/30 shadow-2xs' 
                      : 'border-purple-100 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-black text-slate-900 line-clamp-1 flex-1">{t.title}</h4>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase whitespace-nowrap shrink-0 ${
                      t.priority === 'high' ? 'bg-rose-100 text-rose-800' :
                      t.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-700 font-bold mt-1.5 uppercase tracking-wide">Category: {t.category}</p>
                  
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-purple-50">
                    <span className="text-[9px] text-purple-400 font-medium">#{t.id?.split('-')[0]}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      t.status === 'open' ? 'bg-emerald-100 text-emerald-800' :
                      t.status === 'in_progress' ? 'bg-purple-600 text-white font-black animate-pulse' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </button>
              ))}
              {tickets.length === 0 && (
                <div className="text-center py-20 text-purple-400 font-medium text-xs">
                  No partner tickets raised yet. Click "Raise Ticket" to log a request.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* BOT FAQ PANEL */
          <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm space-y-4 flex flex-col h-[550px]">
            <div>
              <span className="text-xs font-black text-purple-950 uppercase tracking-widest">Self Service Portal</span>
              <p className="text-[10px] text-purple-500 font-medium mt-0.5">Quick diagnostics links.</p>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              <button 
                onClick={() => handleBotFAQ('Payout Cycles & Calculation')} 
                className="w-full text-left p-3 border border-purple-100 rounded-xl hover:border-purple-600 hover:bg-purple-50/20 text-xs font-bold text-slate-800 transition-all flex items-center justify-between"
              >
                <span>💳 Payout Schedules</span>
                <span className="text-purple-600">→</span>
              </button>
              <button 
                onClick={() => handleBotFAQ('Client Check-in Procedures')} 
                className="w-full text-left p-3 border border-purple-100 rounded-xl hover:border-purple-600 hover:bg-purple-50/20 text-xs font-bold text-slate-800 transition-all flex items-center justify-between"
              >
                <span>🏨 Booking Check-in Checks</span>
                <span className="text-purple-600">→</span>
              </button>
              <button 
                onClick={() => handleBotFAQ('Configuring Inventory Alerts')} 
                className="w-full text-left p-3 border border-purple-100 rounded-xl hover:border-purple-600 hover:bg-purple-50/20 text-xs font-bold text-slate-800 transition-all flex items-center justify-between"
              >
                <span>📦 Setting Low Stock Warnings</span>
                <span className="text-purple-600">→</span>
              </button>

              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mt-6 text-xs text-purple-900 font-medium space-y-2">
                <p className="font-black text-purple-950 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-purple-600 stroke-[3]" /> Partner Policy Agreement
                </p>
                <p className="text-[11px] text-purple-800">
                  Every support ticket is linked to your facility ID. Escalations are directly monitored under Super Admin audit trails.
                </p>
              </div>
            </div>

            <button 
              onClick={() => {
                setActiveView('tickets');
                setShowCreateForm(true);
              }}
              className="w-full h-10 bg-purple-950 hover:bg-purple-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
            >
              Raise a Partner Ticket
            </button>
          </div>
        )}

        {/* RIGHT PANEL: ACTIVE CHAT SCREEN */}
        <div className="lg:col-span-2 bg-white border border-purple-100 rounded-2xl shadow-sm flex flex-col h-[550px] overflow-hidden">
          
          {/* BOT VIEW CHAT SCREEN */}
          {activeView === 'bot' && (
            <div className="flex flex-col h-full">
              {/* Bot Header */}
              <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">🤖</div>
                <div>
                  <h3 className="text-xs font-black text-purple-950">Partner Care Bot</h3>
                  <p className="text-[9px] text-purple-500 font-black uppercase flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" /> Automated Bot Live
                  </p>
                </div>
              </div>

              {/* Bot Conversation */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-50/50">
                {botMessages.map(m => (
                  <div key={m.id} className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.sender !== 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-black flex items-center justify-center text-xs shrink-0">🤖</div>
                    )}
                    <div className={`p-3 rounded-2xl text-xs max-w-[80%] font-semibold shadow-2xs ${
                      m.sender === 'user' 
                        ? 'bg-purple-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-purple-100 rounded-tl-none'
                    }`}>
                      <p className="font-black text-[9px] uppercase tracking-wider mb-1 opacity-75">{m.name}</p>
                      <p className="leading-relaxed">{m.message}</p>
                    </div>
                  </div>
                ))}
                {isBotTyping && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-black flex items-center justify-center text-xs">🤖</div>
                    <div className="bg-white text-purple-900 border border-purple-100 p-3 rounded-2xl rounded-tl-none text-xs font-bold animate-pulse">
                      typing response...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Bot Input Form */}
              <form onSubmit={handleBotSubmit} className="p-3 border-t border-purple-100 flex gap-2 bg-white">
                <input
                  type="text"
                  placeholder="Ask about payouts, check-in errors, inventory tracking..."
                  value={botInput}
                  onChange={(e) => setBotInput(e.target.value)}
                  className="flex-1 px-4 h-10 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-purple-400 focus:outline-none focus:border-purple-600"
                />
                <button
                  type="submit"
                  className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 transition-all shadow-md shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}

          {/* TICKET CONVERSATION SCREEN */}
          {activeView === 'tickets' && (
            <div className="flex flex-col h-full">
              
              {/* SUBMISSION FORM */}
              {showCreateForm ? (
                <div className="flex flex-col h-full bg-white">
                  <div className="p-4 border-b border-purple-100 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-purple-950 tracking-wider">File Partner Support Ticket</h3>
                    <button 
                      onClick={() => setShowCreateForm(false)}
                      className="text-purple-500 font-bold text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleCreateTicket} className="p-5 flex-1 overflow-y-auto space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-purple-700 uppercase">Subject Title</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter ticket subject..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full h-10 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-purple-700 uppercase">Category</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full h-10 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                        >
                          <option value="Billing">Payouts & Billing</option>
                          <option value="Booking">Client Bookings</option>
                          <option value="Technical">Platform Technical bug</option>
                          <option value="General">General Assistance</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-purple-700 uppercase">Priority</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as any)}
                          className="w-full h-10 px-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600"
                        >
                          <option value="low">Low (Standard review)</option>
                          <option value="medium">Medium</option>
                          <option value="high">High (Immediate alert)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-purple-700 uppercase">Core Description</label>
                      <textarea
                        required
                        placeholder="Detail the issue with booking codes, dates, amounts, etc..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all pt-0.5 mt-2"
                    >
                      Post Support Ticket
                    </button>
                  </form>
                </div>
              ) : activeTicket ? (
                /* LIVE MESSAGES */
                <div className="flex flex-col h-full">
                  <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-950 text-white flex items-center justify-center font-bold text-xs">🎫</div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{activeTicket.title}</h4>
                        <p className="text-[10px] text-purple-700 font-bold">
                          Urgency: {activeTicket.priority.toUpperCase()} • Status: {activeTicket.status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-purple-400 font-mono">#{activeTicket.id?.split('-')[0]}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
                    <div className="bg-white border border-purple-100 p-4 rounded-2xl flex items-start gap-2.5 max-w-[80%] font-semibold shadow-2xs">
                      <div className="w-7 h-7 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">📝</div>
                      <div>
                        <span className="text-[9px] font-black text-purple-700 uppercase">Filing Description</span>
                        <p className="text-xs text-slate-800 leading-relaxed mt-1">{activeTicket.description}</p>
                        <span className="text-[8px] text-purple-400 mt-2 block">{new Date(activeTicket.created_at || Date.now()).toLocaleString()}</span>
                      </div>
                    </div>

                    {activeTicket.replies?.map((r, index) => (
                      <div key={index} className={`flex items-start gap-2.5 ${r.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                        {r.sender_id !== user?.id && (
                          <div className="w-8 h-8 rounded-lg bg-purple-950 text-white font-black flex items-center justify-center text-xs shrink-0">
                            {r.is_bot ? '🤖' : '👨'}
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
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSendReply} className="p-3 border-t border-purple-100 flex gap-2 bg-white">
                    <input
                      type="text"
                      disabled={activeTicket.status === 'resolved'}
                      placeholder={activeTicket.status === 'resolved' ? "Closed" : "Write a response to Admin Support..."}
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
                    💬
                  </div>
                  <h4 className="font-black text-purple-950 text-sm mt-2">No Ticket Selected</h4>
                  <p className="text-[11px] max-w-xs font-medium">Select a ticket from the left panel to review or communicate with Super Admin.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
