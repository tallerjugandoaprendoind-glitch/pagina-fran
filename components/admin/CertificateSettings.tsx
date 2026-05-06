'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import {
  Award, Save, AlertCircle, FileText, Calendar, Clock,
} from 'lucide-react'

type Template = 'ceu' | 'ibt' | 'iba'
type Modality = 'online' | 'presencial' | 'mixto'
type Area = 'etica' | 'supervision' | 'diversidad_cultural' | 'topicos_aba'

type Props = {
  courseId: string
  initial: {
    certificate_template: Template
    certificate_hours: number | null
    certificate_ceus: number | null
    certificate_modality: Modality
    certificate_area: Area
    certificate_event_date: string | null
  }
}

export default function CertificateSettings({ courseId, initial }: Props) {
  const { showToast } = useToast()
  const [template, setTemplate] = useState<Template>(initial.certificate_template || 'ceu')
  const [hours, setHours] = useState<number | ''>(initial.certificate_hours ?? '')
  const [ceus, setCeus] = useState<number | ''>(initial.certificate_ceus ?? '')
  const [modality, setModality] = useState<Modality>(initial.certificate_modality || 'online')
  const [area, setArea] = useState<Area>(initial.certificate_area || 'topicos_aba')
  const [eventDate, setEventDate] = useState<string>(initial.certificate_event_date || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('courses')
      .update({
        certificate_template: template,
        certificate_hours: hours === '' ? null : Number(hours),
        certificate_ceus: ceus === '' ? null : Number(ceus),
        certificate_modality: modality,
        certificate_area: area,
        certificate_event_date: eventDate || null,
      })
      .eq('id', courseId)

    setSaving(false)

    if (error) {
      showToast('Error al guardar: ' + error.message, 'error')
      return
    }
    showToast('Configuración del certificado guardada', 'success')
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--a-surface-2)', color: 'var(--a-brand)',
            display: 'grid', placeItems: 'center',
          }}>
            <Award size={14} strokeWidth={2.2} />
          </div>
          <h2 className="section-heading">Configuración del certificado</h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--a-ink-3)', marginLeft: 36 }}>
          Define qué plantilla y datos se usarán cuando un alumno termine este curso.
        </p>
      </div>

      {/* Plantilla */}
      <div style={{ marginBottom: 22 }}>
        <label className="input-label">Plantilla del certificado *</label>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
        }} className="cert-tmpl-grid">
          <TemplateCard
            active={template === 'ceu'}
            onClick={() => setTemplate('ceu')}
            title="CEU"
            subtitle="Créditos CEU"
            desc="Para presentaciones, talleres y cursos cortos con créditos"
          />
          <TemplateCard
            active={template === 'ibt'}
            onClick={() => setTemplate('ibt')}
            title="IBT"
            subtitle="Terapeuta"
            desc="Formación teórica completa como Terapeuta de Conducta Internacional"
          />
          <TemplateCard
            active={template === 'iba'}
            onClick={() => setTemplate('iba')}
            title="IBA"
            subtitle="Analista"
            desc="Formación teórica completa como Analista de Conducta Internacional"
          />
        </div>
      </div>

      {/* Duración — común a todas las plantillas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: template === 'ceu' ? '1fr 1fr' : '1fr',
        gap: 14,
        marginBottom: 18,
      }} className="cert-dur-grid">
        <div>
          <label className="input-label">
            Duración en horas *
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={template === 'ibt' ? '40' : template === 'iba' ? '270' : 'ej. 2'}
            className="input-base"
          />
          <div className="input-help">
            {template === 'ibt' && 'IBT típicamente son 40 horas'}
            {template === 'iba' && 'IBA típicamente son 270 horas'}
            {template === 'ceu' && 'Duración real de la presentación'}
          </div>
        </div>

        {template === 'ceu' && (
          <div>
            <label className="input-label">CEUs equivalentes *</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={ceus}
              onChange={(e) => setCeus(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="ej. 1"
              className="input-base"
            />
            <div className="input-help">Créditos CEU que otorga el curso</div>
          </div>
        )}
      </div>

      {/* Campos CEU — modalidad + fecha + área */}
      {template === 'ceu' && (
        <div style={{
          padding: 18,
          background: 'var(--a-surface)',
          border: '1px solid var(--a-border)',
          borderRadius: 10,
          marginBottom: 18,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.06em', color: 'var(--a-ink-3)',
            marginBottom: 14, textTransform: 'uppercase',
          }}>
            Datos adicionales (caja informativa del CEU)
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14,
          }} className="cert-ceu-grid">
            <div>
              <label className="input-label">Modalidad</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  { v: 'online', lbl: 'Online' },
                  { v: 'presencial', lbl: 'Presencial' },
                  { v: 'mixto', lbl: 'Mixto' },
                ] as const).map(opt => (
                  <label key={opt.v} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px',
                    background: modality === opt.v ? 'var(--a-surface-2)' : '#fff',
                    border: `1px solid ${modality === opt.v ? 'var(--a-brand)' : 'var(--a-border-2)'}`,
                    borderRadius: 6, cursor: 'pointer',
                  }}>
                    <input
                      type="radio" name="modality"
                      checked={modality === opt.v}
                      onChange={() => setModality(opt.v)}
                      style={{ accentColor: 'var(--a-brand)' }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--a-ink)' }}>{opt.lbl}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="input-label">Fecha del evento</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="input-base"
              />
              <div className="input-help">Fecha del curso/presentación</div>
            </div>
          </div>

          <div>
            <label className="input-label">Área del curso</label>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6,
            }} className="cert-area-grid">
              {([
                { v: 'etica', lbl: 'Ética' },
                { v: 'supervision', lbl: 'Supervisión' },
                { v: 'diversidad_cultural', lbl: 'Diversidad cultural' },
                { v: 'topicos_aba', lbl: 'Tópicos ABA' },
              ] as const).map(opt => (
                <label key={opt.v} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  background: area === opt.v ? 'var(--a-surface-2)' : '#fff',
                  border: `1px solid ${area === opt.v ? 'var(--a-brand)' : 'var(--a-border-2)'}`,
                  borderRadius: 6, cursor: 'pointer',
                }}>
                  <input
                    type="radio" name="area"
                    checked={area === opt.v}
                    onChange={() => setArea(opt.v)}
                    style={{ accentColor: 'var(--a-brand)' }}
                  />
                  <span style={{ fontSize: 12.5, color: 'var(--a-ink)' }}>{opt.lbl}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          <Save size={14} strokeWidth={2.2} />
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .cert-tmpl-grid { grid-template-columns: 1fr !important; }
          .cert-dur-grid { grid-template-columns: 1fr !important; }
          .cert-ceu-grid { grid-template-columns: 1fr !important; }
          .cert-area-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function TemplateCard({
  active, onClick, title, subtitle, desc,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 14,
        background: active ? 'var(--a-surface-2)' : '#fff',
        border: `1.5px solid ${active ? 'var(--a-brand)' : 'var(--a-border-2)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'border-color .1s, background .1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em',
          color: active ? 'var(--a-brand)' : 'var(--a-ink)',
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700,
          padding: '2px 6px',
          background: active ? '#fff' : 'var(--a-surface-2)',
          color: 'var(--a-ink-2)',
          borderRadius: 3,
          letterSpacing: '0.04em',
        }}>
          {subtitle}
        </div>
      </div>
      <div style={{
        fontSize: 11, color: 'var(--a-ink-2)',
        lineHeight: 1.45,
      }}>
        {desc}
      </div>
    </button>
  )
}
