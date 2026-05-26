import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Splash com video de abertura da marca.
// - Toca o MP4 do logo em fullscreen toda vez que o app abre.
// - Ao terminar o video, exibe a tagline e segue para a rota correta.
// - Se o video falhar (rede, codec), faz fallback textual sem travar o usuario.

const VIDEO_SRC = "/branding/splash-intro.mp4";
const FALLBACK_DURATION_MS = 5200; // ~duracao do MP4 (5.04s)
const TAGLINE_HOLD_MS = 2200; // tempo para o usuario ler a tagline antes do redirect

const Splash = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showTagline, setShowTagline] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // Resolucao da rota destino (mesma logica de antes)
  const nextPathRef = useRef<{ path: string; state?: unknown } | null>(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    let active = true;

    const resolveNext = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return { path: "/", state: undefined };
      if (!session.user.email_confirmed_at) {
        return { path: "/confirmar-email", state: { email: session.user.email } };
      }
      void import("@/pages/DashboardPage");
      const { count } = await supabase
        .from("professional_categories")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", session.user.id);
      return { path: (count ?? 0) === 0 ? "/categorias" : "/dashboard", state: undefined };
    };

    resolveNext().then((next) => {
      if (active) nextPathRef.current = next;
    });

    return () => {
      active = false;
    };
  }, []);

  const goNext = () => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    const target = nextPathRef.current ?? { path: "/", state: undefined };
    navigate(target.path, { replace: true, state: target.state });
  };

  const finishSequence = () => {
    setShowTagline(true);
    // espera o usuario ler a tagline e tambem garante que a rota ja foi resolvida
    const tryRedirect = (attempt = 0) => {
      if (nextPathRef.current || attempt > 10) {
        setTimeout(goNext, TAGLINE_HOLD_MS);
      } else {
        setTimeout(() => tryRedirect(attempt + 1), 100);
      }
    };
    tryRedirect();
  };

  // Fallback caso o video nao termine (autoplay bloqueado, erro, etc.)
  useEffect(() => {
    const t = setTimeout(() => {
      if (!showTagline) finishSequence();
    }, FALLBACK_DURATION_MS + 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tenta dar play com som; se o navegador bloquear, mantem mudo (autoplay garantido).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const playPromise = v.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          // tenta reativar o som apos o play comecar
          try {
            v.muted = false;
          } catch {
            /* noop */
          }
        })
        .catch(() => {
          // mantem mudo se bloqueado
          v.muted = true;
          v.play().catch(() => setVideoFailed(true));
        });
    }
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden border-neutral-950"
      style={{ background: "#0A0A0F" }}
    >
      {!videoFailed ? (
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          autoPlay
          muted
          playsInline
          {...({ "webkit-playsinline": "true" } as Record<string, string>)}
          preload="auto"
          onEnded={finishSequence}
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ background: "#0A0A0F", transform: "scale(0.92)", transformOrigin: "center" }}
        />
      ) : (
        // Fallback textual caso o video nao carregue
        <div
          className="relative z-10 flex flex-col items-center"
          style={{ animation: "splashLogoIn 450ms ease-out both" }}
        >
          <h1 className="font-bold" style={{ fontSize: 42, letterSpacing: -1.5, lineHeight: 1 }}>
            <span className="text-white">free</span>
            <span style={{ color: "#276EF1" }}>laki</span>
          </h1>
          <p
            className="font-light uppercase text-white/70"
            style={{ fontSize: 11, letterSpacing: 4, marginTop: 6 }}
          >
            profissionais
          </p>
        </div>
      )}

      {/* Tagline (aparece apenas depois do video terminar) */}
      {showTagline && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 text-center px-10"
          style={{
            bottom: "36%",
            animation: "splashTaglineIn 500ms ease-out both",
          }}
        >
          <p className="text-[18px] font-semibold text-white/95 leading-snug drop-shadow-lg">
            100% do que você ganha <span style={{ color: "#276EF1" }}>é seu.</span>
          </p>
          <p className="mt-2 text-[13px] text-white/60 font-light drop-shadow">Grátis pra sempre.</p>
        </div>
      )}

      <style>{`
        @keyframes splashLogoIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splashTaglineIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Splash;
