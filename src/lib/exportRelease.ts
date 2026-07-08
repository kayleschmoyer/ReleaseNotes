import { workItemUrl } from './config'
import { typeMeta } from './status'
import type { ParsedRelease, ReleaseItem, WorkItemInfo } from './types'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function groups(parsed: ParsedRelease): Array<{ title: string; items: ReleaseItem[] }> {
  const main = parsed.items.filter((i) => i.section === 'main')
  const minor = parsed.items.filter((i) => i.section === 'minor')
  const other = parsed.items.filter((i) => i.section === 'other')
  return [
    { title: 'Main Changes', items: main },
    { title: 'Minor Changes', items: minor },
    { title: 'Other Changes', items: other },
  ].filter((g) => g.items.length > 0)
}

/** Clean, shareable markdown summary of a release. */
export function releaseToMarkdown(
  version: string,
  parsed: ParsedRelease,
  workItems: Map<number, WorkItemInfo>,
): string {
  const lines = [`# Vast Online Core ${version} — Release Notes`, '']
  for (const g of groups(parsed)) {
    lines.push(`## ${g.title}`, '')
    for (const item of g.items) {
      const state = item.id ? workItems.get(item.id)?.state : undefined
      const label = typeMeta(item.type).label
      const id = item.id ? ` [#${item.id}](${workItemUrl(item.id)})` : ''
      lines.push(`- **${label}**${id} — ${item.title}${state ? ` _(${state})_` : ''}`)
    }
    lines.push('')
  }
  for (const s of parsed.sections) {
    if (!s.markdown) continue
    lines.push(`## ${s.title || 'Notes'}`, '', s.markdown, '')
  }
  return lines.join('\n').trim() + '\n'
}

/** Email-ready HTML with inline styles (survives paste into Outlook). */
export function releaseToHtml(
  version: string,
  parsed: ParsedRelease,
  workItems: Map<number, WorkItemInfo>,
): string {
  const parts = [
    `<div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#333333;max-width:640px">`,
    `<h1 style="font-size:22px;margin:0 0 4px">Vast Online Core ${esc(version)}</h1>`,
    `<p style="margin:0 0 20px;color:#5A6675;font-size:13px">Release notes</p>`,
  ]
  for (const g of groups(parsed)) {
    parts.push(
      `<h2 style="font-size:15px;border-bottom:2px solid #ED017F;padding-bottom:6px;margin:20px 0 10px">${esc(g.title)}</h2>`,
      `<ul style="padding-left:18px;margin:0">`,
    )
    for (const item of g.items) {
      const state = item.id ? workItems.get(item.id)?.state : undefined
      const label = typeMeta(item.type).label
      const id = item.id
        ? ` <a href="${workItemUrl(item.id)}" style="color:#C40170;font-family:monospace;font-size:12px">#${item.id}</a>`
        : ''
      parts.push(
        `<li style="margin:6px 0;font-size:14px;line-height:1.5"><strong>${esc(label)}</strong>${id} — ${esc(item.title)}${
          state ? ` <span style="color:#5A6675;font-size:12px">(${esc(state)})</span>` : ''
        }</li>`,
      )
    }
    parts.push(`</ul>`)
  }
  parts.push(`</div>`)
  return parts.join('\n')
}

/** Copy rich HTML (with plain-text fallback) to the clipboard. */
export async function copyRich(html: string, plain: string): Promise<void> {
  if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ])
  } else {
    await navigator.clipboard.writeText(plain)
  }
}
