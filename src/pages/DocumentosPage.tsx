import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Camera,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DocUploadArea from "@/components/documentos/DocUploadArea";

interface DocRecord {
  id: string;
  doc_type: string;
  file_url: string;
  file_name: string | null;
  status: string | null;
  rejection_reason: string | null;
}

type DocIdType = "rg" | "cnh" | "passaporte";

const ALL_REQUIRED_TYPES = ["rg_frente", "selfie", "comprovante_residencia"];

const DocumentosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedDocType, setSelectedDocType] = useState<DocIdType | null>(null);

  const [identityLocked, setIdentityLocked] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [{ data: docData }, { data: profileData }] = await Promise.all([
      supabase.from("documents").select("*").eq("profile_id", user.id),
      supabase
        .from("profiles")
        .select("approval_status, identity_doc_type")
        .eq("id", user.id)
        .single(),
    ]);
    if (docData) setDocs(docData as DocRecord[]);
    if (profileData) {
      setApprovalStatus(profileData.approval_status);
      const locked = (profileData as any).identity_doc_type as DocIdType | null;
      if (locked) {
        setSelectedDocType(locked);
        setIdentityLocked(true);
      }
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDoc = (type: string) => docs.find((d) => d.doc_type === type);

  const handleUpload = async (docType: string, file: File) => {
    if (!user) return;

    // Validate size
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande. Máx 10MB.", variant: "destructive" });
      return;
    }

    setUploading(docType);
    setProgress(0);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${docType}_${Date.now()}.${ext}`;

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

    // Trava o tipo de documento de identidade no 1º upload
    if ((docType === "rg_frente" || docType === "rg_verso") && !identityLocked && selectedDocType) {
      await supabase
        .from("profiles")
        .update({ identity_doc_type: selectedDocType } as any)
        .eq("id", user.id);
      setIdentityLocked(true);
    }



    setProgress(100);
    setTimeout(async () => {
      setUploading(null);
      setProgress(0);
      await loadData();

      // Check if all required docs are now submitted
      const { data: freshDocs } = await supabase
        .from("documents")
        .select("doc_type, status")
        .eq("profile_id", user!.id);

      if (freshDocs) {
        const submitted = ALL_REQUIRED_TYPES.every((dt) =>
          freshDocs.some((d) => d.doc_type === dt && d.status)
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
  const IMG_ACCEPT = "image/jpeg,image/png,image/heif,image/heic";
  const IMG_LABEL = "JPEG, PNG, HEIC — máx 10MB";
  const ALL_ACCEPT = "image/jpeg,image/png,image/heif,image/heic,application/pdf";
  const ALL_LABEL = "JPEG, PNG, HEIC ou PDF — máx 10MB";

  const docTypes: DocIdType[] = ["rg", "cnh", "passaporte"];
  const docTypeLabels: Record<DocIdType, string> = { rg: "RG", cnh: "CNH", passaporte: "Passaporte" };

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
        className="flex-1 rounded-t-3xl bg-[#F7F7F7] px-4 pb-10 pt-5 overflow-y-auto hide-scrollbar"
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

        {/* ── DOCUMENTO DE IDENTIDADE ── */}
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 2,
            color: "#767676",
          }}
        >
          DOCUMENTO DE IDENTIDADE
        </p>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            padding: 16,
            marginTop: 10,
          }}
        >
          {identityLocked && selectedDocType ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 500, color: "#000000" }}>
                Tipo selecionado
              </p>
              <span
                style={{
                  background: "#276EF1",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 20,
                  padding: "6px 14px",
                }}
              >
                {docTypeLabels[selectedDocType]}
              </span>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#000000" }}>
                Selecione seu tipo de documento:
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {docTypes.map((dt) => (
                  <button
                    key={dt}
                    onClick={() => setSelectedDocType(dt)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 12,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: selectedDocType === dt ? 600 : 400,
                      background: selectedDocType === dt ? "#276EF1" : "#F7F7F7",
                      color: selectedDocType === dt ? "#FFFFFF" : "#767676",
                      transition: "all 200ms",
                    }}
                  >
                    {docTypeLabels[dt]}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Expandable upload items */}
          <AnimatePresence mode="wait">
            {selectedDocType && (
              <motion.div
                key={selectedDocType}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: "hidden" }}
              >
                {selectedDocType === "rg" && (
                  <>
                    <UploadItem
                      label="RG — Frente"
                      hint="📸 Documento aberto, frente visível, sem reflexo ou sombra"
                      doc={getDoc("rg_frente")}
                      docType="rg_frente"
                      accept={IMG_ACCEPT}
                      acceptLabel={IMG_LABEL}
                      uploading={uploading === "rg_frente"}
                      progress={progress}
                      onUpload={handleUpload}
                    />
                    <UploadItem
                      label="RG — Verso"
                      hint="📸 Verso do documento plano e legível"
                      doc={getDoc("rg_verso")}
                      docType="rg_verso"
                      accept={IMG_ACCEPT}
                      acceptLabel={IMG_LABEL}
                      uploading={uploading === "rg_verso"}
                      progress={progress}
                      onUpload={handleUpload}
                    />
                  </>
                )}
                {selectedDocType === "cnh" && (
                  <UploadItem
                    label="CNH — Frente"
                    hint="📸 CNH aberta mostrando foto e dados, boa iluminação"
                    doc={getDoc("rg_frente")}
                    docType="rg_frente"
                    accept={IMG_ACCEPT}
                    acceptLabel={IMG_LABEL}
                    uploading={uploading === "rg_frente"}
                    progress={progress}
                    onUpload={handleUpload}
                  />
                )}
                {selectedDocType === "passaporte" && (
                  <UploadItem
                    label="Passaporte"
                    hint="📸 Página com foto e dados pessoais visíveis"
                    doc={getDoc("rg_frente")}
                    docType="rg_frente"
                    accept={IMG_ACCEPT}
                    acceptLabel={IMG_LABEL}
                    uploading={uploading === "rg_frente"}
                    progress={progress}
                    onUpload={handleUpload}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SELFIE COM DOCUMENTO ── */}
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 2,
            color: "#767676",
            marginTop: 20,
          }}
        >
          SELFIE COM DOCUMENTO
        </p>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            padding: 16,
            marginTop: 10,
          }}
        >
          {/* Instruction banner */}
          <div
            style={{
              background: "rgba(39,110,241,0.06)",
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <Camera style={{ color: "#276EF1", width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#276EF1", lineHeight: 1.5 }}>
              Segure seu documento ao lado do rosto. Boa iluminação, sem óculos escuros.
            </span>
          </div>

          <DocUploadArea
            doc={getDoc("selfie")}
            docType="selfie"
            accept={IMG_ACCEPT}
            acceptLabel={IMG_LABEL}
            uploading={uploading === "selfie"}
            progress={progress}
            onUpload={handleUpload}
          />
        </div>

        {/* ── COMPROVANTE DE RESIDÊNCIA ── */}
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 2,
            color: "#767676",
            marginTop: 20,
          }}
        >
          COMPROVANTE DE RESIDÊNCIA
        </p>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            padding: 16,
            marginTop: 10,
          }}
        >
          <div
            style={{
              background: "rgba(39,110,241,0.06)",
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <FileText style={{ color: "#276EF1", width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#276EF1", lineHeight: 1.5 }}>
              Conta de luz, água, gás ou telefone. Emitido nos últimos 3 meses. Nome e endereço visíveis.
            </span>
          </div>

          <DocUploadArea
            doc={getDoc("comprovante_residencia")}
            docType="comprovante_residencia"
            accept={ALL_ACCEPT}
            acceptLabel={ALL_LABEL}
            uploading={uploading === "comprovante_residencia"}
            progress={progress}
            onUpload={handleUpload}
          />
        </div>
      </motion.div>
    </div>
  );
};

/* ── Inline sub-component for identity doc upload items ── */
interface UploadItemProps {
  label: string;
  hint: string;
  doc: DocRecord | undefined;
  docType: string;
  accept: string;
  acceptLabel: string;
  uploading: boolean;
  progress: number;
  onUpload: (docType: string, file: File) => void;
}

const UploadItem = ({
  label,
  hint,
  doc,
  docType,
  accept,
  acceptLabel,
  uploading,
  progress,
  onUpload,
}: UploadItemProps) => (
  <div
    style={{
      background: "#F7F7F7",
      borderRadius: 12,
      padding: 14,
      marginTop: 10,
    }}
  >
    <p style={{ fontSize: 14, fontWeight: 600, color: "#000000" }}>{label}</p>
    <p style={{ fontSize: 12, color: "#767676", fontStyle: "italic", marginTop: 4 }}>
      {hint}
    </p>
    <DocUploadArea
      doc={doc}
      docType={docType}
      accept={accept}
      acceptLabel={acceptLabel}
      uploading={uploading}
      progress={progress}
      onUpload={onUpload}
    />
  </div>
);

export default DocumentosPage;
