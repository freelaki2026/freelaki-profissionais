import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface FreelakiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

const FreelakiInput = ({
  label,
  error,
  icon,
  className,
  ...props
}: FreelakiInputProps) => {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={cn(
            "flex h-[52px] w-full rounded-lg border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground transition-colors focus:border-2 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus:border-destructive",
            icon && "pr-12",
            className
          )}
          {...props}
        />
        {icon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
};

export default FreelakiInput;
