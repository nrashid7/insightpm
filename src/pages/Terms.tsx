import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const Terms = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <Navbar />
    <main className="flex-1 container mx-auto px-6 pt-24 pb-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-6">Terms of Service</h1>
      <div className="prose prose-invert max-w-none space-y-4 text-muted-foreground text-sm leading-relaxed">
        <p><strong>Last updated:</strong> May 30, 2026</p>
        <p>
          By using InsightPM, you agree to these Terms. If you do not agree, do not use the service.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Service</h2>
        <p>
          InsightPM provides AI-assisted product intelligence by aggregating publicly available feedback and generating insights.
          Results are informational and not guaranteed to be accurate or complete.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Accounts and subscriptions</h2>
        <p>
          Paid plans are billed monthly through Stripe. Fees are non-refundable except where required by law.
          Plan limits (analyses per month, data sources, monitoring) are described on our pricing page and enforced in the product.
          You may cancel anytime via the billing portal; access continues until the end of the paid period.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Acceptable use</h2>
        <p>
          You may not abuse the API, scrape the service, resell access without permission, submit unlawful content,
          or use the product to harass or defame others. We may suspend accounts that violate these terms.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Intellectual property</h2>
        <p>
          You retain rights to data you submit. We retain rights to the platform, branding, and aggregated anonymized usage statistics.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Limitation of liability</h2>
        <p>
          The service is provided &quot;as is&quot;. To the maximum extent permitted by law, InsightPM is not liable for indirect,
          incidental, or consequential damages arising from use of the product.
        </p>
        <h2 className="text-lg font-semibold text-foreground pt-4">Contact</h2>
        <p>legal@insightpm.app</p>
      </div>
    </main>
    <Footer />
  </div>
);

export default Terms;
