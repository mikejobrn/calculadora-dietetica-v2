"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

interface Metodo {
  id: string;
  nome: string;
  referencia: string | null;
  parametros: any;
  formulas: any;
}

export default function MetodosPage() {
  const [metodos, setMetodos] = useState<Metodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [userPapel, setUserPapel] = useState<string | null>(null);

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Metodo | null>(null);
  const [nome, setNome] = useState("");
  const [referencia, setReferencia] = useState("");
  const [parametrosStr, setParametrosStr] = useState("[]");
  const [formulasStr, setFormulasStr] = useState("{}");
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const carregarDados = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: perfil } = await supabase.from("perfis").select("papel").eq("auth_id", userData.user.id).single();
        if (perfil) setUserPapel(perfil.papel);
      }
      const { data, error } = await supabase
        .from("metodos_estimativa")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) console.error("Erro ao carregar métodos:", error);
      if (data) setMetodos(data);
    } catch (err) {
      console.error("Fetch métodos falhou:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const limparForm = () => {
    setNome(""); setReferencia(""); setParametrosStr('[\n  {\n    "nome": "peso",\n    "tipo": "number",\n    "label": "Peso (kg)"\n  },\n  {\n    "nome": "altura",\n    "tipo": "number",\n    "label": "Altura (cm)"\n  },\n  {\n    "nome": "sexo",\n    "tipo": "select",\n    "label": "Sexo",\n    "opcoes": [\n      {\n        "label": "Masculino",\n        "value": "masculino"\n      },\n      {\n        "label": "Feminino",\n        "value": "feminino"\n      }\n    ]\n  }\n]');
    setFormulasStr('{\n  "peso_estimado": "peso * 1",\n  "altura_estimada": "altura * 1"\n}');
    setError(null); setEditando(null);
  };

  const abrirEditar = (m: Metodo) => {
    setEditando(m);
    setNome(m.nome);
    setReferencia(m.referencia || "");
    setParametrosStr(JSON.stringify(m.parametros, null, 2));
    setFormulasStr(JSON.stringify(m.formulas, null, 2));
    setDialogOpen(true);
  };

  const handleSalvar = async () => {
    if (!nome) { setError("O nome é obrigatório."); return; }
    
    let parsediParams, parsedFormulas;
    try {
      parsediParams = JSON.parse(parametrosStr);
      if (!Array.isArray(parsediParams)) throw new Error("Parâmetros deve ser um array JSON.");
    } catch(e: any) {
      setError(`Erro JSON em Parâmetros: ${e.message}`); return;
    }

    try {
      parsedFormulas = JSON.parse(formulasStr);
      if (typeof parsedFormulas !== "object" || Array.isArray(parsedFormulas)) {
        throw new Error("Fórmulas deve ser um objeto JSON.");
      }
    } catch(e: any) {
      setError(`Erro JSON em Fórmulas: ${e.message}`); return;
    }

    setSalvando(true);
    setError(null);

    const payload = {
      nome,
      referencia,
      parametros: parsediParams,
      formulas: parsedFormulas
    };

    if (editando) {
      const { error } = await supabase.from("metodos_estimativa").update(payload).eq("id", editando.id);
      if (error) { setError(error.message); setSalvando(false); return; }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from("perfis").select("id").eq("auth_id", userData.user?.id).single();
      const fullPayload = { ...payload, criado_por: perfil?.id };
      
      const { error } = await supabase.from("metodos_estimativa").insert(fullPayload);
      if (error) { setError(error.message); setSalvando(false); return; }
    }

    setSalvando(false);
    setDialogOpen(false);
    limparForm();
    carregarDados();
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Deseja mesmo excluir este método?")) return;
    await supabase.from("metodos_estimativa").update({ ativo: false }).eq("id", id);
    carregarDados();
  };

  const metodosFiltrados = metodos.filter((m) => {
    if (busca && !m.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fórmulas</h1>
        {userPapel === "admin" && (
          <Button onClick={() => { limparForm(); setDialogOpen(true); }} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
            + Novo Método
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) limparForm(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {userPapel === "admin" ? (editando ? "Editar Método de Estimativa" : "Novo Método de Estimativa") : "Detalhes da Fórmula"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome / Título</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Harris-Benedict" disabled={userPapel !== "admin"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Referência (opcional)</Label>
                <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Livro, Artigo..." disabled={userPapel !== "admin"} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-mono">Parâmetros Esperados (JSON Array)</Label>
              <textarea 
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] font-mono text-xs"
                value={parametrosStr} 
                onChange={(e) => setParametrosStr(e.target.value)}
                disabled={userPapel !== "admin"}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-mono">Fórmulas (JSON Object)</Label>
              <textarea 
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] font-mono text-xs"
                value={formulasStr} 
                onChange={(e) => setFormulasStr(e.target.value)}
                disabled={userPapel !== "admin"}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</div>
            )}
            {userPapel === "admin" && (
              <Button onClick={handleSalvar} className="w-full" disabled={salvando || !nome}>
                {salvando ? "Salvando..." : editando ? "Salvar Alterações" : "Criar Método"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2">
        <Input placeholder="Buscar por método..." value={busca} onChange={(e) => setBusca(e.target.value)} className="flex-1" />
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : metodosFiltrados.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum método encontrado</p>
      ) : (
        <div className="space-y-2">
          {metodosFiltrados.map((m) => (
            <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => abrirEditar(m)}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{m.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground line-clamp-1">{m.referencia || "Sem referência"}</span>
                  </div>
                </div>
                {userPapel === "admin" && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); handleDeletar(m.id); }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
