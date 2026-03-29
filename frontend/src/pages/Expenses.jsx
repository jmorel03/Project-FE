import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon, PaperClipIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { expenseService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input, { Select, Textarea } from '../components/ui/Input';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const schema = z.object({
  vendor: z.string().min(1, 'Vendor is required'),
  description: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Amount must be > 0'),
  currency: z.string().default('USD'),
  date: z.string().min(1, 'Date is required'),
  categoryId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  isBillable: z.boolean().default(false),
  isReimbursed: z.boolean().default(false),
  notes: z.string().optional(),
});

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function Expenses() {
  useDocumentTitle('Xpensist | Expenses');

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadExpense, setUploadExpense] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const fileInputRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { page, search, statusFilter }],
    queryFn: () => expenseService.list({
      page,
      limit: 20,
      search: search || undefined,
      status: statusFilter || undefined,
    }),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getCategories,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      currency: 'USD',
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'PENDING',
      isBillable: false,
      isReimbursed: false,
    });
    setOpen(true);
  };
  const openUpload = (exp) => { setUploadExpense(exp); setReceiptFile(null); setUploadOpen(true); };
  const openEdit = (exp) => {
    setEditing(exp);
    reset({
      vendor: exp.vendor,
      description: exp.description || '',
      amount: Number(exp.amount),
      currency: exp.currency,
      date: format(new Date(exp.date), 'yyyy-MM-dd'),
      categoryId: exp.categoryId || '',
      status: exp.status,
      isBillable: exp.isBillable,
      isReimbursed: exp.isReimbursed,
      notes: exp.notes || '',
    });
    setOpen(true);
  };

  const mutation = useMutation({
    mutationFn: (data) => editing ? expenseService.update(editing.id, data) : expenseService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(editing ? 'Expense updated' : 'Expense added');
      setOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: expenseService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense deleted'); },
    onError: (err) => toast.error(err?.response?.data?.error || 'Delete failed'),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }) => expenseService.uploadReceipt(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Receipt uploaded');
      setUploadOpen(false);
      setReceiptFile(null);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Upload failed'),
  });

  const quickStatusMutation = useMutation({
    mutationFn: ({ id, payload }) => expenseService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Expense updated');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Update failed'),
  });

  const expenses = data?.expenses || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const summary = data?.summary || {
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    reimbursedAmount: 0,
    reimbursedCount: 0,
    needsReimbursementAmount: 0,
    needsReimbursementCount: 0,
  };

  return (
    <div className="page-reveal space-y-6">
      <div className="page-intro flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Move expenses through review, reimbursement, and reporting with clear workflow states.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-xs flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search expenses…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select
          className="input max-w-xs"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Workflow Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Pending</p>
          <p className="mt-1 text-xl font-bold text-amber-900">{summary.pending}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Approved</p>
          <p className="mt-1 text-xl font-bold text-emerald-900">{summary.approved}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Rejected</p>
          <p className="mt-1 text-xl font-bold text-rose-900">{summary.rejected}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Total Spend</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{fmt(summary.totalAmount, 'USD')}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Reimbursed</p>
          <p className="mt-1 text-lg font-bold text-blue-900">{fmt(summary.reimbursedAmount, 'USD')}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">Needs Reimbursement</p>
          <p className="mt-1 text-lg font-bold text-orange-900">{fmt(summary.needsReimbursementAmount, 'USD')}</p>
          <p className="mt-1 text-[11px] font-medium text-orange-700">{summary.needsReimbursementCount} approved expense(s)</p>
        </div>
      </div>

      {/* Table */}
      <div className="table-shell">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" /></div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No expenses yet</p>
            <button onClick={openCreate} className="btn-primary mt-4">Add your first expense</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row">
                <th className="table-head-cell px-6 py-3">Date</th>
                <th className="table-head-cell px-4 py-3">Vendor</th>
                <th className="table-head-cell px-4 py-3">Category</th>
                <th className="table-head-cell px-4 py-3">Status</th>
                <th className="table-head-cell px-4 py-3">Flags</th>
                <th className="table-head-cell px-6 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="table-row">
                  <td className="px-6 py-3.5 text-gray-500">{format(new Date(exp.date), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-gray-900">{exp.vendor}</p>
                    {exp.description && <p className="text-xs text-gray-400 truncate max-w-[180px]">{exp.description}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    {exp.category ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ background: exp.category.color }} />
                        {exp.category.name}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5"><Badge status={exp.status} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {exp.isBillable && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Billable</span>}
                      {exp.isReimbursed && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Reimbursed</span>}
                      {!exp.isBillable && !exp.isReimbursed && <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right font-semibold text-gray-800">{fmt(exp.amount, exp.currency)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {exp.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => quickStatusMutation.mutate({ id: exp.id, payload: { status: 'APPROVED' } })}
                            className="text-xs text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => quickStatusMutation.mutate({ id: exp.id, payload: { status: 'REJECTED' } })}
                            className="text-xs text-amber-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {exp.status === 'APPROVED' && !exp.isReimbursed && (
                        <button
                          onClick={() => quickStatusMutation.mutate({ id: exp.id, payload: { isReimbursed: true } })}
                          className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Mark Reimbursed
                        </button>
                      )}
                      {exp.isReimbursed && (
                        <button
                          onClick={() => quickStatusMutation.mutate({ id: exp.id, payload: { isReimbursed: false } })}
                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          Undo Reimbursed
                        </button>
                      )}
                      {exp.receiptUrl ? (
                        <a
                          href={exp.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View receipt"
                          className="p-1.5 rounded text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <PaperClipIcon className="w-4 h-4" />
                        </a>
                      ) : null}
                      <button
                        onClick={() => openUpload(exp)}
                        title="Upload receipt"
                        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      >
                        <ArrowUpTrayIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(exp)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">Edit</button>
                      <button
                        onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(exp.id); }}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
            <span className="text-sm text-gray-500">{total} total</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary py-1 px-3 text-xs">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary py-1 px-3 text-xs">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Upload Modal */}
      <Modal open={uploadOpen} onClose={() => { setUploadOpen(false); setReceiptFile(null); }} title="Upload Receipt">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Attach a receipt for <span className="font-medium">{uploadExpense?.vendor}</span>
          </p>
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg px-6 py-10 text-center cursor-pointer hover:border-primary-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setReceiptFile(f); }}
          >
            <ArrowUpTrayIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            {receiptFile ? (
              <p className="text-sm font-medium text-gray-700">{receiptFile.name}</p>
            ) : (
              <>
                <p className="text-sm text-gray-500">Click or drag &amp; drop a file here</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP or PDF &middot; max 10 MB</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => setReceiptFile(e.target.files[0] || null)}
            />
          </div>
          {uploadExpense?.receiptUrl && (
            <p className="text-xs text-gray-500">
              Current receipt:{' '}
              <a href={uploadExpense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">view existing</a>
              {' '}— uploading will replace it.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setUploadOpen(false); setReceiptFile(null); }} className="btn-secondary">Cancel</button>
            <button
              disabled={!receiptFile || uploadMutation.isPending}
              onClick={() => uploadMutation.mutate({ id: uploadExpense.id, file: receiptFile })}
              className="btn-primary"
            >
              {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create / Edit Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Vendor *" placeholder="Amazon, Uber, etc." error={errors.vendor?.message} {...register('vendor')} />
            <Input label="Amount *" type="number" step="0.01" placeholder="0.00" error={errors.amount?.message} {...register('amount')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date *" type="date" error={errors.date?.message} {...register('date')} />
            <Select label="Currency" {...register('currency')}>
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" {...register('status')}>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </Select>
            <Select label="Category" {...register('categoryId')}>
              <option value="">Uncategorized</option>
              {categories?.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </Select>
          </div>
          <Input label="Description" placeholder="Optional details" {...register('description')} />
          <Textarea label="Notes" placeholder="Additional notes…" {...register('notes')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded border-gray-300 text-primary-600" {...register('isBillable')} />
              This expense is billable to a client
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded border-gray-300 text-primary-600" {...register('isReimbursed')} />
              This expense has been reimbursed
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving…' : editing ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
