"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
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

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

function formatZeroDecimal(value: number): string {
  return value.toFixed(0);
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

  const focusInputById = useCallback((id: string) => {
    window.setTimeout(() => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (!el) return;
      el.focus();
      el.select?.();
    }, 0);
  }, []);

  // Load products from Supabase
  useEffect(() => {
    const carregar = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("produtos_alimentares")
          .select("id, nome, tipo, densidade_calorica, proteina, carboidrato, lipidio, fibra")
          .order("tipo")
          .order("nome");
        if (error) console.error("Erro ao carregar produtos:", error);
        if (data) setProdutos(data);
      } catch (err) {
        console.error("Fetch produtos falhou:", err);
      }
    };
    carregar();
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
    focusInputById("fator-calorico");
  }, [peso, altura, idade, focusInputById]);

  // Calculate needs
  const handleCalcularNecessidades = useCallback(() => {
    const p = parseFloat(peso);
    if (!p || !pesoIdeal) return;

    const n = calcularNecessidades(p, pesoIdeal, {
      fatorCalorico: parseFloat(fatorCalorico),
      fatorProteico: parseFloat(fatorProteico),
    });
    setNecessidades(n);
    focusInputById("stage-horario");
  }, [peso, pesoIdeal, fatorCalorico, fatorProteico, focusInputById]);

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

    if (stageProteinaId) {
      const mod = produtos.find((p) => p.id === stageProteinaId);
      if (mod) {
        novaEtapa.moduloProteina = produtoToDieta(mod);
        novaEtapa.medidaProteina = parseFloat(stageMedidaProteina) || 0;
      }
    }

    if (stageFibraId) {
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
      setResumo(calcularResumoNutricional(novasEtapas, necCal, necPTN, parseFloat(peso), parseInt(idade)));
    }

    setStageHorario("");
    setStageDuracao("");
    setStageDietaId("");
    setStageVolume("");
    setStageProteinaId("");
    setStageMedidaProteina("");
    setStageFibraId("");
    setStageMedidaFibra("");

    focusInputById("stage-horario");
  };

  const handleRemoverEtapa = (index: number) => {
    const novasEtapas = etapas.filter((_, i) => i !== index);
    setEtapas(novasEtapas);
    if (necessidades && novasEtapas.length > 0) {
      const necCal = usarPesoEstimado ? necessidades.caloricoEstimado : necessidades.caloricoIdeal;
      const necPTN = usarPTNEstimado ? necessidades.proteicoEstimado : necessidades.proteicoIdeal;
      setResumo(calcularResumoNutricional(novasEtapas, necCal, necPTN, parseFloat(peso), parseInt(idade)));
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="peso" className="text-xs">Peso (kg)</Label>
              <Input id="peso" type="number" min="0" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="altura" className="text-xs">Altura (m)</Label>
              <Input id="altura" type="number" min="0" step="0.01" value={altura} onChange={(e) => setAltura(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="idade" className="text-xs">Idade (anos)</Label>
              <Input id="idade" type="number" min="0" value={idade} onChange={(e) => setIdade(e.target.value)} inputMode="numeric" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCalcular} className="flex-1">Calcular</Button>
            <EstimativaModal onApply={(p, a, i) => {
              if (p !== undefined) setPeso(p.toString());
              if (a !== undefined) setAltura(a.toString());
              if (i !== undefined) setIdade(i.toString());
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
                <Label className="text-xs">Necessidade calórica por peso:</Label>
                <Input id="fator-calorico" type="number" min="0" step="1" value={fatorCalorico} onChange={(e) => setFatorCalorico(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Necessidade protéica por peso:</Label>
                <Input id="fator-proteico" type="number" min="0" step="0.1" value={fatorProteico} onChange={(e) => setFatorProteico(e.target.value)} inputMode="decimal" />
              </div>
            </div>

            <Button onClick={handleCalcularNecessidades} className="w-full">Calcular Necessidades</Button>

            {necessidades && (
              <div className="space-y-3 text-sm">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Necessidade calórica por peso:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setUsarPesoEstimado(true)}
                      className={`rounded-md px-3 py-3 text-center transition ${usarPesoEstimado ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      Estimado: {necessidades.caloricoEstimado} kcal
                    </button>
                    <button
                      onClick={() => setUsarPesoEstimado(false)}
                      className={`rounded-md px-3 py-3 text-center transition ${!usarPesoEstimado ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      Ideal: {necessidades.caloricoIdeal} kcal
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Necessidade proteica por peso:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setUsarPTNEstimado(true)}
                      className={`rounded-md px-3 py-3 text-center transition ${usarPTNEstimado ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      Estimado: {necessidades.proteicoEstimado}g
                    </button>
                    <button
                      onClick={() => setUsarPTNEstimado(false)}
                      className={`rounded-md px-3 py-3 text-center transition ${!usarPTNEstimado ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      Ideal: {necessidades.proteicoIdeal}g
                    </button>
                  </div>
                </div>
              </div>
            )}
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
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
              <div className="min-w-0 space-y-1">
                <Label className="text-xs">Horário</Label>
                <Input id="stage-horario" type="time" value={stageHorario} onChange={(e) => setStageHorario(e.target.value)} className="w-full" />
              </div>
              <div className="w-full space-y-1">
                <Label className="text-xs">Duração (h)</Label>
                <Input type="number" min="0" step="0.5" value={stageDuracao} onChange={(e) => setStageDuracao(e.target.value)} className="text-right" inputMode="decimal" />
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
              <div className="min-w-0 space-y-1">
                <Label className="text-xs">Dieta</Label>
                <NativeSelect value={stageDietaId} onChange={(e) => setStageDietaId(e.target.value)}>
                  <option value="">Selecione a dieta</option>
                  {dietasCompletas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="w-full space-y-1">
                <Label className="text-xs">Volume (ml)</Label>
                <Input type="number" min="0" value={stageVolume} onChange={(e) => setStageVolume(e.target.value)} className="text-right" inputMode="numeric" />
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
              <div className="min-w-0 space-y-1">
                <Label className="text-xs">Módulo de proteína</Label>
                <NativeSelect value={stageProteinaId} onChange={(e) => setStageProteinaId(e.target.value)}>
                  <option value="">Nenhum</option>
                  {modulosProteina.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="w-full space-y-1">
                <Label className="text-xs">Medida (un)</Label>
                <Input type="number" min="0" value={stageMedidaProteina} onChange={(e) => setStageMedidaProteina(e.target.value)} disabled={!stageProteinaId} className="text-right" inputMode="decimal" />
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
              <div className="min-w-0 space-y-1">
                <Label className="text-xs">Módulo de fibra</Label>
                <NativeSelect value={stageFibraId} onChange={(e) => setStageFibraId(e.target.value)}>
                  <option value="">Nenhum</option>
                  {modulosFibra.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="w-full space-y-1">
                <Label className="text-xs">Medida (un)</Label>
                <Input type="number" min="0" value={stageMedidaFibra} onChange={(e) => setStageMedidaFibra(e.target.value)} disabled={!stageFibraId} className="text-right" inputMode="decimal" />
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
              <div key={idx} className="rounded-md border-l-4 border-l-primary bg-secondary/50 px-3 py-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    <span className="font-mono">{etapa.horario}</span> - BI: {calcularBI(etapa.volumeMl, etapa.duracao)} ml/h
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoverEtapa(idx)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
                <div className="space-y-1 text-sm">
                  <div>{etapa.dieta.nome} - {etapa.volumeMl} ml</div>
                  {etapa.moduloProteina && (
                    <div>{etapa.moduloProteina.nome} - {etapa.medidaProteina || 0} {(etapa.medidaProteina || 0) > 1 ? "medidas" : "medida"}</div>
                  )}
                  {etapa.moduloFibra && (
                    <div>{etapa.moduloFibra.nome} - {etapa.medidaFibra || 0} {(etapa.medidaFibra || 0) > 1 ? "medidas" : "medida"}</div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ========== RESUMO NUTRICIONAL ========== */}
      {resumo && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Informações Nutricionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-secondary px-3 py-2 text-sm">
              <span><strong>Volume:</strong> {resumo.volumeTotal} ml</span>
              <span className="mx-2" />
              <span><strong>Tempo:</strong> {resumo.tempoInfusao} h</span>
              <span className="mx-2" />
              <span><strong>BI média:</strong> {resumo.biMedia} ml/h</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="rounded-md bg-secondary px-3 py-2">
                <strong>VCT:</strong> {resumo.vct} <strong className="ml-3">CHO:</strong> {resumo.carboidrato}
              </div>
              <div className="rounded-md bg-secondary px-3 py-2">
                <strong>PTN:</strong> {formatOneDecimal(resumo.ptn)} <strong className="ml-3">MP:</strong> {formatOneDecimal(resumo.mp)} <strong className="ml-3">Total de Proteína:</strong> {formatOneDecimal(resumo.totalProteina)}
              </div>
              <div className="rounded-md bg-secondary px-3 py-2">
                <strong>LIP:</strong> {formatOneDecimal(resumo.lipidio)}
              </div>
              <div className="rounded-md bg-secondary px-3 py-2">
                <strong>Fibras:</strong> {formatOneDecimal(resumo.fibras)} <strong className="ml-3">MF:</strong> {formatOneDecimal(resumo.mf)} <strong className="ml-3">Total Fibras:</strong> {formatOneDecimal(resumo.totalFibras)}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="rounded-md bg-secondary px-3 py-2 text-sm">
                <p><strong>Necessidade calórica:</strong> {resumo.necessidadeCalorica} kcal ({resumo.necessidadeCaloricaPorPeso})</p>
                <p><strong>Adequação VCT:</strong> {formatZeroDecimal(resumo.adequacaoVCT)} %</p>
              </div>
              <div className="rounded-md bg-secondary px-3 py-2 text-sm">
                <p><strong>Necessidade protéica:</strong> {resumo.necessidadeProteica} g ({resumo.necessidadeProteicaPorPeso})</p>
                <p><strong>Adequação PTN:</strong> {formatZeroDecimal(resumo.adequacaoPTN)} %</p>
              </div>
              <div className="rounded-md bg-secondary px-3 py-2 text-sm">
                <strong>Necessidade hídrica:</strong> {resumo.necessidadeHidrica} ml
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
