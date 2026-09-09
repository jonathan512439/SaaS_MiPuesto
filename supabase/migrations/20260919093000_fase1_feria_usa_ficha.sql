-- Feria usa «ficha», no «lista».
--
-- La migración anterior mapeó Clásica y Feria a la misma tarjeta, y al mirar las
-- dos de cerca resultaron formas distintas:
--
--   Clásica: fila editorial. Foto, descripción, la acción adentro de la fila y
--            el precio al costado.
--   Feria:   fila compacta. Foto chica, sin descripción, precio grande y la
--            acción en su propia columna.
--
-- Esa diferencia es estructural y no de color, así que son dos tarjetas. La de
-- Feria es la lista de precios de un puesto de mercado, y es también donde van a
-- caber los dos atributos destacados de una ferretería en la fase 2: eso es
-- exactamente lo que describe «ficha».
--
-- Se corrige antes de escribir ninguna tarjeta, que es cuando sale barato.

update public.negocios set tarjeta_id = 'ficha'
where plantilla_id = 'feria' and tarjeta_id = 'lista';
