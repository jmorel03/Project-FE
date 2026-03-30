import { useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import Input, { Select } from '../components/ui/Input';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().default('USD'),
  taxNumber: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  password: z.string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must include at least one uppercase letter')
    .regex(/[^A-Za-z0-9]/, 'Must include at least one special character'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export default function Settings() {
  useDocumentTitle('Xpensist | Settings');

  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const checklistPreferenceKey = useMemo(
    () => (user?.id ? `xpensist:dashboard:hideChecklist:${user.id}` : null),
    [user?.id],
  );
  const [hideChecklist, setHideChecklist] = useState(false);

  useEffect(() => {
    if (!checklistPreferenceKey) {
      setHideChecklist(false);
      return;
    }
    setHideChecklist(localStorage.getItem(checklistPreferenceKey) === '1');
  }, [checklistPreferenceKey]);

  useEffect(() => {
    // Preserve old deep links such as /settings#support after support moved to /support.
    if (window.location.hash === '#support') {
      navigate('/support', { replace: true });
    }
  }, [navigate]);

  function handleChecklistPreferenceChange(checked) {
    setHideChecklist(checked);
    if (!checklistPreferenceKey) return;
    if (checked) {
      localStorage.setItem(checklistPreferenceKey, '1');
      toast.success('Checklist hidden on dashboard');
    } else {
      localStorage.removeItem(checklistPreferenceKey);
      toast.success('Checklist visible on dashboard');
    }
  }

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: pErr, isSubmitting: pSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      companyName: user?.companyName || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      zip: user?.zip || '',
      country: user?.country || '',
      currency: user?.currency || 'USD',
      taxNumber: user?.taxNumber || '',
    },
  });

  const {
    register: regPw,
    handleSubmit: handlePw,
    reset: resetPw,
    formState: { errors: pwErr, isSubmitting: pwSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const profileMutation = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (data) => { updateUser(data); toast.success('Profile saved'); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Save failed'),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ currentPassword, password }) => authService.changePassword({
      currentPassword,
      newPassword: password,
    }),
    onSuccess: () => {
      toast.success('Password updated. Please log in again.');
      resetPw();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Update failed'),
  });

  return (
    <div className="page-reveal space-y-8 max-w-2xl">
      <div className="page-intro">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage profile details, security controls, and workspace preferences in one place.</p>
      </div>

      {/* Profile */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Profile & Business</h2>
        <form onSubmit={handleProfile((d) => profileMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" error={pErr.firstName?.message} {...regProfile('firstName')} />
            <Input label="Last name" error={pErr.lastName?.message} {...regProfile('lastName')} />
          </div>
          <Input label="Email" type="email" error={pErr.email?.message} {...regProfile('email')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Company name" {...regProfile('companyName')} />
            <Input label="Phone" {...regProfile('phone')} />
          </div>
          <Input label="Address" {...regProfile('address')} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" {...regProfile('city')} />
            <Input label="State" {...regProfile('state')} />
            <Input label="ZIP" {...regProfile('zip')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Country" {...regProfile('country')} />
            <Select label="Default Currency" {...regProfile('currency')}>
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <Input label="Tax / VAT Number" placeholder="Optional" {...regProfile('taxNumber')} />
          <div className="flex justify-end">
            <button type="submit" disabled={pSubmitting || profileMutation.isPending} className="btn-primary">
              {profileMutation.isPending ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Password */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
        <form onSubmit={handlePw((d) => passwordMutation.mutate(d))} className="space-y-4">
          <Input label="Current Password" type="password" placeholder="Enter current password" error={pwErr.currentPassword?.message} {...regPw('currentPassword')} />
          <Input label="New Password" type="password" placeholder="Min. 8 characters" error={pwErr.password?.message} {...regPw('password')} />
          <Input label="Confirm Password" type="password" placeholder="Repeat password" error={pwErr.confirm?.message} {...regPw('confirm')} />
          <p className="text-xs text-gray-500">Password must include at least 8 characters, one uppercase letter, and one special character. You also cannot reuse your last 5 passwords.</p>
          <div className="flex justify-end">
            <button type="submit" disabled={pwSubmitting || passwordMutation.isPending} className="btn-primary">
              {passwordMutation.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Dashboard Preferences */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Dashboard Preferences</h2>
        <label className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Hide onboarding checklist</p>
            <p className="mt-1 text-xs text-gray-500">Turn this on if you do not want to see checklist cards in your dashboard.</p>
          </div>
          <input
            type="checkbox"
            checked={hideChecklist}
            onChange={(e) => handleChecklistPreferenceChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </label>
      </div>
    </div>
  );
}
