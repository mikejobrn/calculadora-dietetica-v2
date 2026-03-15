"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

interface Metodo {
  id: string;
  nome: string;
  referencia: string | null;
  parametros: { nome: string; tipo: string; label?: string; opcoes?: { label: string; value: string }[] }[];
  formulas: { [key: string]: string };
}

interface EstimativaModalProps {
  onApply: (peso?: number, altura?: number) => void;
}

export function EstimativaModal({ onApply }: EstimativaModalProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [metodos, setMetodos] = useState<Metodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [metodoSelecionado, setMetodoSelecionado] = useState<string>("");
  const [valoresParams, setValoresParams] = useState<Record<string, string | null>>({});
  const [resultado, setResultado] = useState<Record<string, number> | null>(null);
  const [erroFormula, setErroFormula] = useState<string | null>(null);

  useEffect(() => {
    const carregarMetodos = async () => {
      if (!open) return;
      setLoading(true);
      const { data } = await supabase.from("metodos_estimativa").select("*").eq("ativo", true).order("nome");
      if (data) {
        setMetodos(data);
        if (data.length > 0 && !metodoSelecionado) {
          setMetodoSelecionado(data[0].id);
        }
      }
      setLoading(false);
    };
    carregarMetodos();
  }, [open, metodoSelecionado, supabase]);

  const metodoAtual = metodos.find(m => m.id === metodoSelecionado);

  const handleCalcular = () => {
    if (!metodoAtual) return;
    setErroFormula(null);
    setResultado(null);

    const escopo: Record<string, any> = {};
    for (const p of metodoAtual.parametros) {
        const strVal = valoresParams[p.nome];
        if (p.tipo === "number") {
            const val = parseFloat(strVal || "");
            if (isNaN(val)) {
                setErroFormula(`Preencha o parâmetro (número): ${p.label || p.nome}`);
                return;
            }
            escopo[p.nome] = val;
        } else {
            if (!strVal || strVal.trim() === "") {
                setErroFormula(`Preencha o parâmetro: ${p.label || p.nome}`);
                return;
            }
            escopo[p.nome] = strVal.trim();
        }
    }

    const res: Record<string, number> = {};
    try {
        for (const [chave, expressao] of Object.entries(metodoAtual.formulas)) {
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

  const handleAppyResult = () => {
    if (!resultado) return;
    // Find estimated peso and altura (keys can be like "peso_estimado", "altura_estimada", or "peso", "altura")
    const pesoKey = Object.keys(resultado).find(k => k.toLowerCase().includes("peso"));
    const altKey = Object.keys(resultado).find(k => k.toLowerCase().includes("altura"));
    
    // We pass extracted keys back to the parent
    onApply(pesoKey ? resultado[pesoKey] : undefined, altKey ? resultado[altKey] : undefined);
    
    // Close modal
    setOpen(false);
    // Reset modal state
    setResultado(null);
    setValoresParams({});
    setErroFormula(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="flex-1 w-full bg-background" />}>
        Estimar
      </DialogTrigger>
      <DialogContent className="max-w-[400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Estimar Valores</DialogTitle>
        </DialogHeader>

        {loading ? (
             <p className="text-sm text-muted-foreground text-center py-4">Carregando métodos...</p>
          ) : metodos.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-4">Nenhum método de estimativa cadastrado.</p>
          ) : (
             <div className="space-y-4">
                 <Select value={metodoSelecionado} onValueChange={(val) => {
                     setMetodoSelecionado(val || "");
                     setValoresParams({});
                     setResultado(null);
                     setErroFormula(null);
                 }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o método">
                           {metodoSelecionado ? metodos.find(m => m.id === metodoSelecionado)?.nome : null}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {metodos.map(m => (
                            <SelectItem key={m.id} value={m.id} label={m.nome}>{m.nome}</SelectItem>
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
                                 <div key={idx} className="space-y-2 col-span-2 sm:col-span-1">
                                     <Label className="text-xs leading-none">{p.label || p.nome}</Label>
                                     {p.tipo === "select" && p.opcoes ? (
                                         p.opcoes.length <= 5 ? (
                                             <RadioGroup 
                                                 value={valoresParams[p.nome] || ""}
                                                 onValueChange={(val: string) => setValoresParams({...valoresParams, [p.nome]: val})}
                                                 className="flex flex-col space-y-2 pt-1"
                                             >
                                                {p.opcoes.map((op, oIdx) => (
                                                    <div className="flex items-center space-x-2 bg-background/50 p-1.5 rounded-md border border-transparent hover:border-border transition-colors" key={oIdx}>
                                                        <RadioGroupItem value={op.value} id={`${p.nome}-${oIdx}`} />
                                                        <Label htmlFor={`${p.nome}-${oIdx}`} className="font-normal text-sm cursor-pointer flex-1 leading-none">{op.label}</Label>
                                                    </div>
                                                ))}
                                             </RadioGroup>
                                         ) : (
                                             <Select 
                                                 value={valoresParams[p.nome] || ""} 
                                                 onValueChange={(val) => setValoresParams({...valoresParams, [p.nome]: val || ""})}
                                             >
                                                 <SelectTrigger className="h-8 bg-background">
                                                     <SelectValue placeholder="Selecione">
                                                         {valoresParams[p.nome] ? p.opcoes.find(op => op.value === valoresParams[p.nome])?.label : null}
                                                     </SelectValue>
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                     {p.opcoes.map((op: any, oIdx: number) => (
                                                         <SelectItem key={oIdx} value={op.value} label={op.label}>{op.label}</SelectItem>
                                                     ))}
                                                 </SelectContent>
                                             </Select>
                                         )
                                     ) : (
                                         <Input 
                                            type={p.tipo === "number" ? "number" : "text"} 
                                            step={p.tipo === "number" ? "any" : undefined}
                                            min={p.tipo === "number" ? "0" : undefined}
                                            value={valoresParams[p.nome] || ""} 
                                            onChange={(e) => setValoresParams({...valoresParams, [p.nome]: e.target.value})} 
                                            className="h-8 px-2 text-sm"
                                         />
                                     )}
                                 </div>
                             ))}
                         </div>

                         {erroFormula && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mt-2">{erroFormula}</div>
                         )}

                         {!resultado ? (
                             <Button className="w-full mt-4" onClick={handleCalcular}>
                                 Calcular
                             </Button>
                         ) : (
                             <div className="mt-4 space-y-3">
                                 <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                                     <h4 className="text-sm font-semibold mb-2">Resultado</h4>
                                     <div className="space-y-1.5">
                                         {Object.entries(resultado).map(([chave, valor]) => (
                                             <div key={chave} className="flex justify-between items-center bg-background px-2 py-1.5 rounded border text-sm">
                                                 <span className="capitalize">{chave.replace('_', ' ')}</span>
                                                 <span className="font-bold text-primary">{valor}</span>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                                 
                                 <Button className="w-full" onClick={handleAppyResult}>
                                     Usar Valores
                                 </Button>
                             </div>
                         )}

                     </div>
                 )}
             </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
