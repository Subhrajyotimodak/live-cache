import { Controller } from "live-cache";

const API_BASE = "https://pokeapi.co/api/v2";

export class PokemonListController extends Controller {
  constructor(name, options) {
    super(name, options);
    this.limit = 24;
  }

  async fetch() {
    this.abort();
    const response = await fetch(`${API_BASE}/pokemon?limit=${this.limit}`, {
      signal: this.abortController?.signal,
    });
    if (!response.ok) {
      throw new Error(`GET /pokemon failed (${response.status})`);
    }
    const data = await response.json();
    return [data.results ?? [], data.count ?? data.results?.length ?? 0];
  }

  async update() {
    const [response, total] = await this.fetch();
    this.collection.clear();
    this.collection.insertMany(response);
    this.updateTotal(total);
    await this.commit();
  }

  invalidate() {
    this.abort();
    void this.update();
  }
}

export class PokemonDetailsController extends Controller {
  constructor(name, options) {
    super(name, options);
    this.lastQuery = null;
  }

  resolveQuery(where) {
    if (!where) return null;
    if (typeof where === "string") return where;
    if (where.name) return String(where.name);
    if (where.id !== undefined) return String(where.id);
    return null;
  }

  async fetch(where) {
    const query = this.resolveQuery(where);
    const previous = this.collection.find().map((doc) => doc.toData());

    if (!query) {
      return [previous, previous.length];
    }
    this.lastQuery = query;
    this.abort();
    const response = await fetch(`${API_BASE}/pokemon/${query}`, {
      signal: this.abortController?.signal,
    });
    if (!response.ok) {
      throw new Error(`GET /pokemon/${query} failed (${response.status})`);
    }
    const data = await response.json();
    return [[data], previous.length + 1];
  }

  async update(where) {
    const [response, total] = await this.fetch(where);
    this.collection.clear();
    if (response.length) {
      this.collection.insertMany(response);
    }
    this.updateTotal(total);
    await this.commit();
  }

  invalidate() {
    if (!this.lastQuery) return;
    this.abort();
    void this.update(this.lastQuery);
  }
}
