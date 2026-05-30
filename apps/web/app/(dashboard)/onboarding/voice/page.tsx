"use client";

import { useEffect, useState } from "react";
import { Play, Loader2, Sparkles } from "lucide-react";
import {
  agentTemplates,
  industryTemplateMap,
  templateSlugMap,
  retellDefaultVoices,
  elevenLabsVoices,
} from "@businessvoice/shared";
import { saveVoiceSelection } from "@/lib/actions/onboarding";
import { getBusiness } from "@/lib/actions/business";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useVoicePreview } from "@/lib/hooks/use-voice-preview";

export default function OnboardingVoicePage() {
  const [selected, setSelected] = useState(agentTemplates[0]);
  const [voiceProvider, setVoiceProvider] = useState<"retell" | "elevenlabs">("retell");
  const [selectedVoiceId, setSelectedVoiceId] = useState(retellDefaultVoices[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string>("general_smb");
  const { playPreview, playing, loading: previewLoading } = useVoicePreview();

  function getDefaultVoiceId(
    template: typeof selected,
    provider: "retell" | "elevenlabs"
  ) {
    return provider === "retell"
      ? template.voice.retell_voice_id
      : template.voice.elevenlabs_voice_id ?? elevenLabsVoices[0].voice_id;
  }

  useEffect(() => {
    getBusiness().then((b) => {
      if (b?.industry) {
        setIndustry(b.industry);
        const recommended = industryTemplateMap[b.industry];
        if (recommended) {
          setSelected(recommended);
          setSelectedVoiceId(recommended.voice.retell_voice_id);
        }
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("voice_provider", voiceProvider);
    formData.set("voice_id", selectedVoiceId);
    formData.set("template_slug", templateSlugMap[selected.agent_name] ?? "dexter");
    formData.set("agent_name", selected.agent_name);

    const result = await saveVoiceSelection(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const voices = voiceProvider === "retell" ? retellDefaultVoices : elevenLabsVoices;

  return (
    <OnboardingLayout
      currentStep={5}
      title="Choose your AI employee"
      description="Select a pre-trained agent and pick their voice."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-3">
          {agentTemplates.map((template) => (
            <Card
              key={template.agent_name}
              className={cn(
                "cursor-pointer transition-all",
                selected.agent_name === template.agent_name
                  ? "ring-2 ring-indigo-500 glow"
                  : "hover:bg-white/5"
              )}
              onClick={() => {
                setSelected(template);
                setSelectedVoiceId(getDefaultVoiceId(template, voiceProvider));
              }}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600">
                    {template.agent_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{template.agent_name}</p>
                  <p className="text-sm text-muted-foreground">{template.display.specialty}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {industry && industryTemplateMap[industry] && (
          <p className="text-sm text-muted-foreground">
            Recommended:{" "}
            <span className="text-indigo-400 font-medium">
              {industryTemplateMap[industry].agent_name}
            </span>
          </p>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">Voice provider</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={voiceProvider === "retell" ? "default" : "outline"}
              onClick={() => {
                setVoiceProvider("retell");
                setSelectedVoiceId(getDefaultVoiceId(selected, "retell"));
              }}
            >
              Retell Default
            </Button>
            <Button
              type="button"
              variant={voiceProvider === "elevenlabs" ? "default" : "outline"}
              onClick={() => {
                setVoiceProvider("elevenlabs");
                setSelectedVoiceId(getDefaultVoiceId(selected, "elevenlabs"));
              }}
              className="gap-1"
            >
              <Sparkles className="h-3.5 w-3.5" />
              ElevenLabs Premium
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {voices.map((voice) => {
            const id = "id" in voice ? voice.id : voice.voice_id;
            const name = voice.name;
            const isPremium = "is_premium" in voice && voice.is_premium;
            return (
              <Card
                key={id}
                className={cn(
                  "cursor-pointer transition-all",
                  selectedVoiceId === id ? "ring-2 ring-cyan-500" : "hover:bg-white/5"
                )}
                onClick={() => setSelectedVoiceId(id)}
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium text-sm">{name}</p>
                    {"description" in voice && (
                      <p className="text-xs text-muted-foreground">{voice.description}</p>
                    )}
                    {"category" in voice && (
                      <p className="text-xs text-muted-foreground">{voice.category}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isPremium && <Badge variant="secondary">Premium</Badge>}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreview(id);
                      }}
                      disabled={previewLoading}
                    >
                      {previewLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className={cn("h-4 w-4", playing && "text-cyan-400")} />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading}>
          {loading ? "Hiring..." : `Hire ${selected.agent_name}`}
        </Button>
      </form>
    </OnboardingLayout>
  );
}
