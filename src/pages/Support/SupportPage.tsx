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

export const SupportPage = () => {
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
      name: 'GouujiCare Bot 🤖',
      message: 'Hello! Welcome to GouujiCare Support. I am your automated assistant. How can I help you today?',
      created_at: new Date().toISOString()
    }
  ]);
  const [botInput, setBotInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Thread Reply Input
  const [replyText, setReplyText] = useState('');

  const loadTickets = async () => {
    if (!user) return;
    const data = await fetchHelpdeskTickets(user.role || 'customer', user.id || '');
    setTickets(data);
    
    // Maintain active ticket sync if one is open
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

  // Bot Quick Answers
  const handleBotFAQ = (faqKey: string) => {
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      name: user?.full_name || 'Pet Parent',
      message: faqKey,
      created_at: new Date().toISOString()
    };
    setBotMessages(prev => [...prev, userMsg]);
    setIsBotTyping(true);

    setTimeout(() => {
      let botText = '';
      if (faqKey.includes('Booking')) {
        botText = 'To modify or cancel a booking, go to "My Dashboard", locate the stay reservation, and select "Modify Stay". Please note cancellations made within 24 hours of check-in are subject to a 10% fee.';
      } else if (faqKey.includes('Refund')) {
        botText = 'Refunds are automatically processed to the original payment method within 3-5 business days of check-out adjustments or authorized cancellations. You can track settlements inside your wallet tab.';
      } else if (faqKey.includes('Vet')) {
        botText = 'Every Gouuji Assured center features 24/7 emergency veterinarian links. In case of emergency, you can navigate to the "Emergency Line" in the menu or contact +91 9999 8888.';
      } else {
        botText = 'If you need to log a formal concern for human agent resolution, click "Raise a Support Ticket" above. A ticket will be logged directly into our Super Admin dashboard.';
      }

      setBotMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        name: 'GouujiCare Bot 🤖',
        message: botText,
        created_at: new Date().toISOString()
      }]);
      setIsBotTyping(false);
    }, 1000);
  };

  const analyzeIntent = (input: string) => {
    const text = input.toLowerCase();
    
    // Define intent categories with keywords
    const intents = {
      billing: ['refund', 'charge', 'money', 'payment', 'bill', 'invoice', 'double', 'cost', 'price', 'wallet'],
      booking: ['book', 'reserve', 'cancel', 'modify', 'change date', 'schedule', 'appointment', 'stay'],
      safety: ['emergency', 'sick', 'vet', 'hurt', 'bite', 'doctor', 'hospital', 'blood', 'injury', 'urgent'],
      technical: ['bug', 'error', 'crash', 'login', 'password', 'slow', 'page not found', 'glitch', 'broken'],
      general: ['ticket', 'human', 'agent', 'support', 'help', 'contact', 'talk', 'hello', 'hi', 'hey']
    };

    // Calculate scores
    let bestIntent = 'general';
    let maxScore = 0;

    Object.entries(intents).forEach(([intent, keywords]) => {
      let score = 0;
      keywords.forEach(kw => {
        if (text.includes(kw)) score += 2; // Direct match
        else {
          // Check for partial matches or stems (basic NLP heuristic)
          const words = text.split(' ');
          words.forEach(w => {
            if (w.length > 3 && kw.includes(w)) score += 0.5;
          });
        }
      });
      if (score > maxScore) {
        maxScore = score;
        bestIntent = intent;
      }
    });

    return maxScore > 0 ? bestIntent : 'unknown';
  };

  const handleBotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botInput.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      name: user?.full_name || 'Pet Parent',
      message: botInput,
      created_at: new Date().toISOString()
    };
    
    const currentInput = botInput;
    setBotMessages(prev => [...prev, userMsg]);
    setBotInput('');
    setIsBotTyping(true);

    setTimeout(() => {
      const intent = analyzeIntent(currentInput);
      let botText = '';
      
      // Auto-categorize ticket form in the background
      if (intent === 'billing') {
        setCategory('Billing');
        setTitle('Billing / Refund Issue');
        botText = 'I see you have a question about billing or refunds. Refunds are automatically processed to the original payment method within 3-5 business days of check-out adjustments. If you suspect an error (like a double charge), I have pre-filled a "Billing" ticket for you. Click "Raise a Support Ticket" to submit it for manual review.';
      } else if (intent === 'booking') {
        setCategory('Booking');
        setTitle('Booking Modification');
        botText = 'For booking inquiries or modifications, you can manage active stays directly in "My Dashboard" by selecting "Modify Stay". If you need special assistance, I have pre-configured a "Booking" ticket for you. You can submit it via the "Raise a Support Ticket" button.';
      } else if (intent === 'safety') {
        setCategory('Safety');
        setTitle('URGENT: Safety / Vet Care');
        setPriority('high');
        botText = '🚨 I detect an emergency or medical situation. If your pet is in immediate danger, PLEASE CALL our 24/7 critical line at +91 9999 8888 immediately. Alternatively, use the pre-filled High-Priority ticket to alert the regional supervisor right now.';
      } else if (intent === 'technical') {
        setCategory('Technical');
        setTitle('App / Technical Issue');
        botText = 'It sounds like you might be experiencing a technical glitch. I have pre-selected the "Technical" category for you. Please try clearing your browser cache. If the issue persists, submit the ticket so our DevOps team can investigate.';
      } else if (intent === 'general') {
        setCategory('General');
        botText = 'I can connect you with a human agent. Please use the "Raise a Support Ticket" button below to open a formal filing form, and a support representative will assist you shortly.';
      } else {
        botText = "I've received your request. While I'm continually learning, I might need human assistance for this specific query. Please open the 'Raise Support Ticket' form, and our Super Admin team will resolve it promptly.";
      }

      setBotMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        name: 'GouujiCare Bot 🤖',
        message: botText,
        created_at: new Date().toISOString()
      }]);
      setIsBotTyping(false);
    }, 1200);
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
      type: 'customer',
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
      sender_name: user?.full_name || 'Pet Parent',
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
    <div className="max-w-6xl mx-auto space-y-8 font-sans pb-24">
      {/* Title Header - Modern Gradient & Glass */}
      <div className="bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 text-white rounded-[2rem] p-8 shadow-xl shadow-purple-900/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* Decorative background blur element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <h1 className="text-2xl font-black tracking-tight">Customer Care & Support</h1>
          </div>
          <p className="text-sm text-purple-200 mt-2 font-medium max-w-xl">
            Solve issues instantly with our care bot, or raise a ticket to connect directly with Gouuji Admin staff.
          </p>
        </div>

        <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 relative z-10 shadow-inner">
          <button 
            onClick={() => setActiveView('bot')}
            className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all flex items-center gap-2 ${activeView === 'bot' ? 'bg-white text-indigo-900 shadow-md' : 'text-purple-100 hover:text-white hover:bg-white/10'}`}
          >
            <Bot size={16} /> Care Bot Assistant
          </button>
          <button 
            onClick={() => setActiveView('tickets')}
            className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all flex items-center gap-2 ${activeView === 'tickets' ? 'bg-white text-indigo-900 shadow-md' : 'text-purple-100 hover:text-white hover:bg-white/10'}`}
          >
            <MessageSquare size={16} /> Tickets ({tickets.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ============================================================
            LEFT PANEL: TICKET LIST / BOT FAQS
            ============================================================ */}
        {activeView === 'tickets' ? (
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-[600px] transition-all">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Support History</span>
              <button 
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <Plus size={14} className="stroke-[3]" /> Raise Ticket
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {tickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTicket(t);
                    setShowCreateForm(false);
                  }}
                  className={`w-full text-left border rounded-2xl p-4 transition-all flex flex-col justify-between hover:shadow-md ${
                    activeTicket?.id === t.id 
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/20' 
                      : 'border-slate-100 bg-white hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-black text-slate-900 line-clamp-1 flex-1">{t.title}</h4>
                    <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      t.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                      t.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 font-bold mt-2 uppercase tracking-wide">Category: {t.category}</p>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100/60">
                    <span className="text-xs text-slate-400 font-medium">#{t.id?.split('-')[0]}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                      t.status === 'open' ? 'bg-emerald-100 text-emerald-700' :
                      t.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {t.status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                      {t.status}
                    </span>
                  </div>
                </button>
              ))}
              {tickets.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                    <FolderLock size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-medium">No tickets raised yet.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* BOT FAQ & TELEMETRY PANEL */
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6 flex flex-col h-[600px]">
            <div>
              <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Self Service Center</span>
              <p className="text-xs text-slate-500 font-medium mt-1">Quick diagnostic support options.</p>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <button 
                onClick={() => handleBotFAQ('Booking Cancellation & Policy')} 
                className="w-full text-left p-4 border border-slate-100 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md text-sm font-bold text-slate-700 transition-all flex items-center justify-between group"
              >
                <span className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">📅</div>
                  Cancellation Policy
                </span>
                <span className="text-slate-300 group-hover:text-indigo-600 transition-colors">→</span>
              </button>
              <button 
                onClick={() => handleBotFAQ('Tracking Refunds')} 
                className="w-full text-left p-4 border border-slate-100 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md text-sm font-bold text-slate-700 transition-all flex items-center justify-between group"
              >
                <span className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">💳</div>
                  Refund Timeline
                </span>
                <span className="text-slate-300 group-hover:text-indigo-600 transition-colors">→</span>
              </button>
              <button 
                onClick={() => handleBotFAQ('Critical Veterinarian Links')} 
                className="w-full text-left p-4 border border-slate-100 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md text-sm font-bold text-slate-700 transition-all flex items-center justify-between group"
              >
                <span className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">🐾</div>
                  Vet Support & Emergencies
                </span>
                <span className="text-slate-300 group-hover:text-indigo-600 transition-colors">→</span>
              </button>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 rounded-2xl p-5 mt-6 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ShieldCheck size={64} />
                </div>
                <p className="font-black text-indigo-950 flex items-center gap-2 text-sm relative z-10">
                  <ShieldCheck size={16} className="text-indigo-600 stroke-[2.5]" /> Gouuji Secure Guarantee
                </p>
                <p className="text-xs text-indigo-800/80 leading-relaxed relative z-10">
                  Every transaction is encrypted and audit logs are recorded. Tickets raised are routed straight to Root Super Admins with full resolution tracking.
                </p>
              </div>
            </div>

            <button 
              onClick={() => {
                setActiveView('tickets');
                setShowCreateForm(true);
              }}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Raise a Support Ticket
            </button>
          </div>
        )}

        {/* ============================================================
            RIGHT PANEL: ACTIVE CHAT SCREEN (Bot or Ticket chat)
            ============================================================ */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-[600px] overflow-hidden relative">
          
          {/* BOT VIEW CHAT SCREEN */}
          {activeView === 'bot' && (
            <div className="flex flex-col h-full bg-slate-50/30">
              {/* Bot Header */}
              <div className="bg-white p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/30">🤖</div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">GouujiCare Assistant</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Usually replies instantly</p>
                  </div>
                </div>
              </div>

              {/* Bot Conversation */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {botMessages.map(m => (
                  <div key={m.id} className={`flex items-end gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.sender !== 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-sm">🤖</div>
                    )}
                    <div className={`p-4 rounded-[20px] text-sm max-w-[75%] font-medium leading-relaxed ${
                      m.sender === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-sm shadow-md' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm shadow-sm'
                    }`}>
                      {m.sender !== 'user' && <p className="font-bold text-[10px] text-indigo-500 uppercase tracking-wider mb-1.5">{m.name}</p>}
                      <p>{m.message}</p>
                    </div>
                  </div>
                ))}
                {isBotTyping && (
                  <div className="flex items-end gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-xs shadow-sm">🤖</div>
                    <div className="bg-white border border-slate-100 px-4 py-3.5 rounded-[20px] rounded-bl-sm shadow-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Bot Input Form */}
              <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={handleBotSubmit} className="flex gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                  <input
                    type="text"
                    placeholder="Type your question here..."
                    value={botInput}
                    onChange={(e) => setBotInput(e.target.value)}
                    className="flex-1 px-4 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!botInput.trim()}
                    className="w-10 h-10 bg-indigo-600 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md shrink-0"
                  >
                    <Send size={16} className="ml-1" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SUPPORT TICKET CONVERSATION SCREEN */}
          {activeView === 'tickets' && (
            <div className="flex flex-col h-full bg-slate-50/30">
              
              {/* SUBMISSION FORM DISPLAY */}
              {showCreateForm ? (
                <div className="flex flex-col h-full bg-white">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Submit Support Ticket</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">Our team typically responds within 2-4 hours.</p>
                    </div>
                    <button 
                      onClick={() => setShowCreateForm(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold p-2 bg-slate-50 rounded-xl transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateTicket} className="p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Ticket Title</label>
                      <input
                        type="text"
                        required
                        placeholder="Summarize your issue briefly..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Category</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                        >
                          <option value="Billing">Billing / Refund</option>
                          <option value="Booking">Booking stays</option>
                          <option value="Technical">Technical issue</option>
                          <option value="Safety">Safety & Vet Care</option>
                          <option value="General">General Question</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Urgency</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as any)}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                        >
                          <option value="low">Low (Standard review)</option>
                          <option value="medium">Medium</option>
                          <option value="high">High (Priority check)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Detailed Description</label>
                      <textarea
                        required
                        placeholder="Provide details about dates, billing transactions, bookings, etc... The more details you provide, the faster we can help."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 mt-4"
                    >
                      Submit Support Ticket
                    </button>
                  </form>
                </div>
              ) : activeTicket ? (
                /* LIVE TICKET THREAD MESSAGES */
                <div className="flex flex-col h-full">
                  
                  {/* Ticket Header details */}
                  <div className="bg-white p-5 border-b border-slate-100 flex items-center justify-between gap-4 shadow-sm relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl shadow-md">🎟️</div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{activeTicket.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            activeTicket.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {activeTicket.priority} Priority
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            activeTicket.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 
                            activeTicket.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {activeTicket.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      #{activeTicket.id?.split('-')[0]}
                    </span>
                  </div>

                  {/* Thread History */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
                    {/* Ticket Original Description */}
                    <div className="flex justify-center mb-6">
                      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm max-w-[90%] w-full">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs">📝</div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Original Request</span>
                        </div>
                        <p className="text-sm text-slate-800 font-medium leading-relaxed">{activeTicket.description}</p>
                        <span className="text-[10px] text-slate-400 font-bold mt-3 block">{new Date(activeTicket.created_at || Date.now()).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Chat Replies */}
                    {activeTicket.replies?.map((r, index) => (
                      <div key={index} className={`flex items-end gap-3 ${r.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                        {r.sender_id !== user?.id && (
                          <div className={`w-8 h-8 rounded-xl font-black flex items-center justify-center text-xs shrink-0 shadow-sm ${r.is_bot ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-slate-800 text-white'}`}>
                            {r.is_bot ? '🤖' : '👩‍💻'}
                          </div>
                        )}
                        <div className={`p-4 rounded-[20px] text-sm max-w-[75%] font-medium leading-relaxed ${
                          r.sender_id === user?.id 
                            ? 'bg-indigo-600 text-white rounded-br-sm shadow-md' 
                            : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm shadow-sm'
                        }`}>
                          <p className={`font-bold text-[10px] uppercase tracking-wider mb-1.5 ${r.sender_id === user?.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {r.sender_name}
                          </p>
                          <p>{r.message}</p>
                          <span className={`text-[9px] font-bold mt-2 block text-right ${r.sender_id === user?.id ? 'text-indigo-200/70' : 'text-slate-400'}`}>
                            {new Date(r.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Reply Input Form */}
                  <div className="p-4 bg-white border-t border-slate-100">
                    <form onSubmit={handleSendReply} className={`flex gap-3 p-2 rounded-2xl border transition-all ${activeTicket.status === 'resolved' ? 'bg-slate-50 border-slate-100' : 'bg-slate-50 border-slate-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10'}`}>
                      <input
                        type="text"
                        disabled={activeTicket.status === 'resolved'}
                        placeholder={activeTicket.status === 'resolved' ? "This ticket is resolved and closed" : "Write your response here..."}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 px-4 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={activeTicket.status === 'resolved' || !replyText.trim()}
                        className="w-10 h-10 bg-indigo-600 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md shrink-0"
                      >
                        <Send size={16} className="ml-1" />
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                /* EMPTY CONVERSATION STATE */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                  <div className="w-20 h-20 bg-white border border-slate-100 rounded-3xl flex items-center justify-center shadow-sm mb-4 relative">
                    <MessageSquare size={32} className="text-slate-300" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">!</span>
                    </div>
                  </div>
                  <h4 className="font-black text-slate-800 text-lg">No Ticket Selected</h4>
                  <p className="text-sm text-slate-500 font-medium mt-2 max-w-sm">
                    Select an active support ticket from the side panel to view the conversation, or raise a new ticket to get help from our team.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

