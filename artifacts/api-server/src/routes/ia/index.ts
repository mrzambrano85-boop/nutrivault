import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY no está configurada en el servidor.");
  return new Anthropic({ apiKey: key });
}

// POST /api/scan-ticket
// Body: { imageBase64: string, mimeType: "image/jpeg" | "image/png" | "image/webp" }
// Returns: { ingredientes: Array<{ nombre, cantidad, unidad, categoria }> }
router.post("/scan-ticket", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "Se requiere imageBase64 y mimeType." });
    }

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validMimes.includes(mimeType)) {
      return res.status(400).json({ error: "Tipo de imagen no válido. Usa JPEG, PNG o WebP." });
    }

    const client = getClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Analiza este ticket de compra de supermercado e identifica todos los productos ALIMENTICIOS.
Ignora artículos de limpieza, higiene personal, cosméticos, bolsas, etc.

Para cada producto alimenticio identificado, devuelve un objeto JSON con:
- nombre: nombre del producto en español (ej: "Leche entera", "Arroz blanco", "Pollo")
- cantidad: número (usa 1 si no está claro)
- unidad: unidad de medida apropiada ("kg", "g", "L", "ml", "unidades", "piezas")
- categoria: una de estas categorías: "Frutas", "Verduras", "Lácteos", "Carnes", "Granos", "Bebidas", "Condimentos", "Otros"

Responde ÚNICAMENTE con un JSON válido en este formato exacto, sin texto adicional:
{
  "ingredientes": [
    { "nombre": "...", "cantidad": 1, "unidad": "kg", "categoria": "..." },
    ...
  ]
}

Si no puedes leer el ticket o no hay productos alimenticios, responde:
{ "ingredientes": [] }`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return res.status(500).json({ error: "Claude no devolvió una respuesta de texto válida." });
    }

    let parsed: { ingredientes: unknown[] };
    try {
      // Extract JSON even if there's surrounding text
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      parsed = JSON.parse(match[0]);
    } catch {
      return res.status(500).json({
        error: "No se pudo interpretar la respuesta de Claude. Intenta con una imagen más nítida.",
      });
    }

    return res.json({ ingredientes: parsed.ingredientes ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    req.log.error({ err }, "Error en scan-ticket");
    return res.status(500).json({ error: message });
  }
});

// POST /api/generar-planes
// Body: { ingredientes: string[] }
// Returns: { planes: Array<{ titulo, descripcion, recetas: Array<{ nombre, ingredientes, pasos, tiempo, porciones }> }> }
router.post("/generar-planes", async (req, res) => {
  try {
    const { ingredientes } = req.body as { ingredientes?: string[] };

    if (!ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
      return res.status(400).json({ error: "Se requiere una lista de ingredientes." });
    }

    const client = getClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Eres un nutricionista experto en cocina latina saludable.
Tengo los siguientes ingredientes disponibles en mi despensa:
${ingredientes.map((i) => `- ${i}`).join("\n")}

Genera exactamente 3 planes de dieta saludable para una familia latina, adaptados a esos ingredientes.
Cada plan debe incluir recetas prácticas y nutritivas usando principalmente los ingredientes disponibles.

Responde ÚNICAMENTE con un JSON válido en este formato exacto, sin texto adicional:
{
  "planes": [
    {
      "titulo": "Nombre del plan (ej: Plan Proteico Familiar)",
      "descripcion": "Descripción breve del enfoque nutricional del plan (2-3 oraciones)",
      "recetas": [
        {
          "nombre": "Nombre de la receta",
          "ingredientes": ["ingrediente 1", "ingrediente 2"],
          "pasos": ["Paso 1...", "Paso 2...", "Paso 3..."],
          "tiempo": 30,
          "porciones": 4
        }
      ]
    }
  ]
}

Cada plan debe tener entre 2 y 3 recetas. Los pasos deben ser claros y concisos. El tiempo es en minutos.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return res.status(500).json({ error: "Claude no devolvió una respuesta válida." });
    }

    let parsed: { planes: unknown[] };
    try {
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      parsed = JSON.parse(match[0]);
    } catch {
      return res.status(500).json({
        error: "No se pudo interpretar la respuesta de Claude. Intenta de nuevo.",
      });
    }

    return res.json({ planes: parsed.planes ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    req.log.error({ err }, "Error en generar-planes");
    return res.status(500).json({ error: message });
  }
});

export default router;
