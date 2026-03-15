"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EstimativaModal } from "@/components/estimativa-modal";
import {
  calcularIMC,
  classificarIMC,
  classificarIMCIdoso,
  calcularPesoIdeal,
  calcularNecessidades,
  calcularBI,
  calcularResumoNutricional,
  type EtapaDieta,
  type ProdutoDieta,
  type ResultadoNecessidade,
  type ResumoNutricional,
} from "@/lib/calculos";
import { createClient } from "@/lib/supabase/client";

// ==========================================================
// Types
// ==========================================================

interface Produto {
  id: string;
  nome: string;
  tipo: "dieta_completa" | "modulo_proteina" | "modulo_fibra";
  densidade_calorica: string | null;
  proteina: string | null;
  carboidrato: string | null;
  lipidio: string | null;
  fibra: string | null;
}

function produtoToDieta(p: Produto): ProdutoDieta {
  return {
    nome: p.nome,
    tipo: p.tipo,
    densidadeCalorica: p.densidade_calorica ? parseFloat(p.densidade_calorica) : null,
    proteina: p.proteina ? parseFloat(p.proteina) : null,
    carboidrato: p.carboidrato ? parseFloat(p.carboidrato) : null,
    lipidio: p.lipidio ? parseFloat(p.lipidio) : null,
    fibra: p.fibra ? parseFloat(p.fibra) : null,
  };
}

// ==========================================================
// Main Calculator Component
// ==========================================================

export default function CalculadoraPage() {
  // Patient data
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [idade, setIdade] = useState("");

  // Assessment
  const [imc, setImc] = useState<number | null>(null);
  const [classificacao, setClassificacao] = useState<string | null>(null);
  const [pesoIdeal, setPesoIdeal] = useState<number | null>(null);
  const [fatorCalorico, setFatorCalorico] = useState("");
  const [fatorProteico, setFatorProteico] = useState("");
  const [usarPesoEstimado, setUsarPesoEstimado] = useState(true);
  const [usarPTNEstimado, setUsarPTNEstimado] = useState(true);
  const [necessidades, setNecessidades] = useState<ResultadoNecessidade | null>(null);

  // Diet stages
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [etapas, setEtapas] = useState<EtapaDieta[]>([]);
  const [resumo, setResumo] = useState<ResumoNutricional | null>(null);

  // Stage form
  const [stageHorario, setStageHorario] = useState("");
  const [stageDuracao, setStageDuracao] = useState("");
  const [stageDietaId, setStageDietaId] = useState("");
  const [stageVolume, setStageVolume] = useState("");
  const [stageProteinaId, setStageProteinaId] = useState("");
  const [stageMedidaProteina, setStageMedidaProteina] = useState("");
  const [stageFibraId, setStageFibraId] = useState("");
  const [stageMedidaFibra, setStageMedidaFibra] = useState("");

  // Load products from Supabase
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("produtos_alimentares")
      .select("id, nome, tipo, densidade_calorica, proteina, carboidrato, lipidio, fibra")
      .order("tipo")
      .order("nome")
      .then(({ data }) => {
        if (data) setProdutos(data);
      });
  }, []);

  // Calculate IMC
  const handleCalcular = useCallback(() => {
    const p = parseFloat(peso);
    const a = parseFloat(altura);
    const i = parseInt(idade);
    if (!p || !a || !i) return;

    const imcVal = calcularIMC(p, a);
    setImc(imcVal);
    setClassificacao(i >= 60 ? classificarIMCIdoso(imcVal) : classificarIMC(imcVal));
    const pi = calcularPesoIdeal(a, i);
    setPesoIdeal(pi);
  }, [peso, altura, idade]);

  // Calculate needs
  const handleCalcularNecessidades = useCallback(() => {
    const p = parseFloat(peso);
    if (!p || !pesoIdeal) return;

    const n = calcularNecessidades(p, pesoIdeal, {
      fatorCalorico: parseFloat(fatorCalorico),
      fatorProteico: parseFloat(fatorProteico),
    });
    setNecessidades(n);
  }, [peso, pesoIdeal, fatorCalorico, fatorProteico]);

  // Add stage
  const handleAdicionarEtapa = () => {
    const dieta = produtos.find((p) => p.id === stageDietaId);
    if (!dieta) return;

    const novaEtapa: EtapaDieta = {
      horario: stageHorario,
      duracao: parseFloat(stageDuracao),
      dieta: produtoToDieta(dieta),
      volumeMl: parseFloat(stageVolume),
    };

    if (stageProteinaId !== "none") {
      const mod = produtos.find((p) => p.id === stageProteinaId);
      if (mod) {
        novaEtapa.moduloProteina = produtoToDieta(mod);
        novaEtapa.medidaProteina = parseFloat(stageMedidaProteina) || 0;
      }
    }

    if (stageFibraId !== "none") {
      const mod = produtos.find((p) => p.id === stageFibraId);
      if (mod) {
        novaEtapa.moduloFibra = produtoToDieta(mod);
        novaEtapa.medidaFibra = parseFloat(stageMedidaFibra) || 0;
      }
    }

    const novasEtapas = [...etapas, novaEtapa];
    setEtapas(novasEtapas);

    // Recalculate summary
    if (necessidades) {
      const necCal = usarPesoEstimado ? necessidades.caloricoEstimado : necessidades.caloricoIdeal;
      const necPTN = usarPTNEstimado ? necessidades.proteicoEstimado : necessidades.proteicoIdeal;
      setResumo(calcularResumoNutricional(novasEtapas, necCal, necPTN, parseFloat(peso)));
    }
  };

  const handleRemoverEtapa = (index: number) => {
    const novasEtapas = etapas.filter((_, i) => i !== index);
    setEtapas(novasEtapas);
    if (necessidades && novasEtapas.length > 0) {
      const necCal = usarPesoEstimado ? necessidades.caloricoEstimado : necessidades.caloricoIdeal;
      const necPTN = usarPTNEstimado ? necessidades.proteicoEstimado : necessidades.proteicoIdeal;
      setResumo(calcularResumoNutricional(novasEtapas, necCal, necPTN, parseFloat(peso)));
    } else {
      setResumo(null);
    }
  };

  const dietasCompletas = produtos.filter((p) => p.tipo === "dieta_completa");
  const modulosProteina = produtos.filter((p) => p.tipo === "modulo_proteina");
  const modulosFibra = produtos.filter((p) => p.tipo === "modulo_fibra");

  return (
    <div className="space-y-4 pb-4">
      {/* ========== DADOS DO PACIENTE ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Dados do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="peso" className="text-xs">Peso (kg)</Label>
              <Input id="peso" type="number" min="0" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="altura" className="text-xs">Altura (m)</Label>
              <Input id="altura" type="number" min="0" step="0.01" value={altura} onChange={(e) => setAltura(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="idade" className="text-xs">Idade (anos)</Label>
            <Input id="idade" type="number" min="0" value={idade} onChange={(e) => setIdade(e.target.value)} className="max-w-[50%]" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCalcular} className="flex-1">Calcular</Button>
            <EstimativaModal onApply={(p, a) => {
              if (p !== undefined) setPeso(p.toString());
              if (a !== undefined) setAltura(a.toString());
            }} />
          </div>
        </CardContent>
      </Card>

      {/* ========== AVALIAÇÃO NUTRICIONAL ========== */}
      {imc !== null && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Avaliação Nutricional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{imc.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">kg/m²</span></p>
                <Badge variant={classificacao === "Eutrofia" ? "default" : "destructive"} className="mt-1">
                  {classificacao}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Peso ideal</p>
                <p className="text-xl font-semibold">{pesoIdeal?.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nec. calórica (kcal/kg)</Label>
                <Input type="number" min="0" step="1" value={fatorCalorico} onChange={(e) => setFatorCalorico(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nec. proteica (g/kg)</Label>
                <Input type="number" min="0" step="0.1" value={fatorProteico} onChange={(e) => setFatorProteico(e.target.value)} />
              </div>
            </div>

            {necessidades && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button
                  onClick={() => setUsarPesoEstimado(true)}
                  className={`rounded-md px-3 py-2 text-center transition ${usarPesoEstimado ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  Estimado: {necessidades.caloricoEstimado} kcal
                </button>
                <button
                  onClick={() => setUsarPesoEstimado(false)}
                  className={`rounded-md px-3 py-2 text-center transition ${!usarPesoEstimado ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  Ideal: {necessidades.caloricoIdeal} kcal
                </button>
                <button
                  onClick={() => setUsarPTNEstimado(true)}
                  className={`rounded-md px-3 py-2 text-center transition ${usarPTNEstimado ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  PTN Est: {necessidades.proteicoEstimado}g
                </button>
                <button
                  onClick={() => setUsarPTNEstimado(false)}
                  className={`rounded-md px-3 py-2 text-center transition ${!usarPTNEstimado ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  PTN Ideal: {necessidades.proteicoIdeal}g
                </button>
              </div>
            )}

            <Button onClick={handleCalcularNecessidades} className="w-full">Calcular Necessidades</Button>
          </CardContent>
        </Card>
      )}

      {/* ========== ETAPAS DE DIETA ========== */}
      {necessidades && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Adicionar Etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Horário</Label>
                <Input type="time" value={stageHorario} onChange={(e) => setStageHorario(e.target.value)} />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Duração (h)</Label>
                <Input type="number" min="0" step="0.5" value={stageDuracao} onChange={(e) => setStageDuracao(e.target.value)} className="text-right" />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Dieta</Label>
                <Select value={stageDietaId} onValueChange={(val) => setStageDietaId(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a dieta">
                      {stageDietaId ? dietasCompletas.find((p) => p.id === stageDietaId)?.nome : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {dietasCompletas.map((p) => (
                      <SelectItem key={p.id} value={p.id} label={p.nome}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Vol (ml)</Label>
                <Input type="number" min="0" value={stageVolume} onChange={(e) => setStageVolume(e.target.value)} className="text-right" />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Mód. Proteína</Label>
                <Select value={stageProteinaId} onValueChange={(val) => setStageProteinaId(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" label="Nenhum">Nenhum</SelectItem>
                    {modulosProteina.map((p) => (
                      <SelectItem key={p.id} value={p.id} label={p.nome}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Qtd (g)</Label>
                <Input type="number" min="0" value={stageMedidaProteina} onChange={(e) => setStageMedidaProteina(e.target.value)} disabled={!stageProteinaId || stageProteinaId === "none"} className="text-right" />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Mód. Fibra</Label>
                <Select value={stageFibraId} onValueChange={(val) => setStageFibraId(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" label="Nenhum">Nenhum</SelectItem>
                    {modulosFibra.map((p) => (
                      <SelectItem key={p.id} value={p.id} label={p.nome}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Qtd (g)</Label>
                <Input type="number" min="0" value={stageMedidaFibra} onChange={(e) => setStageMedidaFibra(e.target.value)} disabled={!stageFibraId || stageFibraId === "none"} className="text-right" />
              </div>
            </div>

            <Button onClick={handleAdicionarEtapa} className="w-full" disabled={!stageDietaId}>
              + Adicionar Etapa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ========== ETAPAS ADICIONADAS ========== */}
      {etapas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Etapas Adicionadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {etapas.map((etapa, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-md border-l-4 border-l-primary bg-secondary/50 px-3 py-2">
                <div className="text-sm">
                  <span className="font-mono font-medium">{etapa.horario}</span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  <span>{etapa.dieta.nome}</span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  <span>{etapa.volumeMl}ml</span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  <span className="text-muted-foreground">BI: {calcularBI(etapa.volumeMl, etapa.duracao)} ml/h</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoverEtapa(idx)}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ========== RESUMO NUTRICIONAL ========== */}
      {resumo && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Resumo Nutricional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md bg-secondary p-2">
                <p className="text-muted-foreground text-xs">Volume</p>
                <p className="font-bold">{resumo.volumeTotal} ml</p>
              </div>
              <div className="rounded-md bg-secondary p-2">
                <p className="text-muted-foreground text-xs">Tempo</p>
                <p className="font-bold">{resumo.tempoInfusao} h</p>
              </div>
              <div className="rounded-md bg-secondary p-2">
                <p className="text-muted-foreground text-xs">BI média</p>
                <p className="font-bold">{resumo.biMedia} ml/h</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between rounded-md bg-secondary px-3 py-2">
                <span className="text-muted-foreground">VCT</span>
                <span className="font-semibold">{resumo.vct} kcal</span>
              </div>
              <div className="flex justify-between rounded-md bg-secondary px-3 py-2">
                <span className="text-muted-foreground">PTN</span>
                <span className="font-semibold">{resumo.proteina}g</span>
              </div>
              <div className="flex justify-between rounded-md bg-secondary px-3 py-2">
                <span className="text-muted-foreground">CHO</span>
                <span className="font-semibold">{resumo.carboidrato}g</span>
              </div>
              <div className="flex justify-between rounded-md bg-secondary px-3 py-2">
                <span className="text-muted-foreground">LIP</span>
                <span className="font-semibold">{resumo.lipidio}g</span>
              </div>
              {resumo.fibra > 0 && (
                <div className="flex justify-between rounded-md bg-secondary px-3 py-2 col-span-2">
                  <span className="text-muted-foreground">Fibras</span>
                  <span className="font-semibold">{resumo.fibra}g</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Adequação VCT</span>
                <Badge variant={resumo.adequacaoVCT >= 90 && resumo.adequacaoVCT <= 110 ? "default" : "destructive"}>
                  {resumo.adequacaoVCT}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Adequação PTN</span>
                <Badge variant={resumo.adequacaoPTN >= 90 && resumo.adequacaoPTN <= 110 ? "default" : "destructive"}>
                  {resumo.adequacaoPTN}%
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Necessidade hídrica</span>
                <span className="font-medium">{resumo.necessidadeHidrica} ml</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
