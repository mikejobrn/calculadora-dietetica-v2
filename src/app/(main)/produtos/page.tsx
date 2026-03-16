"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useRef } from "react";

interface Produto {
  id: string;
  nome: string;
  tipo: "dieta_completa" | "modulo_proteina" | "modulo_fibra";
  densidade_calorica: string | null;
  proteina: string | null;
  carboidrato: string | null;
  lipidio: string | null;
  fibra: string | null;
  fabricante: string | null;
}

const tipoLabels: Record<string, string> = {
  dieta_completa: "Dieta Completa",
  modulo_proteina: "Módulo Proteína",
  modulo_fibra: "Módulo Fibra",
};

const tipoBadgeColor: Record<string, string> = {
  dieta_completa: "bg-primary/10 text-primary",
  modulo_proteina: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  modulo_fibra: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("dieta_completa");
  const [densidadeCalorica, setDensidadeCalorica] = useState("");
  const [proteina, setProteina] = useState("");
  const [carboidrato, setCarboidrato] = useState("");
  const [lipidio, setLipidio] = useState("");
  const [fibra, setFibra] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPapel, setUserPapel] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const carregarProdutos = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: perfil } = await supabase.from("perfis").select("papel").eq("auth_id", userData.user.id).single();
        if (perfil) setUserPapel(perfil.papel);
      }
      const { data, error } = await supabase
        .from("produtos_alimentares")
        .select("*")
        .eq("ativo", true)
        .order("tipo")
        .order("nome");
      if (error) console.error("Erro ao carregar produtos:", error);
      if (data) setProdutos(data);
    } catch (err) {
      console.error("Fetch produtos falhou:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarProdutos(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalisando(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const base64 = base64Data.split(",")[1];

        const { data, error } = await supabase.functions.invoke("scan-nutrition-label", {
          body: { imageBase64: base64 },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        if (data.densidade_calorica != null) setDensidadeCalorica(String(data.densidade_calorica));
        if (data.proteina != null) setProteina(String(data.proteina));
        if (data.carboidrato != null) setCarboidrato(String(data.carboidrato));
        if (data.lipidio != null) setLipidio(String(data.lipidio));
        if (data.fibra != null) setFibra(String(data.fibra));
      } catch (err: any) {
        setError("Erro ao analisar rótulo: " + err.message);
      } finally {
        setAnalisando(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const limparForm = () => {
    setNome(""); setTipo("dieta_completa"); setDensidadeCalorica(""); setProteina("");
    setCarboidrato(""); setLipidio(""); setFibra(""); setFabricante(""); setError(null);
    setEditando(null);
  };

  const abrirEditar = (p: Produto) => {
    setEditando(p);
    setNome(p.nome); setTipo(p.tipo);
    setDensidadeCalorica(p.densidade_calorica || "");
    setProteina(p.proteina || ""); setCarboidrato(p.carboidrato || "");
    setLipidio(p.lipidio || ""); setFibra(p.fibra || "");
    setFabricante(p.fabricante || "");
    setDialogOpen(true);
  };

  const handleSalvar = async () => {
    setSalvando(true);
    setError(null);

    const payload = {
      nome,
      tipo,
      densidade_calorica: densidadeCalorica ? parseFloat(densidadeCalorica) : null,
      proteina: proteina ? parseFloat(proteina) : null,
      carboidrato: carboidrato ? parseFloat(carboidrato) : null,
      lipidio: lipidio ? parseFloat(lipidio) : null,
      fibra: fibra ? parseFloat(fibra) : null,
      fabricante: fabricante || null,
      atualizado_em: new Date().toISOString(),
    };

    if (editando) {
      const { error } = await supabase
        .from("produtos_alimentares")
        .update(payload)
        .eq("id", editando.id);
      if (error) { setError(error.message); setSalvando(false); return; }
    } else {
      const { error } = await supabase
        .from("produtos_alimentares")
        .insert(payload);
      if (error) { setError(error.message); setSalvando(false); return; }
    }

    setSalvando(false);
    setDialogOpen(false);
    limparForm();
    carregarProdutos();
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Deseja mesmo excluir este produto?")) return;
    await supabase.from("produtos_alimentares").update({ ativo: false }).eq("id", id);
    carregarProdutos();
  };

  const produtosFiltrados = produtos.filter((p) => {
    if (filtroTipo !== "todos" && p.tipo !== filtroTipo) return false;
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) limparForm(); }}>
          {userPapel === "admin" && (
          <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3">
            + Novo
          </DialogTrigger>
          )}
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{userPapel === "admin" ? (editando ? "Editar Produto" : "Novo Produto") : "Detalhes do Produto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              {userPapel === "admin" && (
                <>
                  <Button type="button" variant="secondary" className="w-full font-medium" onClick={() => fileInputRef.current?.click()} disabled={analisando}>
                    {analisando ? "Analisando imagem..." : "📸 Preenchimento Inteligente por Foto (OCR)"}
                  </Button>
                  <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                </>
              )}
              
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do produto" readOnly={userPapel !== "admin"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <NativeSelect value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={userPapel !== "admin"}>
                    <option value="dieta_completa">Dieta Completa</option>
                    <option value="modulo_proteina">Mód. Proteína</option>
                    <option value="modulo_fibra">Mód. Fibra</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fabricante</Label>
                  <Input value={fabricante} onChange={(e) => setFabricante(e.target.value)} placeholder="Fabricante" readOnly={userPapel !== "admin"} />
                </div>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground font-medium">Informação nutricional (por litro)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Dens. Calórica (kcal/ml)</Label>
                  <Input type="number" step="0.01" value={densidadeCalorica} onChange={(e) => setDensidadeCalorica(e.target.value)} readOnly={userPapel !== "admin"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Proteína (g/L)</Label>
                  <Input type="number" step="0.1" value={proteina} onChange={(e) => setProteina(e.target.value)} readOnly={userPapel !== "admin"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Carboidrato (g/L)</Label>
                  <Input type="number" step="0.1" value={carboidrato} onChange={(e) => setCarboidrato(e.target.value)} readOnly={userPapel !== "admin"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lipídio (g/L)</Label>
                  <Input type="number" step="0.1" value={lipidio} onChange={(e) => setLipidio(e.target.value)} readOnly={userPapel !== "admin"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fibra (g/L)</Label>
                  <Input type="number" step="0.1" value={fibra} onChange={(e) => setFibra(e.target.value)} readOnly={userPapel !== "admin"} />
                </div>
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</div>
              )}
              {userPapel === "admin" && (
                 <Button onClick={handleSalvar} className="w-full" disabled={salvando || !nome}>
                   {salvando ? "Salvando..." : editando ? "Salvar" : "Criar Produto"}
                 </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="flex-1" />
        <NativeSelect value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-[140px]">
          <option value="todos">Todos</option>
          <option value="dieta_completa">Dietas</option>
          <option value="modulo_proteina">Proteínas</option>
          <option value="modulo_fibra">Fibras</option>
        </NativeSelect>
      </div>

      {/* Product List */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : produtosFiltrados.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado</p>
      ) : (
        <div className="space-y-2">
          {produtosFiltrados.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => abrirEditar(p)}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoBadgeColor[p.tipo]}`}>
                      {tipoLabels[p.tipo]}
                    </span>
                    {p.fabricante && <span className="text-xs text-muted-foreground">{p.fabricante}</span>}
                    {p.densidade_calorica && <span className="text-xs text-muted-foreground">{p.densidade_calorica} kcal/ml</span>}
                  </div>
                </div>
                {userPapel === "admin" && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); handleDeletar(p.id); }}>
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
