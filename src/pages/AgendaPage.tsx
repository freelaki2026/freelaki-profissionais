import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarX, CheckCircle2 } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MONTHS_AHEAD = 3;

const AgendaPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const today = startOfToday();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  // Build month list (current + N-1 next)
  const months = useMemo(
    () => Array.from({ length: MONTHS_AHEAD }, (_, i) => addMonths(today, i)),
    [today],
  );

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }
      setUserId(session.user.id);

      const startISO = format(startOfMonth(today), "yyyy-MM-dd");
      const endISO = format(endOfMonth(addMonths(today, MONTHS_AHEAD - 1)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("professional_unavailable_dates")
        .select("unavailable_date")
        .eq("profile_id", session.user.id)
        .gte("unavailable_date", startISO)
        .lte("unavailable_date", endISO);

      if (!error && data) {
        setBlockedDates(new Set(data.map((d: any) => d.unavailable_date)));
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const toggleDate = async (date: Date) => {
    if (!userId) return;
    if (isBefore(date, today)) return;

    const iso = format(date, "yyyy-MM-dd");
    const isBlocked = blockedDates.has(iso);
    setSaving(iso);

    // Optimistic update
    const next = new Set(blockedDates);
    if (isBlocked) next.delete(iso);
    else next.add(iso);
    setBlockedDates(next);

    if (isBlocked) {
      const { error } = await supabase
        .from("professional_unavailable_dates")
        .delete()
        .eq("profile_id", userId)
        .eq("unavailable_date", iso);
      if (error) {
        next.add(iso);
        setBlockedDates(new Set(next));
        toast({ title: "Erro ao desbloquear", description: error.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase
        .from("professional_unavailable_dates")
        .insert({ profile_id: userId, unavailable_date: iso });
      if (error) {
        next.delete(iso);
        setBlockedDates(new Set(next));
        toast({ title: "Erro ao bloquear", description: error.message, variant: "destructive" });
      }
    }
    setSaving(null);
  };

  return (
    <div className="min-h-screen bg-white pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#F0F0F0] bg-white/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="-ml-2 p-2">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold text-foreground">Minha Agenda</h1>
          <p className="text-[12px] text-[#767676]">Toque nos dias que você não trabalha</p>
        </div>
      </header>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8F5E9]">
            <CheckCircle2 size={12} className="text-[#2E7D32]" />
          </span>
          <span className="text-[12px] text-[#767676]">Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFEBEE]">
            <CalendarX size={12} className="text-[#E53935]" />
          </span>
          <span className="text-[12px] text-[#767676]">Bloqueado</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6 px-4">
          {months.map((monthDate) => (
            <MonthGrid
              key={monthDate.toISOString()}
              monthDate={monthDate}
              today={today}
              blockedDates={blockedDates}
              savingIso={saving}
              onToggle={toggleDate}
            />
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="mx-4 mt-8 rounded-2xl bg-[#F7F8FA] p-4">
        <p className="text-[13px] leading-relaxed text-[#555]">
          💡 Os dias bloqueados ficam invisíveis para clientes na hora de agendar serviços com você.
        </p>
      </div>
    </div>
  );
};

/* ─── Month grid ─── */
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const MonthGrid = ({
  monthDate,
  today,
  blockedDates,
  savingIso,
  onToggle,
}: {
  monthDate: Date;
  today: Date;
  blockedDates: Set<string>;
  savingIso: string | null;
  onToggle: (d: Date) => void;
}) => {
  const days = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) });
  const firstDayOfWeek = startOfMonth(monthDate).getDay(); // 0=sun
  const blanks = Array.from({ length: firstDayOfWeek });

  return (
    <section>
      <h2 className="mb-3 text-center text-[15px] font-bold capitalize text-foreground">
        {format(monthDate, "MMMM yyyy", { locale: ptBR })}
      </h2>

      {/* Weekday header */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-[#999]">
            {w}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((_, i) => <div key={`b-${i}`} />)}
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const isPast = isBefore(day, today) && !isSameDay(day, today);
          const isBlocked = blockedDates.has(iso);
          const isSaving = savingIso === iso;
          const isCurrentDay = isSameDay(day, today);

          return (
            <motion.button
              key={iso}
              whileTap={{ scale: 0.92 }}
              disabled={isPast || isSaving}
              onClick={() => onToggle(day)}
              className={[
                "relative flex aspect-square items-center justify-center rounded-xl text-[14px] font-medium transition-colors",
                isPast
                  ? "cursor-not-allowed text-[#CCC]"
                  : isBlocked
                  ? "bg-[#FFEBEE] text-[#E53935] line-through"
                  : "bg-[#F0F4FF] text-foreground hover:bg-[#E5EBFF]",
                isCurrentDay && !isBlocked ? "ring-2 ring-[#276EF1]" : "",
              ].join(" ")}
            >
              {day.getDate()}
              {isSaving && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#276EF1] border-t-transparent" />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default AgendaPage;
