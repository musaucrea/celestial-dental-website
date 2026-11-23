/**
 * Job openings are typed into the admin as one free-text field, so the copy that
 * comes back from the sheet is usually a single blob: section labels, bullet
 * characters and paragraphs all run together. This turns that blob back into
 * structure the Careers page can lay out — an intro, labelled sections with
 * bullet lists, plus the deadline and application email pulled out for chips.
 */

export type JobSection = {
  title: string;
  items: string[];
};

export type ParsedJob = {
  /** Copy that appears before the first section label. */
  summary: string;
  sections: JobSection[];
  deadline: string | null;
  email: string | null;
};

/** Distinctive labels — recognised wherever they appear in the text. */
const STRONG_HEADINGS = [
  'duties and responsibilities',
  'key duties and responsibilities',
  'key duties',
  'key responsibilities',
  'main responsibilities',
  'roles and responsibilities',
  'responsibilities',
  'duties',
  'qualifications and experience',
  'academic qualifications',
  'minimum qualifications',
  'qualifications',
  'minimum requirements',
  'requirements',
  'person specification',
  'how to apply',
  'application process',
  'application deadline',
  'about the role',
  'role overview',
  'role summary',
  'job summary',
  'job purpose',
  'position summary',
  'what we offer',
  'what you will do',
  'terms of engagement',
  'remuneration',
  'reporting to',
  'benefits',
];

/** Common words — only treated as labels when followed by a colon or a bullet. */
const WEAK_HEADINGS = [
  'skills and competencies',
  'skills',
  'competencies',
  'experience',
  'education',
  'attributes',
  'requirements and skills',
];

const BULLET = '\\u2022\\u00b7\\u25aa\\u25cf\\u25e6\\u2023';

function toPattern(heading: string) {
  return heading
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+and\s+/g, '\\s*(?:&|and)\\s*')
    .replace(/ /g, '\\s+');
}

const strongAlt = STRONG_HEADINGS.map(toPattern).join('|');
const weakAlt = WEAK_HEADINGS.map(toPattern).join('|');

/**
 * A label must start a line, follow a bullet, or follow the end of a sentence —
 * that keeps "experience" inside "previous experience in cleaning" from being
 * mistaken for a section of its own.
 */
const headingRe = new RegExp(
  `(^|\\n|[${BULLET}]|[.;!?]["'”’]?\\s)\\s*` +
    `(?:(${strongAlt})|(${weakAlt})(?=\\s*[:\\n${BULLET}]))` +
    `\\s*[:\\-–—]?\\s*`,
  'gi',
);

const emailRe = /[\w.+-]+@[\w-]+\.[\w.-]+\w/;

const deadlineRe = new RegExp(
  '(?:on or before|not later than|no later than|closing date|deadline)\\s*(?:is|:)?\\s*' +
    '(' +
    '\\d{1,2}(?:st|nd|rd|th)?\\s+[A-Za-z]+,?\\s+\\d{4}' +
    '|[A-Za-z]+\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}' +
    '|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}' +
    ')',
  'i',
);

function titleCase(label: string) {
  const clean = label.replace(/\s+/g, ' ').trim();
  // Leave the admin's own casing alone unless they SHOUTED the label.
  if (clean !== clean.toUpperCase()) return clean;
  return clean
    .toLowerCase()
    .replace(/\b[a-z]/g, c => c.toUpperCase())
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bTo\b/g, 'to')
    .replace(/\bThe\b/g, 'the');
}

/**
 * Copy pasted out of a document often arrives hard-wrapped mid-sentence. Those
 * breaks aren't new bullets, so stitch a line back onto the previous one when it
 * continues it — the sentence didn't end and the next line starts lowercase.
 */
function unwrapLines(text: string) {
  return text.replace(
    new RegExp(`([^\\s.;:!?\\-–—${BULLET}])[ \\t]*\\n+[ \\t]*(?=[a-z(])`, 'g'),
    '$1 ',
  );
}

function splitItems(body: string): string[] {
  return body
    .split(new RegExp(`\\s*[${BULLET}]\\s*|\\n+`))
    .map(item => item.replace(/^[-–—*]\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(item => item.length > 1);
}

export function parseJobDescription(description: string): ParsedJob {
  const text = unwrapLines((description || '').replace(/\r\n?/g, '\n').trim());
  if (!text) return { summary: '', sections: [], deadline: null, email: null };

  const marks: { title: string; labelStart: number; bodyStart: number }[] = [];
  headingRe.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(text)) !== null) {
    marks.push({
      title: titleCase(match[2] || match[3] || ''),
      labelStart: match.index + match[1].length,
      bodyStart: headingRe.lastIndex,
    });
    // A zero-length match would spin forever; nudge past it.
    if (headingRe.lastIndex === match.index) headingRe.lastIndex++;
  }

  const summaryEnd = marks.length ? marks[0].labelStart : text.length;
  let summary = text.slice(0, summaryEnd).replace(/\s+/g, ' ').trim();

  const sections: JobSection[] = marks
    .map((mark, i) => {
      const end = i + 1 < marks.length ? marks[i + 1].labelStart : text.length;
      return { title: mark.title, items: splitItems(text.slice(mark.bodyStart, end)) };
    })
    .filter(section => section.items.length > 0);

  // An opening "About the role" block reads better as the card's intro than as
  // yet another labelled section.
  const introLabel = /^(?:about the role|role (?:overview|summary)|job (?:summary|purpose)|position summary)$/i;
  if (!summary && sections.length > 1 && introLabel.test(sections[0].title)) {
    summary = sections.shift()!.items.join(' ');
  }

  return {
    summary,
    sections,
    deadline: text.match(deadlineRe)?.[1]?.replace(/,$/, '').trim() || null,
    email: text.match(emailRe)?.[0] || null,
  };
}

/** Short teaser used on the collapsed card when the copy has no intro paragraph. */
export function jobPreview(parsed: ParsedJob): string {
  if (parsed.summary) return parsed.summary;
  const first = parsed.sections[0];
  if (!first) return '';
  return first.items.slice(0, 2).join(' ');
}
