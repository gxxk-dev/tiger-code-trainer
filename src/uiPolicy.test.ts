import { describe, expect, it } from 'vitest'

const scannedSources = import.meta.glob<string>([
  './**/*.{ts,tsx,css}',
  '../scripts/**/*.ts',
  '../tests/**/*.ts',
  '../*.{json,ts,md,html}',
  '../.github/**/*.{yml,yaml}',
], { eager: true, query: '?raw', import: 'default' })

describe('UI policy', () => {
  it('covers source, generated data, tests, package metadata, and deployment config', () => {
    const coveredPaths = Object.keys(scannedSources).map(displayPath)

    expect(coveredPaths).toEqual(expect.arrayContaining([
      'src/data/splits.generated.ts',
      'tests/app.spec.ts',
      'package.json',
      'playwright.config.ts',
      '.github/workflows/pages.yml',
    ]))
  })

  it('does not use the forbidden middle-dot character', () => {
    const forbidden = String.fromCodePoint(0xb7)
    const offenders = Object.entries(scannedSources)
      .filter(([, source]) => source.includes(forbidden))
      .map(([path]) => displayPath(path))

    expect(offenders).toEqual([])
  })

  it('does not use emoji as interface copy or controls', () => {
    const emoji = /\p{Extended_Pictographic}/u
    const offenders = Object.entries(scannedSources)
      .filter(([, source]) => emoji.test(source))
      .map(([path]) => displayPath(path))

    expect(offenders).toEqual([])
  })

  it('uses Lucide through the shared runtime icon component', () => {
    const rawSvgFiles: string[] = []
    const directIconFiles: string[] = []
    const externalIconModules = new Set<string>()

    for (const [path, source] of Object.entries(scannedSources).filter(([path]) => path.endsWith('.tsx'))) {
      if (/<svg\b/.test(source)) rawSvgFiles.push(displayPath(path))

      for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        const moduleName = match[1]
        if (!moduleName.startsWith('.') && /(hero|icon|lucide)/i.test(moduleName)) {
          externalIconModules.add(moduleName)
        }
      }

      for (const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/g)) {
        const names = match[1]
          .split(',')
          .map((name) => name.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[1] ?? name.trim().replace(/^type\s+/, ''))
          .filter(Boolean)
        if (names.some((name) => new RegExp(`<${name}\\b`).test(source))) {
          directIconFiles.push(displayPath(path))
        }
      }
    }

    expect([...externalIconModules]).toEqual(['lucide-react'])
    expect(rawSvgFiles).toEqual([])
    expect(directIconFiles).toEqual([])
  })
})

function displayPath(path: string): string {
  return path.replace(/^\.\.\//, '').replace(/^\.\//, 'src/')
}
