import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PencilIcon, PaperAirplaneIcon, ArrowDownTrayIcon,
  BanknotesIcon, TrashIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { billingService, invoiceService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input, { Select } from '../components/ui/Input';
import { differenceInCalendarDays, format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { isPlanAtLeast, resolveActivePlanKey } from '../lib/billing';

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  method: z.string().optional(),
  reference: z.string().optional(),
  paidAt: z.string().optional(),
});

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.get(id),
  });
  const billingSummaryQuery = useQuery({
    queryKey: ['billing-summary-invoice-view'],
    queryFn: billingService.getSummary,
  });

  useDocumentTitle(invoice?.invoiceNumber ? `Xpensist | ${invoice.invoiceNumber}` : 'Xpensist | Invoice Details');

  const sendMutation = useMutation({
    mutationFn: () => invoiceService.send(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); toast.success('Invoice sent!'); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Send failed'),
  });

  const reminderMutation = useMutation({
    mutationFn: (type) => invoiceService.sendReminder(id, { type }),
    onSuccess: (data) => {
      qc.setQueryData(['invoice', id], data.invoice);
      toast.success('Reminder sent');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Reminder failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => invoiceService.delete(id),
    onSuccess: () => {
      setDeleteOpen(false);
      toast.success('Invoice deleted');
      navigate('/invoices');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Delete failed'),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(paymentSchema),
  });

  const paymentMutation = useMutation({
    mutationFn: (data) => invoiceService.recordPayment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      toast.success('Payment recorded');
      setPaymentOpen(false);
      reset();
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to record payment'),
  });

  const handleDownload = () => {
    const url = invoiceService.pdfUrl(id);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!invoice) return <p className="text-gray-500">Invoice not found.</p>;

  const activePlanKey = resolveActivePlanKey(billingSummaryQuery.data);
  const canUseReminders = isPlanAtLeast(activePlanKey, 'professional');
  const balance = Number(invoice.total) - Number(invoice.amountPaid);
  const daysUntilDue = differenceInCalendarDays(new Date(invoice.dueDate), new Date());
  const reminderType = daysUntilDue > 0 ? 'UPCOMING' : daysUntilDue === 0 ? 'DUE_TODAY' : daysUntilDue <= -14 ? 'FINAL_NOTICE' : 'OVERDUE';
  const reminderLabel = reminderType === 'UPCOMING'
    ? 'Send Upcoming Reminder'
    : reminderType === 'DUE_TODAY'
      ? 'Send Due Today Reminder'
      : reminderType === 'FINAL_NOTICE'
        ? 'Send Final Notice'
        : 'Send Overdue Reminder';

  return (
    <div className="page-reveal space-y-6 max-w-4xl">
      {/* Back + Actions */}
      <div className="page-intro flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/invoices')} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="w-4 h-4" />
          Invoices
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleDownload} className="btn-secondary text-xs py-1.5 px-3">
            <ArrowDownTrayIcon className="w-4 h-4" /> PDF
          </button>
          {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <>
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                {sendMutation.isPending ? 'Sending…' : 'Send Email'}
              </button>
              <button
                onClick={() => canUseReminders && reminderMutation.mutate(reminderType)}
                disabled={reminderMutation.isPending || billingSummaryQuery.isLoading || !canUseReminders}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                {reminderMutation.isPending ? 'Sending…' : canUseReminders ? reminderLabel : 'Upgrade for Reminders'}
              </button>
              <button onClick={() => setPaymentOpen(true)} className="btn-primary text-xs py-1.5 px-3">
                <BanknotesIcon className="w-4 h-4" /> Record Payment
              </button>
            </>
          )}
          <Link to={`/invoices/${id}/edit`} className="btn-secondary text-xs py-1.5 px-3">
            <PencilIcon className="w-4 h-4" /> Edit
          </Link>
          <button
            onClick={() => setDeleteOpen(true)}
            className="btn-danger text-xs py-1.5 px-3"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!canUseReminders && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          Automated and manual invoice reminders start on Professional.
          {' '}
          <Link to="/settings/subscription" className="font-semibold underline underline-offset-4">
            Upgrade your plan
          </Link>
          {' '}
          to unlock reminder workflows.
        </div>
      )}

      {/* Invoice card */}
      <div className="table-shell">
        {/* Header band */}
        <div className="bg-primary-600 px-8 py-6 flex justify-between items-start">
          <div>
            <p className="text-primary-200 text-xs font-semibold uppercase tracking-widest">Invoice</p>
            <p className="text-white text-2xl font-bold mt-1">{invoice.invoiceNumber}</p>
          </div>
          <Badge status={invoice.status} />
        </div>

        <div className="p-8 space-y-8">
          {/* Meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Bill To</p>
              <p className="font-semibold text-gray-900 mt-1">{invoice.client.name}</p>
              {invoice.client.company && <p className="text-sm text-gray-500">{invoice.client.company}</p>}
              {invoice.client.email && <p className="text-sm text-gray-500">{invoice.client.email}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Issue Date</p>
              <p className="text-gray-800 mt-1">{format(new Date(invoice.issueDate), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Due Date</p>
              <p className="text-gray-800 mt-1">{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Currency</p>
              <p className="text-gray-800 mt-1">{invoice.currency}</p>
            </div>
          </div>

          {/* Line items */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head-row">
                  <th className="table-head-cell py-2">Description</th>
                  <th className="table-head-cell w-20 py-2 text-right">Qty</th>
                  <th className="table-head-cell w-28 py-2 text-right">Unit Price</th>
                  <th className="table-head-cell w-28 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item) => (
                  <tr key={item.id} className="table-row">
                    <td className="py-3 text-gray-800">{item.description}</td>
                    <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600">{fmt(item.unitPrice, invoice.currency)}</td>
                    <td className="py-3 text-right font-medium text-gray-800">{fmt(item.total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{fmt(invoice.subtotal, invoice.currency)}</span>
              </div>
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({invoice.discountRate}%)</span>
                  <span>-{fmt(invoice.discountAmount, invoice.currency)}</span>
                </div>
              )}
              {Number(invoice.taxAmount) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({invoice.taxRate}%)</span><span>{fmt(invoice.taxAmount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                <span>Total</span><span>{fmt(invoice.total, invoice.currency)}</span>
              </div>
              {Number(invoice.amountPaid) > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid</span><span>-{fmt(invoice.amountPaid, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary-700">
                    <span>Balance Due</span><span>{fmt(balance, invoice.currency)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes / Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
              {invoice.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                  <p className="text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Terms</p>
                  <p className="text-sm text-gray-600">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Payment history */}
          {invoice.payments?.length > 0 && (
            <div className="border-t border-gray-100 pt-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Payment History</p>
              <div className="space-y-2">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-700">{format(new Date(p.paidAt), 'MMM dd, yyyy')}</span>
                      {p.method && <span className="text-gray-400 ml-2">via {p.method}</span>}
                      {p.reference && <span className="text-gray-400 ml-2">#{p.reference}</span>}
                    </div>
                    <span className="font-medium text-green-600">{fmt(p.amount, invoice.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invoice.reminders?.length > 0 && (
            <div className="border-t border-gray-100 pt-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Reminder History</p>
              <div className="space-y-2">
                {invoice.reminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-700">{reminder.type.replaceAll('_', ' ')}</span>
                      <span className="ml-2 text-gray-400">{format(new Date(reminder.sentAt), 'MMM dd, yyyy h:mm a')}</span>
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide text-primary-700">Sent</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record Payment">
        <form onSubmit={handleSubmit((d) => paymentMutation.mutate(d))} className="space-y-4">
          <Input label="Amount *" type="number" step="0.01" placeholder="0.00" error={errors.amount?.message} {...register('amount')} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Method" {...register('method')}>
              <option value="">Select…</option>
              {['Bank Transfer', 'Credit Card', 'PayPal', 'Stripe', 'Cash', 'Check', 'Other'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
            <Input label="Date" type="date" {...register('paidAt')} />
          </div>
          <Input label="Reference / Note" placeholder="Transaction ID, check #, etc." {...register('reference')} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setPaymentOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting || paymentMutation.isPending} className="btn-primary">
              {paymentMutation.isPending ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Invoice" size="sm">
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteMutation.isPending}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="btn-danger"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete Invoice'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
