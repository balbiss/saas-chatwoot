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
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
      className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-primary)] ring-1 ring-white/20 backdrop-blur-md transition-shadow hover:shadow-lg disabled:opacity-60 ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(135deg, color-mix(in oklab, var(--primary) 92%, white 8%) 0%, color-mix(in oklab, var(--primary) 75%, black 20%) 100%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
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
    <div className="border-b border-border px-6 py-6 lg:px-10">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
