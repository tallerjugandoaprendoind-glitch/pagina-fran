'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function LibroReclamacionesPage() {
  const [form, setForm] = useState({
    tipo: 'reclamo',
    nombre: '',
    dni: '',
    email: '',
    telefono: '',
    direccion: '',
    bien: 'producto',
    descripcionBien: '',
    monto: '',
    descripcion: '',
    pedido: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [numero, setNumero] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simular envío + generar número de correlativo
    await new Promise(r => setTimeout(r, 1200))
    const num = `LR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`
    setNumero(num)
    setSubmitted(true)
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.9rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#111827',
    background: '#fff',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.35rem',
  }

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FDFAF6', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-.02em' }}>
              <span style={{ color: '#5F4D36' }}>capy</span>
              <span style={{ color: '#E8959A' }}>ABA</span>
            </span>
          </Link>
          <Link href="/" style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}>
            ← Volver al inicio
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ background: '#DC2626', color: '#fff', padding: '0.4rem 0.9rem', borderRadius: '6px', fontSize: '13px', fontWeight: 700, letterSpacing: '.04em' }}>
              LIBRO DE RECLAMACIONES
            </div>
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#111827', marginBottom: '0.4rem', letterSpacing: '-.02em' }}>
            Libro de Reclamaciones Virtual
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
            Conforme al Código de Protección y Defensa del Consumidor – Ley N° 29571.
            Ingresa tu queja o reclamo y te responderemos en un máximo de <strong>15 días hábiles</strong>.
          </p>
        </div>

        {/* Info box */}
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '2rem', fontSize: '13.5px', color: '#78350F', lineHeight: '1.6' }}>
          ⚠️ <strong>Recuerda:</strong> La formulación de una queja o reclamo no impide acudir a otras instancias de resolución de disputas ni es requisito previo para interponer una denuncia ante el INDECOPI.
        </div>

        {submitted ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
              {form.tipo === 'queja' ? 'Queja' : 'Reclamo'} registrado correctamente
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '1.5rem' }}>
              Tu número de correlativo es:
            </p>
            <div style={{ background: '#F4ECDF', padding: '1rem 2rem', borderRadius: '10px', display: 'inline-block', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#5F4D36', letterSpacing: '.05em' }}>{numero}</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.7' }}>
              Hemos recibido tu {form.tipo} y te responderemos al correo <strong>{form.email}</strong><br />
              en un plazo máximo de <strong>15 días hábiles</strong> desde hoy.
            </p>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setSubmitted(false); setForm({ tipo:'reclamo', nombre:'', dni:'', email:'', telefono:'', direccion:'', bien:'producto', descripcionBien:'', monto:'', descripcion:'', pedido:'' }) }}
                style={{ background: '#5F4D36', color: '#fff', padding: '0.65rem 1.5rem', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Nuevo registro
              </button>
              <Link href="/" style={{ background: '#f3f4f6', color: '#374151', padding: '0.65rem 1.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                Volver al inicio
              </Link>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>

            {/* Tipo */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Tipo de registro
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {(['reclamo', 'queja'] as const).map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', flex: 1, padding: '0.9rem 1rem', border: `2px solid ${form.tipo === t ? '#5F4D36' : '#e5e7eb'}`, borderRadius: '10px', background: form.tipo === t ? '#FDF6EE' : '#fff', transition: 'all .15s' }}>
                    <input type="radio" name="tipo" value={t} checked={form.tipo === t} onChange={handleChange} style={{ marginTop: '2px', accentColor: '#5F4D36' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', textTransform: 'capitalize' }}>{t}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>
                        {t === 'reclamo' ? 'Disconformidad con un producto o servicio adquirido.' : 'Malestar o desacuerdo sin afectación económica directa.'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Datos del consumidor */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                1. Datos del consumidor
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Nombre completo *</label>
                  <input name="nombre" required value={form.nombre} onChange={handleChange} placeholder="Juan Pérez García" style={inputStyle} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>DNI / CE *</label>
                  <input name="dni" required value={form.dni} onChange={handleChange} placeholder="12345678" style={inputStyle} maxLength={12} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Correo electrónico *</label>
                  <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com" style={inputStyle} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Teléfono</label>
                  <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="+51 999 999 999" style={inputStyle} />
                </div>
                <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Dirección</label>
                  <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Av. Ejemplo 123, Lima" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Identificación del bien */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                2. Identificación del bien contratado
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Tipo de bien *</label>
                  <select name="bien" value={form.bien} onChange={handleChange} style={inputStyle}>
                    <option value="producto">Producto</option>
                    <option value="servicio">Servicio</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Monto reclamado (S/)</label>
                  <input name="monto" type="number" min="0" step="0.01" value={form.monto} onChange={handleChange} placeholder="0.00" style={inputStyle} />
                </div>
                <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Descripción del bien o servicio *</label>
                  <input name="descripcionBien" required value={form.descripcionBien} onChange={handleChange} placeholder="Ej: Curso IBT Nivel 1, Supervisión profesional, etc." style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Detalle del reclamo */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                3. Detalle del {form.tipo}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Descripción del {form.tipo} *</label>
                  <textarea name="descripcion" required value={form.descripcion} onChange={handleChange}
                    rows={5} placeholder={`Describe detalladamente tu ${form.tipo}...`}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Pedido o solución esperada *</label>
                  <textarea name="pedido" required value={form.pedido} onChange={handleChange}
                    rows={3} placeholder="¿Qué solución esperas de CapyABA?"
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div style={{ padding: '1.25rem 1.75rem', background: '#fafafa' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '1rem', lineHeight: '1.6' }}>
                Al enviar este formulario, CapyABA se compromete a dar respuesta a tu {form.tipo} en un máximo de <strong>15 días hábiles</strong>. La información proporcionada será tratada de manera confidencial conforme a la Ley N° 29733.
              </p>
              <button type="submit" disabled={loading} style={{
                background: loading ? '#9ca3af' : '#5F4D36',
                color: '#fff',
                padding: '0.8rem 2rem',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background .15s',
                width: '100%',
              }}>
                {loading ? 'Enviando...' : `Registrar ${form.tipo}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
