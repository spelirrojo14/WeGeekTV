import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setMessage('')

    if (isRegistering) {
      // REGISTRO
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: username,
          },
        },
      })

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      setMessage(
        'Cuenta creada correctamente. ¡Ya puedes entrar a WeGeekTV!'
      )
    } else {
      // INICIO DE SESIÓN
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage('Correo o contraseña incorrectos.')
      } else {
        setMessage('¡Has iniciado sesión correctamente!')
      }
    }

    setLoading(false)
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 90px)',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '70px 24px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 15% 20%, rgba(255, 79, 216, 0.20), transparent 32%), radial-gradient(circle at 85% 25%, rgba(255, 196, 70, 0.18), transparent 30%), radial-gradient(circle at 70% 90%, rgba(112, 91, 255, 0.20), transparent 35%), linear-gradient(135deg, #070817 0%, #0b0d22 45%, #10102a 100%)',
        color: '#fff',
      }}
    >
      {/* Decoración de fondo */}
      <div
        style={{
          position: 'absolute',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255, 79, 216, 0.16) 0%, rgba(255, 79, 216, 0) 70%)',
          top: '-180px',
          left: '-120px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255, 196, 70, 0.13) 0%, rgba(255, 196, 70, 0) 70%)',
          bottom: '-260px',
          right: '-170px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: '2px',
          height: '160px',
          background:
            'linear-gradient(to bottom, transparent, rgba(255, 79, 216, 0.5), transparent)',
          left: '12%',
          top: '18%',
          transform: 'rotate(35deg)',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: '2px',
          height: '220px',
          background:
            'linear-gradient(to bottom, transparent, rgba(255, 196, 70, 0.5), transparent)',
          right: '14%',
          bottom: '16%',
          transform: 'rotate(-35deg)',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* Contenedor principal */}
      <div
        style={{
          width: '100%',
          maxWidth: '1050px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: '600px',
          borderRadius: '30px',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2,
          background: 'rgba(15, 17, 40, 0.72)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          boxShadow:
            '0 35px 100px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* PANEL IZQUIERDO */}
        <div
          style={{
            position: 'relative',
            padding: '65px 55px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background:
              'linear-gradient(145deg, rgba(255, 79, 216, 0.12), rgba(255, 196, 70, 0.07) 45%, rgba(93, 75, 255, 0.12))',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Glow */}
          <div
            style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255, 79, 216, 0.18), transparent 70%)',
              top: '-120px',
              right: '-100px',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Logo */}
            <div
              style={{
                fontSize: '34px',
                fontWeight: 900,
                letterSpacing: '-1.8px',
                marginBottom: '70px',
                background:
                  'linear-gradient(90deg, #ff4fd8 0%, #ffb84d 55%, #ffd76a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                width: 'fit-content',
              }}
            >
              WeGeekTV
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 14px',
                borderRadius: '999px',
                background: 'rgba(255, 79, 216, 0.10)',
                border: '1px solid rgba(255, 79, 216, 0.20)',
                color: '#ff9ae8',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '22px',
              }}
            >
              Tu mundo audiovisual
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(38px, 4vw, 58px)',
                lineHeight: 1.02,
                fontWeight: 900,
                letterSpacing: '-2.8px',
                maxWidth: '430px',
              }}
            >
              {isRegistering ? (
                <>
                  Empieza tu
                  <span
                    style={{
                      display: 'block',
                      background:
                        'linear-gradient(90deg, #ff4fd8, #ffb84d)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    colección.
                  </span>
                </>
              ) : (
                <>
                  Vuelve a tu
                  <span
                    style={{
                      display: 'block',
                      background:
                        'linear-gradient(90deg, #ff4fd8, #ffb84d)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    universo.
                  </span>
                </>
              )}
            </h1>

            <p
              style={{
                margin: '26px 0 0',
                maxWidth: '390px',
                color: 'rgba(255, 255, 255, 0.60)',
                fontSize: '15px',
                lineHeight: 1.75,
              }}
            >
              Guarda tus películas y series favoritas, descubre nuevas
              historias y comparte tu pasión con tu gente.
            </p>
          </div>

          {/* Mini estadísticas decorativas */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            {['PELÍCULAS', 'SERIES', 'AMIGOS'].map((item) => (
              <div
                key={item}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.045)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  color: 'rgba(255, 255, 255, 0.48)',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '1.4px',
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div
          style={{
            padding: '65px 55px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'rgba(7, 8, 23, 0.32)',
          }}
        >
          <div
            style={{
              marginBottom: '34px',
            }}
          >
            <div
              style={{
                color: '#ffb3ec',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '2.2px',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              {isRegistering ? 'NUEVO USUARIO' : 'BIENVENIDO DE NUEVO'}
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: '34px',
                fontWeight: 850,
                letterSpacing: '-1.5px',
              }}
            >
              {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>

            <p
              style={{
                margin: '10px 0 0',
                color: 'rgba(255, 255, 255, 0.45)',
                fontSize: '14px',
              }}
            >
              {isRegistering
                ? 'Crea tu perfil y empieza a descubrir WeGeekTV.'
                : 'Continúa donde lo dejaste.'}
            </p>
          </div>

          <form onSubmit={handleAuth}>
            {/* Usuario */}
            {isRegistering && (
              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: 'rgba(255, 255, 255, 0.70)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  Nombre de usuario
                </label>

                <input
                  type="text"
                  placeholder="¿Cómo te llamamos?"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '54px',
                    padding: '0 17px',
                    boxSizing: 'border-box',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    outline: 'none',
                    background: 'rgba(255, 255, 255, 0.055)',
                    color: '#fff',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border =
                      '1px solid rgba(255, 79, 216, 0.55)'
                    e.currentTarget.style.boxShadow =
                      '0 0 0 4px rgba(255, 79, 216, 0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border =
                      '1px solid rgba(255, 255, 255, 0.09)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'rgba(255, 255, 255, 0.70)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Correo electrónico
              </label>

              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '54px',
                  padding: '0 17px',
                  boxSizing: 'border-box',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  outline: 'none',
                  background: 'rgba(255, 255, 255, 0.055)',
                  color: '#fff',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border =
                    '1px solid rgba(255, 196, 70, 0.60)'
                  e.currentTarget.style.boxShadow =
                    '0 0 0 4px rgba(255, 196, 70, 0.08)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border =
                    '1px solid rgba(255, 255, 255, 0.09)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'rgba(255, 255, 255, 0.70)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Contraseña
              </label>

              <input
                type="password"
                placeholder="Introduce tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  height: '54px',
                  padding: '0 17px',
                  boxSizing: 'border-box',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  outline: 'none',
                  background: 'rgba(255, 255, 255, 0.055)',
                  color: '#fff',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border =
                    '1px solid rgba(255, 79, 216, 0.55)'
                  e.currentTarget.style.boxShadow =
                    '0 0 0 4px rgba(255, 79, 216, 0.08)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border =
                    '1px solid rgba(255, 255, 255, 0.09)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />

              {isRegistering && (
                <div
                  style={{
                    marginTop: '9px',
                    color: 'rgba(255, 255, 255, 0.32)',
                    fontSize: '11px',
                  }}
                >
                  Mínimo 6 caracteres
                </div>
              )}
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '56px',
                border: 'none',
                borderRadius: '15px',
                cursor: loading ? 'wait' : 'pointer',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 850,
                letterSpacing: '0.2px',
                background:
                  'linear-gradient(100deg, #ff4fd8 0%, #ff7ecf 42%, #ffbd55 100%)',
                boxShadow:
                  '0 12px 30px rgba(255, 79, 216, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
                opacity: loading ? 0.65 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow =
                    '0 16px 38px rgba(255, 79, 216, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow =
                  '0 12px 30px rgba(255, 79, 216, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.22)'
              }}
            >
              {loading
                ? 'Cargando...'
                : isRegistering
                  ? 'Crear mi cuenta'
                  : 'Entrar en WeGeekTV'}
            </button>
          </form>

          {/* Mensaje */}
          {message && (
            <div
              style={{
                marginTop: '18px',
                padding: '13px 15px',
                borderRadius: '12px',
                background: message.includes('correctamente')
                  ? 'rgba(73, 220, 157, 0.09)'
                  : 'rgba(255, 90, 130, 0.09)',
                border: message.includes('correctamente')
                  ? '1px solid rgba(73, 220, 157, 0.18)'
                  : '1px solid rgba(255, 90, 130, 0.18)',
                color: message.includes('correctamente')
                  ? '#83e8bb'
                  : '#ff9caf',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          )}

          {/* Cambiar entre login / registro */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '22px',
              borderTop: '1px solid rgba(255, 255, 255, 0.07)',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.40)',
              fontSize: '13px',
            }}
          >
            {isRegistering
              ? '¿Ya tienes una cuenta?'
              : '¿Todavía no formas parte de WeGeekTV?'}

            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setMessage('')
              }}
              style={{
                marginLeft: '7px',
                padding: 0,
                background: 'none',
                border: 'none',
                color: '#ff8dde',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 800,
              }}
            >
              {isRegistering
                ? 'Inicia sesión'
                : 'Crea tu cuenta'}
            </button>
          </div>
        </div>
      </div>

      {/* Texto inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.20)',
          fontSize: '10px',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        Tu colección · Tus estadísticas · Tu mundo
      </div>
    </div>
  )
}