import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import * as L from './lib/starlight'
import logo from './assets/favicon.png'

const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN')
const MODES = ['CASH', 'GPAY', 'CARD', 'ONLINE']
const ROOM_CATEGORIES = ['Deluxe Room', '1 BHK', '2 BHK', '3 BHK', '5 BHK']

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

const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
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
// REUSABLE ACCESSIBLE DROPDOWN COMPONENT (Section A)
// Button + popover panel, search box inside, max-height ~260px with small scroll,
// closes on outside click / Esc / selection (single), keyboard up/down/enter,
// aria-expanded/aria-controls, error state, bottom sheet on screens < 640px.
// ---------------------------------------------------------------------
function Dropdown({
  id,
  label,
  required,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  multiple = false,
  searchable = true,
  error = false,
  errorMsg = '',
  disabled = false,
  className = ''
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [isMobile, setIsMobile] = useState(false)
  const wrapRef = useRef(null)
  const searchInputRef = useRef(null)
  const listRef = useRef(null)

  // Track viewport width for bottom sheet on mobile (< 640px)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClickOutside = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Focus search input when opened
  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
    if (!open) {
      setSearch('')
      setHighlightIdx(-1)
    }
  }, [open, searchable])

  // Normalize options: allow array of strings or objects { value, label, tag, isOccupied }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'string') return { value: opt, label: opt }
    return opt
  })

  // Filter options by search
  const filteredOptions = normalizedOptions.filter(opt => {
    if (!search.trim()) return true
    return String(opt.label || opt.value || '').toLowerCase().includes(search.toLowerCase())
  })

  // Selected values array
  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : [])

  // Format button text
  let buttonText = placeholder
  if (!multiple) {
    const selectedOpt = normalizedOptions.find(o => o.value === value)
    if (selectedOpt) buttonText = selectedOpt.label
  } else {
    if (selectedValues.length === 1) {
      const match = normalizedOptions.find(o => o.value === selectedValues[0])
      buttonText = match ? match.label : selectedValues[0]
    } else if (selectedValues.length > 1) {
      buttonText = `${selectedValues.length} selected`
    }
  }

  const handleToggle = () => {
    if (disabled) return
    setOpen(v => !v)
  }

  const handleSelect = optValue => {
    if (multiple) {
      const next = selectedValues.includes(optValue)
        ? selectedValues.filter(v => v !== optValue)
        : [...selectedValues, optValue]
      onChange(next)
    } else {
      onChange(optValue)
      setOpen(false)
    }
  }

  // Keyboard navigation
  const handleKeyDown = e => {
    if (disabled) return
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(idx => (idx + 1 < filteredOptions.length ? idx + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(idx => (idx - 1 >= 0 ? idx - 1 : filteredOptions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIdx >= 0 && highlightIdx < filteredOptions.length) {
        handleSelect(filteredOptions[highlightIdx].value)
      }
    }
  }

  const listboxId = id ? `${id}-listbox` : undefined

  return (
    <div className={`custom-dropdown-wrap ${className}`} ref={wrapRef} id={id}>
      {label && (
        <label style={{ marginBottom: 5 }}>
          <span>
            {label} {required && <span className="required-star">*</span>}
          </span>
        </label>
      )}

      <button
        type="button"
        className={`dropdown-btn ${error ? 'has-error' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <span className={`dropdown-btn-text ${!selectedValues.length ? 'dropdown-placeholder' : ''}`}>
          {buttonText}
        </span>
        <span className="dropdown-chevron">
          <IconChevronDown />
        </span>
      </button>

      {errorMsg && (
        <div className="field-error-msg">
          <IconAlertCircle /> {errorMsg}
        </div>
      )}

      {open && (
        <>
          {isMobile && (
            <div className="dropdown-mobile-backdrop" onClick={() => setOpen(false)} />
          )}
          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable={multiple ? 'true' : 'false'}
            className={`dropdown-panel ${isMobile ? 'dropdown-panel-mobile-sheet' : ''}`}
          >
            {isMobile && (
              <>
                <div className="dropdown-sheet-handle" />
                <div className="dropdown-sheet-header">
                  <span>{label || placeholder}</span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    style={{ minHeight: 'auto', padding: '2px 8px', border: 'none' }}
                    onClick={() => setOpen(false)}
                  >
                    ✕
                  </button>
                </div>
              </>
            )}

            {searchable && (
              <div className="dropdown-search-wrap">
                <IconSearch />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="dropdown-search-input"
                  placeholder="Search options..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value)
                    setHighlightIdx(0)
                  }}
                  onKeyDown={handleKeyDown}
                />
              </div>
            )}

            <ul className="dropdown-options-list" ref={listRef}>
              {filteredOptions.length === 0 ? (
                <li style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--status-neutral)', fontSize: 12.5 }}>
                  No matching options
                </li>
              ) : (
                filteredOptions.map((opt, i) => {
                  const isSelected = selectedValues.includes(opt.value)
                  const isHighlighted = i === highlightIdx
                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      className={`dropdown-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                      onClick={() => handleSelect(opt.value)}
                    >
                      <div className="dropdown-option-left">
                        {multiple && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            style={{ cursor: 'pointer', accentColor: 'var(--gold-600)', margin: 0 }}
                          />
                        )}
                        <span className="dropdown-option-text">{opt.label}</span>
                      </div>
                      {opt.tag && (
                        <span className={`occupancy-tag ${opt.isOccupied ? 'occupied' : ''}`}>
                          {opt.tag}
                        </span>
                      )}
                      {!multiple && isSelected && (
                        <span style={{ color: 'var(--gold-600)', display: 'flex', alignItems: 'center' }}>
                          <IconCheck />
                        </span>
                      )}
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// REUSABLE ROOM PICKER (Multiple rooms / villas per guest across categories)
// 1. Room Category * dropdown (Deluxe Room | 1 BHK | 2 BHK | 3 BHK | 5 BHK).
//    Changing it only controls which list is shown below. It does NOT clear sel.
// 2. Deluxe Room: "Cottage *" searchable single-select -> "Room(s) *" multi-select with checkboxes.
//    Selections from different cottages are kept together.
// 3. 1 BHK / 2 BHK / 3 BHK / 5 BHK: "Villa(s) *" searchable MULTI-select dropdown with checkboxes.
//    Ticking adds villa label to sel, unticking removes it. Panel stays open while ticking.
// 4. Removable chips with category pill (navy for BHK, gold for Deluxe) + "Clear all" link.
// 5. One summary line grouped by category, e.g. "2 BHK: Harsha Cottage, MS Cottage | 3 BHK: Sai Cottage | Deluxe: Yellow (101, 102)".
// 6. In-use occupancy hints as grey tags (non-blocking).
// ---------------------------------------------------------------------
function RoomPicker({ rooms = [], sel = [], setSel, occupied = [], error, initialCategory = '' }) {
  // Helper to extract cottage name & unit number from a room row
  const getCottage = r => r.cottage_name || (r.room_number.includes(' - ') ? r.room_number.split(' - ')[0].trim() : r.room_number.trim())
  const getUnit = r => r.unit_no || (r.room_number.includes(' - ') ? r.room_number.split(' - ').slice(1).join(' - ').trim() : '')

  // Determine initial category tab
  const [category, setCategory] = useState(() => {
    if (initialCategory && ROOM_CATEGORIES.includes(initialCategory)) return initialCategory
    if (sel.length > 0) {
      const match = rooms.find(r => r.room_number === sel[0])
      if (match && ROOM_CATEGORIES.includes(match.room_type)) return match.room_type
    }
    return 'Deluxe Room'
  })

  // Occupancy helpers
  const activeRoomsSet = new Set()
  occupied.filter(s => s.status === 'ACTIVE').forEach(s => {
    (s.room_numbers || []).forEach(rm => activeRoomsSet.add(rm))
  })

  const getDeluxeRoomOccupancy = (roomNumber, cottageName) => {
    if (activeRoomsSet.has(roomNumber) || activeRoomsSet.has(cottageName)) {
      return { tag: 'In use', isOccupied: true }
    }
    return {}
  }

  const getCottageOccupancyForDeluxe = cottageName => {
    if (activeRoomsSet.has(cottageName)) {
      return { tag: 'Occupied', isOccupied: true }
    }
    const inUseCount = [...activeRoomsSet].filter(lbl => lbl.startsWith(cottageName + ' - ')).length
    if (inUseCount > 0) {
      return { tag: `${inUseCount} room(s) in use`, isOccupied: true }
    }
    return {}
  }

  const getBhkCottageOccupancy = (roomNumber, cottageName) => {
    if (activeRoomsSet.has(roomNumber)) {
      return { tag: 'Occupied', isOccupied: true }
    }
    const inUseCount = [...activeRoomsSet].filter(lbl => lbl.startsWith(cottageName + ' - ')).length
    if (inUseCount > 0) {
      return { tag: `${inUseCount} room(s) in use`, isOccupied: true }
    }
    return {}
  }

  // Changing category controls view only; MUST NOT clear sel
  const handleCategoryChange = newCat => {
    if (newCat !== category) {
      setCategory(newCat)
    }
  }

  // Deluxe Room setup
  const deluxeRooms = rooms.filter(r => (r.room_type || '').toLowerCase() === 'deluxe room')
  const deluxeCottages = Array.from(new Set(deluxeRooms.map(getCottage))).filter(Boolean).sort()

  const [selectedCottage, setSelectedCottage] = useState(() => {
    if (sel.length > 0) {
      const match = deluxeRooms.find(r => r.room_number === sel[0])
      if (match) return getCottage(match)
    }
    return deluxeCottages[0] || ''
  })

  // Keep selectedCottage valid if list changes
  useEffect(() => {
    if (category === 'Deluxe Room' && (!selectedCottage || !deluxeCottages.includes(selectedCottage))) {
      setSelectedCottage(deluxeCottages[0] || '')
    }
  }, [category, rooms])

  const currentCottageRooms = selectedCottage
    ? deluxeRooms.filter(r => getCottage(r) === selectedCottage)
    : []

  // Deluxe Room multi-select in current cottage
  const currentCottageSelected = sel.filter(lbl => currentCottageRooms.some(r => r.room_number === lbl))

  const handleDeluxeRoomsChange = newRoomLabels => {
    // Preserve chosen rooms from other cottages & BHK categories, update for current cottage
    const otherSel = sel.filter(lbl => !currentCottageRooms.some(r => r.room_number === lbl))
    setSel([...otherSel, ...newRoomLabels])
  }

  // BHK setup: villas of the current BHK category
  const currentBhkVillas = rooms.filter(r => (r.room_type || '').toLowerCase() === category.toLowerCase())
  const bhkVillaOptions = currentBhkVillas.map(r => {
    const cName = getCottage(r)
    const occ = getBhkCottageOccupancy(r.room_number, cName)
    return {
      value: r.room_number,
      label: cName,
      tag: occ.tag,
      isOccupied: occ.isOccupied
    }
  }).sort((a, b) => a.label.localeCompare(b.label))

  // In BHK category, current category selected values
  const currentBhkSelected = sel.filter(lbl => currentBhkVillas.some(r => r.room_number === lbl))

  const handleBhkVillasChange = newVillaLabels => {
    // Preserve chosen items from other categories/cottages, update for current category
    const otherSel = sel.filter(lbl => !currentBhkVillas.some(r => r.room_number === lbl))
    setSel([...otherSel, ...newVillaLabels])
  }

  // Removing a chip
  const handleRemoveChip = rm => {
    setSel(sel.filter(x => x !== rm))
  }

  // Clear all selections
  const handleClearAll = () => {
    setSel([])
  }

  // Helper to get category for any selected item
  const getItemCategory = lbl => {
    const match = rooms.find(r => r.room_number === lbl)
    if (match && match.room_type) return match.room_type
    if (lbl.includes(' - ')) return 'Deluxe Room'
    return '1 BHK'
  }

  // Build grouped summary line, e.g. "2 BHK: Harsha Cottage, MS Cottage | 3 BHK: Sai Cottage | Deluxe: Yellow (101, 102)"
  const summaryParts = []
  ROOM_CATEGORIES.forEach(cat => {
    const itemsInCat = sel.filter(lbl => getItemCategory(lbl) === cat)
    if (itemsInCat.length > 0) {
      const displayLabel = cat === 'Deluxe Room' ? 'Deluxe' : cat
      const formatted = L.formatRooms(itemsInCat)
      summaryParts.push(`${displayLabel}: ${formatted}`)
    }
  })
  // Handle any items whose category wasn't in ROOM_CATEGORIES
  const knownCatItems = new Set(ROOM_CATEGORIES.flatMap(cat => sel.filter(lbl => getItemCategory(lbl) === cat)))
  const leftover = sel.filter(lbl => !knownCatItems.has(lbl))
  if (leftover.length > 0) {
    summaryParts.push(`Other: ${L.formatRooms(leftover)}`)
  }
  const summaryText = summaryParts.join(' | ')

  return (
    <div className="room-picker-container" id="field-room_numbers">
      <div className="room-picker-row">
        {/* 1. Room Category dropdown */}
        <div className="room-picker-col">
          <Dropdown
            id="room-category-dropdown"
            label="Room Category"
            required
            value={category}
            onChange={handleCategoryChange}
            options={ROOM_CATEGORIES.map(c => ({ value: c, label: c }))}
            placeholder="Select Category"
            searchable={false}
            error={Boolean(error && !sel.length)}
          />
        </div>

        {/* 2. Deluxe Room: Cottage dropdown + Room(s) multi-select dropdown */}
        {category === 'Deluxe Room' ? (
          <>
            <div className="room-picker-col">
              <Dropdown
                id="deluxe-cottage-dropdown"
                label="Cottage"
                required
                value={selectedCottage}
                onChange={setSelectedCottage}
                options={deluxeCottages.map(c => {
                  const occ = getCottageOccupancyForDeluxe(c)
                  return {
                    value: c,
                    label: c,
                    tag: occ.tag,
                    isOccupied: occ.isOccupied
                  }
                })}
                placeholder="Select Cottage"
                searchable={true}
                error={Boolean(error && !sel.length && !selectedCottage)}
              />
            </div>
            <div className="room-picker-col">
              <Dropdown
                id="deluxe-rooms-dropdown"
                label="Room(s)"
                required
                multiple={true}
                value={currentCottageSelected}
                onChange={handleDeluxeRoomsChange}
                options={currentCottageRooms.map(r => {
                  const occ = getDeluxeRoomOccupancy(r.room_number, selectedCottage)
                  return {
                    value: r.room_number,
                    label: getUnit(r) || r.room_number,
                    tag: occ.tag,
                    isOccupied: occ.isOccupied
                  }
                })}
                placeholder={selectedCottage ? 'Select Room(s)...' : 'Select Cottage First'}
                searchable={true}
                disabled={!selectedCottage}
                error={Boolean(error && !sel.length)}
              />
            </div>
          </>
        ) : (
          /* 3. BHK categories: Villa(s) multi-select dropdown with checkboxes */
          <div className="room-picker-col" style={{ flex: '2 1 340px' }}>
            <Dropdown
              id="bhk-villa-dropdown"
              label="Villa(s)"
              required
              multiple={true}
              value={currentBhkSelected}
              onChange={handleBhkVillasChange}
              options={bhkVillaOptions}
              placeholder={`Select ${category} Villa(s)...`}
              searchable={true}
              error={Boolean(error && !sel.length)}
            />
          </div>
        )}
      </div>

      {/* 4. Removable chips with category pill + Clear all link */}
      {sel.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Selected ({sel.length})
            </span>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleClearAll}
              style={{
                fontSize: 11.5,
                padding: '2px 6px',
                minHeight: 'auto',
                color: 'var(--status-due)',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear all
            </button>
          </div>
          <div className="room-chips-container">
            {sel.map(lbl => {
              const cat = getItemCategory(lbl)
              const isBhk = cat.includes('BHK')
              return (
                <span key={lbl} className="room-chip">
                  <span className={`pill ${isBhk ? 'badge-navy' : 'badge-gold'}`} style={{ fontSize: 10, padding: '1px 6px', lineHeight: 1.2 }}>
                    {cat === 'Deluxe Room' ? 'Deluxe' : cat}
                  </span>
                  <span>{lbl}</span>
                  <button
                    type="button"
                    className="room-chip-remove"
                    onClick={() => handleRemoveChip(lbl)}
                    title={`Remove ${lbl}`}
                    aria-label={`Remove ${lbl}`}
                  >
                    ✕
                  </button>
                </span>
              )
            })}
          </div>

          {/* Grouped summary line */}
          {summaryText && (
            <div className="room-picker-summary" style={{ marginTop: 8 }}>
              <b>Summary:</b> {summaryText}
            </div>
          )}
        </div>
      )}

      {error && !sel.length && (
        <div className="field-error-msg">
          <IconAlertCircle /> {error}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// PAYMENT COMPONENT (Pay)
// ---------------------------------------------------------------------
function Pay({ total, pay, setPay, error }) {
  const r = L.computePayment({ mode: pay.mode, total, paid: pay.paid, split: pay.split })
  const touched = pay.mode || pay.paid || Object.values(pay.split).some(Boolean)
  const modesList = ['GPAY', 'CARD', 'CASH', 'ONLINE', 'MULTIPLE']

  return (
    <div className="card pay-component" id="field-payment">
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginBottom: 6 }}>
          <span>Payment Mode {Number(pay.paid) > 0 && <span className="required-star">*</span>}</span>
        </label>
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
        {error && (
          <div className="field-error-msg" style={{ marginTop: 6 }}>
            <IconAlertCircle /> {error}
          </div>
        )}
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
// LOGIN SCREEN (Split Screen Luxury Hero + Clean Form with Validation)
// ---------------------------------------------------------------------
function Login() {
  const [f, setF] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [backendError, setBackendError] = useState('')

  const validate = () => {
    const errs = {}
    if (!f.email.trim()) errs.email = 'Please enter your email'
    if (!f.password) errs.password = 'Please enter your password'
    return errs
  }

  const go = async () => {
    setTouched(true)
    setBackendError('')
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      const first = Object.keys(errs)[0]
      document.getElementById('login-' + first)?.focus()
      return
    }

    setBusy(true)
    try {
      const { error } = await L.supabase.auth.signInWithPassword({
        email: f.email.trim(),
        password: f.password
      })
      if (error) {
        setBackendError(error.message || 'Login failed. Please check your credentials.')
        toast(error)
      }
    } catch (e) {
      setBackendError(e.message || 'An unexpected error occurred.')
      toast(e)
    } finally {
      setBusy(false)
    }
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

          {backendError && (
            <div className="form-error-banner backend-error" role="alert">
              <IconAlertCircle /> {backendError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label>
              <span>Email Address <span className="required-star">*</span></span>
              <input
                id="login-email"
                type="email"
                className={errors.email ? 'has-error' : ''}
                placeholder="reception@starlighthotels.com"
                value={f.email}
                onChange={e => {
                  setF({ ...f, email: e.target.value })
                  if (touched) setErrors({ ...errors, email: e.target.value.trim() ? '' : 'Please enter your email' })
                }}
                onBlur={() => {
                  if (touched) setErrors({ ...errors, email: f.email.trim() ? '' : 'Please enter your email' })
                }}
              />
              {errors.email && <div className="field-error-msg"><IconAlertCircle /> {errors.email}</div>}
            </label>

            <label>
              <span>Password <span className="required-star">*</span></span>
              <div className="password-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={errors.password ? 'has-error' : ''}
                  placeholder="••••••••••••"
                  value={f.password}
                  onChange={e => {
                    setF({ ...f, password: e.target.value })
                    if (touched) setErrors({ ...errors, password: e.target.value ? '' : 'Please enter your password' })
                  }}
                  onBlur={() => {
                    if (touched) setErrors({ ...errors, password: f.password ? '' : 'Please enter your password' })
                  }}
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
              {errors.password && <div className="field-error-msg"><IconAlertCircle /> {errors.password}</div>}
            </label>

            <button
              className="btn-primary"
              style={{ marginTop: 8, height: 42 }}
              disabled={busy}
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
// CHECK-IN SCREEN (Stepped Sections + Dropdown Room Picker + Validation)
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
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [backendError, setBackendError] = useState('')

  useEffect(() => {
    L.getRooms(hotelId).then(setRooms).catch(toast)
    L.getSources().then(setSources).catch(toast)
    L.getActiveStays(hotelId).then(setActive).catch(toast)
  }, [hotelId])

  const set = k => e => {
    const val = e.target.value
    setF(prev => ({ ...prev, [k]: val }))
    if (touched) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[k]
        return next
      })
    }
  }

  const co = f.stay_type === 'HOURLY' ? L.hourlyCheckout(new Date(), +f.hours) : L.defaultCheckout(new Date(), +f.nights)

  // Validation function
  const validateForm = () => {
    const errs = {}

    // Receptionist Name * (min 2 chars)
    if (!f.receptionist_name || f.receptionist_name.trim().length < 2) {
      errs.receptionist_name = 'Please enter the receptionist name'
    }

    // Guest Name *
    if (!f.guest_name || !f.guest_name.trim()) {
      errs.guest_name = 'Please enter the guest name'
    }

    // Mobile * (7-15 chars: digits, +, space, -)
    const mobileTrim = (f.mobile || '').trim()
    const mobileRegex = /^[0-9+ -]{7,15}$/
    if (!mobileTrim || !mobileRegex.test(mobileTrim)) {
      errs.mobile = 'Enter a valid mobile number'
    }

    // Address *
    if (!f.address || !f.address.trim()) {
      errs.address = 'Please enter the guest address'
    }

    // ID Proof Type & Number *
    const idTrim = (f.id_proof_number || '').trim()
    if (!idTrim) {
      errs.id_proof_number = 'Please enter the ID proof number'
    } else if (f.id_proof_type === 'Aadhaar Card') {
      const digitsOnly = idTrim.replace(/[\s-]/g, '')
      if (!/^\d{12}$/.test(digitsOnly)) {
        errs.id_proof_number = 'Aadhaar must be 12 digits'
      }
    }

    // Purpose of Visit *
    if (!f.purpose_of_visit || !f.purpose_of_visit.trim()) {
      errs.purpose_of_visit = 'Please enter the purpose of visit'
    }

    // Booking Source * & Booking ID * (unless Walk-in or Other)
    if (f.booking_source !== 'Walk-in' && f.booking_source !== 'Other') {
      if (!f.booking_id || !f.booking_id.trim()) {
        errs.booking_id = 'Booking ID is required for online bookings'
      }
    }

    // Number of Guests * (whole number >= 1)
    const guestsNum = Number(f.number_of_guests)
    if (isNaN(guestsNum) || guestsNum < 1 || !Number.isInteger(guestsNum)) {
      errs.number_of_guests = 'Enter number of guests'
    }

    // Rooms * (at least one room or villa selected)
    if (!sel || sel.length === 0) {
      errs.room_numbers = 'Please select at least one room or villa'
    }

    // Stay Nights >= 1 or Hours >= 1
    if (f.stay_type === 'HOURLY') {
      if (!f.hours || Number(f.hours) < 1) {
        errs.hours = 'Hours must be at least 1'
      }
    } else {
      if (!f.nights || Number(f.nights) < 1) {
        errs.nights = 'Nights must be at least 1'
      }
    }

    // Total Amount * (number >= 0)
    if (f.total === '' || isNaN(Number(f.total)) || Number(f.total) < 0) {
      errs.total = 'Enter the total amount'
    }

    // Payment validation rules
    const r = L.computePayment({ mode: pay.mode, total: Number(f.total) || 0, paid: pay.paid, split: pay.split })
    if (r.error) {
      errs.payment = r.error
    }

    return errs
  }

  const submit = async () => {
    setTouched(true)
    setBackendError('')
    const errs = validateForm()
    setErrors(errs)

    if (Object.keys(errs).length > 0) {
      // Scroll to and focus the first invalid field
      const firstKey = Object.keys(errs)[0]
      const el = document.getElementById('field-' + firstKey) || document.querySelector(`[name="${firstKey}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const inputEl = el.querySelector('input, select, button') || el
        inputEl.focus && inputEl.focus()
      }
      return
    }

    const r = L.computePayment({ mode: pay.mode, total: Number(f.total) || 0, paid: pay.paid, split: pay.split })

    // Remember receptionist name
    localStorage.setItem('rname', f.receptionist_name.trim())

    setBusy(true)
    try {
      const { stay_id } = await L.createStay({
        hotel_id: hotelId,
        guest_name: f.guest_name.trim(),
        mobile: f.mobile.trim(),
        address: f.address.trim(),
        id_proof_type: f.id_proof_type,
        id_proof_number: f.id_proof_number.trim(),
        purpose_of_visit: f.purpose_of_visit.trim(),
        booking_source: f.booking_source,
        booking_id: (f.booking_id || '').trim(),
        number_of_guests: Number(f.number_of_guests),
        number_of_rooms: sel.length,
        room_numbers: sel,
        stay_type: f.stay_type,
        nights: f.stay_type === 'NIGHTLY' ? Number(f.nights) : null,
        hours: f.stay_type === 'HOURLY' ? Number(f.hours) : null,
        total_amount: Number(f.total) || 0,
        receptionist_name: f.receptionist_name.trim(),
        payments: r.payments
      })
      await L.printGRC(stay_id)
      onDone()
    } catch (e) {
      setBackendError(e.message || 'Failed to create stay record')
      toast(e)
    } finally {
      setBusy(false)
    }
  }

  const pRes = L.computePayment({ mode: pay.mode, total: +f.total || 0, paid: pay.paid, split: pay.split })

  return (
    <div className="page-container">
      {/* Validation Summary Banner */}
      {touched && Object.keys(errors).length > 0 && (
        <div className="form-error-banner" role="alert">
          <IconAlertCircle /> Please fill the highlighted fields
        </div>
      )}

      {/* Backend Error Banner */}
      {backendError && (
        <div className="form-error-banner backend-error" role="alert">
          <IconAlertCircle /> {backendError}
        </div>
      )}

      <div className="checkin-layout">
        {/* Left Column: Form Steps */}
        <div className="checkin-main-flow">
          {/* Step 1: Staff & Guest Details */}
          <div className="checkin-step-card">
            <div className="checkin-step-header">
              <span className="step-number">1</span>
              <h3 className="step-title">Guest & Staff Information</h3>
            </div>

            <div className="grid grid-cols-2">
              <label id="field-receptionist_name">
                <span>Receptionist Name <span className="required-star">*</span></span>
                <input
                  placeholder="e.g. Anand"
                  className={errors.receptionist_name ? 'has-error' : ''}
                  value={f.receptionist_name}
                  onChange={set('receptionist_name')}
                />
                {errors.receptionist_name && <div className="field-error-msg"><IconAlertCircle /> {errors.receptionist_name}</div>}
              </label>

              <label id="field-guest_name">
                <span>Guest Full Name <span className="required-star">*</span></span>
                <input
                  placeholder="e.g. Anandha Krishnan"
                  className={errors.guest_name ? 'has-error' : ''}
                  value={f.guest_name}
                  onChange={set('guest_name')}
                />
                {errors.guest_name && <div className="field-error-msg"><IconAlertCircle /> {errors.guest_name}</div>}
              </label>
            </div>

            <div className="grid grid-cols-2" style={{ marginTop: 14 }}>
              <label id="field-mobile">
                <span>Mobile Number <span className="required-star">*</span></span>
                <input
                  placeholder="10-digit mobile number"
                  className={errors.mobile ? 'has-error' : ''}
                  value={f.mobile}
                  onChange={set('mobile')}
                />
                {errors.mobile && <div className="field-error-msg"><IconAlertCircle /> {errors.mobile}</div>}
              </label>

              <label id="field-purpose_of_visit">
                <span>Purpose of Visit <span className="required-star">*</span></span>
                <input
                  placeholder="Business / Vacation / Family"
                  className={errors.purpose_of_visit ? 'has-error' : ''}
                  value={f.purpose_of_visit}
                  onChange={set('purpose_of_visit')}
                />
                {errors.purpose_of_visit && <div className="field-error-msg"><IconAlertCircle /> {errors.purpose_of_visit}</div>}
              </label>
            </div>

            <div style={{ marginTop: 14 }}>
              <label id="field-address">
                <span>Residential Address <span className="required-star">*</span></span>
                <input
                  placeholder="Street, City, State, PIN"
                  className={errors.address ? 'has-error' : ''}
                  value={f.address}
                  onChange={set('address')}
                />
                {errors.address && <div className="field-error-msg"><IconAlertCircle /> {errors.address}</div>}
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
              <label id="field-id_proof_type">
                <span>ID Proof Document <span className="required-star">*</span></span>
                <select value={f.id_proof_type} onChange={set('id_proof_type')}>
                  {['Aadhaar Card', 'Driving Licence', 'Passport', 'Voter ID', 'Other'].map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label id="field-id_proof_number">
                <span>Document ID Number <span className="required-star">*</span></span>
                <input
                  placeholder={f.id_proof_type === 'Aadhaar Card' ? '12-digit Aadhaar number' : 'ID number'}
                  className={errors.id_proof_number ? 'has-error' : ''}
                  value={f.id_proof_number}
                  onChange={set('id_proof_number')}
                />
                {errors.id_proof_number && <div className="field-error-msg"><IconAlertCircle /> {errors.id_proof_number}</div>}
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
              <label id="field-booking_source">
                <span>Booking Source <span className="required-star">*</span></span>
                <select value={f.booking_source} onChange={set('booking_source')}>
                  {sources.map(s => <option key={s.name}>{s.name}</option>)}
                </select>
              </label>
              <label id="field-booking_id">
                <span>
                  Booking Reference ID {f.booking_source !== 'Walk-in' && f.booking_source !== 'Other' && <span className="required-star">*</span>}
                </span>
                <input
                  placeholder="e.g. MMT-98213 / Walk-in"
                  className={errors.booking_id ? 'has-error' : ''}
                  value={f.booking_id}
                  onChange={set('booking_id')}
                />
                {errors.booking_id && <div className="field-error-msg"><IconAlertCircle /> {errors.booking_id}</div>}
              </label>
              <label id="field-number_of_guests">
                <span>Number of Guests <span className="required-star">*</span></span>
                <input
                  type="number"
                  min="1"
                  className={errors.number_of_guests ? 'has-error' : ''}
                  value={f.number_of_guests}
                  onChange={set('number_of_guests')}
                />
                {errors.number_of_guests && <div className="field-error-msg"><IconAlertCircle /> {errors.number_of_guests}</div>}
              </label>
            </div>
          </div>

          {/* Step 4: Rooms & Stay Duration (Section A - RoomPicker) */}
          <div className="checkin-step-card">
            <div className="checkin-step-header">
              <span className="step-number">4</span>
              <h3 className="step-title">Room & Duration Allocation</h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <label style={{ marginBottom: 6 }}>Stay Type <span className="required-star">*</span></label>
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
              </div>

              <div style={{ minWidth: 140 }}>
                {f.stay_type === 'HOURLY' ? (
                  <label id="field-hours">
                    <span>Stay Duration (Hours) <span className="required-star">*</span></span>
                    <input
                      type="number"
                      min="1"
                      className={errors.hours ? 'has-error' : ''}
                      value={f.hours}
                      onChange={set('hours')}
                    />
                    {errors.hours && <div className="field-error-msg"><IconAlertCircle /> {errors.hours}</div>}
                  </label>
                ) : (
                  <label id="field-nights">
                    <span>Number of Nights <span className="required-star">*</span></span>
                    <input
                      type="number"
                      min="1"
                      className={errors.nights ? 'has-error' : ''}
                      value={f.nights}
                      onChange={set('nights')}
                    />
                    {errors.nights && <div className="field-error-msg"><IconAlertCircle /> {errors.nights}</div>}
                  </label>
                )}
              </div>
            </div>

            {/* Reusable RoomPicker Component */}
            <RoomPicker
              rooms={rooms}
              sel={sel}
              setSel={newSel => {
                setSel(newSel)
                if (touched && newSel.length > 0) {
                  setErrors(prev => {
                    const next = { ...prev }
                    delete next.room_numbers
                    return next
                  })
                }
              }}
              occupied={active}
              error={errors.room_numbers}
            />
          </div>

          {/* Step 5: Tariff & Payment */}
          <div className="checkin-step-card">
            <div className="checkin-step-header">
              <span className="step-number">5</span>
              <h3 className="step-title">Tariff & Billing Settlement</h3>
            </div>
            <label id="field-total" style={{ maxWidth: 260, marginBottom: 14 }}>
              <span>Total Tariff Amount (₹) <span className="required-star">*</span></span>
              <input
                type="number"
                min="0"
                placeholder="e.g. 3500"
                className={errors.total ? 'has-error' : ''}
                value={f.total}
                onChange={set('total')}
              />
              {errors.total && <div className="field-error-msg"><IconAlertCircle /> {errors.total}</div>}
            </label>

            <Pay total={+f.total || 0} pay={pay} setPay={setPay} error={errors.payment} />
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
                <span>
                  {L.formatRooms(sel)}
                </span>
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
            disabled={busy}
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
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [backendError, setBackendError] = useState('')

  const total = type === 'extend' ? +x.amount || 0 : Number(s.balance)

  const validate = () => {
    const errs = {}
    if (type === 'extend') {
      if (!x.co || new Date(L.fromISTInput(x.co)) <= new Date(s.current_checkout_at)) {
        errs.co = 'New checkout must be after the current checkout'
      }
      if (x.amount === '' || isNaN(Number(x.amount)) || Number(x.amount) < 0) {
        errs.amount = 'Enter a valid extension amount'
      }
      const r = L.computePayment({ mode: pay.mode, total, paid: pay.paid, split: pay.split })
      if (r.error) errs.payment = r.error
    } else {
      // Collect balance
      const paidAmt = Number(pay.paid) || 0
      if (!pay.paid || paidAmt <= 0) {
        errs.paid = 'Amount must be greater than 0'
      } else if (paidAmt > Number(s.balance)) {
        errs.paid = 'Amount cannot exceed balance'
      }
      if (!pay.mode) {
        errs.mode = 'Select a payment mode'
      }
      const r = L.computePayment({ mode: pay.mode, total: Number(s.balance), paid: pay.paid, split: pay.split })
      if (r.error) errs.payment = r.error
    }
    return errs
  }

  const go = async () => {
    setTouched(true)
    setBackendError('')
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const r = L.computePayment({ mode: pay.mode, total, paid: pay.paid, split: pay.split })

    setBusy(true)
    try {
      if (type === 'extend') {
        await L.extendStay(s.id, {
          new_checkout: L.fromISTInput(x.co),
          reason: x.reason.trim(),
          booking_source: x.source,
          number_of_rooms: (s.room_numbers || []).length || 1,
          amount: total,
          payments: r.payments
        })
      } else {
        await L.addBalancePayment(s.id, r.payments)
      }
      onClose(true)
    } catch (e) {
      setBackendError(e.message || 'Operation failed')
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
            <h3>{type === 'extend' ? 'Extend Guest Stay' : 'Collect Outstanding Balance'}</h3>
            <p>
              Guest: <b>{s.guest_name}</b> &bull; Room {L.formatRooms(s.room_numbers)} &bull; {s.grc_number}
            </p>
          </div>
          <button
            className="btn-ghost"
            style={{ minHeight: 'auto', padding: '4px 8px', border: 'none' }}
            onClick={() => onClose(false)}
            disabled={busy}
          >
            ✕
          </button>
        </div>

        {backendError && (
          <div className="form-error-banner backend-error" role="alert">
            <IconAlertCircle /> {backendError}
          </div>
        )}

        {type === 'extend' && (
          <div className="grid" style={{ marginBottom: 14 }}>
            <label>
              <span>New Checkout Date & Time (IST) <span className="required-star">*</span></span>
              <input
                type="datetime-local"
                className={errors.co ? 'has-error' : ''}
                value={x.co}
                onChange={e => setX({ ...x, co: e.target.value })}
              />
              {errors.co && <div className="field-error-msg"><IconAlertCircle /> {errors.co}</div>}
            </label>
            <label>
              <span>Extension Amount (₹) <span className="required-star">*</span></span>
              <input
                type="number"
                placeholder="0"
                className={errors.amount ? 'has-error' : ''}
                value={x.amount}
                onChange={e => setX({ ...x, amount: e.target.value })}
              />
              {errors.amount && <div className="field-error-msg"><IconAlertCircle /> {errors.amount}</div>}
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span>Reason for Extension (Optional)</span>
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

        <Pay total={total} pay={pay} setPay={setPay} error={errors.payment || errors.mode || errors.paid} />

        <div className="modal-footer">
          <button className="btn-ghost" onClick={() => onClose(false)} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" onClick={go} disabled={busy}>
            {busy ? 'Saving...' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// EDIT ROOMS MODAL (Change Room - uses RoomPicker & Section A Rules)
// ---------------------------------------------------------------------
function EditRooms({ s, hotelId, onClose }) {
  const [rooms, setRooms] = useState([])
  const [active, setActive] = useState([])
  const [sel, setSel] = useState(s.room_numbers || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [backendError, setBackendError] = useState('')

  useEffect(() => {
    L.getRooms(hotelId).then(setRooms).catch(toast)
    L.getActiveStays(hotelId).then(setActive).catch(toast)
  }, [hotelId])

  // Category matching the first part of stay.room_category (split on " + ")
  const initialCategory = s.room_category ? s.room_category.split(' + ')[0].trim() : ''

  // Check if current stay's rooms exist in the rooms list for display of "Previous: <old labels>"
  const allCurrentRoomsExist = (s.room_numbers || []).every(rm => rooms.some(r => r.room_number === rm))
  const showPreviousNote = !s.room_category || !allCurrentRoomsExist

  const save = async () => {
    setError('')
    setBackendError('')
    if (!sel || !sel.length) {
      setError('Please select at least one room or villa')
      return
    }

    setBusy(true)
    try {
      await L.changeRooms(s.id, sel)
      onClose(true)
      if (confirm('Room updated. Print the updated GRC now?')) {
        await L.printGRC(s.id).catch(toast)
      }
    } catch (e) {
      setBackendError(e.message || 'Failed to update rooms')
      toast(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <h3>Change room - {s.guest_name}</h3>
            <p>
              GRC: <b>{s.grc_number}</b> &bull; Current room: <b>{L.formatRooms(s.room_numbers)}</b>{' '}
              {s.room_category && (
                <span className={`pill ${s.room_category.includes('BHK') ? 'badge-navy' : 'badge-gold'}`} style={{ marginLeft: 6 }}>
                  {s.room_category}
                </span>
              )}
            </p>
          </div>
          <button
            className="btn-ghost"
            style={{ minHeight: 'auto', padding: '4px 8px', border: 'none' }}
            onClick={() => onClose(false)}
            disabled={busy}
          >
            ✕
          </button>
        </div>

        {backendError && (
          <div className="form-error-banner backend-error" role="alert">
            <IconAlertCircle /> {backendError}
          </div>
        )}

        {showPreviousNote && (
          <div className="previous-rooms-note">
            Previous: {L.formatRooms(s.room_numbers)}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ marginBottom: 8 }}>
            <span>Select New Room(s) / Cottage(s) <span className="required-star">*</span></span>
          </label>

          <RoomPicker
            rooms={rooms}
            sel={sel}
            setSel={newSel => {
              setSel(newSel)
              if (newSel.length > 0) setError('')
            }}
            occupied={active}
            initialCategory={initialCategory}
            error={error}
          />
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
                  GRC: <b>{s?.grc_number}</b> &bull; Room: <b>{L.formatRooms(s?.room_numbers)}</b>{' '}
                  {s?.room_category && (
                    <span className={`pill ${s.room_category.includes('BHK') ? 'badge-navy' : 'badge-gold'}`} style={{ marginLeft: 6 }}>
                      {s.room_category}
                    </span>
                  )}
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
                    <span className="view-stay-value font-bold">
                      {L.formatRooms(s.room_numbers)}{' '}
                      {s.room_category && (
                        <span className={`pill ${s.room_category.includes('BHK') ? 'badge-navy' : 'badge-gold'}`} style={{ marginLeft: 6 }}>
                          {s.room_category}
                        </span>
                      )}
                    </span>
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

              {/* e) Extension History Table */}
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
                            <td>{L.formatRooms(g.room_numbers || []) || g.number_of_rooms || '-'}</td>
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
                    <div style={{ fontWeight: 600 }}>{L.formatRooms(s.room_numbers)}</div>
                    {s.room_category && (
                      <span className={`pill ${s.room_category.includes('BHK') ? 'badge-navy' : 'badge-gold'}`} style={{ marginTop: 3 }}>
                        {s.room_category}
                      </span>
                    )}
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
// REPORT & LEDGER SCREEN
// Presets in IST, auto-applied filters with debounce, proper Dropdown controls,
// report_summary cards, Excel (xlsx), CSV (with UTF-8 BOM), and iframe print export.
// ---------------------------------------------------------------------
function Report({ hotelId, hotel = {} }) {
  // Helper to format Date to IST YYYY-MM-DD
  const formatISTDateOnly = d => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d)
  }

  // Calculate preset ranges in IST
  const getPresetDates = preset => {
    const now = new Date()
    const todayStr = formatISTDateOnly(now)
    if (preset === 'Today') {
      return { from: todayStr, to: todayStr }
    } else if (preset === 'Yesterday') {
      const y = new Date(now.getTime() - 86400000)
      const yStr = formatISTDateOnly(y)
      return { from: yStr, to: yStr }
    } else if (preset === 'Last 7 days') {
      const past = new Date(now.getTime() - 6 * 86400000)
      return { from: formatISTDateOnly(past), to: todayStr }
    } else if (preset === 'This month') {
      const istParts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit'
        }).formatToParts(now).map(p => [p.type, p.value])
      )
      const firstDayStr = `${istParts.year}-${istParts.month}-01`
      return { from: firstDayStr, to: todayStr }
    }
    return { from: '', to: '' }
  }

  const [activePreset, setActivePreset] = useState('Today')
  const defaultDates = getPresetDates('Today')

  // Filter state: default everything to "All" (null), dateBasis default 'CHECKIN'
  const [f, setF] = useState({
    from: defaultDates.from,
    to: defaultDates.to,
    dateBasis: 'CHECKIN',
    status: null,
    source: null,
    paymentMode: null,
    paymentStatus: null,
    extended: null,
    roomCategory: null,
    search: ''
  })

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [sources, setSources] = useState([])
  const exportMenuRef = useRef(null)

  // Actions & modals
  const [act, setAct] = useState(null)
  const [editRoomsStay, setEditRoomsStay] = useState(null)
  const [viewStayId, setViewStayId] = useState(null)

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExportMenu) return
    const handleClick = e => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExportMenu])

  useEffect(() => {
    L.getSources().then(setSources).catch(console.error)
  }, [])

  // Search input debounce ref
  const [debouncedSearch, setDebouncedSearch] = useState(f.search)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(f.search)
    }, 400)
    return () => clearTimeout(timer)
  }, [f.search])

  // Reset page to 0 on any filter change
  const updateFilter = updates => {
    setPage(0)
    setF(prev => ({ ...prev, ...updates }))
  }

  // Handle Preset selection
  const handleSelectPreset = preset => {
    setActivePreset(preset)
    if (preset !== 'Custom') {
      const dates = getPresetDates(preset)
      updateFilter({ from: dates.from, to: dates.to })
    }
  }

  // Reset all filters to Today + everything All
  const handleReset = () => {
    const tDates = getPresetDates('Today')
    setActivePreset('Today')
    setPage(0)
    setF({
      from: tDates.from,
      to: tDates.to,
      dateBasis: 'CHECKIN',
      status: null,
      source: null,
      paymentMode: null,
      paymentStatus: null,
      extended: null,
      roomCategory: null,
      search: ''
    })
  }

  // Query backend data
  const loadData = async () => {
    setLoading(true)
    const effectiveFilters = {
      ...f,
      search: debouncedSearch,
      hotel: hotelId
    }

    try {
      const [tableRows, summaryData] = await Promise.all([
        L.getReport(effectiveFilters, page, pageSize),
        L.getReportSummary(effectiveFilters).catch(() => null)
      ])
      setRows(tableRows || [])

      // If report_summary RPC returns data use it; otherwise compute KPI metrics from loaded tableRows
      if (summaryData) {
        setSummary(summaryData)
      } else if (tableRows && tableRows.length > 0) {
        const checkinsCount = Number(tableRows[0]?.total_count || tableRows.length)
        const activeCount = tableRows.filter(r => r.status === 'ACTIVE').length
        const checkoutCount = tableRows.filter(r => r.status === 'CHECKED_OUT').length
        const extCount = tableRows.filter(r => (Number(r.extension_count) || 0) > 0).length
        const totalRooms = tableRows.reduce((acc, r) => acc + (Array.isArray(r.room_numbers) ? r.room_numbers.length : 1), 0)
        const totalGuests = tableRows.reduce((acc, r) => acc + (Number(r.number_of_guests) || 1), 0)
        const totalBilled = tableRows.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0)
        const totalPaid = tableRows.reduce((acc, r) => acc + (Number(r.total_paid) || 0), 0)
        const totalBal = tableRows.reduce((acc, r) => acc + (Number(r.balance) || 0), 0)
        const pendingStays = tableRows.filter(r => (Number(r.balance) || 0) > 0).length

        const byCategory = {}
        const byMode = {}
        tableRows.forEach(r => {
          if (r.room_category) {
            byCategory[r.room_category] = (byCategory[r.room_category] || 0) + 1
          }
          if (r.payment_mode_summary) {
            byMode[r.payment_mode_summary] = (byMode[r.payment_mode_summary] || 0) + (Number(r.total_paid) || 0)
          }
        })

        setSummary({
          checkins: checkinsCount,
          active: activeCount,
          checked_out: checkoutCount,
          extended: extCount,
          rooms: totalRooms,
          guests: totalGuests,
          billed: totalBilled,
          paid: totalPaid,
          balance: totalBal,
          pending_count: pendingStays,
          by_category: byCategory,
          by_mode: byMode
        })
      } else {
        setSummary({
          checkins: 0,
          active: 0,
          checked_out: 0,
          extended: 0,
          rooms: 0,
          guests: 0,
          billed: 0,
          paid: 0,
          balance: 0,
          pending_count: 0
        })
      }
    } catch (e) {
      toast(e)
    } finally {
      setLoading(false)
    }
  }

  // Automatically reload whenever filters, debounced search, page, or pageSize change
  useEffect(() => {
    loadData()
  }, [hotelId, f.from, f.to, f.dateBasis, f.status, f.source, f.paymentMode, f.paymentStatus, f.extended, f.roomCategory, debouncedSearch, page, pageSize])

  const totalCount = Number(rows[0]?.total_count || 0)

  // Active filter chips list
  const activeChips = []
  if (activePreset && activePreset !== 'Custom') {
    activeChips.push({ label: `Preset: ${activePreset}`, onRemove: () => handleSelectPreset('Custom') })
  }
  if (f.from || f.to) {
    activeChips.push({ label: `Date: ${f.from || '...'} to ${f.to || '...'}`, onRemove: () => updateFilter({ from: '', to: '' }) })
  }
  if (f.dateBasis && f.dateBasis !== 'CHECKIN') {
    activeChips.push({ label: `Basis: ${f.dateBasis === 'CHECKOUT' ? 'Check-out date' : 'In-house guests'}`, onRemove: () => updateFilter({ dateBasis: 'CHECKIN' }) })
  }
  if (f.status) {
    activeChips.push({ label: `Status: ${f.status}`, onRemove: () => updateFilter({ status: null }) })
  }
  if (f.roomCategory) {
    activeChips.push({ label: `Room Type: ${f.roomCategory}`, onRemove: () => updateFilter({ roomCategory: null }) })
  }
  if (f.source) {
    activeChips.push({ label: `Source: ${f.source}`, onRemove: () => updateFilter({ source: null }) })
  }
  if (f.paymentMode) {
    activeChips.push({ label: `Mode: ${f.paymentMode}`, onRemove: () => updateFilter({ paymentMode: null }) })
  }
  if (f.paymentStatus) {
    activeChips.push({ label: `Payment: ${f.paymentStatus}`, onRemove: () => updateFilter({ paymentStatus: null }) })
  }
  if (f.extended !== null && f.extended !== undefined) {
    activeChips.push({ label: `Extended: ${f.extended ? 'Yes' : 'No'}`, onRemove: () => updateFilter({ extended: null }) })
  }
  if (f.search) {
    activeChips.push({ label: `Search: "${f.search}"`, onRemove: () => updateFilter({ search: '' }) })
  }

  // Export handlers
  const handleExportExcel = async () => {
    setExporting(true)
    setShowExportMenu(false)
    try {
      const allRows = await L.exportReport({ ...f, search: debouncedSearch, hotel: hotelId })
      const hotelCode = hotel?.code || 'HOTEL'
      const fromStr = f.from || 'all'
      const toStr = f.to || 'all'
      const filename = `Starlight-${hotelCode}-Report_${fromStr}_to_${toStr}.xlsx`

      // Sheet 1: Report data rows
      const reportHeaders = [
        'GRC No', 'Hotel', 'Guest Name', 'Mobile', 'Address', 'ID Proof', 'ID Number',
        'Purpose', 'Room Type', 'Room(s)', 'Source', 'Booking ID', 'Guests', 'Rooms',
        'Stay Duration', 'Check-in', 'Original Checkout', 'Current Checkout',
        'Actual Checkout', 'Status', 'Extensions', 'Total Amount', 'Cash', 'Gpay',
        'Card', 'Online', 'Total Paid', 'Balance', 'Payment Status', 'Receptionist'
      ]

      let totalAmountSum = 0
      let totalCashSum = 0
      let totalGpaySum = 0
      let totalCardSum = 0
      let totalOnlineSum = 0
      let totalPaidSum = 0
      let totalBalanceSum = 0

      const dataRows = allRows.map(r => {
        const amt = Number(r.total_amount) || 0
        const paid = Number(r.total_paid) || 0
        const bal = Number(r.balance) || 0
        const cash = Number(r.cash_amount) || (r.payment_mode === 'CASH' ? paid : 0)
        const gpay = Number(r.gpay_amount) || (r.payment_mode === 'GPAY' ? paid : 0)
        const card = Number(r.card_amount) || (r.payment_mode === 'CARD' ? paid : 0)
        const online = Number(r.online_amount) || (r.payment_mode === 'ONLINE' ? paid : 0)

        totalAmountSum += amt
        totalCashSum += cash
        totalGpaySum += gpay
        totalCardSum += card
        totalOnlineSum += online
        totalPaidSum += paid
        totalBalanceSum += bal

        return [
          r.grc_number || '',
          r.hotel_code || hotelCode,
          r.guest_name || '',
          r.mobile || '',
          r.address || '',
          r.id_proof_type || '',
          r.id_proof_number || '',
          r.purpose_of_visit || '',
          r.room_category || '',
          L.formatRooms(r.room_numbers),
          r.booking_source || '',
          r.booking_id || '',
          Number(r.number_of_guests) || 1,
          Array.isArray(r.room_numbers) ? r.room_numbers.length : 1,
          r.stay_type === 'HOURLY' ? `${r.hours || 0} Hours` : `${r.nights || 1} Nights`,
          L.fmtIST(r.checkin_at),
          L.fmtIST(r.original_checkout_at),
          L.fmtIST(r.current_checkout_at),
          L.fmtIST(r.actual_checkout_at),
          r.status || '',
          Number(r.extension_count) || 0,
          amt,
          cash,
          gpay,
          card,
          online,
          paid,
          bal,
          r.payment_status || '',
          r.receptionist_name || ''
        ]
      })

      // Totals Row
      const totalsRow = [
        'TOTALS', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        totalAmountSum, totalCashSum, totalGpaySum, totalCardSum, totalOnlineSum, totalPaidSum, totalBalanceSum, '', ''
      ]

      const wsReport = XLSX.utils.aoa_to_sheet([reportHeaders, ...dataRows, totalsRow])

      // Auto column widths & freezing
      wsReport['!cols'] = reportHeaders.map((h, i) => {
        let maxLen = h.length
        dataRows.slice(0, 30).forEach(row => {
          const valStr = String(row[i] ?? '')
          if (valStr.length > maxLen) maxLen = valStr.length
        })
        return { wch: Math.min(Math.max(maxLen + 3, 11), 35) }
      })

      // Freeze header row
      wsReport['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' }

      // Sheet 2: Summary metrics
      const wsSummary = XLSX.utils.aoa_to_sheet([
        ['Starlight Hotels - Ledger Summary Report'],
        ['Generated At (IST)', L.fmtIST(new Date().toISOString())],
        ['Hotel', hotel?.name || hotelCode],
        ['Date Range', `${f.from || 'All'} to ${f.to || 'All'}`],
        ['Date Basis', f.dateBasis || 'CHECKIN'],
        ['Status Filter', f.status || 'All'],
        ['Room Category Filter', f.roomCategory || 'All'],
        ['Source Filter', f.source || 'All'],
        ['Payment Status Filter', f.paymentStatus || 'All'],
        [],
        ['Metric', 'Value'],
        ['Total Check-ins', summary?.checkins ?? allRows.length],
        ['Active Guests', summary?.active ?? 0],
        ['Checked Out', summary?.checked_out ?? 0],
        ['Extended', summary?.extended ?? 0],
        ['Rooms Allocated', summary?.rooms ?? 0],
        ['Total Guests', summary?.guests ?? 0],
        ['Total Billed (INR)', summary?.billed ?? totalAmountSum],
        ['Total Paid (INR)', summary?.paid ?? totalPaidSum],
        ['Balance Due (INR)', summary?.balance ?? totalBalanceSum]
      ])

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, wsReport, 'Report')
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
      XLSX.writeFile(wb, filename)
    } catch (e) {
      toast(e)
    } finally {
      setExporting(false)
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    setShowExportMenu(false)
    try {
      const allRows = await L.exportReport({ ...f, search: debouncedSearch, hotel: hotelId })
      const hotelCode = hotel?.code || 'HOTEL'
      const fromStr = f.from || 'all'
      const toStr = f.to || 'all'
      const filename = `Starlight-${hotelCode}-Report_${fromStr}_to_${toStr}.csv`

      const headers = [
        'GRC No', 'Hotel', 'Guest Name', 'Mobile', 'Address', 'ID Proof', 'ID Number',
        'Purpose', 'Room Type', 'Room(s)', 'Source', 'Booking ID', 'Guests', 'Rooms',
        'Stay Duration', 'Check-in', 'Original Checkout', 'Current Checkout',
        'Actual Checkout', 'Status', 'Extensions', 'Total Amount', 'Cash', 'Gpay',
        'Card', 'Online', 'Total Paid', 'Balance', 'Payment Status', 'Receptionist'
      ]

      const csvRows = [headers.join(',')]
      allRows.forEach(r => {
        const amt = Number(r.total_amount) || 0
        const paid = Number(r.total_paid) || 0
        const bal = Number(r.balance) || 0
        const cash = Number(r.cash_amount) || (r.payment_mode === 'CASH' ? paid : 0)
        const gpay = Number(r.gpay_amount) || (r.payment_mode === 'GPAY' ? paid : 0)
        const card = Number(r.card_amount) || (r.payment_mode === 'CARD' ? paid : 0)
        const online = Number(r.online_amount) || (r.payment_mode === 'ONLINE' ? paid : 0)

        const row = [
          `"${r.grc_number || ''}"`,
          `"${r.hotel_code || hotelCode}"`,
          `"${(r.guest_name || '').replace(/"/g, '""')}"`,
          `"${r.mobile || ''}"`,
          `"${(r.address || '').replace(/"/g, '""')}"`,
          `"${r.id_proof_type || ''}"`,
          `"${r.id_proof_number || ''}"`,
          `"${r.purpose_of_visit || ''}"`,
          `"${r.room_category || ''}"`,
          `"${L.formatRooms(r.room_numbers)}"`,
          `"${r.booking_source || ''}"`,
          `"${r.booking_id || ''}"`,
          Number(r.number_of_guests) || 1,
          Array.isArray(r.room_numbers) ? r.room_numbers.length : 1,
          `"${r.stay_type === 'HOURLY' ? `${r.hours || 0} Hours` : `${r.nights || 1} Nights`}"`,
          `"${L.fmtIST(r.checkin_at)}"`,
          `"${L.fmtIST(r.original_checkout_at)}"`,
          `"${L.fmtIST(r.current_checkout_at)}"`,
          `"${L.fmtIST(r.actual_checkout_at)}"`,
          `"${r.status || ''}"`,
          Number(r.extension_count) || 0,
          amt,
          cash,
          gpay,
          card,
          online,
          paid,
          bal,
          `"${r.payment_status || ''}"`,
          `"${r.receptionist_name || ''}"`
        ]
        csvRows.push(row.join(','))
      })

      // Add UTF-8 BOM (\uFEFF) so Excel renders rupee and special characters cleanly
      const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast(e)
    } finally {
      setExporting(false)
    }
  }

  const handlePrintPDF = async () => {
    setExporting(true)
    setShowExportMenu(false)
    try {
      const allRows = await L.exportReport({ ...f, search: debouncedSearch, hotel: hotelId })
      const hotelName = hotel?.name || 'Starlight Hotels'
      const hotelCode = hotel?.code || 'HOTEL'
      const rangeText = `${f.from || 'All'} to ${f.to || 'All'}`

      const totalBilled = allRows.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0)
      const totalPaid = allRows.reduce((acc, r) => acc + (Number(r.total_paid) || 0), 0)
      const totalBalance = allRows.reduce((acc, r) => acc + (Number(r.balance) || 0), 0)

      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow.document
      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${hotelName} - Ledger Report</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #162a4d; margin: 0; padding: 10px; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #b8893a; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 18px; font-weight: bold; text-transform: uppercase; color: #162a4d; }
            .sub { font-size: 11px; color: #666; margin-top: 3px; }
            .meta { font-size: 11px; text-align: right; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px; }
            th, td { border: 1px solid #ddd; padding: 5px 6px; text-align: left; }
            th { background: #f4f1ea; font-weight: 600; color: #162a4d; }
            .num { text-align: right; font-variant-numeric: tabular-nums; }
            .totals-row td { font-weight: bold; background: #faf8f5; border-top: 2px solid #b8893a; }
            .badge { padding: 2px 5px; border-radius: 4px; font-size: 9px; font-weight: bold; }
            .badge-paid { background: #e6f4ea; color: #0a7a3d; }
            .badge-due { background: #fce8e6; color: #b3261e; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${hotelName}</div>
              <div class="sub">Ledger & Stay Report &bull; Filter: ${rangeText} (Basis: ${f.dateBasis})</div>
            </div>
            <div class="meta">
              Generated: ${L.fmtIST(new Date().toISOString())}<br>
              Total Records: ${allRows.length}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>GRC</th>
                <th>Guest Name</th>
                <th>Mobile</th>
                <th>Room(s)</th>
                <th>Category</th>
                <th>Source</th>
                <th>Check-in</th>
                <th>Checkout</th>
                <th class="num">Billed (₹)</th>
                <th class="num">Paid (₹)</th>
                <th class="num">Balance (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${allRows.map(r => `
                <tr>
                  <td><b>${r.grc_number || ''}</b></td>
                  <td>${r.guest_name || ''}</td>
                  <td>${r.mobile || ''}</td>
                  <td>${L.formatRooms(r.room_numbers)}</td>
                  <td>${r.room_category || '—'}</td>
                  <td>${r.booking_source || '—'}</td>
                  <td>${L.fmtIST(r.checkin_at)}</td>
                  <td>${L.fmtIST(r.actual_checkout_at || r.current_checkout_at)}</td>
                  <td class="num">${Number(r.total_amount || 0).toLocaleString('en-IN')}</td>
                  <td class="num">${Number(r.total_paid || 0).toLocaleString('en-IN')}</td>
                  <td class="num" style="color: ${r.balance > 0 ? '#b3261e' : '#0a7a3d'}">${Number(r.balance || 0).toLocaleString('en-IN')}</td>
                  <td><span class="badge ${r.balance > 0 ? 'badge-due' : 'badge-paid'}">${r.payment_status || r.status}</span></td>
                </tr>
              `).join('')}
              <tr class="totals-row">
                <td colspan="8">TOTALS (${allRows.length} Stays)</td>
                <td class="num">₹${totalBilled.toLocaleString('en-IN')}</td>
                <td class="num">₹${totalPaid.toLocaleString('en-IN')}</td>
                <td class="num" style="color: ${totalBalance > 0 ? '#b3261e' : '#0a7a3d'}">₹${totalBalance.toLocaleString('en-IN')}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `)
      doc.close()

      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => document.body.removeChild(iframe), 1500)
      }, 300)
    } catch (e) {
      toast(e)
    } finally {
      setExporting(false)
    }
  }

  const presetsList = ['Today', 'Yesterday', 'Last 7 days', 'This month', 'Custom']

  return (
    <div className="page-container">
      {/* Top Controls & Presets */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quick Presets:
            </span>
            <div className="report-presets-row" style={{ margin: 0 }}>
              {presetsList.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`preset-chip ${activePreset === p ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="btn-ghost btn-sm" onClick={handleReset} title="Reset all filters to defaults">
              Reset Filters
            </button>
            <div className="export-menu-wrap" ref={exportMenuRef}>
              <button
                type="button"
                className="btn-gold btn-sm"
                disabled={exporting || loading}
                onClick={() => setShowExportMenu(v => !v)}
              >
                {exporting ? 'Exporting...' : 'Export'} <IconChevronDown />
              </button>
              {showExportMenu && (
                <div className="export-menu-dropdown">
                  <button type="button" className="export-menu-item" onClick={handleExportExcel}>
                    <IconFileText /> Excel (.xlsx)
                  </button>
                  <button type="button" className="export-menu-item" onClick={handleExportCSV}>
                    <IconFileText /> CSV (UTF-8)
                  </button>
                  <button type="button" className="export-menu-item" onClick={handlePrintPDF}>
                    <IconPrinter /> PDF / Print
                  </button>
                </div>
              )}
            </div>
            <button type="button" className="btn-primary btn-sm" onClick={loadData}>
              Apply
            </button>
          </div>
        </div>

        {/* Filter Controls Row 1: Dates & Basis */}
        <div className="grid grid-cols-3" style={{ marginBottom: 12 }}>
          <label>
            <span>Date Range From (IST)</span>
            <input
              type="date"
              value={f.from || ''}
              onChange={e => {
                setActivePreset('Custom')
                updateFilter({ from: e.target.value })
              }}
            />
          </label>

          <label>
            <span>Date Range To (IST)</span>
            <input
              type="date"
              value={f.to || ''}
              onChange={e => {
                setActivePreset('Custom')
                updateFilter({ to: e.target.value })
              }}
            />
          </label>

          <Dropdown
            id="filter-date-basis"
            label="Date Based On"
            value={f.dateBasis}
            onChange={val => updateFilter({ dateBasis: val })}
            options={[
              { value: 'CHECKIN', label: 'Check-in date' },
              { value: 'CHECKOUT', label: 'Check-out date' },
              { value: 'INHOUSE', label: 'Guests in hotel during range' }
            ]}
            searchable={false}
          />
        </div>

        {/* Filter Controls Row 2: Status, Source, Modes, Room Type */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <Dropdown
            id="filter-status"
            label="Stay Status"
            value={f.status}
            onChange={val => updateFilter({ status: val })}
            options={[
              { value: null, label: 'All Statuses' },
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'CHECKED_OUT', label: 'CHECKED_OUT' }
            ]}
            placeholder="All Statuses"
            searchable={false}
          />

          <Dropdown
            id="filter-room-category"
            label="Room Type"
            value={f.roomCategory}
            onChange={val => updateFilter({ roomCategory: val })}
            options={[
              { value: null, label: 'All Room Types' },
              ...ROOM_CATEGORIES.map(c => ({ value: c, label: c }))
            ]}
            placeholder="All Room Types"
            searchable={false}
          />

          <Dropdown
            id="filter-source"
            label="Booking Source"
            value={f.source}
            onChange={val => updateFilter({ source: val })}
            options={[
              { value: null, label: 'All Sources' },
              ...sources.map(s => ({ value: s.name, label: s.name }))
            ]}
            placeholder="All Sources"
            searchable={true}
          />

          <Dropdown
            id="filter-payment-mode"
            label="Payment Mode"
            value={f.paymentMode}
            onChange={val => updateFilter({ paymentMode: val })}
            options={[
              { value: null, label: 'All Modes' },
              ...MODES.map(m => ({ value: m, label: m }))
            ]}
            placeholder="All Modes"
            searchable={false}
          />

          <Dropdown
            id="filter-payment-status"
            label="Payment Status"
            value={f.paymentStatus}
            onChange={val => updateFilter({ paymentStatus: val })}
            options={[
              { value: null, label: 'All Payment Status' },
              { value: 'PAID', label: 'PAID' },
              { value: 'PARTIAL', label: 'PARTIAL' },
              { value: 'PENDING', label: 'PENDING' }
            ]}
            placeholder="All Payment Status"
            searchable={false}
          />

          <Dropdown
            id="filter-extended"
            label="Extended"
            value={f.extended === null ? null : (f.extended ? 'true' : 'false')}
            onChange={val => updateFilter({ extended: val === null ? null : val === 'true' })}
            options={[
              { value: null, label: 'All' },
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' }
            ]}
            placeholder="All"
            searchable={false}
          />

          <label style={{ minWidth: 200 }}>
            <span>Search Term</span>
            <input
              placeholder="Name / Mobile / GRC / Room / ID"
              value={f.search}
              onChange={e => setF({ ...f, search: e.target.value })}
            />
          </label>
        </div>

        {/* Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="active-filters-bar" style={{ marginTop: 12 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--status-neutral)', fontWeight: 700 }}>
              Active Filters:
            </span>
            {activeChips.map((chip, idx) => (
              <span key={idx} className="active-filter-chip">
                <span>{chip.label}</span>
                <button
                  type="button"
                  className="room-chip-remove"
                  onClick={chip.onRemove}
                  style={{ marginLeft: 4 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Summary KPI Cards from report_summary */}
      {summary && (
        <div className="report-summary-grid">
          <div className="summary-kpi-card">
            <span className="summary-kpi-title">Total Check-ins</span>
            <span className="summary-kpi-value">{summary.checkins ?? totalCount}</span>
            <div className="summary-kpi-breakdown">
              <span>Active: <b>{summary.active ?? 0}</b></span>
              <span>Checkout: <b>{summary.checked_out ?? 0}</b></span>
            </div>
          </div>

          <div className="summary-kpi-card">
            <span className="summary-kpi-title">Rooms & Guests</span>
            <span className="summary-kpi-value">{summary.rooms ?? 0} <span style={{ fontSize: 14, fontWeight: 400 }}>rooms</span></span>
            <div className="summary-kpi-breakdown">
              <span>Guests: <b>{summary.guests ?? 0}</b></span>
              <span>Ext: <b>{summary.extended ?? 0}</b></span>
            </div>
          </div>

          <div className="summary-kpi-card">
            <span className="summary-kpi-title">Total Billed</span>
            <span className="summary-kpi-value">{inr(summary.billed ?? 0)}</span>
            {summary.by_category && (
              <div className="summary-kpi-breakdown">
                {Object.entries(summary.by_category).slice(0, 3).map(([cat, val]) => (
                  <span key={cat} className="breakdown-item">{cat}: {val}</span>
                ))}
              </div>
            )}
          </div>

          <div className="summary-kpi-card">
            <span className="summary-kpi-title">Total Paid</span>
            <span className="summary-kpi-value" style={{ color: 'var(--status-paid)' }}>{inr(summary.paid ?? 0)}</span>
            {summary.by_mode && (
              <div className="summary-kpi-breakdown">
                {Object.entries(summary.by_mode).map(([mode, val]) => (
                  <span key={mode} className="breakdown-item">{mode}: {inr(val)}</span>
                ))}
              </div>
            )}
          </div>

          <div className="summary-kpi-card">
            <span className="summary-kpi-title">Balance Due</span>
            <span className={`summary-kpi-value ${(summary.balance || 0) > 0 ? 'due' : ''}`}>
              {inr(summary.balance ?? 0)}
            </span>
            <div className="summary-kpi-breakdown">
              <span>Pending stays: <b>{summary.pending_count ?? 0}</b></span>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>GRC</th>
              <th>Guest Details</th>
              <th>Room(s)</th>
              <th>Type</th>
              <th>Source</th>
              <th>Check-in (IST)</th>
              <th>Checkout (IST)</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Paid</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="12" style={{ padding: 20 }}>
                  <div className="skeleton-row" />
                  <div className="skeleton-row" />
                  <div className="skeleton-row" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="12">
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <IconFileText />
                    </div>
                    <h4>No guests found for these filters</h4>
                    <p>Try resetting filters or adjusting date ranges.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map(s => (
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
                    <small style={{ color: 'var(--status-neutral)', display: 'block' }} className="tabular-nums">
                      {s.mobile}
                    </small>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{L.formatRooms(s.room_numbers)}</div>
                  </td>
                  <td>
                    {s.room_category ? (
                      <span className={`pill ${s.room_category.includes('BHK') ? 'badge-navy' : 'badge-gold'}`}>
                        {s.room_category}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className="pill badge-neutral">{s.booking_source}</span>
                  </td>
                  <td className="tabular-nums">{L.fmtIST(s.checkin_at)}</td>
                  <td className="tabular-nums">{L.fmtIST(s.actual_checkout_at || s.current_checkout_at)}</td>
                  <td className="tabular-nums font-serif" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {inr(s.total_amount)}
                  </td>
                  <td className="tabular-nums font-serif" style={{ textAlign: 'right', color: 'var(--status-paid)', fontWeight: 600 }}>
                    {inr(s.total_paid || 0)}
                  </td>
                  <td
                    className={`tabular-nums font-serif ${s.balance > 0 ? 'due' : 'ok'}`}
                    style={{ textAlign: 'right', fontWeight: 700 }}
                  >
                    {inr(s.balance)}
                  </td>
                  <td>
                    <span className={`pill ${s.payment_status === 'PAID' ? 'badge-paid' : s.payment_status === 'PARTIAL' ? 'badge-partial' : 'badge-due'}`}>
                      {s.payment_status || s.status}
                    </span>
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
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="pagination-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>
              Showing <b>{totalCount === 0 ? 0 : page * pageSize + 1}</b> – <b>{Math.min((page + 1) * pageSize, totalCount)}</b> of <b>{totalCount}</b> records
            </span>
            <div className="table-page-selector">
              <span>Page size:</span>
              <select
                className="page-size-select"
                value={pageSize}
                onChange={e => {
                  setPage(0)
                  setPageSize(Number(e.target.value))
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
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
              Page <b>{page + 1}</b> of <b>{Math.max(1, Math.ceil(totalCount / pageSize))}</b>
            </span>
            <button
              className="btn-ghost btn-sm"
              disabled={(page + 1) * pageSize >= totalCount}
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
            ok && loadData()
          }}
        />
      )}

      {editRoomsStay && (
        <EditRooms
          s={editRoomsStay}
          hotelId={hotelId}
          onClose={ok => {
            setEditRoomsStay(null)
            ok && loadData()
          }}
        />
      )}

      {viewStayId && (
        <ViewStay
          stayId={viewStayId}
          onClose={() => setViewStayId(null)}
          onChanged={() => loadData()}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// ADMIN SCREEN (KPI Metrics, Visual Analytics & Category Summary Table)
// ---------------------------------------------------------------------
function Admin({ hotelId }) {
  const t = new Date().toISOString().slice(0, 10)
  const [d, setD] = useState({ from: t, to: t })
  const [data, setData] = useState(null)
  const [categoryData, setCategoryData] = useState([])
  const [loadingCats, setLoadingCats] = useState(false)

  const run = () => {
    L.adminSummary(d.from, d.to, hotelId || null).then(setData).catch(toast)
    setLoadingCats(true)
    L.adminRoomCategories(d.from, d.to, hotelId || null)
      .then(res => {
        setCategoryData(Array.isArray(res) ? res : [])
      })
      .catch(err => {
        console.warn('adminRoomCategories error:', err)
        setCategoryData([])
      })
      .finally(() => setLoadingCats(false))
  }

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

          {/* Room Category Performance Summary Table (Section A requirement) */}
          <div className="admin-category-card">
            <div className="card-header" style={{ marginBottom: 12 }}>
              <h3 className="card-title">
                <IconBed /> Category Performance Breakdown
              </h3>
              <span className="badge badge-navy">
                {d.from} to {d.to}
              </span>
            </div>

            {loadingCats ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--status-neutral)' }}>
                Loading room category summary...
              </div>
            ) : categoryData.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--status-neutral)', fontSize: 13 }}>
                No category records found for this period.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Room Type</th>
                      <th>Bookings</th>
                      <th>Billed</th>
                      <th>Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((row, idx) => {
                      const typeName = row.room_type || row.room_category || row.category || 'Standard'
                      const bookingsCount = row.bookings ?? row.count ?? row.stays ?? 0
                      const billedAmt = row.billed ?? row.total_billed ?? row.amount ?? 0
                      const collectedAmt = row.collected ?? row.total_collected ?? row.paid ?? 0
                      return (
                        <tr key={idx}>
                          <td>
                            <span className={`pill ${String(typeName).includes('BHK') ? 'badge-navy' : 'badge-gold'}`}>
                              {typeName}
                            </span>
                          </td>
                          <td className="tabular-nums font-bold">{bookingsCount}</td>
                          <td className="tabular-nums font-serif">{inr(billedAmt)}</td>
                          <td className="tabular-nums font-serif ok">{inr(collectedAmt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
                {tab === 'report' && <Report hotelId={hotelId} hotel={currentHotel} />}
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
