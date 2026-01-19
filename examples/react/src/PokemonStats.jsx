import { useMemo } from "react";
import { useController } from "live-cache";
import { formatName, getWhereFromQuery } from "./pokemonUtils";

export default function PokemonStats({ query }) {
  const where = useMemo(() => getWhereFromQuery(query), [query]);
  const { data, loading } = useController("pokemonDetails", where, {
    initialise: false,
  });
  const pokemon = data[0] ?? null;

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        border: "1px solid #e0e0e0",
        background: "white",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Base stats</h3>
      {loading ? (
        <div style={{ color: "#777" }}>Loading stats…</div>
      ) : pokemon ? (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {pokemon.stats?.map((entry) => (
            <li key={entry.stat.name}>
              {formatName(entry.stat.name)}: {entry.base_stat}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ color: "#777" }}>No stats loaded.</div>
      )}
    </div>
  );
}
