import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import FreelakiButton from "@/components/ui/FreelakiButton";

interface TermData {
  id: string;
  version: string;
  content: string;
  created_at: string | null;
}

interface AcceptanceData {
  id: string;
  accepted_at: string | null;
  terms_id: string | null;
}

const TermosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [term, setTerm] = useState<TermData | null>(null);
  const [acceptance, setAcceptance] = useState<AcceptanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [termsRes, accRes] = await Promise.all([
        supabase.from("terms").select("*").eq("is_active", true).limit(1).maybeSingle(),
        supabase
          .from("terms_acceptance")
          .select("*")
          .eq("profile_id", user.id)
          .order("accepted_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (termsRes.data) setTerm(termsRes.data);
      if (accRes.data) setAcceptance(accRes.data);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleAccept = async () => {
    if (!user || !term) return;
    setAccepting(true);
    try {
      const now = new Date().toISOString();
      const { error: insertErr } = await supabase.from("terms_acceptance").insert({
        profile_id: user.id,
        terms_id: term.id,
        accepted_at: now,
      });
      if (insertErr) throw insertErr;

      await supabase
        .from("profiles")
        .update({ terms_accepted: true, terms_accepted_at: now })
        .eq("id", user.id);

      setAcceptance({ id: "", accepted_at: now, terms_id: term.id });
      toast("Termos aceitos! ✓", {
        style: { background: "#000000", color: "#FFFFFF", border: "none" },
      });
    } catch {
      toast.error("Erro ao aceitar termos.");
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR");
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-3" />;
      if (/^\d+\./.test(trimmed)) {
        return (
          <p key={i} style={{ fontWeight: 700, fontSize: 15, color: "#000000", marginTop: 20, marginBottom: 6 }}>
            {trimmed}
          </p>
        );
      }
      return (
        <p key={i} style={{ fontWeight: 400, fontSize: 14, color: "#767676", lineHeight: 1.8 }}>
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#000000" }}>
      {/* Header */}
      <div style={{ padding: "52px 24px 24px", background: "#000000" }} className="flex items-center relative">
        <button onClick={() => navigate(-1)} className="z-10">
          <X size={24} color="#FFFFFF" />
        </button>
        <span
          className="absolute left-0 right-0 text-center"
          style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 17, color: "#FFFFFF" }}
        >
          Termos de Uso
        </span>
      </div>

      {/* Body */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 overflow-y-auto hide-scrollbar"
        style={{
          background: "#FFFFFF",
          borderRadius: "24px 24px 0 0",
          padding: "24px 20px 120px",
        }}
      >
        {loading ? (
          <div className="space-y-4">
            {[180, 40, 40, 200, 160, 200].map((h, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg"
                style={{ height: h, background: "linear-gradient(90deg, #F0F0F0 25%, #E0E0E0 50%, #F0F0F0 75%)", backgroundSize: "200% 100%" }}
              />
            ))}
          </div>
        ) : !term ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p style={{ fontWeight: 600, fontSize: 16, color: "#000000" }}>Nenhum termo disponível</p>
            <p style={{ fontSize: 13, color: "#767676", marginTop: 8 }}>Os termos serão publicados em breve.</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 18, color: "#000000" }}>
              Freelaki Profissionais
            </h1>
            <p style={{ fontSize: 13, color: "#767676", marginTop: 4 }}>Versão {term.version}</p>
            <p style={{ fontSize: 13, color: "#767676" }}>Atualizado em {formatDate(term.created_at)}</p>
            <div style={{ height: 1, background: "#E5E5E5", margin: "16px 0" }} />
            {renderContent(term.content)}
          </>
        )}
      </motion.div>

      {/* Footer */}
      {!loading && term && (
        <div
          className="fixed bottom-0 left-0 right-0"
          style={{
            background: "#FFFFFF",
            borderTop: "1px solid #E5E5E5",
            padding: "16px 20px",
          }}
        >
          {acceptance ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle size={16} color="#2E7D32" />
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 13, color: "#767676" }}>
                Aceito em {formatDateTime(acceptance.accepted_at)}
              </span>
            </div>
          ) : (
            <FreelakiButton onClick={handleAccept} loading={accepting}>
              Aceitar Termos
            </FreelakiButton>
          )}
        </div>
      )}
    </div>
  );
};

export default TermosPage;
