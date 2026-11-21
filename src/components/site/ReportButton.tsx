import { useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const REASONS = ["Informations incorrectes", "Comportement inapproprié", "Profil frauduleux", "Autre"];

export function ReportButton({ instructorId }: { instructorId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REASONS[0] ?? "Autre");
  const [details, setDetails] = useState("");

  async function submit() {
    const { error } = await supabase.from("reports").insert({
      reporter_id: user!.id, instructor_id: instructorId, reason, details: details.slice(0, 2000) || null,
    });
    if (error) {
      toast.error("Envoi impossible", { description: error.message });
      return;
    }
    toast.success("Signalement envoyé à l'équipe PermiConduit.");
    setOpen(false);
    setDetails("");
  }

  return (
    <>
      <button
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
        onClick={() => (user ? setOpen(true) : toast.info("Connectez-vous pour signaler un profil."))}
      >
        <Flag className="size-3.5" /> Signaler ce profil
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler ce profil</DialogTitle>
            <DialogDescription>Notre équipe examinera votre signalement rapidement.</DialogDescription>
          </DialogHeader>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Détails (facultatif)" maxLength={2000} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={submit}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
