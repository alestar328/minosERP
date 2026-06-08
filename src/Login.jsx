import { useState } from 'react'
import { Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from './supabaseClient.js'

const C = {
  bg: '#F5F6F7', card: '#FFFFFF', shell: '#354A5E',
  primary: '#0070F2', text: '#32363A', muted: '#6A6D70',
  border: '#E5E5E5', danger: '#BB0000', success: '#188F3A',
}

function Field({ icon: Icon, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
      <input {...props}
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px 11px 36px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, background: C.bg, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }} />
    </div>
  )
}

export default function Login() {
  const [modo, setModo]       = useState('login')   // 'login' | 'signup'
  const [nombre, setNombre]   = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [info, setInfo]       = useState(null)

  const submit = async e => {
    e.preventDefault()
    setError(null); setInfo(null); setLoading(true)
    try {
      if (modo === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { nombre } },
        })
        if (error) throw error
        // Si "Confirm email" está activo, no hay sesión hasta confirmar.
        const { data } = await supabase.auth.getSession()
        if (!data.session) setInfo('Cuenta creada. Revisa tu correo para confirmarla, o desactiva «Confirm email» en Supabase para entrar directo.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // onAuthStateChange en App reacciona al login y muestra la app.
      }
    } catch (err) {
      setError(err.message || 'No se pudo completar la operación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 20, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380, background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.10)', overflow: 'hidden' }}>
        {/* Brand */}
        <div style={{ background: C.shell, padding: '22px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: '-0.3px' }}>
            Minos<span style={{ color: '#7EC8FF' }}> ERP</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Outsourcing Estratégico</div>
        </div>

        <form onSubmit={submit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>
            {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </div>

          {modo === 'signup' && (
            <Field icon={User} type="text" placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" />
          )}
          <Field icon={Mail} type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <Field icon={Lock} type="password" placeholder="Contraseña" value={password} onChange={e => setPass(e.target.value)} required minLength={6} autoComplete={modo === 'login' ? 'current-password' : 'new-password'} />

          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 11px', borderRadius: 8, background: `${C.danger}12`, border: `1px solid ${C.danger}33` }}>
              <AlertCircle size={14} style={{ color: C.danger, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: C.text }}>{error}</span>
            </div>
          )}
          {info && (
            <div style={{ padding: '9px 11px', borderRadius: 8, background: `${C.success}12`, border: `1px solid ${C.success}33`, fontSize: 12, color: C.text }}>{info}</div>
          )}

          <button type="submit" disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', background: C.primary, border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {modo === 'login' ? 'Entrar' : 'Registrarme'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 4 }}>
            {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button type="button" onClick={() => { setModo(modo === 'login' ? 'signup' : 'login'); setError(null); setInfo(null) }}
              style={{ background: 'none', border: 'none', color: C.primary, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12 }}>
              {modo === 'login' ? 'Crear una' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
