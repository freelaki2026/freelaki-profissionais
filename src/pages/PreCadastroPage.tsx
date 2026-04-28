import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, Check } from "lucide-react";
import ErrorBanner from "@/components/ui/ErrorBanner";
import CategoryIcon from "@/components/ui/CategoryIcon";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const MAX_CATEGORIES = 3;

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

/* --- Field primitives ------------------------------------------------------ */

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center justify-between px-1 mb-1.5">
      <label className="text-[11px] font-semibold tracking-wide uppercase text-white/45">
        {label}
      </label>
      {hint && <span className="text-[11px] text-white/35">{hint}</span>}
    </div>
    {children}
  </div>
);

const inputCls =
  "w-full h-[52px] px-4 rounded-xl text-[15px] text-white placeholder:text-white/30 transition-all focus:outline-none";
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1.5px solid rgba(255,255,255,0.08)",
};
const inputFocusStyle: React.CSSProperties = {
  background: "rgba(39,110,241,0.06)",
  border: "1.5px solid #276EF1",
};

/* --- Page ------------------------------------------------------------------ */

const PreCadastroPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState("");
  const [message, setMessage] = useState("");

  const [focused, setFocused] = useState<string | null>(null);
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

  const toggleCat = (id: string) => {
    setSelectedCats((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_CATEGORIES) return prev;
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !city.trim() ||
      !state.trim() ||
      selectedCats.length === 0
    ) {
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
        p_category_id: selectedCats[0], // primária — compat backend
        p_portfolio_url: portfolio.trim() || null,
        p_message: [
          selectedCats.length > 1
            ? `Categorias adicionais: ${selectedCats
                .slice(1)
                .map((id) => categories.find((c) => c.id === id)?.name)
                .filter(Boolean)
                .join(", ")}`
            : null,
          message.trim() || null,
        ]
          .filter(Boolean)
          .join("\n\n") || null,
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

  /* --- Success screen ----------------------------------------------------- */
  if (submitted) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center overflow-hidden"
        style={{ background: "#0A0A0F" }}
      >
        {/* Glow ambiente */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(39,110,241,0.25) 0%, transparent 70%)",
            filter: "blur(40px)",
            top: "30%",
            transform: "translateY(-50%)",
          }}
        />

        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-full mb-8"
          style={{
            background: "linear-gradient(135deg, #276EF1 0%, #1B4FB8 100%)",
            boxShadow: "0 16px 40px -10px rgba(39,110,241,0.55)",
            animation: "pop 500ms cubic-bezier(.34,1.56,.64,1) both",
          }}
        >
          <CheckCircle2 size={38} color="#fff" strokeWidth={2.4} />
        </div>

        <h1 className="relative text-[28px] font-bold text-white leading-tight tracking-tight">
          Candidatura enviada!
        </h1>
        <p className="relative mt-3 text-[14px] text-white/55 font-light max-w-[300px] leading-relaxed">
          Vamos analisar seu perfil. Se aprovado, você receberá um código de convite por email para concluir o cadastro.
        </p>

        <button
          onClick={() => navigate("/")}
          className="relative mt-10 h-[52px] px-10 rounded-xl text-[15px] font-semibold text-white transition-transform active:scale-95"
          style={{
            background: "#276EF1",
            boxShadow: "0 8px 24px -8px rgba(39,110,241,0.5)",
          }}
        >
          Voltar ao início
        </button>

        <style>{`
          @keyframes pop {
            from { opacity: 0; transform: scale(0.6); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  /* --- Form --------------------------------------------------------------- */
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "#0A0A0F" }}>
      {/* Glow decorativo no topo */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(39,110,241,0.18) 0%, transparent 65%)",
          filter: "blur(50px)",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* Header */}
      <div className="relative px-5 pt-5 pb-1 shrink-0 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <ArrowLeft size={18} />
        </button>
        <div
          className="flex items-center gap-1.5 px-3 h-8 rounded-full"
          style={{
            background: "rgba(39,110,241,0.12)",
            border: "1px solid rgba(39,110,241,0.25)",
          }}
        >
          <Sparkles size={12} color="#7AA8FF" />
          <span className="text-[11px] font-semibold text-[#7AA8FF] tracking-wide">
            LISTA DE ESPERA
          </span>
        </div>
      </div>

      {/* Scroll content */}
      <div className="relative flex-1 overflow-y-auto px-6 pt-6 pb-4 hide-scrollbar">
        <h1 className="text-[30px] font-bold text-white leading-[1.1] tracking-tight">
          Bora fazer parte
          <br />
          do <span className="text-white">free</span><span style={{ color: "#276EF1" }}>laki</span>?
        </h1>
        <p className="mt-3 text-[14px] text-white/50 font-light leading-relaxed max-w-[320px]">
          Conta um pouco sobre você. Se seu perfil bater com a gente, você recebe um convite por email.
        </p>

        <div className="mt-7 space-y-4">
          <Field label="Nome completo">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              placeholder="Como você se chama?"
              className={inputCls}
              style={focused === "name" ? inputFocusStyle : inputStyle}
            />
          </Field>

          <Field label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              placeholder="seu@email.com"
              type="email"
              autoCapitalize="none"
              className={inputCls}
              style={focused === "email" ? inputFocusStyle : inputStyle}
            />
          </Field>

          <Field label="WhatsApp">
            <input
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              onFocus={() => setFocused("phone")}
              onBlur={() => setFocused(null)}
              placeholder="(11) 99999-9999"
              className={inputCls}
              style={focused === "phone" ? inputFocusStyle : inputStyle}
            />
          </Field>

          <div className="grid grid-cols-[1fr_88px] gap-3">
            <Field label="Cidade">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onFocus={() => setFocused("city")}
                onBlur={() => setFocused(null)}
                placeholder="São Paulo"
                className={inputCls}
                style={focused === "city" ? inputFocusStyle : inputStyle}
              />
            </Field>
            <Field label="UF">
              <input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                onFocus={() => setFocused("uf")}
                onBlur={() => setFocused(null)}
                placeholder="SP"
                className={`${inputCls} text-center font-semibold`}
                style={focused === "uf" ? inputFocusStyle : inputStyle}
              />
            </Field>
          </div>

          {/* Categorias - Chips */}
          <Field
            label="Categorias"
            hint={`${selectedCats.length}/${MAX_CATEGORIES} • escolha até 3`}
          >
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = selectedCats.includes(c.id);
                const disabled = !active && selectedCats.length >= MAX_CATEGORIES;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => !disabled && toggleCat(c.id)}
                    disabled={disabled}
                    className="flex items-center gap-2 h-10 px-3.5 rounded-full text-[13px] font-medium transition-all active:scale-95"
                    style={{
                      background: active
                        ? "linear-gradient(135deg, #276EF1 0%, #1B4FB8 100%)"
                        : "rgba(255,255,255,0.04)",
                      border: active
                        ? "1.5px solid #276EF1"
                        : "1.5px solid rgba(255,255,255,0.08)",
                      color: active ? "#fff" : disabled ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.75)",
                      boxShadow: active ? "0 6px 16px -6px rgba(39,110,241,0.55)" : "none",
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    <CategoryIcon
                      slug={c.slug}
                      name={c.name}
                      size={14}
                      strokeWidth={2.2}
                    />
                    <span>{c.name}</span>
                    {active && <Check size={13} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Instagram ou portfólio" hint="opcional">
            <input
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              onFocus={() => setFocused("port")}
              onBlur={() => setFocused(null)}
              placeholder="@seuhandle ou link"
              autoCapitalize="none"
              className={inputCls}
              style={focused === "port" ? inputFocusStyle : inputStyle}
            />
          </Field>

          <Field label="Por que você quer entrar?" hint={`${message.length}/280`}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 280))}
              onFocus={() => setFocused("msg")}
              onBlur={() => setFocused(null)}
              placeholder="Conte um pouco sobre seu trabalho…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-[14px] text-white placeholder:text-white/30 resize-none focus:outline-none transition-all"
              style={focused === "msg" ? inputFocusStyle : inputStyle}
            />
          </Field>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner code={error.code} message={error.message} hint={error.hint} />
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* CTA fixo */}
      <div
        className="relative px-6 pb-7 pt-4 shrink-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,15,0) 0%, #0A0A0F 30%)",
        }}
      >
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-[54px] rounded-xl text-[15px] font-semibold text-white flex items-center justify-center transition-transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #276EF1 0%, #1B4FB8 100%)",
            boxShadow: "0 12px 32px -10px rgba(39,110,241,0.55)",
          }}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            "Enviar candidatura"
          )}
        </button>
        <p className="text-center text-[11px] text-white/35 mt-3">
          Análise leva até 48h • Resposta por email
        </p>
      </div>
    </div>
  );
};

export default PreCadastroPage;
