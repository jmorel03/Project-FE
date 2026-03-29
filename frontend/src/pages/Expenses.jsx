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
  isBillable: z.boolean().default(false),
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
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadExpense, setUploadExpense] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const fileInputRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { page, search }],
    queryFn: () => expenseService.list({ page, limit: 20, search: search || undefined }),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getCategories,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const openCreate = () => { setEditing(null); reset({ currency: 'USD', date: format(new Date(), 'yyyy-MM-dd'), isBillable: false }); setOpen(true); };
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
      isBillable: exp.isBillable,
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

  const expenses = data?.expenses || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Expenses</h1>
        <button onClick={openCreate} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search expenses…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
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
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
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
                  <td className="px-6 py-3.5 text-right font-semibold text-gray-800">{fmt(exp.amount, exp.currency)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
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
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
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
          <Select label="Category" {...register('categoryId')}>
            <option value="">Uncategorized</option>
            {categories?.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </Select>
          <Input label="Description" placeholder="Optional details" {...register('description')} />
          <Textarea label="Notes" placeholder="Additional notes…" {...register('notes')} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="rounded border-gray-300 text-primary-600" {...register('isBillable')} />
            This expense is billable to a client
          </label>
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
