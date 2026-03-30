import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supportService } from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Input from '../components/ui/Input';

const supportSchema = z.object({
  subject: z.string().min(1, 'Required').max(200),
  message: z.string().min(10, 'Please provide more detail').max(5000),
});

export default function Support() {
  useDocumentTitle('Xpensist | Support');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(supportSchema) });

  const supportMutation = useMutation({
    mutationFn: ({ subject, message }) => supportService.sendMessage(subject, message),
    onSuccess: () => {
      toast.success('Message sent. We will get back to you soon.');
      reset();
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to send message'),
  });

  return (
    <div className="page-reveal space-y-8 max-w-3xl">
      <div className="page-intro">
        <h1 className="page-title">Support</h1>
        <p className="page-subtitle">Send a support request and our team will respond by email.</p>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Contact Support</h2>
          <p className="mt-1 text-sm text-gray-500">Include details like invoice numbers, dates, or screenshots to help us resolve faster.</p>
        </div>

        <form onSubmit={handleSubmit((data) => supportMutation.mutate(data))} className="space-y-4">
          <Input label="Subject" placeholder="e.g. Reminder email not sending" error={errors.subject?.message} {...register('subject')} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <textarea
              rows={6}
              placeholder="Describe your question or issue in detail..."
              className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.message ? 'border-red-400' : 'border-gray-300'
              }`}
              {...register('message')}
            />
            {errors.message && <p className="text-xs text-red-500">{errors.message.message}</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/faq" className="text-sm font-medium text-primary-600 hover:underline">
              Check FAQ first
            </Link>
            <button type="submit" disabled={isSubmitting || supportMutation.isPending} className="btn-primary">
              {supportMutation.isPending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}