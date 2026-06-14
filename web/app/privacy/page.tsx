import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto container-fluid py-10 sm:py-16">
      <p className="text-mute uppercase tracking-[0.3em] text-[10px] mb-3">Legal</p>
      <h1 className="font-display text-3xl sm:text-5xl tracking-tightest mb-8 font-semibold">Privacy Policy</h1>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-mute">
        <p><strong className="text-[var(--fg)]">Effective date:</strong> Baisakh 1, 2081 B.S. (April 14, 2024)</p>
        <p>Sara Sansar (सारासंसार), operated under the laws of the Federal Democratic Republic of Nepal, is committed to protecting the privacy of its users in compliance with the <strong className="text-[var(--fg)]">Electronic Transaction Act, 2063 (2008)</strong> and the <strong className="text-[var(--fg)]">Individual Privacy Act, 2075 (2018)</strong>.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">1. Information We Collect</h2>
        <p><strong className="text-[var(--fg)]">Account information:</strong> Email address, full name, phone number (Nepal mobile format +977-9XXXXXXXXX) provided during registration.</p>
        <p><strong className="text-[var(--fg)]">Property listings:</strong> Property details, photos, location coordinates, pricing information submitted by registered agents.</p>
        <p><strong className="text-[var(--fg)]">Usage data:</strong> Pages visited, search filters applied, properties saved or compared. We do not track browsing activity outside our platform.</p>
        <p><strong className="text-[var(--fg)]">Cookies:</strong> Authentication tokens (httpOnly secure cookies) for session management. We do not use third-party advertising cookies.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">2. How We Use Your Data</h2>
        <p>Your data is used exclusively for: providing and improving our real estate platform services, authenticating your identity, facilitating communication between buyers and agents, and complying with legal obligations under Nepali law.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">3. Data Sharing</h2>
        <p>We do not sell, rent, or trade your personal information. Data may be shared with: registered agents (limited contact info for property inquiries), payment processors (eSewa, Khalti, or banking partners — for agent subscriptions only), and government authorities when required by law under the <strong className="text-[var(--fg)]">Nepal Rastra Bank regulations</strong> or court orders.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">4. Data Security</h2>
        <p>We implement industry-standard security measures including: encrypted HTTPS connections (TLS 1.2+), httpOnly secure cookies for authentication, CSRF protection on all form submissions, rate-limited API endpoints to prevent abuse, and password hashing using PBKDF2-SHA256.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">5. Property Data & Land Records</h2>
        <p>Property listings on Sara Sansar are submitted by registered agents and are for informational purposes only. We do not guarantee the accuracy of: land area measurements (Ropani/Aana/Bigha), ownership (Lalpurja) status, municipal zoning classifications, or bank loan eligibility claims. Users must independently verify all property details through the relevant <strong className="text-[var(--fg)]">District Land Revenue Office (Malpot Karyalaya)</strong> before any transaction.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">6. Your Rights</h2>
        <p>Under Nepal's privacy legislation, you have the right to: access your personal data, request correction of inaccurate data, request deletion of your account and associated data, and withdraw consent for data processing at any time. Contact us at <a href="mailto:privacy@sarasansar.np" className="text-emerald-600 hover:underline">privacy@sarasansar.np</a>.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">7. Data Retention</h2>
        <p>Account data is retained while your account is active. Property listings may be retained for up to 1 year after deactivation for legal record-keeping. You may request full deletion at any time.</p>

        <h2 className="font-display text-xl text-[var(--fg)] mt-8 mb-3">8. Contact</h2>
        <p>Data Protection Officer: Sara Sansar Privacy Team<br />
        Email: <a href="mailto:privacy@sarasansar.np" className="text-emerald-600 hover:underline">privacy@sarasansar.np</a><br />
        Office: Putalisadak, Kathmandu, Nepal 44600</p>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--line)]">
        <Link href="/terms" className="text-sm text-emerald-600 hover:underline">Read our Terms & Conditions →</Link>
      </div>
    </div>
  );
}
