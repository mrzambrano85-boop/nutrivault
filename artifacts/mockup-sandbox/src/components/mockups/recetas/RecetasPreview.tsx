import { useState, useEffect } from "react";
import { Clock, ChefHat, BookOpen } from "lucide-react";

const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined;
const cache = new Map<string, string>();

async function fetchImage(query: string): Promise<string | null> {
  if (!UNSPLASH_KEY) return null;
  if (cache.has(query)) return cache.get(query) || null;
  cache.set(query, "");
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url: string | null = data.results?.[0]?.urls?.small ?? null;
    if (url) cache.set(query, url);
    return url;
  } catch {
    return null;
  }
}

const RECIPES = [
  { id: "1", nombre: "Ensalada de Pollo a la Parrilla", tiempo_minutos: 25, dificultad: "Fácil",   calorias: 320, proteinas_g: 34 },
  { id: "2", nombre: "Bowl de Arroz con Salmón",        tiempo_minutos: 30, dificultad: "Media",    calorias: 480, proteinas_g: 38 },
  { id: "3", nombre: "Batido Verde Energético",          tiempo_minutos: 10, dificultad: "Fácil",   calorias: 210, proteinas_g: 12 },
  { id: "4", nombre: "Tacos de Lentejas",                tiempo_minutos: 35, dificultad: "Media",   calorias: 390, proteinas_g: 18 },
  { id: "5", nombre: "Tortilla Española Saludable",      tiempo_minutos: 40, dificultad: "Media",   calorias: 280, proteinas_g: 16 },
  { id: "6", nombre: "Pasta con Pesto de Espinacas",     tiempo_minutos: 20, dificultad: "Fácil",   calorias: 420, proteinas_g: 14 },
  { id: "7", nombre: "Sopa de Verduras",                 tiempo_minutos: 45, dificultad: "Fácil",   calorias: 180, proteinas_g: 8  },
  { id: "8", nombre: "Yogur con Granola y Frutas",       tiempo_minutos: 5,  dificultad: "Fácil",   calorias: 260, proteinas_g: 10 },
];

function difColor(d: string) {
  if (d === "Fácil") return "bg-green-100 text-green-700";
  if (d === "Media") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export default function RecetasPreview() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.all(
        RECIPES.map(async (r) => {
          const url = await fetchImage(r.nombre);
          return { id: r.id, url };
        })
      );
      const map: Record<string, string> = {};
      for (const { id, url } of results) {
        if (url) map[id] = url;
      }
      setImages(map);
      setLoaded(true);
    };
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-green-500" />
          Mis Recetas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {loaded ? `${RECIPES.length} recetas` : "Cargando imágenes…"}
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {RECIPES.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col border border-gray-100"
          >
            {/* Cover */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100" style={{ height: 160 }}>
              {images[r.id] ? (
                <img
                  src={images[r.id]}
                  alt={r.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-green-200" />
                </div>
              )}
              {/* Difficulty badge */}
              <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${difColor(r.dificultad)}`}>
                {r.dificultad}
              </span>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col gap-2 flex-1">
              <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{r.nombre}</p>

              <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {r.tiempo_minutos} min
                </span>
                <span className="flex items-center gap-1">
                  <ChefHat className="h-3 w-3" />
                  {r.calorias} kcal
                </span>
                <span className="ml-auto font-medium text-green-600">
                  {r.proteinas_g}g prot.
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!UNSPLASH_KEY && (
        <p className="text-center text-xs text-red-400 mt-8">
          VITE_UNSPLASH_ACCESS_KEY no configurada — mostrando placeholders
        </p>
      )}
    </div>
  );
}
