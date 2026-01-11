const typescriptMod = require("@rollup/plugin-typescript");
const resolveMod = require("@rollup/plugin-node-resolve");
const commonjsMod = require("@rollup/plugin-commonjs");

const typescript = typescriptMod.default ?? typescriptMod;
const nodeResolve = resolveMod.nodeResolve ?? resolveMod.default ?? resolveMod;
const commonjs = commonjsMod.default ?? commonjsMod;

module.exports = {
  input: "src/index.ts",
  external: ["react"],
  output: [
    {
      file: "dist/index.umd.js",
      format: "umd",
      name: "LiveCache",
      exports: "named",
      sourcemap: true,
      globals: {
        react: "React",
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
    nodeResolve(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
    }),
  ],
};
