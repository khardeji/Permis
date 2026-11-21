import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";

export function EnrollButton({ instructorId, instructorName, ...btn }: { instructorId: string; instructorName: string } & ButtonProps) {
  const { user } = useAuth();
  const roles = useRoles();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const existing = useQuery({
    queryKey: ["my-request", instructorId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollment_requests")
        .select("id, status")
        .eq("instructor_id", instructorId)
        .eq("student_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  if (!user) {
    return (
      <Button asChild {...btn}>
        <Link to="/inscription" search={{ type: "eleve", moniteur: instructorId }}>
          <ClipboardCheck /> Demander une inscription
        </Link>
      </Button>
    );
  }

  const isStudent = roles.data?.includes("student");
  const status = existing.data?.status;

  if (status === "pending" || status === "accepted") {
    return (
      <Button {...btn} disabled>
        <ClipboardCheck /> {status === "pending" ? "Demande envoyée" : "Vous êtes inscrit"}
      </Button>
    );
  }

  async function send() {
    setBusy(true);
    const { data: profile } = await supabase.from("profiles").select("full_name, phone, city, email").eq("id", user!.id).maybeSingle();
    const { error } = await supabase.from("enrollment_requests").insert({
      instructor_id: instructorId,
      student_user_id: user!.id,
      full_name: profile?.full_name || user!.email || "Élève",
      phone: profile?.phone ?? null,
      email: profile?.email ?? user!.email ?? null,
      city: profile?.city ?? null,
      message: message.slice(0, 1000) || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Impossible d'envoyer la demande", { description: error.message });
      return;
    }
    toast.success("Demande envoyée !", { description: `${instructorName} va recevoir votre demande.` });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["my-request", instructorId] });
    qc.invalidateQueries({ queryKey: ["student"] });
  }

  return (
    <>
      <Button
        {...btn}
        onClick={() => (isStudent ? setOpen(true) : toast.info("Les demandes d'inscription sont réservées aux comptes élèves."))}
      >
        <ClipboardCheck /> Demander une inscription
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demande d'inscription</DialogTitle>
            <DialogDescription>Envoyez votre demande à {instructorName}. Vous serez notifié de sa réponse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="msg">Message (facultatif)</Label>
            <Textarea id="msg" value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. Je suis débutant(e), disponible le samedi matin…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={send} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Envoyer la demande</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
