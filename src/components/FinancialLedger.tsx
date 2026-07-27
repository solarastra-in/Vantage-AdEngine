import React, { useState } from 'react';
import { Invoice } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  Receipt, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  CreditCard, 
  ShieldCheck,
  Building,
  FileText,
  Download,
  FileSpreadsheet
} from 'lucide-react';

interface FinancialLedgerProps {
  invoices: Invoice[];
  onSelectInvoice: (invoice: Invoice) => void;
  onPayInvoice: (invoiceId: string) => void;
}

export const FinancialLedger: React.FC<FinancialLedgerProps> = ({
  invoices,
  onSelectInvoice,
  onPayInvoice,
}) => {
  const [filter, setFilter] = useState<'all' | 'PAID' | 'PENDING'>('all');

  const filteredInvoices = invoices.filter(inv => filter === 'all' || inv.status === filter);

  const totalInvoiced = invoices.reduce((acc, i) => acc + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((acc, i) => acc + i.amount, 0);
  const totalPending = invoices.filter(i => i.status === 'PENDING').reduce((acc, i) => acc + i.amount, 0);

  const paidCount = invoices.filter(i => i.status === 'PAID').length;
  const pendingCount = invoices.filter(i => i.status === 'PENDING').length;

  const chartData = [
    { name: 'PAID', value: totalPaid, count: paidCount },
    { name: 'PENDING', value: totalPending, count: pendingCount },
  ];
  const COLORS = ['#34d399', '#fbbf24']; // emerald-400 for PAID, amber-400 for PENDING

  const handleExportCSV = () => {
    const headers = ['Invoice ID', 'Campaign Name', 'Customer Entity', 'Customer Email', 'Status', 'Issued Date', 'Due Date', 'Media Spend ($)', 'Platform Fee ($)', 'Total Amount ($)'];
    const rows = filteredInvoices.map(inv => [
      `"${inv.id}"`,
      `"${inv.campaignName.replace(/"/g, '""')}"`,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      `"${inv.customerEmail.replace(/"/g, '""')}"`,
      `"${inv.status}"`,
      `"${inv.issuedDate}"`,
      `"${inv.dueDate}"`,
      inv.mediaSpend,
      inv.platformFee,
      inv.amount
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tenant-invoices-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const channelPayouts = [
    { platform: 'Meta Suite (FB/IG)', totalDisbursed: '$85,400.00', status: 'Settled' },
    { platform: 'Google Ads & YouTube', totalDisbursed: '$110,200.00', status: 'Settled' },
    { platform: 'LinkedIn Marketing API', totalDisbursed: '$55,000.00', status: 'Settled' },
    { platform: 'TikTok Business Open API', totalDisbursed: '$50,000.00', status: 'Settled' },
    { platform: 'X / Twitter Ads API', totalDisbursed: '$20,000.00', status: 'Settled' },
    { platform: 'Programmatic DSP OpenRTB', totalDisbursed: '$25,000.00', status: 'Settled' },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#0a0a0a] text-stone-200">
      
      {/* Header */}
      <div className="pb-6 border-b border-stone-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-serif italic text-white tracking-tight">
            Financial Ledger & Media Settlement
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm font-mono mt-1">
            Customer invoicing, media budget disbursements, and channel settlement records.
          </p>
        </div>

        {/* Recharts Settlement Ratio Chart */}
        <div className="flex items-center gap-4 bg-[#0d0d0d] border border-stone-800 p-3 rounded-sm shadow-lg self-stretch sm:self-auto">
          <div className="w-20 h-20 shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={18}
                  outerRadius={32}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c1917', borderColor: '#27272a', borderRadius: '2px', fontSize: '11px', color: '#f5f5f4' }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs font-mono space-y-1 pr-2">
            <div className="text-[10px] uppercase text-stone-500 font-bold tracking-wider">Settlement Ratio</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-stone-300">Paid: <strong className="text-emerald-400">${totalPaid.toLocaleString()}</strong> ({paidCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-stone-300">Pending: <strong className="text-amber-400">${totalPending.toLocaleString()}</strong> ({pendingCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#0d0d0d] border border-stone-800 p-5 rounded-sm shadow-xl space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block">Total Billing Raised</span>
          <div className="text-2xl font-serif text-white">${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <span className="text-[11px] text-stone-400 font-mono">Platform gross media + fees</span>
        </div>

        <div className="bg-[#0d0d0d] border border-stone-800 p-5 rounded-sm shadow-xl space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block">Collected & Paid</span>
          <div className="text-2xl font-serif text-emerald-400">${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <span className="text-[11px] text-emerald-500 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Channel Cleared</span>
          </span>
        </div>

        <div className="bg-[#0d0d0d] border border-stone-800 p-5 rounded-sm shadow-xl space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block">Pending Settlement</span>
          <div className="text-2xl font-serif text-amber-400">${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <span className="text-[11px] text-amber-400/80 font-mono">Net 15 terms active</span>
        </div>
      </div>

      {/* Invoices List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-stone-400">
            Customer Invoices Ledger
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1 bg-stone-900 border border-stone-800 text-stone-300 hover:text-white rounded-xs cursor-pointer text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
              title="Export invoices table as CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export CSV</span>
            </button>

            <div className="h-4 w-px bg-stone-800 hidden sm:block"></div>

            {(['all', 'PAID', 'PENDING'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors ${
                  filter === st
                    ? 'bg-amber-400 text-black'
                    : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-stone-800 rounded-sm bg-[#0d0d0d] overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-stone-900/80 border-b border-stone-800 text-stone-400 text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Customer Entity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Total Amount ($)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-stone-900/40 transition-colors">
                  <td className="py-3.5 px-4 text-white font-bold">{inv.id}</td>
                  <td className="py-3.5 px-4 text-stone-300 font-sans font-medium">{inv.campaignName}</td>
                  <td className="py-3.5 px-4 text-stone-400">{inv.customerName}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold tracking-wider ${
                      inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-stone-400">{inv.dueDate}</td>
                  <td className="py-3.5 px-4 text-right text-stone-200 font-bold">
                    ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => onSelectInvoice(inv)}
                      className="px-2.5 py-1 bg-stone-900 border border-stone-800 text-stone-300 hover:text-white rounded-xs cursor-pointer text-[11px]"
                    >
                      Receipt
                    </button>
                    {inv.status === 'PENDING' && (
                      <button
                        onClick={() => onPayInvoice(inv.id)}
                        className="px-2.5 py-1 bg-amber-400 text-black font-bold rounded-xs cursor-pointer text-[11px] hover:bg-amber-300"
                      >
                        Settle
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Channel Settlement Disbursements */}
      <div className="space-y-4 pt-4 border-t border-stone-800">
        <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-stone-400">
          Ad Channel Direct Settlement Disbursements
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channelPayouts.map((payout, i) => (
            <div key={i} className="bg-[#0d0d0d] border border-stone-800 p-4 rounded-sm flex items-center justify-between text-xs font-mono">
              <div>
                <div className="text-white font-bold">{payout.platform}</div>
                <div className="text-amber-400 text-sm mt-0.5">{payout.totalDisbursed}</div>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-1 border border-emerald-500/20 rounded-xs">
                <CheckCircle2 className="w-3 h-3" />
                <span>{payout.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
