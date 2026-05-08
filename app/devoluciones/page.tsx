import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Cambios y Devoluciones | CapyABA',
  description: 'Política de cambios y devoluciones de la plataforma CapyABA.',
}

export default function DevolucionesPage() {
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

      {/* Content */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem', letterSpacing: '-.02em' }}>
            Política de Cambios y Devoluciones
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Última actualización: mayo de 2025 · Plataforma operada por <strong>CapyABA</strong>
          </p>
        </div>

        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '2rem', fontSize: '14px', color: '#92400E', lineHeight: '1.6' }}>
          📋 En CapyABA nos comprometemos a ofrecer servicios de alta calidad. Lee con atención nuestra política antes de realizar tu compra.
        </div>

        <Section title="1. Acceso a cursos">
          El acceso a los cursos es habilitado de forma manual por el equipo de CapyABA una vez
          confirmado el pago. Cada curso es de uso personal e intransferible. Al adquirir un curso,
          el estudiante acepta los Términos y Condiciones de la plataforma.
        </Section>

        <Section title="2. Política de devoluciones">
          En CapyABA entendemos que pueden surgir imprevistos. Por eso ofrecemos la siguiente política:
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <li>
              <strong>Devolución completa:</strong> Si el estudiante no ha iniciado el curso (sin
              lecciones vistas), puede solicitar la devolución dentro de los <strong>7 días calendario</strong> posteriores
              a la habilitación del acceso.
            </li>
            <li>
              <strong>Devolución parcial:</strong> Si el estudiante ha visto menos del 20% del
              contenido del curso, puede solicitar un reembolso del <strong>50%</strong> del valor
              pagado dentro de los 7 días calendario.
            </li>
            <li>
              <strong>Sin devolución:</strong> No se realizan reembolsos si el estudiante ha
              completado más del 20% del contenido, o si han transcurrido más de 7 días calendario
              desde la habilitación del acceso.
            </li>
          </ul>
        </Section>

        <Section title="3. Proceso para solicitar una devolución">
          Para solicitar una devolución, el estudiante debe:
          <ol style={{ paddingLeft: '1.2rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <li>Enviar un correo a <a href="mailto:capyaba@gmail.com" style={{ color: '#5F4D36', fontWeight: 600 }}>capyaba@gmail.com</a> con el asunto: <em>"Solicitud de devolución – [nombre del curso]"</em>.</li>
            <li>Indicar su nombre completo, correo de la cuenta y el motivo de la solicitud.</li>
            <li>Adjuntar el comprobante de pago correspondiente.</li>
          </ol>
          <p style={{ marginTop: '0.75rem' }}>
            El equipo de CapyABA revisará la solicitud y responderá dentro de los <strong>5 días hábiles</strong>. De proceder, el reembolso se realizará por el mismo medio de pago utilizado en un plazo máximo de <strong>10 días hábiles</strong>.
          </p>
        </Section>

        <Section title="4. Cambios de curso">
          Si el estudiante desea cambiar su inscripción a otro curso de igual o mayor valor, puede
          solicitarlo dentro de los primeros 7 días calendario y siempre que no haya superado el
          20% de avance en el curso original. El cambio está sujeto a disponibilidad y aprobación
          del equipo de CapyABA.
        </Section>

        <Section title="5. Cancelación de supervisiones">
          Las sesiones de supervisión pueden ser canceladas o reprogramadas con un mínimo de
          <strong> 24 horas de anticipación</strong> sin costo adicional. Las cancelaciones con
          menos de 24 horas de aviso o la inasistencia sin previo aviso no son reembolsables.
        </Section>

        <Section title="6. Productos o servicios con error">
          Si el estudiante encuentra un problema técnico que impide el acceso correcto al contenido
          adquirido, debe reportarlo a <a href="mailto:capyaba@gmail.com" style={{ color: '#5F4D36' }}>capyaba@gmail.com</a> dentro
          de las primeras 48 horas de detección. CapyABA se compromete a resolver el inconveniente
          o, de no ser posible, ofrecer una devolución completa.
        </Section>

        <Section title="7. Contacto">
          Para consultas sobre esta política, puedes comunicarte con nosotros a través de:
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>📧 <a href="mailto:capyaba@gmail.com" style={{ color: '#5F4D36', fontWeight: 600 }}>capyaba@gmail.com</a></li>
            <li>💬 <a href="https://wa.me/51940428169" style={{ color: '#5F4D36', fontWeight: 600 }}>WhatsApp: +51 940 428 169</a></li>
          </ul>
        </Section>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          <Link href="/" style={{
            display: 'inline-block',
            background: '#5F4D36',
            color: '#fff',
            padding: '0.75rem 2rem',
            borderRadius: '999px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
          }}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{
        fontSize: '1.05rem',
        fontWeight: 700,
        color: '#1f2937',
        marginBottom: '0.6rem',
        paddingBottom: '0.4rem',
        borderBottom: '2px solid #F5E6D3',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.75' }}>
        {children}
      </div>
    </div>
  )
}
