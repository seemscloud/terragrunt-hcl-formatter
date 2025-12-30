// Formatter aligned with AGENTS.md rules for Terragrunt/HCL
const INDENT = 2;
const TOP_LEVEL = ['include', 'terraform', 'inputs', 'dependency'];

function fixBrokenDependencyRefs(text) {
  return text.replace(
    /dependency\.private_locations\.outputs\.locations\s*\[\s*"([^"]+)"\s*\]\s*\.\s*id/g,
    'dependency.private_locations.outputs.locations["$1"].id'
  );
}

function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/\t/g, '  ');
}

function trimEdges(text) {
  return text.replace(/^\s*\n+/, '').replace(/\s+$/, '');
}

function collapseBlankLines(lines) {
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n');
}

function removeLeadingTrailingBlanks(lines) {
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return lines;
}

function enforceTopLevelSpacing(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTop = TOP_LEVEL.some((k) => line.startsWith(k));
    if (isTop && out.length && out[out.length - 1].trim() !== '') {
      out.push('');
    }
    out.push(line);
  }
  return out;
}

function inlineEmptyMaps(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    const m = line.match(/^(\s*.+?=\s*)\{\s*$/);
    if (m && next && next.trim() === '}') {
      out.push(`${m[1]}{}`);
      i += 1;
      continue;
    }
    out.push(line);
  }
  return out;
}

function reorderTopLevel(text) {
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    while (i < lines.length && lines[i].trim() === '') i += 1;
    if (i >= lines.length) break;

    const start = i;
    let depth = 0;
    const content = [];
    const firstLine = lines[i];
    const nameMatch = firstLine.match(/^(\w+)/);
    const name = nameMatch ? nameMatch[1] : '';

    do {
      const line = lines[i];
      content.push(line);
      depth += (line.match(/{/g) || []).length;
      depth -= (line.match(/}/g) || []).length;
      i += 1;
    } while (i < lines.length && depth > 0);

    blocks.push({ name, content, start });
  }

  const picked = [];
  TOP_LEVEL.forEach((name) => {
    const idx = blocks.findIndex((b) => b.name === name);
    if (idx >= 0) {
      picked.push(blocks[idx]);
      blocks.splice(idx, 1);
    }
  });

  const ordered = [...picked, ...blocks];
  return ordered.map((b) => b.content.join('\n')).join('\n\n');
}

function compactTagObjects(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const next = lines[i + 1];
      const hasTrailingCommaLine = next && next.trim() === ',';
      const inlineComma = trimmed.endsWith('},');
      if (!inlineComma && hasTrailingCommaLine) {
        i += 1;
        out.push(`${line.replace(/\s+$/, '')},`);
        continue;
      }
    }

    if (trimmed === '{') {
      const startIndent = line.match(/^\s*/)[0];
      const body = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== '}') {
        body.push(lines[i]);
        i += 1;
      }
      const closingLine = lines[i] || '';
      const nextLine = lines[i + 1];
      let trailingComma = false;
      if (closingLine.trim().endsWith(',')) {
        trailingComma = true;
      } else if (nextLine && nextLine.trim() === ',') {
        trailingComma = true;
        i += 1;
      }

      const blockText = body.map((l) => l.trim()).join('\n');
      const keyMatch = blockText.match(/key\s*=\s*("[^"]*"|[^\s]+)/);
      const valuesMatch = blockText.match(/values\s*=\s*\[(.*?)\]/s);

      if (keyMatch && valuesMatch) {
        const keyVal = keyMatch[1];
        const rawValues = valuesMatch[1]
          .split(/\s*,\s*/)
          .map((v) => v.trim())
          .filter(Boolean);
        const valuesJoined = rawValues.join(', ');
        out.push(
          `${startIndent}{ key = ${keyVal}, values = [${valuesJoined}] }${
            trailingComma ? ',' : ''
          }`
        );
        continue;
      }

      out.push(line, ...body, closingLine);
      if (trailingComma && !closingLine.trim().endsWith(',')) out.push(',');
      continue;
    }

    out.push(line);
  }
  return out;
}

function removeInnerBlankLines(lines) {
  const out = [];
  let bracket = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' && bracket > 0) continue;
    out.push(line);
    bracket += (line.match(/\[/g) || []).length;
    bracket -= (line.match(/]/g) || []).length;
  }
  return out;
}

function trimBlankAroundBraces(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    const trimmed = line.trim();
    const nextTrim = next ? next.trim() : '';

    if ((trimmed.endsWith('{') || trimmed.endsWith('[')) && nextTrim === '') {
      i += 1;
    }

    if (trimmed === '' && nextTrim && /^[}\]]/.test(nextTrim)) {
      continue;
    }

    out.push(line);
  }
  return out;
}

function isScalarLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('#')) return false;
  const m = trimmed.match(/^([A-Za-z0-9_.]+)\s*=\s*(.+)$/);
  if (!m) return false;
  const val = m[2].trim();
  if (val.startsWith('"') || val.startsWith("'")) return true;
  if (/^(true|false|null|\d|[-]?\d|\d+\.\d+)/.test(val)) return true;
  if (val.startsWith('{') || val.startsWith('[')) return false;
  return true;
}

function removeBlankBetweenScalars(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      let prevIdx = i - 1;
      while (prevIdx >= 0 && lines[prevIdx].trim() === '') prevIdx -= 1;
      let nextIdx = i + 1;
      while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx += 1;
      const prevLine = prevIdx >= 0 ? lines[prevIdx] : null;
      const nextLine = nextIdx < lines.length ? lines[nextIdx] : null;
      const nextTrim = nextLine ? nextLine.trim() : '';

      const exempt =
        nextTrim.startsWith('locations_private') ||
        nextTrim.startsWith('tags') ||
        nextTrim.startsWith('mock_outputs');

      if (prevLine && nextLine && isScalarLine(prevLine) && isScalarLine(nextLine) && !exempt) {
        continue;
      }
    }
    out.push(line);
  }
  return out;
}

function joinStandaloneCommaLines(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === ',') {
      if (out.length) {
        out[out.length - 1] = out[out.length - 1].replace(/\s+$/, '') + ',';
      }
      continue;
    }
    out.push(line);
  }
  return out;
}

function rewriteLocationsPrivate(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*locations_private\s*=\s*\[$/.test(line)) {
      const baseIndent = line.match(/^\s*/)[0];
      const itemIndent = baseIndent + ' '.repeat(INDENT);
      const parts = [];
      let j = i + 1;
      let depth = 1;
      for (; j < lines.length; j++) {
        const cur = lines[j];
        const t = cur.trim();
        depth += (t.match(/\[/g) || []).length;
        depth -= (t.match(/]/g) || []).length;
        if (depth <= 0) break;
        if (t) parts.push(t.replace(/,\s*$/, ''));
      }
      if (j + 1 < lines.length && lines[j + 1].trim().startsWith('.')) {
        parts.push(lines[j + 1].trim());
        j += 1;
      }
      const joined = parts.join(' ');
      const m = joined.match(
        /dependency\.private_locations\.outputs\.locations\s*\[\s*"([^"]+)"\s*\]\s*\.?\s*id/i
      );
      const expr = m
        ? `dependency.private_locations.outputs.locations["${m[1]}"].id`
        : joined.trim();
      out.push(line);
      out.push(`${itemIndent}${expr}`);
      out.push(`${baseIndent}]`);
      i = j;
      continue;
    }
    out.push(line);
  }
  return out;
}

function rewriteTagsLists(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^\s*tags\s*=\s*\[$/.test(line)) {
      const baseIndent = line.match(/^\s*/)[0];
      const itemIndent = baseIndent + ' '.repeat(INDENT);
      const bodyLines = [];
      let depth = 1;
      let j = i + 1;
      for (; j < lines.length; j++) {
        const t = lines[j];
        const open = (t.match(/\[/g) || []).length;
        const close = (t.match(/]/g) || []).length;
        depth += open - close;
        if (depth <= 0) break;
        bodyLines.push(t);
      }
      if (depth > 0) {
        out.push(line);
        continue;
      }

      const body = bodyLines.join(' ');
      const objs = body.match(/\{[^{}]*\}/g) || [];
      if (!objs.length) {
        out.push(line, ...bodyLines, `${baseIndent}]`);
        i = j;
        continue;
      }
      const rebuilt = objs.map((obj) => {
        const keyMatch = obj.match(/key\s*=\s*("[^"]*"|[^\s,}]+)/);
        const valuesMatch = obj.match(/values\s*=\s*\[(.*?)\]/s);
        const key = keyMatch ? keyMatch[1] : '';
        const values = valuesMatch ? valuesMatch[1].trim() : '';
        return `${itemIndent}{ key = ${key}, values = [${values}] },`;
      });
      out.push(line, ...rebuilt, `${baseIndent}]`);
      i = j;
      continue;
    }
    out.push(line);
  }
  return out;
}

function ensureSpacingRules(lines) {
  const out = [];
  const indentOf = (l) => (l.match(/^\s*/) || [''])[0].length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const next = lines[i + 1];
    const nextTrim = next ? next.trim() : '';

    out.push(line);

    const addBlank = () => {
      if (out.length && out[out.length - 1].trim() !== '') out.push('');
    };

    if (
      trimmed === '}' &&
      next &&
      /^\d+\s*=/.test(nextTrim) &&
      indentOf(line) === indentOf(next)
    ) {
      addBlank();
      continue;
    }

    if (trimmed === ']' && /^\s*tags\s*=/.test(nextTrim) && indentOf(line) === indentOf(next)) {
      addBlank();
      continue;
    }

    if (
      /^\s*[\w.]+\s*=/.test(trimmed) &&
      /^\s*locations_private\s*=/.test(nextTrim) &&
      indentOf(line) === indentOf(next)
    ) {
      addBlank();
      continue;
    }

    if (/^\s*config_path\s*=/.test(trimmed) && nextTrim && nextTrim !== '') {
      addBlank();
      continue;
    }
  }

  return out;
}

function countBraces(text) {
  let opens = 0;
  let closes = 0;
  let inString = false;
  let quote = '';
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === '{' || ch === '[') opens += 1;
    else if (ch === '}' || ch === ']') closes += 1;
  }
  return { opens, closes };
}

function applyIndent(lines) {
  const out = [];
  let depth = 0;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      out.push('');
      continue;
    }
    const leadingCloses = (trimmed.match(/^[}\]]+/) || [''])[0].length;
    const indentLevel = Math.max(0, depth - leadingCloses);
    out.push(' '.repeat(indentLevel * INDENT) + trimmed);
    const { opens, closes } = countBraces(trimmed);
    depth = Math.max(0, depth - closes + opens);
  }
  return out;
}

function alignAssignments(lines) {
  const out = [];
  let group = [];

  const flush = () => {
    if (group.length > 1) {
      const maxKey = Math.max(...group.map((g) => g.key.length));
      group.forEach(({ indent, key, value }) => {
        out.push(`${indent}${key}${' '.repeat(maxKey - key.length + 1)}= ${value}`);
      });
    } else if (group.length === 1) {
      out.push(group[0].original);
    }
    group = [];
  };

  for (const line of lines) {
    const m = line.match(/^(\s*)([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    const value = m ? m[3].trim() : null;
    const startsWithBrace = value && (value.startsWith('{') || value.startsWith('['));

    if (m && !startsWithBrace) {
      const indent = m[1];
      const key = m[2];
      const currentIndent = group.length ? group[0].indent : indent;
      if (group.length && indent !== currentIndent) {
        flush();
      }
      group.push({ indent, key, value, original: line });
      continue;
    }

    flush();
    out.push(line);
  }

  flush();
  return out;
}

function prettyFormat(text) {
  const src = trimEdges(fixBrokenDependencyRefs(normalize(text)));
  let lines = [];
  let buf = '';
  let indent = 0;
  let inString = false;
  let quote = '';
  let escape = false;
  let braceDepth = 0;
  let bracketDepth = 0;

  const flush = () => {
    const trimmed = buf.replace(/[ \t]+$/g, '');
    lines.push(trimmed.length ? ' '.repeat(indent * INDENT) + trimmed : '');
    buf = '';
  };

  const lastNonSpace = () => {
    for (let i = buf.length - 1; i >= 0; i--) {
      const ch = buf[i];
      if (ch !== ' ' && ch !== '\t') return ch;
    }
    return null;
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (escape) {
      buf += ch;
      escape = false;
      continue;
    }
    if (inString) {
      buf += ch;
      if (ch === '\\') escape = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === '\n') {
      if (buf.trim().length) flush();
      else lines.push('');
      continue;
    }
    if (ch === '=') {
      buf = buf.replace(/[ \t]+$/g, '');
      if (buf && !buf.endsWith(' ')) buf += ' ';
      buf += '= ';
      continue;
    }

    if (ch === '{') {
      buf = buf.trimEnd();
      if (buf && !buf.endsWith(' ')) buf += ' ';
      buf += '{';
      flush();
      braceDepth += 1;
      indent += 1;
      continue;
    }

    if (ch === '[') {
      buf = buf.trimEnd();
      if (buf && !buf.endsWith(' ')) buf += ' ';
      buf += '[';
      flush();
      bracketDepth += 1;
      indent += 1;
      continue;
    }

    if (ch === '}') {
      if (buf.trim().length) flush();
      braceDepth = Math.max(0, braceDepth - 1);
      indent = Math.max(0, indent - 1);
      lines.push(' '.repeat(indent * INDENT) + '}');
      continue;
    }

    if (ch === ']') {
      if (buf.trim().length) flush();
      bracketDepth = Math.max(0, bracketDepth - 1);
      indent = Math.max(0, indent - 1);
      lines.push(' '.repeat(indent * INDENT) + ']');
      continue;
    }

    if (ch === ',') {
      buf = buf.trimEnd() + ',';
      if (bracketDepth > 0 && braceDepth === 0) {
        flush();
      } else if (braceDepth > 0 && bracketDepth > 0) {
        buf += ' ';
      } else {
        flush();
      }
      continue;
    }

    if (/\s/.test(ch)) {
      if (!buf.endsWith(' ')) buf += ' ';
      continue;
    }

    buf += ch;
  }

  if (buf.trim().length) flush();

  lines = lines.map((l) => l.replace(/[ \t]+$/g, ''));
  lines = collapseBlankLines(lines);
  lines = removeLeadingTrailingBlanks(lines);
  lines = trimBlankAroundBraces(lines);
  lines = enforceTopLevelSpacing(lines);
  lines = inlineEmptyMaps(lines);
  lines = compactTagObjects(lines);
  lines = joinStandaloneCommaLines(lines);
  lines = rewriteTagsLists(lines);
  lines = rewriteLocationsPrivate(lines);
  lines = removeInnerBlankLines(lines);
  lines = removeBlankBetweenScalars(lines);
  lines = ensureSpacingRules(lines);
  lines = reorderTopLevel(lines.join('\n')).split('\n');
  lines = enforceTopLevelSpacing(lines);
  lines = applyIndent(lines);
  lines = alignAssignments(lines);
  lines = removeLeadingTrailingBlanks(lines);

  if (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

  return lines.join('\n') + '\n';
}

module.exports = { prettyFormat };

