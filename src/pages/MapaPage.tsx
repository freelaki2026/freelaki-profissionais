import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Zap, Loader2, Crosshair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FloatingNav } from "@/components/FloatingNav";

interface MapOpp {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  scheduled_at: string | null;
  category_id: string | null;
}

const EARTH_RADIUS_KM = 6371;
const distKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

export default function MapaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [opps, setOpps] = useState<MapOpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapOpp | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Geolocalização
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada neste dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setGeoError("Permissão de localização negada. Mostrando oportunidades sem distância.");
        setCoords({ lat: -23.5505, lng: -46.6333 }); // fallback São Paulo
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Buscar categorias do profissional + oportunidades abertas + realtime
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const fetchOpps = async () => {
      const { data: cats } = await supabase
        .from("professional_categories")
        .select("category_id")
        .eq("profile_id", user.id);
      const catIds = (cats ?? []).map((c) => c.category_id).filter(Boolean) as string[];

      let query = supabase
        .from("opportunities")
        .select("id,title,description,budget,location_address,location_lat,location_lng,scheduled_at,category_id")
        .in("status", ["open", "pending_selection"])
        .or("is_private.is.null,is_private.eq.false")
        .order("created_at", { ascending: false })
        .limit(100);

      if (catIds.length > 0) query = query.in("category_id", catIds);

      const { data } = await query;
      if (!cancelled) {
        setOpps((data ?? []) as MapOpp[]);
        setLoading(false);
      }
    };

    fetchOpps();

    channelRef.current = supabase
      .channel("map-opps")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunities" },
        () => fetchOpps()
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user?.id]);

  const oppsWithDist = useMemo(() => {
    if (!coords) return opps.map((o) => ({ ...o, _dist: null as number | null }));
    return opps
      .map((o) => ({
        ...o,
        _dist:
          o.location_lat != null && o.location_lng != null
            ? distKm(coords.lat, coords.lng, o.location_lat, o.location_lng)
            : null,
      }))
      .sort((a, b) => {
        if (a._dist == null && b._dist == null) return 0;
        if (a._dist == null) return 1;
        if (b._dist == null) return -1;
        return a._dist - b._dist;
      });
  }, [opps, coords]);

  // Cálculo de posição relativa no "mapa" (canvas SVG simples)
  const mapPoints = useMemo(() => {
    if (!coords) return [];
    const radiusKm = 25; // janela de 25km
    return oppsWithDist
      .filter((o) => o.location_lat != null && o.location_lng != null && (o._dist ?? Infinity) < radiusKm)
      .map((o) => {
        const dx = (o.location_lng! - coords.lng) * Math.cos((coords.lat * Math.PI) / 180);
        const dy = coords.lat - o.location_lat!;
        const scale = 50 / (radiusKm / 111); // 111 km por grau
        return {
          opp: o,
          x: 50 + dx * scale,
          y: 50 + dy * scale,
        };
      })
      .filter((p) => p.x > 5 && p.x < 95 && p.y > 5 && p.y < 95);
  }, [oppsWithDist, coords]);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center outline-none active:scale-95 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-medium tracking-tight">Mapa de oportunidades</h1>
          <p className="text-[11px] text-zinc-500">Em tempo real perto de você</p>
        </div>
      </div>

      {/* Mapa visual (canvas radar) */}
      <div className="px-5 mb-5">
        <div
          className="relative w-full aspect-square rounded-3xl border border-zinc-800 overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at center, #0d1b38 0%, #0a1229 60%, #050816 100%)",
          }}
        >
          {/* Grades concêntricas */}
          {[20, 40, 60, 80].map((r) => (
            <div
              key={r}
              className="absolute rounded-full border border-blue-500/10"
              style={{
                width: `${r}%`,
                height: `${r}%`,
                top: `${(100 - r) / 2}%`,
                left: `${(100 - r) / 2}%`,
              }}
            />
          ))}
          {/* Cruz central */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-blue-500/10" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-blue-500/10" />

          {/* Você (centro) */}
          {coords && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: "50%", top: "50%" }}
            >
              <div className="relative">
                <div className="absolute inset-0 w-4 h-4 rounded-full bg-blue-400 animate-ping opacity-60" />
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white relative" />
              </div>
            </div>
          )}

          {/* Pontos das oportunidades */}
          {mapPoints.map(({ opp, x, y }) => (
            <button
              type="button"
              key={opp.id}
              onClick={() => setSelected(opp)}
              className="absolute -translate-x-1/2 -translate-y-1/2 outline-none active:scale-90 transition-transform z-20"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className="relative">
                <div className="absolute inset-0 w-7 h-7 rounded-full bg-yellow-400/40 animate-pulse" />
                <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center relative shadow-lg shadow-yellow-500/40">
                  <Zap size={13} className="text-black" strokeWidth={2.5} />
                </div>
              </div>
            </button>
          ))}

          {/* Estado vazio */}
          {!coords && !geoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
              <Loader2 size={20} className="animate-spin mb-2" />
              <p className="text-xs">Localizando você…</p>
            </div>
          )}
          {coords && mapPoints.length === 0 && !loading && (
            <div className="absolute inset-x-4 bottom-4 bg-black/60 backdrop-blur rounded-xl px-3 py-2 text-center">
              <p className="text-[11px] text-zinc-400">Nenhuma oportunidade em 25 km</p>
            </div>
          )}
          {/* Badge canto */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-full px-2.5 py-1">
            <Crosshair size={11} className="text-blue-400" />
            <span className="text-[10px] text-zinc-300">Raio 25 km</span>
          </div>
        </div>
        {geoError && (
          <p className="mt-2 text-[11px] text-yellow-500/80 text-center">{geoError}</p>
        )}
      </div>

      {/* Lista de oportunidades */}
      <div className="px-5">
        <p className="text-[11px] text-zinc-600 uppercase tracking-widest mb-3">
          {loading ? "Carregando…" : `${oppsWithDist.length} oportunidades`}
        </p>
        {!loading && oppsWithDist.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-6">
            Nenhuma oportunidade aberta nas suas categorias agora.
          </p>
        )}
        <div className="space-y-2">
          {oppsWithDist.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => navigate(`/oportunidade/${o.id}`)}
              className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 flex items-start gap-3 outline-none active:scale-[0.99] transition-transform"
            >
              <div className="w-9 h-9 rounded-full bg-yellow-400/15 flex items-center justify-center flex-shrink-0">
                <Zap size={14} className="text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{o.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-zinc-600" />
                  <p className="text-[11px] text-zinc-500 truncate">
                    {o.location_address ?? "Endereço não informado"}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-white">
                  R$ {Number(o.budget ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
                {o._dist != null && (
                  <p className="text-[10px] text-zinc-600">
                    {o._dist < 1 ? `${Math.round(o._dist * 1000)} m` : `${o._dist.toFixed(1)} km`}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal simples ao clicar no pino */}
      {selected && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium">{selected.title}</p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {selected.location_address ?? "Sem endereço"}
                </p>
              </div>
              <p className="text-base font-medium text-white">
                R$ {Number(selected.budget ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </p>
            </div>
            {selected.description && (
              <p className="text-xs text-zinc-400 mb-4 line-clamp-3">{selected.description}</p>
            )}
            <button
              type="button"
              onClick={() => navigate(`/oportunidade/${selected.id}`)}
              className="w-full bg-white text-black rounded-full py-3 text-sm font-medium outline-none active:scale-[0.98] transition-transform"
            >
              Ver detalhes
            </button>
          </div>
        </div>
      )}

      <FloatingNav />
    </div>
  );
}
