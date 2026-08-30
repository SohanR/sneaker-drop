import { LoaderCircle, ShoppingBag } from "lucide-react";
import type { ActiveHold } from "../types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";

export function PurchaseDialog({ hold, dropName, loading, onCancel, onConfirm }: {
  hold: ActiveHold | null;
  dropName?: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(hold)} onOpenChange={(open) => { if (!open && !loading) onCancel(); }}>
      <DialogContent showClose={!loading}>
        <DialogTitle>Complete your purchase?</DialogTitle>
        <DialogDescription>Your active hold for {dropName || "this drop"} will be permanently settled. Inventory will not be deducted twice.</DialogDescription>
        <DialogFooter className="mt-6">
          <Button variant="outline" disabled={loading} onClick={onCancel}>Keep browsing</Button>
          <Button disabled={loading} onClick={onConfirm}>{loading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <ShoppingBag className="mr-2 size-4" />} Confirm purchase</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
