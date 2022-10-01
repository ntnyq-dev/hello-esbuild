import path from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import pc from 'picocolors'
import glob from 'fast-glob'
import consola from 'consola'
import { build } from 'esbuild'
import { minify } from 'terser'
import fs from 'fs-extra'
import { pascalCase } from 'scule'
import type { BuildOptions } from 'esbuild'

const dir = fileURLToPath(new URL(import.meta.url))
const resolve = (...args: string[]) => path.resolve(dir, `../..`, ...args)

const diplayName = `Foobar`
const target = `es2019`

const formatFileName = ({
  name,
  suffix = ``,
  minify = false,
  ext = `js`,
}: {
  name: string
  suffix?: string
  minify?: boolean
  ext?: string
}) => `${name}${suffix ? `.${suffix}` : ``}${minify ? `.min` : ``}.${ext}`

// async function main() {
//   build({
//     // multi bundle entries can be an object like webpack for name mapping
//     entryPoints: [resolve(`src/index.ts`), resolve(`src/app.tsx`)],
//     // inline dependencies
//     bundle: true,
//     // cli --define:process.env.NODE_ENV=\\\"production\\\"
//     define: {
//       DEBUG: `true`, // sting
//     },
//     loader: {}, // handle not builtin support file
//     outdir: resolve(`dist`),
//     target: [], // browserslist alike
//     minify: true,
//     // watch: true,
//     splitting: true,
//     color: true,
//     sourcemap: `external`,
//     platform: `browser`,
//     format: `esm`,
//     external: [`react`, `react-dom`, `/images/*`],
//     charset: `utf8`,
//     drop: [`console`, `debugger`],
//     banner: {
//       js: `// comment`,
//     },
//     // absWorkingDir: process.cwd(),
//     // tsconfig: `tsconfig.json`,
//   })
// }

async function buildEntry(minify: boolean) {
  const options: BuildOptions = {
    entryPoints: [resolve(`src/index.ts`)],
    bundle: true,
    minify,
    target,
  }

  await Promise.all([
    build({
      ...options,
      outfile: resolve(`dist`, `index${minify ? `.min` : ``}.js`),
      format: `cjs`,
    }),
    build({
      ...options,
      outfile: resolve(`dist`, `index${minify ? `.min` : ``}.mjs`),
      format: `esm`,
    }),
    build({
      ...options,
      outfile: resolve(`dist`, `index.iife${minify ? `.min` : ``}.js`),
      globalName: diplayName,
      format: `iife`,
    }),
  ])
}

async function buildSubModule(minify: boolean) {
  const files = await glob([`modules/*.ts`, `!modules/index.ts`], {
    cwd: resolve(`src`),
    absolute: true,
    onlyFiles: false,
  })
  await Promise.all(
    files.map(async file => {
      const type = path.relative(resolve(`src`), path.dirname(file))
      const options: BuildOptions = {
        entryPoints: [file],
        bundle: true,
        minify,
      }
      const dir = resolve(`dist`, type)
      const fileName = path.basename(file, `.ts`)
      await Promise.all([
        build({
          ...options,
          format: `cjs`,
          outfile: path.resolve(dir, formatFileName({ name: fileName, minify })),
        }),
        build({
          ...options,
          format: `esm`,
          outfile: path.resolve(dir, formatFileName({ name: fileName, minify, ext: `mjs` })),
        }),
        build({
          ...options,
          format: `iife`,
          outfile: path.resolve(dir, formatFileName({ name: fileName, suffix: `iife`, minify })),
          globalName: pascalCase(`${diplayName}-${type}-${fileName}`),
        }),
      ])
    }),
  )
}

async function minifyBundle() {
  const files = await glob([`dist/*.min.?(m)js`], { absolute: true })
  for (const filename of files) {
    const content = await fs.readFile(filename, `utf-8`)
    const code = await minify(content, {})
    await fs.writeFile(filename, code.code, `utf-8`)
  }
}

async function buildModules() {
  await Promise.all([
    buildEntry(true),
    buildEntry(false),
    buildSubModule(true),
    buildSubModule(false),
  ])
}

async function main() {
  await buildModules()
  await minifyBundle()
}

try {
  await main()
  consola.success(pc.green(`Build success`))
} catch (error) {
  console.log(error)
  process.exit(1)
}
