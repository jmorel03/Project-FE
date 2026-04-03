import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { authService } from '../../services/api';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  useDocumentTitle('Xpensist | Login Page');

  const { login } = useAuth();
  const navigate = useNavigate();
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [searchParams] = useSearchParams();
  const inviteToken = String(searchParams.get('invite') || '').trim();
  const invitedEmail = String(searchParams.get('email') || '').trim().toLowerCase();
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: invitedEmail || '',
    },
  });

  const onSubmit = async (data) => {
    try {
      await login(data);
      if (inviteToken) {
        navigate(`/invite/${encodeURIComponent(inviteToken)}`);
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Login failed');
    }
  };

  const handleForgotPassword = async () => {
    const email = String(getValues('email') || '').trim().toLowerCase();
    if (!email) {
      toast.error('Enter your email first, then click Forgot password.');
      return;
    }

    setIsSendingReset(true);
    try {
      const res = await authService.forgotPassword({ email });
      toast.success(res?.message || 'If the email exists, a reset link has been sent.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not send reset link');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#f0f7ff_52%,_#eefaf5_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Back to home */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to home
          </Link>
        </div>

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <img src="/favicon.svg" alt="Xpensist logo" className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Xpensist</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          {inviteToken && (
            <p className="text-xs text-primary-700 mt-2">Sign in with your invited email to accept this team invite{invitedEmail ? `: ${invitedEmail}` : ''}.</p>
          )}
        </div>

        <div className="card p-8 shadow-lg shadow-slate-200/70">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="-mt-1 text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isSendingReset}
                className="text-sm font-medium text-primary-600 hover:underline disabled:opacity-60"
              >
                {isSendingReset ? 'Sending reset link...' : 'Forgot password?'}
              </button>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to={inviteToken ? `/register?invite=${encodeURIComponent(inviteToken)}` : '/register'} className="text-primary-600 font-medium hover:underline">Create one</Link>
        </p>

        <p className="mx-auto mt-4 max-w-xs text-center text-xs leading-5 text-gray-500">
          By continuing, you agree to the{' '}
          <Link to="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
          .
        </p>
      </div>
    </div>
  );
}
