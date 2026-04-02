import { AlertCircle, X } from "lucide-react";

interface ErrorBannerProps {
  code: string;
  message: string;
  hint?: string;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

const ErrorBanner = ({ code, message, hint, onDismiss, children }: ErrorBannerProps) => (
  <div
    className="flex gap-3"
    style={{
      background: "#FFEBEE",
      borderRadius: 12,
      padding: "14px 16px",
      alignItems: "flex-start",
    }}
  >
    <AlertCircle size={20} color="#C62828" className="shrink-0" style={{ marginTop: 1 }} />

    <div className="flex-1">
      <div className="flex items-center gap-[6px] flex-wrap">
        <span
          style={{
            background: "#C62828",
            color: "#fff",
            borderRadius: 4,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "16px",
          }}
        >
          {code}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#C62828" }}>{message}</span>
      </div>
      {hint && (
        <p style={{ fontSize: 12, color: "#767676", marginTop: 3 }}>{hint}</p>
      )}
      {children && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>

    {onDismiss && (
      <button
        onClick={onDismiss}
        className="shrink-0"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <X size={16} color="#767676" />
      </button>
    )}
  </div>
);

export default ErrorBanner;
