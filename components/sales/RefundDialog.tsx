"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RefundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  billId: string;
  itemCount: number;
  onRefunded: () => void;
};

export function RefundDialog({ open, onOpenChange, saleId, billId, itemCount, onRefunded }: RefundDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = reason.trim().length >= 10 && !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales/${saleId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Failed to process refund");
        return;
      }
      toast.success(`Refund processed for ${billId} — inventory restored`);
      setReason("");
      onOpenChange(false);
      onRefunded();
    } catch {
      toast.error("Failed to process refund");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <AlertTriangle />
          </AlertDialogMedia>
          <AlertDialogTitle>Process Refund for {billId}</AlertDialogTitle>
          <AlertDialogDescription>
            This will reverse this sale and restore inventory for all {itemCount} item(s). This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for refund (required)"
            rows={3}
          />
          {reason.length > 0 && reason.trim().length < 10 && (
            <p className="text-xs text-destructive">Reason must be at least 10 characters</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!canSubmit}
            onClick={handleConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {submitting ? "Processing..." : "Confirm Refund"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
