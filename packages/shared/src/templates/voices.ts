import type { ElevenLabsVoice } from "../types";

export const elevenLabsVoices: ElevenLabsVoice[] = [
  {
    voice_id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    category: "Professional",
    is_premium: true,
  },
  {
    voice_id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    category: "Warm",
    is_premium: true,
  },
  {
    voice_id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    category: "Confident",
    is_premium: true,
  },
  {
    voice_id: "oWAxZDx7w5VEj9dCyTzz",
    name: "Grace",
    category: "Consultative",
    is_premium: true,
  },
];

export const retellDefaultVoices = [
  { id: "11labs-Adrian", name: "Adrian", description: "Professional male" },
  { id: "11labs-Rachel", name: "Rachel", description: "Friendly female" },
  { id: "11labs-Adam", name: "Adam", description: "Confident male" },
  { id: "11labs-Lily", name: "Lily", description: "Warm female" },
  { id: "11labs-Grace", name: "Grace", description: "Calm female" },
];

export const templateSlugMap: Record<string, string> = {
  Dexter: "dexter",
  Zia: "zia",
  Sparky: "sparky",
  Sunny: "sunny",
  Bella: "bella",
};
