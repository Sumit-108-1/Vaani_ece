import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const SEMS = [1, 2, 3, 4, 5, 6, 7, 8]
const blank = { type: 'note', sem: 3, subject: '', code: '', title: '', year: 2025 }

export default function App() {
  const [rows, setRows] = useState([])
  const [type, setType] = useState('note')
  const [sem, setSem] = useState(0)
  const [q, setQ] = useState('')
  const [session, setSession] = useState(null)
  const [admin, setAdmin] = useState(false)
  const [login, setLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [form, setForm] = useState(null)
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')

  const note = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  const load = async () => {
    const { data } = await supabase.from('materials').select('*').order('created_at', { ascending: false })
    setRows(data || [])
  }

  useEffect(() => {
    load()
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return setAdmin(false)
    supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setAdmin(!!data))
  }, [session])

  const list = useMemo(() => {
    const t = q.toLowerCase().trim()
    return rows.filter((r) => r.type === type && (!sem || r.sem === sem) &&
      (!t || `${r.subject} ${r.code} ${r.title}`.toLowerCase().includes(t)))
  }, [rows, type, sem, q])

  const wave = useMemo(() => {
    const f = 2 + Math.min(q.length, 12) * 0.6
    let d = 'M0 28'
    for (let x = 0; x <= 600; x += 4) d += ` L${x} ${28 - 20 * Math.sin((x / 600) * Math.PI * 2 * f)}`
    return d
  }, [q])

  const url = (p) => supabase.storage.from('files').getPublicUrl(p).data.publicUrl
  const downloadUrl = (p) =>
    supabase.storage.from('files').getPublicUrl(p, { download: true }).data.publicUrl

  const sendLink = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    note(error ? error.message : 'Check your email for the login link')
  }

  const save = async (e) => {
    e.preventDefault()
    if (!file) return note('Choose a file first')
    const path = `${form.type}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const up = await supabase.storage.from('files').upload(path, file)
    if (up.error) return note(up.error.message)
    const { error } = await supabase.from('materials').insert({ ...form, year: form.type === 'pyq' ? +form.year : null, file_path: path })
    if (error) {
      await supabase.storage.from('files').remove([path])
      return note(error.message)
    }
    setForm(null); setFile(null); setType(form.type); load(); note('Added to the vault')
  }

  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return
    const { error: dbError } = await supabase.from('materials').delete().eq('id', r.id)
    if (dbError) return note(dbError.message)
    const { error: fileError } = await supabase.storage.from('files').remove([r.file_path])
    if (fileError) note(`Material deleted, but file cleanup failed: ${fileError.message}`)
    else note('Material deleted')
    load()
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <section className="hero">
        <div className="shape" aria-hidden="true"><svg viewBox="0 0 640 560" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#25205A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M640 120H520L480 160H380" stroke="#5CCDF0"/><path d="M640 330H540L500 370H400" stroke="#5CCDF0"/><path d="M560 0V90L520 130" stroke="#5CCDF0"/><path d="M420 560V470L460 430H560" stroke="#5CCDF0"/>
    <circle cx="380" cy="160" r="6" fill="#fff" stroke="#5CCDF0"/><circle cx="400" cy="370" r="6" fill="#fff" stroke="#5CCDF0"/>
    <rect x="360" y="190" width="150" height="150" rx="22" fill="#fff"/><rect x="392" y="222" width="86" height="86" rx="12" fill="#5CCDF0" stroke="none"/>
    <path d="M404 266 q10 -26 20 0 t20 0 t20 0" stroke="#25205A" strokeWidth="3"/>
    <path d="M385 190v-22M420 190v-22M455 190v-22M490 190v-22M385 340v22M420 340v22M455 340v22M490 340v22M360 225h-22M360 265h-22M360 305h-22M510 225h22M510 265h22M510 305h22" strokeWidth="3"/>
  </svg></div>
        <div className="wrap">
          <header>
            <div className="brand"><i></i>ECE Vault</div>
            <nav><a href="#browse">Browse</a><a href="#why">Why ECE Vault</a></nav>
            <div className="hd">
              {admin && <><span className="badge">Admin</span><button className="btn primary" onClick={() => setForm(blank)}>Upload</button></>}
              {session
                ? <button className="btn" style={{ marginLeft: 10 }} onClick={() => supabase.auth.signOut()}>Log out</button>
                : <button className="btn" onClick={() => setLogin(!login)}>Admin login</button>}
            </div>
          </header>
          {login && !session && (
            <form className="login" onSubmit={sendLink} style={{ padding: '0 0 12px', position: 'relative', zIndex: 2 }}>
              <input type="email" required placeholder="Your admin email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn primary">Send login link</button>
            </form>
          )}
          <div className="copy">
            <h1>Every ECE paper and note, one search away.</h1>
            <p className="sub">Past papers and semester-wise notes for ECE students. No login, no chasing seniors on WhatsApp.</p>
            <div className="search">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try Signals, DSP or ECE-301" aria-label="Search subjects" />
              <svg id="wave" viewBox="0 0 600 56" preserveAspectRatio="none" aria-hidden="true"><path d={wave} /></svg>
            </div>
            <p className="hint">Sem 1–8 · Notes · Past papers · Free</p>
          </div>
        </div>
        <a className="down" href="#browse" aria-label="Scroll to materials">&#8595;</a>
      </section>

      <div className="wrap main" id="browse">
        <h2 className="sec">Pick your semester, find your subject</h2>
        <div className="tabs" role="tablist">
          {[['note', 'Notes'], ['pyq', 'Past papers']].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={type === k} onClick={() => setType(k)}>{l}</button>
          ))}
        </div>
        <div className="sems">
          <button aria-pressed={sem === 0} onClick={() => setSem(0)}>All</button>
          {SEMS.map((s) => <button key={s} aria-pressed={sem === s} onClick={() => setSem(s)}>Sem {s}</button>)}
        </div>
        <p className="count">{list.length} {list.length === 1 ? 'result' : 'results'}</p>
        <ul className="list">
          {list.length === 0 && <li className="empty">{rows.length ? 'Nothing here yet. Try another semester or search.' : 'No material has been added yet. Check back soon.'}</li>}
          {list.map((r) => (
            <li key={r.id}>
              <span className="sem">Sem {r.sem}</span>
              <div><div className="t">{r.title}</div><div className="m">{r.subject}{r.code ? ` · ${r.code}` : ''}{r.year ? ` · ${r.year}` : ''}</div></div>   
<div className="material-actions">
  <a
    className="dl"
    href={url(r.file_path)}
    target="_blank"
    rel="noopener noreferrer"
  >
    View
  </a>
  <a
    className="dl"
    href={downloadUrl(r.file_path)}
  >
    Download
  </a>
</div>
              {admin && <div className="adm"><button className="del" onClick={() => remove(r)}>Delete</button></div>}
            </li>
          ))}
        </ul>

        <section className="why" id="why">
          <svg className="tri" viewBox="0 0 200 180" aria-hidden="true"><path d="M20 160 L100 20 L180 160 Z" fill="#FDE4E8" stroke="#FDE4E8" strokeWidth="24" strokeLinejoin="round"/></svg>
          <h2 className="sec">Built for exam week</h2>
          <div className="feat">
      <div><svg viewBox="0 0 52 52" fill="none"><path d="M8 14h14l4 5h18v23H8z" fill="#E3F4FB"/><path d="M8 24h36" /></svg>Notes sorted by semester and subject</div>
      <div><svg viewBox="0 0 52 52" fill="none"><rect x="9" y="11" width="34" height="32" rx="5" fill="#E3F4FB"/><path d="M9 21h34M18 7v8M34 7v8"/><circle cx="26" cy="32" r="4" fill="#5CCDF0"/></svg>Past papers labelled by year</div>
      <div><svg viewBox="0 0 52 52" fill="none"><path d="M26 6l16 6v12c0 10-7 17-16 21C17 41 10 34 10 24V12z" fill="#E3F4FB"/><path d="M19 26l5 5 9-10" stroke="#25205A"/></svg>Checked and uploaded by the admin</div>
      <div><svg viewBox="0 0 52 52" fill="none"><rect x="15" y="6" width="22" height="40" rx="5" fill="#E3F4FB"/><path d="M23 40h6"/><circle cx="26" cy="22" r="5" fill="#5CCDF0"/></svg>Free, works on your phone, no sign-up</div>
    </div>
  
        </section>
        <footer>ECE Vault · Free study material for ECE students</footer>
      </div>

      {form && (
        <div className="overlay" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>Upload material</h2>
            <label>Type<select value={form.type} onChange={set('type')}><option value="note">Notes</option><option value="pyq">Past paper</option></select></label>
            <div className="row">
              <div><label>Semester<select value={form.sem} onChange={set('sem')}>{SEMS.map((s) => <option key={s} value={s}>Semester {s}</option>)}</select></label></div>
              {form.type === 'pyq' && <div><label>Year<input type="number" value={form.year} onChange={set('year')} /></label></div>}
            </div>
            <label>Subject<input required value={form.subject} onChange={set('subject')} placeholder="Digital Electronics" /></label>
            <label>Subject code<input value={form.code} onChange={set('code')} placeholder="ECE-205" /></label>
            <label>Title<input required value={form.title} onChange={set('title')} placeholder="Unit 2: Combinational circuits" /></label>
            <label>File (PDF or image)<input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files[0])} /></label>
            <div className="actions"><button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button><button className="btn primary">Add to vault</button></div>
          </form>
        </div>
      )}
      {msg && <div id="toast" className="on" role="status">{msg}</div>}
    </>
  )
}
