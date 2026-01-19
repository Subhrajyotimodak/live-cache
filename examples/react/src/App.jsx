import { useState } from "react";
import "./App.css";
import PokemonSearchBar from "./PokemonSearchBar";
import PokemonList from "./PokemonList";
import PokemonDetails from "./PokemonDetails";
import PokemonStats from "./PokemonStats";

function App() {
  const [search, setSearch] = useState("ditto");
  const [selectedQuery, setSelectedQuery] = useState("ditto");

  function handleSearchSubmit(event) {
    event.preventDefault();
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return;
    setSelectedQuery(trimmed);
    setSearch(trimmed);
  }

  function handleSelect(name) {
    setSelectedQuery(name);
    setSearch(name);
  }

  return (
    <div className="app">
      <div className="container">
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ marginBottom: 8 }}>PokéAPI Explorer</h1>
          <p style={{ margin: 0, color: "#444" }}>
            Search for any Pokémon or pick from the list below.
          </p>
        </header>

        <PokemonSearchBar
          search={search}
          setSearch={setSearch}
          onSubmit={handleSearchSubmit}
        />

        <PokemonList selectedName={selectedQuery} onSelect={handleSelect} />

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          <PokemonDetails query={selectedQuery} />
          <PokemonStats query={selectedQuery} />
        </section>
      </div>
    </div>
  );
}

export default App;
