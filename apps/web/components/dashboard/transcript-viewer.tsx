"use client";

import type { CallTranscript } from "@businessvoice/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TranscriptViewerProps {
  transcript: CallTranscript;
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  return (
    <div className="space-y-6">
      {transcript.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Call Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{transcript.summary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transcript</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {transcript.transcript.map((entry, i) => {
            const isAgent = entry.role === "agent" || entry.role === "assistant";
            return (
              <div
                key={i}
                className={cn("flex gap-3", !isAgent && "flex-row-reverse")}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-xs",
                      isAgent
                        ? "bg-gradient-to-br from-indigo-500 to-violet-600"
                        : "bg-white/10"
                    )}
                  >
                    {isAgent ? "AI" : "C"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                    isAgent ? "glass" : "bg-white/5"
                  )}
                >
                  <Badge variant="outline" className="mb-1 text-xs capitalize">
                    {entry.role}
                  </Badge>
                  <p>{entry.content}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
