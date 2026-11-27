import { useEffect, useState, useRef } from 'react'
import * as L from './lib/starlight'
import logo from './assets/favicon.png'

const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN')
const MODES = ['CASH', 'GPAY', 'CARD', 'ONLINE']

// Wrapped toast implementation that emits an event for UI rendering while preserving signature
const toast = e => {
  const msg = e?.message || (typeof e === 'string' ? e : JSON.stringify(e))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('starlight-toast', { detail: { message: msg, type: 'error' } }))
  } else {
    alert(msg)
  }
}

// ---------------------------------------------------------------------
// INLINE SVG ICONS (Crisp, zero-dependency, luxury hospitality aesthetic)
// ---------------------------------------------------------------------
const IconBed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
  </svg>
)

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const IconCreditCard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
)

const IconPrinter = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
)

const IconLogOut = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const IconPlusCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
)

const IconFileText = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const IconStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const IconAlertCircle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// ---------------------------------------------------------------------
// TOAST NOTIFICATION CONTAINER
// ---------------------------------------------------------------------
function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    const handler = e => {
      const id = Date.now() + Math.random()
      setToasts(prev => [...prev, { id, ...e.detail }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
    }
    window.addEventListener('starlight-toast', handler)
    return () => window.removeEventListener('starlight-toast', handler)
  }, [])
  if (!toasts.length) return null
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast-item ${t.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconAlertCircle />
            <span>{t.message}</span>
          </div>
          <button
            className="btn-ghost"
            style={{ minHeight: 'auto', padding: '2px 6px', border: 'none', background: 'transparent' }}
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------
// TOP BAR WITH LIVE IST CLOCK
// ---------------------------------------------------------------------
function TopBar({ title, subtitle }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const istDateStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(now)

  const istTimeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(now)

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <h2 className="page-title">{title}</h2>
        {subtitle && <span className="page-subtitle">— {subtitle}</span>}
      </div>
      <div className="top-bar-right">
        <div className="live-pill">
          <IconCalendar />
          <span>{istDateStr}</span>
        </div>
        <div className="live-pill">
          <span className="live-indicator-dot" />
          <IconClock />
          <span className="tabular-nums" style={{ fontWeight: 600 }}>{istTimeStr} IST</span>
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------
// PAYMENT COMPONENT (Pay)
// ---------------------------------------------------------------------
function Pay({ total, pay, setPay }) {
  const r = L.computePayment({ mode: pay.mode, total, paid: pay.paid, split: pay.split })
  const touched = pay.mode || pay.paid || Object.values(pay.split).some(Boolean)
  const modesList = ['GPAY', 'CARD', 'CASH', 'ONLINE', 'MULTIPLE']

  return (
    <div className="card pay-component">
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginBottom: 6 }}>Payment Mode</label>
        <div className="mode-chips" role="radiogroup" aria-label="Payment Mode">
          {modesList.map(m => (
            <button
              type="button"
              key={m}
              className={`mode-chip ${pay.mode === m ? 'active' : ''}`}
              onClick={() => setPay({ ...pay, mode: m })}
            >
              {m === 'MULTIPLE' ? <IconCreditCard /> : null}
              {m}
            </button>
          ))}
        </div>
        {/* Native select kept for full programmatic compatibility & keyboard accessibility */}
        <select
          value={pay.mode}
          onChange={e => setPay({ ...pay, mode: e.target.value })}
          style={{ marginTop: 8, display: 'none' }}
        >
          <option value="">Select Payment Mode</option>
          {modesList.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      <div className="grid">
        {pay.mode === 'MULTIPLE' ? (
          MODES.map(m => (
            <label key={m}>
              <span>{m} Amount</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={pay.split[m] || ''}
                onChange={e => setPay({ ...pay, split: { ...pay.split, [m]: e.target.value } })}
              />
            </label>
          ))
        ) : (
          <label>
            <span>Amount Paid</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={pay.paid}
              onChange={e => setPay({ ...pay, paid: e.target.value })}
            />
          </label>
        )}
      </div>

      <div className="pay-summary-strip">
        <div className="pay-balance-label">
          Outstanding Balance:
          <span className={`pay-balance-amount num ${r.balance > 0 ? 'status-due due' : 'status-paid ok'}`} style={{ marginLeft: 8 }}>
            {inr(r.error ? total : r.balance)}
          </span>
        </div>
        {touched && r.error && (
          <span className="err" role="alert">
            <IconAlertCircle /> {r.error}
          </span>
        )}
      </div>
    </div>
  )
}
const blankPay = { mode: '', paid: '', split: {} }

// ---------------------------------------------------------------------
// LOGIN SCREEN (Split Screen Luxury Hero + Clean Form)
// ---------------------------------------------------------------------
function Login() {
  const [f, setF] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setBusy(true)
    const { error } = await L.supabase.auth.signInWithPassword(f)
    if (error) toast(error)
    setBusy(false)
  }

  return (
    <div className="login-split">
      <div className="login-hero">
        <div className="login-hero-header">
          <img src={logo} alt="Starlight" className="brand-logo" style={{ height: 44, width: 'auto' }} />
          <div>
            <h3 style={{ margin: 0, color: '#ffffff', letterSpacing: '0.05em' }}>STARLIGHT HOTELS</h3>
            <span style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--gold-300)', textTransform: 'uppercase', fontWeight: 600 }}>
              Hospitality Collection
            </span>
          </div>
        </div>

        <div className="login-hero-body">
          <h1 className="font-serif">Exquisite Hospitality, Seamless Management</h1>
          <p>
            Welcome to the front-desk operations suite for Starlight Hotels. Manage guest arrivals,
            room allocations, billing settlements, and official GRC generation with elegance and speed.
          </p>
          <div className="login-property-chips">
            <span className="property-chip">Mylapore, Chennai</span>
            <span className="property-chip">Kodaikanal</span>
          </div>
        </div>

        <div className="login-hero-footer">
          © {new Date().getFullYear()} Starlight Hotels & Resorts. Front Desk Operations Portal.
        </div>
      </div>

      <div className="login-form-pane">
        <div className="login-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src={logo} alt="Starlight" style={{ height: 70, display: 'block', margin: '0 auto 10px' }} />
            <h2 className="font-serif">Front Desk Sign In</h2>
            <div className="login-card-sub">Please enter your staff credentials to continue</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              <span>Email Address</span>
              <input
                type="email"
                placeholder="reception@starlighthotels.com"
                value={f.email}
                onChange={e => setF({ ...f, email: e.target.value })}
              />
            </label>

            <label>
              <span>Password</span>
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={f.password}
                  onChange={e => setF({ ...f, password: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && go()}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </label>

            <button
              className="btn-primary"
              style={{ marginTop: 8, height: 42 }}
              disabled={busy || !f.email || !f.password}
              onClick={go}
            >
              {busy ? 'Authenticating...' : 'Sign In to Front Desk'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// CHECK-IN SCREEN (Stepped Sections + Sticky Live Summary Card)
// ---------------------------------------------------------------------
function CheckIn({ hotelId, onDone }) {
  const [rooms, setRooms] = useState([])
  const [sources, setSources] = useState([])
  const [active, setActive] = useState([])
  const [f, setF] = useState({
    guest_name: '',
    mobile: '',
    address: '',
    id_proof_type: 'Aadhaar Card',
    id_proof_number: '',
    purpose_of_visit: '',
    booking_source: 'Walk-in',
    booking_id: '',
    number_of_guests: 1,
    stay_type: 'NIGHTLY',
    nights: 1,
    hours: 3,
    total: '',
    receptionist_name: localStorage.getItem('rname') || ''
  })
  const [sel, setSel] = useState([])
  const [pay, setPay] = useState(blankPay)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    L.getRooms(hotelId).then(setRooms).catch(toast)
    L.getSources().then(setSources).catch(toast)
    L.getActiveStays(hotelId).then(setActive).catch(toast)
  }, [hotelId])

  const set = k => e => setF({ ...f, [k]: e.target.value })
  const co = f.stay_type === 'HOURLY' ? L.hourlyCheckout(new Date(), +f.hours) : L.defaultCheckout(new Date(), +f.nights)

  const roomTypeOrder = ['1 BHK', 'DELUXE ROOM', '2 BHK', '3 BHK', '5 BHK']
  const groupedRooms = rooms.reduce((acc, r) => {
    const type = r.room_type || 'Other'
    if (!acc[type]) acc[type] = []
    acc[type].push(r)
    return acc
  }, {})

  Object.keys(groupedRooms).forEach(type => {
    groupedRooms[type].sort((a, b) =>
      String(a.room_number || '').localeCompare(String(b.room_number || ''), undefined, { numeric: true })
    )
  })

  const sortedTypes = Object.keys(groupedRooms).sort((a, b) => {
    const aNorm = a.trim().toUpperCase()
    const bNorm = b.trim().toUpperCase()
    const idxA = roomTypeOrder.findIndex(t => t.toUpperCase() === aNorm)
    const idxB = roomTypeOrder.findIndex(t => t.toUpperCase() === bNorm)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })

  const submit = async () => {
    if (!f.receptionist_name.trim()) return toast('Enter receptionist name')
    localStorage.setItem('rname', f.receptionist_name.trim())
    const r = L.computePayment({ mode: pay.mode, total: f.total, paid: pay.paid, split: pay.split })
    if (r.error) return toast(r.error)
    setBusy(true)
    try {
      const { stay_id } = await L.createStay({
        ...f,
        hotel_id: hotelId,
        room_numbers: sel,
        total_amount: +f.total || 0,
        payments: r.payments
      })
      await L.printGRC(stay_id)
      onDone()
    } catch (e) {
      toast(e)
    }
    setBusy(false)
  }

  const pRes = L.computePayment({ mode: pay.mode, total: +f.total || 0, paid: pay.paid, split: pay.split })

  return (
    <div className="page-container">
      <div className="checkin-layout">
        {/* Left Column: Form Steps */}
        <div className="checkin-main-flow">
          {/* Step 1: Guest Details */}
          <div className="checkin-step-card">
            <div className="checkin-step-header">
              <span className="step-number">1</span>
              <h3 className="step-title">Guest Information</h3>
            </div>
            <div className="grid grid-cols-2">
              <label>
                <span>Guest Full Name *</span>
                <input placeholder="e.g. Anandha Krishnan" value={f.guest_name} onChange={set('guest_name')} />
              </label>
              <label>
                <span>Mobile Number *</span>
                <input placeholder="10-digit mobile number" value={f.mobile} onChange={set('mobile')} />
              </label>
            </div>
            <div style={{ marginTop: 14 }}>
              <label>
                <span>Residential Address</span>
                <input placeholder="Street, City, State, PIN" value={f.address} onChange={set('address')} />
              </label>
            </div>
            <div style={{ marginTop: 14 }}>
              <label>
                <span>Purpose of Visit</span>
                <input placeholder="Business / Vacation / Pilgrimage / Family" value={f.purpose_of_visit} onChange={set('purpose_of_visit')} />
              </label>
            </div>
          </div>

          {/* Step 2: ID Verification */}
          <div className="checkin-step-card">
            <div className="checkin-step-header">
              <span className="step-number">2</span>
              <h3 className="step-title">Identity Verification</h3>
            </div>
            <div className="grid grid-cols-2">
              <label>
                <span>ID Proof Document</span>
                <select value={f.id_proof_type} onChange={set('id_proof_type')}>
                  {['Aadhaar Card', 'Driving Licence', 'Passport', 'Voter ID', 'Other'].map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Document ID Number</span>
                <input placeholder="e.g. 5482 1928 3491" value={f.id_proof_number} onChange={set('id_proof_number')} />
              </label>
            </div>
          </div>

          {/* Step 3: Booking & Source Details */}
          <div className="checkin-step-card">
            <div className="checkin-step-header">
              <span className="step-number">3</span>
              <h3 className="step-title">Booking Details</h3>
            </div>
            <div className="grid grid-cols-3">
              <label>
                <span>Booking Source</span>
                <select value={f.booking_source} onChange={set('booking_source')}>
                  {sources.map(s => <option key={s.name}>{s.name}</option>)}
                </select>
              </label>
              <label>
                <span>Booking Reference ID</span>
                <input placeholder="e.g. MMT-98213 / Walk-in" value={f.booking_id} onChange={set('booking_id')} />
              </label>
              <label>
                <span>Number of Guests</span>
                <input type="number" min="1" value={f.number_of_guests} onChange={set('number_of_guests')} />
              </label>
            </div>
          </div>

          {/* Step 4: Rooms & Stay Duration */}
          <div className="checkin-step-card">
            <div className="checkin-step-header">
              <span className="step-number">4</span>
              <h3 className="step-title">Room & Duration Allocation</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <label style={{ marginBottom: 6 }}>Stay Type</label>
                <div className="segmented-control" role="group">
                  <button
                    type="button"
                    className={`segmented-option ${f.stay_type === 'NIGHTLY' ? 'active' : ''}`}
                    onClick={() => setF({ ...f, stay_type: 'NIGHTLY' })}
                  >
                    Nightly Stay
                  </button>
                  <button
                    type="button"
                    className={`segmented-option ${f.stay_type === 'HOURLY' ? 'active' : ''}`}
                    onClick={() => setF({ ...f, stay_type: 'HOURLY' })}
                  >
                    Hourly Stay
                  </button>
                </div>
                {/* Keep hidden select for consistency */}
                <select value={f.stay_type} onChange={set('stay_type')} style={{ display: 'none' }}>
                  <option value="NIGHTLY">Nightly</option>
                  <option value="HOURLY">Hourly</option>
                </select>
              </div>

              <div style={{ minWidth: 140 }}>
                {f.stay_type === 'HOURLY' ? (
                  <label>
                    <span>Stay Duration (Hours)</span>
                    <input type="number" min="1" value={f.hours} onChange={set('hours')} />
                  </label>
                ) : (
                  <label>
                    <span>Number of Nights</span>
                    <input type="number" min="1" value={f.nights} onChange={set('nights')} />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label style={{ marginBottom: 6 }}>
                <span>Select Room(s) *</span>
                <span className="label-sub">Click room tiles or checkboxes to allocate to this stay</span>
              </label>
              {sortedTypes.map(type => (
                <div key={type} className="room-type-section">
                  <div className="room-type-title">
                    {type}
                  </div>
                  <div className="rooms-grid">
                    {groupedRooms[type].map(r => {
                      const isChecked = sel.includes(r.room_number)
                      const guestCount = active.filter(s => s.status === 'ACTIVE' && s.room_numbers?.includes(r.room_number)).length
                      return (
                        <div
                          key={r.room_number}
                          className={`room-tile ${isChecked ? 'selected' : ''}`}
                          onClick={() =>
                            setSel(s => (s.includes(r.room_number) ? s.filter(x => x !== r.room_number) : [...s, r.room_number]))
                          }
                        >
                          <div className="room-tile-top">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                setSel(s => (s.includes(r.room_number) ? s.filter(x => x !== r.room_number) : [...s, r.room_number]))
                              }
                              onClick={e => e.stopPropagation()}
                              style={{ cursor: 'pointer', accentColor: 'var(--gold-600)', flexShrink: 0, width: 16, height: 16, margin: 0 }}
                            />
                            <span className="room-tile-number">{r.room_number}</span>
                          </div>
                          <span className={`room-guest-tag ${guestCount > 0 ? 'has-guests' : ''}`}>
                            {guestCount} guest(s) in
                          </span>
                          {isChecked && (
                            <span className="room-tile-check">
                              <IconCheck /> Allocated
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 5: Tariff & Payment */}
          <div className="checkin-step-card">
            <div className="checkin-step-header">
              <span className="step-number">5</span>
              <h3 className="step-title">Tariff & Billing Settlement</h3>
            </div>
            <label style={{ maxWidth: 260, marginBottom: 14 }}>
              <span>Total Tariff Amount (₹) *</span>
              <input type="number" min="0" placeholder="e.g. 3500" value={f.total} onChange={set('total')} />
            </label>

            <div className="card" style={{ marginBottom: 14 }}>
              <label>
                <span>Receptionist Name *</span>
                <input
                  placeholder="e.g. Anand"
                  value={f.receptionist_name}
                  onChange={set('receptionist_name')}
                />
              </label>
            </div>

            <Pay total={+f.total || 0} pay={pay} setPay={setPay} />
          </div>
        </div>

        {/* Right Column: Sticky Summary & Finalize */}
        <div className="checkin-summary-card">
          <div className="summary-headline">
            <span>Check-in Summary</span>
            <span className="badge badge-gold">New Stay</span>
          </div>

          <div className="summary-row">
            <span>Guest Name</span>
            <b>{f.guest_name || '—'}</b>
          </div>
          <div className="summary-row">
            <span>Receptionist</span>
            <b>{f.receptionist_name || '—'}</b>
          </div>
          <div className="summary-row">
            <span>Rooms Allocated</span>
            <b>
              {sel.length ? (
                sel.map(rm => (
                  <span key={rm} className="room-badge" style={{ marginLeft: 4 }}>
                    {rm}
                  </span>
                ))
              ) : (
                <span style={{ color: 'var(--status-due)' }}>None selected</span>
              )}
            </b>
          </div>
          <div className="summary-row">
            <span>Stay Type</span>
            <span>{f.stay_type === 'HOURLY' ? `${f.hours} Hour(s)` : `${f.nights} Night(s)`}</span>
          </div>

          <div className="checkout-preview-box">
            <IconClock />
            <div>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--gold-700)', textTransform: 'uppercase', fontWeight: 700 }}>
                Estimated Checkout (IST)
              </span>
              <b>{L.fmtIST(co)}</b>
            </div>
          </div>

          <div className="summary-row total-row">
            <span>Total Tariff</span>
            <b className="num">{inr(f.total || 0)}</b>
          </div>
          <div className="summary-row">
            <span>Amount Paid</span>
            <span className="num ok" style={{ fontWeight: 600 }}>{inr(pRes.paid || 0)}</span>
          </div>
          <div className="summary-row">
            <span>Balance Due</span>
            <span className={`num ${pRes.balance > 0 ? 'due' : 'ok'}`} style={{ fontWeight: 700 }}>
              {inr(pRes.balance || 0)}
            </span>
          </div>

          <button
            className="btn-gold"
            style={{ width: '100%', marginTop: 20, height: 44, fontSize: 14 }}
            disabled={busy || !f.guest_name || !f.mobile || !sel.length || !f.receptionist_name?.trim()}
            onClick={submit}
          >
            <IconPrinter />
            {busy ? 'Saving & Generating GRC...' : 'Save & Print GRC'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// ACTION MODAL (Extend Stay / Collect Balance)
// ---------------------------------------------------------------------
function Action({ s, type, onClose }) {
  const [pay, setPay] = useState(blankPay)
  const [x, setX] = useState({
    amount: '',
    reason: '',
    source: 'Walk-in',
    co: L.toISTInput(L.defaultExtension(s.current_checkout_at))
  })
  const total = type === 'extend' ? +x.amount || 0 : Number(s.balance)

  const go = async () => {
    const r = L.computePayment({ mode: pay.mode, total, paid: pay.paid, split: pay.split })
    if (r.error) return toast(r.error)
    try {
      if (type === 'extend') {
        await L.extendStay(s.id, {
          new_checkout: L.fromISTInput(x.co),
          reason: x.reason,
          booking_source: x.source,
          amount: total,
          payments: r.payments
        })
      } else {
        await L.addBalancePayment(s.id, r.payments)
      }
      onClose(true)
    } catch (e) {
      toast(e)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="card">
        <div className="modal-header">
          <div>
            <h3>{type === 'extend' ? 'Extend Guest Stay' : 'Collect Outstanding Balance'}</h3>
            <p>
              Guest: <b>{s.guest_name}</b> &bull; Room {s.room_numbers.join(', ')} &bull; {s.grc_number}
            </p>
          </div>
          <button
            className="btn-ghost"
            style={{ minHeight: 'auto', padding: '4px 8px', border: 'none' }}
            onClick={() => onClose(false)}
          >
            ✕
          </button>
        </div>

        {type === 'extend' && (
          <div className="grid" style={{ marginBottom: 14 }}>
            <label>
              <span>New Checkout Date & Time (IST)</span>
              <input
                type="datetime-local"
                value={x.co}
                onChange={e => setX({ ...x, co: e.target.value })}
              />
            </label>
            <label>
              <span>Extension Amount (₹)</span>
              <input
                type="number"
                placeholder="0"
                value={x.amount}
                onChange={e => setX({ ...x, amount: e.target.value })}
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span>Reason for Extension</span>
              <input
                placeholder="e.g. Extended tour / Meeting postponed"
                value={x.reason}
                onChange={e => setX({ ...x, reason: e.target.value })}
              />
            </label>
          </div>
        )}

        {type === 'balance' && (
          <div className="checkout-preview-box" style={{ marginBottom: 14, background: 'var(--status-due-bg)', borderColor: 'var(--status-due-border)' }}>
            <IconAlertCircle />
            <div>
              <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--status-due)', fontWeight: 700 }}>
                Total Pending Balance
              </span>
              <div className="num due" style={{ fontSize: 22, fontWeight: 700 }}>{inr(s.balance)}</div>
            </div>
          </div>
        )}

        <Pay total={total} pay={pay} setPay={setPay} />

        <div className="modal-footer">
          <button className="btn-ghost" onClick={() => onClose(false)}>
            Cancel
          </button>
          <button className="btn-primary" onClick={go}>
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// EDIT ROOMS MODAL (Change Room)
// ---------------------------------------------------------------------
function EditRooms({ s, hotelId, onClose }) {
  const [rooms, setRooms] = useState([])
  const [sel, setSel] = useState(s.room_numbers || [])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    L.getRooms(hotelId).then(setRooms).catch(toast)
  }, [hotelId])

  const roomTypeOrder = ['1 BHK', 'DELUXE ROOM', '2 BHK', '3 BHK', '5 BHK']
  const groupedRooms = rooms.reduce((acc, r) => {
    const type = r.room_type || 'Other'
    if (!acc[type]) acc[type] = []
    acc[type].push(r)
    return acc
  }, {})

  Object.keys(groupedRooms).forEach(type => {
    groupedRooms[type].sort((a, b) =>
      String(a.room_number || '').localeCompare(String(b.room_number || ''), undefined, { numeric: true })
    )
  })

  const sortedTypes = Object.keys(groupedRooms).sort((a, b) => {
    const aNorm = a.trim().toUpperCase()
    const bNorm = b.trim().toUpperCase()
    const idxA = roomTypeOrder.findIndex(t => t.toUpperCase() === aNorm)
    const idxB = roomTypeOrder.findIndex(t => t.toUpperCase() === bNorm)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })

  const save = async () => {
    if (!sel.length) return toast('Please select at least one room')
    setBusy(true)
    try {
      await L.changeRooms(s.id, sel)
      onClose(true)
      if (confirm('Room updated. Print the updated GRC now?')) {
        await L.printGRC(s.id).catch(toast)
      }
    } catch (e) {
      toast(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="card">
        <div className="modal-header">
          <div>
            <h3>Change room - {s.guest_name}</h3>
            <p>
              GRC: <b>{s.grc_number}</b> &bull; Current room: <b>{s.room_numbers ? s.room_numbers.join(', ') : 'None'}</b>
            </p>
          </div>
          <button
            className="btn-ghost"
            style={{ minHeight: 'auto', padding: '4px 8px', border: 'none' }}
            onClick={() => onClose(false)}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ marginBottom: 6 }}>
            <span>Select New Room(s) *</span>
            <span className="label-sub">Choose one or more rooms to allocate to this stay</span>
          </label>
        </div>

        <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: 4, margin: '8px 0 16px' }}>
          {rooms.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--status-neutral)' }}>
              Loading rooms...
            </div>
          ) : (
            sortedTypes.map(type => (
              <div key={type} className="room-type-section" style={{ marginTop: 12 }}>
                <div className="room-type-title">
                  {type}
                </div>
                <div className="rooms-grid">
                  {groupedRooms[type].map(r => {
                    const isChecked = sel.includes(r.room_number)
                    return (
                      <div
                        key={r.room_number}
                        className={`room-tile ${isChecked ? 'selected' : ''}`}
                        style={{ minHeight: 64, padding: '10px 8px' }}
                        onClick={() =>
                          setSel(prev => (prev.includes(r.room_number) ? prev.filter(x => x !== r.room_number) : [...prev, r.room_number]))
                        }
                      >
                        <div className="room-tile-top">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSel(prev => (prev.includes(r.room_number) ? prev.filter(x => x !== r.room_number) : [...prev, r.room_number]))
                            }
                            onClick={e => e.stopPropagation()}
                            style={{ cursor: 'pointer', accentColor: 'var(--gold-600)', flexShrink: 0, width: 16, height: 16, margin: 0 }}
                          />
                          <span className="room-tile-number">{r.room_number}</span>
                        </div>
                        {isChecked && (
                          <span className="room-tile-check">
                            <IconCheck /> Allocated
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={() => onClose(false)} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={busy || !sel.length}>
            {busy ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// ROW MORE MENU (Change room, Extend)
// ---------------------------------------------------------------------
function RowMoreMenu({ items }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    const handleKey = e => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!items || !items.length) return null

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn-ghost btn-sm"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="More actions"
        title="More actions"
        onClick={() => setOpen(v => !v)}
        style={{ minWidth: 32, padding: '4px 8px', fontWeight: 700 }}
      >
        •••
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            background: '#ffffff',
            border: '1px solid var(--cream-400)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 60,
            minWidth: 145,
            padding: '4px 0',
            animation: 'fadeIn 120ms ease-out'
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--navy-800)',
                fontSize: 12.5,
                fontWeight: 500,
                textAlign: 'left',
                cursor: 'pointer'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream-100, #faf8f5)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// VIEW STAY DRAWER (Guest, Booking, Payments, Extensions, Records)
// ---------------------------------------------------------------------
function ViewStay({ stayId, onClose, onChanged }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subAct, setSubAct] = useState(null)
  const [subEditRoomsStay, setSubEditRoomsStay] = useState(null)
  const drawerRef = useRef(null)

  const load = () => {
    setLoading(true)
    L.getGrc(stayId)
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        toast(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (stayId) load()
  }, [stayId])

  useEffect(() => {
    const handleKey = e => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    drawerRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const s = data?.stay
  const segments = data?.segments || []
  const payments = data?.payments || []

  const byMode = Object.fromEntries(MODES.map(m => [m, 0]))
  payments.forEach(p => {
    const amt = Number(p.amount) || 0
    const factor = p.kind === 'REFUND' ? -1 : 1
    if (byMode[p.mode] !== undefined) {
      byMode[p.mode] += factor * amt
    }
  })

  const hasExtensions = segments.some(g => g.seq > 1)

  const paymentKindLabels = {
    CHECKIN: 'Advance',
    EXTENSION: 'Extension',
    BALANCE: 'Balance paid',
    REFUND: 'Refund'
  }

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <div
        className="drawer-sheet"
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={s ? `Stay details - ${s.guest_name}` : 'Stay details'}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="drawer-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div className="skeleton-line" style={{ width: 180, height: 22 }} />
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h3 className="drawer-title" style={{ margin: 0 }}>{s?.guest_name}</h3>
                  <span className={`pill ${s?.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                    {s?.status === 'ACTIVE' ? 'ACTIVE' : 'CHECKED OUT'}
                  </span>
                  <span className={`pill ${s?.payment_status === 'PAID' ? 'badge-success' : s?.payment_status === 'PARTIAL' ? 'badge-gold' : 'badge-danger'}`}>
                    {s?.payment_status || (s?.balance > 0 ? 'PENDING' : 'PAID')}
                  </span>
                </div>
                <div className="drawer-subtitle" style={{ marginTop: 4 }}>
                  GRC: <b>{s?.grc_number}</b> &bull; Room: <b>{(s?.room_numbers || []).join(', ') || '-'}</b>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className="btn-ghost drawer-close-btn"
            onClick={onClose}
            aria-label="Close stay details"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {loading ? (
            <div className="drawer-skeleton">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : !s ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>Unable to load stay details.</p>
            </div>
          ) : (
            <>
              {/* a) Guest Details */}
              <div className="view-stay-card">
                <div className="view-stay-card-header">
                  <IconUser /> Guest Information
                </div>
                <div className="view-stay-rows">
                  <div className="view-stay-row">
                    <span className="view-stay-label">Guest Name</span>
                    <span className="view-stay-value">{s.guest_name || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Mobile Number</span>
                    <span className="view-stay-value tabular-nums">{s.mobile || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Address</span>
                    <span className="view-stay-value">{s.address || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">ID Proof Type</span>
                    <span className="view-stay-value">{s.id_proof_type || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">ID Proof Number</span>
                    <span className="view-stay-value tabular-nums">{s.id_proof_number || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Purpose of Visit</span>
                    <span className="view-stay-value">{s.purpose_of_visit || '-'}</span>
                  </div>
                </div>
              </div>

              {/* b) Booking & Stay */}
              <div className="view-stay-card">
                <div className="view-stay-card-header">
                  <IconBed /> Booking &amp; Stay Details
                </div>
                <div className="view-stay-rows">
                  <div className="view-stay-row">
                    <span className="view-stay-label">Booking Source</span>
                    <span className="view-stay-value">{s.booking_source || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Booking ID</span>
                    <span className="view-stay-value tabular-nums">{s.booking_id || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Room Number(s)</span>
                    <span className="view-stay-value font-bold">{(s.room_numbers || []).join(', ') || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Number of Rooms</span>
                    <span className="view-stay-value tabular-nums">{s.number_of_rooms || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Number of Guests</span>
                    <span className="view-stay-value tabular-nums">{s.number_of_guests || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Stay Type</span>
                    <span className="view-stay-value">
                      {s.stay_type === 'HOURLY'
                        ? `Hourly (${s.hours || 0} Hour${s.hours === 1 ? '' : 's'})`
                        : `Nightly (${s.nights || Math.max(1, Math.round((new Date(s.current_checkout_at) - new Date(s.checkin_at)) / 864e5))} Night${(s.nights || 1) === 1 ? '' : 's'})`}
                    </span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Check-in Time</span>
                    <span className="view-stay-value tabular-nums">{L.fmtIST(s.checkin_at)}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Original Checkout</span>
                    <span className="view-stay-value tabular-nums">{L.fmtIST(s.original_checkout_at)}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Current Checkout</span>
                    <span className="view-stay-value tabular-nums">{L.fmtIST(s.current_checkout_at)}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Actual Checkout</span>
                    <span className="view-stay-value tabular-nums">
                      {s.status === 'CHECKED_OUT' || s.actual_checkout_at
                        ? `${L.fmtIST(s.actual_checkout_at || s.current_checkout_at)}${s.checkout_type ? ` (${s.checkout_type})` : ''}`
                        : '-'}
                    </span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Extension Count</span>
                    <span className="view-stay-value tabular-nums">{s.extension_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* c) Payment Summary */}
              <div className="view-stay-card">
                <div className="view-stay-card-header">
                  <IconCreditCard /> Payment Summary
                </div>
                <div className="view-stay-boxes">
                  <div className="view-stay-stat-box">
                    <small>TOTAL AMOUNT</small>
                    <b className="tabular-nums">{inr(s.total_amount)}</b>
                  </div>
                  <div className="view-stay-stat-box">
                    <small>TOTAL PAID</small>
                    <b className="tabular-nums ok">{inr(s.total_paid)}</b>
                  </div>
                  <div className={`view-stay-stat-box ${Number(s.balance) > 0 ? 'stat-box-danger' : ''}`}>
                    <small>BALANCE</small>
                    <b className={`tabular-nums ${Number(s.balance) > 0 ? 'due' : 'ok'}`}>{inr(s.balance)}</b>
                  </div>
                  <div className="view-stay-stat-box">
                    <small>STATUS</small>
                    <b className={s.payment_status === 'PAID' ? 'ok' : 'due'}>
                      {s.payment_status || (s.balance > 0 ? 'PENDING' : 'PAID')}
                    </b>
                  </div>
                </div>

                <div className="view-stay-rows" style={{ marginTop: 12 }}>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Payment Mode Summary</span>
                    <span className="view-stay-value">{s.payment_mode_summary || '-'}</span>
                  </div>
                </div>

                <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Totals by Payment Mode
                </div>
                <div className="view-stay-boxes" style={{ marginTop: 6 }}>
                  <div className="view-stay-stat-box">
                    <small>CASH</small>
                    <b className="tabular-nums">{inr(byMode.CASH)}</b>
                  </div>
                  <div className="view-stay-stat-box">
                    <small>GPAY</small>
                    <b className="tabular-nums">{inr(byMode.GPAY)}</b>
                  </div>
                  <div className="view-stay-stat-box">
                    <small>CARD</small>
                    <b className="tabular-nums">{inr(byMode.CARD)}</b>
                  </div>
                  <div className="view-stay-stat-box">
                    <small>ONLINE</small>
                    <b className="tabular-nums">{inr(byMode.ONLINE)}</b>
                  </div>
                </div>
              </div>

              {/* d) Payment History Table */}
              <div className="view-stay-card">
                <div className="view-stay-card-header">
                  <IconClock /> Payment History ({payments.length})
                </div>
                {payments.length === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--status-neutral)', fontSize: 13 }}>
                    No payment records found
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', marginTop: 8 }}>
                    <table className="mini-table">
                      <thead>
                        <tr>
                          <th>Date/Time (IST)</th>
                          <th>Type</th>
                          <th>Mode</th>
                          <th>Amount</th>
                          <th>Reference No</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p, i) => (
                          <tr key={p.id || i}>
                            <td className="tabular-nums">{L.fmtIST(p.created_at)}</td>
                            <td>
                              <span className={`pill ${p.kind === 'REFUND' ? 'badge-danger' : 'badge-neutral'}`}>
                                {paymentKindLabels[p.kind] || p.kind || 'Payment'}
                              </span>
                            </td>
                            <td><span className="pill badge-gold">{p.mode}</span></td>
                            <td className={`tabular-nums ${p.kind === 'REFUND' ? 'due' : 'ok'}`} style={{ fontWeight: 600 }}>
                              {p.kind === 'REFUND' ? `-${inr(p.amount)}` : inr(p.amount)}
                            </td>
                            <td className="tabular-nums">{p.reference_no || '-'}</td>
                            <td>{p.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* e) Extension History Table (if seq > 1 exists) */}
              {hasExtensions && (
                <div className="view-stay-card">
                  <div className="view-stay-card-header">
                    <IconCalendar /> Extension History
                  </div>
                  <div style={{ overflowX: 'auto', marginTop: 8 }}>
                    <table className="mini-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Source</th>
                          <th>Booking ID</th>
                          <th>Rooms</th>
                          <th>Guests</th>
                          <th>Amount</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {segments.map((g, i) => (
                          <tr key={g.id || g.seq || i} style={g.seq === 1 ? { background: 'var(--cream-100, #faf8f5)' } : {}}>
                            <td style={{ fontWeight: 600 }}>
                              {g.seq === 1 ? 'Original booking' : `Ext #${g.seq - 1}`}
                            </td>
                            <td className="tabular-nums">{L.fmtIST(g.from_at)}</td>
                            <td className="tabular-nums">{L.fmtIST(g.to_at)}</td>
                            <td>{g.booking_source || '-'}</td>
                            <td className="tabular-nums">{g.booking_id || '-'}</td>
                            <td>{(g.room_numbers || []).join(', ') || g.number_of_rooms || '-'}</td>
                            <td className="tabular-nums">{g.number_of_guests || '-'}</td>
                            <td className="tabular-nums ok" style={{ fontWeight: 600 }}>{inr(g.amount)}</td>
                            <td>{g.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* f) Record Info */}
              <div className="view-stay-card">
                <div className="view-stay-card-header">
                  <IconFileText /> Record Information
                </div>
                <div className="view-stay-rows">
                  <div className="view-stay-row">
                    <span className="view-stay-label">Created At</span>
                    <span className="view-stay-value tabular-nums">{L.fmtIST(s.created_at)}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Created By (Receptionist)</span>
                    <span className="view-stay-value font-bold">{s.receptionist_name || '-'}</span>
                  </div>
                  <div className="view-stay-row">
                    <span className="view-stay-label">Last Updated</span>
                    <span className="view-stay-value tabular-nums">
                      {L.fmtIST(s.updated_at || s.last_updated_at || s.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {s && (
          <div className="drawer-footer">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => L.printGRC(s.id).catch(toast)}
            >
              <IconPrinter /> Print GRC
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setSubEditRoomsStay(s)}
            >
              <IconBed /> Change room
            </button>
            {(s.status === 'ACTIVE' || Number(s.balance) > 0) && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setSubAct({ s, type: 'extend' })}
              >
                <IconCalendar /> Extend
              </button>
            )}
            {Number(s.balance) > 0 && (
              <button
                type="button"
                className="btn-gold"
                onClick={() => setSubAct({ s, type: 'balance' })}
              >
                <IconCreditCard /> Pay balance
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub-modals inside ViewStay */}
      {subAct && (
        <Action
          {...subAct}
          onClose={ok => {
            setSubAct(null)
            if (ok) {
              load()
              onChanged && onChanged()
            }
          }}
        />
      )}

      {subEditRoomsStay && (
        <EditRooms
          s={subEditRoomsStay}
          hotelId={s?.hotel_id || subEditRoomsStay.hotel_id}
          onClose={ok => {
            setSubEditRoomsStay(null)
            if (ok) {
              load()
              onChanged && onChanged()
            }
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// HOME SCREEN (Active Guests, Counters & Actions)
// ---------------------------------------------------------------------
function Home({ hotelId }) {
  const [rows, setRows] = useState([])
  const [act, setAct] = useState(null)
  const [editRoomsStay, setEditRoomsStay] = useState(null)
  const [viewStayId, setViewStayId] = useState(null)

  useEffect(() => L.watchActive(hotelId, setRows), [hotelId])

  const out = async s => {
    try {
      await L.checkoutStay(s.id)
    } catch (e) {
      if (confirm(e.message + '\nCheck out anyway?')) await L.checkoutStay(s.id, true).catch(toast)
    }
    L.getActiveStays(hotelId).then(setRows)
  }

  // Header Counters
  const activeCount = rows.filter(s => s.status === 'ACTIVE').length
  const totalBalanceDue = rows.reduce((sum, s) => sum + (Number(s.balance) || 0), 0)
  const checkingOutSoonCount = rows.filter(s => {
    const co = new Date(s.current_checkout_at).getTime()
    const now = Date.now()
    return co <= now + 86400000 && s.status === 'ACTIVE'
  }).length

  return (
    <div className="page-container">
      {/* KPI Counters */}
      <div className="kpi-row">
        <div className="kpi-card kpi-success">
          <div className="kpi-content">
            <small>Active In-House Guests</small>
            <div className="kpi-val num">{activeCount}</div>
          </div>
          <div className="kpi-icon-wrapper">
            <IconUsers />
          </div>
        </div>

        <div className={`kpi-card ${totalBalanceDue > 0 ? 'kpi-danger' : ''}`}>
          <div className="kpi-content">
            <small>Total Balance Due</small>
            <div className="kpi-val num">{inr(totalBalanceDue)}</div>
          </div>
          <div className="kpi-icon-wrapper">
            <IconCreditCard />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-content">
            <small>Checking Out Soon</small>
            <div className="kpi-val num">{checkingOutSoonCount}</div>
          </div>
          <div className="kpi-icon-wrapper">
            <IconClock />
          </div>
        </div>
      </div>

      {/* Main Table / Guest List */}
      <div className="table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--cream-400)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <IconBed /> Active Guest Ledger ({rows.length})
          </h3>
          <span className="badge badge-gold">Live Updates Enabled</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Guest Details</th>
              <th>Mobile</th>
              <th>Check-in (IST)</th>
              <th>Checkout (IST)</th>
              <th>Paid</th>
              <th>Balance</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => {
              const isDue = s.balance > 0
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {s.room_numbers.map(rm => (
                        <span key={rm} className="room-badge">{rm}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="guest-name-link"
                      title="Click to view stay details"
                      onClick={() => setViewStayId(s.id)}
                    >
                      {s.guest_name}
                    </button>
                    <small style={{ color: 'var(--status-neutral)', letterSpacing: '0.04em', display: 'block' }}>{s.grc_number}</small>
                    {s.status === 'CHECKED_OUT' && (
                      <small style={{ color: 'var(--status-due, #b3261e)', display: 'block', fontWeight: 600, marginTop: 2 }}>
                        Checked out - balance due
                      </small>
                    )}
                  </td>
                  <td className="tabular-nums">{s.mobile}</td>
                  <td className="tabular-nums">{L.fmtIST(s.checkin_at)}</td>
                  <td className="tabular-nums">
                    <div>{L.fmtIST(s.current_checkout_at)}</div>
                    {s.extension_count > 0 && (
                      <span className="pill badge-gold" style={{ marginTop: 2 }}>
                        Ext ×{s.extension_count}
                      </span>
                    )}
                  </td>
                  <td className="tabular-nums ok">{inr(s.total_paid)}</td>
                  <td className={`tabular-nums ${isDue ? 'due' : 'ok'}`} style={{ fontWeight: 600 }}>
                    {inr(s.balance)}
                  </td>
                  <td>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn-ghost btn-sm"
                        title="View stay details"
                        aria-label={`View stay details for ${s.guest_name}`}
                        onClick={() => setViewStayId(s.id)}
                      >
                        <IconEye /> View
                      </button>
                      <button
                        className="btn-ghost btn-sm"
                        title="Print Guest Registration Card"
                        onClick={() => L.printGRC(s.id).catch(toast)}
                      >
                        <IconPrinter /> Print
                      </button>
                      {isDue && (
                        <button
                          className="btn-gold btn-sm"
                          title="Collect Pending Balance"
                          onClick={() => setAct({ s, type: 'balance' })}
                        >
                          <IconCreditCard /> Pay
                        </button>
                      )}
                      {s.status === 'ACTIVE' && (
                        <button
                          className="btn-primary btn-sm"
                          title="Check out guest"
                          onClick={() => out(s)}
                        >
                          <IconLogOut /> Check out
                        </button>
                      )}
                      <RowMoreMenu
                        items={[
                          { label: 'Change room', icon: <IconBed />, onClick: () => setEditRoomsStay(s) },
                          { label: 'Extend stay', icon: <IconCalendar />, onClick: () => setAct({ s, type: 'extend' }) }
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
            {!rows.length && (
              <tr>
                <td colSpan="8">
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <IconBed />
                    </div>
                    <h4>No Active Guests in Residence</h4>
                    <p>All rooms are currently vacant or checked out. Use the Check-in tab to register new arrivals.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {act && (
        <Action
          {...act}
          onClose={ok => {
            setAct(null)
            ok && L.getActiveStays(hotelId).then(setRows)
          }}
        />
      )}

      {editRoomsStay && (
        <EditRooms
          s={editRoomsStay}
          hotelId={hotelId}
          onClose={ok => {
            setEditRoomsStay(null)
            ok && L.getActiveStays(hotelId).then(setRows)
          }}
        />
      )}

      {viewStayId && (
        <ViewStay
          stayId={viewStayId}
          onClose={() => setViewStayId(null)}
          onChanged={() => L.getActiveStays(hotelId).then(setRows)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// REPORT SCREEN (Filters, Active Filter Chips & Ledger Table)
// ---------------------------------------------------------------------
function Report({ hotelId }) {
  const [f, setF] = useState({ status: 'CHECKED_OUT', paymentStatus: 'PAID' })
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState([])
  const [act, setAct] = useState(null)
  const [editRoomsStay, setEditRoomsStay] = useState(null)
  const [viewStayId, setViewStayId] = useState(null)
  const [sources, setSources] = useState([])

  const day = d => new Date(d + 'T00:00:00+05:30')
  const load = () =>
    L.getReport(
      {
        hotel: hotelId,
        ...f,
        from: f.from ? day(f.from).toISOString() : null,
        to: f.to ? new Date(day(f.to).getTime() + 864e5).toISOString() : null
      },
      page
    )
      .then(setRows)
      .catch(toast)

  useEffect(() => {
    L.getSources().then(setSources)
  }, [])

  useEffect(() => {
    load()
  }, [hotelId, page])

  const set = k => e => setF({ ...f, [k]: e.target.value || null })
  const total = rows[0]?.total_count || 0

  const activeFilters = []
  if (f.status) activeFilters.push(`Status: ${f.status}`)
  if (f.paymentStatus) activeFilters.push(`Payment: ${f.paymentStatus}`)
  if (f.source) activeFilters.push(`Source: ${f.source}`)
  if (f.paymentMode) activeFilters.push(`Mode: ${f.paymentMode}`)
  if (f.extended !== undefined && f.extended !== null) activeFilters.push(`Extended: ${f.extended ? 'Yes' : 'No'}`)
  if (f.from) activeFilters.push(`From: ${f.from}`)
  if (f.to) activeFilters.push(`To: ${f.to}`)
  if (f.search) activeFilters.push(`Search: "${f.search}"`)

  return (
    <div className="page-container">
      {/* Sticky Filter Card */}
      <div className="filter-card">
        <div className="card-header" style={{ marginBottom: 12 }}>
          <h3 className="card-title">
            <IconSearch /> Stay Ledger & Auditing Filters
          </h3>
          <button
            className="btn-primary"
            onClick={() => {
              setPage(0)
              load()
            }}
          >
            Apply Filters
          </button>
        </div>

        <div className="grid">
          <label>
            <span>From Date</span>
            <input type="date" onChange={set('from')} />
          </label>
          <label>
            <span>To Date</span>
            <input type="date" onChange={set('to')} />
          </label>
          <label>
            <span>Stay Status</span>
            <select value={f.status || ''} onChange={set('status')}>
              <option value="">All</option>
              <option>ACTIVE</option>
              <option>CHECKED_OUT</option>
            </select>
          </label>
          <label>
            <span>Booking Source</span>
            <select onChange={set('source')}>
              <option value="">All</option>
              {sources.map(s => <option key={s.name}>{s.name}</option>)}
            </select>
          </label>
          <label>
            <span>Payment Mode</span>
            <select onChange={set('paymentMode')}>
              <option value="">All</option>
              {MODES.map(m => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label>
            <span>Payment Status</span>
            <select value={f.paymentStatus || ''} onChange={set('paymentStatus')}>
              <option value="">All</option>
              <option>PAID</option>
              <option>PARTIAL</option>
              <option>PENDING</option>
            </select>
          </label>
          <label>
            <span>Extended Stay</span>
            <select
              onChange={e =>
                setF({ ...f, extended: e.target.value === '' ? null : e.target.value === 'true' })
              }
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label>
            <span>Search Term</span>
            <input placeholder="Name / Mobile / GRC / Room" onChange={set('search')} />
          </label>
        </div>

        {activeFilters.length > 0 && (
          <div className="active-filters-bar">
            <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--status-neutral)', fontWeight: 700 }}>
              Active Filters:
            </span>
            {activeFilters.map((af, idx) => (
              <span key={idx} className="active-filter-chip">
                {af}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>GRC</th>
              <th>Guest Details</th>
              <th>Room</th>
              <th>Source</th>
              <th>Check-in (IST)</th>
              <th>Checkout (IST)</th>
              <th>Total Tariff</th>
              <th>Balance</th>
              <th>Mode</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id}>
                <td>
                  <span className="badge badge-navy tabular-nums">{s.grc_number}</span>
                </td>
                <td>
                  <button
                    type="button"
                    className="guest-name-link"
                    title="Click to view stay details"
                    onClick={() => setViewStayId(s.id)}
                  >
                    {s.guest_name}
                  </button>
                  <small style={{ color: 'var(--status-neutral)', display: 'block' }} className="tabular-nums">{s.mobile}</small>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {s.room_numbers.map(rm => (
                      <span key={rm} className="room-badge">{rm}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className="pill badge-neutral">{s.booking_source}</span>
                </td>
                <td className="tabular-nums">{L.fmtIST(s.checkin_at)}</td>
                <td className="tabular-nums">{L.fmtIST(s.actual_checkout_at || s.current_checkout_at)}</td>
                <td className="tabular-nums font-serif" style={{ fontWeight: 600 }}>{inr(s.total_amount)}</td>
                <td className={`tabular-nums ${s.balance > 0 ? 'due' : 'ok'}`} style={{ fontWeight: 700 }}>
                  {inr(s.balance)}
                </td>
                <td>
                  <span className="pill badge-gold">{s.payment_mode_summary || '—'}</span>
                </td>
                <td>
                  <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                    <button
                      className="btn-ghost btn-sm"
                      title="View stay details"
                      aria-label={`View stay details for ${s.guest_name}`}
                      onClick={() => setViewStayId(s.id)}
                    >
                      <IconEye /> View
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      title="Reprint GRC"
                      onClick={() => L.printGRC(s.id).catch(toast)}
                    >
                      <IconPrinter /> Print GRC
                    </button>
                    {s.balance > 0 && (
                      <button
                        className="btn-gold btn-sm"
                        title="Collect Outstanding Balance"
                        onClick={() => setAct({ s, type: 'balance' })}
                      >
                        <IconCreditCard /> Pay
                      </button>
                    )}
                    <RowMoreMenu
                      items={[
                        { label: 'Change room', icon: <IconBed />, onClick: () => setEditRoomsStay(s) }
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan="10">
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <IconFileText />
                    </div>
                    <h4>No Records Found</h4>
                    <p>No stay records match the applied criteria. Adjust your date range or filters above.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="pagination-bar">
          <div>
            Showing <b>{total === 0 ? 0 : page * 50 + 1}</b> – <b>{Math.min((page + 1) * 50, total)}</b> of <b>{total}</b> records
          </div>
          <div className="pagination-controls">
            <button
              className="btn-ghost btn-sm"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              <IconChevronLeft /> Prev
            </button>
            <span style={{ padding: '0 8px' }}>
              Page <b>{page + 1}</b> of <b>{Math.max(1, Math.ceil(total / 50))}</b>
            </span>
            <button
              className="btn-ghost btn-sm"
              disabled={(page + 1) * 50 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next <IconChevronRight />
            </button>
          </div>
        </div>
      </div>

      {act && (
        <Action
          {...act}
          onClose={ok => {
            setAct(null)
            ok && load()
          }}
        />
      )}

      {editRoomsStay && (
        <EditRooms
          s={editRoomsStay}
          hotelId={hotelId}
          onClose={ok => {
            setEditRoomsStay(null)
            ok && load()
          }}
        />
      )}

      {viewStayId && (
        <ViewStay
          stayId={viewStayId}
          onClose={() => setViewStayId(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// ADMIN SCREEN (KPI Metrics, Stays-by-Source & Collected-by-Mode)
// ---------------------------------------------------------------------
function Admin({ hotelId }) {
  const t = new Date().toISOString().slice(0, 10)
  const [d, setD] = useState({ from: t, to: t })
  const [data, setData] = useState(null)

  const run = () => L.adminSummary(d.from, d.to, hotelId || null).then(setData).catch(toast)
  useEffect(() => {
    run()
  }, [hotelId])

  // Compute totals for percentage bars
  const totalCollected = data
    ? Object.values(data.collected_by_mode).reduce((sum, v) => sum + (Number(v) || 0), 0)
    : 0

  const totalSourceStays = data
    ? Object.values(data.stays_by_source).reduce((sum, v) => sum + (Number(v) || 0), 0)
    : 0

  return (
    <div className="page-container">
      {/* Date Range Selection Bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 200px' }}>
            <span>Audit Start Date</span>
            <input type="date" value={d.from} onChange={e => setD({ ...d, from: e.target.value })} />
          </label>
          <label style={{ flex: '1 1 200px' }}>
            <span>Audit End Date</span>
            <input type="date" value={d.to} onChange={e => setD({ ...d, to: e.target.value })} />
          </label>
          <button className="btn-primary" style={{ height: 38 }} onClick={run}>
            Show Analytics
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* KPI Cards Row */}
          <div className="kpi-row">
            {[
              ['Stays Recorded', data.stays, false, <IconBed key="stays" />],
              ['Active Now', data.active_now, false, <IconUsers key="active" />],
              ['Billed Revenue', inr(data.billed), false, <IconCreditCard key="billed" />],
              ['Pending Balance', inr(data.pending_balance), data.pending_balance > 0, <IconAlertCircle key="pending" />],
              ['Total Extensions', data.extensions, false, <IconCalendar key="extensions" />]
            ].map(([k, v, isDanger, icon]) => (
              <div key={k} className={`kpi-card ${isDanger ? 'kpi-danger' : ''}`}>
                <div className="kpi-content">
                  <small>{k}</small>
                  <div className="kpi-val num">{v}</div>
                </div>
                <div className="kpi-icon-wrapper">{icon}</div>
              </div>
            ))}
          </div>

          {/* Visual Analytics Grid */}
          <div className="grid grid-cols-2">
            {/* Collected by Mode */}
            <div className="admin-viz-card">
              <div className="viz-title">Collections by Payment Mode</div>
              <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--status-neutral)' }}>
                Total Collected: <b className="num" style={{ color: 'var(--navy-700)' }}>{inr(totalCollected)}</b>
              </div>
              {Object.entries(data.collected_by_mode).map(([k, v]) => {
                const amt = Number(v) || 0
                const pct = totalCollected > 0 ? Math.round((amt / totalCollected) * 100) : 0
                return (
                  <div key={k} className="bar-row">
                    <div className="bar-label-group">
                      <span>{k}</span>
                      <span>
                        <b className="num">{inr(v)}</b>
                        <small style={{ marginLeft: 6, color: 'var(--status-neutral)' }}>({pct}%)</small>
                      </span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Stays by Source */}
            <div className="admin-viz-card">
              <div className="viz-title">Stays by Booking Source</div>
              <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--status-neutral)' }}>
                Total Stays: <b className="num" style={{ color: 'var(--navy-700)' }}>{totalSourceStays}</b>
              </div>
              {Object.entries(data.stays_by_source)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => {
                  const count = Number(v) || 0
                  const pct = totalSourceStays > 0 ? Math.round((count / totalSourceStays) * 100) : 0
                  return (
                    <div key={k} className="bar-row">
                      <div className="bar-label-group">
                        <span>{k}</span>
                        <span>
                          <b className="num">{v}</b> stays
                          <small style={{ marginLeft: 6, color: 'var(--status-neutral)' }}>({pct}%)</small>
                        </span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill bar-fill-navy" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// MAIN APPLICATION SHELL & ROUTER
// ---------------------------------------------------------------------
export default function App() {
  const [session, setSession] = useState(undefined)
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('home')
  const [hotels, setHotels] = useState([])
  const [hotelId, setHotelId] = useState(null)

  useEffect(() => {
    L.supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = L.supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return setMe(null)
    L.getMyProfile()
      .then(p => {
        setMe(p)
        setHotelId(p.hotel_id)
        if (p.role === 'admin') {
          L.supabase
            .from('hotels')
            .select('id,name,code')
            .then(({ data }) => {
              setHotels(data || [])
              setHotelId(data?.[0]?.id)
            })
        }
      })
      .catch(toast)
  }, [session])

  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream-300)' }}>
        <div style={{ textAlign: 'center' }}>
          <img src={logo} alt="Starlight" style={{ height: 60, display: 'block', margin: '0 auto 16px' }} />
          <h3 className="font-serif" style={{ margin: 0, color: 'var(--navy-700)' }}>Starlight Hotels</h3>
          <p style={{ color: 'var(--status-neutral)', fontSize: 13, marginTop: 4 }}>Loading Front Desk Session...</p>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  if (!me) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream-300)', padding: 20 }}>
        <div className="card" style={{ maxWidth: 440, textAlign: 'center', padding: 32 }}>
          <div className="empty-state-icon" style={{ background: 'var(--status-due-bg)', color: 'var(--status-due)' }}>
            <IconAlertCircle />
          </div>
          <h3 className="font-serif">No Staff Profile Assigned</h3>
          <p style={{ color: 'var(--status-neutral)', fontSize: 13 }}>
            No profile found for this user. Please ensure users and rooms are populated via sql/02_add_users_and_rooms.sql.
          </p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => L.supabase.auth.signOut()}>
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  const admin = me.role === 'admin'
  const currentHotel = admin ? hotels.find(h => h.id === hotelId) : me.hotels
  const currentHotelName = currentHotel?.name || 'Starlight Hotels'

  const tabLabels = {
    home: { title: 'Active In-House Guests', subtitle: currentHotelName },
    in: { title: 'New Guest Registration', subtitle: currentHotelName },
    report: { title: 'Front Desk Ledger & Audit', subtitle: currentHotelName },
    admin: { title: 'Executive Analytics & Summary', subtitle: currentHotelName }
  }

  return (
    <>
      <ToastContainer />
      <div className="app-shell">
        {/* Left Sidebar (Desktop) */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img src={logo} alt="Starlight" className="brand-logo" />
            <div className="brand-info">
              <h1 className="brand-title">STARLIGHT</h1>
              <div className="brand-sub">
                {admin ? 'ADMINISTRATION' : (me.hotels?.name || 'HOTELS')}
              </div>
            </div>
          </div>

          {admin && (
            <div className="sidebar-hotel-selector">
              <label>Switch Property</label>
              <select
                className="sidebar-hotel-select"
                value={hotelId || ''}
                onChange={e => setHotelId(e.target.value)}
              >
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <nav className="sidebar-nav">
            {[
              ['home', 'Home (Active)', <IconBed key="home" />],
              ['in', 'Check-in Guest', <IconPlusCircle key="in" />],
              ['report', 'Report & Ledger', <IconFileText key="report" />],
              ...(admin ? [['admin', 'Admin Dashboard', <IconShield key="admin" />]] : [])
            ].map(([k, v, icon]) => (
              <button
                key={k}
                className={`nav-link ${tab === k ? 'active' : ''}`}
                onClick={() => setTab(k)}
              >
                {icon}
                <span>{v}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">
                {me.email ? me.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-details">
                <div className="user-name">{me.email || 'Staff Member'}</div>
                <span className="user-role-badge">{me.role}</span>
              </div>
            </div>
            <button className="btn-sidebar-logout" onClick={() => L.supabase.auth.signOut()}>
              <IconLogOut /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="main-wrapper">
          <TopBar
            title={tabLabels[tab]?.title || 'Front Desk'}
            subtitle={tabLabels[tab]?.subtitle || ''}
          />

          <main>
            {hotelId && (
              <div key={hotelId + tab}>
                {tab === 'home' && <Home hotelId={hotelId} />}
                {tab === 'in' && <CheckIn hotelId={hotelId} onDone={() => setTab('home')} />}
                {tab === 'report' && <Report hotelId={hotelId} />}
                {tab === 'admin' && <Admin hotelId={hotelId} />}
              </div>
            )}
          </main>
        </div>

        {/* Mobile / Tablet Bottom Tab Bar */}
        <nav className="mobile-bottom-nav">
          {[
            ['home', 'Home', <IconBed key="m-home" />],
            ['in', 'Check-in', <IconPlusCircle key="m-in" />],
            ['report', 'Report', <IconFileText key="m-report" />],
            ...(admin ? [['admin', 'Admin', <IconShield key="m-admin" />]] : [])
          ].map(([k, v, icon]) => (
            <button
              key={k}
              className={`mobile-nav-btn ${tab === k ? 'active' : ''}`}
              onClick={() => setTab(k)}
            >
              {icon}
              <span>{v}</span>
            </button>
          ))}
          <button
            className="mobile-nav-btn"
            onClick={() => L.supabase.auth.signOut()}
          >
            <IconLogOut />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </>
  )
}
