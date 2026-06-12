// General-purpose Markdown -> Word (.docx) converter built on the `docx`
// package (already a devDependency). Handles the subset of Markdown used in
// our docs: ATX headings (#..######), pipe tables, ordered/unordered lists,
// **bold** + `inline code` runs, horizontal rules, and paragraphs.
//
// Usage:
//   node scripts/md-to-docx.cjs <source.md> [<title>]
//
// Output lands next to the source with a .docx extension.
//   e.g. node scripts/md-to-docx.cjs docs/eEvidence-Workflow-Validation.md

const fs = require('fs')
const path = require('path')
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} = require('docx')

const ROOT = path.resolve(__dirname, '..')
const argSource = process.argv[2]
if (!argSource) {
  console.error('ERROR: pass a source markdown path. Usage: node scripts/md-to-docx.cjs <source.md> [title]')
  process.exit(1)
}
const SRC_MD = path.isAbsolute(argSource) ? argSource : path.join(ROOT, argSource)
if (!fs.existsSync(SRC_MD)) {
  console.error(`ERROR: source markdown not found at ${SRC_MD}`)
  process.exit(1)
}
const srcBase = path.basename(SRC_MD, path.extname(SRC_MD))
const OUT_DOCX = path.join(path.dirname(SRC_MD), srcBase + '.docx')
const TITLE = process.argv[3] || srcBase

const HEADING_BY_LEVEL = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
}

// Parse inline markdown (**bold**, `code`) into an array of TextRun.
function inlineRuns(text, baseOpts = {}) {
  const runs = []
  // Tokenise on **bold** and `code` while keeping the delimiters' content.
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index), ...baseOpts }))
    }
    const tok = m[1]
    if (tok.startsWith('**')) {
      runs.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...baseOpts }))
    } else {
      runs.push(new TextRun({ text: tok.slice(1, -1), font: 'Consolas', ...baseOpts }))
    }
    last = re.lastIndex
  }
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), ...baseOpts }))
  }
  if (runs.length === 0) runs.push(new TextRun({ text: ' ', ...baseOpts }))
  return runs
}

function splitTableRow(line) {
  // Trim leading/trailing pipe then split. Keeps empty cells.
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
}

function isTableSeparator(line) {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-')
}

const THIN = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' }
const CELL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN }

function buildTable(rows) {
  const header = rows[0]
  const body = rows.slice(1)
  const colCount = header.length
  const mkCell = (text, { bold = false, shade = null } = {}) =>
    new TableCell({
      borders: CELL_BORDERS,
      shading: shade ? { fill: shade } : undefined,
      children: [new Paragraph({ children: inlineRuns(text, bold ? { bold: true } : {}) })],
    })
  const tableRows = []
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: header.map((c) => mkCell(c, { bold: true, shade: '4472C4' })),
    }),
  )
  for (const r of body) {
    const cells = []
    for (let i = 0; i < colCount; i++) cells.push(mkCell(r[i] ?? ''))
    tableRows.push(new TableRow({ children: cells }))
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  })
}

function convert(md) {
  const lines = md.split(/\r?\n/)
  const children = []
  let i = 0

  // Title page
  children.push(new Paragraph({ text: TITLE, heading: HeadingLevel.TITLE }))

  while (i < lines.length) {
    const line = lines[i]

    // Blank line
    if (line.trim() === '') { i++; continue }

    // Horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      children.push(new Paragraph({ text: '', border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888' } } }))
      i++
      continue
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      children.push(new Paragraph({ heading: HEADING_BY_LEVEL[level], children: inlineRuns(h[2]) }))
      i++
      continue
    }

    // Table (header row followed by separator row)
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const rows = [splitTableRow(line)]
      i += 2 // skip header + separator
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitTableRow(lines[i]))
        i++
      }
      children.push(buildTable(rows))
      children.push(new Paragraph({ text: '' }))
      continue
    }

    // Ordered list item
    const ol = line.match(/^(\s*)(\d+)\.\s+(.*)$/)
    if (ol) {
      const indent = Math.floor(ol[1].length / 2)
      children.push(new Paragraph({
        numbering: { reference: 'ol', level: Math.min(indent, 2) },
        children: inlineRuns(ol[3]),
      }))
      i++
      continue
    }

    // Unordered list item
    const ul = line.match(/^(\s*)[-*]\s+(.*)$/)
    if (ul) {
      const indent = Math.floor(ul[1].length / 2)
      children.push(new Paragraph({
        bullet: { level: Math.min(indent, 2) },
        children: inlineRuns(ul[2]),
      }))
      i++
      continue
    }

    // Plain paragraph
    children.push(new Paragraph({ children: inlineRuns(line) }))
    i++
  }

  return children
}

async function main() {
  const md = fs.readFileSync(SRC_MD, 'utf8')
  const children = convert(md)
  const doc = new Document({
    title: TITLE,
    creator: 'DARS_eEvidence md-to-docx',
    numbering: {
      config: [
        {
          reference: 'ol',
          levels: [0, 1, 2].map((lvl) => ({
            level: lvl,
            format: 'decimal',
            text: `%${lvl + 1}.`,
            alignment: 'start',
          })),
        },
      ],
    },
    sections: [{ children }],
  })
  const buf = await Packer.toBuffer(doc)
  fs.writeFileSync(OUT_DOCX, buf)
  console.log(`✓ Wrote ${path.relative(ROOT, OUT_DOCX)}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
