"use client";

import { motion } from "framer-motion";
import { Play, Check, Loader2 } from "lucide-react";
import type { AgentTemplateConfig } from "@businessvoice/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useVoicePreview } from "@/lib/hooks/use-voice-preview";
import { cn } from "@/lib/utils";

interface MarketingAgentCardProps {
  template: AgentTemplateConfig;
  index: number;
}

const avatarColors: Record<string, string> = {
  Dexter: "from-blue-500 to-indigo-600",
  Zia: "from-pink-500 to-rose-600",
  Sparky: "from-amber-500 to-orange-600",
  Sunny: "from-yellow-400 to-amber-500",
  Bella: "from-violet-500 to-purple-600",
};

export function MarketingAgentCard({ template, index }: MarketingAgentCardProps) {
  const { display, agent_name, voice } = template;
  const gradient = avatarColors[agent_name] || "from-indigo-500 to-violet-600";
  const { playPreview, playing, loading } = useVoicePreview();
  const previewVoiceId = voice.elevenlabs_voice_id ?? voice.retell_voice_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="h-full hover:glow transition-shadow duration-300 group">
        <CardHeader>
          <div className="flex items-start justify-between">
            <Avatar className="h-14 w-14">
              <AvatarFallback className={`bg-gradient-to-br ${gradient} text-lg`}>
                {agent_name[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-70 group-hover:opacity-100 transition-opacity"
              onClick={() => playPreview(previewVoiceId, `Hi, I'm ${agent_name}. ${display.tagline}`)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className={cn("h-4 w-4", playing && "text-cyan-400")} />
              )}
            </Button>
          </div>
          <CardTitle className="mt-4">{agent_name}</CardTitle>
          <Badge variant="secondary">{display.specialty}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground italic">&ldquo;{display.tagline}&rdquo;</p>
          <p className="text-sm">{display.description}</p>
          <ul className="space-y-2">
            {display.features.slice(0, 3).map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {display.industries.map((ind) => (
              <Badge key={ind} variant="outline" className="text-xs">
                {ind}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
