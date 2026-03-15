import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "./logout-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-4 pb-4">
        <h1 className="text-2xl font-bold">Perfil</h1>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Acesso à conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Faça login para visualizar seus dados de perfil e acessar as ações da conta.
            </p>
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/registro">Criar conta</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get profile from perfis table
  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, email, papel, criado_em")
    .eq("auth_id", user.id)
    .single();

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    nutricionista: "Nutricionista",
  };

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold">Perfil</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
              {perfil?.nome?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-semibold">{perfil?.nome || "—"}</p>
              <p className="text-sm text-muted-foreground">{perfil?.email || user.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Papel</span>
            <Badge>{roleLabels[perfil?.papel || "nutricionista"]}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Membro desde</span>
            <span className="text-sm">
              {perfil?.criado_em
                ? new Date(perfil.criado_em).toLocaleDateString("pt-BR")
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <LogoutButton />
    </div>
  );
}
