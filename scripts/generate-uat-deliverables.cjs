// Generate Excel + Word deliverables from docs/uat/UAT-UKCOPO.md.
//
//   Excel  (.xlsx): per-test-case block with metadata header + 9 columns
//                   matching the team's SharePoint template:
//                     Test Step # · Steps To Perform Test · Tester ·
//                     Expected Results · Pass/Fail? · Date Tested ·
//                     Query & Inputs (Only if Fail) ·
//                     Related User Story · Bug ID
//                   One row per test step. Test cases stacked top-to-bottom
//                   on a single "Test Cases" sheet, with a "Cover" sheet
//                   describing scope + cross-refs.
//
//   Word   (.docx): companion document for the decision-tree narrative
//                   that doesn't translate well to Excel cells:
//                     §4.5 shared UK COPO authorization-status tree
//                     per-test tree slices for all Family 3 tests
//
// Usage: node scripts/generate-uat-deliverables.js
//        outputs docs/uat/UAT-UKCOPO.xlsx and docs/uat/UAT-UKCOPO-DecisionTrees.docx

const fs = require('fs')
const path = require('path')
const ExcelJS = require('exceljs')
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  ShadingType,
} = require('docx')

const ROOT = path.resolve(__dirname, '..')
const SRC_MD = path.join(ROOT, 'docs', 'uat', 'UAT-UKCOPO.md')
const OUT_XLSX = path.join(ROOT, 'docs', 'uat', 'UAT-UKCOPO.xlsx')
const OUT_DOCX = path.join(ROOT, 'docs', 'uat', 'UAT-UKCOPO-DecisionTrees.docx')

const COLUMNS = [
  { header: 'Test Step #', key: 'stepNum', width: 12 },
  { header: 'Steps To Perform Test', key: 'step', width: 70 },
  { header: 'Tester', key: 'tester', width: 16 },
  { header: 'Expected Results', key: 'expected', width: 70 },
  { header: 'Pass/Fail?', key: 'passFail', width: 12 },
  { header: 'Date Tested', key: 'dateTested', width: 14 },
  { header: 'Query & Inputs (Only if Fail)', key: 'query', width: 40 },
  { header: 'Related User Story', key: 'userStory', width: 22 },
  { header: 'Bug ID, as a point of reference', key: 'bugId', width: 22 },
]

// ── Markdown parser ──────────────────────────────────────────────────
// Builds an array of test case objects from the UAT markdown.

function parseTestCases(md) {
  const lines = md.split(/\r?\n/)
  const cases = []
  let current = null
  let mode = null
  let codeFence = false
  let codeBuf = []

  const closeCurrent = () => {
    if (current) cases.push(current)
    current = null
    mode = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect ### UAT-UKCOPO-NNN · ... — test case heading
    const headingMatch = line.match(
      /^###\s+(UAT-UKCOPO-[A-Z0-9-]+)\s+·\s+([^—]+)\s+—\s+(.+)$/,
    )
    if (headingMatch) {
      closeCurrent()
      current = {
        id: headingMatch[1].trim(),
        caseRef: headingMatch[2].trim(),
        title: headingMatch[3].trim(),
        capability: '',
        persona: '',
        stage: '',
        caseShape: '',
        preconditions: [],
        steps: [],
        expected: [],
        passCriteria: [],
        decisionTree: null,
      }
      continue
    }

    if (!current) continue

    // Detect mode-switch markers (bold labels)
    const boldLabel = line.match(/^\*\*([^*]+?)\*\*:?\s*(.*)$/)
    if (boldLabel) {
      const label = boldLabel[1].trim().toLowerCase()
      const inlineRest = boldLabel[2].trim()
      if (label.startsWith('capability validated')) {
        current.capability = inlineRest
        mode = null
        continue
      }
      if (label === 'persona') {
        current.persona = inlineRest
        mode = null
        continue
      }
      if (label === 'workflow stage') {
        current.stage = inlineRest
        mode = null
        continue
      }
      if (label === 'case shape') {
        current.caseShape = inlineRest
        mode = null
        continue
      }
      if (label === 'preconditions') {
        mode = 'preconditions'
        continue
      }
      if (label === 'test steps') {
        mode = 'steps'
        continue
      }
      if (label === 'expected results') {
        mode = 'expected'
        continue
      }
      if (label === 'pass criteria') {
        mode = 'pass'
        continue
      }
      if (label === 'per-test decision tree slice') {
        mode = 'tree'
        continue
      }
    }

    // Section separator (test case boundary)
    if (/^---\s*$/.test(line)) {
      // Don't close — wait for next ### heading. The --- is just a
      // visual separator inside the file.
      mode = null
      continue
    }

    // Code-fence handling for decision tree
    if (line.startsWith('```')) {
      if (codeFence) {
        // Closing fence
        if (mode === 'tree' && current) {
          current.decisionTree = codeBuf.join('\n')
        }
        codeBuf = []
        codeFence = false
      } else {
        codeFence = true
        codeBuf = []
      }
      continue
    }
    if (codeFence) {
      codeBuf.push(line)
      continue
    }

    if (mode === 'preconditions' || mode === 'steps') {
      const m = line.match(/^(\d+)\.\s+(.*)$/)
      if (m) {
        ;(mode === 'preconditions' ? current.preconditions : current.steps).push(
          { num: parseInt(m[1], 10), text: m[2].trim() },
        )
      }
      continue
    }

    if (mode === 'expected' || mode === 'pass') {
      const m = line.match(/^-\s+(.*)$/)
      if (m) {
        ;(mode === 'expected' ? current.expected : current.passCriteria).push(
          m[1].trim(),
        )
      }
      continue
    }
  }
  closeCurrent()
  return cases
}

// Match expected-result bullets back to their step numbers.
// Format in source: "- Step N: <text>" — extract N, the rest is the
// per-step expected result. Bullets that don't start with "Step N:" go
// to the last step (overflow / pass-criteria continuation).
function expectedByStep(tc) {
  const map = new Map()
  for (const exp of tc.expected) {
    const m = exp.match(/^Step\s+(\d+):\s*(.*)$/i)
    if (m) {
      const n = parseInt(m[1], 10)
      const existing = map.get(n) ?? []
      existing.push(m[2].trim())
      map.set(n, existing)
    }
  }
  // Pass criteria appended below the last step's expected column for
  // visibility (so testers see them inline with the steps).
  if (tc.passCriteria.length > 0 && tc.steps.length > 0) {
    const lastStep = tc.steps[tc.steps.length - 1].num
    const existing = map.get(lastStep) ?? []
    existing.push('')
    existing.push('Pass criteria:')
    for (const pc of tc.passCriteria) existing.push(`• ${pc}`)
    map.set(lastStep, existing)
  }
  return map
}

// ── Excel writer ─────────────────────────────────────────────────────

async function writeExcel(cases) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'DARS_eEvidence UAT generator'
  wb.created = new Date()
  wb.modified = new Date()

  // Cover sheet — scope + cross-references to the markdown source.
  const cover = wb.addWorksheet('Cover')
  cover.columns = [
    { width: 28 },
    { width: 90 },
  ]
  const coverRows = [
    ['Document', 'UAT-UKCOPO — UK COPO request type test plan'],
    ['Source', 'docs/uat/UAT-UKCOPO.md (full markdown narrative, decision trees & cross-refs)'],
    ['Companion', 'docs/uat/UAT-UKCOPO-DecisionTrees.docx (decision tree narrative — Family 3 reference)'],
    ['Generated', new Date().toISOString().slice(0, 19).replace('T', ' ')],
    ['Total tests', String(cases.length)],
    ['Family 1', cases.filter((c) => /^UAT-UKCOPO-(0[0-7]\d)$/.test(c.id)).length + ' per-service end-to-end tests (001-070)'],
    ['Family 2', 'Automated vs manual verification matrix (single matrix table in source markdown §5.3)'],
    ['Family 3', cases.filter((c) => /^UAT-UKCOPO-1[01]\d$/.test(c.id)).length + ' authorization-status update tests (100-114) — see Word companion for decision trees'],
    ['Smoke tests', cases.filter((c) => /^UAT-UKCOPO-SMOKE/.test(c.id)).length + ' (SMOKE-A through SMOKE-G)'],
    [''],
    ['Sheet layout', 'Each test case is a stacked block: 3 metadata rows + 1 column-header row + N step rows + 1 blank separator.'],
    ['Pass/Fail enum', 'Pass · Fail · Blocked · Not Run (data validation on the Pass/Fail? column).'],
    ['Tester rows', 'Empty — tester to fill in.'],
    ['Step rows', 'Pre-populated with the action ("Steps To Perform Test") and the matching "Expected Results" — both pulled verbatim from the source markdown.'],
  ]
  cover.addRows(coverRows)
  cover.getColumn(1).font = { bold: true }
  cover.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true }
  })

  // Test Cases sheet — the per-block layout.
  const ws = wb.addWorksheet('Test Cases', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  ws.columns = COLUMNS.map((c) => ({ width: c.width }))

  // Pass/Fail data validation — apply to a large slab so it covers every
  // step row we add below.
  const passFailEnum = '"Pass,Fail,Blocked,Not Run"'

  let rowIdx = 1
  for (const tc of cases) {
    const expMap = expectedByStep(tc)

    // Block — metadata header (3 rows)
    ws.mergeCells(rowIdx, 1, rowIdx, 9)
    const idRow = ws.getRow(rowIdx)
    idRow.getCell(1).value = `${tc.id} · ${tc.title}`
    idRow.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
    idRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F3864' },
    }
    idRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
    idRow.height = 22
    rowIdx++

    ws.mergeCells(rowIdx, 1, rowIdx, 9)
    const metaRow = ws.getRow(rowIdx)
    const metaBits = [
      `Case: ${tc.caseRef}`,
      tc.persona ? `Persona: ${tc.persona}` : null,
      tc.stage ? `Stage: ${tc.stage}` : null,
      tc.caseShape ? `Case shape: ${tc.caseShape}` : null,
    ].filter(Boolean)
    metaRow.getCell(1).value = metaBits.join(' · ')
    metaRow.getCell(1).font = { italic: true, color: { argb: 'FF555555' } }
    metaRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEF2F8' },
    }
    metaRow.getCell(1).alignment = { vertical: 'top', wrapText: true }
    rowIdx++

    if (tc.capability) {
      ws.mergeCells(rowIdx, 1, rowIdx, 9)
      const capRow = ws.getRow(rowIdx)
      capRow.getCell(1).value = `Capability validated: ${tc.capability}`
      capRow.getCell(1).font = { size: 10 }
      capRow.getCell(1).alignment = { vertical: 'top', wrapText: true }
      rowIdx++
    }

    if (tc.preconditions.length > 0) {
      ws.mergeCells(rowIdx, 1, rowIdx, 9)
      const preRow = ws.getRow(rowIdx)
      preRow.getCell(1).value =
        'Preconditions: ' +
        tc.preconditions.map((p) => `(${p.num}) ${p.text}`).join('  ')
      preRow.getCell(1).font = { size: 10, color: { argb: 'FF555555' } }
      preRow.getCell(1).alignment = { vertical: 'top', wrapText: true }
      rowIdx++
    }

    // Column header row
    const headerRow = ws.getRow(rowIdx)
    COLUMNS.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = c.header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    })
    headerRow.height = 28
    rowIdx++

    // Per-step rows
    for (const step of tc.steps) {
      const expected = expMap.get(step.num) ?? []
      const row = ws.getRow(rowIdx)
      row.getCell(1).value = step.num
      row.getCell(2).value = step.text
      row.getCell(3).value = ''
      row.getCell(4).value = expected.join('\n')
      row.getCell(5).value = ''
      row.getCell(6).value = ''
      row.getCell(7).value = ''
      row.getCell(8).value = ''
      row.getCell(9).value = ''

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'top', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        }
      })
      // Pass/Fail dropdown
      row.getCell(5).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [passFailEnum],
        showErrorMessage: true,
        errorTitle: 'Invalid value',
        error: 'Pick Pass / Fail / Blocked / Not Run.',
      }
      rowIdx++
    }

    // Spacer row between blocks
    rowIdx++
  }

  await wb.xlsx.writeFile(OUT_XLSX)
  console.log(`✓ Wrote ${path.relative(ROOT, OUT_XLSX)} — ${cases.length} test cases`)
}

// ── Word writer ──────────────────────────────────────────────────────
// Pulls the shared §4.5 decision tree from the source markdown plus
// every per-test tree slice from Family 3, and renders them as a
// readable companion doc.

function extractSharedTree(md) {
  const lines = md.split(/\r?\n/)
  const tree = { intro: [], block: [], outro: [] }
  let i = 0
  while (i < lines.length) {
    if (/^##\s+4\.5\s+UK COPO authorization-status decision tree/.test(lines[i])) break
    i++
  }
  i++ // skip the heading
  // Intro paragraphs until first code fence
  while (i < lines.length && !lines[i].startsWith('```')) {
    if (lines[i].trim()) tree.intro.push(lines[i])
    i++
  }
  // Skip opening fence
  if (lines[i] && lines[i].startsWith('```')) i++
  // Collect tree body
  while (i < lines.length && !lines[i].startsWith('```')) {
    tree.block.push(lines[i])
    i++
  }
  if (lines[i] && lines[i].startsWith('```')) i++
  // "How to read this tree" outro until next top-level heading
  while (i < lines.length && !/^##\s/.test(lines[i])) {
    if (lines[i].trim()) tree.outro.push(lines[i])
    i++
  }
  return tree
}

function monoLines(textBlock) {
  return textBlock.split('\n').map(
    (l) =>
      new Paragraph({
        children: [
          new TextRun({
            text: l.length === 0 ? ' ' : l,
            font: 'Consolas',
            size: 18,
          }),
        ],
        spacing: { after: 0, before: 0 },
      }),
  )
}

async function writeWord(cases, md) {
  const shared = extractSharedTree(md)
  const family3 = cases.filter((c) => /^UAT-UKCOPO-1[01]\d$/.test(c.id) && c.decisionTree)

  const sections = []
  const children = []

  // Title page
  children.push(
    new Paragraph({
      text: 'UAT-UKCOPO',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: 'Decision Trees — Companion Document',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: 'UK COPO request type — authorization-status update routing reference',
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new TextRun({ text: ' ' })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text:
            'This document is the narrative companion to the UAT test cases (Excel) and the full source markdown. ' +
            'It collects the shared and per-test decision trees from UAT-UKCOPO.md §4.5 and Family 3 so the routing ' +
            'logic stays legible — ASCII trees don’t render cleanly inside Excel cells.',
          italics: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  )

  // Shared §4.5 tree
  children.push(
    new Paragraph({
      text: '§4.5 UK COPO authorization-status decision tree',
      heading: HeadingLevel.HEADING_1,
    }),
  )
  for (const para of shared.intro) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: para })] }),
    )
  }
  children.push(...monoLines(shared.block.join('\n')))
  if (shared.outro.length > 0) {
    children.push(
      new Paragraph({
        text: 'How to read this tree when interpreting a UAT result',
        heading: HeadingLevel.HEADING_2,
      }),
    )
    for (const para of shared.outro) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: para })] }),
      )
    }
  }

  // Per-test trees (Family 3)
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      text: 'Family 3 — Per-test decision tree slices',
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text:
            'One slice per Family 3 test (UAT-UKCOPO-100..114). Each slice highlights the single branch of ' +
            '§4.5 that the test exercises, plus a one-line "Compare" pointer to the sibling test that walks ' +
            'the contrasting branch (typically case-level vs per-task cancellation).',
          italics: true,
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: ' ' })] }),
  )

  for (const tc of family3) {
    children.push(
      new Paragraph({
        text: `${tc.id} — ${tc.title}`,
        heading: HeadingLevel.HEADING_2,
      }),
    )
    if (tc.capability) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Capability validated: ', bold: true }),
            new TextRun({ text: tc.capability }),
          ],
        }),
      )
    }
    const metaBits = [
      tc.persona ? `Persona ${tc.persona}` : null,
      tc.stage ? `Stage ${tc.stage}` : null,
      tc.caseShape ? `Case shape ${tc.caseShape}` : null,
    ].filter(Boolean)
    if (metaBits.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: metaBits.join(' · '), italics: true })],
        }),
      )
    }
    children.push(new Paragraph({ children: [new TextRun({ text: ' ' })] }))
    children.push(...monoLines(tc.decisionTree))
    children.push(new Paragraph({ children: [new TextRun({ text: ' ' })] }))
  }

  sections.push({ children })
  const doc = new Document({
    title: 'UAT-UKCOPO Decision Trees',
    creator: 'DARS_eEvidence UAT generator',
    description:
      'Companion document to UAT-UKCOPO.xlsx containing the §4.5 shared decision tree and Family 3 per-test slices.',
    sections,
  })

  const buf = await Packer.toBuffer(doc)
  fs.writeFileSync(OUT_DOCX, buf)
  console.log(`✓ Wrote ${path.relative(ROOT, OUT_DOCX)} — ${family3.length} Family 3 trees`)
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(SRC_MD)) {
    console.error(`ERROR: source markdown not found at ${SRC_MD}`)
    process.exit(1)
  }
  const md = fs.readFileSync(SRC_MD, 'utf8')
  const cases = parseTestCases(md)
  console.log(`Parsed ${cases.length} test cases from ${path.relative(ROOT, SRC_MD)}`)

  await writeExcel(cases)
  await writeWord(cases, md)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
