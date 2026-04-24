import { useRef } from "react";
import { Upload } from "lucide-react";
import { pickNativeImage, isNativePlatform } from "@/lib/nativeCamera";

interface DocRecord {
  id: string;
  doc_type: string;
  file_url: string;
  file_name: string | null;
  status: string | null;
  rejection_reason: string | null;
}

interface DocUploadAreaProps {
  doc: DocRecord | undefined;
  docType: string;
  accept: string;
  acceptLabel: string;
  uploading: boolean;
  progress: number;
  onUpload: (docType: string, file: File) => void;
}

const DocUploadArea = ({
  doc,
  docType,
  accept,
  acceptLabel,
  uploading,
  progress,
  onUpload,
}: DocUploadAreaProps) => {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(docType, file);
    e.target.value = "";
  };

  // No nativo: usa Capacitor Camera (dispara prompt de permissão do iOS/Android).
  // No web: cai no <input type="file"> tradicional.
  const handlePick = async () => {
    if (isNativePlatform()) {
      const file = await pickNativeImage();
      if (file) onUpload(docType, file);
      return;
    }
    fileRef.current?.click();
  };

  // Not uploaded yet
  if (!doc || !doc.status) {
    return (
      <div style={{ marginTop: 12 }}>
        <div
          onClick={handlePick}
          style={{
            border: "2px dashed #E5E5E5",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Upload style={{ color: "#276EF1", width: 24, height: 24, margin: "0 auto" }} />
          <p style={{ color: "#276EF1", fontSize: 13, fontWeight: 500, marginTop: 8 }}>
            Toque para enviar
          </p>
          <p style={{ color: "#767676", fontSize: 11, marginTop: 4 }}>{acceptLabel}</p>
          {uploading && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                background: "#E3F2FD",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "#276EF1",
                  borderRadius: 3,
                  transition: "width 300ms",
                }}
              />
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // Approved
  if (doc.status === "approved") {
    return (
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src={doc.file_url}
          alt=""
          style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <span
          style={{
            background: "#E8F5E9",
            color: "#2E7D32",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 20,
            padding: "5px 12px",
          }}
        >
          Aprovado ✓
        </span>
      </div>
    );
  }

  // Rejected
  if (doc.status === "rejected") {
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={doc.file_url}
            alt=""
            style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div>
            <span
              style={{
                background: "#FFEBEE",
                color: "#C62828",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 20,
                padding: "5px 12px",
              }}
            >
              Rejeitado ✗
            </span>
            {doc.rejection_reason && (
              <p style={{ color: "#C62828", fontSize: 11, marginTop: 4 }}>
                {doc.rejection_reason}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handlePick}
          style={{
            marginTop: 8,
            color: "#276EF1",
            fontSize: 13,
            fontWeight: 600,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Reenviar
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // Pending (em análise)
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
        <img
          src={doc.file_url}
          alt=""
          style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div>
          <span
            style={{
              background: "#FFF3E0",
              color: "#B45309",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 20,
              padding: "5px 12px",
            }}
          >
            Em análise ⏳
          </span>
          <button
            onClick={handlePick}
            style={{
              display: "block",
              marginTop: 4,
              color: "#767676",
              fontSize: 11,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Substituir
          </button>
        </div>
        {uploading && (
          <div
            style={{
              position: "absolute",
              bottom: -4,
              left: 0,
              right: 0,
              height: 3,
              background: "#E3F2FD",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#276EF1",
                borderRadius: 3,
                transition: "width 300ms",
              }}
            />
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default DocUploadArea;
