'use client'

export default function CapyVideo() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-card-hover border-4 border-white bg-mocha-100"
      style={{ width: '100%', maxWidth: '420px' }}
    >
      <video
        src="/capy-login.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-auto block"
        aria-label="Capybara con gorro de graduación"
      />
    </div>
  )
}
