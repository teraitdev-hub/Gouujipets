import React from 'react';
import { formatRupee } from '../../utils/currency';
import { Printer, ShieldCheck, MapPin, Phone, Mail } from 'lucide-react';

interface InvoiceSheetProps {
  booking: any;
  onClose: () => void;
}

export const InvoiceSheet: React.FC<InvoiceSheetProps> = ({ booking, onClose }) => {
  const totalCost = (Number(booking.total_amount) || 0) + (Number(booking.extra_expenses) || 0);
  const totalPaid = Number(booking.total_paid) || 0;
  const balanceDue = Math.max(0, totalCost - totalPaid);
  const isPaid = balanceDue === 0;

  const handlePrint = () => {
    window.print();
  };

  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:block">
      <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl relative my-auto print:shadow-none print:rounded-none print:max-w-full">
        
        {/* Screen-only header actions */}
        <div className="absolute top-6 right-6 flex gap-3 print:hidden">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
          >
            <Printer size={16} /> Print
          </button>
          <button 
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-8 sm:p-12 print:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-100 pb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900">{booking.business_id?.name || 'Gouuji Partner'}</h1>
                <p className="text-purple-600 font-bold tracking-wide uppercase text-sm mt-1">Official Invoice</p>
              </div>
            </div>
            <div className="text-left sm:text-right text-sm text-gray-500 space-y-1">
              <p className="font-bold text-gray-900">Invoice #{booking.id.substring(0, 8).toUpperCase()}</p>
              <p>Date: {new Date().toLocaleDateString()}</p>
              <p className={`font-bold mt-2 ${isPaid ? 'text-purple-600' : 'text-purple-600'}`}>
                Status: {isPaid ? 'PAID IN FULL' : 'PAYMENT PENDING'}
              </p>
            </div>
          </div>

          {/* Business & Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-gray-100">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Billed By</h3>
              <p className="font-bold text-gray-900 text-lg">{booking.business_id?.name}</p>
              {booking.business_id?.address && (
                <p className="text-gray-500 text-sm mt-1 flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0" /> {booking.business_id.address}
                </p>
              )}
              {booking.business_id?.contact_phone && (
                <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                  <Phone size={14} /> {booking.business_id.contact_phone}
                </p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Billed To</h3>
              <p className="font-bold text-gray-900 text-lg">{booking.customer_id?.full_name || 'Customer'}</p>
              <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                <Mail size={14} /> {booking.customer_id?.email || 'N/A'}
              </p>
              {booking.customer_id?.phone && (
                <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                  <Phone size={14} /> {booking.customer_id.phone}
                </p>
              )}
            </div>
          </div>

          {/* Pet Details */}
          <div className="py-8 border-b border-gray-100 bg-gray-50/50 rounded-2xl p-6 mt-8">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Service Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Service Type</p>
                <p className="font-bold text-gray-900 capitalize">{booking.business_id?.type || 'Boarding'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pets</p>
                <p className="font-bold text-gray-900">{booking.pet_names || `${booking.pet_count} Pet(s)`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Check-In</p>
                <p className="font-bold text-gray-900">{new Date(booking.check_in).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Check-Out</p>
                <p className="font-bold text-gray-900">{new Date(booking.check_out).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="py-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 font-bold text-gray-900 uppercase text-xs tracking-wider">Description</th>
                  <th className="py-3 font-bold text-gray-900 uppercase text-xs tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-50">
                  <td className="py-4 text-gray-700 font-medium">Base Booking Fee</td>
                  <td className="py-4 font-bold text-gray-900 text-right">{formatRupee(Number(booking.total_amount))}</td>
                </tr>
                {Number(booking.extra_expenses) > 0 && (
                  <tr className="border-b border-gray-50">
                    <td className="py-4 text-gray-700 font-medium">Additional Charges / Overtime</td>
                    <td className="py-4 font-bold text-gray-900 text-right">{formatRupee(Number(booking.extra_expenses))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-4 border-t-2 border-gray-100 mt-2">
            <div className="w-full sm:w-1/2 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-bold">Subtotal (Excl. GST)</span>
                <span className="font-medium text-gray-900">{formatRupee(Math.round(totalCost / 1.18))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-bold">IGST/CGST+SGST (18%)</span>
                <span className="font-medium text-gray-900">{formatRupee(totalCost - Math.round(totalCost / 1.18))}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-800 font-bold">Total Cost (Incl. GST)</span>
                <span className="font-bold text-gray-900">{formatRupee(totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm text-purple-600">
                <span className="font-bold">Amount Paid</span>
                <span className="font-bold">- {formatRupee(totalPaid)}</span>
              </div>
              <div className="flex justify-between text-lg border-t-2 border-gray-900 pt-3 mt-3">
                <span className="font-black text-gray-900">Balance Due</span>
                <span className={`font-black ${balanceDue > 0 ? 'text-purple-600' : 'text-purple-600'}`}>
                  {formatRupee(balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
            <p>Thank you for choosing {booking.business_id?.name || 'our facility'}!</p>
            <p className="mt-1">Powered by Gouuji Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
};

