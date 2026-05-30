"use client";

import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Business", href: "/onboarding/business" },
  { id: 2, label: "Knowledge", href: "/onboarding/knowledge" },
  { id: 3, label: "Calendar", href: "/onboarding/calendar" },
  { id: 4, label: "Call Prefs", href: "/onboarding/call-preferences" },
  { id: 5, label: "Voice", href: "/onboarding/voice" },
];

interface OnboardingLayoutProps {
  currentStep: number;
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function OnboardingLayout({
  currentStep,
  children,
  title,
  description,
}: OnboardingLayoutProps) {
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-mesh flex flex-col">
      <header className="border-b border-border glass-strong">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="mb-6" />
          <nav className="flex justify-between">
            {steps.map((step) => (
              <Link
                key={step.id}
                href={step.href}
                className={cn(
                  "text-xs sm:text-sm font-medium transition-colors",
                  step.id === currentStep
                    ? "text-indigo-400"
                    : step.id < currentStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {step.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="mt-2 text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="glass-card rounded-2xl p-8">{children}</div>
      </main>
    </div>
  );
}
