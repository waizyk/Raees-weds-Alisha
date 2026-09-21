import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight, CalendarDays, Camera, Check, CheckCircle2, ChevronDown, Clock,
  Download, ExternalLink, Heart, ImagePlus, LayoutDashboard, Leaf, Link2,
  ListChecks, LockKeyhole, Mail, MapPin, Menu, MessageCircleHeart, Plus,
  QrCode, RefreshCw, Search, Send, Sparkles, TableProperties, TicketCheck, TreePine,
  Upload, UserCheck, Users, X, XCircle
} from 'lucide-react';
import './styles.css';
import { isSupabaseConfigured, supabase, findInvitation, sendRsvp, signInHost, sendPasswordReset, setNewPassword, getHostSession, getHostProfile, listRsvps, saveInvitation, updateRsvp, uploadGuestPhotos, listApprovedPhotos, listPhotoQueue, moderatePhoto, getSiteSettings, saveSiteSettings } from './lib/supabase';

const EVENT = {
  date: '24 October 2026',
  iso: '2026-10-24T12:00:00+02:00',
  venue: 'Venue to be confirmed',
  city: 'Katima Mulilo, Namibia',
};

const seedRsvps = [];

const tables = [
  { id: 1, name: 'Peony', seats: 8, x: 20, y: 34 },
  { id: 2, name: 'Jasmine', seats: 10, x: 50, y: 28 },
  { id: 3, name: 'Lotus', seats: 8, x: 79, y: 34 },
  { id: 4, name: 'Orchid', seats: 10, x: 30, y: 69 },
  { id: 5, name: 'Magnolia', seats: 10, x: 68, y: 69 },
];

const questionnaire = [
  'Which colours make you feel most like yourself—and are there any you dislike?',
  'Would you prefer modern minimal, romantic garden, royal, editorial, or a blend?',
  'How visible should the South Asian–Chinese fusion be: subtle details or a strong theme?',
  'Which flowers, symbols, fabrics or family traditions are meaningful to you both?',
  'Do you have engagement photos, a monogram, or a favourite portrait for the invitation?',
  'Should the invitation feel formal and traditional, warm and playful, or fashion-editorial?',
  'What names, titles and family wording should appear on the formal invitation?',
  'Which events need their own cards, dress codes, locations and RSVP questions?',
  'Should guests choose meals, add dietary requirements, request a plus-one or RSVP for children?',
  'What details should remain private until a guest opens their personal invitation link?',
  'Would you like a gift registry, charity preference, accommodation guide or transport details?',
  'Which love-story moments and family members should feature on the website?',
];

function App() {
  const [view, setView] = useState('home');
  const [menu, setMenu] = useState(false);
  const [rsvps, setRsvps] = useState(() => JSON.parse(localStorage.getItem('raa-rsvps-live') || 'null') || seedRsvps);
  const [toast, setToast] = useState('');
  const [admin, setAdmin] = useState(false);
  const [hostName, setHostName] = useState('Wedding host');
  const [privacy,setPrivacy]=useState({album_visibility:'everyone',tree_visibility:'everyone'});
  const [guestVerified,setGuestVerified]=useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(() => new URLSearchParams(window.location.search).has('invite'));
  const [album, setAlbum] = useState([]);

  useEffect(() => localStorage.setItem('raa-rsvps-live', JSON.stringify(rsvps)), [rsvps]);
  useEffect(() => { if(isSupabaseConfigured) getHostSession().then(async session=>{if(session){setAdmin(true);try{const profile=await getHostProfile();if(profile?.display_name)setHostName(profile.display_name);}catch{setHostName(session.user?.email?.split('@')[0]||'Wedding host');}}}); }, []);
  useEffect(()=>{getSiteSettings().then(setPrivacy).catch(()=>{});try{const saved=JSON.parse(localStorage.getItem('raa-guest-invite')||'null');if(saved?.inviteCode){if(isSupabaseConfigured)findInvitation(saved.inviteCode).then(invite=>setGuestVerified(Boolean(invite))).catch(()=>setGuestVerified(false));else setGuestVerified(true)}}catch{}},[]);
  useEffect(() => { if(!supabase)return; const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){setLoginOpen(false);setResetOpen(true);}}); return()=>subscription.unsubscribe(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); } }, [toast]);

  const go = (next) => { setView(next); setMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const mayView=(level)=>admin||level==='everyone'||(level==='invited'&&guestVerified);

  return <div className="app">
    <header className={`nav ${view !== 'home' ? 'solid' : ''}`}>
      <button className="brand" onClick={() => go('home')} aria-label="Home">
        <span>R</span><span>A</span>
      </button>
      <nav className={menu ? 'open' : ''}>
        <button onClick={() => go('story')}>Our story</button>
        <button onClick={() => go('details')}>The celebration</button>
        {mayView(privacy.album_visibility)&&<button onClick={() => go('album')}>Album</button>}
        {mayView(privacy.tree_visibility)&&<button onClick={() => go('tree')}>Our people</button>}
        <button className="nav-rsvp" onClick={() => go('rsvp')}>RSVP <ArrowRight size={15}/></button>
        <button className="admin-link" onClick={() => admin ? go('admin') : setLoginOpen(true)}><LockKeyhole size={14}/> Host</button>
      </nav>
      <button className="menu" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X/> : <Menu/>}</button>
    </header>

    <main>
      {view === 'home' && <Home go={go} canAlbum={mayView(privacy.album_visibility)}/>} 
      {view === 'story' && <Story/>}
      {view === 'details' && <Details go={go}/>} 
      {view === 'rsvp' && <RsvpForm setRsvps={setRsvps} go={go} notify={setToast}/>} 
      {view === 'album' && (mayView(privacy.album_visibility)?<Album album={album} setAlbum={setAlbum} notify={setToast}/>:<PrivateSection title="The album is private" go={go}/>)} 
      {view === 'tree' && (mayView(privacy.tree_visibility)?<FamilyTree/>:<PrivateSection title="The family tree is private" go={go}/>)} 
      {view === 'admin' && admin && <Admin rsvps={rsvps} setRsvps={setRsvps} notify={setToast} previewInvite={() => setInviteOpen(true)} hostName={hostName} privacy={privacy} setPrivacy={setPrivacy}/>} 
    </main>

    {view !== 'home' && <Footer go={go} canAlbum={mayView(privacy.album_visibility)}/>} 
    {loginOpen && <LoginModal close={() => setLoginOpen(false)} success={(profile) => { setAdmin(true); if(profile?.display_name)setHostName(profile.display_name); setLoginOpen(false); go('admin'); }}/>} 
    {resetOpen && <ResetPasswordModal close={() => setResetOpen(false)} notify={setToast}/>} 
    {inviteOpen && <InviteExperience close={() => setInviteOpen(false)} go={go} onVerified={()=>setGuestVerified(true)}/>} 
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>;
}

function Home({ go, canAlbum }) {
  return <>
    <section className="hero">
      <div className="hero-shade"/>
      <div className="hero-flourish">囍</div>
      <div className="hero-content reveal">
        <p className="bismillah">Bismillāhir-Raḥmānir-Raḥīm</p><p className="eyebrow light">TOGETHER WITH THEIR FAMILIES</p>
        <h1>Raees <em className="love-mark">&</em> Alisha</h1>
        <p className="hero-copy">Two hearts, two heritages, united in faith.</p>
        <div className="hero-date"><span/><p>{EVENT.date}<small>{EVENT.city}</small></p><span/></div>
        <div className="hero-actions">
          <button className="button gold" onClick={() => go('rsvp')}>Kindly respond <ArrowRight size={17}/></button>
          <button className="text-button light" onClick={() => go('details')}>View celebration details</button>
        </div>
      </div>
      <button className="scroll-cue" onClick={() => document.querySelector('.welcome').scrollIntoView({behavior:'smooth'})}>Discover <ChevronDown size={17}/></button>
    </section>

    <section className="welcome section">
      <div className="seal">R <Heart size={18} fill="currentColor"/> A</div>
      <p className="eyebrow">A JOY SHARED IS A JOY DOUBLED</p>
      <h2>Welcome to our<br/><em>forever chapter</em></h2>
      <p className="lead">We’re so grateful to celebrate this moment with the people who have shaped our lives. This space holds every detail, memory and joyful moment—before, during and long after the day.</p>
      <div className="quick-grid">
        <button onClick={() => go('details')}><CalendarDays/><span><small>WHEN & WHERE</small>The celebration</span><ArrowRight/></button>
        <button onClick={() => go('rsvp')}><Mail/><span><small>YOU’RE INVITED</small>Respond to your invite</span><ArrowRight/></button>
        {canAlbum&&<button onClick={() => go('album')}><Camera/><span><small>OUR SHARED MEMORIES</small>Add your photographs</span><ArrowRight/></button>}
      </div>
    </section>

    <section className="feature-split">
      <div className="feature-image"><div className="image-caption">Jade, jasmine & joyous beginnings</div></div>
      <div className="feature-copy">
        <p className="eyebrow">A CELEBRATION OF US</p>
        <h2>Rooted in family.<br/><em>Made for forever.</em></h2>
        <p>A Muslim wedding woven from shared traditions, joyful celebration and the love of two families becoming one—In shā’ Allāh.</p>
        <button className="button dark" onClick={() => go('story')}>Read our story <ArrowRight size={17}/></button>
      </div>
    </section>

  </>;
}

function Story() {
  return <PageHero eyebrow="OUR BEGINNING" title={<>A thousand little moments,<br/><em>one beautiful story.</em></>}>
    <div className="story-layout">
      <div className="quote-card"><span>“</span><p>In every lifetime,<br/>I’d still find you.</p><small>RAEES & ALISHA</small></div>
      <div className="prose"><h3>It started with a hello.</h3><p>The full story is still being written by Raees and Alisha. For now, this is a quiet space for the moments that matter: how they met, the first adventure, the proposal, and the families who cheered them on.</p><p>Once the couple shares their story and photographs, this page becomes a timeless digital chapter—one they can return to on every anniversary.</p></div>
    </div>
  </PageHero>;
}

function Details({ go }) {
  return <PageHero eyebrow="NIKAH & CELEBRATION" title={<>Join us as we begin<br/><em>our life together.</em></>}>
    <div className="details-card">
      <div className="date-block"><small>OCTOBER</small><strong>24</strong><span>2026</span></div>
      <div className="detail-lines">
        <div><Clock/><span><small>THE TIME</small><b>To be confirmed</b><p>Nikah and celebration timings will be shared soon</p></span></div>
        <div><MapPin/><span><small>THE PLACE</small><b>{EVENT.venue}</b><p>{EVENT.city} · Full venue details will be shared privately</p></span></div>
        <div><Leaf/><span><small>THE ATTIRE</small><b>Formal & modest</b><p>Traditional attire is warmly welcomed · Kindly avoid ivory and white</p></span></div>
      </div>
    </div>
    <div className="detail-note"><h3>A thoughtful note</h3><p>Our Nikah and wedding celebration will be conducted in accordance with Islamic values. Halaal catering will be served. Final timing, venue, prayer arrangements, accommodation and transport details will appear here once confirmed.</p><button className="button dark" onClick={() => go('rsvp')}>Respond to invitation <ArrowRight size={16}/></button></div>
  </PageHero>;
}

function PageHero({ eyebrow, title, children }) {
  return <><section className="page-hero"><p className="eyebrow light">{eyebrow}</p><h1>{title}</h1><div className="page-ornament">愛</div></section><section className="page-content section">{children}</section></>;
}

function PrivateSection({title,go}){return <PageHero eyebrow="PRIVATE FAMILY SPACE" title={<><em>{title}</em></>}><div className="private-section"><LockKeyhole/><h3>Available by invitation</h3><p>This section is currently visible only to approved wedding hosts and invited guests.</p><button className="button dark" onClick={()=>go('home')}>Return home</button></div></PageHero>}

function RsvpForm({ setRsvps, go, notify }) {
  const activeInvite = useMemo(() => { try { return JSON.parse(sessionStorage.getItem('raa-active-invite') || 'null'); } catch { return null; } }, []);
  const [guestLimit, setGuestLimit] = useState(activeInvite?.guestLimit || 6);
  const [step, setStep] = useState(activeInvite ? 2 : 1);
  const [form, setForm] = useState({ name:'', household:activeInvite?.guestNames || '', email:'', attending:'yes', guests:'1', meal:'Halaal', note:'', inviteCode:activeInvite?.inviteCode || '' });
  const [busy,setBusy]=useState(false); const [formError,setFormError]=useState('');
  const update = (e) => { setForm({...form, [e.target.name]: e.target.value}); setFormError(''); };
  const lookupInvite = async () => {
    if (!isSupabaseConfigured) { setForm(f=>({...f,inviteCode:f.household})); setStep(2); return; }
    setBusy(true); setFormError('');
    try { const invite=await findInvitation(form.household.trim()); if(!invite) throw new Error('We could not find that invitation code.'); setForm(f=>({...f,household:invite.guest_names,inviteCode:invite.code})); setGuestLimit(invite.max_guests); setStep(2); }
    catch(error){ setFormError(error.message || 'We could not find that invitation.'); }
    finally { setBusy(false); }
  };
  const submit = async (e) => { e.preventDefault(); setBusy(true); setFormError('');
    try { if(isSupabaseConfigured){ await sendRsvp({code:form.inviteCode,name:form.name,email:form.email,attending:form.attending==='yes',guests:form.guests,meal:form.meal,note:form.note}); } else { setRsvps(r => [...r, { id: Date.now(), ...form, guests:Number(form.guests), invitedAs:activeInvite?.guestNames || form.household, status: form.attending === 'yes' ? 'pending' : 'declined', table:null, checkedIn:false }]); } sessionStorage.removeItem('raa-active-invite'); setStep(3); notify('Your response has been sent to Alisha'); }
    catch(error){ setFormError(error.message || 'Your response could not be sent. Please try again.'); }
    finally { setBusy(false); }
  };
  return <PageHero eyebrow="KINDLY RESPOND" title={<>Will you join us<br/><em>for the celebration?</em></>}>
    <div className="rsvp-shell">
      <div className="steps"><span className={step>=1?'active':''}>1 <small>Find invite</small></span><i/><span className={step>=2?'active':''}>2 <small>Your response</small></span><i/><span className={step>=3?'active':''}>3 <small>All done</small></span></div>
      {step === 1 && <div className="form-panel center"><TicketCheck size={36}/><h3>Let’s find your invitation</h3><p className="rsvp-deadline">Kindly respond by 5 October 2026</p><p>Enter the family name or invitation code shown on your personal e-invite.</p><label>Family name or invite code<input value={form.household} name="household" onChange={update} placeholder="Enter the code from your invitation"/></label>{formError&&<p className="form-error">{formError}</p>}<button className="button dark wide" disabled={!form.household||busy} onClick={lookupInvite}>{busy?'Finding invitation…':'Find my invitation'} {!busy&&<ArrowRight size={17}/>}</button><small className="help">Can’t find it? <a href="mailto:hello@example.com">Message the wedding family</a></small></div>}
      {step === 2 && <form className="form-panel" onSubmit={submit}><button type="button" className="back" onClick={() => setStep(1)}>← Back</button><p className="eyebrow">INVITATION FOUND</p>{activeInvite&&<div className="named-invite"><small>THIS INVITATION IS FOR</small><b>{activeInvite.guestNames}</b><span>Reserved for up to {guestLimit} {guestLimit===1?'guest':'guests'}</span></div>}<h3>We’d love to celebrate with you</h3><div className="choice-row"><label className={form.attending==='yes'?'selected':''}><input type="radio" name="attending" value="yes" checked={form.attending==='yes'} onChange={update}/><CheckCircle2/>Joyfully accepts</label><label className={form.attending==='no'?'selected decline':''}><input type="radio" name="attending" value="no" checked={form.attending==='no'} onChange={update}/><XCircle/>Regretfully declines</label></div><div className="field-grid"><label>Your full name<input required name="name" value={form.name} onChange={update}/></label><label>Email address<input required type="email" name="email" value={form.email} onChange={update}/></label>{form.attending==='yes' && <><label>Number attending<select name="guests" value={form.guests} onChange={update}>{Array.from({length:guestLimit},(_,i)=>i+1).map(n=><option key={n}>{n}</option>)}</select></label><label>Meal preference<select name="meal" value={form.meal} onChange={update}><option>Halaal</option><option>Vegetarian</option><option>Vegan</option><option>Other dietary needs</option></select></label></>}</div><label>Message or dietary notes<textarea name="note" value={form.note} onChange={update} placeholder="Share anything we should know…"/></label>{formError&&<p className="form-error">{formError}</p>}<button className="button dark wide" disabled={busy}>{busy?'Sending response…':'Send my response'} {!busy&&<Send size={16}/>}</button></form>}
      {step === 3 && <div className="form-panel center success-panel"><div className="success-icon"><Check/></div><p className="eyebrow">RESPONSE RECEIVED</p><h3>Thank you, {form.name}.</h3><p>{form.attending==='yes' ? 'Your RSVP is with Alisha for approval. We’ll send confirmation and final details to your email.' : 'You’ll be dearly missed. Thank you for letting the family know.'}</p><button className="button outline" onClick={() => go('home')}>Return to the celebration</button></div>}
    </div>
  </PageHero>;
}

function Album({ album, setAlbum, notify }) {
  const savedInvite=useMemo(()=>{try{return JSON.parse(localStorage.getItem('raa-guest-invite')||'null')}catch{return null}},[]);
  const [code,setCode]=useState(savedInvite?.inviteCode||''); const [uploader,setUploader]=useState(savedInvite?.guestNames||'');
  const [unlocked,setUnlocked]=useState(Boolean(savedInvite?.inviteCode)); const [approved,setApproved]=useState([]); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const loadApproved=async(inviteCode=code)=>{if(!isSupabaseConfigured||!inviteCode)return;try{setApproved(await listApprovedPhotos(inviteCode));}catch(err){setError(err.message||'Could not load the album.')}};
  useEffect(()=>{if(unlocked)loadApproved();},[unlocked]);
  const unlock=async()=>{setBusy(true);setError('');try{if(isSupabaseConfigured){const invite=await findInvitation(code.trim());if(!invite)throw new Error('We could not find that invitation code.');setUploader(invite.guest_names);localStorage.setItem('raa-guest-invite',JSON.stringify({inviteCode:invite.code,guestNames:invite.guest_names,guestLimit:invite.max_guests}));}setUnlocked(true);}catch(err){setError(err.message||'Invalid invitation code.')}finally{setBusy(false)}};
  const upload=async(e)=>{const files=[...e.target.files];if(!files.length)return;if(files.length>10){setError('Please upload no more than 10 photographs at a time.');return}setBusy(true);setError('');try{if(isSupabaseConfigured){if(!code||!uploader)throw new Error('Open the album with your invitation before uploading.');await uploadGuestPhotos(files,{code,uploadedBy:uploader});notify(`${files.length} media ${files.length===1?'file':'files'} sent for approval`);}else{const additions=files.map(f=>({name:f.name,url:URL.createObjectURL(f),media_type:f.type.startsWith('video/')?'video':'image'}));setAlbum(a=>[...a,...additions]);notify(`${files.length} ${files.length===1?'memory':'memories'} added`);}}catch(err){setError(err.message||'The photographs could not be uploaded.')}finally{setBusy(false);e.target.value=''}};
  return <PageHero eyebrow="OUR SHARED MEMORIES" title={<>The day, through<br/><em>your eyes.</em></>}>
    {!unlocked&&isSupabaseConfigured?<div className="album-unlock"><LockKeyhole/><h3>Invited guests only</h3><p>Enter the private code from your invitation to view and contribute to the wedding album.</p><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Invitation code"/><button className="button dark" disabled={!code||busy} onClick={unlock}>{busy?'Checking…':'Open the album'} <ArrowRight/></button>{error&&<p className="form-error">{error}</p>}</div>:<>
    <div className="album-intro"><div><h3>Help us remember every moment</h3><p>From the dance floor to the quiet in-between moments—add your photographs here. Every upload is private until the couple approves it.</p>{isSupabaseConfigured&&<label className="album-uploader">Uploading as<input value={uploader} onChange={e=>setUploader(e.target.value)} placeholder="Your name"/></label>}{error&&<p className="form-error">{error}</p>}</div><label className={`button dark upload ${busy?'disabled':''}`}><ImagePlus size={17}/> {busy?'Uploading…':'Add photographs'}<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime" multiple onChange={upload}/></label></div>
    <div className="gallery-grid">
      {approved.map(p=><figure key={p.id}><MediaPreview media={p}/><figcaption>Shared by {p.uploaded_by}</figcaption></figure>)}
      {!isSupabaseConfigured&&album.map((p,i)=><figure key={i}><MediaPreview media={p}/><figcaption>Guest memory · awaiting approval</figcaption></figure>)}
      {!approved.length&&!album.length&&<><div className="gallery-placeholder large"><Camera/><span>First look</span></div><div className="gallery-placeholder"><Heart/><span>Family</span></div><div className="gallery-placeholder"><Sparkles/><span>The celebration</span></div></>}
      <label className="gallery-add"><Plus/><b>{busy?'Uploading…':'Add your memory'}</b><small>Up to 10 files · Images 15 MB · Videos 100 MB</small><input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime" multiple onChange={upload}/></label>
    </div>
    <p className="privacy-note"><LockKeyhole size={14}/> Photographs remain private until approved by the couple.</p></>}
  </PageHero>;
}
function MediaPreview({media,onOpen}){const isVideo=media.media_type==='video';return <div className={`media-preview ${isVideo?'video':''}`}>{isVideo?<><video src={media.url} controls playsInline preload="metadata">Your browser cannot play this video.</video>{onOpen&&<button className="video-expand" onClick={()=>onOpen(media)}><ExternalLink/> Full preview</button>}</>:<button type="button" onClick={()=>onOpen?.(media)} aria-label="Open full photograph"><img src={media.url} alt={media.caption||media.name||`Wedding memory shared by ${media.uploaded_by||'a guest'}`}/>{onOpen&&<span><ExternalLink/> Preview</span>}</button>}</div>}
function FamilyTree() {
  return <PageHero eyebrow="OUR PEOPLE" title={<>Two families,<br/><em>one growing tree.</em></>}>
    <div className="tree-credit"><TreePine/><div><h3>The Khan–Ahmed family & friends tree</h3><p>A living map of the people and stories that brought Raees and Alisha here.</p></div></div>
    <div className="tree-canvas">
      <div className="tree-line vertical"/><div className="tree-line horizontal"/>
      <Person name="Mohammed Raees Khan" role="THE GROOM" className="raees" initials="MRK"/>
      <div className="tree-heart"><Heart fill="currentColor"/></div>
      <Person name="Alisha Ahmed" role="THE BRIDE" className="alisha" initials="AA"/>
      <Person name="The Khan Family" role="FAMILY ROOTS" className="khan" initials="K"/>
      <Person name="The Ahmed Family" role="FAMILY ROOTS" className="ahmed" initials="A"/>
      <Person name="Friends who became family" role="OUR CHOSEN PEOPLE" className="friends" initials="∞"/>
    </div>
    <div className="tree-coming"><Link2/><p><b>The interactive family tree will live here.</b><br/>Members can add a memory, relationship and photograph—with approval from the couple.</p></div>
  </PageHero>;
}
function Person({name, role, className, initials}) { return <div className={`person ${className}`}><div>{initials}</div><b>{name}</b><small>{role}</small></div>; }

function Admin({ rsvps, setRsvps, notify, previewInvite, hostName, privacy, setPrivacy }) {
  const [tab,setTab]=useState('overview'); const [search,setSearch]=useState('');
  const firstName=(hostName||'Host').split(' ')[0];
  const counts = useMemo(() => ({ invited:rsvps.reduce((a,r)=>a+r.guests,0), approved:rsvps.filter(r=>r.status==='approved').reduce((a,r)=>a+r.guests,0), pending:rsvps.filter(r=>r.status==='pending').reduce((a,r)=>a+r.guests,0), checked:rsvps.filter(r=>r.checkedIn).reduce((a,r)=>a+r.guests,0) }),[rsvps]);
  const confirmationRate = counts.invited ? Math.round(counts.approved/counts.invited*100) : 0;
  const refreshGuests=async(showNotice=false)=>{if(!isSupabaseConfigured)return;try{const guests=await listRsvps();setRsvps(guests);if(showNotice)notify('Guest list refreshed');}catch(error){notify(error.message||'Could not load guest responses');}};
  useEffect(()=>{refreshGuests();},[tab]);
  const update=async(id,changes)=>{const previous=rsvps;setRsvps(rs=>rs.map(r=>r.id===id?{...r,...changes}:r));if(isSupabaseConfigured){try{await updateRsvp(id,changes)}catch(error){setRsvps(previous);notify(error.message||'Could not update guest');}}};
  const exportCsv=()=>{ const rows=[['Respondent','Invited names','Invite code','Guests','Status','Meal','Table','Checked in'],...rsvps.map(r=>[r.name,r.invitedAs||r.household,r.inviteCode||'',r.guests,r.status,r.meal,r.table||'',r.checkedIn?'Yes':'No'])]; const blob=new Blob([rows.map(x=>x.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n')],{type:'text/csv'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='raees-alisha-rsvps.csv';a.click();notify('RSVP list downloaded'); };
  const filtered=rsvps.filter(r=>(r.name+r.household).toLowerCase().includes(search.toLowerCase()));
  return <div className="admin-page"><aside><div className="admin-brand"><span>R <i>和</i> A</span><small>WEDDING CONSOLE</small></div><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}><LayoutDashboard/>Overview</button><button className={tab==='rsvps'?'active':''} onClick={()=>setTab('rsvps')}><ListChecks/>RSVP approvals <i>{rsvps.filter(r=>r.status==='pending').length}</i></button><button className={tab==='seating'?'active':''} onClick={()=>setTab('seating')}><TableProperties/>Tables & seating</button><button className={tab==='checkin'?'active':''} onClick={()=>setTab('checkin')}><UserCheck/>Day-of check-in</button><button className={tab==='photos'?'active':''} onClick={()=>setTab('photos')}><Camera/>Photo approvals</button><button className={tab==='privacy'?'active':''} onClick={()=>setTab('privacy')}><LockKeyhole/>Privacy controls</button><button onClick={previewInvite}><Mail/>Invitation preview</button><button className={tab==='questions'?'active':''} onClick={()=>setTab('questions')}><MessageCircleHeart/>Bride questionnaire</button><div className="admin-aside-bottom"><small>Signed in as</small><b>{hostName}</b><span>Private planning area</span></div></aside>
    <section className="admin-main"><div className="admin-top"><div><p className="eyebrow">RAEES & ALISHA</p><h1>{tab==='questions'?'Bride’s design questionnaire':tab==='seating'?'Table & seat planner':tab==='checkin'?'Guest check-in':tab==='photos'?'Photo approvals':tab==='privacy'?'Privacy controls':tab==='rsvps'?'RSVP approvals':`Good afternoon, ${firstName}`}</h1></div><div className="admin-top-actions"><button className="button outline small" onClick={()=>refreshGuests(true)}><RefreshCw size={15}/> Refresh</button><button className="button outline small" onClick={exportCsv}><Download size={15}/> Export CSV</button></div></div>
      {tab==='overview'&&<><div className="stat-grid"><Stat label="Guests invited" value={counts.invited} icon={<Users/>}/><Stat label="Approved" value={counts.approved} icon={<CheckCircle2/>}/><Stat label="Awaiting approval" value={counts.pending} icon={<Clock/>}/><Stat label="Checked in" value={counts.checked} icon={<UserCheck/>}/></div><div className="dashboard-grid"><div className="dash-card"><div className="card-title"><h3>Recent responses</h3><button onClick={()=>setTab('rsvps')}>View all <ArrowRight/></button></div>{rsvps.slice(-4).reverse().map(r=><MiniGuest key={r.id} r={r}/>) }{!rsvps.length&&<div className="empty-list"><Mail/><b>No responses yet</b><span>Guest RSVPs will appear here.</span></div>}</div><div className="dash-card progress-card"><h3>RSVP progress</h3><div className="ring" style={{'--p':`${confirmationRate}%`}}><span>{confirmationRate}%<small>confirmed</small></span></div><p>{counts.invited ? `${counts.approved} of ${counts.invited} invited guests approved` : 'Responses will appear here as guests RSVP'}</p></div></div><InviteTools notify={notify}/></>}
      {tab==='rsvps'&&<GuestTable rsvps={filtered} search={search} setSearch={setSearch} update={update}/>} 
      {tab==='checkin'&&<Checkin rsvps={filtered.filter(r=>r.status==='approved')} search={search} setSearch={setSearch} update={update}/>} 
      {tab==='seating'&&<Seating rsvps={rsvps} update={update}/>} 
      {tab==='photos'&&<PhotoApprovals notify={notify}/>} 
      {tab==='privacy'&&<PrivacyControls privacy={privacy} setPrivacy={setPrivacy} notify={notify}/>} 
      {tab==='questions'&&<Questions/>}
    </section></div>;
}
function Stat({label,value,icon}){return <div className="stat"><div>{icon}</div><span><small>{label}</small><b>{value}</b></span></div>}
function MiniGuest({r}){return <div className="mini-guest"><span>{r.name.split(' ').map(x=>x[0]).join('')}</span><div><b>{r.name}</b><small>{r.household} · {r.guests} guest{r.guests>1?'s':''}</small></div><Status status={r.status}/></div>}
function InviteTools({notify}){
  const [guestNames,setGuestNames]=useState('');
  const [phone,setPhone]=useState('');
  const [limit,setLimit]=useState(1);
  const cleanNames=guestNames.trim();
  const code=`${cleanNames.replace(/[^a-z0-9]/gi,'').slice(0,8).toUpperCase()||'INVITE'}-24`;
  const params=new URLSearchParams({invite:code,names:cleanNames,limit:String(limit)});
  const url=`${window.location.origin}${window.location.pathname}?${params.toString()}`;
  const message=`Bismillāhir-Raḥmānir-Raḥīm\n\n${cleanNames}, Mohammed Raees Khan & Alisha Ahmed request the honour of your presence at their Nikah and wedding celebration on 24 October 2026 in Katima Mulilo.\n\nThis invitation is reserved for ${limit} ${limit===1?'guest':'guests'}. Kindly RSVP by 5 October 2026.\n\nOpen your personal invitation: ${url}`;
  const whatsappNumber=phone.replace(/\D/g,'');
  const whatsappUrl=`https://api.whatsapp.com/send?${whatsappNumber?`phone=${whatsappNumber}&`:''}text=${encodeURIComponent(message)}`;
  const persist=async()=>{ if(isSupabaseConfigured) await saveInvitation({code,guestNames:cleanNames,phone:whatsappNumber,limit}); };
  const copyText=(text)=>{const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';area.style.pointerEvents='none';document.body.appendChild(area);area.focus();area.select();area.setSelectionRange(0,text.length);const copied=document.execCommand('copy');document.body.removeChild(area);if(copied)return Promise.resolve();if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);return Promise.reject(new Error('Copy is unavailable here. Select the generated link and copy it manually.'));};
  const copy=async()=>{try{const copying=copyText(url);await persist();await copying;notify('Invitation saved and personal link copied');}catch(error){notify(error.message||'Invitation could not be saved');}};
  const openAfterSave=async(destination,successMessage)=>{const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;try{await persist();if(tab){tab.location.replace(destination);}else{window.location.assign(destination);}if(successMessage)notify(successMessage);}catch(error){if(tab)tab.close();notify(error.message||'Invitation could not be saved');}};
  const preview=()=>openAfterSave(url);
  const saveForWhatsApp=()=>{persist().then(()=>notify('Invitation saved · opening WhatsApp')).catch(error=>notify(error.message||'Invitation could not be saved'));};
  return <div className="invite-tools dash-card"><div><p className="eyebrow">WHATSAPP E-INVITATIONS</p><h3>Create a personal opening invitation</h3><p>Enter the names exactly as they should appear on the card. Every link carries the guest names and permitted party size into the RSVP.</p></div><div className="invite-builder"><div className="invite-fields"><label>Names on the invitation<input value={guestNames} onChange={e=>setGuestNames(e.target.value)} placeholder="Enter invited guest name(s)"/></label><label>WhatsApp number <small>Optional · country code first</small><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. 264 81 234 5678"/></label><label>Maximum guests<select value={limit} onChange={e=>setLimit(Number(e.target.value))}>{[1,2,3,4,5,6,7,8,9,10].map(n=><option value={n} key={n}>{n} guest{n>1?'s':''}</option>)}</select></label></div><div className="generated-link"><Link2/><span>{cleanNames?url:'Enter the invited names to create their link'}</span></div><div className="invite-actions"><button disabled={!cleanNames} onClick={preview}><ExternalLink/> Preview</button><button disabled={!cleanNames} onClick={copy}><Link2/> Copy link</button><a className={`whatsapp-action ${!cleanNames?'disabled':''}`} href={cleanNames?whatsappUrl:undefined} target="_blank" rel="noopener noreferrer external" onClick={e=>{if(!cleanNames){e.preventDefault();return}saveForWhatsApp()}}><Send/> {whatsappNumber?'Send to guest':'Open WhatsApp'}</a></div></div></div>
}
function Status({status}){return <span className={`status ${status}`}>{status}</span>}
function GuestTable({rsvps,search,setSearch,update}){return <div className="dash-card table-card"><div className="table-tools"><div><Search/><input placeholder="Search guests or households" value={search} onChange={e=>setSearch(e.target.value)}/></div><span>{rsvps.length} responses</span></div><div className="responsive-table"><table><thead><tr><th>Guest / household</th><th>Party</th><th>Meal</th><th>Status</th><th>Actions</th></tr></thead><tbody>{!rsvps.length&&<tr><td colSpan="5"><div className="empty-table"><Users/><b>No guest responses yet</b><span>New RSVPs will be ready for approval here.</span></div></td></tr>}{rsvps.map(r=><tr key={r.id}><td><b>{r.name}</b><small>{r.household}</small></td><td>{r.guests}</td><td>{r.meal}</td><td><Status status={r.status}/></td><td>{r.status==='pending'?<div className="row-actions"><button onClick={()=>update(r.id,{status:'approved'})}><Check/> Approve</button><button className="reject" onClick={()=>update(r.id,{status:'declined'})}><X/> Decline</button></div>:<button className="reset" onClick={()=>update(r.id,{status:'pending'})}>Change</button>}</td></tr>)}</tbody></table></div></div>}
function Checkin({rsvps,search,setSearch,update}){return <div className="checkin"><div className="checkin-search"><Search/><input autoFocus placeholder="Search guest name…" value={search} onChange={e=>setSearch(e.target.value)}/><QrCode/></div>{!rsvps.length&&<div className="empty-list checkin-empty"><UserCheck/><b>No approved guests yet</b><span>Approved RSVPs will be available for wedding-day check-in.</span></div>}{rsvps.map(r=><div className={`checkin-row ${r.checkedIn?'done':''}`} key={r.id}><div className="avatar">{r.name.split(' ').map(x=>x[0]).join('')}</div><div><b>{r.name}</b><span>{r.guests} guest{r.guests>1?'s':''} · Table {r.table||'unassigned'}</span></div><button onClick={()=>update(r.id,{checkedIn:!r.checkedIn})}>{r.checkedIn?<><Check/> Checked in</>:<>Check in party</>}</button></div>)}</div>}
function Seating({rsvps,update}){const approved=rsvps.filter(r=>r.status==='approved');return <><div className="seating-tools"><p><b>{approved.reduce((a,r)=>a+r.guests,0)} guests</b> across {tables.length} tables · Drag-and-drop is planned for the live version.</p><span><i/> Stage</span></div><div className="floorplan"><div className="stage">RAEES <Heart fill="currentColor"/> ALISHA<small>HEAD TABLE</small></div>{tables.map(t=>{const assigned=approved.filter(r=>r.table===t.id);const used=assigned.reduce((a,r)=>a+r.guests,0);return <div key={t.id} className="wedding-table" style={{left:`${t.x}%`,top:`${t.y}%`}}><div><b>{t.name}</b><small>{used}/{t.seats}</small></div><span>{assigned.map(r=>r.name.split(' ')[0]).join(' · ')||'Unassigned'}</span></div>})}</div><div className="unassigned"><h3>Assign households</h3>{approved.map(r=><div key={r.id}><span><b>{r.name}</b><small>{r.guests} seats</small></span><select value={r.table||''} onChange={e=>update(r.id,{table:Number(e.target.value)||null})}><option value="">Unassigned</option>{tables.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></div>)}</div></>}
function PrivacyControls({privacy,setPrivacy,notify}){const [draft,setDraft]=useState(privacy);const [busy,setBusy]=useState(false);useEffect(()=>setDraft(privacy),[privacy]);const save=async()=>{setBusy(true);try{const saved=isSupabaseConfigured?await saveSiteSettings(draft):draft;setPrivacy(saved);notify('Privacy settings saved')}catch(error){notify(error.message||'Could not save privacy settings')}finally{setBusy(false)}};const options=[['everyone','Everyone with the website link','Visible from the public website.'],['invited','Verified invited guests','Requires a valid personal invitation.'],['hosts','Hosts only','Hidden from all guests and public visitors.']];return <div className="privacy-controls"><div className="privacy-intro"><LockKeyhole/><div><h3>Choose who can see private family spaces</h3><p>These settings take effect across the website as soon as you save them.</p></div></div>{[['album_visibility','Guest wedding album',Camera],['tree_visibility','Family and friends tree',TreePine]].map(([key,title,Icon])=><section key={key}><div className="privacy-section-title"><Icon/><div><h4>{title}</h4><p>Current access: {options.find(o=>o[0]===draft[key])?.[1]}</p></div></div><div className="visibility-options">{options.map(([value,label,description])=><label className={draft[key]===value?'selected':''} key={value}><input type="radio" name={key} value={value} checked={draft[key]===value} onChange={()=>setDraft({...draft,[key]:value})}/><span><b>{label}</b><small>{description}</small></span>{draft[key]===value&&<Check/>}</label>)}</div></section>)}<button className="button dark" disabled={busy} onClick={save}>{busy?'Saving…':'Save privacy settings'} {!busy&&<Check/>}</button></div>}
function PhotoApprovals({notify}){const [photos,setPhotos]=useState([]);const [busy,setBusy]=useState(true);const [selected,setSelected]=useState(null);const load=async()=>{setBusy(true);try{setPhotos(await listPhotoQueue())}catch(error){notify(error.message||'Could not load photographs')}finally{setBusy(false)}};useEffect(()=>{load()},[]);const decide=async(id,status)=>{try{await moderatePhoto(id,status);setPhotos(items=>items.map(p=>p.id===id?{...p,status}:p));notify(status==='approved'?'Media approved':'Media rejected')}catch(error){notify(error.message||'Could not update photograph')}};return <div className="photo-approvals"><div className="photo-approval-tools"><p>{photos.filter(p=>p.status==='pending').length} media files awaiting review</p><button onClick={load}><RefreshCw/> Refresh</button></div>{busy?<div className="empty-list"><Camera/><b>Loading media…</b></div>:!photos.length?<div className="empty-list"><Camera/><b>No media yet</b><span>Guest photos and videos will appear here for approval.</span></div>:<div className="moderation-grid">{photos.map(p=><article key={p.id}><MediaPreview media={p} onOpen={setSelected}/><div><b>{p.uploaded_by}</b><small>{p.invitations?.guest_names} · {new Date(p.created_at).toLocaleDateString()}</small><Status status={p.status}/><div className="moderation-actions"><button disabled={p.status==='approved'} onClick={()=>decide(p.id,'approved')}><Check/> Approve</button><button className="reject" disabled={p.status==='rejected'} onClick={()=>decide(p.id,'rejected')}><X/> Reject</button></div></div></article>)}</div>}{selected&&<div className="media-lightbox" onClick={()=>setSelected(null)}><button className="lightbox-close" onClick={()=>setSelected(null)}><X/></button><div onClick={e=>e.stopPropagation()}><MediaPreview media={selected}/><p>Uploaded by <b>{selected.uploaded_by}</b></p></div></div>}</div>}
function Questions(){return <div className="questions-card"><div className="questions-intro"><MessageCircleHeart/><div><h3>Questions for Alisha</h3><p>These answers will shape the final invitation and keepsake. Take your time—there are no wrong answers.</p></div></div>{questionnaire.map((q,i)=><label key={q}><span>{String(i+1).padStart(2,'0')}</span><div><b>{q}</b><textarea placeholder="Alisha’s thoughts…"/></div></label>)}<button className="button dark" onClick={()=>alert('Answers saved in this prototype')}>Save answers <Check/></button></div>}

function LoginModal({close,success}){
  const [pin,setPin]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [forgot,setForgot]=useState(false); const [sent,setSent]=useState(false);
  const login=async()=>{setBusy(true);setError('');try{if(isSupabaseConfigured){await signInHost(email,password);const profile=await getHostProfile();await success(profile);}else if(pin==='7860'){success({display_name:'Wedding host'});}else{throw new Error('That PIN isn’t right. Try 7860 for this preview.');}}catch(err){setError(err.message||'Unable to sign in.');}finally{setBusy(false)}};
  const reset=async()=>{setBusy(true);setError('');try{await sendPasswordReset(email);setSent(true);}catch(err){setError(err.message||'Unable to send reset email.');}finally{setBusy(false)}};
  return <div className="modal-backdrop"><div className="modal login-modal"><button className="modal-x" onClick={close}><X/></button><div className="modal-icon"><LockKeyhole/></div><p className="eyebrow">PRIVATE PLANNING AREA</p>{forgot?<><h2>Reset password</h2>{sent?<div className="reset-sent"><Mail/><b>Check your inbox</b><p>We sent a secure password-reset link to {email}.</p></div>:<><p>Enter your host email and we’ll send you a secure reset link.</p><input autoFocus type="email" placeholder="Host email address" value={email} onChange={e=>setEmail(e.target.value)}/><button className="button dark wide" disabled={busy||!email} onClick={reset}>{busy?'Sending…':'Send reset link'} {!busy&&<Send/>}</button></>}<button className="forgot-link" onClick={()=>{setForgot(false);setSent(false);setError('')}}>← Back to sign in</button></>:<><h2>Welcome, host.</h2>{isSupabaseConfigured?<><p>Sign in with the private wedding host account.</p><input autoFocus type="email" placeholder="Host email address" value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/></>:<><p>Enter the preview PIN to manage guests, approvals and seating.</p><input autoFocus type="password" inputMode="numeric" placeholder="4-digit PIN" value={pin} onChange={e=>setPin(e.target.value)}/></>}<button className="button dark wide" disabled={busy||isSupabaseConfigured&&(!email||!password)} onClick={login}>{busy?'Signing in…':'Enter dashboard'} {!busy&&<ArrowRight/>}</button>{isSupabaseConfigured&&<button className="forgot-link" onClick={()=>{setForgot(true);setError('')}}>Forgot your password?</button>}</>}{error&&<small className="error">{error}</small>}{!isSupabaseConfigured&&!forgot&&<small>Preview PIN: <b>7860</b></small>}</div></div>
}
function ResetPasswordModal({close,notify}){const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const save=async()=>{if(password.length<8){setError('Use at least 8 characters.');return}if(password!==confirm){setError('The passwords do not match.');return}setBusy(true);try{await setNewPassword(password);notify('Your password has been updated');close();window.history.replaceState({},'',window.location.pathname);}catch(err){setError(err.message||'Unable to update password.');}finally{setBusy(false)}};return <div className="modal-backdrop"><div className="modal login-modal"><div className="modal-icon"><LockKeyhole/></div><p className="eyebrow">SECURE HOST ACCOUNT</p><h2>Choose a new password</h2><p>Use at least eight characters and keep it private.</p><input autoFocus type="password" placeholder="New password" value={password} onChange={e=>setPassword(e.target.value)}/><input type="password" placeholder="Confirm new password" value={confirm} onChange={e=>setConfirm(e.target.value)}/><button className="button dark wide" disabled={busy||!password||!confirm} onClick={save}>{busy?'Updating…':'Update password'} {!busy&&<Check/>}</button>{error&&<small className="error">{error}</small>}</div></div>}
function InviteExperience({close,go,onVerified}){
  const params = new URLSearchParams(window.location.search);
  const requestedNames = params.get('names') || params.get('family') || 'Honoured Guest';
  const inviteCode = params.get('invite') || '';
  const requestedLimit = Math.max(1, Math.min(10, Number(params.get('limit')) || 1));
  const [invite,setInvite]=useState({guestNames:requestedNames,guestLimit:requestedLimit});
  const [inviteValid,setInviteValid]=useState(!isSupabaseConfigured);
  const {guestNames,guestLimit}=invite;
  const [opened,setOpened] = useState(false);
  useEffect(()=>{if(isSupabaseConfigured&&inviteCode)findInvitation(inviteCode).then(found=>{if(found){setInvite({guestNames:found.guest_names,guestLimit:found.max_guests});setInviteValid(true)}}).catch(()=>{});},[inviteCode]);
  useEffect(()=>{ const timer=setTimeout(()=>setOpened(true),900); return()=>clearTimeout(timer); },[]);
  const enter=(page)=>{ const inviteData={guestNames,inviteCode,guestLimit}; sessionStorage.setItem('raa-active-invite',JSON.stringify(inviteData)); localStorage.setItem('raa-guest-invite',JSON.stringify(inviteData)); if(inviteValid)onVerified?.(); close(); window.history.replaceState({},'',window.location.pathname); go(page); };
  return <div className={`invite-experience ${opened?'opened':''}`}>
    <div className="invite-stars"/><button className="invite-close" onClick={()=>enter('home')} aria-label="Close invitation"><X/></button>
    <div className="opening-message"><span>AN INVITATION FOR</span><b>{guestNames}</b></div>
    <div className="envelope-scene" onClick={()=>setOpened(true)}>
      <div className="envelope">
        <div className="envelope-back"/>
        <div className="letter-slot"><div className="invitation-card">
          <div className="card-inner">
            <span className="double-happiness">囍</span>
            <p className="invite-bismillah">BISMILLĀHIR-RAḤMĀNIR-RAḤĪM</p>
            <p className="invite-kicker">TOGETHER WITH THEIR FAMILIES</p>
            <h2><span>Mohammed Raees Khan</span><em className="love-mark">&</em><span>Alisha Ahmed</span></h2>
            <i>request the honour of your presence<br/>at their Nikah and wedding celebration</i>
            <div className="invite-date"><b>24</b><span>OCTOBER<br/>2026</span></div>
            <p className="invite-place">KATIMA MULILO · NAMIBIA</p>
            <p className="dua">May Allah bless this union with love, mercy and barakah.</p>
            <div className="invite-to">PERSONALLY INVITED<br/><b>{guestNames}</b><small>{guestLimit===1?'Individual invitation':`Invitation for up to ${guestLimit} guests`}</small></div>
            <p className="rsvp-by">KINDLY RSVP BY 5 OCTOBER 2026</p>
            <div className="card-actions"><button onClick={(e)=>{e.stopPropagation();enter('rsvp')}}>Kindly respond <ArrowRight/></button><button onClick={(e)=>{e.stopPropagation();enter('details')}}>View details</button></div>
          </div>
        </div></div>
        <div className="envelope-front"/><div className="envelope-flap"/><div className="wax-seal"><span>R<i>A</i></span></div>
      </div>
      <p className="tap-note">{opened?'Your invitation awaits':'Opening your invitation…'}</p>
    </div>
  </div>
}
function Footer({go,canAlbum}){return <footer><div className="footer-mark"><span>R</span><span>A</span></div><p>Made with love for the wedding of<br/><b>Mohammed Raees Khan & Alisha Ahmed</b></p><div><button onClick={()=>go('details')}>Details</button><button onClick={()=>go('rsvp')}>RSVP</button>{canAlbum&&<button onClick={()=>go('album')}>Album</button>}</div><small>Forever begins here · {EVENT.date}<span className="site-credit">Crafted by Ace Khan</span></small></footer>}

createRoot(document.getElementById('root')).render(<App/>);
