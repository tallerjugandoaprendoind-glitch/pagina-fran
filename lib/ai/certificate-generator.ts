import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

type CertificateInput = {
  studentName: string
  courseTitle: string
  finalScore: number
  completedAt: Date
}

export async function generateCertificateText(input: CertificateInput): Promise<string> {
  const prompt = `Eres un redactor de certificados académicos. Genera un texto formal y elegante (máximo 3 oraciones, en español) para un certificado de finalización de curso.

Datos:
- Alumno: ${input.studentName}
- Curso: ${input.courseTitle}
- Calificación final: ${input.finalScore}%
- Fecha: ${input.completedAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}

El texto debe:
- Comenzar con "Se certifica que..."
- Mencionar nombre del alumno y curso
- Incluir la calificación final
- Cerrar con la fecha
- Profesional pero cálido
- SOLO el texto del certificado, sin comillas ni formato

Responde únicamente con el texto.`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 300,
  })

  return completion.choices[0]?.message?.content?.trim() || ''
}
