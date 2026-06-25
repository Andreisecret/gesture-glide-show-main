import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Coffee, Unlock } from "lucide-react";

export type UnlockStep = "locked" | "support" | "thanks-support" | "thanks-broke";

const SUPPORT_URL = "https://buymeacoffee.com/andreibos";

interface Props {
  step: UnlockStep | null;
  onStepChange: (s: UnlockStep | null) => void;
  onUnlock: () => void;
}

export function SettingsUnlockDialog({ step, onStepChange, onUnlock }: Props) {
  const open = step !== null;
  const close = () => onStepChange(null);
  const complete = () => {
    onUnlock();
    close();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {step === "locked" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
                <Lock className="size-6 text-muted-foreground" />
              </div>
              <DialogTitle className="text-center font-mono">Settings are locked</DialogTitle>
              <DialogDescription className="text-center">
                Unlock to customize your gestures, bindings, and sensitivity.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => onStepChange("support")} className="gap-2">
                <Unlock className="size-4" /> Unlock
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "support" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center font-mono">Enjoying GestureDeck?</DialogTitle>
              <DialogDescription className="text-center">
                This app is free and built by one person. If it's useful to you, a small tip keeps
                it going.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              <Button
                className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  window.open(SUPPORT_URL, "_blank", "noopener,noreferrer");
                  onStepChange("thanks-support");
                }}
              >
                <Coffee className="size-4" /> Support
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => onStepChange("thanks-broke")}
              >
                I don't have money
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "thanks-support" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center font-mono">Thank you! 💛</DialogTitle>
              <DialogDescription className="text-center">
                Seriously — it means a lot. Your tab should've opened in a new window. Hit continue
                to unlock your settings.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button onClick={complete}>Continue</Button>
            </DialogFooter>
          </>
        )}

        {step === "thanks-broke" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center font-mono">
                That's ok, I don't either :)
              </DialogTitle>
              <DialogDescription className="text-center">
                Just enjoy the app. Maybe share it with a friend instead.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button onClick={complete}>Continue</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
