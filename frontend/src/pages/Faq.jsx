import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, LifebuoyIcon } from '@heroicons/react/24/outline';
import PublicNav from '../components/layout/PublicNav';
import useDocumentTitle from '../hooks/useDocumentTitle';

const faqItems = [
  {
    question: 'What can I do with Xpensist?',
    answer:
      'Xpensist helps you create and send invoices, track expenses, follow up with reminders, and monitor income, expenses, and profit in one dashboard.',
  },
  {
    question: 'Can I send invoices directly to clients by email?',
    answer:
      'Yes. You can send invoices through the platform and keep delivery and follow-up activity organized in one place.',
  },
  {
    question: 'Does Xpensist support due-soon and overdue reminders?',
    answer:
      'Yes. Reminder workflows are available to help you reduce late payments and make collections more consistent.',
  },
  {
    question: 'Can I track receipts and categorize expenses?',
    answer:
      'Yes. You can upload receipt files, categorize spending, and use reporting views to understand where money is going.',
  },
  {
    question: 'Is multi-currency supported?',
    answer:
      'Yes. You can configure a default currency for your account so invoices and reporting align with your operating setup.',
  },
  {
    question: 'How secure is my account data?',
    answer:
      'Xpensist includes secure authentication flows and account controls, including password updates and reset workflows for account protection.',
  },
  {
    question: 'Is there a free plan?',
    answer:
      'Yes. The Starter plan is free forever. Paid plans unlock stronger automation, deeper reporting, and premium support options.',
  },
  {
    question: 'How do I get support if I need help?',
    answer:
      'You can contact support directly from the support section below. If you are an existing customer, you can also use the in-app support form from Settings.',
  },
];

export default function Faq() {
  useDocumentTitle('Xpensist | FAQ');
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="marketing-shell marketing-reveal overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_44%,_#f8fafc_100%)]">
      <PublicNav />

      <section className="pt-24 pb-12">
        <div className="marketing-wrap text-center">
          <span className="hero-chip mb-5">Frequently Asked Questions</span>
          <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Answers for teams evaluating Xpensist.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 sm:text-xl">
            Everything you need to know about invoicing, reminders, expense tracking, reporting, and support.
          </p>
        </div>
      </section>

      <section className="pb-12">
        <div className="marketing-wrap max-w-4xl space-y-4">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div key={item.question} className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-base font-semibold text-slate-900 sm:text-lg">{item.question}</span>
                  <ChevronDownIcon className={`h-5 w-5 shrink-0 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-6 py-5">
                    <p className="text-sm leading-7 text-slate-600 sm:text-base">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="pb-20">
        <div className="marketing-wrap rounded-[32px] border border-primary-200 bg-primary-50/90 px-8 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary-700 shadow-sm">
            <LifebuoyIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-slate-900">Need help from support?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
            Reach out to our team for setup guidance, billing questions, or product support.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/contact-support"
              className="rounded-xl bg-primary-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-200 transition hover:-translate-y-0.5 hover:bg-primary-700"
            >
              Contact Support
            </Link>
            <Link
              to="/register"
              className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400"
            >
              Create Free Account
            </Link>
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