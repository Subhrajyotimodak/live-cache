import { useEffect } from "react";
import { useController } from "live-cache";

export default function PokemonList({ selectedName, onSelect }) {
  const { data, loading, error } = useController("pokemonList");

  useEffect(() => {
    if (!selectedName && data.length) {
      onSelect(data[0].name);
    }
  }, [data, selectedName, onSelect]);

  return (
    <section style={{ marginBottom: 24 }}>
      {loading ? <span style={{ color: "#666" }}>Loading list…</span> : null}
      {error ? (
        <div style={{ marginTop: 8, color: "#b71c1c" }}>{String(error)}</div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        {data.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onSelect(item.name)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border:
                selectedName === item.name
                  ? "2px solid #ef5350"
                  : "1px solid #e0e0e0",
              background: "white",
              textTransform: "capitalize",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
    </section>
  );
}
