// =====================================================================
//  STARLIGHT HOTELS - CLIENT INTEGRATION (supabase-js v2)
//  Works with starlight_schema.sql
// =====================================================================
import logoImg from '../assets/logo.png'
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
export const getRooms = (hotelId) => supabase.from('rooms').select('room_number, room_type').eq('hotel_id', hotelId).eq('is_active', true).order('room_number').then(unwrap)
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

// Report with filters + pagination.  filters: {hotel, from, to, status, source, paymentMode, paymentStatus, extended, search}
export const getReport = (f = {}, page = 0, pageSize = 50) =>
  supabase.rpc('report_stays', {
    p_hotel: f.hotel ?? null, p_from: f.from ?? null, p_to: f.to ?? null,
    p_status: f.status ?? 'CHECKED_OUT', p_source: f.source ?? null,
    p_payment_mode: f.paymentMode ?? null, p_payment_status: f.paymentStatus ?? null,
    p_extended: f.extended ?? null, p_search: f.search ?? null,
    p_limit: pageSize, p_offset: page * pageSize
  }).then(unwrap)          // each row has total_count for the pager

// Admin dashboard
export const adminSummary = (fromDate, toDate, hotelId = null) =>
  supabase.rpc('admin_summary', { p_from: fromDate, p_to: toDate, p_hotel: hotelId }).then(unwrap)

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

  const ext = segments.filter(g => g.seq > 1)
  const extTable = ext.length ? `
    <div class="sec"><div class="h">EXTENSION HISTORY</div>
      <table><tr><th>#</th><th>From</th><th>To</th><th>Source</th><th>Booking ID</th><th>Amount</th><th>Reason</th></tr>
      ${ext.map(g => `<tr><td>${g.seq - 1}</td><td>${fmtIST(g.from_at)}</td><td>${fmtIST(g.to_at)}</td>
        <td>${esc(g.booking_source || '-')}</td><td>${esc(g.booking_id || '-')}</td><td>${inr(g.amount)}</td><td>${esc(g.reason || '-')}</td></tr>`).join('')}
      </table></div>` : ''

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.grc_number)}</title>
<style>
  @page{size:A4;margin:10mm}
  *{box-sizing:border-box} body{font-family:Georgia,'Times New Roman',serif;color:#162a4d;margin:0;font-size:12.5px}
  .page{border:1px solid #162a4d;padding:22px 24px;min-height:275mm;position:relative}
  .top{border-top:5px solid #b8893a;padding-top:14px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #162a4d;padding-bottom:10px}
  .logo{width:80px;height:60px;object-fit:contain}
  .title{text-align:center;flex:1} .title h1{margin:0;font-size:24px;letter-spacing:2px} .title small{color:#b8893a;letter-spacing:3px;font-weight:bold}
  .grc{border:1px solid #b8893a;border-radius:4px;padding:6px 14px;text-align:center} .grc small{display:block;color:#b8893a;letter-spacing:2px;font-size:9px;font-weight:bold} .grc b{font-size:15px}
  h2{text-align:center;letter-spacing:3px;margin:14px 0 2px;font-size:20px} .sub{text-align:center;color:#b8893a;letter-spacing:3px;font-size:9px;font-weight:bold;margin-bottom:10px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px} .col>.sec{margin-bottom:10px}
  .sec{border:1px solid #d9b96b;border-radius:3px;overflow:hidden} .h{background:#162a4d;color:#fff;padding:7px 10px;letter-spacing:2px;font-weight:bold;font-size:12px}
  .body{padding:4px 10px} .r{display:flex;padding:5px 0;border-bottom:1px dotted #ccc} .k{width:36%;font-weight:bold} .v{flex:1;font-weight:bold}
  .boxes{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:6px 8px}
  .b{border:1px solid #d9b96b;border-radius:3px;text-align:center;padding:4px 2px} .b small{display:block;font-size:8px;color:#b8893a;letter-spacing:1px;font-weight:bold} .b b{font-size:13px}
  .paid{color:#0a7a3d} .due{color:#b3261e}
  .terms{list-style:square;margin:6px 0;padding:0 14px 6px 28px;line-height:1.7;font-size:11.5px}
  table{width:100%;border-collapse:collapse;font-size:11px} th,td{border:1px solid #d9b96b;padding:4px 6px;text-align:left} th{background:#f6efdc}
  .sign{display:flex;justify-content:space-between;margin-top:70px;padding:0 10px} .sign div{width:40%;border-top:2px solid #162a4d;text-align:center;padding-top:5px;font-weight:bold}
  .foot{position:absolute;left:24px;right:24px;bottom:12px;border-top:1px solid #b8893a;text-align:center;color:#888;font-size:9px;padding-top:5px}
</style></head><body><div class="page">
  <div class="top">
    <img class="logo" src="${esc(new URL(logoImg, window.location.href).href)}">
    <div class="title"><h1>${esc(h.name.toUpperCase())}</h1><small>${esc(h.code)}</small></div>
    <div class="grc"><small>GRC NUMBER</small><b>${esc(s.grc_number)}</b></div>
  </div>
  <h2>GUEST REGISTRATION CARD</h2><div class="sub">GUEST REGISTRATION &amp; STAY RECORD</div>

  <div class="grid">
    <div class="col">
      <div class="sec"><div class="h">GUEST INFORMATION</div><div class="body">
        ${row('Guest Name', esc(s.guest_name))}${row('Mobile Number', esc(s.mobile))}${row('Guest Address', esc(s.address || '-'))}
        ${row('ID Proof Details', esc(s.id_proof_type || '-'))}${row('ID Proof Number', esc(s.id_proof_number || '-'))}
      </div></div>
      <div class="sec"><div class="h">PAYMENT INFORMATION</div><div class="body">${row('Payment Mode', esc(modeText))}</div>
        <div class="boxes">${box('CASH', inr(byMode.CASH))}${box('GPAY', inr(byMode.GPAY))}${box('CARD', inr(byMode.CARD))}${box('ONLINE', inr(byMode.ONLINE))}</div>
        <div class="boxes">${box('TOTAL AMOUNT', inr(s.total_amount))}${box('AMOUNT PAID', inr(s.total_paid))}
          ${box('BALANCE', inr(s.balance), Number(s.balance) > 0 ? 'due' : '')}${box('STATUS', s.payment_status, s.payment_status === 'PAID' ? 'paid' : 'due')}</div>
      </div>
    </div>
    <div class="col">
      <div class="sec"><div class="h">BOOKING &amp; STAY INFORMATION</div><div class="body">
        ${row('Booking Source', esc(s.booking_source || '-'))}${row('Booking ID', esc(s.booking_id || '-'))}
        ${row('Room Number', esc((s.room_numbers || []).join(', ')))}${row('Number of Rooms', s.number_of_rooms)}
        ${row('Number of Guests', s.number_of_guests)}${row(s.stay_type === 'HOURLY' ? 'Stay Duration' : 'Number of Nights', nights)}
        ${row('Check-in Time', fmtIST(s.checkin_at))}${row('Original Check-out', fmtIST(s.original_checkout_at))}
        ${row('Current Check-out', fmtIST(s.current_checkout_at))}
      </div></div>
      <div class="sec"><div class="h">RECORD INFORMATION</div><div class="body">
        ${row('Stay Status', esc(s.status.replace('_', ' ')))}${row('Created At', fmtIST(s.created_at))}
      </div></div>
    </div>
  </div>

  <div class="sec" style="margin-top:10px"><div class="h">PURPOSE OF VISIT</div><div class="body"><b>${esc(s.purpose_of_visit || '-')}</b></div></div>
  ${extTable ? `<div style="margin-top:10px">${extTable}</div>` : ''}
  <div class="sec" style="margin-top:10px"><div class="h">TERMS &amp; CONDITIONS</div>
    <ul class="terms">${(h.terms || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>

  <div class="sign"><div>Guest Signature</div><div>Front Desk Signature${s.receptionist_name ? `<br><small style="font-weight:normal">(${esc(s.receptionist_name)})</small>` : ''}</div></div>
  <div class="foot">${esc(h.name)} • ${esc(h.code)} &nbsp;|&nbsp; Guest Registration Card &nbsp;|&nbsp; ${esc(s.grc_number)}</div>
</div></body></html>`

  // Print through a hidden iframe (no popup blocker issues)
  const f = document.createElement('iframe')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(f)
  f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close()
  await Promise.all([...f.contentDocument.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r })))
  f.contentWindow.focus(); f.contentWindow.print()
  setTimeout(() => f.remove(), 2000)
}

// ---------------------------------------------------------------------
// 5. QUICK USAGE
// ---------------------------------------------------------------------
// CHECK-IN
//   const pay = computePayment({ mode:'ONLINE', total:1843, paid:1843 })
//   if (pay.error) return alert(pay.error)
//   const { stay_id } = await createStay({
//     hotel_id, guest_name, mobile, address, id_proof_type:'Aadhaar Card', id_proof_number,
//     purpose_of_visit, booking_source:'Goibibo', booking_id, number_of_guests:1,
//     room_numbers:['203'], stay_type:'NIGHTLY', nights:1, total_amount:1843, payments: pay.payments })
//   await printGRC(stay_id)
//
// HOURLY CHECK-IN:  stay_type:'HOURLY', hours:3   (checkout = now + 3h)
//
// EXTEND (2nd, 3rd... time is the same call)
//   await extendStay(stayId, { new_checkout: fromISTInput(inputValue), reason, booking_source:'Walk-in',
//        number_of_rooms:1, number_of_guests:1, amount:1500,
//        payments: computePayment({ mode:'MULTIPLE', total:1500, split:{CASH:500, GPAY:500} }).payments })
//
// COLLECT BALANCE LATER:  await addBalancePayment(stayId, [{ mode:'CASH', amount:300 }])
// CHECKOUT:               await checkoutStay(stayId)   // asks to confirm if balance pending
