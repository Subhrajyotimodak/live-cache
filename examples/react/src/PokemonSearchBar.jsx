import { useController } from "live-cache";

export default function PokemonSearchBar({ search, setSearch, onSubmit }) {
  const { loading, error } = useController("pokemonDetails", undefined, {
    initialise: false,
    withInvalidation: false,
  });

  return (
    <section
      style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: 24,
      }}
    >
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or id (e.g. ditto, 25)"
          aria-label="Search Pokemon"
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            minWidth: 240,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#ef5350",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>

      {loading ? <span style={{ color: "#666" }}>Loading…</span> : null}
      {error ? <span style={{ color: "#b71c1c" }}>{String(error)}</span> : null}
    </section>
  );
}
