import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Photo = { id: string; image_url: string; caption: string | null };

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState<number | null>(null);
  const selected = active === null ? undefined : photos[active];
  function move(offset: number) {
    setActive((current) => current === null ? null : (current + offset + photos.length) % photos.length);
  }
  return <>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {photos.map((photo, index) => <figure key={photo.id} className="min-w-0">
        <Button variant="ghost" aria-label={`Agrandir : ${photo.caption ?? "photo"}`} onClick={() => setActive(index)} className="group block h-auto w-full overflow-hidden rounded-lg p-0">
          <img src={photo.image_url} alt={photo.caption ?? "Photo du moniteur"} loading="lazy" width={1536} height={1024} className="aspect-[4/3] w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105" />
        </Button>
        {photo.caption && <figcaption className="mt-2 text-xs text-muted-foreground">{photo.caption}</figcaption>}
      </figure>)}
    </div>
    <Dialog open={selected !== undefined} onOpenChange={(open) => { if (!open) setActive(null); }}>
      <DialogContent className="max-w-4xl p-4">
        <DialogTitle className="pr-8">{selected?.caption ?? "Galerie du moniteur"}</DialogTitle>
        <DialogDescription className="sr-only">Photographie agrandie</DialogDescription>
        {selected && <img src={selected.image_url} alt={selected.caption ?? "Photo du moniteur"} width={1536} height={1024} className="max-h-[65vh] w-full rounded-lg object-contain" />}
        {photos.length > 1 && <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" aria-label="Photo précédente" onClick={() => move(-1)}><ChevronLeft /></Button>
          <span className="text-sm text-muted-foreground">{(active ?? 0) + 1} / {photos.length}</span>
          <Button variant="outline" size="icon" aria-label="Photo suivante" onClick={() => move(1)}><ChevronRight /></Button>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}