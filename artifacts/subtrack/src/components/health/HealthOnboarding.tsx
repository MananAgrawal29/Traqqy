import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface HealthPreferences {
  monthlyBudget: number | null;
  spendingFeeling: "too_much" | "about_right" | "could_spend_more" | null;
  priorityCategories: string[];
  completedOnboarding: boolean;
}

interface HealthOnboardingProps {
  open: boolean;
  onClose: () => void;
  onComplete: (prefs: HealthPreferences) => void;
  existingPrefs?: HealthPreferences | null;
  isEditing?: boolean;
}

const CATEGORIES = [
  "Entertainment",
  "Productivity",
  "Learning",
  "Music & Video",
  "Cloud & Storage",
  "Developer Tools",
  "News & Media",
  "Health & Fitness",
  "Finance",
  "Other",
];

export default function HealthOnboarding({
  open,
  onClose,
  onComplete,
  existingPrefs,
  isEditing = false,
}: HealthOnboardingProps) {
  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState<string>(
    existingPrefs?.monthlyBudget?.toString() || ""
  );
  const [feeling, setFeeling] = useState<string>(
    existingPrefs?.spendingFeeling || ""
  );
  const [categories, setCategories] = useState<string[]>(
    existingPrefs?.priorityCategories || []
  );

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleComplete = () => {
    onComplete({
      monthlyBudget: budget ? parseInt(budget, 10) : null,
      spendingFeeling: feeling as HealthPreferences["spendingFeeling"],
      priorityCategories: categories,
      completedOnboarding: true,
    });
    onClose();
  };

  const canProceed = () => {
    if (step === 0) return true; // Budget is optional
    if (step === 1) return feeling !== ""; // Feeling is required
    return true; // Categories are optional
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Health Preferences" : "Set Up Wallet Health"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your preferences to get a more personalized health score."
              : "Help us personalize your health score. You can skip this and set it up later."}
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monthly Subscription Budget (optional)</Label>
              <Input
                type="number"
                placeholder="e.g., 2000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                How much do you ideally want to spend on subscriptions each
                month?
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>How do you feel about your current spending?</Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: "too_much", label: "Too much — I want to reduce" },
                  { value: "about_right", label: "About right" },
                  {
                    value: "could_spend_more",
                    label: "Could spend more — I have room",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFeeling(opt.value)}
                    className={cn(
                      "text-left p-3 rounded-lg border transition-colors",
                      feeling === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border hover:border-primary/50 text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Which categories matter most to you?</Label>
              <p className="text-xs text-muted-foreground">
                Select all that apply. This helps prioritize what matters in
                your health score.
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-colors",
                      categories.includes(cat)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {!isEditing && step === 0 && (
              <Button variant="ghost" onClick={onClose}>
                Skip
              </Button>
            )}
            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={!canProceed()}>
                {isEditing ? "Save Changes" : "Complete Setup"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
