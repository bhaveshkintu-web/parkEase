"use client";

import type { RedeemStep } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";

interface RedeemStepsProps {
  steps: RedeemStep[];
}

export function RedeemStepsCard({ steps }: RedeemStepsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">How to Redeem Your Reservation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {steps.map((step, index) => (
            <div key={step.step} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5 bg-border" />
              )}
              
              {/* Step Number */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {step.step}
              </div>
              
              {/* Content */}
              <div className="flex-1 pt-0.5">
                <h4 className="font-medium text-foreground">{step.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SpecialInstructionsProps {
  instructions: string[];
}

export function SpecialInstructionsCard({ instructions }: SpecialInstructionsProps) {
  if (!instructions || instructions.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-900 dark:text-amber-100">
          Important Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {instructions.map((instruction, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{instruction}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
