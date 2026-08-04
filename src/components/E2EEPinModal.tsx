"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, KeyRound, Loader2, Lock, AlertTriangle } from "lucide-react";
import {
  getPrivateKey,
  initializeUserKeys,
  backupPrivateKeyWithPIN,
  restorePrivateKeyWithPIN,
} from "@/lib/crypto";
import { api } from "@/lib/api";

interface E2EEPinModalProps {
  currentUser: any;
  // ইউজার PIN ভুলে গেলে reset করার পর কল হবে — সাধারণত user object রিফ্রেশ করার জন্য
  onKeysReset?: () => void;
}

const MAX_RESTORE_ATTEMPTS = 5;
const PIN_LENGTH = 6;

export default function E2EEPinModal({ currentUser, onKeysReset }: E2EEPinModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"SETUP" | "RESTORE">("SETUP");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    async function checkKeys() {
      if (!currentUser?.id) return;

      const localPrivKey = await getPrivateKey(currentUser.id);

      // ১. নতুন ডিভাইস - ব্রাউজারে কি নেই, কিন্তু সার্ভারে পিন ব্যাকআপ আছে
      if (!localPrivKey && currentUser.encryptedPrivateKey) {
        setMode("RESTORE");
        setOpen(true);
        return;
      }

      // ২. প্রথমবার ইউজার - ব্রাউজারেও কি নেই, সার্ভারেও পিন ব্যাকআপ নেই
      if (!localPrivKey && !currentUser.encryptedPrivateKey) {
        setMode("SETUP");
        setOpen(true);
      }
    }

    checkKeys();
  }, [currentUser]);

  const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, PIN_LENGTH);

  const resetFormState = () => {
    setPin("");
    setConfirmPin("");
    setError("");
    setShowResetConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.length !== PIN_LENGTH) {
      setError(`PIN must be exactly ${PIN_LENGTH} digits`);
      return;
    }

    if (mode === "SETUP" && pin !== confirmPin) {
      setError("PINs do not match. Please re-enter.");
      return;
    }

    try {
      setIsProcessing(true);

      if (mode === "SETUP") {
        // ১. কি-পেয়ার ইনিশিয়ালাইজেশন
        await initializeUserKeys(currentUser.id, async (pubKeyPem) => {
          await api.patch("/users/public-key", { publicKey: pubKeyPem });
        });

        // ২. পিন দিয়ে প্রাইভেট কি ব্যাকআপ
        const encryptedBackup = await backupPrivateKeyWithPIN(currentUser.id, pin);
        await api.patch("/users/encrypted-private-key", {
          encryptedPrivateKey: encryptedBackup,
        });

        resetFormState();
        setOpen(false);
      } else {
        // ৩. নতুন ডিভাইসে পিন দিয়ে প্রাইভেট কি রিকভার
        try {
          await restorePrivateKeyWithPIN(
            currentUser.id,
            currentUser.encryptedPrivateKey,
            pin
          );

          resetFormState();
          setOpen(false);
          window.location.reload(); // মেসেজ ডিক্রিপ্ট করতে পেজ রিলোড
        } catch (err) {
          const attempts = failedAttempts + 1;
          setFailedAttempts(attempts);
          setPin("");

          if (attempts >= MAX_RESTORE_ATTEMPTS) {
            setError(
              `Incorrect PIN. You've tried ${attempts} times — if you've forgotten your PIN, you can reset your keys below.`
            );
          } else {
            setError(`Incorrect PIN. Please try again. (${attempts}/${MAX_RESTORE_ATTEMPTS})`);
          }
        }
      }
    } catch (err) {
      console.error("PIN setup failed:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ভুলে যাওয়া PIN রিকভার করার কোনো উপায় নেই (এটাই E2EE-র বৈশিষ্ট্য) —
  // তাই একমাত্র বিকল্প হলো নতুন keypair বানানো, যার ফলে পুরনো মেসেজ চিরতরে অপাঠ্য হয়ে যাবে।
  const handleResetKeys = async () => {
    if (!currentUser?.id) return;
    try {
      setIsProcessing(true);
      setError("");

      await initializeUserKeys(
        currentUser.id,
        async (pubKeyPem) => {
          await api.patch("/users/public-key", { publicKey: pubKeyPem });
        },
        true // force নতুন keypair
      );
      await api.patch("/users/encrypted-private-key", { encryptedPrivateKey: null });

      resetFormState();
      setFailedAttempts(0);
      setMode("SETUP");
      onKeysReset?.();
      // নতুন PIN সেট করার জন্য SETUP mode-এ থাকবে, modal খোলা থাকবে
    } catch (err) {
      console.error("Key reset failed:", err);
      setError("Could not reset keys. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {mode === "SETUP" ? "Setup Chat Backup PIN" : "Restore Encrypted Chats"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode === "SETUP"
              ? `Create a ${PIN_LENGTH}-digit Security PIN to safely back up your encrypted chats for multi-device access.`
              : `Enter your ${PIN_LENGTH}-digit Security PIN to view your encrypted messages on this device.`}
          </DialogDescription>
        </DialogHeader>

        {!showResetConfirm ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> Security PIN
              </label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={PIN_LENGTH}
                value={pin}
                onChange={(e) => setPin(onlyDigits(e.target.value))}
                placeholder="••••••"
                className="tracking-widest text-center text-lg font-bold"
                autoFocus
                required
              />
            </div>

            {mode === "SETUP" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> Confirm PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={PIN_LENGTH}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(onlyDigits(e.target.value))}
                  placeholder="••••••"
                  className="tracking-widest text-center text-lg font-bold"
                  required
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 font-medium flex items-start gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={
                isProcessing ||
                pin.length !== PIN_LENGTH ||
                (mode === "SETUP" && confirmPin.length !== PIN_LENGTH)
              }
              className="w-full gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              <span>{mode === "SETUP" ? "Save Backup PIN" : "Unlock & Sync Chats"}</span>
            </Button>

            {/* Escape hatch — নাহলে ইউজার permanently আটকে যেতে পারে */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Log out
              </button>
              {mode === "RESTORE" && failedAttempts >= MAX_RESTORE_ATTEMPTS && (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-xs text-red-500 underline hover:text-red-600"
                >
                  Forgot PIN? Reset keys
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>
                Resetting will generate a new encryption key. All your previous encrypted
                messages will become permanently unreadable on every device. This cannot be
                undone.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowResetConfirm(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={handleResetKeys}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Keys"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
