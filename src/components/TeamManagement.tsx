import React, { useEffect, useState } from 'react';
import { UserPlus, Trash2, Mail, ShieldCheck, Clock, X } from 'lucide-react';
import { InvitedEmployee, EmployeePermissions, ADMIN_DEFAULT_PERMISSIONS, MEMBER_DEFAULT_PERMISSIONS, inviteEmployeeToOrg, listInvitedEmployees, removeInvitedEmployee } from '../lib/firestoreService';

interface TeamManagementProps {
  orgId: string;
  currentUserEmail?: string;
  currentUserRole: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_USER';
  currentUserPermissions: EmployeePermissions | null;
}

/**
 * The UI for the actual authentication gate: inviteEmployeeToOrg /
 * listInvitedEmployees / removeInvitedEmployee (firestoreService.ts) existed
 * as real functions with no UI calling them. This is that UI -- an org
 * admin adds a teammate's email here, and that person is authorized to
 * sign in with Google the moment they use that exact email (see
 * resolveAuthorizedOrgForUser in App.tsx's auth-resolution effect).
 *
 * Gated on the REAL signed-in user's canManageTeam permission (set by
 * their own admin at invite time) -- not a self-selectable role dropdown.
 * SUPER_ADMIN (platform operators) always pass this check.
 */
export const TeamManagement: React.FC<TeamManagementProps> = ({ orgId, currentUserEmail, currentUserRole, currentUserPermissions }) => {
  const [employees, setEmployees] = useState<InvitedEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'TENANT_ADMIN' | 'TENANT_USER'>('TENANT_USER');
  const [invitePermissions, setInvitePermissions] = useState<EmployeePermissions>(MEMBER_DEFAULT_PERMISSIONS);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAdmin = currentUserRole === 'SUPER_ADMIN' || currentUserPermissions?.canManageTeam === true;

  const handleRoleChange = (role: 'TENANT_ADMIN' | 'TENANT_USER') => {
    setInviteRole(role);
    // Reset the permission checkboxes to that role's sensible defaults --
    // still individually editable below, this just saves re-checking every box.
    setInvitePermissions(role === 'TENANT_ADMIN' ? ADMIN_DEFAULT_PERMISSIONS : MEMBER_DEFAULT_PERMISSIONS);
  };

  const PERMISSION_LABELS: { key: keyof EmployeePermissions; label: string }[] = [
    { key: 'canCreateCampaigns', label: 'Create campaigns' },
    { key: 'canPublishCampaigns', label: 'Publish campaigns live' },
    { key: 'canEditCredentials', label: 'Edit channel API credentials' },
    { key: 'canManageBilling', label: 'Manage billing & invoices' },
    { key: 'canManageTeam', label: 'Invite/remove team members' },
  ];

  const loadEmployees = async () => {
    setIsLoading(true);
    const list = await listInvitedEmployees(orgId);
    setEmployees(list.sort((a, b) => a.invitedAt.localeCompare(b.invitedAt)));
    setIsLoading(false);
  };

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (employees.some(emp => emp.email === email)) {
      setError('This email is already invited or active on your team.');
      return;
    }

    setIsInviting(true);
    try {
      await inviteEmployeeToOrg(orgId, email, inviteRole, currentUserEmail ?? 'unknown', invitePermissions);
      setSuccessMessage(`${email} can now sign in with Google using that exact address.`);
      setInviteEmail('');
      await loadEmployees();
    } catch (err) {
      console.error('Invite error:', err);
      setError('Something went wrong sending the invite. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (email === currentUserEmail) {
      setError("You can't remove your own access.");
      return;
    }
    if (!window.confirm(`Remove ${email} from this organization? They will no longer be able to sign in.`)) return;

    try {
      await removeInvitedEmployee(orgId, email);
      await loadEmployees();
    } catch (err) {
      console.error('Remove employee error:', err);
      setError('Something went wrong removing that employee.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 font-mono">
      <div>
        <h2 className="text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          Team & Employee Access
        </h2>
        <p className="text-xs text-stone-400 mt-1 font-sans">
          Only email addresses listed here can sign in to this organization with Google. Add a teammate's email and they'll gain access the moment they sign in with it.
        </p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded text-amber-300 text-[11px] font-sans">
          Only Tenant Admins can invite or remove employees. You can view the current team below.
        </div>
      )}

      {isAdmin && (
        <form onSubmit={handleInvite} className="bg-stone-900 border border-stone-800 rounded p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1.5">Employee Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@yourcompany.com"
                className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-amber-400/50"
              />
            </div>
            <div className="sm:w-40">
              <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-1.5">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => handleRoleChange(e.target.value as 'TENANT_ADMIN' | 'TENANT_USER')}
                className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
              >
                <option value="TENANT_USER">Member</option>
                <option value="TENANT_ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isInviting}
                className="bg-amber-400 text-black px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-2 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {isInviting ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-2">
              Privileges (RBAC) -- exactly what this person can do once they sign in
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PERMISSION_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-[11px] text-stone-300 font-sans bg-stone-950 border border-stone-800 rounded px-2.5 py-2 cursor-pointer hover:border-stone-700">
                  <input
                    type="checkbox"
                    checked={invitePermissions[key]}
                    onChange={(e) => setInvitePermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="accent-amber-400"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center justify-between text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded px-3 py-2">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {successMessage && (
            <div className="flex items-center justify-between text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2">
              <span>{successMessage}</span>
              <button type="button" onClick={() => setSuccessMessage(null)}><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </form>
      )}

      <div className="bg-stone-900 border border-stone-800 rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-800 text-[10px] uppercase tracking-wider text-stone-500 font-bold">
          {isLoading ? 'Loading team...' : `${employees.length} ${employees.length === 1 ? 'person' : 'people'} authorized`}
        </div>
        <div className="divide-y divide-stone-800">
          {employees.map(emp => (
            <div key={emp.email} className="px-4 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="w-4 h-4 text-stone-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-stone-200 font-sans truncate">{emp.email}</div>
                  <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5">
                    <span className={`px-1.5 py-0.5 rounded uppercase font-bold ${emp.role === 'TENANT_ADMIN' ? 'text-amber-400 bg-amber-400/10' : 'text-stone-400 bg-stone-800'}`}>
                      {emp.role === 'TENANT_ADMIN' ? 'Admin' : 'Member'}
                    </span>
                    <span className="flex items-center gap-1">
                      {emp.status === 'ACCEPTED' ? (
                        <><ShieldCheck className="w-3 h-3 text-emerald-400" /> Active</>
                      ) : (
                        <><Clock className="w-3 h-3 text-amber-400" /> Invited, hasn't signed in yet</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleRemove(emp.email)}
                  className="text-stone-500 hover:text-rose-400 p-1.5 cursor-pointer shrink-0"
                  title="Remove access"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {!isLoading && employees.length === 0 && (
            <div className="px-4 py-6 text-center text-stone-500 text-xs font-sans">No team members yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
