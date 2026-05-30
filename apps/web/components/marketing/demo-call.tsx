"use client";

import { motion } from "framer-motion";
import { Phone, Mic, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agentTemplates } from "@businessvoice/shared";

export function DemoCall() {
  const [phone, setPhone] = useState("");
  const [agent, setAgent] = useState(agentTemplates[0].agent_name);
  const [status, setStatus] = useState<"idle" | "calling" | "done">("idle");

  const handleDemo = () => {
    if (!phone) return;
    setStatus("calling");
    setTimeout(() => setStatus("done"), 3000);
  };

  return (
    <section id="demo" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />
      <div className="relative mx-auto max-w-3xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold">
            Hear It <span className="gradient-text">Live</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Enter your number and get a demo call from one of our AI employees in seconds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <Card className="glow-accent">
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center glow">
                    <Phone className="h-10 w-10 text-white" />
                  </div>
                  {status === "calling" && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-cyan-400"
                      animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Your Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Choose an AI Employee</Label>
                  <Select value={agent} onValueChange={setAgent}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {agentTemplates.map((t) => (
                        <SelectItem key={t.agent_name} value={t.agent_name}>
                          {t.agent_name} — {t.display.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={handleDemo}
                disabled={status === "calling" || !phone}
              >
                {status === "idle" && (
                  <>
                    <Mic className="mr-2" />
                    Start Demo Call
                  </>
                )}
                {status === "calling" && "Calling..."}
                {status === "done" && (
                  <>
                    <Volume2 className="mr-2" />
                    Call Initiated!
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Demo calls are free. Standard messaging rates may apply.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
