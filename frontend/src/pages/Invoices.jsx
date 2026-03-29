import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { invoiceService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

const STATUSES = ['', 'DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'];

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function Invoices() {
  useDocumentTitle('Xpensist | Invoices');

  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkPending, setBulkPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { status, page }],
    queryFn: () => invoiceService.list({ status: status || undefined, page, limit: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: invoiceService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Delete failed'),
  });

  const invoices = data?.invoices || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const filtered = search
    ? invoices.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          i.client?.name.toLowerCase().includes(search.toLowerCase()),
      )
    : invoices;

  const selectedCount = selectedIds.length;
  const allFilteredSelected = filtered.length > 0 && filtered.every((inv) => selectedIds.includes(inv.id));

  useEffect(() => {
    const visibleIds = new Set(invoices.map((inv) => inv.id));
    setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [invoices]);

  function toggleInvoiceSelection(invoiceId) {
    setSelectedIds((prev) => (
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId]
    ));
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.some((inv) => inv.id === id)));
      return;
    }

    const filteredIds = filtered.map((inv) => inv.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  }

  async function runBulkAction(action) {
    if (selectedIds.length === 0 || bulkPending) return;

    const actionLabel = action === 'send'
      ? 'email and send'
      : action === 'mark-sent'
        ? 'mark as sent'
        : 'mark as draft';

    if (!window.confirm(`Apply '${actionLabel}' to ${selectedIds.length} selected invoice(s)?`)) return;

    setBulkPending(true);

    try {
      const operations = selectedIds.map((id) => {
        if (action === 'send') return invoiceService.send(id);
        if (action === 'mark-sent') return invoiceService.update(id, { status: 'SENT', sendNow: false });
        return invoiceService.update(id, { status: 'DRAFT' });
      });

      const results = await Promise.allSettled(operations);
      const succeeded = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        toast.success(`${succeeded} invoice(s) updated`);
      }
      if (failed > 0) {
        toast.error(`${failed} invoice(s) failed`);
      }

      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['invoices'] });
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <div className="page-reveal space-y-6">
      <div className="page-intro flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Track invoice status, send in bulk, and keep collections moving with less manual work.</p>
        </div>
        <Link to="/invoices/new" className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search invoices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <FunnelIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            className="input pl-9 pr-8"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s || 'All Statuses'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-shell">
        {selectedCount > 0 && (
          <div className="flex flex-col gap-2 border-b border-gray-100 bg-primary-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-primary-800">{selectedCount} selected</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-secondary py-1.5 px-3 text-xs"
                onClick={() => runBulkAction('mark-draft')}
                disabled={bulkPending}
              >
                Mark Draft
              </button>
              <button
                type="button"
                className="btn-secondary py-1.5 px-3 text-xs"
                onClick={() => runBulkAction('mark-sent')}
                disabled={bulkPending}
              >
                Mark Sent
              </button>
              <button
                type="button"
                className="btn-primary py-1.5 px-3 text-xs"
                onClick={() => runBulkAction('send')}
                disabled={bulkPending}
              >
                {bulkPending ? 'Processing…' : 'Send Now'}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No invoices found</p>
            <Link to="/invoices/new" className="btn-primary mt-4 inline-flex">Create your first invoice</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-row">
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    aria-label="Select all invoices"
                  />
                </th>
                <th className="table-head-cell px-6 py-3">Invoice</th>
                <th className="table-head-cell px-4 py-3">Client</th>
                <th className="table-head-cell px-4 py-3">Issue Date</th>
                <th className="table-head-cell px-4 py-3">Due Date</th>
                <th className="table-head-cell px-4 py-3">Status</th>
                <th className="table-head-cell px-6 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inv) => (
                <tr key={inv.id} className="table-row">
                  <td className="px-3 py-3.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={selectedIds.includes(inv.id)}
                      onChange={() => toggleInvoiceSelection(inv.id)}
                      aria-label={`Select invoice ${inv.invoiceNumber}`}
                    />
                  </td>
                  <td className="px-6 py-3.5">
                    <Link to={`/invoices/${inv.id}`} className="font-medium text-primary-600 hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700">{inv.client?.name}</td>
                  <td className="px-4 py-3.5 text-gray-500">{format(new Date(inv.issueDate), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3.5 text-gray-500">{format(new Date(inv.dueDate), 'MMM dd, yyyy')}</td>
                  <td className="px-4 py-3.5"><Badge status={inv.status} /></td>
                  <td className="px-6 py-3.5 text-right font-semibold text-gray-800">{fmt(inv.total, inv.currency)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/invoices/${inv.id}/edit`} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(inv)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
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

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Invoice"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete {deleteTarget?.invoiceNumber || 'this invoice'}? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete Invoice'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
