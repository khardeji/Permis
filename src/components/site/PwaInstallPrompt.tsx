import { useEffect, useState } from "react";
import { Download, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "permiconduit_pwa_dismissed_v1";

function detectIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Utiliser un seul Service Worker à la racine pour PWA + Firebase Cloud Messaging
      navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {
        // Ignore registration errors in unsupported environments
      });
    }

    if (isStandaloneMode()) {
      setInstalled(true);
      return;
    }

    const ios = detectIos();
    setIsIos(ios);
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    setDismissed(wasDismissed);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed) return null;

  const canShowBanner = !dismissed && (Boolean(deferredPrompt) || isIos);

  async function handleInstall() {
    if (isIos) {
      setIosGuideOpen(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage errors
    }
  }

  return (
    <>
      {canShowBanner && (
        <div
          role="region"
          aria-label="Installer l'application PermiConduit"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-elevated sm:left-auto sm:right-5"
        >
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-primary">
              <Smartphone className="size-5 text-brand" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-primary">
                Installer l'application PermiConduit
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isIos
                  ? "Ajoutez PermiConduit sur votre écran d'accueil iPhone/iPad pour un accès rapide."
                  : "Accédez plus rapidement à vos séances, paiements et moniteurs depuis votre écran d'accueil."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="brand" onClick={handleInstall}>
                  <Download className="size-4" />
                  {isIos ? "Voir les étapes iOS" : "Télécharger l'app"}
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  Plus tard
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Fermer"
              className="rounded-md p-1 text-muted-foreground hover:text-primary"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <Dialog open={iosGuideOpen} onOpenChange={setIosGuideOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Installer PermiConduit sur iPhone / iPad</DialogTitle>
            <DialogDescription>
              Suivez ces 3 étapes rapides dans Safari pour ajouter l'application sur votre écran d'accueil :
            </DialogDescription>
          </DialogHeader>
          <ol className="mt-2 space-y-3 text-sm">
            <li className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              <div className="flex-1">
                <p className="font-semibold text-primary">Appuyez sur le bouton Partager</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  L'icône <Share className="inline size-3.5 text-brand" /> en bas de votre navigateur Safari.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              <div className="flex-1">
                <p className="font-semibold text-primary">Choisissez « Sur l'écran d'accueil »</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  Faites défiler le menu puis appuyez sur <PlusSquare className="inline size-3.5 text-brand" /> Sur l'écran d'accueil.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </span>
              <div className="flex-1">
                <p className="font-semibold text-primary">Appuyez sur « Ajouter »</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  En haut à droite : l'icône PermiConduit apparaîtra comme une application native.
                </p>
              </div>
            </li>
          </ol>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setIosGuideOpen(false)}>J'ai compris</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
