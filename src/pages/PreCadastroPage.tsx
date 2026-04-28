import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, CheckCircle2, Loader2 } from "lucide-react";
import FreelakiInput from "@/components/ui/FreelakiInput";
import FreelakiButton from "@/components/ui/FreelakiButton";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const errorMessages: Record<string, { message: string; hint?: string }> = {
  invalid_name: { message: "Nome inválido.", hint: "Use seu nome completo." },
  invalid_email: { message: "Email inválido." },
  invalid_phone: { message: "Telefone inválido.", hint: "Inclua o DDD." },
  already_pending: { message: "Você já está na lista de espera!", hint: "Aguarde nosso retorno por email." },
  already_approved: { message: "Você já foi aprovado!", hint: "Verifique seu email pelo código de convite." },
  already_rejected: { message: "Sua candidatura anterior foi recusada.", hint: "Entre em contato com o suporte." },
  already_registered: { message: "Esse email já tem conta no Freelaki.", hint: "Faça login normalmente." },
};

const PreCadastroPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string; hint?: string } | null>(null);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!fullName.trim() || !email.trim() || !phone.trim() || !city.trim() || !state.trim() || !categoryId) {
      setError({ code: "missing", message: "Preencha todos os campos obrigatórios." });
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("submit_waitlist_application", {
        p_full_name: fullName.trim(),
        p_email: email.trim().toLowerCase(),
        p_phone: phone.trim(),
        p_city: city.trim(),
        p_state: state.trim().toUpperCase(),
        p_category_id: categoryId,
        p_portfolio_url: portfolio.trim() || null,
        p_message: message.trim() || null,
      });
      if (rpcErr) throw rpcErr;
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        const msg = errorMessages[result.error ?? ""] ?? { message: "Não foi possível enviar." };
        setError({ code: result.error ?? "unknown", ...msg });
        return;
      }
      setSubmitted(true);
    } catch {
      setError({ code: "unexpected", message: "Erro ao enviar. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center"
        style={{ background: "#0A0A0F" }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full mb-6"
          style={{ background: "rgba(39,110,241,0.15)", animation: "pop 500ms ease-out both" }}
        >
          <CheckCircle2 size={32} color="#276EF1" strokeWidth={2.2} />
        </div>
        <h1 className="text-[26px] font-bold text-white leading-tight">
          Pedido recebido!
        </h1>
        <p className="mt-3 text-[14px] text-white/55 font-light max-w-[300px] leading-relaxed">
          Vamos analisar sua candidatura. Se aprovado, você receberá um código de convite por email para concluir o cadastro.
        </p>

        <button
          onClick={() => navigate("/")}
          className="mt-10 h-[52px] px-8 rounded-xl text-[15px] font-semibold text-white"
          style={{ background: "#276EF1" }}
        >
          Voltar ao início
        </button>

        <style>{`
          @keyframes pop {
            from { opacity: 0; transform: scale(0.7); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "#0A0A0F" }}>
      <div className="px-5 pt-6 pb-2 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-4 hide-scrollbar">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: "rgba(39,110,241,0.12)" }}
        >
          <UserPlus size={22} color="#276EF1" strokeWidth={2.2} />
        </div>
        <h1 className="mt-5 text-[26px] font-bold text-white leading-tight">
          Quer entrar pro Freelaki?
        </h1>
        <p className="mt-2 text-[14px] text-white/50 font-light leading-relaxed">
          Conta um pouco sobre você. Se aprovado, você recebe um código de convite por email para se cadastrar.
        </p>

        <div className="mt-6 space-y-3">
          <FreelakiInput label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
          <FreelakiInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" type="email" autoCapitalize="none" />
          <FreelakiInput label="WhatsApp" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(11) 99999-9999" />

          <div className="grid grid-cols-[1fr_88px] gap-3">
            <FreelakiInput label="Cidade" value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" />
            <FreelakiInput label="UF" value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-[12px] font-medium text-white/60 mb-1.5 px-1">
              Categoria principal
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-[52px] px-4 rounded-xl text-[15px] text-white appearance-none focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1.5px solid rgba(255,255,255,0.10)",
              }}
            >
              <option value="" style={{ background: "#0A0A0F" }}>Selecione…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} style={{ background: "#0A0A0F" }}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <FreelakiInput
            label="Instagram ou portfólio (opcional)"
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value)}
            placeholder="@seuhandle ou link"
            autoCapitalize="none"
          />

          {/* Mensagem */}
          <div>
            <label className="flex items-center justify-between text-[12px] font-medium text-white/60 mb-1.5 px-1">
              <span>Por que você quer entrar? (opcional)</span>
              <span className="text-white/40">{message.length}/280</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              placeholder="Conte um pouco sobre seu trabalho…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-[14px] text-white resize-none focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1.5px solid rgba(255,255,255,0.10)",
              }}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner code={error.code} message={error.message} hint={error.hint} />
          </div>
        )}
      </div>

      <div className="px-6 pb-8 pt-3 shrink-0" style={{ background: "#0A0A0F" }}>
        <FreelakiButton onClick={handleSubmit} loading={loading} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : "Enviar candidatura"}
        </FreelakiButton>
      </div>
    </div>
  );
};

export default PreCadastroPage;
