import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Xpensist | Page Not Found');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <ExclamationTriangleIcon className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-4xl font-black text-slate-900">404</h1>
        <p className="mt-3 text-lg font-semibold text-slate-900">Page not found</p>
        <p className="mt-2 text-sm text-slate-600">
          The page you're looking for doesn't exist. Let's get you back on track.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-primary-700"
          >
            Back to Home
          </Link>
          <Link
            to="/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
