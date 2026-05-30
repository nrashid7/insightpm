import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-mesh min-h-screen">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
