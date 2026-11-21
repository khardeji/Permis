import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { GoogleIcon } from "./AuthShell";

export function SocialButtons({ onSignedIn }: { onSignedIn: () => void }) {
  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth" },
    });
    if (error) {
      toast.error("Connexion impossible", { description: error.message });
      return;
    }
    if (data?.url) return;
    onSignedIn();
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#FFFFFF]"
        onClick={signInWithGoogle}
      >
        <GoogleIcon /> Continuer avec Google
      </Button>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
    </div>
  );
}
