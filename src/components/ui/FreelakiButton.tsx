import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FreelakiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
  children: React.ReactNode;
}

const FreelakiButton = ({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: FreelakiButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        "flex h-[52px] w-full items-center justify-center rounded-lg text-base font-semibold transition-all duration-200",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" &&
          "border-[1.5px] border-foreground bg-transparent text-foreground hover:bg-muted",
        isDisabled && "cursor-not-allowed opacity-50",
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
      ) : (
        children
      )}
    </button>
  );
};

export default FreelakiButton;
