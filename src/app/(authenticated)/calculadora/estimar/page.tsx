"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

interface Metodo {
  id: string;
  nome: string;
  referencia: string | null;
  parametros: { nome: string; tipo: string; label?: string }[];
  formulas: { [key: string]: string };
}

export default function EstimarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [metodos, setMetodos] = useState<Metodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [metodoSelecionado, setMetodoSelecionado] = useState<string>("");
  const [valoresParams, setValoresParams] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Record<string, number> | null>(null);
  const [erroFormula, setErroFormula] = useState<string | null>(null);

  useEffect(() => {
    const carregarMetodos = async () => {
      const { data } = await supabase
        .from("metodos_estimativa")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      
      if (data) {
        setMetodos(data);
        if (data.length > 0) {
          setMetodoSelecionado(data[0].id);
        }
      }
      setLoading(false);
    };
    carregarMetodos();
  }, []);

  const metodoAtual = metodos.find(m => m.id === metodoSelecionado);

  const handleCalcular = () => {
    if (!metodoAtual) return;
    setErroFormula(null);
    setResultado(null);

    const escopo: Record<string, number> = {};
    
    // Preparar variáveis de escopo
    for (const p of metodoAtual.parametros) {
        const val = parseFloat(valoresParams[p.nome]);
        if (isNaN(val)) {
            setErroFormula(`Preencha o parâmetro: ${p.label || p.nome}`);
            return;
        }
        escopo[p.nome] = val;
    }

    const res: Record<string, number> = {};

    try {
        // Avaliar cada fórmula de maneira segura (usando Function invés de eval direto)
        for (const [chave, expressao] of Object.entries(metodoAtual.formulas)) {
             // Cria uma função com os nomes das chaves como argumentos
             const chaves = Object.keys(escopo);
             const valores = Object.values(escopo);
             
             // biome-ignore lint/security/noGlobalEval: By design, admin created formulas
             const fn = new Function(...chaves, `return ${expressao};`);
             const valorCalculado = fn(...valores);
             
             if (isNaN(valorCalculado) || !isFinite(valorCalculado)) {
                 throw new Error(`Resultado inválido para ${chave}`);
             }
             
             res[chave] = Number(valorCalculado.toFixed(2));
        }
        setResultado(res);
    } catch (e: any) {
        setErroFormula(`Erro ao interpretar fórmula: ${e.message}`);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </Button>
        <h1 className="text-2xl font-bold">Estimar Valores</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Escolha o Método</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
             <p className="text-sm text-muted-foreground">Carregando métodos...</p>
          ) : metodos.length === 0 ? (
             <p className="text-sm text-muted-foreground">Nenhum método de estimativa cadastrado pelo administrador.</p>
          ) : (
             <div className="space-y-4">
                 <Select value={metodoSelecionado} onValueChange={(val) => {
                     setMetodoSelecionado(val || "");
                     setValoresParams({});
                     setResultado(null);
                     setErroFormula(null);
                 }}>
                    <SelectTrigger>
                        <SelectValue>
                           {metodoSelecionado ? metodos.find(m => m.id === metodoSelecionado)?.nome : "Selecione o método"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {metodos.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>

                 {metodoAtual && (
                     <div className="space-y-3 pt-2">
                         {metodoAtual.referencia && (
                             <p className="text-xs text-muted-foreground italic mb-2">Ref: {metodoAtual.referencia}</p>
                         )}
                         
                         <Separator />
                         
                         <div className="grid grid-cols-2 gap-3 pt-2">
                             {metodoAtual.parametros.map((p, idx) => (
                                 <div key={idx} className="space-y-1">
                                     <Label className="text-xs">{p.label || p.nome}</Label>
                                     <Input 
                                        type="number" 
                                        step="any"
                                        value={valoresParams[p.nome] || ""} 
                                        onChange={(e) => setValoresParams({...valoresParams, [p.nome]: e.target.value})} 
                                     />
                                 </div>
                             ))}
                         </div>

                         {erroFormula && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mt-2">{erroFormula}</div>
                         )}

                         <Button className="w-full mt-4" onClick={handleCalcular}>
                             Calcular Estimativa
                         </Button>
                     </div>
                 )}
             </div>
          )}
        </CardContent>
      </Card>

      {resultado && (
          <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2">
                      {Object.entries(resultado).map(([chave, valor]) => (
                          <div key={chave} className="flex justify-between items-center bg-background rounded-md px-3 py-2 border">
                              <span className="text-sm font-medium capitalize">{chave}</span>
                              <span className="font-bold text-primary">{valor}</span>
                          </div>
                      ))}
                  </div>
              </CardContent>
          </Card>
      )}
    </div>
  );
}
