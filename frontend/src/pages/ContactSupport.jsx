import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PublicNav from '../components/layout/PublicNav';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { supportService } from '../services/api';

const initialForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

export default function ContactSupport() {
  useDocumentTitle('Xpensist | Contact Support');
  const [form, setForm] = useState(initialForm);

  const mutation = useMutation({
    mutationFn: supportService.sendPublicMessage,
    onSuccess: () => {
      toast.success('Support request sent. Our team will reply by email.');
      setForm(initialForm);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Unable to send message right now. Please try again.');
    },
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    mutation.mutate(form);
  }

  return (
    <div className="marketing-shell marketing-reveal overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_44%,_#f8fafc_100%)]">
      <PublicNav />

      <section className="pt-24 pb-10">
        <div className="marketing-wrap text-center">
          <span className="hero-chip mb-5">Contact Support</span>
          <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Get help from the Xpensist support team.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 sm:text-xl">
            Send us your question and we will respond as quickly as possible.
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="marketing-wrap grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-sm backdrop-blur">
            <h2 className="text-2xl font-bold text-slate-900">Send a message</h2>
            <p className="mt-2 text-sm text-slate-600">Include as much detail as possible so we can help faster.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={updateField}
                  required
                  maxLength={120}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  required
                  maxLength={255}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={form.subject}
                  onChange={updateField}
                  required
                  maxLength={200}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  placeholder="Issue with invoice reminders"
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={form.message}
                  onChange={updateField}
                  required
                  maxLength={5000}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  placeholder="Share the details so we can help quickly..."
                />
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-200 transition hover:-translate-y-0.5 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {mutation.isPending ? 'Sending...' : 'Send to Support'}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Prefer email?</h3>
              <p className="mt-2 text-sm text-slate-600">You can also contact us directly at support@xpensist.com.</p>
              <a
                href="mailto:support@xpensist.com"
                className="mt-5 inline-flex rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Email support@xpensist.com
              </a>
            </div>

            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/80 p-7 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">Need product details first?</h3>
              <p className="mt-2 text-sm text-slate-700">Review common setup and billing questions before contacting support.</p>
              <Link
                to="/faq"
                className="mt-5 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:-translate-y-0.5"
              >
                Open FAQ
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 px-4 py-8 text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p>&copy; 2026 Xpensist. Invoicing and expense operations, without the spreadsheet drift.</p>
        </div>
      </footer>
    </div>
  );
}