import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Zap, Loader2, Crosshair, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
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
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [opps, setOpps] = useState<MapOpp[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const watchIdRef = useRef<string | number | null>(null);

  // Geolocalização real — requer gesto do usuário (navegadores bloqueiam pós-await sem isso)
  const requestLocation = useCallback(async () => {
    setGeoError(null);
    setGeoStatus("requesting");
    try {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // Native: pede permissão explicitamente
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== "granted") {
          const req = await Geolocation.requestPermissions();
          if (req.location !== "granted") {
            setGeoStatus("denied");
            setGeoError("Permissão de localização negada. Habilite nas configurações do aparelho.");
            return;
          }
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");

        // Watch contínuo para manter posição real
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (p) => {
            if (p?.coords) setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
          }
        );
        watchIdRef.current = id;
        return;
      }

      // Web
      if (!navigator.geolocation) {
        setGeoStatus("denied");
        setGeoError("Geolocalização não suportada neste navegador.");
        return;
      }
      const tryGet = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setGeoStatus("granted");
            const wid = navigator.geolocation.watchPosition(
              (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
              () => {},
              { enableHighAccuracy: highAccuracy, maximumAge: 15000, timeout: 20000 }
            );
            watchIdRef.current = wid;
          },
          (err) => {
            // Fallback: se alta precisão falhou, tenta baixa precisão antes de desistir
            if (highAccuracy && (err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT)) {
              tryGet(false);
              return;
            }
            setGeoStatus("denied");
            if (err.code === err.PERMISSION_DENIED) {
              setGeoError("Permissão negada. Autorize a localização no navegador para ver oportunidades próximas.");
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              setGeoError("Localização indisponível. Verifique se o GPS/Wi-Fi está ativado. Em previews dentro de iframe a localização pode ser bloqueada — abra o app na URL direta.");
            } else if (err.code === err.TIMEOUT) {
              setGeoError("Tempo esgotado ao localizar você. Tente novamente.");
            } else {
              setGeoError("Não foi possível obter sua localização.");
            }
          },
          { enableHighAccuracy: highAccuracy, timeout: 15000, maximumAge: highAccuracy ? 0 : 60000 }
        );
      };
      tryGet(true);
    } catch (e: any) {
      setGeoStatus("denied");
      setGeoError(e?.message || "Erro ao acessar localização.");
    }
  }, []);

  // Auto-tenta se permissão já foi concedida anteriormente (sem prompt)
  useEffect(() => {
    (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const perm = await Geolocation.checkPermissions();
          if (perm.location === "granted") requestLocation();
        } else if (navigator.permissions) {
          const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          if (status.state === "granted") requestLocation();
        }
      } catch {
        // ignora — usuário usará o botão
      }
    })();
    return () => {
      if (watchIdRef.current != null) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: String(watchIdRef.current) }).catch(() => {});
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
        }
      }
    };
  }, [requestLocation]);


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
    <div className="fixed inset-0 bg-white text-zinc-900 overflow-hidden">
      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); opacity:.4 } 50% { transform: scale(1.6); opacity:0 } }
        .leaflet-container { background:#f1f5f9; font-family: inherit; }
        .leaflet-popup-content-wrapper { background:#ffffff; color:#0a0a0a; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,.12); }
        .leaflet-popup-tip { background:#ffffff; }
        .leaflet-popup-content { margin: 10px 12px; font-size: 12px; }
        .leaflet-control-zoom { margin-top: 90px !important; margin-right: 14px !important; border: none !important; }
        .leaflet-control-zoom a { background:#ffffff !important; color:#18181b !important; border-color:#e4e4e7 !important; }
        .leaflet-control-attribution { background: rgba(255,255,255,.7) !important; color:#52525b !important; font-size:9px !important; }
        .leaflet-control-attribution a { color:#3f3f46 !important; }
      `}</style>

      {/* Mapa fullscreen */}
      <div className="absolute inset-0">
        {coords ? (
          <MapContainer
            center={[coords.lat, coords.lng]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
            zoomControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Recenter coords={coords} />
            <Circle
              center={[coords.lat, coords.lng]}
              radius={5000}
              pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 1 }}
            />
            <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
              <Popup>Você está aqui</Popup>
            </Marker>
            {mappable.map((o) => (
              <Marker key={o.id} position={[o.location_lat!, o.location_lng!]} icon={oppIcon}>
                <Popup>
                  <div className="space-y-1.5 min-w-[180px]">
                    <p className="font-medium text-[13px] text-zinc-900">{o.title}</p>
                    {o.location_address && (
                      <p className="text-[11px] text-zinc-500 truncate">{o.location_address}</p>
                    )}
                    <p className="text-[13px] font-medium text-yellow-600">
                      R$ {Number(o.budget ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/oportunidade/${o.id}`)}
                      className="mt-1 w-full bg-zinc-900 text-white rounded-full py-1.5 text-[11px] font-medium"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-4">
              {geoStatus === "requesting" ? (
                <Loader2 size={26} className="animate-spin text-blue-500" />
              ) : (
                <Navigation size={26} className="text-blue-500" />
              )}
            </div>
            <p className="text-sm font-medium text-zinc-900 mb-1">
              {geoStatus === "requesting" ? "Localizando você…" : "Ative sua localização"}
            </p>
            <p className="text-xs text-zinc-500 max-w-xs mb-5">
              {geoStatus === "requesting"
                ? "Aguardando o GPS do aparelho responder."
                : "Para mostrar oportunidades reais próximas de você, precisamos acessar a localização do seu aparelho."}
            </p>
            {geoError && (
              <p className="text-[11px] text-yellow-700 mb-3 max-w-xs">{geoError}</p>
            )}
            {geoStatus !== "requesting" && (
              <button
                type="button"
                onClick={requestLocation}
                className="bg-zinc-900 text-white rounded-full px-5 py-2.5 text-[13px] font-medium active:scale-95 transition-transform shadow-lg"
              >
                {geoStatus === "denied" ? "Tentar novamente" : "Permitir localização"}
              </button>
            )}
          </div>
        )}

      </div>

      {/* Header flutuante */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pt-10 px-4 pb-3 pointer-events-none bg-gradient-to-b from-white/90 via-white/50 to-transparent">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/95 backdrop-blur border border-zinc-200 flex items-center justify-center outline-none active:scale-95 transition-transform shadow-lg text-zinc-900"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 bg-white/95 backdrop-blur border border-zinc-200 rounded-full px-4 py-2 shadow-lg">
            <p className="text-[13px] font-medium leading-none text-zinc-900">Mapa de oportunidades</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Em tempo real perto de você</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur border border-zinc-200 rounded-full px-3 py-2 shadow-lg">
            <Crosshair size={12} className="text-blue-500" />
            <span className="text-[11px] text-zinc-700 font-medium">{mappable.length}</span>
          </div>
        </div>
        {geoError && (
          <p className="mt-2 text-[10px] text-yellow-700 text-center pointer-events-auto">{geoError}</p>
        )}
      </div>

      {/* Bottom sheet com lista resumida */}
      <div className="absolute bottom-24 left-0 right-0 z-[1000] px-4 pointer-events-none">
        <div className="bg-white/95 backdrop-blur border border-zinc-200 rounded-3xl p-3 pointer-events-auto shadow-2xl max-h-[34vh] flex flex-col">
          <div className="flex justify-between items-center px-2 pb-2 flex-shrink-0">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
              {loading ? "Carregando…" : `${oppsWithDist.length} oportunidades`}
            </p>
            <span className="text-[10px] text-zinc-400">deslize ↓</span>
          </div>
          <div className="overflow-y-auto space-y-1.5 pr-1" style={{ scrollbarWidth: "none" }}>
            {!loading && oppsWithDist.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-4">
                Nenhuma oportunidade aberta nas suas categorias.
              </p>
            )}
            {oppsWithDist.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => navigate(`/oportunidade/${o.id}`)}
                className="w-full text-left bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 flex items-center gap-2.5 outline-none active:scale-[0.99] transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={12} className="text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900 truncate leading-tight">{o.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={9} className="text-zinc-400 flex-shrink-0" />
                    <p className="text-[10px] text-zinc-500 truncate">
                      {o.location_address ?? "Endereço não informado"}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-medium text-zinc-900 leading-none">
                    R$ {Number(o.budget ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </p>
                  {o._dist != null && (
                    <p className="text-[9px] text-zinc-400 mt-0.5">
                      {o._dist < 1 ? `${Math.round(o._dist * 1000)} m` : `${o._dist.toFixed(1)} km`}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <FloatingNav />
    </div>
  );
}

