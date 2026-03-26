import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authService, supportService } from '../services/api';
import Input, { Select } from '../components/ui/Input';
import toast from 'react-hot-toast';

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
  password: z.string().min(8, 'Min 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

const supportSchema = z.object({
  subject: z.string().min(1, 'Required').max(200),
  message: z.string().min(10, 'Please provide more detail').max(5000),
});

export default function Settings() {
  const { user, updateUser } = useAuth();

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

  const {
    register: regSupport,
    handleSubmit: handleSupport,
    reset: resetSupport,
    formState: { errors: supErr, isSubmitting: supSubmitting },
  } = useForm({ resolver: zodResolver(supportSchema) });

  const profileMutation = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (data) => { updateUser(data); toast.success('Profile saved'); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Save failed'),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ password }) => authService.updateProfile({ password }),
    onSuccess: () => { toast.success('Password updated'); resetPw(); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Update failed'),
  });

  const supportMutation = useMutation({
    mutationFn: ({ subject, message }) => supportService.sendMessage(subject, message),
    onSuccess: () => { toast.success('Message sent — we\'ll be in touch soon!'); resetSupport(); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to send message'),
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="page-title">Settings</h1>

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
          <Input label="New Password" type="password" placeholder="Min. 8 characters" error={pwErr.password?.message} {...regPw('password')} />
          <Input label="Confirm Password" type="password" placeholder="Repeat password" error={pwErr.confirm?.message} {...regPw('confirm')} />
          <div className="flex justify-end">
            <button type="submit" disabled={pwSubmitting || passwordMutation.isPending} className="btn-primary">
              {passwordMutation.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Support */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Contact Support</h2>
          <p className="text-sm text-gray-500 mt-0.5">Have a question or issue? Send us a message and we'll get back to you.</p>
        </div>
        <form onSubmit={handleSupport((d) => supportMutation.mutate(d))} className="space-y-4">
          <Input label="Subject" placeholder="e.g. Issue with invoice" error={supErr.subject?.message} {...regSupport('subject')} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <textarea
              rows={5}
              placeholder="Describe your issue or question in detail…"
              className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                supErr.message ? 'border-red-400' : 'border-gray-300'
              }`}
              {...regSupport('message')}
            />
            {supErr.message && <p className="text-xs text-red-500">{supErr.message.message}</p>}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={supSubmitting || supportMutation.isPending} className="btn-primary">
              {supportMutation.isPending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
