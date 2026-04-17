import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Zap, Loader2, Crosshair } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

// Ícones customizados via divIcon (sem assets externos)
const userIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:18px;height:18px;">
    <div style="position:absolute;inset:0;background:#3b82f6;opacity:.45;border-radius:9999px;animation:pulse 1.6s infinite;"></div>
    <div style="position:absolute;inset:3px;background:#3b82f6;border:2px solid white;border-radius:9999px;box-shadow:0 0 0 1px rgba(0,0,0,.4);"></div>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const oppIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:30px;height:30px;">
    <div style="position:absolute;inset:0;background:#facc15;opacity:.35;border-radius:9999px;animation:pulse 1.8s infinite;"></div>
    <div style="position:absolute;inset:3px;background:#facc15;border:2px solid #18181b;border-radius:9999px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(250,204,21,.4);">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    </div>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Recentralizar quando coords carregarem
function Recenter({ coords }: { coords: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lng], 13, { animate: true });
  }, [coords, map]);
  return null;
}

export default function MapaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [opps, setOpps] = useState<MapOpp[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Geolocalização
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada neste dispositivo.");
      setCoords({ lat: -23.5505, lng: -46.6333 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setGeoError("Permissão de localização negada. Mostrando São Paulo como referência.");
        setCoords({ lat: -23.5505, lng: -46.6333 });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Buscar oportunidades + realtime
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
      .channel("map-opps-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, () => fetchOpps())
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

  const mappable = oppsWithDist.filter(
    (o) => o.location_lat != null && o.location_lng != null
  );

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden pb-32">
      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); opacity:.4 } 50% { transform: scale(1.6); opacity:0 } }
        .leaflet-container { background:#0a0a0a; font-family: inherit; }
        .leaflet-popup-content-wrapper { background:#18181b; color:#fafafa; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,.5); }
        .leaflet-popup-tip { background:#18181b; }
        .leaflet-popup-content { margin: 10px 12px; font-size: 12px; }
        .leaflet-control-zoom a { background:#18181b !important; color:#fafafa !important; border-color:#27272a !important; }
        .leaflet-control-attribution { background: rgba(0,0,0,.5) !important; color:#71717a !important; }
        .leaflet-control-attribution a { color:#a1a1aa !important; }
      `}</style>

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
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full px-2.5 py-1">
          <Crosshair size={11} className="text-blue-400" />
          <span className="text-[10px] text-zinc-300">{mappable.length}</span>
        </div>
      </div>

      {/* Mapa real */}
      <div className="px-5 mb-5">
        <div className="relative w-full aspect-square rounded-3xl border border-zinc-800 overflow-hidden">
          {coords ? (
            <MapContainer
              center={[coords.lat, coords.lng]}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <Recenter coords={coords} />
              <Circle
                center={[coords.lat, coords.lng]}
                radius={5000}
                pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.06, weight: 1 }}
              />
              <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
                <Popup>Você está aqui</Popup>
              </Marker>
              {mappable.map((o) => (
                <Marker
                  key={o.id}
                  position={[o.location_lat!, o.location_lng!]}
                  icon={oppIcon}
                >
                  <Popup>
                    <div className="space-y-1.5 min-w-[180px]">
                      <p className="font-medium text-[13px] text-white">{o.title}</p>
                      {o.location_address && (
                        <p className="text-[11px] text-zinc-400 truncate">{o.location_address}</p>
                      )}
                      <p className="text-[13px] font-medium text-yellow-400">
                        R$ {Number(o.budget ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/oportunidade/${o.id}`)}
                        className="mt-1 w-full bg-white text-black rounded-full py-1.5 text-[11px] font-medium"
                      >
                        Ver detalhes
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
              <Loader2 size={20} className="animate-spin mb-2" />
              <p className="text-xs">Localizando você…</p>
            </div>
          )}
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

      <FloatingNav />
    </div>
  );
}
