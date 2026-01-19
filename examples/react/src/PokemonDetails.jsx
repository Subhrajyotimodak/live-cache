import { useEffect, useMemo } from "react";
import { useController } from "live-cache";
import { formatName, getSpriteUrl, getWhereFromQuery } from "./pokemonUtils";

export default function PokemonDetails({ query }) {
  const where = useMemo(() => getWhereFromQuery(query), [query]);
  const { data, loading, error } = useController(
    "pokemonDetails",
    where,
    { initialise: !!where },
  );

  const pokemon = data[0] ?? null;
  const spriteUrl = getSpriteUrl(pokemon);

  console.log("PokemonDetails", data, loading, error, where);

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        border: "1px solid #e0e0e0",
        background: "white",
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        {loading ? "Loading…" : formatName(pokemon?.name)}
      </h2>
      {error ? <p style={{ color: "#b71c1c" }}>{String(error)}</p> : null}
      {spriteUrl ? (
        <img
          src={spriteUrl}
          alt={pokemon?.name || "Pokemon artwork"}
          style={{ width: "100%", maxWidth: 240 }}
        />
      ) : (
        <div style={{ color: "#777" }}>No artwork available.</div>
      )}
      <h3 style={{ marginBottom: 8 }}>Quick facts</h3>
      {pokemon ? (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>Height: {pokemon.height}</li>
          <li>Weight: {pokemon.weight}</li>
          <li>
            Types:{" "}
            {pokemon.types?.map((entry) => formatName(entry.type.name)).join(", ")}
          </li>
          <li>
            Abilities:{" "}
            {pokemon.abilities
              ?.map((entry) => formatName(entry.ability.name))
              .join(", ")}
          </li>
        </ul>
      ) : (
        <div style={{ color: "#777" }}>Select a Pokemon to see details.</div>
      )}
    </div>
  );
}
