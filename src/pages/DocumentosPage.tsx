import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface DocRecord {
  id: string;
  doc_type: string;
  file_url: string;
  file_name: string | null;
  status: string | null;
  rejection_reason: string | null;
}

const DOC_TYPES = [
  { type: "rg_frente", label: "RG — Frente" },
  { type: "rg_verso", label: "RG — Verso" },
  { type: "selfie", label: "Selfie com documento" },
  { type: "comprovante_residencia", label: "Comprovante de residência" },
];

const DocumentosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadData = useCallback(async () => {
    if (!user) return;
    const [{ data: docData }, { data: profileData }] = await Promise.all([
      supabase.from("documents").select("*").eq("profile_id", user.id),
      supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", user.id)
        .single(),
    ]);
    if (docData) setDocs(docData as DocRecord[]);
    if (profileData) setApprovalStatus(profileData.approval_status);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDoc = (type: string) => docs.find((d) => d.doc_type === type);

  const handleUpload = async (docType: string, file: File) => {
    if (!user) return;
    setUploading(docType);
    setProgress(0);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${docType}_${Date.now()}.${ext}`;

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 90));
    }, 200);

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, file, { upsert: true });

    clearInterval(interval);

    if (uploadError) {
      setUploading(null);
      toast({ title: "Erro no upload. Tente novamente.", variant: "destructive" });
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("documents").getPublicUrl(path);

    // Check if doc already exists
    const existing = getDoc(docType);
    if (existing) {
      await supabase
        .from("documents")
        .update({
          file_url: publicUrl,
          file_name: file.name,
          status: "pending",
          rejection_reason: null,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("documents").insert({
        profile_id: user.id,
        doc_type: docType,
        file_url: publicUrl,
        file_name: file.name,
        status: "pending",
      });
    }

    setProgress(100);
    setTimeout(async () => {
      setUploading(null);
      setProgress(0);
      await loadData();

      // Check if all 4 docs are now submitted
      const { data: freshDocs } = await supabase
        .from("documents")
        .select("doc_type, status")
        .eq("profile_id", user!.id);

      if (freshDocs) {
        const submitted = DOC_TYPES.every((dt) =>
          freshDocs.some((d) => d.doc_type === dt.type && d.status)
        );
        if (submitted && approvalStatus !== "pending" && approvalStatus !== "approved") {
          await supabase
            .from("profiles")
            .update({ approval_status: "pending" })
            .eq("id", user!.id);
          setApprovalStatus("pending");
          toast({ title: "Documentos enviados! Análise em até 3 dias úteis. ✓" });
        }
      }
    }, 400);
  };

  const statusBanner = () => {
    switch (approvalStatus) {
      case "incomplete":
        return {
          bg: "#FFF3E0",
          color: "#B45309",
          icon: <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "#B45309" }} />,
          text: "Envie seus documentos para ativar a conta",
        };
      case "pending":
        return {
          bg: "#E3F2FD",
          color: "#1565C0",
          icon: <Clock className="h-5 w-5 shrink-0" style={{ color: "#1565C0" }} />,
          text: "Documentos em análise — até 3 dias úteis",
        };
      case "approved":
        return {
          bg: "#E8F5E9",
          color: "#2E7D32",
          icon: <CheckCircle className="h-5 w-5 shrink-0" style={{ color: "#2E7D32" }} />,
          text: "Cadastro aprovado! Você já pode receber oportunidades.",
        };
      case "rejected":
        return {
          bg: "#FFEBEE",
          color: "#C62828",
          icon: <XCircle className="h-5 w-5 shrink-0" style={{ color: "#C62828" }} />,
          text: "Documento rejeitado. Veja o motivo e reenvie.",
        };
      default:
        return {
          bg: "#FFF3E0",
          color: "#B45309",
          icon: <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "#B45309" }} />,
          text: "Envie seus documentos para ativar a conta",
        };
    }
  };

  const banner = statusBanner();

  const renderDocStatus = (doc: DocRecord | undefined) => {
    if (!doc || !doc.status)
      return { label: "Pendente", bg: "#F7F7F7", color: "#767676" };
    switch (doc.status) {
      case "pending":
        return { label: "Em análise", bg: "#FFF3E0", color: "#B45309" };
      case "approved":
        return { label: "Aprovado ✓", bg: "#E8F5E9", color: "#2E7D32" };
      case "rejected":
        return { label: "Rejeitado", bg: "#FFEBEE", color: "#C62828" };
      default:
        return { label: "Pendente", bg: "#F7F7F7", color: "#767676" };
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 pt-[52px] pb-6">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6 text-white" />
        </button>
        <span className="text-[17px] font-semibold text-white">Documentos</span>
        <div className="w-6" />
      </div>

      {/* BODY */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-1 rounded-t-3xl bg-[#F7F7F7] px-4 pb-10 pt-5 overflow-y-auto"
      >
        {/* Status Banner */}
        <div
          className="mb-5 flex items-center gap-3 rounded-[14px] px-4 py-3.5"
          style={{ background: banner.bg }}
        >
          {banner.icon}
          <span className="text-[13px] font-medium" style={{ color: banner.color }}>
            {banner.text}
          </span>
        </div>

        {/* Label */}
        <p className="mb-3 text-[10px] font-semibold tracking-[2px] text-[hsl(var(--muted-foreground))]">
          DOCUMENTOS OBRIGATÓRIOS
        </p>

        {/* Document Cards */}
        {DOC_TYPES.map(({ type, label }) => {
          const doc = getDoc(type);
          const status = renderDocStatus(doc);
          const isUploading = uploading === type;

          return (
            <div
              key={type}
              className="relative mb-2.5 flex items-center rounded-2xl border border-[#E5E5E5] bg-white p-4"
            >
              {/* Thumbnail / Icon */}
              {doc?.file_url && doc.status ? (
                <img
                  src={doc.file_url}
                  alt={label}
                  className="h-[52px] w-[52px] shrink-0 rounded-[10px] object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] bg-[#F7F7F7]">
                  <FileText className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
                </div>
              )}

              {/* Center */}
              <div className="flex-1 px-3">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <span
                  className="mt-1 inline-block rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                  style={{ background: status.bg, color: status.color }}
                >
                  {status.label}
                </span>
                {doc?.status === "rejected" && doc.rejection_reason && (
                  <p className="mt-1 text-[11px]" style={{ color: "#C62828" }}>
                    {doc.rejection_reason}
                  </p>
                )}
              </div>

              {/* Right action */}
              <div className="shrink-0">
                {!doc || !doc.status ? (
                  <button
                    onClick={() => fileRefs.current[type]?.click()}
                    className="rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-white"
                    style={{ background: "#276EF1" }}
                  >
                    Enviar
                  </button>
                ) : doc.status === "pending" ? (
                  <Clock className="h-5 w-5" style={{ color: "#B45309" }} />
                ) : doc.status === "approved" ? (
                  <CheckCircle className="h-5 w-5" style={{ color: "#2E7D32" }} />
                ) : doc.status === "rejected" ? (
                  <button
                    onClick={() => fileRefs.current[type]?.click()}
                    className="rounded-[10px] px-3.5 py-2 text-[13px] font-semibold"
                    style={{ background: "#FFEBEE", color: "#C62828" }}
                  >
                    Reenviar
                  </button>
                ) : null}
              </div>

              {/* Hidden file input */}
              <input
                ref={(el) => (fileRefs.current[type] = el)}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(type, file);
                  e.target.value = "";
                }}
              />

              {/* Upload progress bar */}
              {isUploading && (
                <div className="absolute bottom-0 left-4 right-4 h-[3px] overflow-hidden rounded-full bg-[#E3F2FD]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: "#276EF1" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default DocumentosPage;
