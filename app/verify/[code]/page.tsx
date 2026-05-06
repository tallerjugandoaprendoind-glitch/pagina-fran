import { createClient } from '@/lib/supabase/server'
import { Check, X, Download, Award, Calendar, User, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export const revalidate = 0

/**
 * Página pública de verificación de certificados.
 * URL: /verify/{verification_code}
 *
 * Muestra si el certificado es válido, con los datos del alumno y curso.
 * Sin login requerido — cualquiera con el código puede verificar.
 */
export default async function VerifyPage({ params }: { params: { code: string } }) {
  const supabase = await createClient()

  const { data: cert } = await supabase
    .from('certificates')
    .select(`
      id, student_name, course_title, final_score, issued_at,
      pdf_url, verification_code
    `)
    .eq('verification_code', params.code)
    .maybeSingle()

  const valid = !!cert

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream, #F4ECDF)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: 560,
      }}>

        {/* Logo header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#1F1710',
              display: 'inline-block',
            }}>
              Capy<span style={{ color: '#8B6F47' }}>ABA</span>
            </div>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#6B5E4E',
              letterSpacing: '0.12em',
              marginTop: 2,
            }}>
              VERIFICACIÓN DE CERTIFICADO
            </div>
          </Link>
        </div>

        {/* Card principal */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid rgba(31,23,16,0.08)',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(31,23,16,0.04)',
        }}>
          {/* Estado */}
          <div style={{
            padding: '28px 28px 24px',
            borderBottom: '1px solid rgba(31,23,16,0.08)',
            background: valid ? '#E1F5EE' : '#FEF4EE',
            textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: valid ? '#0F6E56' : '#C2410C',
              margin: '0 auto 14px',
              display: 'grid', placeItems: 'center',
              color: '#fff',
            }}>
              {valid
                ? <Check size={32} strokeWidth={3} />
                : <X size={32} strokeWidth={3} />
              }
            </div>
            <h1 style={{
              fontSize: 24, fontWeight: 800,
              letterSpacing: '-0.03em',
              color: valid ? '#0F6E56' : '#C2410C',
              marginBottom: 6,
            }}>
              {valid ? 'Certificado válido' : 'Certificado no encontrado'}
            </h1>
            <p style={{
              fontSize: 13,
              color: valid ? '#0F6E56' : '#C2410C',
              opacity: 0.85,
            }}>
              {valid
                ? 'Este certificado ha sido emitido oficialmente por CapyABA.'
                : 'El código ingresado no corresponde a ningún certificado emitido.'}
            </p>
          </div>

          {/* Detalles del certificado */}
          {valid && cert && (
            <div style={{ padding: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <DetailRow
                  icon={<User size={14} strokeWidth={2.2} />}
                  label="Otorgado a"
                  value={cert.student_name}
                />
                <DetailRow
                  icon={<BookOpen size={14} strokeWidth={2.2} />}
                  label="Curso"
                  value={cert.course_title}
                />
                <DetailRow
                  icon={<Award size={14} strokeWidth={2.2} />}
                  label="Calificación final"
                  value={`${cert.final_score}%`}
                  highlight
                />
                <DetailRow
                  icon={<Calendar size={14} strokeWidth={2.2} />}
                  label="Fecha de emisión"
                  value={formatDate(cert.issued_at)}
                />
              </div>

              <div style={{
                marginTop: 24, paddingTop: 20,
                borderTop: '1px solid rgba(31,23,16,0.08)',
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#8A7860',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}>
                  CÓDIGO DE VERIFICACIÓN
                </div>
                <div style={{
                  fontSize: 13,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  color: '#1F1710',
                  fontWeight: 600,
                  wordBreak: 'break-all',
                }}>
                  {cert.verification_code}
                </div>
              </div>

              {cert.pdf_url && (
                <a
                  href={cert.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 22,
                    padding: '11px 20px',
                    background: '#1F1710',
                    color: '#F4ECDF',
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <Download size={15} strokeWidth={2.2} />
                  Descargar certificado PDF
                </a>
              )}
            </div>
          )}

          {!valid && (
            <div style={{ padding: 28, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#6B5E4E', lineHeight: 1.6 }}>
                Verifica que hayas copiado el código completo del certificado,
                o escanea de nuevo el código QR. Si el problema persiste, el certificado
                podría haber sido revocado.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center', marginTop: 24,
          fontSize: 11, color: '#6B5E4E',
        }}>
          <Link href="/" style={{ color: '#1F1710', fontWeight: 600, textDecoration: 'none' }}>
            CapyABA
          </Link>
          {' · '}
          Academia de análisis conductual aplicado
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  icon, label, value, highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#F5EFE6', color: '#8B6F47',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: '#8A7860', letterSpacing: '0.08em',
          marginBottom: 3, textTransform: 'uppercase',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: highlight ? 20 : 15,
          fontWeight: highlight ? 800 : 600,
          color: '#1F1710',
          letterSpacing: highlight ? '-0.02em' : 0,
          lineHeight: 1.3,
          wordBreak: 'break-word',
        }}>
          {value}
        </div>
      </div>
    </div>
  )
}
