'use client'

import { FileArchive, Link2, Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react'

type Props = {
  resource: {
    id: string
    title: string
    description: string
    resource_type: 'file' | 'link'
    file_url: string | null
    file_name?: string | null
    file_size: number | null
    external_url: string | null
  }
}

export default function ResourceViewer({ resource }: Props) {
  const isLink = resource.resource_type === 'link'
  const href = isLink ? resource.external_url : resource.file_url
  const Icon = isLink ? Link2 : iconForFile(resource.file_url || resource.file_name || '')

  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(31,23,16,0.08)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '24px 28px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          background: isLink ? '#EEEDFE' : '#F5EFE6',
          color: isLink ? '#3C3489' : '#8B6F47',
          borderRadius: 100,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
          marginBottom: 10,
        }}>
          {isLink ? <Link2 size={11} strokeWidth={2.2} /> : <FileArchive size={11} strokeWidth={2.2} />}
          {isLink ? 'ENLACE EXTERNO' : 'RECURSO DESCARGABLE'}
        </div>
        <h1 style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em',
          color: '#1F1710', marginBottom: 8,
        }}>
          {resource.title}
        </h1>
        {resource.description && (
          <p style={{
            fontSize: 13, color: '#3A2D20', lineHeight: 1.6,
            marginBottom: 20, whiteSpace: 'pre-wrap',
          }}>
            {resource.description}
          </p>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: 16,
          background: '#FAF7F2',
          border: '1px solid #EDE4D4',
          borderRadius: 10,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 8,
            background: '#fff', color: '#8B6F47',
            display: 'grid', placeItems: 'center',
            flexShrink: 0,
            border: '1px solid #EDE4D4',
          }}>
            <Icon size={20} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#1F1710',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {isLink
                ? (resource.external_url || 'Enlace')
                : (resource.file_name || 'archivo')}
            </div>
            {!isLink && resource.file_size && (
              <div style={{ fontSize: 11, color: '#8A7860', marginTop: 2 }}>
                {formatFileSize(resource.file_size)}
              </div>
            )}
          </div>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              download={!isLink}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px',
                background: '#1F1710', color: '#F4ECDF',
                borderRadius: 100,
                fontSize: 12, fontWeight: 700,
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              {isLink
                ? <><ExternalLink size={12} strokeWidth={2.2} /> Abrir</>
                : <><Download size={12} strokeWidth={2.2} /> Descargar</>
              }
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function iconForFile(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return FileText
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return ImageIcon
  return FileArchive
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
