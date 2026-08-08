import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Analyze", href: "/analyze", isRoute: true },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy", isRoute: true },
    { label: "Terms of Service", href: "/terms", isRoute: true },
  ],
};

const Footer = () => {
  return (
    <footer className="border-t border-border py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="text-lg font-bold text-foreground">InsightPM</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
              AI-powered product intelligence that helps you understand what users want and build better products.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.isRoute ? (
                      <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2026 InsightPM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
