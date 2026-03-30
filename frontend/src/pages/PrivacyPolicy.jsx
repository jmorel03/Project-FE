import PublicFooter from '../components/layout/PublicFooter';
import PublicNav from '../components/layout/PublicNav';
import useDocumentTitle from '../hooks/useDocumentTitle';

const sections = [
  {
    title: 'Information We Collect',
    body: 'We collect information you provide directly to Xpensist, including account details such as your name, email address, password, billing contact information, and any company profile information you enter in the app. We also process the invoice, client, expense, receipt, and financial workflow data you upload or create while using the service.',
  },
  {
    title: 'How We Use Information',
    body: 'We use your information to operate the platform, authenticate your account, deliver invoices and reminders, process subscriptions, provide customer support, secure the service, and improve product performance. We may also use service-related email addresses to send important notices about your account, billing, security, and product updates.',
  },
  {
    title: 'Payment and Billing Providers',
    body: 'Subscription payments are processed by third-party payment providers such as Stripe. Xpensist does not store full payment card numbers on its own servers. Billing providers receive the information required to process transactions, manage recurring subscriptions, and handle refunds or disputes.',
  },
  {
    title: 'File Storage and Email Delivery',
    body: 'Receipts, attachments, and related files may be stored with infrastructure providers such as Cloudflare R2. Invoice emails, reminder emails, and support emails may be delivered through third-party email providers. These processors act on our behalf to provide the service and are expected to protect data appropriately.',
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell your personal information. We share data only with service providers needed to operate Xpensist, to comply with legal obligations, to enforce our terms, or as part of a merger, acquisition, or asset sale. We may also disclose information when necessary to investigate fraud, abuse, or security incidents.',
  },
  {
    title: 'Data Retention',
    body: 'We retain account and service data for as long as needed to provide the service, comply with legal obligations, resolve disputes, and enforce our agreements. If you close your account, we may retain limited information for tax, accounting, fraud prevention, backup, and compliance purposes for a commercially reasonable period.',
  },
  {
    title: 'Security',
    body: 'We use reasonable administrative, technical, and organizational safeguards designed to protect your information. No system is completely secure, and you are responsible for maintaining the confidentiality of your credentials and using strong passwords and access controls within your organization.',
  },
  {
    title: 'Your Choices',
    body: 'You may update certain account information from within the product, and you can contact us to request account-related assistance. Depending on your location, you may have rights to access, correct, delete, or export certain personal information, subject to legal exceptions and identity verification.',
  },
  {
    title: 'International Processing',
    body: 'Your information may be processed and stored in countries other than your own, depending on the hosting, storage, and service providers used by Xpensist. By using the service, you understand that data may be transferred across borders as needed to operate the platform.',
  },
  {
    title: 'Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. If we make material changes, we will update the effective date and may provide additional notice through the product or by email where required. Continued use of Xpensist after the updated policy takes effect means the updated policy applies going forward.',
  },
];

export default function PrivacyPolicy() {
  useDocumentTitle('Xpensist | Privacy Policy');

  return (
    <div className="marketing-shell marketing-reveal overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_44%,_#f8fafc_100%)]">
      <PublicNav />

      <section className="pt-24 pb-10">
        <div className="marketing-wrap text-center">
          <span className="hero-chip mb-5">Privacy Policy</span>
          <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Privacy terms your customers and users can actually read.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600 sm:text-xl">
            Effective date: March 30, 2026. This policy explains what Xpensist collects, why it is collected, how it is used, and the choices available to account owners and end users.
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="marketing-wrap">
          <div className="rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-sm backdrop-blur sm:p-10">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                  Xpensist provides invoicing, expense tracking, reporting, and related workflow tools for businesses and independent operators. This Privacy Policy applies to information collected through the website, the application, customer support interactions, and related service operations. In these materials, Xpensist refers to the Xpensist business and service operator.
                </p>
              </div>

              {sections.map((section) => (
                <div key={section.title} className="border-t border-slate-200 pt-8 first:border-t-0 first:pt-0">
                  <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{section.body}</p>
                </div>
              ))}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Contact</h3>
                <p className="mt-2 text-sm leading-7 text-slate-700 sm:text-base">
                  For privacy-related questions or requests, contact Xpensist through the support form on the website or by email at support@xpensist.com. If you later establish a separate legal mailing address, add it here so the policy includes a physical business contact alongside the support email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}