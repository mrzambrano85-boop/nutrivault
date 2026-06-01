import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, mimeType } = req.body as {
    imageBase64?: string;
    mimeType?: string;
  };

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: "Se requiere imageBase64 y mimeType." });
  }

  if (!validMimes.includes(mimeType)) {
    return res.status(400).json({ error: "Tipo de imagen no válido. Usa JPEG, PNG o WebP." });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no está configurada en el servidor." });
  }

  const client = new Anthropic({ apiKey: key });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-5",
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
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      parsed = JSON.parse(match[0]);
    } catch {
      return res.status(500).json({
        error: "No se pudo interpretar la respuesta. Intenta con una imagen más nítida.",
      });
    }

    return res.json({ ingredientes: parsed.ingredientes ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return res.status(500).json({ error: message });
  }
}
