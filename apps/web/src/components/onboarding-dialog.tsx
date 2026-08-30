import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function OnboardingDialog({ open, loading, onSubmit }: { open: boolean; loading: boolean; onSubmit: (username: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const valid = /^[A-Za-z0-9_.-]{3,50}$/.test(username);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid && !loading) void onSubmit(username);
  };

  return (
    <Dialog open={open}>
      <DialogContent showClose={false} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogTitle>Choose your drop name</DialogTitle>
        <DialogDescription>This display name appears in the recent buyers feed after a successful purchase.</DialogDescription>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium" htmlFor="display-username">Display username</label>
          <Input id="display-username" autoFocus value={username} onChange={(event) => setUsername(event.target.value)} placeholder="sneaker_fan" maxLength={50} aria-describedby="username-help" />
          <p id="username-help" className="text-xs text-neutral-500">3–50 letters, numbers, dots, underscores, or hyphens.</p>
          <Button className="w-full" disabled={!valid || loading}>
            {loading && <LoaderCircle className="mr-2 size-4 animate-spin" />} Enter the drop
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

