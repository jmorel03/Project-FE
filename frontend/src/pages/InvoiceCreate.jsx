import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { invoiceService, clientService } from '../services/api';
import Input, { Select, Textarea } from '../components/ui/Input';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const itemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.coerce.number().min(0.01),
  unitPrice: z.coerce.number().min(0),
});

const schema = z.object({
  clientId: z.string().uuid('Select a client'),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.string().default('USD'),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discountRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export default function InvoiceCreate() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const { data: clientsData } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientService.list({ limit: 200 }),
  });

  const { data: invoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.get(id),
    enabled: isEditing,
  });

  const { register, control, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'USD',
      taxRate: 0,
      discountRate: 0,
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (invoice) {
      reset({
        clientId: invoice.clientId,
        dueDate: format(new Date(invoice.dueDate), 'yyyy-MM-dd'),
        currency: invoice.currency,
        taxRate: Number(invoice.taxRate),
        discountRate: Number(invoice.discountRate),
        notes: invoice.notes || '',
        terms: invoice.terms || '',
        items: invoice.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
    }
  }, [invoice, reset]);

  const mutation = useMutation({
    mutationFn: (data) => isEditing ? invoiceService.update(id, data) : invoiceService.create(data),
    onSuccess: (data) => {
      toast.success(isEditing ? 'Invoice updated' : 'Invoice created');
      navigate(`/invoices/${data.id}`);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to save invoice'),
  });

  const watchedItems = watch('items') || [];
  const watchedTaxRate = watch('taxRate') || 0;
  const watchedDiscountRate = watch('discountRate') || 0;

  const subtotal = watchedItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const discountAmt = subtotal * (watchedDiscountRate / 100);
  const taxAmt = (subtotal - discountAmt) * (watchedTaxRate / 100);
  const total = subtotal - discountAmt + taxAmt;

  const clients = clientsData?.clients || [];

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="page-title">{isEditing ? 'Edit Invoice' : 'New Invoice'}</h1>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        {/* Client + Dates */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Invoice Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Select label="Client *" error={errors.clientId?.message} {...register('clientId')}>
                <option value="">Select a client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <Input label="Due Date *" type="date" error={errors.dueDate?.message} {...register('dueDate')} />
            <Select label="Currency" {...register('currency')}>
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </div>
        </div>

        {/* Line Items */}
        <div className="card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Line Items</h2>
          {errors.items?.root && (
            <p className="text-sm text-red-600">{errors.items.root.message}</p>
          )}

          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wide pb-1 border-b border-gray-100">
            <div className="col-span-6">Description</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1" />
          </div>

          {fields.map((field, idx) => {
            const q = Number(watch(`items.${idx}.quantity`)) || 0;
            const p = Number(watch(`items.${idx}.unitPrice`)) || 0;
            return (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-12 sm:col-span-6">
                  <Input
                    placeholder="Description"
                    error={errors.items?.[idx]?.description?.message}
                    {...register(`items.${idx}.description`)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1"
                    error={errors.items?.[idx]?.quantity?.message}
                    {...register(`items.${idx}.quantity`)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    error={errors.items?.[idx]?.unitPrice?.message}
                    {...register(`items.${idx}.unitPrice`)}
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 flex items-center justify-end h-[38px]">
                  <span className="text-sm font-medium text-gray-700">{fmt(q * p)}</span>
                </div>
                <div className="col-span-1 flex items-center justify-end h-[38px]">
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    disabled={fields.length === 1}
                    className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
            className="btn-secondary text-xs py-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>

        {/* Totals + Tax + Discount */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Adjustments</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tax Rate (%)" type="number" step="0.01" min="0" max="100" {...register('taxRate')} />
              <Input label="Discount (%)" type="number" step="0.01" min="0" max="100" {...register('discountRate')} />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount ({watchedDiscountRate}%)</span>
                  <span className="text-green-600">-{fmt(discountAmt)}</span>
                </div>
              )}
              {taxAmt > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({watchedTaxRate}%)</span><span>{fmt(taxAmt)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-100 pt-2 mt-2">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes / Terms */}
        <div className="card p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Textarea label="Notes" placeholder="Payment instructions, thank you note, etc." {...register('notes')} />
          <Textarea label="Terms & Conditions" placeholder="Net 30, late fees, etc." {...register('terms')} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving…' : isEditing ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
