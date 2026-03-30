import PublicFooter from '../components/layout/PublicFooter';
import PublicNav from '../components/layout/PublicNav';
import useDocumentTitle from '../hooks/useDocumentTitle';

const sections = [
  {
    title: 'Use of the Service',
    body: 'You may use Xpensist only in compliance with applicable laws and these Terms. You are responsible for your account, your users, your data, and all activity that occurs under your credentials. You may not use the service to violate law, infringe intellectual property rights, transmit malware, attempt unauthorized access, or interfere with platform performance or security.',
  },
  {
    title: 'Accounts and Security',
    body: 'You must provide accurate registration information and keep it current. You are responsible for maintaining the confidentiality of your login credentials and for restricting access to your devices and internal systems. Notify Xpensist promptly if you suspect unauthorized access or a security incident affecting your account.',
  },
  {
    title: 'Customer Data',
    body: 'You retain ownership of the business data, invoices, expenses, contacts, files, and other content you submit to Xpensist. You grant Xpensist the limited rights necessary to host, process, transmit, back up, and display that data solely for the purpose of operating and supporting the service.',
  },
  {
    title: 'Subscriptions and Billing',
    body: 'Paid features may be offered on a subscription basis. Fees, billing intervals, plan limits, and included features are presented at the time of purchase. Unless stated otherwise, subscriptions renew automatically until canceled. Payment processing is handled by third-party billing providers, and your use of those providers may also be subject to their terms and privacy notices. Unless a different offer is stated at checkout or required by law, Xpensist offers refunds for initial paid plan charges requested within 14 days of purchase.',
  },
  {
    title: 'Suspension and Termination',
    body: 'Xpensist may suspend or terminate access if you violate these Terms, create legal or security risk, fail to pay applicable fees, or misuse the service. You may stop using the service at any time. Upon termination, access to the service may end immediately, though certain provisions of these Terms will survive by their nature, including payment obligations, disclaimers, liability limits, and dispute provisions.',
  },
  {
    title: 'Intellectual Property',
    body: 'Xpensist and its related software, design, trademarks, documentation, and content are owned by Xpensist or its licensors and are protected by applicable intellectual property laws. These Terms do not transfer ownership of the service to you and grant only a limited, revocable right to use the service during an active subscription or permitted access period.',
  },
  {
    title: 'Availability and Changes',
    body: 'Xpensist may modify, update, or discontinue features from time to time. While we aim to keep the service reliable and available, we do not guarantee uninterrupted operation, specific uptime levels, or that the service will always be free from errors, delays, or compatibility issues.',
  },
  {
    title: 'Disclaimers',
    body: 'The service is provided on an as-is and as-available basis to the maximum extent permitted by law. Xpensist disclaims all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement. Xpensist does not provide legal, tax, accounting, or regulatory advice, and you are responsible for reviewing invoices, taxes, notices, and compliance obligations with qualified advisors.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the maximum extent permitted by law, Xpensist will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, goodwill, or business interruption arising from or related to the service. If liability cannot be excluded, Xpensist total liability will not exceed the amount you paid to Xpensist for the service during the 12 months before the event giving rise to the claim.',
  },
  {
    title: 'Disputes and Governing Law',
    body: 'These Terms are governed by the laws of the Commonwealth of Massachusetts, without regard to conflict-of-law rules. Before either party files a formal legal claim, the parties agree to first attempt to resolve the dispute through good-faith mediation. If mediation does not resolve the dispute, either party may bring the matter in the state or federal courts located in Massachusetts, and each party consents to that venue and jurisdiction.',
  },
  {
    title: 'Changes to These Terms',
    body: 'We may revise these Terms from time to time. If changes are material, we will update the effective date and may provide additional notice where appropriate. By continuing to use Xpensist after updated Terms become effective, you agree to the revised Terms.',
  },
];

export default function TermsOfService() {
  useDocumentTitle('Xpensist | Terms of Service');

  return (
    <div className="marketing-shell marketing-reveal overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_44%,_#f8fafc_100%)]">
      <PublicNav />

      <section className="pt-24 pb-10">
        <div className="marketing-wrap text-center">
          <span className="hero-chip mb-5">Terms of Service</span>
          <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Clear terms for using Xpensist.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600 sm:text-xl">
            Effective date: March 30, 2026. These Terms govern access to the Xpensist website, application, and related services.
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="marketing-wrap">
          <div className="rounded-[28px] border border-slate-200 bg-white/95 p-7 shadow-sm backdrop-blur sm:p-10">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Agreement</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                  By creating an account, accessing the website, or using any part of Xpensist, you agree to these Terms of Service. If you use the service on behalf of a company or organization, you represent that you have authority to bind that entity to these Terms. In these Terms, Xpensist refers to the Xpensist business and service operator.
                </p>
              </div>

              {sections.map((section) => (
                <div key={section.title} className="border-t border-slate-200 pt-8 first:border-t-0 first:pt-0">
                  <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{section.body}</p>
                </div>
              ))}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Contact and Legal Notice</h3>
                <p className="mt-2 text-sm leading-7 text-slate-700 sm:text-base">
                  Questions about these Terms can be sent through the support form or to support@xpensist.com. If you later operate through a registered legal entity name that differs from Xpensist or maintain a separate mailing address, update this section and the agreement text so the published version reflects that exact legal information.
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