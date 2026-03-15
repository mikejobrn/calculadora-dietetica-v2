import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Parse request JSON
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Nenhuma imagem foernecida via base64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY não configurada no Supabase Edge Functions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Mount payload for Gemini
    const prompt = `Analise a tabela nutricional desta imagem de dieta enteral ou suplemento.
ATENÇÃO: Extraia e padronize todos os valores para uma proporção de 1 Litro (1000ml) se for líquido ou 100g se for pó.
- densidade_calorica: Densidade Calórica (Kcal/ml). Divisão do total Kcal pelo total ml da porção.
- proteina: Proteína em gramas (convertida para 1L ou 100g).
- carboidrato: Carboidrato em gramas (convertido para 1L ou 100g).
- lipidio: Gorduras totais em gramas (convertido para 1L ou 100g).
- fibra: Fibras alimentares em gramas (convertida para 1L ou 100g).

Gere APENAS um texto JSON válido como resposta, sem blocos de markdown e sem mais nada, com as propriedades exatas listadas, com chaves em minúsculo. Valores em NUMBER com ponto '.' e null quando ausente. Exemplo: {"densidade_calorica":1.5, "proteina":60, "carboidrato":160, "lipidio":40, "fibra":10}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    };

    // 4. Call Gemini Vision API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error(data.error?.message || "Nenhum resultado retornado pelo Gemini");
    }

    // 5. Parse and clean output
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/gi, "").replace(/```/gi, "").trim();

    let jsonResult;
    try {
      jsonResult = JSON.parse(text);
    } catch (_e) {
      throw new Error("Erro ao parsear resposta: " + text);
    }

    // 6. Return response
    return new Response(JSON.stringify(jsonResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
