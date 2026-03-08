import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X, LogOut, History, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const Navbar = () => {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">InsightPM</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {!loading && user ? (
            <>
              <Link to="/history">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <History className="w-4 h-4 mr-1" /> History
                </Button>
              </Link>
              <Link to="/monitor">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <Bell className="w-4 h-4 mr-1" /> Monitor
                </Button>
              </Link>
              <Link to="/analyze">
                <Button variant="hero" size="sm">New Analysis</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
              </Avatar>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm" className="text-muted-foreground">Sign in</Button></Link>
              <Link to="/analyze">
                <Button variant="hero" size="sm">Try Free</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-card border-border w-72">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col gap-4 mt-8">
                <a href="#features" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2">Features</a>
                <a href="#how-it-works" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2">How it works</a>
                <a href="#pricing" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2">Pricing</a>
                <div className="border-t border-border pt-4 mt-2 space-y-3">
                  {!loading && user ? (
                    <>
                      <Link to="/history" onClick={() => setOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                          <History className="w-4 h-4 mr-2" /> History
                        </Button>
                      </Link>
                      <Link to="/monitor" onClick={() => setOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                          <Bell className="w-4 h-4 mr-2" /> Monitor
                        </Button>
                      </Link>
                      <Link to="/analyze" onClick={() => setOpen(false)}>
                        <Button variant="hero" size="sm" className="w-full">New Analysis</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => { signOut(); setOpen(false); }} className="w-full justify-start text-muted-foreground">
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/auth" onClick={() => setOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">Sign in</Button>
                      </Link>
                      <Link to="/analyze" onClick={() => setOpen(false)}>
                        <Button variant="hero" size="sm" className="w-full">Try Free</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
