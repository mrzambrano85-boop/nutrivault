import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface IngredienteReceta {
  nombre: string;
  unidad: string;
  cantidad: number;
}

interface ResultadoCocinar {
  exito: boolean;
  descontados: string[];
  faltantes: string[];
}

export function useCookRecipe() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCocinar | null>(null);

  const cocinarReceta = async (
    usuarioId: string,
    recetaId: string,
    ingredientes: IngredienteReceta[]
  ): Promise<ResultadoCocinar | null> => {
    setLoading(true);
    setResultado(null);

    try {
      const { data, error } = await supabase.rpc('descontar_ingredientes_receta', {
        p_usuario_id: usuarioId,
        p_receta_id: recetaId,
        p_ingredientes: ingredientes,
      });

      if (error) throw error;

      const res = data as ResultadoCocinar;
      setResultado(res);
      return res;
    } catch (err) {
      console.error('Error al cocinar receta:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { cocinarReceta, loading, resultado };
}