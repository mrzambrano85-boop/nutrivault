-- Table: receta_reviews
-- Run this in your Supabase SQL editor to enable recipe ratings and notes.

CREATE TABLE IF NOT EXISTS receta_reviews (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receta_id     uuid REFERENCES recetas(id) ON DELETE SET NULL,
  receta_nombre text NOT NULL,
  puntuacion    smallint NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  notas         text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE receta_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own reviews"
  ON receta_reviews FOR ALL
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_receta_reviews_usuario ON receta_reviews (usuario_id);
CREATE INDEX IF NOT EXISTS idx_receta_reviews_receta  ON receta_reviews (receta_id);
