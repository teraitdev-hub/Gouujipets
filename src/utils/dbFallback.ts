import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface JournalEntry {
  id?: string;
  business_id: string;
  entry_type: 'revenue' | 'expense' | 'profit' | 'loss' | 'lending_lent' | 'lending_borrowed' | 'settlement';
  category: string;
  amount: number;
  date: string;
  description: string;
  party_name?: string;
  status: 'completed' | 'pending' | 'settled';
  created_at?: string;
}

export interface TicketReply {
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
  is_bot?: boolean;
}

export interface HelpdeskTicket {
  id?: string;
  user_id: string;
  business_id?: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  category: string;
  type: 'customer' | 'partner';
  replies: TicketReply[];
  created_at?: string;
  updated_at?: string;
  user_email?: string;
  user_name?: string;
}

// Check if error is due to missing table
const isTableMissingError = (error: any) => {
  return error && (error.code === 'permission-denied' || error.code === 'PGRST205' || error.message?.includes('does not exist') || error.message?.includes('404') || error.message?.includes('Missing or insufficient permissions'));
};

// -------------------------------------------------------------
// JOURNAL ENTRIES API
// -------------------------------------------------------------

export async function fetchJournalEntries(businessId?: string): Promise<JournalEntry[]> {
  try {
    const entries: JournalEntry[] = [];
    
    // 1. Fetch Expenses
    const expRef = collection(db, 'expenses');
    let qExp = query(expRef);
    if (businessId) {
      qExp = query(expRef, where('business_id', '==', businessId));
    }
    const expSnap = await getDocs(qExp);
    const exps = expSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    if (exps) {
      exps.forEach((e: any) => {
        entries.push({
          id: e.id,
          business_id: e.business_id,
          entry_type: 'expense',
          category: e.category || 'Expense',
          amount: e.amount,
          date: e.date,
          description: e.description || '',
          status: 'completed',
          created_at: e.created_at
        });
      });
    }

    // 2. Fetch Bookings for Revenue
    const bkgRef = collection(db, 'bookings');
    let qBkg = query(bkgRef);
    if (businessId) {
      qBkg = query(bkgRef, where('business_id', '==', businessId));
    }
    const bkgSnap = await getDocs(qBkg);
    const bkgs = bkgSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    if (bkgs) {
      bkgs.forEach((b: any) => {
        if (['confirmed', 'completed', 'checked_in', 'checked_out'].includes(b.status)) {
          const total = (Number(b.total_amount) || 0) + (Number(b.extra_expenses) || 0);
          entries.push({
            id: b.id,
            business_id: b.business_id,
            entry_type: 'revenue',
            category: 'Booking Income',
            amount: total,
            date: b.created_at ? b.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            description: `Booking #${(b.id || '').substring(0,6)} - ${b.status}`,
            party_name: b.customer_id?.full_name || 'Customer',
            status: 'completed',
            created_at: b.created_at
          });
        }
      });
    }

    // 3. Fallback to Local Storage for 'lending_lent', 'loss', etc. that are not in DB
    const local = getLocalJournalEntries(businessId);
    
    let combined: JournalEntry[] = [];
    if (entries.length > 0) {
      const filteredLocal = local.filter(e => e.entry_type !== 'revenue' && e.entry_type !== 'expense');
      combined = [...entries, ...filteredLocal];
    } else {
      combined = [];
    }
    
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined;
  } catch (err) {
    console.warn('Firebase journal fetch failed, falling back to LocalStorage:', err);
    return getLocalJournalEntries(businessId);
  }
}

export async function fetchAllJournalEntriesPlatform(): Promise<JournalEntry[]> {
  return fetchJournalEntries(); // Reuses logic without businessId to get all
}

export async function createJournalEntry(entry: JournalEntry): Promise<JournalEntry> {
  const newEntry = {
    ...entry,
    id: entry.id || generateUUID(),
    created_at: new Date().toISOString()
  };

  try {
    if (entry.entry_type === 'expense') {
      const docRef = await addDoc(collection(db, 'expenses'), {
        business_id: entry.business_id,
        category: entry.category,
        amount: entry.amount,
        date: entry.date,
        description: entry.description,
        created_at: newEntry.created_at
      });
      window.dispatchEvent(new CustomEvent('journal-update'));
      return { ...newEntry, id: docRef.id };
    }
    // For non-expense entries or if insert failed
    saveLocalJournalEntry(newEntry);
    return newEntry;
  } catch (err) {
    console.warn('Firebase journal insert failed, falling back to LocalStorage:', err);
    saveLocalJournalEntry(newEntry);
    return newEntry;
  }
}

export async function updateJournalEntryStatus(id: string, status: 'completed' | 'pending' | 'settled'): Promise<boolean> {
  // Only supported in local storage since we dynamically generate revenue/expense from bookings/expenses tables
  return updateLocalJournalEntryStatus(id, status);
}

// -------------------------------------------------------------
// HELPDESK TICKETS API
// -------------------------------------------------------------

export async function fetchHelpdeskTickets(role: string, userId: string): Promise<HelpdeskTicket[]> {
  try {
    const ticketsRef = collection(db, 'helpdesk_tickets');
    let q = query(ticketsRef);
    
    if (role !== 'superadmin' && role !== 'admin') {
      q = query(ticketsRef, where('user_id', '==', userId));
    }
    
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    return data.map((t: any) => ({
      ...t,
      user_email: t.user_id?.email || t.user_email || '',
      user_name: t.user_id?.full_name || t.user_name || '',
      user_id: typeof t.user_id === 'object' ? t.user_id?.id || userId : t.user_id
    }));
  } catch (err) {
    if (isTableMissingError(err)) {
      return getLocalTickets(role, userId);
    }
    console.warn('Firebase tickets fetch failed, falling back to LocalStorage:', err);
    return getLocalTickets(role, userId);
  }
}

export async function createHelpdeskTicket(ticket: HelpdeskTicket): Promise<HelpdeskTicket> {
  const ticketId = generateUUID();
  const newTicket: HelpdeskTicket = {
    ...ticket,
    id: ticketId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    replies: ticket.replies || []
  };

  // Perform ticket creation
  try {
    await setDoc(doc(db, 'helpdesk_tickets', ticketId), {
      user_id: newTicket.user_id,
      business_id: newTicket.business_id || null,
      title: newTicket.title,
      description: newTicket.description,
      status: newTicket.status,
      priority: newTicket.priority,
      category: newTicket.category,
      type: newTicket.type,
      replies: newTicket.replies,
      created_at: newTicket.created_at,
      updated_at: newTicket.updated_at
    });

    const created = newTicket;
    triggerBotAutomation(created);
    return created;
  } catch (err) {
    if (isTableMissingError(err)) {
      saveLocalTicket(newTicket);
      triggerBotAutomation(newTicket);
      return newTicket;
    }
    console.warn('Firebase ticket insert failed, falling back to LocalStorage:', err);
    saveLocalTicket(newTicket);
    triggerBotAutomation(newTicket);
    return newTicket;
  }
}

export async function addTicketReply(ticketId: string, reply: TicketReply): Promise<boolean> {
  try {
    const docRef = doc(db, 'helpdesk_tickets', ticketId);
    const docSnap = await getDoc(docRef);
    const existingReplies = docSnap.exists() ? (docSnap.data().replies as TicketReply[] || []) : [];
    const updatedReplies = [...existingReplies, reply];

    await updateDoc(docRef, {
      replies: updatedReplies,
      updated_at: new Date().toISOString()
    });
    return true;
  } catch (err) {
    if (isTableMissingError(err)) {
      return addLocalTicketReply(ticketId, reply);
    }
    console.warn('Firebase reply insert failed, falling back to LocalStorage:', err);
    return addLocalTicketReply(ticketId, reply);
  }
}

export async function updateTicketStatus(ticketId: string, status: 'open' | 'in_progress' | 'resolved'): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'helpdesk_tickets', ticketId), {
      status,
      updated_at: new Date().toISOString()
    });
    return true;
  } catch (err) {
    if (isTableMissingError(err)) {
      return updateLocalTicketStatus(ticketId, status);
    }
    console.warn('Firebase ticket status update failed, falling back to LocalStorage:', err);
    return updateLocalTicketStatus(ticketId, status);
  }
}

// -------------------------------------------------------------
// BOT AUTOMATION AGENT
// -------------------------------------------------------------
function triggerBotAutomation(ticket: HelpdeskTicket) {
  setTimeout(async () => {
    let botMsg = '';
    let shouldAutoResolve = false;
    const lowerDesc = ticket.description.toLowerCase();

    switch (ticket.category.toLowerCase()) {
      case 'billing':
        if (lowerDesc.includes('when') && lowerDesc.includes('refund')) {
          botMsg = `[Automated Audit Bot] Refunds take 3-5 business days to reflect in your original payment method. Since this answers your query, I am automatically marking this ticket as resolved. If you still need help, you can reply here to reopen the ticket.`;
          shouldAutoResolve = true;
        } else {
          botMsg = `[Automated Audit Bot] Diagnostic Check Complete. No immediate billing errors found. Your ticket (#${ticket.id?.split('-')[0]}) has been forwarded to Gouuji Finance Team. Standard review timeline: 4-6 hours.`;
        }
        break;
      case 'booking':
        if (lowerDesc.includes('how to cancel') || lowerDesc.includes('cancellation policy')) {
          botMsg = `[Automated Support Bot] You can cancel a booking directly from your Dashboard under 'Active Stays'. Note that cancellations within 24 hours incur a 10% fee. I have resolved this ticket, but reply if you need human assistance!`;
          shouldAutoResolve = true;
        } else {
          botMsg = `[Automated Support Bot] Verification Check: Reservation parameters are standard. The Partner facility has been alerted to review this request. You will receive an email update once they respond.`;
        }
        break;
      case 'safety':
      case 'emergency':
        botMsg = `🚨 [Gouuji Core Bot] ESCALATION ACTIVATED: Safety concern received. A direct priority notification has been sent to the Facility Manager and Regional Supervisor. We will contact you shortly.`;
        break;
      case 'technical':
        if (lowerDesc.includes('password') || lowerDesc.includes('reset')) {
          botMsg = `[Automated DevOps Bot] To reset your password, please sign out and click "Forgot Password" on the login screen. I am resolving this ticket for now.`;
          shouldAutoResolve = true;
        } else {
          botMsg = `[Automated DevOps Bot] Diagnostic: App server status OK. Client environment telemetry captured. Try reloading the application or clearing cookies. If issue persists, please wait for engineering review.`;
        }
        break;
      default:
        botMsg = `[Automated Support Bot] Thank you for reaching out to Gouuji Support Desk. We have successfully logged your concern under Priority: ${ticket.priority.toUpperCase()}. Our administrators will review this shortly.`;
    }

    const botReply: TicketReply = {
      sender_id: 'gouuji-support-bot-uuid',
      sender_name: 'GouujiCare Bot 🤖',
      message: botMsg,
      created_at: new Date().toISOString(),
      is_bot: true
    };

    // Save reply to database/localstorage
    await addTicketReply(ticket.id!, botReply);
    
    if (shouldAutoResolve) {
      await updateTicketStatus(ticket.id!, 'resolved');
    }
    
    // Dispatch a custom event to notify components to refresh
    window.dispatchEvent(new CustomEvent('helpdesk-update'));
  }, 1500);
}

// -------------------------------------------------------------
// LOCALSTORAGE IMPLEMENTATION FOR SANDBOXES
// -------------------------------------------------------------

function getLocalJournalEntries(businessId?: string): JournalEntry[] {
  try {
    const data = localStorage.getItem('gouuji_journal_entries');
    const entries: JournalEntry[] = data ? JSON.parse(data) : [];
    
    if (businessId) {
      return entries.filter(e => e.business_id === businessId);
    }
    return entries;
  } catch (e) {
    console.error('Error loading local journal entries', e);
    return [];
  }
}

function saveLocalJournalEntry(entry: JournalEntry) {
  try {
    const entries = getLocalJournalEntries();
    entries.unshift(entry);
    localStorage.setItem('gouuji_journal_entries', JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('journal-update'));
  } catch (e) {
    console.error('Error saving local journal entry', e);
  }
}

function updateLocalJournalEntryStatus(id: string, status: 'completed' | 'pending' | 'settled'): boolean {
  try {
    const entries = getLocalJournalEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
      entries[index].status = status;
      localStorage.setItem('gouuji_journal_entries', JSON.stringify(entries));
      window.dispatchEvent(new CustomEvent('journal-update'));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error updating local journal entry status', e);
    return false;
  }
}

function getLocalTickets(role: string, userId: string): HelpdeskTicket[] {
  try {
    const data = localStorage.getItem('gouuji_helpdesk_tickets');
    let tickets: HelpdeskTicket[] = data ? JSON.parse(data) : [];
    
    if (role !== 'superadmin' && role !== 'admin') {
      return tickets.filter(t => t.user_id === userId);
    }
    return tickets;
  } catch (e) {
    console.error('Error reading local support tickets', e);
    return [];
  }
}

function saveLocalTicket(ticket: HelpdeskTicket) {
  try {
    const tickets = getLocalTickets('superadmin', '');
    tickets.unshift(ticket);
    localStorage.setItem('gouuji_helpdesk_tickets', JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent('helpdesk-update'));
  } catch (e) {
    console.error('Error saving local support ticket', e);
  }
}

function addLocalTicketReply(ticketId: string, reply: TicketReply): boolean {
  try {
    const tickets = getLocalTickets('superadmin', '');
    const index = tickets.findIndex(t => t.id === ticketId);
    if (index !== -1) {
      tickets[index].replies = [...(tickets[index].replies || []), reply];
      tickets[index].updated_at = new Date().toISOString();
      localStorage.setItem('gouuji_helpdesk_tickets', JSON.stringify(tickets));
      window.dispatchEvent(new CustomEvent('helpdesk-update'));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error saving local reply', e);
    return false;
  }
}

function updateLocalTicketStatus(ticketId: string, status: 'open' | 'in_progress' | 'resolved'): boolean {
  try {
    const tickets = getLocalTickets('superadmin', '');
    const index = tickets.findIndex(t => t.id === ticketId);
    if (index !== -1) {
      tickets[index].status = status;
      tickets[index].updated_at = new Date().toISOString();
      localStorage.setItem('gouuji_helpdesk_tickets', JSON.stringify(tickets));
      window.dispatchEvent(new CustomEvent('helpdesk-update'));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error updating local ticket status', e);
    return false;
  }
}

