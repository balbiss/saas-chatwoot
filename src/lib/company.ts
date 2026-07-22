import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Company = Tables<"companies">;

async function getOrCreateCompany(): Promise<Company> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Não autenticado");

  const { data: existing, error: selectError } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from("companies")
    .insert({ user_id: userData.user.id })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return created;
}

export function useCompany() {
  return useQuery({
    queryKey: ["company"],
    queryFn: getOrCreateCompany,
    staleTime: 60_000,
  });
}

export function useInvalidateCompany() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["company"] });
}
