import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="bg-slate-900 px-4 py-8 text-slate-400 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p>&copy; 2026 Xpensist. Invoicing and expense operations, without the spreadsheet drift.</p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-300 sm:justify-end">
          <Link to="/privacy" className="transition hover:text-white">
            Privacy Policy
          </Link>
          <Link to="/terms" className="transition hover:text-white">
            Terms of Service
          </Link>
          <Link to="/contact-support" className="transition hover:text-white">
            Contact Support
          </Link>
        </div>
      </div>
    </footer>
  );
}