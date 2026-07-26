import React from 'react';
import { Invoice } from '../types';
import { X, Printer, Download, CheckCircle2, ShieldCheck, FileText, Layers } from 'lucide-react';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onPayInvoice?: (id: string) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose, onPayInvoice }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0e0e0e] border border-stone-800 rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-8 text-stone-200">
        
        {/* Modal Controls Bar */}
        <div className="px-6 py-4 border-b border-stone-800 bg-[#0a0a0a] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Tax Invoice & Media Settlement Document</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 bg-stone-900 border border-stone-800 text-stone-300 hover:text-white rounded-xs cursor-pointer text-xs font-mono flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div id="printable-invoice" className="p-8 space-y-8 bg-[#0d0d0d] font-sans">
          
          {/* Top Brand & Status */}
          <div className="flex justify-between items-start border-b border-stone-800 pb-6">
            <div>
              <div className="text-xl font-serif italic text-white tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>Vantage AdEngine Inc.</span>
              </div>
              <div className="text-[11px] text-stone-500 font-mono mt-1">
                100 Digital Boulevard, Suite 800 &bull; San Francisco, CA 94105
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-2xl font-mono font-bold text-white">{invoice.id}</div>
              <div className={`text-xs font-bold uppercase font-mono tracking-widest ${
                invoice.status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {invoice.status}
              </div>
            </div>
          </div>

          {/* Customer & Dates Meta */}
          <div className="grid grid-cols-2 gap-6 text-xs font-mono bg-stone-950 p-4 border border-stone-800 rounded-xs">
            <div>
              <span className="text-stone-500 uppercase block text-[9px]">Billed To:</span>
              <div className="text-white font-bold text-sm mt-0.5">{invoice.customerName}</div>
              <div className="text-stone-400">{invoice.customerEmail}</div>
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className="text-stone-500">Issued Date:</span> <strong className="text-stone-200">{invoice.issuedDate}</strong>
              </div>
              <div>
                <span className="text-stone-500">Due Date:</span> <strong className="text-stone-200">{invoice.dueDate}</strong>
              </div>
              {invoice.txHash && (
                <div className="text-[10px] text-stone-500 truncate">
                  TxHash: {invoice.txHash}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-stone-400 font-bold">
              Campaign Media Spend & Platform Fee Breakdown
            </h4>

            <div className="border border-stone-800 rounded-xs overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Description / Ad Channel</th>
                    <th className="py-2.5 px-4 text-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {invoice.breakdown.map((item, i) => (
                    <tr key={i} className="hover:bg-stone-900/40">
                      <td className="py-3 px-4 text-stone-200 font-medium">{item.platform}</td>
                      <td className="py-3 px-4 text-right text-stone-300 font-bold">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Summary */}
          <div className="flex justify-end pt-4 border-t border-stone-800">
            <div className="w-64 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-stone-400">
                <span>Media Spend Subtotal:</span>
                <span>${invoice.mediaSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Platform Fee (10%):</span>
                <span>${invoice.platformFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-amber-400 font-bold text-base pt-2 border-t border-stone-800">
                <span>Total Due:</span>
                <span>${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Action Footer */}
        {invoice.status === 'PENDING' && onPayInvoice && (
          <div className="px-6 py-4 border-t border-stone-800 bg-[#0a0a0a] flex items-center justify-between">
            <span className="text-xs text-stone-400 font-mono">
              Payment due by {invoice.dueDate}
            </span>

            <button
              onClick={() => {
                onPayInvoice(invoice.id);
                onClose();
              }}
              className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2 text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors"
            >
              Settle Invoice Now (${invoice.amount.toLocaleString()})
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
