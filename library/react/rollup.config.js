const resolveMod = require("@rollup/plugin-node-resolve");
const commonjsMod = require("@rollup/plugin-commonjs");
const sucraseMod = require("@rollup/plugin-sucrase");

const nodeResolve = resolveMod.nodeResolve ?? resolveMod.default ?? resolveMod;
const commonjs = commonjsMod.default ?? commonjsMod;
const sucrase = sucraseMod.default ?? sucraseMod;

module.exports = {
  input: "src/index.ts",
  external: ["react", "@live-cache/core"],
  output: [
    {
      file: "dist/index.umd.js",
      format: "umd",
      name: "LiveCacheReact",
      exports: "named",
      sourcemap: true,
      globals: {
        react: "React",
        "@live-cache/core": "LiveCacheCore",
      },
    },
    {
      file: "dist/index.mjs",
      format: "esm",
      sourcemap: true,
    },
    {
      file: "dist/index.cjs",
      format: "cjs",
      exports: "named",
      sourcemap: true,
    },
  ],
  plugins: [
    nodeResolve({
      extensions: [".mjs", ".js", ".json", ".node", ".ts", ".tsx"],
    }),
    commonjs(),
    sucrase({
      transforms: ["typescript", "jsx"],
    }),
  ],
};
