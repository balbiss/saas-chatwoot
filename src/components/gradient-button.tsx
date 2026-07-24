import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function GradientButton({
  children,
  onClick,
  type = "button",
  disabled,
  loading,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.985 }}
      className={`flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.span key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Salvando…
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-2">
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="sticky top-0 z-10 border-b border-border/60 bg-background/80 px-8 py-8 backdrop-blur-sm lg:px-14 lg:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
