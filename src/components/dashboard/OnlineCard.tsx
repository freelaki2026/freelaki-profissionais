import { motion } from "framer-motion";

interface OnlineCardProps {
  isOnline: boolean;
  loading: boolean;
  onToggle: () => void;
}

const OnlineCard = ({ isOnline, loading, onToggle }: OnlineCardProps) => {
  return (
    <motion.div
      layout
      className="mx-6 mt-4 rounded-[20px] p-4 px-5 transition-colors duration-300"
      style={{
        background: isOnline ? "rgba(39,110,241,0.08)" : "#111111",
        border: isOnline ? "1.5px solid #276EF1" : "1.5px solid #333333",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full animate-pulse"
          style={{ background: isOnline ? "#2E7D32" : "#E53935" }}
        />
        <span
          className="text-[15px] font-semibold"
          style={{ color: isOnline ? "#276EF1" : "#FFFFFF" }}
        >
          {isOnline ? "Você está online" : "Você está offline"}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-[hsl(var(--muted-foreground))]">
        {isOnline ? "Aguardando oportunidades..." : "Fique online para receber oportunidades"}
      </p>
      <button
        onClick={onToggle}
        disabled={loading}
        className="mt-3 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
        style={{
          background: isOnline ? "#1A1A1A" : "#276EF1",
          color: isOnline ? "#767676" : "#FFFFFF",
        }}
      >
        {loading ? "..." : isOnline ? "Ficar Offline" : "Ficar Online →"}
      </button>
    </motion.div>
  );
};

export default OnlineCard;
