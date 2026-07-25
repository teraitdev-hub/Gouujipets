import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { X, DollarSign, Plus, Calculator, AlertTriangle, Receipt, AlertCircle } from 'lucide-react';
import { formatRupee } from '../../utils/currency';
import { InvoiceSheet } from '../finance/InvoiceSheet';
import { createJournalEntry } from '../../utils/dbFallback';

interface BookingFinancialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  businessBaseRate: number;
  onSuccess: () => void;
}

export const BookingFinancialsModal = ({ isOpen, onClose, booking, businessBaseRate, onSuccess }: BookingFinancialsModalProps) => {
  const [extraExpense, setExtraExpense] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [overtimeDays, setOvertimeDays] = useState(0);
  const [showInvoice, setShowInvoice] = useState(false);
  const [pendingCharges, setPendingCharges] = useState<any[]>([]);

  useEffect(() => {
    if (booking) {
      // Calculate Overtime if current date is past check_out date
      const today = new Date();
      const checkoutDate = new Date(booking.check_out);
      if (today > checkoutDate && booking.status !== 'completed') {
        const diffTime = Math.abs(today.getTime() - checkoutDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setOvertimeDays(diffDays);
      } else {
        setOvertimeDays(0);
      }
      
      // Fetch pending extra charges
      const q = query(
        collection(db, 'extra_charges'),
        where('booking_id', '==', booking.id),
        where('status', '==', 'pending')
      );
      getDocs(q).then((snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data) setPendingCharges(data);
      });
    }
  }, [booking]);

  const handleUpdateFinancials = async () => {
    setIsLoading(true);
    try {
      const additionalExpenses = Number(extraExpense) || 0;
      const paymentAmount = Number(settleAmount) || 0;
      const overtimeCharge = overtimeDays * businessBaseRate;
      
      const newExtraExpenses = (Number(booking.extra_expenses) || 0) + additionalExpenses + overtimeCharge;
      const newTotalPaid = (Number(booking.total_paid) || 0) + paymentAmount;
      
      const isPaying = paymentAmount > 0;
      const newPaymentMethod = isPaying 
        ? (booking.payment_method ? `${booking.payment_method} + ${paymentMethod}` : paymentMethod)
        : booking.payment_method;

      // 1. Insert manual extra charge if any
      if (additionalExpenses > 0) {
        const payload = {
          booking_id: booking.id,
          business_id: booking.business_id.id || booking.business_id,
          customer_id: booking.customer_id,
          description: `Manual Extra Charge - ${new Date().toLocaleDateString()}`,
          amount: additionalExpenses,
          type: 'manual',
          status: paymentAmount >= additionalExpenses ? 'paid' : 'pending'
        };
        await addDoc(collection(db, 'extra_charges'), payload);
      }

      // 2. Insert computed extra charge if overtime
      if (overtimeCharge > 0) {
        const payload = {
          booking_id: booking.id,
          business_id: booking.business_id.id || booking.business_id,
          customer_id: booking.customer_id,
          description: `Overtime Charge (${overtimeDays} days)`,
          amount: overtimeCharge,
          type: 'computed',
          status: paymentAmount >= overtimeCharge ? 'paid' : 'pending'
        };
        await addDoc(collection(db, 'extra_charges'), payload);
      }

      let finalExtraExpenses = (Number(booking.extra_expenses) || 0) + additionalExpenses + overtimeCharge;
      
      const pendingChargesSum = pendingCharges.reduce((acc, curr) => acc + Number(curr.amount), 0);

      // 4. Mark extra charges as paid if balance is fully cleared (including pending charges)
      if (newTotalPaid >= Number(booking.total_amount) + finalExtraExpenses + pendingChargesSum) {
        if (pendingCharges.length > 0) {
          const batch = writeBatch(db);
          pendingCharges.forEach(charge => {
            batch.update(doc(db, 'extra_charges', charge.id), { status: 'paid' });
          });
          await batch.commit();
        }
      }

      // 3. Update bookings table
      await updateDoc(doc(db, 'bookings', booking.id), {
        extra_expenses: finalExtraExpenses,
        total_paid: newTotalPaid,
        payment_method: newPaymentMethod
      });
      
      // Automate Journal Entry for Extra Charges/Settlement Paid
      if (paymentAmount > 0) {
        await createJournalEntry({
          business_id: booking.business_id.id || booking.business_id,
          entry_type: 'revenue',
          category: 'Extra Services / Settlement',
          amount: paymentAmount,
          date: new Date().toISOString().split('T')[0],
          description: `Settlement/extra charges collected for booking (ID: ${booking.id})`,
          party_name: booking.customer_id?.full_name || "Customer",
          status: 'completed'
        });
        
        // Auto-deduct 15% Platform Commission
        const commissionAmount = paymentAmount * 0.15;
        await createJournalEntry({
          business_id: booking.business_id.id || booking.business_id,
          entry_type: 'expense',
          category: 'Platform Commission',
          amount: commissionAmount,
          date: new Date().toISOString().split('T')[0],
          description: `15% Platform fee for collected amount (Booking ID: ${booking.id})`,
          party_name: "GouujiPets Platform",
          status: 'completed'
        });
      }

      alert("Financials updated successfully!");
      onSuccess();
      onClose();
      setExtraExpense('');
      setSettleAmount('');
    } catch (err: any) {
      console.error(err);
      alert("Failed to update financials");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !booking) return null;

  const pendingChargesSum = pendingCharges.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalCost = Number(booking.total_amount) + (Number(booking.extra_expenses) || 0);
  const totalPaid = Number(booking.total_paid) || 0;
  const balanceDue = Math.max(0, totalCost - totalPaid);

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-900 font-black">
            <Calculator size={20} />
            <h2 className="text-xl">Financials & Settle Balance</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowInvoice(true)}
              className="p-2 hover:bg-purple-50 text-purple-600 rounded-full transition-colors tooltip"
              title="View Invoice"
            >
              <Receipt size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
            <h3 className="font-bold text-gray-900 text-sm mb-2 border-b pb-2">Current Booking Invoice</h3>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Base Booking Amount:</span>
              <span>{formatRupee(booking.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Accumulated Extra Expenses:</span>
              <span>{formatRupee(booking.extra_expenses || 0)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 border-t pt-2">
              <span>Total Cost:</span>
              <span>{formatRupee(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm text-purple-600 font-bold">
              <span>Amount Paid:</span>
              <span>- {formatRupee(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-purple-900 border-t pt-2">
              <span>Balance Due:</span>
              <span>{formatRupee(balanceDue)}</span>
            </div>
          </div>

          {overtimeDays > 0 && (
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 flex gap-3">
              <AlertTriangle className="text-purple-700 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-bold text-purple-900 text-sm">Overtime Flagged</h4>
                <p className="text-xs text-purple-700 mt-1">
                  Pet has stayed {overtimeDays} day(s) past the checkout date ({booking.check_out}).
                </p>
                <div className="mt-2 font-bold text-purple-900 text-sm">
                  Overtime Charge: {formatRupee(overtimeDays * businessBaseRate)}
                </div>
              </div>
            </div>
          )}

          {pendingCharges.length > 0 && (
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                <AlertCircle size={16} /> Pending Extra Charges
              </div>
              {pendingCharges.map(charge => (
                <div key={charge.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-purple-200/50 shadow-2xs">
                  <span className="text-xs font-medium text-purple-950">{charge.description}</span>
                  <span className="text-xs font-bold text-purple-700">{formatRupee(charge.amount)}</span>
                </div>
              ))}
              <div className="text-[10px] text-purple-700/80 mt-1">
                * These will be automatically marked as paid when the full balance is settled.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 line-clamp-1 text-ellipsis">Add Extra Charge</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-bold">₹</span>
                </div>
                <input 
                  type="number"
                  value={extraExpense}
                  onChange={(e) => setExtraExpense(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-7 p-2.5 font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-purple-900 line-clamp-1 text-ellipsis">Record Payment</label>
                {balanceDue > 0 && (
                  <button 
                    onClick={() => setSettleAmount(balanceDue.toString())}
                    className="text-[10px] bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-black hover:bg-purple-200 transition-colors"
                  >
                    Pay Full ₹{balanceDue}
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-purple-600 font-bold">₹</span>
                </div>
                <input 
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-purple-50/50 border border-purple-200 rounded-xl pl-7 p-2.5 font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none text-sm"
                  placeholder={balanceDue.toString()}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setPaymentMethod('cash');
                    if (!settleAmount && balanceDue > 0) setSettleAmount(balanceDue.toString());
                  }}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg border transition-colors ${paymentMethod === 'cash' ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  Cash
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod('upi');
                    if (!settleAmount && balanceDue > 0) setSettleAmount(balanceDue.toString());
                  }}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg border transition-colors ${paymentMethod === 'upi' ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  UPI
                </button>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleUpdateFinancials}
            disabled={isLoading || (!extraExpense && !settleAmount && overtimeDays === 0)}
            className="w-full bg-purple-600 text-white font-black py-3.5 rounded-xl hover:bg-purple-700 transition-colors flex justify-center items-center gap-2 disabled:bg-gray-300 shadow-md shadow-purple-600/20 shadow-2xs"
          >
            {isLoading ? "Updating..." : (
              <>
                <Plus size={18} /> Update Financials
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    
    {showInvoice && (
      <InvoiceSheet booking={booking} onClose={() => setShowInvoice(false)} />
    )}
    </>
  );
};
