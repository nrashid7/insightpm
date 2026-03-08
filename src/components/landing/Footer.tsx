import { Zap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <Zap className="w-3 h-3 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">InsightPM</span>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 InsightPM. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
