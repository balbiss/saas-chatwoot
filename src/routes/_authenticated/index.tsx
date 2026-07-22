import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MessageSquareText, CalendarClock, Package, FileText } from "lucide-react";
import { useCompany } from "@/lib/company";
import { PageHeader } from "@/components/gradient-button";

export const Route = createFileRoute("/_authenticated/")({ component: Page });

const SHORTCUTS = [
  { to: "/prompt", label: "Prompt da IA", description: "Defina como a IA deve responder seus clientes.", icon: MessageSquareText },
  { to: "/agenda", label: "Agenda & Calendário", description: "Conecte o Google Calendar e configure horários.", icon: CalendarClock },
  { to: "/produtos", label: "Produtos", description: "Cadastre fotos, preços e disponibilidade.", icon: Package },
  { to: "/documentos", label: "Documentos", description: "PDFs que a IA pode enviar aos clientes.", icon: FileText },
] as const;

function Page() {
  const { data: company } = useCompany();

  return (
    <div>
      <PageHeader
        title={`Olá${company?.name ? `, ${company.name}` : ""}`}
        description="Configure seu atendimento abaixo."
      />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:p-10">
        {SHORTCUTS.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={item.to}
                className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-lift"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Icon className="size-5 text-foreground" />
                </div>
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
