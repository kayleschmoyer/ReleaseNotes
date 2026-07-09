import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { config } from '../lib/config'

interface MarkdownProps {
  children: string
  className?: string
  baseUrl?: string
}

function normalizeBaseUrl(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) return undefined
  try {
    const url = new URL(baseUrl)
    url.hash = ''
    url.search = ''
    if (!url.pathname.endsWith('/')) url.pathname += '/'
    return url.toString()
  } catch {
    return undefined
  }
}

function resolveUrl(rawUrl: string | undefined, baseUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl
  const url = rawUrl.trim()
  if (!url) return url
  if (url.startsWith('#')) return url
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) return url
  if (url.startsWith('//')) return `https:${url}`

  const normalizedBase = normalizeBaseUrl(baseUrl)
  if (!normalizedBase) return url

  try {
    // Azure DevOps inline wiki attachments can be emitted as "/.attachments/..."
    // and must include org/project to resolve correctly.
    if (url.startsWith('/.attachments/')) {
      return `https://dev.azure.com/${encodeURIComponent(config.org)}/${encodeURIComponent(config.project)}${url}`
    }

    if (url.startsWith('/')) {
      return new URL(url, normalizedBase).toString()
    }
    return new URL(url, normalizedBase).toString()
  } catch {
    return url
  }
}

function proxiedImageUrl(rawUrl: string | undefined, baseUrl: string | undefined): string | undefined {
  const resolved = resolveUrl(rawUrl, baseUrl)
  if (!resolved) return resolved
  if (resolved.startsWith('data:') || resolved.startsWith('blob:')) return resolved

  try {
    const url = new URL(resolved)
    if (url.hostname === 'dev.azure.com') {
      return `/api/wiki-asset?src=${encodeURIComponent(url.toString())}`
    }
  } catch {
    // fall through
  }

  return resolved
}

export function Markdown({ children, className, baseUrl }: MarkdownProps) {
  return (
    <div className={className ?? 'prose-brand'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, ...props }) => <a {...props} href={resolveUrl(href, baseUrl)} target="_blank" rel="noreferrer" />,
          img: ({ src, alt, ...props }) => <img {...props} src={proxiedImageUrl(src, baseUrl)} alt={alt ?? ''} loading="eager" decoding="async" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
