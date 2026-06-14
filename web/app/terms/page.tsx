import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto container-fluid py-10 sm:py-16">
      <p className="text-mute uppercase tracking-[0.3em] text-[10px] mb-3">Legal</p>
      <h1 className="font-display text-3xl sm:text-5xl tracking-tightest mb-8 font-semibold">Terms & Conditions</h1>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-mute">
        <p><strong className="text-[var(--fg)]">Effective date:</strong> Baisakh 1, 2081 B.S. (April 14, 2024)</p>
        <p>These terms govern the use of Sara Sansar (सारासंसार), a real estate listing platform operating under the jurisdiction of the Federal Democratic Republic of Nepal.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">1. Acceptance of Terms</h2>
        <p>By creating an account or using our services, you agree to these Terms in accordance with the <strong className="text-[var(--fg)]">Contract Act, 2056 (2000)</strong> of Nepal. If you do not agree, do not use the platform.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">2. Eligibility</h2>
        <p>Users must be at least 16 years old. Agents listing properties must: hold a valid Nepali citizenship or business registration, provide accurate contact information, and comply with the <strong className="text-[var(--fg)]">Land Act, 2021 B.S.</strong> and the <strong className="text-[var(--fg)]">Land Revenue Act, 2034 B.S.</strong> regarding property transactions.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">3. Property Listings</h2>
        <p>Agents are solely responsible for the accuracy of their listings including: property ownership verification (Lalpurja authenticity), accurate land measurements in standard Nepali units (Ropani, Aana, Paisa, Dam, Bigha, Katha, Dhur), correct pricing in Nepali Rupees, and truthful representation of property condition and amenities.</p>
        <p>Sara Sansar reserves the right to remove listings that: contain misleading information, violate Nepal's <strong className="text-[var(--fg)]">Consumer Protection Act, 2075 (2018)</strong>, advertise properties involved in legal disputes, or promote illegal land transactions including Guthi land sales.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">4. Agent Membership & Payments</h2>
        <p>Agent accounts include a 30-day free trial. After the trial, agents must subscribe to a paid plan to continue listing properties. Payments are processed through eSewa, Khalti, or bank transfer. All subscription fees are in Nepali Rupees and are subject to 13% VAT as per <strong className="text-[var(--fg)]">Nepal's Value Added Tax Act, 2052 (1996)</strong>.</p>
        <p>Refund policy: Subscriptions may be cancelled at any time. Refunds for unused portions are processed within 15 business days.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">5. Property Transactions</h2>
        <p>Sara Sansar is a listing platform only. We do not: act as a real estate broker (dalal), guarantee any property transaction, handle earnest money (bayana) or sale proceeds, or provide legal advice on property transfers. All property sales must follow Nepal's legal process: Lalpurja verification at the District Land Revenue Office, Chaar Killa verification, payment of registration fees and capital gains tax, and registration at the Land Revenue Office.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">6. Foreign Nationals</h2>
        <p>Under Nepal's <strong className="text-[var(--fg)]">Land Act</strong>, foreign nationals and foreign-owned companies are generally prohibited from purchasing land in Nepal. Listings viewable by foreign nationals are for informational purposes only. Long-term lease arrangements may be available under specific conditions regulated by the Department of Industry.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">7. Intellectual Property</h2>
        <p>All platform content, design, and branding are owned by Sara Sansar. Property photos uploaded by agents remain the intellectual property of the respective agents or property owners.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">8. Dispute Resolution</h2>
        <p>Disputes shall be resolved through mediation first. If mediation fails, disputes shall be settled through arbitration in Kathmandu under the <strong className="text-[var(--fg)]">Arbitration Act, 2055 (1999)</strong> of Nepal. The governing law is the law of the Federal Democratic Republic of Nepal.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">9. Limitation of Liability</h2>
        <p>Sara Sansar shall not be liable for: losses arising from property transactions conducted through contacts made on the platform, inaccurate information in listings provided by agents, service interruptions or data loss, or decisions made based on the EMI calculator, area converter, or other tools (which are for estimation only).</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">10. Contact</h2>
        <p>Legal inquiries: <a href="mailto:legal@sarasansar.np" className="text-emerald-600 hover:underline">legal@sarasansar.np</a><br />
        Office: Putalisadak, Kathmandu, Nepal 44600</p>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--line)]">
        <Link href="/privacy" className="text-sm text-emerald-600 hover:underline">Read our Privacy Policy →</Link>
      </div>
    </div>
  );
}
