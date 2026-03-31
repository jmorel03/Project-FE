import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExclamationTriangleIcon, ShieldCheckIcon, UserGroupIcon, UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { teamService } from '../services/api';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'worker', label: 'Worker' },
];

function extractError(err, fallback) {
  return err?.response?.data?.error || fallback;
}

export default function TeamSettings() {
  useDocumentTitle('Xpensist | Team Settings');

  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('worker');
  const [workspaceName, setWorkspaceName] = useState('');

  const teamQuery = useQuery({
    queryKey: ['team-settings'],
    queryFn: teamService.getTeam,
  });

  const team = teamQuery.data;
  const currentWorkspaceName = String(team?.workspace?.name || '').trim();
  const workspaceRole = String(team?.workspace?.actorRole || 'admin').toLowerCase();
  const isWorkspaceAdmin = workspaceRole === 'admin';
  const isBusiness = String(team?.plan?.key || '').toLowerCase() === 'business';
  const seats = team?.seats || { used: 1, limit: 1, remaining: 0 };
  const members = team?.members || [];
  const invites = team?.invites || [];
  const actorUserId = String(team?.workspace?.actorUserId || '');
  const nextWorkspaceName = String(workspaceName || '').trim();
  const workspaceNameChanged = Boolean(nextWorkspaceName) && nextWorkspaceName !== currentWorkspaceName;

  useEffect(() => {
    if (team?.workspace?.name) {
      setWorkspaceName((prev) => prev || team.workspace.name);
    }
  }, [team?.workspace?.name]);

  const roleBadgeStyles = useMemo(
    () => ({
      admin: 'bg-emerald-100 text-emerald-700',
      worker: 'bg-slate-100 text-slate-700',
    }),
    [],
  );

  const refreshTeam = () => queryClient.invalidateQueries({ queryKey: ['team-settings'] });

  const addMemberMutation = useMutation({
    mutationFn: teamService.addMember,
    onSuccess: (data) => {
      setEmail('');
      setRole('worker');
      if (data?.code === 'TEAM_INVITE_SENT') {
        toast.success('Invite sent');
      } else {
        toast.success('Team member assigned');
      }
      refreshTeam();
    },
    onError: (err) => toast.error(extractError(err, 'Unable to add member')),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: teamService.revokeInvite,
    onSuccess: () => {
      toast.success('Invite revoked');
      refreshTeam();
    },
    onError: (err) => toast.error(extractError(err, 'Unable to revoke invite')),
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: (name) => teamService.updateWorkspace(name),
    onSuccess: (data) => {
      toast.success('Workspace name updated');
      setWorkspaceName(data?.workspace?.name || workspaceName);
      refreshTeam();
    },
    onError: (err) => toast.error(extractError(err, 'Unable to update workspace name')),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberUserId, nextRole }) => teamService.updateMemberRole(memberUserId, nextRole),
    onSuccess: () => {
      toast.success('Role updated');
      refreshTeam();
    },
    onError: (err) => toast.error(extractError(err, 'Unable to update role')),
  });

  const removeMemberMutation = useMutation({
    mutationFn: teamService.removeMember,
    onSuccess: () => {
      toast.success('Member removed');
      refreshTeam();
    },
    onError: (err) => toast.error(extractError(err, 'Unable to remove member')),
  });

  function handleInvite(e) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    addMemberMutation.mutate({ email: email.trim(), role });
  }

  function handleRemoveMember(member) {
    const currentRole = String(member.role || 'worker').toLowerCase();
    const isCurrentActor = member.user.id === actorUserId;
    if (isCurrentActor && currentRole === 'admin') {
      toast.error('Admins cannot remove themselves from the team.');
      return;
    }

    const fullName = `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || member.user.email;
    const confirmed = window.confirm(`Remove ${fullName} from this team? They will lose workspace access immediately.`);
    if (!confirmed) return;
    removeMemberMutation.mutate(member.user.id);
  }

  function handleRevokeInvite(invite) {
    const confirmed = window.confirm(`Revoke invite for ${invite.email}?`);
    if (!confirmed) return;
    revokeInviteMutation.mutate(invite.id);
  }

  if (teamQuery.isLoading) {
    return (
      <div className="page-reveal space-y-6 max-w-4xl">
        <div className="page-intro">
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">Loading team workspace details...</p>
        </div>
      </div>
    );
  }

  if (teamQuery.isError) {
    return (
      <div className="page-reveal space-y-6 max-w-4xl">
        <div className="page-intro">
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">Could not load your team workspace.</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-red-600">{extractError(teamQuery.error, 'Try reloading this page.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-reveal space-y-8 max-w-4xl">
      <div className="page-intro flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">Manage workspace seats with Admin and Worker roles.</p>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">{team?.workspace?.name || 'Team Workspace'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Seats</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{seats.used} / {seats.limit}</p>
          <p className="text-xs text-slate-500">{seats.remaining} remaining</p>
        </div>
      </div>

      {!isBusiness && (
        <div className="card border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Business plan required</p>
              <p className="mt-1 text-sm text-amber-800">Team seats are available on Business. Starter and Professional workspaces include the owner seat only.</p>
              <Link to="/settings/subscription" className="mt-3 inline-flex btn-secondary">View Subscription Plans</Link>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Team Name</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            className="input"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            disabled={!isWorkspaceAdmin || updateWorkspaceMutation.isPending}
            maxLength={80}
            placeholder="Enter team name"
          />
          <button
            type="button"
            className="btn-primary"
            disabled={!isWorkspaceAdmin || updateWorkspaceMutation.isPending || !workspaceNameChanged}
            onClick={() => updateWorkspaceMutation.mutate(nextWorkspaceName)}
          >
            {updateWorkspaceMutation.isPending ? 'Saving...' : 'Save Name'}
          </button>
        </div>
        <p className="text-xs text-slate-500">{nextWorkspaceName.length}/80 characters</p>
        {!isWorkspaceAdmin && <p className="text-xs text-slate-500">Only Admin users can rename the team.</p>}
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-slate-600" />
          <h2 className="text-base font-semibold text-slate-900">Workspace Team</h2>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600">Member</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Role</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <tr>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">Owner Seat</p>
                  <p className="text-xs text-slate-500">Primary workspace account</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
                    admin
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">Fixed</td>
              </tr>

              {members.map((member) => {
                const currentRole = String(member.role || 'worker').toLowerCase();
                const canChange = isWorkspaceAdmin && isBusiness;
                const isCurrentActor = member.user.id === actorUserId;
                const blockSelfDemotion = isCurrentActor && currentRole === 'admin';
                const blockSelfRemoval = isCurrentActor && currentRole === 'admin';

                return (
                  <tr key={member.user.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{member.user.firstName} {member.user.lastName}</p>
                      <p className="text-xs text-slate-500">{member.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeStyles[currentRole] || roleBadgeStyles.worker}`}>
                        {currentRole}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canChange ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className="input !w-36 !py-1.5"
                            value={currentRole}
                            onChange={(e) => {
                              const nextRole = e.target.value;
                              if (blockSelfDemotion && nextRole === 'worker') return;
                              if (nextRole === currentRole) return;
                              updateRoleMutation.mutate({ memberUserId: member.user.id, nextRole });
                            }}
                            disabled={updateRoleMutation.isPending || removeMemberMutation.isPending}
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option
                                key={opt.value}
                                value={opt.value}
                                disabled={blockSelfDemotion && opt.value === 'worker'}
                              >
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn-danger !px-3 !py-1.5"
                            onClick={() => handleRemoveMember(member)}
                            disabled={removeMemberMutation.isPending || updateRoleMutation.isPending || blockSelfRemoval}
                          >
                            <XMarkIcon className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Admin only</span>
                      )}
                      {blockSelfDemotion && (
                        <p className="mt-2 text-xs text-amber-700">You cannot change your own role to worker.</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlusIcon className="h-5 w-5 text-slate-600" />
          <h2 className="text-base font-semibold text-slate-900">Add Team Member</h2>
        </div>

        {!isWorkspaceAdmin ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Worker access</p>
            <p className="mt-1">Only Admin users can manage seats and role assignments.</p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <input
              type="email"
              className="input"
              placeholder="member@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isBusiness || addMemberMutation.isPending}
            />
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={!isBusiness || addMemberMutation.isPending}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary" disabled={!isBusiness || addMemberMutation.isPending || seats.remaining <= 0}>
              <ShieldCheckIcon className="h-4 w-4" />
              {addMemberMutation.isPending ? 'Assigning...' : 'Assign Seat'}
            </button>
          </form>
        )}

        {isBusiness && seats.remaining <= 0 && (
          <p className="text-sm text-amber-700">Seat limit reached: Business supports up to 5 seats total (owner + 4 members).</p>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Pending Invites</h2>
        {invites.length === 0 ? (
          <p className="text-sm text-slate-500">No pending invites.</p>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{invite.email}</p>
                  <p className="text-xs text-slate-500">Role: {invite.role} • Expires: {new Date(invite.expiresAt).toLocaleDateString()} • Pending</p>
                </div>
                {isWorkspaceAdmin && isBusiness ? (
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-1.5"
                    onClick={() => handleRevokeInvite(invite)}
                    disabled={revokeInviteMutation.isPending}
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
