import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap, Bell, Plus, Trash2, Play, Pause, RefreshCw, AlertTriangle,
  TrendingUp, TrendingDown, Layers, MessageSquare, LogOut, History, Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface MonitoredProduct {
  id: string;
  product_name: string;
  website: string | null;
  competitors: string | null;
  frequency: "daily" | "weekly";
  last_run_at: string | null;
  next_run_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface MonitoringAlert {
  id: string;
  product_id: string;
  alert_type: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

const Monitor = () => {
  const [products, setProducts] = useState<MonitoredProduct[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", website: "", competitors: "", frequency: "daily" });
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true);
    const [{ data: prods }, { data: alrts }] = await Promise.all([
      supabase.from("monitored_products").select("*").order("created_at", { ascending: false }),
      supabase.from("monitoring_alerts").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setProducts((prods as MonitoredProduct[]) || []);
    setAlerts((alrts as MonitoringAlert[]) || []);
    setIsLoading(false);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !user) return;

    const nextRun = new Date();
    if (newProduct.frequency === "daily") {
      nextRun.setDate(nextRun.getDate() + 1);
    } else {
      nextRun.setDate(nextRun.getDate() + 7);
    }

    const { error } = await supabase.from("monitored_products").insert({
      user_id: user.id,
      product_name: newProduct.name.trim(),
      website: newProduct.website.trim() || null,
      competitors: newProduct.competitors.trim() || null,
      frequency: newProduct.frequency,
      next_run_at: nextRun.toISOString(),
    });

    if (error) {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product added to monitoring" });
      setIsAddingOpen(false);
      setNewProduct({ name: "", website: "", competitors: "", frequency: "daily" });
      loadData();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from("monitored_products").update({ is_active: !isActive }).eq("id", id);
    if (!error) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !isActive } : p)));
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("monitored_products").delete().eq("id", id);
    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Product removed from monitoring" });
    }
  };

  const markAlertRead = async (id: string) => {
    await supabase.from("monitoring_alerts").update({ is_read: true }).eq("id", id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "sentiment_shift": return <TrendingDown className="w-4 h-4" />;
      case "new_top_complaint": return <AlertTriangle className="w-4 h-4" />;
      case "volume_change": return <TrendingUp className="w-4 h-4" />;
      case "new_cluster": return <Layers className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "sentiment_shift": return "text-destructive";
      case "new_top_complaint": return "text-accent";
      case "volume_change": return "text-chart-4";
      case "new_cluster": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border h-14 flex items-center px-4 sm:px-6 glass sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 mr-4 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-bold text-foreground hidden sm:inline">InsightPM</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/history">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <History className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">History</span>
            </Button>
          </Link>
          <Link to="/analyze">
            <Button variant="ghost" size="sm" className="text-muted-foreground">New Analysis</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
        <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Product Monitoring
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track products and get alerted when sentiment or feedback changes
            </p>
          </div>

          <Dialog open={isAddingOpen} onOpenChange={setIsAddingOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Product to Monitor</DialogTitle>
                <DialogDescription>
                  We'll automatically analyze this product on your chosen schedule and alert you to changes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g. Notion"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website (optional)</Label>
                  <Input
                    value={newProduct.website}
                    onChange={(e) => setNewProduct({ ...newProduct, website: e.target.value })}
                    placeholder="https://notion.so"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Competitors (optional)</Label>
                  <Input
                    value={newProduct.competitors}
                    onChange={(e) => setNewProduct({ ...newProduct, competitors: e.target.value })}
                    placeholder="Coda, Obsidian"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={newProduct.frequency} onValueChange={(v) => setNewProduct({ ...newProduct, frequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingOpen(false)}>Cancel</Button>
                <Button variant="hero" onClick={handleAddProduct} disabled={!newProduct.name.trim()}>
                  Start Monitoring
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Monitored Products */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                Monitored Products ({products.length})
              </h2>
              {products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No products being monitored yet.</p>
                  <Button variant="link" size="sm" onClick={() => setIsAddingOpen(true)}>
                    Add your first product
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <motion.div
                      key={product.id}
                      className="rounded-xl border border-border bg-card/50 p-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground truncate">{product.product_name}</span>
                            <Badge variant={product.is_active ? "default" : "secondary"} className="text-[10px]">
                              {product.is_active ? "Active" : "Paused"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {product.frequency}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {product.last_run_at
                              ? `Last run: ${new Date(product.last_run_at).toLocaleDateString()}`
                              : "Not yet run"}
                            {product.next_run_at && product.is_active && (
                              <> · Next: {new Date(product.next_run_at).toLocaleDateString()}</>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleActive(product.id, product.is_active)}
                          >
                            {product.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Alerts */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                Alerts
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{unreadCount} new</Badge>
                )}
              </h2>
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No alerts yet. They'll appear here when changes are detected.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {alerts.map((alert) => {
                    const product = products.find((p) => p.id === alert.product_id);
                    return (
                      <motion.div
                        key={alert.id}
                        className={`rounded-lg border p-3 ${alert.is_read ? "border-border bg-card/30" : "border-primary/30 bg-primary/5"}`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${getAlertColor(alert.alert_type)}`}>
                            {getAlertIcon(alert.alert_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{alert.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {product && (
                                <Badge variant="outline" className="text-[10px]">{product.product_name}</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(alert.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {!alert.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => markAlertRead(alert.id)}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Monitor;
