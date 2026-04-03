import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Input from '../../components/ui/Input';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { authService } from '../../services/api';

const schema = z.object({
  token: z.string().min(32, 'Reset token is missing or invalid'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
    .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

export default function ResetPassword() {
  useDocumentTitle('Xpensist | Reset Password');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = String(searchParams.get('token') || '').trim();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      token: tokenFromQuery,
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      const res = await authService.resetPassword({
        token: data.token,
        newPassword: data.newPassword,
      });
      toast.success(res?.message || 'Password reset successful. Please log in again.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Unable to reset password');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#f0f7ff_52%,_#eefaf5_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to login
          </Link>
        </div>

        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <img src="/favicon.svg" alt="Xpensist logo" className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new secure password for your account</p>
        </div>

        <div className="card p-8 shadow-lg shadow-slate-200/70">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Reset token"
              type="text"
              placeholder="Paste token from your reset link"
              error={errors.token?.message}
              {...register('token')}
            />
            <Input
              label="New password"
              type="password"
              placeholder="••••••••"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <Input
              label="Confirm new password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <p className="text-xs text-gray-500">
              Password rules: at least 8 characters, one uppercase letter, and one special character.
            </p>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5">
              {isSubmitting ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
