import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Mail, 
  Phone, 
  Check, 
  Copy, 
  ExternalLink, 
  Building2, 
  Clock, 
  Globe2, 
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Organization } from '../lib/firestoreService';

interface PendingApprovalViewProps {
  organization: Organization;
  currentUserEmail?: string;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  organization,
  currentUserEmail,
}) => {
  const [copied, setCopied] = useState(false);

  // Helper to determine customer locale and primary contact number
  const getLocaleContactInfo = () => {
    let isIndia = false;
    try {
      const userLang = (navigator.language || '').toLowerCase();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      isIndia = 
        userLang.includes('in') || 
        userLang.startsWith('hi') || 
        timeZone.includes('Kolkata') || 
        timeZone.includes('Calcutta') ||
        timeZone.includes('Asia/Colombo') ||
        timeZone.includes('Asia/Dhaka');
    } catch (e) {
      isIndia = false;
    }

    return {
      isIndia,
      primaryPhoneDisplay: isIndia ? '+91 9063692200' : '+12149070403',
      primaryPhoneTel: isIndia ? '+919063692200' : '+12149070403',
      primaryLabel: isIndia ? 'India / Regional Support' : 'US / Global Support',
      secondaryPhoneDisplay: isIndia ? '+12149070403' : '+91 9063692200',
      secondaryPhoneTel: isIndia ? '+12149070403' : '+919063692200',
      secondaryLabel: isIndia ? 'US / Global Support' : 'India / Regional Support',
    };
  };

  const localeInfo = getLocaleContactInfo();

  const handleCopyContact = () => {
    const textToCopy = `Vantage AdEngine Workspace Approval Contact:\nEmail: info@whyor.in\nIndia Phone: +91 9063692200\nUS/Global Phone: +12149070403\nOrganization: ${organization.name} (${organization.id})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const mailtoUrl = `mailto:info@whyor.in?subject=${encodeURIComponent(`Workspace Approval Request for ${organization.name}`)}&body=${encodeURIComponent(
    `Hello Vantage AdEngine Admin Team,\n\nWe have created a new customer workspace and would like to request account approval.\n\nOrganization Name: ${organization.name}\nOrganization ID: ${organization.id}\nAdmin Email: ${currentUserEmail || organization.adminEmail}\nDomain: ${organization.domain || 'N/A'}\n\nPlease approve our workspace so we can begin setting up our campaigns.\n\nThank you!`
  )}`;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 bg-[#0a0a0a] text-stone-200">
      {/* Primary Pending Approval Status Card */}
      <div className="bg-stone-900 border-2 border-amber-400/40 rounded-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Badge & Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-mono uppercase tracking-wider mb-1 font-bold">
                  <ShieldAlert className="w-3 h-3" />
                  <span>Account Pending Admin Approval</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Workspace Approval Required for <span className="text-amber-400">{organization.name}</span>
                </h2>
              </div>
            </div>

            <div className="text-right sm:text-right font-mono text-xs text-stone-400">
              <span className="block text-stone-500 text-[10px] uppercase">Org Identifier</span>
              <span className="text-stone-300 font-bold">{organization.id}</span>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="bg-stone-950 p-4 sm:p-5 rounded border border-stone-800 text-xs sm:text-sm text-stone-300 leading-relaxed space-y-2 font-sans">
            <p className="font-semibold text-white">
              Welcome to Vantage AdEngine! Your workspace has been successfully registered.
            </p>
            <p>
              To ensure platform security and prevent unauthorized media spend, brand-new customer workspaces require manual verification and approval by our Platform Administrator before live campaign creation, financial ledger transactions, and API dispatch gateways can be enabled.
            </p>
          </div>

          {/* Contact Admin Callout Box */}
          <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border border-amber-400/30 rounded-lg p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>How to Get Approved by Admin</span>
              </h3>
              <span className="text-[10px] font-mono text-stone-400 bg-stone-900 px-2 py-1 rounded border border-stone-800">
                Locale Detected: {localeInfo.isIndia ? 'India / Regional' : 'US / International'}
              </span>
            </div>

            <p className="text-xs text-stone-300">
              Please reach out directly to the Platform Administrator using the email or phone number below with your Organization ID <code className="bg-stone-950 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[11px]">{organization.id}</code> to expedite workspace activation:
            </p>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Card */}
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-stone-500 font-semibold">Official Admin Email</span>
                    <a 
                      href={mailtoUrl}
                      className="text-sm font-bold text-white hover:text-amber-400 transition-colors underline font-mono"
                    >
                      info@whyor.in
                    </a>
                  </div>
                </div>

                <a
                  href={mailtoUrl}
                  className="w-full bg-amber-400 text-black py-2 px-3 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email to Admin</span>
                </a>
              </div>

              {/* Phone Card (Locale Aware) */}
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-emerald-400/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/20">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-stone-500 font-semibold">
                      Admin Call Support ({localeInfo.primaryLabel})
                    </span>
                    <a 
                      href={`tel:${localeInfo.primaryPhoneTel}`}
                      className="text-sm font-bold text-emerald-400 hover:underline font-mono"
                    >
                      {localeInfo.primaryPhoneDisplay}
                    </a>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${localeInfo.primaryPhoneTel}`}
                    className="flex-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 py-2 px-2 rounded text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call Primary</span>
                  </a>

                  <a
                    href={`tel:${localeInfo.secondaryPhoneTel}`}
                    title={`${localeInfo.secondaryLabel}: ${localeInfo.secondaryPhoneDisplay}`}
                    className="bg-stone-900 border border-stone-800 text-stone-300 py-2 px-3 rounded text-[11px] font-mono flex items-center justify-center gap-1 hover:text-white"
                  >
                    <span>Alt: {localeInfo.secondaryPhoneDisplay}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-stone-800">
              <div className="flex items-center gap-2 text-stone-400 text-[11px]">
                <Globe2 className="w-3.5 h-3.5 text-amber-400" />
                <span>India Admin Support: <strong className="text-stone-200">+91 9063692200</strong> &bull; US/Global Support: <strong className="text-stone-200">+12149070403</strong></span>
              </div>

              <button
                onClick={handleCopyContact}
                className="px-3 py-1.5 bg-stone-900 border border-stone-800 text-stone-300 hover:text-white hover:border-amber-400/40 rounded text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copied ? 'Copied Contact Info!' : 'Copy All Contact Info'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Empty Workspace Preview */}
      <div className="border border-stone-800/80 rounded-lg p-6 bg-stone-900/40 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2 text-stone-400 text-xs font-mono">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="text-white font-bold">{organization.name} Empty Workspace</span>
            <span className="text-stone-500 font-normal">&bull; Isolated Customer Tenant</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 font-bold">
            0 Campaigns &bull; $0 Spend
          </span>
        </div>

        <div className="p-8 text-center space-y-3 bg-stone-950/60 rounded border border-stone-800/60">
          <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 text-stone-500 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6 text-stone-600" />
          </div>
          <h4 className="text-sm font-bold text-stone-300 uppercase tracking-wider font-mono">
            Workspace Initialized & Locked
          </h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            This customer workspace is completely isolated from other tenants. As soon as the Admin approves your account, campaign controls and API publishing gateways will be unlocked instantly.
          </p>
        </div>
      </div>
    </div>
  );
};
