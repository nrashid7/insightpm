"use client";

import { motion } from "framer-motion";
import type { AgentTemplateConfig } from "@businessvoice/shared";
import { MarketingAgentCard } from "./agent-card";

interface AgentShowcaseProps {
  templates: AgentTemplateConfig[];
}

export function AgentShowcase({ templates }: AgentShowcaseProps) {
  return (
    <section id="agents" className="py-24 relative">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            Meet Your <span className="gradient-text">AI Team</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Pre-trained AI employees ready to work for your business. Pick one, customize, and go live in minutes.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template, i) => (
            <MarketingAgentCard key={template.agent_name} template={template} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
