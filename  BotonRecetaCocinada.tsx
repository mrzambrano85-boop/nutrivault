import { useState } from 'react';
import { useCookRecipe } from '../hooks/useCookRecipe';
import { useAuth } from '../context/AuthContext';

interface Props {
  recetaId: string;
  recetaNombre: string;
  ingredientes: { nombre: string; unidad: string; cantidad: number }[];
  onExito?: () => void;
}

export function BotonRecetaCocinada({ recetaId, recetaNombre, ingredientes, onExito }: Props) {
  const { user } = useAuth();
  const { cocinarReceta, loading } = useCookRecipe();
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: 'exito' | 'advertencia' | 'error';
    texto: string;
  } | null>(null);

  const handleConfirmar = async () => {
    if (!user) return;

    const resultado = await cocinarReceta(user.id, recetaId, ingredientes);

    if (!resultado) {
      setMensaje({ tipo: 'error', texto: 'Ocurrió un error. Intenta de nuevo.' });
      setConfirmando(false);
      return;
    }

    if (resultado.faltantes.length > 0 && resultado.descontados.length === 0) {
      setMensaje({
        tipo: 'advertencia',
        texto: `Stock insuficiente: ${resultado.faltantes.join(', ')}`,
      });
      setConfirmando(false);
      return;
    }

    if (resultado.faltantes.length > 0) {
      setMensaje({
        tipo: 'advertencia',
        texto: `Registrado. Faltan en despensa: ${resultado.faltantes.join(', ')}`,
      });
    } else {
      setMensaje({
        tipo: 'exito',
        texto: '¡Listo! Despensa actualizada. +10 puntos 🎉',
      });
    }

    setConfirmando(false);
    onExito?.();
    setTimeout(() => setMensaje(null), 4000);
  };

  return (
    <div className="mt-4">
      {!confirmando ? (
        <button
          onClick={() => setConfirmando(true)}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          🍳 Receta Cocinada
        </button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-800 font-medium mb-3">
            ¿Confirmás que cocinaste <strong>{recetaNombre}</strong>?
            <br />
            <span className="text-green-600 text-xs">
              Se descontarán los ingredientes de tu despensa.
            </span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmar}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Procesando...' : 'Sí, confirmar'}
            </button>
            <button
              onClick={() => setConfirmando(false)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mensaje && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm font-medium ${
            mensaje.tipo === 'exito'
              ? 'bg-green-100 text-green-800'
              : mensaje.tipo === 'advertencia'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}