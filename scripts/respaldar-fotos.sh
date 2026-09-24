#!/usr/bin/env bash
# Las fotografías de Storage, copiadas a R2. Lo corre el respaldo diario.
#
# Hasta el 2026-09-24 la base se respaldaba todos los días y las fotos no: un
# dueño que subió trescientas fotos desde su celular hace seis meses
# probablemente ya no las tenga, y perderlas era perder el catálogo aunque la
# base estuviera a salvo.
#
# Cómo trabaja:
#
# - **Lista desde la base, baja por la dirección pública.** Los dos depósitos
#   son públicos —el catálogo muestra sus fotos a cualquiera—, así que no hace
#   falta la clave de servicio de Supabase en GitHub. La lista sale de
#   `storage.objects` con la misma conexión que el volcado.
# - **Incremental.** Un manifiesto en R2 anota cada foto copiada con su eTag;
#   al día siguiente solo se suben las nuevas o las que cambiaron.
# - **Aditivo.** Lo que se borra en Supabase se queda en R2. Es un respaldo: una
#   foto borrada por error es justo lo que hay que poder recuperar. Pesan poco
#   —70 KB de media— y R2 cobra recién pasados los 10 GB.
# - **Comprobado.** Al final baja de R2 algunas fotos al azar y compara su
#   SHA-256 con el original. Una copia que no se lee no es una copia.
#
# Si una foto falla se reintenta al día siguiente —no entra al manifiesto— y el
# paso termina en error para que GitHub avise.
#
# Necesita: SUPABASE_DB_URL, SUPABASE_URL, BALDE, CLOUDFLARE_API_TOKEN y
# CLOUDFLARE_ACCOUNT_ID en el entorno; psql 17 en PSQL.

set -euo pipefail

: "${SUPABASE_DB_URL:?Falta SUPABASE_DB_URL}"
: "${SUPABASE_URL:?Falta SUPABASE_URL}"
: "${BALDE:?Falta BALDE}"
PSQL="${PSQL:-psql}"
MUESTRA="${MUESTRA:-5}"

trabajo="$(mktemp -d)"
trap 'rm -rf "$trabajo"' EXIT

r2_put() { npx --yes wrangler@4 r2 object put "${BALDE}/$1" --file "$2" --remote > /dev/null; }
r2_get() { npx --yes wrangler@4 r2 object get "${BALDE}/$1" --file "$2" --remote > /dev/null 2>&1; }

# 1. Lo que hay hoy en Storage: depósito, nombre y eTag, separados por tabulador.
"$PSQL" "$SUPABASE_DB_URL" -tA -F $'\t' -c "
  select bucket_id, name, coalesce(metadata->>'eTag', updated_at::text)
  from storage.objects
  where bucket_id in ('negocios', 'productos')
    and name not like '%/.emptyFolderPlaceholder'
  order by bucket_id, name;" > "$trabajo/actual.tsv"
total=$(wc -l < "$trabajo/actual.tsv" | tr -d ' ')
echo "Storage tiene $total fotografías."

# 2. Lo que ya se copió. La primera vez no hay manifiesto.
if r2_get "fotos/manifiesto.tsv" "$trabajo/manifiesto.tsv"; then
  echo "Manifiesto anterior: $(wc -l < "$trabajo/manifiesto.tsv" | tr -d ' ') fotografías."
else
  : > "$trabajo/manifiesto.tsv"
  echo "Sin manifiesto anterior: se copia todo."
fi

# 3. Las que faltan o cambiaron: las líneas de hoy que no están tal cual.
grep -vxFf "$trabajo/manifiesto.tsv" "$trabajo/actual.tsv" > "$trabajo/pendientes.tsv" || true
pendientes=$(wc -l < "$trabajo/pendientes.tsv" | tr -d ' ')
echo "Por copiar: $pendientes."

copiadas=0
fallidas=0
cp "$trabajo/manifiesto.tsv" "$trabajo/nuevo.tsv"
while IFS=$'\t' read -r deposito nombre etiqueta; do
  [ -z "$nombre" ] && continue
  archivo="$trabajo/foto"
  # El nombre va codificado para la dirección: puede traer espacios o tildes.
  ruta=$(node -e 'console.log(process.argv[1].split("/").map(encodeURIComponent).join("/"))' "$nombre")
  if curl -sSf --retry 3 --max-time 60 -o "$archivo" \
       "${SUPABASE_URL}/storage/v1/object/public/${deposito}/${ruta}" \
     && r2_put "fotos/${deposito}/${nombre}" "$archivo"; then
    # Si la foto cambió, su línea vieja sale del manifiesto.
    grep -vF "${deposito}"$'\t'"${nombre}"$'\t' "$trabajo/nuevo.tsv" > "$trabajo/sin.tsv" || true
    mv "$trabajo/sin.tsv" "$trabajo/nuevo.tsv"
    printf '%s\t%s\t%s\n' "$deposito" "$nombre" "$etiqueta" >> "$trabajo/nuevo.tsv"
    copiadas=$((copiadas + 1))
  else
    echo "::warning::No se pudo copiar ${deposito}/${nombre}; se reintenta mañana."
    fallidas=$((fallidas + 1))
  fi
done < "$trabajo/pendientes.tsv"

sort -o "$trabajo/nuevo.tsv" "$trabajo/nuevo.tsv"
r2_put "fotos/manifiesto.tsv" "$trabajo/nuevo.tsv"
echo "Copiadas: $copiadas. Fallidas: $fallidas."

# 4. La prueba de que la copia sirve: algunas fotos al azar, bajadas de R2 y
#    comparadas byte a byte con el original.
if [ "$total" -gt 0 ]; then
  shuf -n "$MUESTRA" "$trabajo/actual.tsv" > "$trabajo/muestra.tsv"
  distintas=0
  while IFS=$'\t' read -r deposito nombre _; do
    ruta=$(node -e 'console.log(process.argv[1].split("/").map(encodeURIComponent).join("/"))' "$nombre")
    curl -sSf --retry 3 --max-time 60 -o "$trabajo/original" \
      "${SUPABASE_URL}/storage/v1/object/public/${deposito}/${ruta}"
    if ! r2_get "fotos/${deposito}/${nombre}" "$trabajo/copia"; then
      echo "::error::${deposito}/${nombre} no está en R2."
      distintas=$((distintas + 1))
      continue
    fi
    if [ "$(sha256sum < "$trabajo/original")" != "$(sha256sum < "$trabajo/copia")" ]; then
      echo "::error::${deposito}/${nombre} en R2 no es igual al original."
      distintas=$((distintas + 1))
    fi
  done < "$trabajo/muestra.tsv"
  echo "Muestra comprobada: $(wc -l < "$trabajo/muestra.tsv" | tr -d ' ') fotografías, $distintas distintas."
  [ "$distintas" -eq 0 ] || exit 1
fi

[ "$fallidas" -eq 0 ] || exit 1
echo "Fotografías respaldadas en ${BALDE}/fotos/."
