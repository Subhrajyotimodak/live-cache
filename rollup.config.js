import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "src/index.ts",
  external: ["react"],
  output: [
    {
      file: "dist/index.umd.js",
      format: "umd",
      name: "LiveCache",
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
    resolve(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
    }),
  ],
};
