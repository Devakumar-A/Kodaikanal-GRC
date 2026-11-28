// =====================================================================
//  STARLIGHT HOTELS - CLIENT INTEGRATION (supabase-js v2)
//  Works with starlight_schema.sql
// =====================================================================
import logoImg from '../assets/favicon.png'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

const TZ = 'Asia/Kolkata'
const MODES = ['CASH', 'GPAY', 'CARD', 'ONLINE']

// ---------------------------------------------------------------------
// 1. INDIAN TIME HELPERS
// ---------------------------------------------------------------------
export const fmtIST = (iso) =>
  iso ? new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)) : '-'

const istParts = (d) => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]))

// <input type="datetime-local"> value (treated as IST) -> ISO for Supabase
export const fromISTInput = (v) => new Date(v + ':00+05:30').toISOString()
// ISO -> value for <input type="datetime-local"> in IST
export const toISTInput = (iso) => { const p = istParts(new Date(iso)); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` }

// Default checkout: 11:00 on (check-in date + nights), IST.  (hotel.checkout_time can be passed)
export function defaultCheckout(checkin = new Date(), nights = 1, time = '11:00') {
  const p = istParts(checkin)
  const base = new Date(`${p.year}-${p.month}-${p.day}T00:00:00+05:30`)
  base.setUTCDate(base.getUTCDate() + nights)
  const q = istParts(base)
  return new Date(`${q.year}-${q.month}-${q.day}T${time}:00+05:30`).toISOString()
}
// Hourly stay: checkout = check-in + hours
export const hourlyCheckout = (checkin = new Date(), hours = 3) => new Date(checkin.getTime() + hours * 3600e3).toISOString()
// Extension default: next day 11:00 after current checkout
export const defaultExtension = (currentCheckoutISO, time = '11:00') => defaultCheckout(new Date(currentCheckoutISO), 1, time)

// ---------------------------------------------------------------------
// 1B. ROOM FORMATTING HELPER
// Group labels containing " - " by cottage into "Cottage (101, 102)"
// Labels without " - " show unchanged.
// ---------------------------------------------------------------------
export const formatRooms = (roomNumbers) => {
  if (!roomNumbers) return '-'
  const arr = Array.isArray(roomNumbers) ? roomNumbers : [roomNumbers]
  if (!arr.length) return '-'
  const groups = new Map()
  const standalone = []

  arr.forEach(lbl => {
    const s = String(lbl || '').trim()
    if (!s) return
    if (s.includes(' - ')) {
      const parts = s.split(' - ')
      const cottage = parts[0].trim()
      const unit = parts.slice(1).join(' - ').trim()
      if (!groups.has(cottage)) groups.set(cottage, [])
      groups.get(cottage).push(unit)
    } else {
      standalone.push(s)
    }
  })

  const formattedGroups = Array.from(groups.entries()).map(([cottage, units]) => {
    return `${cottage} (${units.join(', ')})`
  })

  return [...formattedGroups, ...standalone].join(', ') || '-'
}

// ---------------------------------------------------------------------
// 2. PAYMENT FORM LOGIC  (Payment Mode / Amount Paid / Balance)
//    - Cash | Gpay | Card | Online  -> ONE mode only, amount = Amount Paid
//    - Multiple                     -> show Cash/Gpay/Card/Online boxes,
//                                      Amount Paid = sum of boxes (read-only)
//    - Amount paid 0                -> no payment rows, status PENDING
//    - Paid < total                 -> advance (PARTIAL), balance collected later
// ---------------------------------------------------------------------
export function computePayment({ mode, total, paid = 0, split = {} }) {
  total = Number(total) || 0
  let payments = []
  if (mode === 'MULTIPLE') {
    payments = MODES.map(m => ({ mode: m, amount: Number(split[m]) || 0 })).filter(x => x.amount > 0)
    if (payments.length < 2) return { error: 'Multiple needs at least two modes with an amount', payments: [] }
    paid = payments.reduce((a, b) => a + b.amount, 0)
  } else if (MODES.includes(mode)) {
    paid = Number(paid) || 0
    if (paid > 0) payments = [{ mode, amount: paid }]
  } else if (Number(paid) > 0) {
    return { error: 'Select a payment mode', payments: [] }
  }
  if (paid > total) return { error: 'Amount paid cannot be more than total amount', payments: [] }
  const balance = total - paid
  const status = paid <= 0 ? 'PENDING' : balance === 0 ? 'PAID' : 'PARTIAL'
  return { payments, paid, balance, status, error: null }
}

// ---------------------------------------------------------------------
// 3. API CALLS
// ---------------------------------------------------------------------
const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data }

export const getMyProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return unwrap(await supabase.from('profiles').select('*, hotels(*)').eq('id', user.id).single())
}

export const getRooms = (hotelId) =>
  supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_active', true)
    .then(({ data, error }) => {
      if (error) {
        return supabase.from('rooms').select('room_number, room_type').eq('hotel_id', hotelId).eq('is_active', true).order('room_number').then(unwrap)
      }
      return (data || []).sort((a, b) => {
        if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order
        if (a.sort_order != null) return -1
        if (b.sort_order != null) return 1
        return String(a.room_number || '').localeCompare(String(b.room_number || ''), undefined, { numeric: true })
      })
    })

export const getSources = () => supabase.from('booking_sources').select('name').eq('is_active', true).order('sort_order').then(unwrap)

// Check-in + GRC. Build payload as in the SQL comment.
export const createStay = (payload) => supabase.rpc('create_stay', { p: payload }).then(unwrap)   // -> {stay_id, grc_number}

// Home screen (active guests only)
export const getActiveStays = (hotelId) =>
  supabase.from('v_active_stays').select('*').eq('hotel_id', hotelId).order('current_checkout_at').then(unwrap)

// Extend (call as many times as needed)
export const extendStay = (stayId, p) => supabase.rpc('extend_stay', { p_stay: stayId, p }).then(unwrap)

// Collect remaining balance later (from Home or Report)
export const addBalancePayment = (stayId, payments, note = null) =>
  supabase.rpc('add_payment', { p_stay: stayId, p_payments: payments, p_note: note }).then(unwrap)

export const checkoutStay = (stayId, allowBalance = false) =>
  supabase.rpc('checkout_stay', { p_stay: stayId, p_allow_balance: allowBalance }).then(unwrap)

export const updateGuest = (stayId, p) => supabase.rpc('update_guest_details', { p_stay: stayId, p }).then(unwrap)

export const changeRooms = (stayId, rooms) =>
  supabase.rpc('change_stay_rooms', { p_stay: stayId, p_rooms: rooms }).then(unwrap)

export const getGrc = (stayId) => supabase.rpc('get_grc', { p_stay: stayId }).then(unwrap)

// Helper to convert UI filter state to named parameters for report RPCs
export const buildReportParams = (f = {}) => {
  let fromISO = null
  let toISO = null

  if (f.from && f.to) {
    fromISO = new Date(f.from + 'T00:00:00+05:30').toISOString()
    toISO = new Date(new Date(f.to + 'T00:00:00+05:30').getTime() + 86400000).toISOString()
  } else if (f.from && !f.to) {
    fromISO = new Date(f.from + 'T00:00:00+05:30').toISOString()
    toISO = new Date(new Date(f.from + 'T00:00:00+05:30').getTime() + 86400000).toISOString()
  } else if (!f.from && f.to) {
    fromISO = new Date(f.to + 'T00:00:00+05:30').toISOString()
    toISO = new Date(new Date(f.to + 'T00:00:00+05:30').getTime() + 86400000).toISOString()
  }

  return {
    p_hotel: f.hotel ?? null,
    p_from: fromISO,
    p_to: toISO,
    p_status: f.status ?? null,
    p_source: f.source ?? null,
    p_payment_mode: f.paymentMode ?? null,
    p_payment_status: f.paymentStatus ?? null,
    p_extended: f.extended ?? null,
    p_search: f.search ? f.search.trim() : null,
    p_room_category: f.roomCategory ?? null,
    p_date_basis: f.dateBasis ?? 'CHECKIN'
  }
}

// Report with filters + pagination. Page size selector: 25 / 50 / 100
export const getReport = (f = {}, page = 0, pageSize = 50) => {
  const fullParams = {
    ...buildReportParams(f),
    p_limit: pageSize,
    p_offset: page * pageSize
  }

  return supabase.rpc('report_stays', fullParams).then(unwrap).catch(err => {
    // If the deployed Postgres function does not accept p_room_category or p_date_basis yet,
    // fallback gracefully to the 11 original parameters so the screen NEVER crashes.
    console.warn('report_stays with extended params failed, falling back to base params:', err.message)
    const baseParams = {
      p_hotel: fullParams.p_hotel,
      p_from: fullParams.p_from,
      p_to: fullParams.p_to,
      p_status: fullParams.p_status,
      p_source: fullParams.p_source,
      p_payment_mode: fullParams.p_payment_mode,
      p_payment_status: fullParams.p_payment_status,
      p_extended: fullParams.p_extended,
      p_search: fullParams.p_search,
      p_limit: fullParams.p_limit,
      p_offset: fullParams.p_offset
    }
    return supabase.rpc('report_stays', baseParams).then(unwrap)
  })
}

// Report summary card metrics over all matching rows
export const getReportSummary = (f = {}) => {
  const params = buildReportParams(f)
  return supabase.rpc('report_summary', params).then(unwrap).catch(err => {
    // If report_summary RPC is not in this database migration, try base params
    const baseParams = {
      p_hotel: params.p_hotel,
      p_from: params.p_from,
      p_to: params.p_to,
      p_status: params.p_status,
      p_source: params.p_source,
      p_payment_mode: params.p_payment_mode,
      p_payment_status: params.p_payment_status,
      p_extended: params.p_extended,
      p_search: params.p_search
    }
    return supabase.rpc('report_summary', baseParams).then(unwrap).catch(() => null)
  })
}

// Report full dataset export for the whole filter (up to 5000 rows)
export const exportReport = (f = {}) => {
  const params = {
    ...buildReportParams(f),
    p_limit: 5000
  }
  return supabase.rpc('report_export', params).then(unwrap).catch(() => {
    // Graceful fallback to getReport with page=0, pageSize=5000
    return getReport(f, 0, 5000)
  })
}

// Admin dashboard
export const adminSummary = (fromDate, toDate, hotelId = null) =>
  supabase.rpc('admin_summary', { p_from: fromDate, p_to: toDate, p_hotel: hotelId }).then(unwrap)

// Admin room category summary table
export const adminRoomCategories = (fromDate, toDate, hotelId = null) =>
  supabase.rpc('admin_room_category_summary', { p_from: fromDate, p_to: toDate, p_hotel: hotelId }).then(unwrap)

// Live home screen: refresh when any stay changes + every minute (to drop expired guests)
export function watchActive(hotelId, onChange) {
  const reload = () => getActiveStays(hotelId).then(onChange).catch(console.error)
  reload()
  const ch = supabase.channel('active-' + hotelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stays', filter: `hotel_id=eq.${hotelId}` }, reload)
    .subscribe()
  const t = setInterval(reload, 60000)
  return () => { clearInterval(t); supabase.removeChannel(ch) }
}

// ---------------------------------------------------------------------
// 4. PRINT GRC  (same layout as the sample; works for any hotel + extensions)
//    usage:  await printGRC(stayId)       // from Home "Print GRC" or Report
// ---------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

export async function printGRC(stayId) {
  const d = unwrap(await supabase.rpc('get_grc', { p_stay: stayId }))
  if (!d) throw new Error('GRC not found')
  const { hotel: h, stay: s, segments, payments } = d

  const byMode = Object.fromEntries(MODES.map(m => [m, 0]))
  payments.forEach(p => { byMode[p.mode] += (p.kind === 'REFUND' ? -1 : 1) * Number(p.amount) })
  const modeText = s.payment_mode_summary === 'MULTIPLE' ? 'Multiple' :
                   s.payment_mode_summary ? s.payment_mode_summary.charAt(0) + s.payment_mode_summary.slice(1).toLowerCase() : '-'
  const nights = s.stay_type === 'HOURLY' ? `${s.hours} Hour(s)` :
                 Math.max(1, Math.round((new Date(s.current_checkout_at) - new Date(s.checkin_at)) / 864e5))

  const row = (k, v) => `<div class="r"><span class="k">${k}</span><span class="v">: ${v}</span></div>`
  const box = (k, v, cls = '') => `<div class="b ${cls}"><small>${k}</small><b>${v}</b></div>`

  const ext = (segments || []).filter(g => g.seq > 1)
  const extTable = ext.length ? `
    <div class="sec ext-sec"><div class="h">EXTENSION HISTORY</div>
      <table><tr><th>#</th><th>From</th><th>To</th><th>Source</th><th>Booking ID</th><th>Amount</th><th>Reason</th></tr>
      ${ext.map(g => `<tr><td>${g.seq - 1}</td><td>${fmtIST(g.from_at)}</td><td>${fmtIST(g.to_at)}</td>
        <td>${esc(g.booking_source || '-')}</td><td>${esc(g.booking_id || '-')}</td><td>${inr(g.amount)}</td><td>${esc(g.reason || '-')}</td></tr>`).join('')}
      </table></div>` : ''

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.grc_number)}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  *, *::before, *::after {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0;
    padding: 0;
    font-family: Georgia, 'Times New Roman', serif;
    color: #162a4d;
    background: #ffffff;
    font-size: 11.5px;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .outer-wrap {
    padding: 10mm;
    width: 210mm;
    box-sizing: border-box;
    margin: 0 auto;
  }
  .page {
    border: 1.5px solid #162a4d;
    padding: 16px 20px 14px;
    min-height: 277mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: #ffffff;
    position: relative;
  }
  .top {
    flex: 0 0 auto;
    border-top: 5px solid #b8893a;
    padding-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #162a4d;
    padding-bottom: 8px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .logo {
    width: 80px;
    height: 54px;
    object-fit: contain;
  }
  .title {
    text-align: center;
    flex: 1;
    padding: 0 10px;
  }
  .title h1 {
    margin: 0;
    font-size: 22px;
    letter-spacing: 2px;
    color: #162a4d;
  }
  .title small {
    color: #b8893a;
    letter-spacing: 3px;
    font-weight: bold;
    display: block;
    margin-top: 2px;
  }
  .grc {
    border: 1px solid #b8893a;
    border-radius: 4px;
    padding: 5px 12px;
    text-align: center;
    background: #faf8f5;
  }
  .grc small {
    display: block;
    color: #b8893a;
    letter-spacing: 2px;
    font-size: 8.5px;
    font-weight: bold;
  }
  .grc b {
    font-size: 14px;
    color: #162a4d;
    font-family: monospace;
  }
  h2.main-heading {
    flex: 0 0 auto;
    text-align: center;
    letter-spacing: 3px;
    margin: 10px 0 2px;
    font-size: 17px;
    color: #162a4d;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .sub-heading {
    flex: 0 0 auto;
    text-align: center;
    color: #b8893a;
    letter-spacing: 3px;
    font-size: 8.5px;
    font-weight: bold;
    margin-bottom: 8px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .grid {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .col > .sec {
    margin-bottom: 8px;
  }
  .sec {
    border: 1px solid #d9b96b;
    border-radius: 3px;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
    background: #ffffff;
  }
  .h {
    background: #162a4d !important;
    color: #ffffff !important;
    padding: 5px 8px;
    letter-spacing: 1.5px;
    font-weight: bold;
    font-size: 11px;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .body {
    padding: 3px 8px;
  }
  .r {
    display: flex;
    padding: 4px 0;
    border-bottom: 1px dotted #dcdcdc;
    font-size: 11px;
    align-items: baseline;
  }
  .r:last-child {
    border-bottom: none;
  }
  .k {
    flex: 0 0 44%;
    width: 44%;
    font-weight: bold;
    color: #162a4d;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .v {
    flex: 0 0 56%;
    width: 56%;
    font-weight: bold;
    color: #162a4d;
    word-break: break-word;
    padding-left: 2px;
  }
  .boxes {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    padding: 4px 6px;
    background: #faf8f5;
  }
  .b {
    border: 1px solid #d9b96b;
    border-radius: 3px;
    text-align: center;
    padding: 3px 2px;
    background: #ffffff;
  }
  .b small {
    display: block;
    font-size: 7.5px;
    color: #b8893a;
    letter-spacing: 0.5px;
    font-weight: bold;
  }
  .b b {
    font-size: 11.5px;
    font-feature-settings: 'tnum';
    font-variant-numeric: tabular-nums;
  }
  .paid {
    color: #0a7a3d !important;
  }
  .due {
    color: #b3261e !important;
  }
  .purpose-sec {
    flex: 0 0 auto;
    margin-top: 6px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .ext-sec {
    flex: 0 0 auto;
    margin-top: 6px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .terms-sec {
    flex: 0 0 auto;
    margin-top: 6px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .terms {
    list-style: square;
    margin: 4px 0;
    padding: 0 12px 4px 22px;
    line-height: 1.55;
    font-size: 10.5px;
    color: #2b3a55;
  }
  .terms li {
    margin-bottom: 2px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  th, td {
    border: 1px solid #d9b96b;
    padding: 3px 5px;
    text-align: left;
  }
  th {
    background: #f6efdc !important;
    font-weight: bold;
    color: #162a4d;
  }
  /* Vertical flexible spacer pushes signature and footer to page bottom */
  .vertical-spacer {
    flex: 1 1 auto;
    min-height: 14px;
  }
  /* Signature and Footer block stays together and never splits */
  .bottom-cluster {
    flex: 0 0 auto;
    break-inside: avoid;
    page-break-inside: avoid;
    margin-top: auto;
  }
  .sign {
    display: flex;
    justify-content: space-between;
    padding: 0 14px;
    margin-top: 8px;
  }
  .sign-col {
    width: 42%;
    display: flex;
    flex-direction: column;
    text-align: center;
  }
  .sign-blank {
    height: 24mm;
    min-height: 22mm;
  }
  .sign-line {
    border-top: 1.5px solid #162a4d;
    padding-top: 4px;
    font-weight: bold;
    font-size: 11px;
    color: #162a4d;
  }
  .sign-name {
    font-weight: normal;
    font-size: 9.5px;
    color: #444;
    margin-top: 1px;
  }
  .foot {
    margin-top: 8mm;
    border-top: 1px solid #b8893a;
    text-align: center;
    color: #666;
    font-size: 8.5px;
    padding-top: 4px;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
<div class="outer-wrap">
  <div class="page">
    <div class="top">
      <img class="logo" src="${esc(new URL(logoImg, window.location.href).href)}" alt="Logo">
      <div class="title">
        <h1>${esc(h.name.toUpperCase())}</h1>
        <small>${esc(h.code)}</small>
      </div>
      <div class="grc">
        <small>GRC NUMBER</small>
        <b>${esc(s.grc_number)}</b>
      </div>
    </div>

    <h2 class="main-heading">GUEST REGISTRATION CARD</h2>
    <div class="sub-heading">GUEST REGISTRATION &amp; STAY RECORD</div>

    <div class="grid">
      <div class="col">
        <div class="sec">
          <div class="h">GUEST INFORMATION</div>
          <div class="body">
            ${row('Guest Name', esc(s.guest_name))}
            ${row('Mobile Number', esc(s.mobile))}
            ${row('Guest Address', esc(s.address || '-'))}
            ${row('ID Proof Details', esc(s.id_proof_type || '-'))}
            ${row('ID Proof Number', esc(s.id_proof_number || '-'))}
          </div>
        </div>

        <div class="sec">
          <div class="h">PAYMENT INFORMATION</div>
          <div class="body">
            ${row('Payment Mode', esc(modeText))}
          </div>
          <div class="boxes">
            ${box('CASH', inr(byMode.CASH))}
            ${box('GPAY', inr(byMode.GPAY))}
            ${box('CARD', inr(byMode.CARD))}
            ${box('ONLINE', inr(byMode.ONLINE))}
          </div>
          <div class="boxes">
            ${box('TOTAL AMOUNT', inr(s.total_amount))}
            ${box('AMOUNT PAID', inr(s.total_paid))}
            ${box('BALANCE', inr(s.balance), Number(s.balance) > 0 ? 'due' : '')}
            ${box('STATUS', s.payment_status, s.payment_status === 'PAID' ? 'paid' : 'due')}
          </div>
        </div>
      </div>

      <div class="col">
        <div class="sec">
          <div class="h">BOOKING &amp; STAY INFORMATION</div>
          <div class="body">
            ${row('Booking Source', esc(s.booking_source || '-'))}
            ${row('Booking ID', esc(s.booking_id || '-'))}
            ${row('Room Number', esc(formatRooms(s.room_numbers)))}
            ${s.room_category ? row('Room Type', esc(s.room_category)) : ''}
            ${row('Number of Rooms', s.number_of_rooms)}
            ${row('Number of Guests', s.number_of_guests)}
            ${row(s.stay_type === 'HOURLY' ? 'Stay Duration' : 'Number of Nights', nights)}
            ${row('Check-in Time', fmtIST(s.checkin_at))}
            ${row('Original Check-out', fmtIST(s.original_checkout_at))}
            ${row('Current Check-out', fmtIST(s.current_checkout_at))}
          </div>
        </div>

        <div class="sec">
          <div class="h">RECORD INFORMATION</div>
          <div class="body">
            ${row('Stay Status', esc(s.status.replace('_', ' ')))}
            ${row('Created At', fmtIST(s.created_at))}
          </div>
        </div>
      </div>
    </div>

    <div class="sec purpose-sec">
      <div class="h">PURPOSE OF VISIT</div>
      <div class="body">
        <b>${esc(s.purpose_of_visit || '-')}</b>
      </div>
    </div>

    ${extTable}

    <div class="sec terms-sec">
      <div class="h">TERMS &amp; CONDITIONS</div>
      <ul class="terms">
        ${(h.terms || []).map(t => `<li>${esc(t)}</li>`).join('')}
      </ul>
    </div>

    <div class="vertical-spacer"></div>

    <div class="bottom-cluster">
      <div class="sign">
        <div class="sign-col">
          <div class="sign-blank"></div>
          <div class="sign-line">Guest Signature</div>
          <div class="sign-name">(${esc(s.guest_name)})</div>
        </div>
        <div class="sign-col">
          <div class="sign-blank"></div>
          <div class="sign-line">Front Desk Signature</div>
          ${s.receptionist_name ? `<div class="sign-name">(${esc(s.receptionist_name)})</div>` : ''}
        </div>
      </div>

      <div class="foot">
        ${esc(h.name)} - ${esc(h.code)} &nbsp;|&nbsp; Guest Registration Card &nbsp;|&nbsp; ${esc(s.grc_number)}
      </div>
    </div>
  </div>
</div>
</body></html>`

  // Print through a hidden iframe (no popup blocker issues)
  const f = document.createElement('iframe')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(f)
  f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close()
  await Promise.all([...f.contentDocument.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r })))
  f.contentWindow.focus(); f.contentWindow.print()
  setTimeout(() => f.remove(), 2000)
}
