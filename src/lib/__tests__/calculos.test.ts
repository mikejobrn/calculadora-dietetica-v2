import { describe, it, expect } from "vitest";
import {
  calcularIMC,
  classificarIMC,
  classificarIMCIdoso,
  calcularPesoIdeal,
  calcularNecessidades,
  calcularBI,
  calcularResumoNutricional,
  avaliarFormula,
  executarEstimativa,
  type EtapaDieta,
  type ProdutoDieta,
} from "@/lib/calculos";

// ==========================================================
// IMC
// ==========================================================
describe("calcularIMC", () => {
  it("calcula IMC corretamente", () => {
    expect(calcularIMC(65, 1.63)).toBeCloseTo(24.46, 1);
  });

  it("retorna 0 para valores inválidos", () => {
    expect(calcularIMC(0, 1.63)).toBe(0);
    expect(calcularIMC(65, 0)).toBe(0);
    expect(calcularIMC(-1, 1.63)).toBe(0);
  });
});

describe("classificarIMC", () => {
  it("classifica Desnutrição < 18.4", () => {
    expect(classificarIMC(17)).toBe("Desnutrição");
  });
  it("classifica Eutrofia 18.4-24.8", () => {
    expect(classificarIMC(22)).toBe("Eutrofia");
    expect(classificarIMC(24.8)).toBe("Eutrofia");
  });
  it("classifica Sobrepeso 24.9-29.8", () => {
    expect(classificarIMC(27)).toBe("Sobrepeso");
  });
  it("classifica Obesidade >= 29.9", () => {
    expect(classificarIMC(32)).toBe("Obesidade");
    expect(classificarIMC(42)).toBe("Obesidade");
  });
});

describe("classificarIMCIdoso (Lipschitz, 1994)", () => {
  it("classifica Desnutrição < 22", () => {
    expect(classificarIMCIdoso(20)).toBe("Desnutrição");
  });
  it("classifica Eutrofia 22-26.9", () => {
    expect(classificarIMCIdoso(24)).toBe("Eutrofia");
  });
  it("classifica Sobrepeso >= 27", () => {
    expect(classificarIMCIdoso(29)).toBe("Sobrepeso");
  });
});

// ==========================================================
// Peso Ideal
// ==========================================================
describe("calcularPesoIdeal", () => {
  it("usa IMC 22 para idosos (≥60 anos)", () => {
    const peso = calcularPesoIdeal(1.63, 65);
    expect(peso).toBeCloseTo(22 * 1.63 * 1.63, 1);
  });
  it("usa IMC 21.7 para adultos (<60 anos)", () => {
    const peso = calcularPesoIdeal(1.75, 35);
    expect(peso).toBeCloseTo(21.7 * 1.75 * 1.75, 1);
  });
  it("retorna 0 para altura inválida", () => {
    expect(calcularPesoIdeal(0, 30)).toBe(0);
  });
});

// ==========================================================
// Necessidades
// ==========================================================
describe("calcularNecessidades", () => {
  it("calcula necessidades com base em peso estimado e ideal", () => {
    const resultado = calcularNecessidades(65, 58.46, {
      fatorCalorico: 30,
      fatorProteico: 1.5,
    });
    expect(resultado.caloricoEstimado).toBe(1950);
    expect(resultado.caloricoIdeal).toBe(1754);
    expect(resultado.proteicoEstimado).toBe(97.5);
    expect(resultado.proteicoIdeal).toBe(87.7);
  });
});

// ==========================================================
// BI (Bomba de Infusão)
// ==========================================================
describe("calcularBI", () => {
  it("calcula velocidade de infusão", () => {
    expect(calcularBI(1000, 12)).toBeCloseTo(83.3, 1);
  });
  it("retorna 0 para duração zero", () => {
    expect(calcularBI(1000, 0)).toBe(0);
  });
});

// ==========================================================
// Resumo Nutricional
// ==========================================================
describe("calcularResumoNutricional", () => {
  const trophic: ProdutoDieta = {
    nome: "Trophic Soya 1.5",
    tipo: "dieta_completa",
    densidadeCalorica: 1.5,
    proteina: 60,
    carboidrato: 196,
    lipidio: 52,
    fibra: null,
  };

  const etapas: EtapaDieta[] = [
    { horario: "08:00", duracao: 12, dieta: trophic, volumeMl: 1000 },
  ];

  it("calcula resumo para uma etapa", () => {
    const resumo = calcularResumoNutricional(etapas, 2000, 100, 65);
    expect(resumo.volumeTotal).toBe(1000);
    expect(resumo.tempoInfusao).toBe(12);
    expect(resumo.biMedia).toBeCloseTo(83.3, 1);
    expect(resumo.vct).toBe(1500); // 1.5 kcal/ml × 1000ml
    expect(resumo.proteina).toBe(60); // 60g/L × 1L
    expect(resumo.carboidrato).toBe(196);
    expect(resumo.lipidio).toBe(52);
    expect(resumo.adequacaoVCT).toBe(75); // 1500/2000 × 100
    expect(resumo.adequacaoPTN).toBe(60); // 60/100 × 100
    expect(resumo.necessidadeHidrica).toBe(1950); // 65 × 30
  });
});

// ==========================================================
// Motor de Fórmulas
// ==========================================================
describe("avaliarFormula", () => {
  it("avalia fórmula com múltiplas variáveis", () => {
    const resultado = avaliarFormula(
      "(alt_joelho * 1.10) + (circ_braco * 3.07) - 75.81",
      { alt_joelho: 52, circ_braco: 28 }
    );
    expect(resultado).toBeCloseTo(67.35, 1);
  });

  it("rejeita expressões com código malicioso", () => {
    expect(() =>
      avaliarFormula("console.log('hack')", { x: 1 })
    ).toThrow("Expressão inválida");
  });
});

describe("executarEstimativa", () => {
  const formulas = {
    peso: {
      Homem: {
        Branca: "(alt_joelho * 1.10) + (circ_braco * 3.07) - 75.81",
      },
      Mulher: {
        Branca: "(alt_joelho * 1.09) + (circ_braco * 2.68) - 65.51",
      },
    },
    altura: {
      Homem: {
        Branca: "59.01 + (alt_joelho * 2.08)",
      },
    },
  };

  it("calcula peso estimado para homem branco", () => {
    const peso = executarEstimativa(formulas, "peso", "Homem", "Branca", {
      alt_joelho: 52,
      circ_braco: 28,
    });
    expect(peso).toBeCloseTo(67.15, 0);
  });

  it("calcula altura estimada", () => {
    const alt = executarEstimativa(formulas, "altura", "Homem", "Branca", {
      alt_joelho: 52,
    });
    expect(alt).toBeCloseTo(167.17, 0);
  });

  it("retorna null para combinação inexistente", () => {
    expect(
      executarEstimativa(formulas, "peso", "Homem", "Inexistente", {})
    ).toBeNull();
  });
});
