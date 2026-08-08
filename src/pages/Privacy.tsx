import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Privacy = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <Navbar />
    <main className="flex-1 container mx-auto px-6 pt-24 pb-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
      <div className="prose prose-invert max-w-none space-y-4 text-muted-foreground text-sm leading-relaxed">
        <p><strong>Last updated:</strong> May 30, 2026</p>
        <p>
          InsightPM (&quot;we&quot;, &quot;us&quot;) operates the InsightPM web application at insightpm.app.
          This policy describes how we collect, use, and protect your information.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Information we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account data: email, name, and authentication identifiers via Supabase Auth.</li>
          <li>Product analyses you submit: product names, URLs, competitor names, and analysis results.</li>
          <li>Payment data: processed by Stripe; we store subscription status and plan tier, not full card numbers.</li>
          <li>Usage data: page views and product events via Google Analytics when enabled.</li>
          <li>Technical logs: errors may be sent to Sentry when configured.</li>
        </ul>
        <h2 className="text-lg font-semibold text-foreground pt-4">How we use information</h2>
        <p>
          We use your data to provide product intelligence analyses, save your history, run scheduled monitoring,
          process subscriptions, improve the service, and prevent abuse.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Third-party services</h2>
        <p>
          We use Supabase (hosting and database), Stripe (billing), Lovable AI Gateway (analysis),
          Firecrawl and public APIs (feedback collection), and optional analytics providers.
          Each has its own privacy policy.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Data retention</h2>
        <p>
          Saved analyses remain until you delete them. Unlinked feedback items may be removed after 90 days per our retention policy.
          You may request account deletion by contacting support.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Your rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, or export your personal data.
          Contact us at privacy@insightpm.app for requests.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Contact</h2>
        <p>privacy@insightpm.app</p>
      </div>
    </main>
    <Footer />
  </div>
);

export default Privacy;
