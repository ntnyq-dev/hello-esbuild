import path from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import pc from 'picocolors'
import esbuild from 'esbuild'

const dir = fileURLToPath(new URL(import.meta.url))
const resolve = (...args: string[]) => path.resolve(dir, `../..`, ...args)

async function main() {
  esbuild.build({
    // multi bundle entries can be an object like webpack for name mapping
    entryPoints: [resolve(`src/index.ts`), resolve(`src/app.tsx`)],
    // inline dependencies
    bundle: true,
    // cli --define:process.env.NODE_ENV=\\\"production\\\"
    define: {
      DEBUG: `true`, // sting
    },
    loader: {}, // handle not builtin support file
    outdir: resolve(`dist`),
    target: [], // browserslist alike
    minify: true,
    // watch: true,
    splitting: true,
    color: true,
    sourcemap: `external`,
    platform: `browser`,
    format: `esm`,
    external: [`react`, `react-dom`, `/images/*`],
    charset: `utf8`,
    drop: [`console`, `debugger`],
    banner: {
      js: `// comment`,
    },
    // absWorkingDir: process.cwd(),
    // tsconfig: `tsconfig.json`,
  })
}

try {
  main()
} catch (error) {
  console.log(error)
  process.exit(1)
}
