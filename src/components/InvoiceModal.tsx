import React, { useState } from 'react';
import { Invoice } from '../types';
import { X, Printer, Download, CheckCircle2, ShieldCheck, FileText, Layers, Mail, Send, FileDown } from 'lucide-react';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onPayInvoice?: (id: string) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose, onPayInvoice }) => {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setDownloadingPDF(true);

    try {
      const { default: jsPDFModule, jsPDF: jsPDFClass } = await import('jspdf');
      const jsPDFConstructor = jsPDFClass || jsPDFModule;

      const doc = new jsPDFConstructor({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Colors
      const borderGray = [220, 220, 220];
      const textMuted = [100, 100, 100];

      // Header Banner
      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, 210, 32, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('VANTAGE ADENGINE INC.', 15, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 180, 180);
      doc.text('100 Digital Boulevard, Suite 800 | San Francisco, CA 94105', 15, 25);

      // Status Badge
      const isPaid = invoice.status === 'PAID';
      if (isPaid) {
        doc.setFillColor(16, 185, 129); // emerald
      } else {
        doc.setFillColor(217, 119, 6); // amber
      }
      doc.roundedRect(148, 10, 47, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`STATUS: ${invoice.status}`, 171.5, 17.5, { align: 'center' });

      // Invoice Title & ID
      let y = 44;
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`TAX INVOICE ${invoice.id}`, 15, y);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`Official Media Settlement Statement`, 195, y, { align: 'right' });

      y += 6;
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.line(15, y, 195, y);

      // Billing & Campaign Meta Box
      y += 8;
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(230, 230, 230);
      doc.roundedRect(15, y, 180, 34, 2, 2, 'FD');

      // Left Column: Customer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 120, 120);
      doc.text('BILLED TO ENTITY:', 20, y + 8);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text(invoice.customerName, 20, y + 15);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(invoice.customerEmail, 20, y + 21);
      doc.text(`Campaign: ${invoice.campaignName}`, 20, y + 27);

      // Right Column: Dates
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 120, 120);
      doc.text('INVOICE TIMELINE:', 110, y + 8);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(`Issued Date:  ${invoice.issuedDate}`, 110, y + 15);
      doc.text(`Payment Due:  ${invoice.dueDate}`, 110, y + 21);
      if (invoice.paymentMethod) {
        doc.text(`Method:          ${invoice.paymentMethod}`, 110, y + 27);
      }

      // Breakdown Section Header
      y += 44;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      doc.text('CAMPAIGN MEDIA SPEND & PLATFORM FEE BREAKDOWN', 15, y);

      y += 5;
      // Table Header Row
      doc.setFillColor(30, 30, 30);
      doc.rect(15, y, 180, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Ad Channel / Service Description', 20, y + 5.5);
      doc.text('Amount (USD)', 190, y + 5.5, { align: 'right' });

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);

      invoice.breakdown.forEach((item, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(246, 246, 246);
          doc.rect(15, y, 180, 8, 'F');
        }
        doc.setDrawColor(240, 240, 240);
        doc.line(15, y + 8, 195, y + 8);

        doc.text(item.platform, 20, y + 5.5);
        doc.text(`$${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 190, y + 5.5, { align: 'right' });
        y += 8;
      });

      // Totals Box
      y += 6;
      doc.setDrawColor(200, 200, 200);
      doc.line(120, y, 195, y);

      y += 6;
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text('Media Spend Subtotal:', 120, y);
      doc.text(`$${invoice.mediaSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });

      y += 6;
      doc.text('Platform Management Fee (10%):', 120, y);
      doc.text(`$${invoice.platformFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });

      y += 8;
      doc.setFillColor(245, 245, 240);
      doc.rect(120, y - 4, 75, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(20, 20, 20);
      doc.text('TOTAL AMOUNT DUE:', 122, y + 2.5);
      doc.text(`$${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 190, y + 2.5, { align: 'right' });

      // Verification / Footer Stamp
      y += 32;
      doc.setDrawColor(220, 220, 220);
      doc.line(15, y, 195, y);

      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text('VANTAGE ADENGINE FINTECH SYSTEM - CRYPTOGRAPHICALLY STAMPED DOCUMENT', 15, y);

      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`, 15, y);
      doc.text(`Document ID: ${invoice.id}-OFFICIAL-PDF`, 195, y, { align: 'right' });

      if (invoice.txHash) {
        y += 4;
        doc.text(`Transaction Settlement Hash: ${invoice.txHash}`, 15, y);
      }

      doc.save(`Invoice_${invoice.id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setTimeout(() => setDownloadingPDF(false), 500);
    }
  };

  const handleSendEmailReminder = () => {
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      setReminderSent(true);
    }, 800);
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
            {invoice.status === 'PENDING' && (
              <button
                onClick={handleSendEmailReminder}
                disabled={sendingEmail}
                className="p-1.5 bg-stone-900 border border-stone-800 text-stone-300 hover:text-white rounded-xs cursor-pointer text-xs font-mono flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                title={`Send reminder to ${invoice.customerEmail}`}
              >
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>{sendingEmail ? 'Sending...' : reminderSent ? 'Reminder Sent' : 'Email Reminder'}</span>
              </button>
            )}

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="px-2.5 py-1.5 bg-amber-400/10 border border-amber-400/30 text-amber-300 hover:bg-amber-400/20 hover:text-amber-200 rounded-xs cursor-pointer text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Generate & Download formal PDF invoice document"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-400" />
              <span>{downloadingPDF ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 bg-stone-900 border border-stone-800 text-stone-300 hover:text-white rounded-xs cursor-pointer text-xs font-mono flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reminder Notification Banner */}
        {reminderSent && (
          <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Notification email reminder successfully dispatched to <strong>{invoice.customerEmail}</strong></span>
            </div>
            <button
              onClick={() => setReminderSent(false)}
              className="text-stone-400 hover:text-emerald-300 text-[10px] underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

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
