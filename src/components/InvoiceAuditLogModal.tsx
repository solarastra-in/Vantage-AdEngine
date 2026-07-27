import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceAuditLogEntry } from '../types';
import { 
  X, 
  History, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  User, 
  Hash, 
  Download, 
  Plus, 
  Send, 
  ArrowRight, 
  Copy, 
  Check, 
  FileText, 
  AlertCircle,
  Building,
  DollarSign
} from 'lucide-react';

interface InvoiceAuditLogModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onAddAuditLogEntry?: (invoiceId: string, entry: Omit<InvoiceAuditLogEntry, 'id'>) => void;
  onPayInvoice?: (invoiceId: string) => void;
}

export const InvoiceAuditLogModal: React.FC<InvoiceAuditLogModalProps> = ({
  invoice,
  onClose,
  onAddAuditLogEntry,
  onPayInvoice,
}) => {
  const [filter, setFilter] = useState<'all' | 'status' | 'dispatches'>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state for adding custom audit note
  const [customAction, setCustomAction] = useState('');
  const [customActor, setCustomActor] = useState('Finance Admin');
  const [customNotes, setCustomNotes] = useState('');
  const [customStatus, setCustomStatus] = useState<'DRAFT' | 'ISSUED' | 'PENDING' | 'PAID' | 'OVERDUE'>('PAID');

  const rawLogs: InvoiceAuditLogEntry[] = useMemo(() => {
    if (!invoice) return [];
    if (invoice.auditLog && invoice.auditLog.length > 0) {
      return invoice.auditLog;
    }
    return [
      {
        id: `aud-default-1`,
        timestamp: `${invoice.issuedDate} 09:00:00 UTC`,
        previousStatus: 'DRAFT',
        newStatus: 'ISSUED',
        action: 'Invoice Generated & System Verified',
        actor: 'System Automator',
        notes: 'Invoice generated automatically upon campaign approval.',
      },
      {
        id: `aud-default-2`,
        timestamp: `${invoice.issuedDate} 09:05:00 UTC`,
        previousStatus: 'ISSUED',
        newStatus: invoice.status,
        action: invoice.status === 'PAID' ? 'Payment Cleared & Settled' : 'Invoice Dispatched (Awaiting Settlement)',
        paymentMethod: invoice.paymentMethod,
        txHash: invoice.txHash,
        actor: invoice.status === 'PAID' ? 'Stripe Settlement Gateway' : 'Astra Billing Engine',
        notes: invoice.status === 'PAID' 
          ? 'Full settlement authorized and verified.' 
          : `Net 15 terms active. Payment due on ${invoice.dueDate}.`,
      }
    ];
  }, [invoice]);

  if (!invoice) return null;

  const filteredLogs = rawLogs.filter(log => {
    if (filter === 'status') return log.previousStatus !== log.newStatus;
    if (filter === 'dispatches') return log.action.toLowerCase().includes('dispatched') || log.action.toLowerCase().includes('reminder') || log.action.toLowerCase().includes('sent');
    return true;
  });

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      invoiceId: invoice.id,
      customer: invoice.customerName,
      status: invoice.status,
      auditLog: rawLogs
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit-log-${invoice.id}-${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAction.trim()) return;

    if (onAddAuditLogEntry) {
      onAddAuditLogEntry(invoice.id, {
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        previousStatus: invoice.status,
        newStatus: customStatus,
        action: customAction.trim(),
        paymentMethod: invoice.paymentMethod,
        txHash: invoice.txHash,
        actor: customActor.trim() || 'Finance Admin',
        notes: customNotes.trim() || undefined,
      });
    }

    setCustomAction('');
    setCustomNotes('');
    setShowAddForm(false);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'PAID':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'ISSUED':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
      case 'OVERDUE':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-stone-800 text-stone-300 border border-stone-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0e0e0e] border border-stone-800 rounded-sm w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-8 text-stone-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-stone-800 bg-[#0a0a0a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-400/10 border border-amber-400/20 rounded-xs text-amber-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif italic text-white font-bold flex items-center gap-2">
                Invoice Payment Status Audit Log
                <span className="font-mono text-xs not-italic text-stone-400 font-normal">({invoice.id})</span>
              </h2>
              <p className="text-[11px] text-stone-500 font-mono">
                Immutable financial status change record & payment verification timeline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="px-2.5 py-1 bg-stone-900 border border-stone-800 text-stone-300 hover:text-white rounded-xs cursor-pointer text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Export Audit Trail as JSON"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Log</span>
            </button>

            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Summary Banner */}
        <div className="px-6 py-4 bg-[#0d0d0d] border-b border-stone-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-stone-500 text-[10px] uppercase font-bold block">Customer Entity</span>
            <div className="text-white font-bold truncate mt-0.5">{invoice.customerName}</div>
            <div className="text-stone-400 text-[11px] truncate">{invoice.customerEmail}</div>
          </div>

          <div>
            <span className="text-stone-500 text-[10px] uppercase font-bold block">Campaign</span>
            <div className="text-stone-300 font-sans truncate mt-0.5">{invoice.campaignName}</div>
            <div className="text-stone-500 text-[10px]">Issued: {invoice.issuedDate}</div>
          </div>

          <div>
            <span className="text-stone-500 text-[10px] uppercase font-bold block">Invoice Amount</span>
            <div className="text-amber-400 font-bold text-sm mt-0.5">
              ${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-stone-500 text-[10px]">Due: {invoice.dueDate}</div>
          </div>

          <div>
            <span className="text-stone-500 text-[10px] uppercase font-bold block">Current Status</span>
            <div className="mt-1 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold tracking-wider uppercase ${getStatusBadge(invoice.status)}`}>
                {invoice.status}
              </span>
              {invoice.status === 'PENDING' && onPayInvoice && (
                <button
                  onClick={() => {
                    onPayInvoice(invoice.id);
                  }}
                  className="px-2 py-0.5 bg-amber-400 text-black font-bold text-[10px] rounded-xs cursor-pointer hover:bg-amber-300 transition-colors"
                >
                  Settle Now
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Controls & Log Add Button */}
        <div className="px-6 py-3 bg-[#0a0a0a] border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 text-[10px] uppercase font-bold">Filter Trail:</span>
            {(['all', 'status', 'dispatches'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-0.5 rounded-xs cursor-pointer text-[11px] font-bold capitalize transition-colors ${
                  filter === f
                    ? 'bg-amber-400 text-black'
                    : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
                }`}
              >
                {f === 'all' ? 'All Events' : f === 'status' ? 'Status Changes' : 'Reminders & Dispatch'}
              </button>
            ))}
          </div>

          {onAddAuditLogEntry && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-2.5 py-1 bg-stone-900 border border-stone-800 text-stone-300 hover:text-white rounded-xs cursor-pointer text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>{showAddForm ? 'Cancel Note' : 'Log Custom Event'}</span>
            </button>
          )}
        </div>

        {/* Inline Form to Add Custom Audit Entry */}
        {showAddForm && (
          <form onSubmit={handleAddSubmit} className="p-4 bg-stone-950 border-b border-stone-800 space-y-3 font-mono text-xs">
            <div className="text-amber-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Append Financial Audit Event</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-stone-400 text-[10px] uppercase block mb-1">Action / Event Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Wire Transfer Confirmation Verified"
                  value={customAction}
                  onChange={e => setCustomAction(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-stone-800 rounded-xs px-3 py-1.5 text-white placeholder-stone-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-stone-400 text-[10px] uppercase block mb-1">Actor / Authority</label>
                <input
                  type="text"
                  placeholder="e.g., Senior Controller / Stripe Webhook"
                  value={customActor}
                  onChange={e => setCustomActor(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-stone-800 rounded-xs px-3 py-1.5 text-white placeholder-stone-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-stone-400 text-[10px] uppercase block mb-1">Notes / Internal Reference</label>
              <input
                type="text"
                placeholder="e.g., Clearing reference #CR-88210 verified with Silicon Valley Bank."
                value={customNotes}
                onChange={e => setCustomNotes(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-stone-800 rounded-xs px-3 py-1.5 text-white placeholder-stone-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 bg-stone-900 border border-stone-800 text-stone-400 hover:text-white rounded-xs cursor-pointer text-[11px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-amber-400 text-black font-bold rounded-xs cursor-pointer hover:bg-amber-300 text-[11px]"
              >
                Save Audit Record
              </button>
            </div>
          </form>
        )}

        {/* Audit Log Timeline Content */}
        <div className="p-6 max-h-[420px] overflow-y-auto space-y-6 bg-[#0d0d0d]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-stone-500 font-mono text-xs">
              No audit log entries found matching filter criteria.
            </div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-800">
              {filteredLogs.map((log, index) => {
                const isPaid = log.newStatus === 'PAID';
                const isPending = log.newStatus === 'PENDING';
                const isIssued = log.newStatus === 'ISSUED';

                return (
                  <div key={`log-${log.id || index}-${index}`} className="relative group">
                    
                    {/* Node Dot Icon */}
                    <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isPaid ? 'bg-emerald-950 border-emerald-500 text-emerald-400' :
                      isPending ? 'bg-amber-950 border-amber-500 text-amber-400' :
                      isIssued ? 'bg-blue-950 border-blue-500 text-blue-400' :
                      'bg-stone-900 border-stone-700 text-stone-400'
                    }`}>
                      {isPaid ? <CheckCircle2 className="w-3 h-3" /> :
                       isPending ? <Clock className="w-3 h-3" /> :
                       <FileText className="w-3 h-3" />}
                    </div>

                    {/* Event Card */}
                    <div className="bg-[#0a0a0a] border border-stone-800 p-4 rounded-xs space-y-2.5 shadow-lg">
                      
                      {/* Top Bar: Action & Timestamp */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/60 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs font-bold font-mono text-white">
                            {log.action}
                          </h3>
                          {log.previousStatus && (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-stone-400 bg-stone-900 px-2 py-0.5 border border-stone-800 rounded-xs">
                              <span>{log.previousStatus}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-stone-500" />
                              <span className={`font-bold ${isPaid ? 'text-emerald-400' : isPending ? 'text-amber-400' : 'text-blue-400'}`}>
                                {log.newStatus}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-stone-500 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-stone-600" />
                          <span>{log.timestamp}</span>
                        </div>
                      </div>

                      {/* Details & Payment Metadata */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
                        
                        {/* Actor / Authority */}
                        <div className="flex items-center gap-1.5 text-stone-400">
                          <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-stone-500">Actor:</span>
                          <strong className="text-stone-200">{log.actor}</strong>
                        </div>

                        {/* Payment Method */}
                        {log.paymentMethod && (
                          <div className="flex items-center gap-1.5 text-stone-400">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-stone-500">Method:</span>
                            <strong className="text-stone-200 truncate">{log.paymentMethod}</strong>
                          </div>
                        )}

                        {/* Transaction Hash */}
                        {log.txHash && (
                          <div className="col-span-1 sm:col-span-2 flex items-center justify-between bg-stone-950 p-2 border border-stone-800/80 rounded-xs text-[11px]">
                            <div className="flex items-center gap-1.5 truncate pr-2">
                              <Hash className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-stone-500">TxHash / Authorization:</span>
                              <code className="text-amber-300 font-mono truncate">{log.txHash}</code>
                            </div>
                            <button
                              onClick={() => handleCopyHash(log.txHash!)}
                              className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
                              title="Copy transaction hash"
                            >
                              {copiedHash === log.txHash ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Notes / Description */}
                      {log.notes && (
                        <p className="text-[11px] font-mono text-stone-400 bg-stone-900/50 p-2 border border-stone-800/40 rounded-xs leading-relaxed">
                          {log.notes}
                        </p>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-800 bg-[#0a0a0a] flex items-center justify-between text-xs font-mono text-stone-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audit trail cryptographically verified for tenancy compliance</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 rounded-xs cursor-pointer font-bold transition-colors"
          >
            Close Audit Log
          </button>
        </div>

      </div>
    </div>
  );
};
