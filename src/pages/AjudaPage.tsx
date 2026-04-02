import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ChevronRight, Mail, MessageCircle, FileText, Loader2 } from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function AjudaPage() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("faqs").select("*").eq("is_active", true).order("order_index").then(({ data }) => {
      setFaqs(data || []);
      setLoading(false);
    });
  }, []);

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      {/* Header */}
      <div className="bg-black" style={{ padding: "52px 24px 24px" }}>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 17, color: "#fff" }}>Ajuda</span>
          <div style={{ width: 24 }} />
        </div>
      </div>

      {/* Body */}
      <motion.div
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}
        className="flex-1 overflow-y-auto"
        style={{ borderRadius: "24px 24px 0 0", marginTop: -1, padding: "20px 16px 40px" }}
      >
        {/* FAQ */}
        <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600, fontFamily: "Inter" }}>PERGUNTAS FREQUENTES</p>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#276EF1]" size={24} /></div>
        ) : faqs.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginTop: 10 }}>
            <p style={{ fontFamily: "Inter", fontSize: 14, color: "#767676", textAlign: "center" }}>Nenhuma pergunta disponível.</p>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 16, marginTop: 10, overflow: "hidden" }}>
            {faqs.map((faq, i) => {
              const isOpen = openId === faq.id;
              return (
                <div key={faq.id} style={{ borderBottom: i < faqs.length - 1 ? "1px solid #F7F7F7" : "none" }}>
                  <button
                    onClick={() => toggle(faq.id)}
                    className="w-full flex items-center justify-between text-left"
                    style={{ padding: 16 }}
                  >
                    <span style={{ fontFamily: "Inter", fontWeight: isOpen ? 600 : 500, fontSize: 14, color: isOpen ? "#276EF1" : "#000", flex: 1, marginRight: 12 }}>
                      {faq.question}
                    </span>
                    {isOpen ? <ChevronUp size={20} color="#276EF1" className="shrink-0" /> : <ChevronDown size={20} color="#767676" className="shrink-0" />}
                  </button>
                  <div
                    style={{
                      maxHeight: isOpen ? 500 : 0,
                      overflow: "hidden",
                      transition: "max-height 200ms ease",
                    }}
                  >
                    <p style={{ padding: "0 16px 16px", fontFamily: "Inter", fontWeight: 400, fontSize: 13, color: "#767676", lineHeight: 1.7 }}>
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Fale Conosco */}
        <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600, fontFamily: "Inter", marginTop: 24 }}>FALE CONOSCO</p>

        <button
          onClick={() => window.open("mailto:suporte@freelaqui.com.br")}
          className="w-full flex items-center text-left"
          style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #E5E5E5", marginTop: 10 }}
        >
          <div className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(39,110,241,0.08)" }}>
            <Mail size={20} color="#276EF1" />
          </div>
          <div className="flex-1" style={{ marginLeft: 12 }}>
            <p style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: "#000" }}>Email</p>
            <p style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 12, color: "#767676" }}>suporte@freelaqui.com.br</p>
          </div>
          <ChevronRight size={18} color="#767676" className="shrink-0" />
        </button>

        <button
          onClick={() => navigate("/suporte")}
          className="w-full flex items-center text-left"
          style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #E5E5E5", marginTop: 10 }}
        >
          <div className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(39,110,241,0.08)" }}>
            <MessageCircle size={20} color="#276EF1" />
          </div>
          <div className="flex-1" style={{ marginLeft: 12 }}>
            <p style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: "#000" }}>Chat de suporte</p>
            <p style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 12, color: "#767676" }}>Resposta em até 24h</p>
          </div>
          <ChevronRight size={18} color="#767676" className="shrink-0" />
        </button>

        {/* Legal */}
        <p style={{ letterSpacing: 2, color: "#767676", fontSize: 10, fontWeight: 600, fontFamily: "Inter", marginTop: 24 }}>LEGAL</p>

        <button
          onClick={() => navigate("/termos")}
          className="w-full flex items-center text-left"
          style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #E5E5E5", marginTop: 10 }}
        >
          <FileText size={20} color="#276EF1" className="shrink-0" />
          <span className="flex-1" style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: "#000", marginLeft: 12 }}>Termos e Condições</span>
          <ChevronRight size={18} color="#767676" className="shrink-0" />
        </button>
      </motion.div>
    </div>
  );
}
