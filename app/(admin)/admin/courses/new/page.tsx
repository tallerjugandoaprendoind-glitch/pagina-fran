'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { ChevronLeft, AlertCircle, BookOpen, FileText, Settings2, ArrowRight, Info, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { CourseCoverUpload } from '@/components/admin/CourseCoverUpload'

export default function NewCoursePage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [passingScore, setPassingScore] = useState(80)
  const [publishImmediately, setPublishImmediately] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('El título del curso es requerido')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title,
        description,
        cover_url: coverUrl,
        passing_score: passingScore,
        is_published: publishImmediately,
        created_by: user!.id,
      })
      .select()
      .single()

    if (courseError || !course) {
      setError(courseError?.message || 'Error al crear el curso')
      setLoading(false)
      return
    }

    const { data: firstModule } = await supabase
      .from('modules')
      .insert({
        course_id: course.id,
        title: 'Módulo 1',
        description: '',
        order: 0,
      })
      .select()
      .single()

    if (firstModule) {
      await supabase.from('lessons').insert({
        module_id: firstModule.id,
        title: 'Primera lección',
        video_url: '',
        content: '',
        duration_minutes: 10,
        order: 0,
      })
    }

    showToast('Curso creado. Ahora agrega el contenido.', 'success')
    router.push(`/admin/courses/${course.id}`)
    router.refresh()
  }

  const scoreClamp = Math.min(100, Math.max(0, passingScore))

  const getScoreColor = () => {
    if (scoreClamp >= 80) return 'var(--a-brand)'
    if (scoreClamp >= 60) return '#d97706'
    return '#dc2626'
  }

  return (
    <div className="nc-root">

      {/* Top bar */}
      <div className="nc-topbar">
        <Link href="/admin" className="nc-back">
          <ChevronLeft size={13} strokeWidth={2.5} />
          Volver al panel
        </Link>

        <div className="nc-steps">
          <div className="nc-step">
            <div className="nc-step-num active">1</div>
            <span className="nc-step-label active">Configuración</span>
          </div>
          <div className="nc-step-line" />
          <div className="nc-step">
            <div className="nc-step-num">2</div>
            <span className="nc-step-label">Contenido</span>
          </div>
          <div className="nc-step-line" />
          <div className="nc-step">
            <div className="nc-step-num">3</div>
            <span className="nc-step-label">Publicación</span>
          </div>
        </div>

        <div className="nc-topbar-actions">
          <Link href="/admin" className="btn-secondary">
            Cancelar
          </Link>
          <button
            type="submit"
            form="nc-form"
            disabled={loading}
            className="nc-btn-primary"
          >
            {loading ? 'Creando…' : 'Crear y continuar'}
            {!loading && <ArrowRight size={14} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Page header */}
      <div className="nc-page-header">
        <div className="nc-badge">
          <BookOpen size={11} strokeWidth={2.5} />
          Nuevo curso
        </div>
        <h1 className="nc-title">Crear curso</h1>
        <p className="nc-subtitle">
          Define el título y la configuración básica. Luego podrás agregar módulos,
          lecciones, evaluaciones y asignaciones.
        </p>
      </div>

      {error && (
        <div className="nc-error">
          <AlertCircle size={14} strokeWidth={2.2} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form id="nc-form" onSubmit={handleSubmit}>
        <div className="nc-layout">

          {/* LEFT COLUMN */}
          <div className="nc-col-main">

            <div className="nc-card">
              <div className="nc-card-header">
                <div className="nc-card-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div>
                  <div className="nc-card-title">Imagen de portada</div>
                  <div className="nc-card-desc">La primera impresión del curso en el catálogo</div>
                </div>
              </div>
              <div className="nc-card-body">
                <CourseCoverUpload value={coverUrl} onChange={setCoverUrl} />
              </div>
            </div>

            <div className="nc-card">
              <div className="nc-card-header">
                <div className="nc-card-icon">
                  <FileText size={15} strokeWidth={2} />
                </div>
                <div>
                  <div className="nc-card-title">Información del curso</div>
                  <div className="nc-card-desc">Título y descripción visibles para el alumno</div>
                </div>
              </div>

              <div className="nc-card-body">
                <div className="nc-field">
                  <label className="nc-label">Título del curso *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Introducción al análisis del comportamiento"
                    className={`nc-input${!title && error ? ' nc-input-error' : ''}`}
                  />
                  {title && (
                    <div className="nc-field-check">
                      <CheckCircle2 size={12} strokeWidth={2.5} />
                      {title.length} caracteres
                    </div>
                  )}
                </div>

                <div className="nc-field" style={{ marginBottom: 0 }}>
                  <label className="nc-label">Descripción</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="¿De qué trata el curso? ¿Qué aprenderá el alumno al terminarlo?"
                    rows={5}
                    className="nc-textarea"
                  />
                  <div className="nc-hint">Esta descripción se muestra a los alumnos en el catálogo.</div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="nc-col-side">

            <div className="nc-card">
              <div className="nc-card-header">
                <div className="nc-card-icon">
                  <Settings2 size={15} strokeWidth={2} />
                </div>
                <div>
                  <div className="nc-card-title">Aprobación</div>
                  <div className="nc-card-desc">Nota mínima para certificado</div>
                </div>
              </div>

              <div className="nc-card-body">
                <div className="nc-field">
                  <label className="nc-label">Nota mínima para aprobar</label>
                  <div className="nc-score-wrapper">
                    <div className="nc-score-display" style={{ color: getScoreColor() }}>
                      {scoreClamp}%
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      step={5}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      className="nc-range"
                    />
                    <div className="nc-score-labels">
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div className="nc-hint">El alumno necesita este porcentaje para obtener el certificado.</div>
                </div>
              </div>
            </div>

            <div className="nc-card">
              <div className="nc-card-header">
                <div className="nc-card-icon">
                  {publishImmediately
                    ? <Eye size={15} strokeWidth={2} />
                    : <EyeOff size={15} strokeWidth={2} />
                  }
                </div>
                <div>
                  <div className="nc-card-title">Visibilidad</div>
                  <div className="nc-card-desc">¿Cuándo verán el curso los alumnos?</div>
                </div>
              </div>
              <div className="nc-card-body">
                <div className="nc-visibility-options">
                  <label className={`nc-vis-option${!publishImmediately ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="visibility"
                      checked={!publishImmediately}
                      onChange={() => setPublishImmediately(false)}
                      style={{ display: 'none' }}
                    />
                    <div className="nc-vis-radio" />
                    <div className="nc-vis-text">
                      <span className="nc-vis-title">Guardar como borrador</span>
                      <span className="nc-vis-desc">Solo visible para instructores</span>
                    </div>
                  </label>
                  <label className={`nc-vis-option${publishImmediately ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name="visibility"
                      checked={publishImmediately}
                      onChange={() => setPublishImmediately(true)}
                      style={{ display: 'none' }}
                    />
                    <div className="nc-vis-radio" />
                    <div className="nc-vis-text">
                      <span className="nc-vis-title">Publicar inmediatamente</span>
                      <span className="nc-vis-desc">Visible para todos los alumnos</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="nc-tip">
              <Info size={13} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Podrás editar todos estos datos en cualquier momento después de crear el curso.</span>
            </div>

          </div>
        </div>
      </form>

      <style>{`
        .nc-root {
          padding: 24px 24px 48px;
        }

        .nc-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
        }
        .nc-back {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 12px; color: var(--a-ink-3);
          text-decoration: none; white-space: nowrap;
          transition: color .15s; flex-shrink: 0;
        }
        .nc-back:hover { color: var(--a-ink); }
        .nc-topbar-actions {
          display: flex; gap: 8px; align-items: center; flex-shrink: 0;
        }

        .nc-steps {
          display: flex; align-items: center;
          padding: 8px 16px;
          background: var(--a-surface);
          border: 1px solid var(--a-border);
          border-radius: 100px;
          flex: 1; max-width: 380px; margin: 0 auto;
        }
        .nc-step { display: flex; align-items: center; gap: 6px; }
        .nc-step-num {
          width: 20px; height: 20px; border-radius: 50%;
          display: grid; place-items: center;
          font-size: 10px; font-weight: 700;
          background: var(--a-surface-2); color: var(--a-ink-3);
          border: 1px solid var(--a-border-2); flex-shrink: 0;
        }
        .nc-step-num.active { background: var(--a-side-bg); color: var(--cream); border-color: var(--a-side-bg); }
        .nc-step-label { font-size: 11px; font-weight: 500; color: var(--a-ink-3); white-space: nowrap; }
        .nc-step-label.active { color: var(--a-ink); font-weight: 700; }
        .nc-step-line { flex: 1; height: 1px; background: var(--a-border-2); margin: 0 10px; min-width: 20px; }

        .nc-page-header { margin-bottom: 20px; }
        .nc-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; background: var(--a-surface-2); color: var(--a-brand);
          border: 1px solid var(--a-border-2); border-radius: 100px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; margin-bottom: 10px;
        }
        .nc-title {
          font-family: 'Fraunces', serif; font-size: 28px; font-weight: 400;
          color: var(--a-ink); letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 6px;
        }
        .nc-subtitle { font-size: 13px; color: var(--a-ink-2); line-height: 1.55; max-width: 560px; }

        .nc-error {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 14px; margin-bottom: 16px;
          background: var(--a-warn-50); border: 1px solid var(--a-warn-200);
          border-radius: 8px; font-size: 13px; color: var(--a-warn);
        }

        .nc-layout {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 16px;
          align-items: start;
        }
        .nc-col-main { display: flex; flex-direction: column; gap: 14px; }
        .nc-col-side { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 16px; }

        .nc-card {
          background: var(--a-bg); border: 1px solid var(--a-border);
          border-radius: 12px; overflow: hidden;
        }
        .nc-card-header {
          display: flex; align-items: center; gap: 12px;
          padding: 13px 18px; border-bottom: 1px solid var(--a-border);
          background: var(--a-surface);
        }
        .nc-card-icon {
          width: 30px; height: 30px; border-radius: 7px;
          background: var(--a-bg); border: 1px solid var(--a-border-2);
          display: grid; place-items: center; color: var(--a-brand); flex-shrink: 0;
        }
        .nc-card-title { font-size: 13px; font-weight: 700; color: var(--a-ink); }
        .nc-card-desc  { font-size: 11px; color: var(--a-ink-3); margin-top: 1px; }
        .nc-card-body  { padding: 18px; display: flex; flex-direction: column; gap: 16px; }

        .nc-field { display: flex; flex-direction: column; }
        .nc-label {
          font-size: 10px; font-weight: 700; color: var(--a-ink-2);
          letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 7px;
        }
        .nc-field-check {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; color: #16a34a; margin-top: 5px;
        }
        .nc-input {
          width: 100%; height: 38px; padding: 0 12px;
          background: var(--a-bg); border: 1px solid var(--a-border-2);
          border-radius: 8px; font-size: 13px; font-family: inherit;
          color: var(--a-ink); outline: none;
          transition: border-color .15s, box-shadow .15s; box-sizing: border-box;
        }
        .nc-input::placeholder { color: var(--a-ink-4); }
        .nc-input:focus { border-color: var(--a-brand); box-shadow: 0 0 0 3px rgba(95,77,54,0.1); }
        .nc-input-error { border-color: var(--a-warn) !important; }
        .nc-textarea {
          width: 100%; padding: 10px 12px;
          background: var(--a-bg); border: 1px solid var(--a-border-2);
          border-radius: 8px; font-size: 13px; font-family: inherit;
          color: var(--a-ink); resize: vertical; min-height: 120px;
          line-height: 1.55; outline: none;
          transition: border-color .15s, box-shadow .15s; box-sizing: border-box;
        }
        .nc-textarea::placeholder { color: var(--a-ink-4); }
        .nc-textarea:focus { border-color: var(--a-brand); box-shadow: 0 0 0 3px rgba(95,77,54,0.1); }
        .nc-hint { font-size: 11px; color: var(--a-ink-3); margin-top: 5px; line-height: 1.4; }

        .nc-score-wrapper {
          display: flex; flex-direction: column; gap: 6px;
          padding: 14px 16px; background: var(--a-surface);
          border: 1px solid var(--a-border-2); border-radius: 10px;
        }
        .nc-score-display {
          font-size: 36px; font-weight: 800; letter-spacing: -0.03em; line-height: 1;
          font-family: 'Fraunces', serif; text-align: center;
          margin-bottom: 8px; transition: color .2s;
        }
        .nc-range {
          width: 100%; -webkit-appearance: none; appearance: none;
          height: 4px; border-radius: 2px; background: var(--a-border-2);
          outline: none; cursor: pointer; margin-bottom: 2px;
        }
        .nc-range::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: var(--a-side-bg); border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: pointer; transition: transform .1s;
        }
        .nc-range::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .nc-score-labels {
          display: flex; justify-content: space-between;
          font-size: 10px; color: var(--a-ink-3); margin-top: 2px;
        }

        .nc-visibility-options { display: flex; flex-direction: column; gap: 8px; }
        .nc-vis-option {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 13px; border: 1.5px solid var(--a-border-2);
          border-radius: 9px; cursor: pointer;
          transition: border-color .15s, background .15s;
        }
        .nc-vis-option:hover { border-color: var(--a-brand); background: var(--a-surface); }
        .nc-vis-option.selected { border-color: var(--a-brand); background: var(--a-surface); }
        .nc-vis-radio {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid var(--a-border-2); flex-shrink: 0;
          transition: border-color .15s; position: relative;
        }
        .nc-vis-option.selected .nc-vis-radio {
          border-color: var(--a-brand); background: var(--a-brand);
          box-shadow: inset 0 0 0 3px var(--a-bg);
        }
        .nc-vis-text { display: flex; flex-direction: column; gap: 2px; }
        .nc-vis-title { font-size: 12px; font-weight: 700; color: var(--a-ink); }
        .nc-vis-desc  { font-size: 11px; color: var(--a-ink-3); }

        .nc-tip {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 11px 14px; background: var(--a-surface);
          border: 1px solid var(--a-border); border-radius: 10px;
          font-size: 12px; color: var(--a-ink-3); line-height: 1.4;
        }

        .nc-btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          height: 34px; padding: 0 16px;
          background: var(--a-side-bg); color: var(--cream);
          border: none; border-radius: 8px;
          font-family: inherit; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: background .15s, transform .1s; white-space: nowrap;
        }
        .nc-btn-primary:hover:not(:disabled) { background: #3A2D20; }
        .nc-btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .nc-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 900px) {
          .nc-layout { grid-template-columns: 1fr; }
          .nc-col-side { position: static; }
        }
        @media (max-width: 640px) {
          .nc-root { padding: 16px 16px 40px; }
          .nc-topbar { flex-wrap: wrap; }
          .nc-steps { display: none; }
          .nc-topbar-actions { width: 100%; justify-content: flex-end; order: 3; }
        }
      `}</style>
    </div>
  )
}
