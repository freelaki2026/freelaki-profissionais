// Auto-hide do FloatingNav quando algum overlay (modal/sheet/backdrop) está aberto.
// Detecta heuristicamente qualquer elemento fixed com inset-0 (overlay full-screen)
// ou sheet ancorado no rodapé com z-index >= ao da nav, e esconde a barra
// para que ela não cubra botões "Salvar", inputs, ou popups.

import { useEffect, useState } from "react";

const NAV_Z = 50;

let listeners = new Set<(hidden: boolean) => void>();
let currentHidden = false;
let raf: number | null = null;

function emit(hidden: boolean) {
  if (hidden === currentHidden) return;
  currentHidden = hidden;
  listeners.forEach((l) => l(hidden));
}

function check() {
  raf = null;
  if (typeof document === "undefined") return;
  const vh = window.innerHeight;
  // Vasculha elementos posicionados que possam estar sobrepondo a nav.
  const candidates = document.querySelectorAll<HTMLElement>(
    'body [class*="fixed"], body [style*="fixed"], [role="dialog"], [data-state="open"]'
  );
  let blocked = false;
  for (const el of Array.from(candidates)) {
    if (el.dataset.floatingNav === "true") continue;
    const s = getComputedStyle(el);
    if (s.position !== "fixed") continue;
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") continue;
    const z = parseInt(s.zIndex || "0", 10) || 0;
    if (z < NAV_Z) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) continue;
    // overlay full-screen (backdrop) OU sheet ancorado no rodapé
    const isFullOverlay = r.top <= 4 && r.bottom >= vh - 4;
    const isBottomSheet = r.bottom >= vh - 4 && r.height > 80 && r.height < vh;
    if (isFullOverlay || isBottomSheet) {
      blocked = true;
      break;
    }
  }
  emit(blocked);
}

function schedule() {
  if (raf !== null) return;
  raf = requestAnimationFrame(check);
}

let observer: MutationObserver | null = null;
function ensureObserver() {
  if (observer || typeof document === "undefined") return;
  observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-state"],
  });
  schedule();
}

export function useFloatingNavHidden(): boolean {
  const [hidden, setHidden] = useState(currentHidden);
  useEffect(() => {
    ensureObserver();
    listeners.add(setHidden);
    setHidden(currentHidden);
    schedule();
    return () => {
      listeners.delete(setHidden);
    };
  }, []);
  return hidden;
}
