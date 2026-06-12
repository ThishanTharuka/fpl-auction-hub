export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 text-sm text-[#d6e4f9] space-y-6">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="text-[#849585] text-xs">Last updated: June 2026</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Acceptance</h2>
        <p>
          By using FPL Auction Hub, you agree to these Terms. If you do not
          agree, do not use the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Description</h2>
        <p>
          FPL Auction Hub provides tools for Fantasy Premier League managers to
          view player data, build custom auction leagues, conduct auctions using
          imaginary credit, create teams for those leagues, and export
          information to Google Sheets. It is an independent third-party tool
          and is not affiliated with the Premier League or Fantasy Premier
          League.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          account credentials. You may delete your account at any time via the
          profile settings page.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. Google Sheets Export</h2>
        <p>
          The Google Sheets export feature uses the OAuth 2.0 protocol to
          request permission to create and write to a spreadsheet in your Google
          Drive. The minimum required scope is used, and no other Google Drive
          data is accessed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. Limitation of Liability</h2>
        <p>
          FPL Auction Hub is provided &quot;as is&quot; without warranty of any
          kind. We are not liable for any damages arising from your use of the
          service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">6. Changes</h2>
        <p>
          We may update these Terms at any time. Continued use after changes
          constitutes acceptance of the new Terms.
        </p>
      </section>
    </div>
  );
}
