/**
 * Calculadora Dietética — Módulo de Cálculos Nutricionais
 *
 * Funções puras para cálculo de IMC, classificação, peso ideal,
 * necessidades calórica/proteica, e adequação nutricional.
 */

// ==========================================================
// IMC
// ==========================================================

export function calcularIMC(peso: number, altura: number): number {
  if (altura <= 0 || peso <= 0) return 0;
  return peso / (altura * altura);
}

export type ClassificacaoIMC =
  | "Baixo peso"
  | "Eutrofia"
  | "Sobrepeso"
  | "Obesidade grau I"
  | "Obesidade grau II"
  | "Obesidade grau III";

export function classificarIMC(imc: number): ClassificacaoIMC {
  if (imc < 18.5) return "Baixo peso";
  if (imc < 25.0) return "Eutrofia";
  if (imc < 30.0) return "Sobrepeso";
  if (imc < 35.0) return "Obesidade grau I";
  if (imc < 40.0) return "Obesidade grau II";
  return "Obesidade grau III";
}

// ==========================================================
// IMC para idosos (Lipschitz, 1994)
// ==========================================================

export type ClassificacaoIMCIdoso =
  | "Baixo peso"
  | "Eutrofia"
  | "Sobrepeso";

export function classificarIMCIdoso(imc: number): ClassificacaoIMCIdoso {
  if (imc < 22) return "Baixo peso";
  if (imc <= 27) return "Eutrofia";
  return "Sobrepeso";
}

// ==========================================================
// Peso Ideal (baseado no IMC de 22 para ≥60 anos, 21.7 para <60)
// ==========================================================

export function calcularPesoIdeal(altura: number, idade: number): number {
  if (altura <= 0) return 0;
  const imcReferencia = idade >= 60 ? 22 : 21.7;
  return imcReferencia * (altura * altura);
}

// ==========================================================
// Necessidades Calórica e Proteica
// ==========================================================

export interface NecessidadeNutricional {
  /** kcal/kg (tipicamente 25-35) */
  fatorCalorico: number;
  /** g/kg (tipicamente 1.0-2.0) */
  fatorProteico: number;
}

export interface ResultadoNecessidade {
  caloricoEstimado: number; // kcal (peso estimado × fator)
  caloricoIdeal: number;    // kcal (peso ideal × fator)
  proteicoEstimado: number; // g (peso estimado × fator)
  proteicoIdeal: number;    // g (peso ideal × fator)
}

export function calcularNecessidades(
  pesoEstimado: number,
  pesoIdeal: number,
  fatores: NecessidadeNutricional
): ResultadoNecessidade {
  return {
    caloricoEstimado: Math.round(pesoEstimado * fatores.fatorCalorico),
    caloricoIdeal: Math.round(pesoIdeal * fatores.fatorCalorico),
    proteicoEstimado: Math.round(pesoEstimado * fatores.fatorProteico * 10) / 10,
    proteicoIdeal: Math.round(pesoIdeal * fatores.fatorProteico * 10) / 10,
  };
}

// ==========================================================
// Etapas de Dieta
// ==========================================================

export interface ProdutoDieta {
  nome: string;
  tipo: "dieta_completa" | "modulo_proteina" | "modulo_fibra";
  densidadeCalorica: number | null; // kcal/ml
  proteina: number | null;          // g/L
  carboidrato: number | null;       // g/L
  lipidio: number | null;           // g/L
  fibra: number | null;             // g/L
}

export interface EtapaDieta {
  horario: string;          // "08:00"
  duracao: number;          // horas
  dieta: ProdutoDieta;
  volumeMl: number;
  moduloProteina?: ProdutoDieta;
  medidaProteina?: number;  // unidades (dose, g)
  moduloFibra?: ProdutoDieta;
  medidaFibra?: number;     // unidades (dose, g)
}

export interface ResumoNutricional {
  volumeTotal: number;     // ml
  tempoInfusao: number;    // horas
  biMedia: number;         // ml/h (BI = Volume / Tempo)
  vct: number;             // Valor calórico total (kcal)
  proteina: number;        // g
  carboidrato: number;     // g
  lipidio: number;         // g
  fibra: number;           // g
  adequacaoVCT: number;    // % (VCT / necessidade × 100)
  adequacaoPTN: number;    // % (PTN / necessidade × 100)
  necessidadeHidrica: number; // ml
}

export function calcularBI(volumeMl: number, duracaoHoras: number): number {
  if (duracaoHoras <= 0) return 0;
  return Math.round((volumeMl / duracaoHoras) * 10) / 10;
}

export function calcularResumoNutricional(
  etapas: EtapaDieta[],
  necessidadeCalorica: number,
  necessidadeProteica: number,
  pesoKg: number
): ResumoNutricional {
  let volumeTotal = 0;
  let tempoInfusao = 0;
  let vct = 0;
  let proteina = 0;
  let carboidrato = 0;
  let lipidio = 0;
  let fibra = 0;

  for (const etapa of etapas) {
    const vol = etapa.volumeMl;
    volumeTotal += vol;
    tempoInfusao += etapa.duracao;

    // Dieta principal (nutrientes por litro → converter para volume)
    const litros = vol / 1000;
    if (etapa.dieta.densidadeCalorica) {
      vct += etapa.dieta.densidadeCalorica * vol;
    }
    if (etapa.dieta.proteina) {
      proteina += etapa.dieta.proteina * litros;
    }
    if (etapa.dieta.carboidrato) {
      carboidrato += etapa.dieta.carboidrato * litros;
    }
    if (etapa.dieta.lipidio) {
      lipidio += etapa.dieta.lipidio * litros;
    }
    if (etapa.dieta.fibra) {
      fibra += etapa.dieta.fibra * litros;
    }

    // Módulo de proteína (dose-based)
    if (etapa.moduloProteina && etapa.medidaProteina) {
      // Simplificação: dose em g de proteína
      proteina += etapa.medidaProteina;
    }

    // Módulo de fibra (dose-based)
    if (etapa.moduloFibra && etapa.medidaFibra) {
      fibra += etapa.medidaFibra;
    }
  }

  const biMedia = tempoInfusao > 0 ? Math.round((volumeTotal / tempoInfusao) * 10) / 10 : 0;
  const adequacaoVCT = necessidadeCalorica > 0 ? Math.round((vct / necessidadeCalorica) * 1000) / 10 : 0;
  const adequacaoPTN = necessidadeProteica > 0 ? Math.round((proteina / necessidadeProteica) * 1000) / 10 : 0;

  // Necessidade hídrica: 30ml/kg (simplificação comum)
  const necessidadeHidrica = Math.round(pesoKg * 30);

  return {
    volumeTotal: Math.round(volumeTotal),
    tempoInfusao: Math.round(tempoInfusao * 10) / 10,
    biMedia,
    vct: Math.round(vct),
    proteina: Math.round(proteina * 10) / 10,
    carboidrato: Math.round(carboidrato * 10) / 10,
    lipidio: Math.round(lipidio * 10) / 10,
    fibra: Math.round(fibra * 10) / 10,
    adequacaoVCT,
    adequacaoPTN,
    necessidadeHidrica,
  };
}

// ==========================================================
// Motor de Fórmulas de Estimativa (extensível via JSONB)
// ==========================================================

/**
 * Avalia uma fórmula armazenada como string do banco de dados.
 * Variáveis são substituídas pelos valores dos parâmetros.
 *
 * @example
 * avaliarFormula("(alt_joelho * 1.10) + (circ_braco * 3.07) - 75.81", { alt_joelho: 52, circ_braco: 28 })
 * // → 69.77
 */
export function avaliarFormula(
  formula: string,
  parametros: Record<string, number>
): number {
  let expressao = formula;

  // Sort keys by length (longest first) to avoid partial replacements
  const sortedKeys = Object.keys(parametros).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    expressao = expressao.replaceAll(key, String(parametros[key]));
  }

  // Evaluate the mathematical expression safely
  // Only allow numbers, operators, parentheses, and spaces
  if (!/^[\d\s+\-*/().]+$/.test(expressao)) {
    throw new Error(`Expressão inválida: ${expressao}`);
  }

  // eslint-disable-next-line no-eval
  return Number(eval(expressao));
}

/**
 * Executa um método de estimativa completo a partir dos dados do banco.
 */
export function executarEstimativa(
  formulas: Record<string, Record<string, Record<string, string>>>,
  tipo: "peso" | "altura",
  sexo: string,
  etnia: string,
  parametros: Record<string, number>
): number | null {
  const tipoFormulas = formulas[tipo];
  if (!tipoFormulas) return null;

  const sexoFormulas = tipoFormulas[sexo];
  if (!sexoFormulas) return null;

  const formula = sexoFormulas[etnia];
  if (!formula) return null;

  const resultado = avaliarFormula(formula, parametros);
  return Math.round(resultado * 100) / 100;
}
