import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { teamService } from '../services/api';
import { useAuth } from '../context/AuthContext';

function extractError(err, fallback) {
  return err?.response?.data?.error || fallback;
}

export default function InviteAccept() {
  useDocumentTitle('Xpensist | Team Invite');

  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const previewQuery = useQuery({
    queryKey: ['invite-preview', token],
    queryFn: () => teamService.previewInvite(token),
    enabled: Boolean(token),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => teamService.acceptInvite(token),
    onSuccess: () => {
      toast.success('Invite accepted. Welcome to your workspace.');
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      toast.error(extractError(err, 'Could not accept invite'));
    },
  });

  const invite = previewQuery.data?.invite;
  const mismatchInvitedEmail = acceptMutation.error?.response?.data?.details?.invitedEmail || invite?.email || '';

  useEffect(() => {
    if (!loading && user && invite?.status === 'pending' && !acceptMutation.isPending && !acceptMutation.isSuccess) {
      acceptMutation.mutate();
    }
  }, [loading, user, invite?.status, acceptMutation.isPending, acceptMutation.isSuccess, acceptMutation.mutate]);
  const workspaceName = previewQuery.data?.workspace?.ownerName || 'Xpensist workspace';
  const isPending = invite?.status === 'pending';

  const registerHref = useMemo(() => `/register?invite=${encodeURIComponent(token)}`, [token]);
  const loginHref = useMemo(() => `/login?invite=${encodeURIComponent(token)}`, [token]);
  const registerWithEmailHref = useMemo(() => {
    const q = new URLSearchParams({ invite: token });
    if (mismatchInvitedEmail) q.set('email', mismatchInvitedEmail);
    return `/register?${q.toString()}`;
  }, [token, mismatchInvitedEmail]);
  const loginWithEmailHref = useMemo(() => {
    const q = new URLSearchParams({ invite: token });
    if (mismatchInvitedEmail) q.set('email', mismatchInvitedEmail);
    return `/login?${q.toString()}`;
  }, [token, mismatchInvitedEmail]);

  async function handleSwitchAccount() {
    await logout();
    navigate(loginWithEmailHref, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_50%,_#ecfdf5_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-xl card p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Invitation</h1>
          <p className="mt-2 text-sm text-slate-600">Review your invitation and join this workspace.</p>
        </div>

        {previewQuery.isLoading && <p className="text-sm text-slate-500">Loading invite details...</p>}

        {previewQuery.isError && (
          <p className="text-sm text-red-600">{extractError(previewQuery.error, 'Invite link is invalid or unavailable.')}</p>
        )}

        {invite && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700"><span className="font-semibold">Workspace:</span> {workspaceName}</p>
            <p className="text-sm text-slate-700 mt-1"><span className="font-semibold">Role:</span> {invite.role}</p>
            <p className="text-sm text-slate-700 mt-1"><span className="font-semibold">Email:</span> {invite.email}</p>
            <p className="text-xs text-slate-500 mt-2">Status: {invite.status}</p>
          </div>
        )}

        {!loading && !user && isPending && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Sign in with the invited email, or create an account to accept this invite.</p>
            <div className="flex flex-wrap gap-3">
              <Link to={loginHref} className="btn-secondary">Sign In to Accept</Link>
              <Link to={registerWithEmailHref || registerHref} className="btn-primary">Create Account and Accept</Link>
            </div>
          </div>
        )}

        {!loading && user && isPending && (
          <div className="space-y-3">
            {!acceptMutation.isError && (
              <p className="text-sm text-slate-600">Accepting invitation...</p>
            )}
            {acceptMutation.isError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">{extractError(acceptMutation.error, 'Could not accept invite.')}</p>
                {acceptMutation.error?.response?.data?.code === 'TEAM_INVITE_EMAIL_MISMATCH' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" onClick={handleSwitchAccount}>Sign Out and Use Invited Email</button>
                    <Link to={registerWithEmailHref} className="btn-primary">Create Invited Account</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {invite && invite.status !== 'pending' && (
          <p className="text-sm text-amber-700">This invite is no longer active. Ask your workspace admin for a new invite link.</p>
        )}
      </div>
    </div>
  );
}
