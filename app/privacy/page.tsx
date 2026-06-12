export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 text-sm text-[#d6e4f9] space-y-6">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="text-[#849585] text-xs">Last updated: June 2026</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Data We Collect</h2>
        <p>
          FPL Auction Hub accesses your Google account solely to create and
          write to a Google Sheet when you choose to export player data. We only
          request the{" "}
          <code className="text-[#00e478] text-[11px]">
            https://www.googleapis.com/auth/spreadsheets
          </code>{" "}
          scope — we cannot read, modify, or delete any other Google Drive
          content.
        </p>
        <p>
          We do not collect, store, or transmit your Google OAuth tokens to any
          server. The authentication flow runs entirely in your browser via the
          Google Identity Services library. The resulting access token is held
          in memory only for the current session and is discarded when you
          navigate away from the page or close the browser tab.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. FPL Data</h2>
        <p>
          Player statistics are fetched from the official Fantasy Premier League
          API. This is publicly available data. We cache it in a Supabase
          database to improve performance; no personal data is included in this
          cache.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Authentication</h2>
        <p>
          User accounts use Supabase Auth. We store only your email address and
          display name. Passwords are handled entirely by Supabase and are never
          accessible to us.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. Cookies & Local Storage</h2>
        <p>
          We use essential cookies for session management (Supabase Auth
          session). No local storage is used. Preferences such as column
          visibility and filter selections are held in memory only and reset
          when you leave the page. No third-party tracking cookies are used.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. Third-Party Services</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Supabase</strong> — database, authentication, and file
            storage.
          </li>
          <li>
            <strong>Vercel</strong> — hosting and serverless functions.
          </li>
          <li>
            <strong>Google Identity Services</strong> — OAuth for Google Sheets
            export.
          </li>
          <li>
            <strong>Fantasy Premier League</strong> — public player data API.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">6. Data Retention</h2>
        <p>
          We retain your account profile data for as long as your account is
          active. You may delete your account at any time through your profile
          settings, which will remove all associated personal data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">7. Contact</h2>
        <p>
          For questions about this policy or your data, contact us at{" "}
          <a
            href="mailto:thishantharuka4@gmail.com"
            className="text-[#00e478] hover:underline"
          >
            thishantharuka4@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
