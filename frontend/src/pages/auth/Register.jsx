import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { billingService } from '../../services/api';

const schema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    companyName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function Register() {
  useDocumentTitle('Xpensist | Register');

  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlan = (searchParams.get('plan') || 'starter').toLowerCase();
  const signupPlan = ['starter', 'professional', 'business'].includes(selectedPlan) ? selectedPlan : 'starter';
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await registerUser(data);

      if (signupPlan === 'starter') {
        navigate('/dashboard');
        toast.success('Welcome to Xpensist! Your free Starter account is ready.');
        return;
      }

      const checkout = await billingService.createCheckoutSession(signupPlan);
      if (checkout?.url) {
        toast.success(signupPlan === 'professional'
          ? 'Account created. Starting your 14-day free trial checkout...'
          : 'Account created. Redirecting to secure checkout...');
        window.location.href = checkout.url;
        return;
      }

      navigate('/settings/subscription');
      toast('Account created. Please complete billing to activate this plan.', { icon: 'ℹ️' });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Registration failed');
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

        <div className="text-center mb-8">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">
            {signupPlan === 'starter'
              ? 'Start invoicing in minutes on the free Starter plan.'
              : signupPlan === 'professional'
                ? 'Create your account and continue to checkout for your 14-day Professional trial.'
                : 'Create your account and continue to checkout for Business.'}
          </p>
        </div>

        <div className="card p-8 shadow-lg shadow-slate-200/70">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" placeholder="Jane" error={errors.firstName?.message} {...register('firstName')} />
              <Input label="Last name" placeholder="Smith" error={errors.lastName?.message} {...register('lastName')} />
            </div>
            <Input label="Company name" placeholder="company inc. (optional)" error={errors.companyName?.message} {...register('companyName')} />
            <Input label="Email address" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" placeholder="Min. 8 characters" error={errors.password?.message} {...register('password')} />
            <Input label="Confirm password" type="password" placeholder="Re-enter password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5">
              {isSubmitting
                ? 'Creating account…'
                : signupPlan === 'starter'
                  ? 'Create free account'
                  : signupPlan === 'professional'
                    ? 'Create account and start trial'
                    : 'Create account and continue to checkout'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>

        <p className="mx-auto mt-4 max-w-xs text-center text-xs leading-5 text-gray-500">
          By creating an account, you agree to the{' '}
          <Link to="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
          {' '}and acknowledge the{' '}
          <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
          .
        </p>
      </div>
    </div>
  );
}
