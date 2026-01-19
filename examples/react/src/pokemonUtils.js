export function formatName(name) {
  return name ? name[0].toUpperCase() + name.slice(1) : "";
}

export function getSpriteUrl(pokemon) {
  if (!pokemon?.sprites) return "";
  return (
    pokemon.sprites.other?.["official-artwork"]?.front_default ||
    pokemon.sprites.front_default ||
    ""
  );
}

export function getWhereFromQuery(query) {
  if (!query) return undefined;
  const trimmed = String(query).trim().toLowerCase();
  if (!trimmed) return undefined;
  const isNumeric = /^\d+$/.test(trimmed);
  return isNumeric ? { id: Number(trimmed) } : { name: trimmed };
}
