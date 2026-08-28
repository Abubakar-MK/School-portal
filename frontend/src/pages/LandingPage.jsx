import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import school from '../config/school';

/**
 * Public marketing/landing page shown at "/" for anyone not logged in.
 * Purely informational — no data lives here, every button routes to
 * the real Login page (optionally pre-selecting the Student or Staff tab).
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const goLogin = (tab) => navigate(`/login${tab ? `?tab=${tab}` : ''}`);

  // Header shrinks slightly once the page is scrolled, so it stays
  // pinned in place without permanently taking up as much space.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="h-2 bg-gradient-to-r from-maroon-dark via-maroon to-gold" />

      {/* Header / Nav — frozen (sticky) so it stays visible while scrolling */}
      <header
        className={`sticky top-0 z-50 bg-white flex items-center justify-between px-6 md:px-10 border-b flex-wrap gap-4 transition-all duration-200 ${
          scrolled ? 'py-2 shadow-md' : 'py-4'
        }`}
      >
        <div className="flex items-center gap-4">
          <Logo size={scrolled ? 44 : 64} className="transition-all duration-200" />
          <div>
            <h1 className={`text-maroon font-extrabold leading-tight transition-all duration-200 ${scrolled ? 'text-sm md:text-base' : 'text-base md:text-xl'}`}>
              {school.fullName.toUpperCase()}
            </h1>
            {!scrolled && <p className="text-xs md:text-sm text-gray-500">{school.address}</p>}
          </div>
        </div>
        <nav className="flex items-center gap-6 text-sm font-semibold text-gray-700">
          <a href="#home" className="text-maroon border-b-2 border-maroon pb-1">Home</a>
          <a href="#about" className="hover:text-maroon">About Us</a>
          <a href="#guide" className="hover:text-maroon">Portal Guide</a>
          <a href="#contact" className="hover:text-maroon">Contact Us</a>
          <button
            onClick={() => goLogin()}
            className="flex items-center gap-2 bg-maroon hover:bg-maroon-light text-gold-light px-4 py-2 rounded font-semibold"
          >
            <IconUser /> Portal Login
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section id="home" className="relative overflow-hidden scroll-mt-24">
        <div className="grid md:grid-cols-2 gap-8 px-6 md:px-10 py-12 items-center max-w-7xl mx-auto">
          <div>
            <p className="text-gold font-bold tracking-wide text-sm mb-1">WELCOME TO</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-maroon leading-tight mb-3">
              {school.heroHeadingLines.map((line, i) => (
                <span key={i}>{line}{i < school.heroHeadingLines.length - 1 && <br />}</span>
              ))}
            </h2>
            <p className="text-xl font-semibold text-gray-700 mb-4">Student Result Management System</p>
            <p className="text-gray-600 mb-6 max-w-md">
              A secure, reliable and efficient platform for managing academic results and student information.
              Access your results anytime, anywhere.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={() => goLogin('student')}
                className="flex items-center gap-3 bg-maroon hover:bg-maroon-light text-white px-5 py-3 rounded font-semibold"
              >
                <IconCap />
                <span className="text-left leading-tight">
                  <span className="block text-sm">STUDENT LOGIN</span>
                  <span className="block text-xs font-normal opacity-80">View Your Result</span>
                </span>
              </button>
              <button
                onClick={() => goLogin('staff')}
                className="flex items-center gap-3 border-2 border-maroon text-maroon px-5 py-3 rounded font-semibold hover:bg-maroon/5"
              >
                <IconUsers />
                <span className="text-left leading-tight">
                  <span className="block text-sm">ADMIN LOGIN</span>
                  <span className="block text-xs font-normal opacity-80">Admin / Staff Access</span>
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 bg-gold-light/30 border border-gold rounded px-4 py-2 text-sm text-gray-700 w-fit">
              <IconShield /> Your security is our priority. All data is protected and confidential.
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden shadow-xl bg-gradient-to-br from-maroon-dark via-maroon to-gold h-72 md:h-96 flex items-center justify-center">
            <div className="text-center text-white px-6">
              <IconBuilding />
              <p className="mt-4 font-semibold text-gold-light">{school.shortName} Campus</p>
              <p className="text-xs text-white/70 mt-1">{school.address}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="about" className="bg-gray-50 py-14 px-6 md:px-10 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 justify-center mb-10">
            <span className="h-px w-16 bg-gold" />
            <h3 className="text-gold font-bold tracking-wide">PORTAL FEATURES</h3>
            <span className="h-px w-16 bg-gold" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            <Feature icon={<IconShield />} title="Secure Access" text="Role-based access ensures only authorized users can view data." />
            <Feature icon={<IconCap />} title="Result Management" text="Accurate and timely management of student academic results." />
            <Feature icon={<IconChart />} title="Performance Reports" text="Detailed reports and analytics for students and administrators." />
            <Feature icon={<IconPrinter />} title="Print & Download" text="Print or download your results easily in PDF format." />
            <Feature icon={<IconPhone />} title="Mobile Friendly" text="Access the portal seamlessly on any device, anytime." />
          </div>
        </div>
      </section>

      {/* Quick Access + Quote */}
      <section id="guide" className="max-w-7xl mx-auto px-6 md:px-10 py-14 grid md:grid-cols-3 gap-8 scroll-mt-24">
        <div className="md:col-span-2 flex flex-col justify-between">
          <blockquote className="bg-maroon text-white rounded-lg p-6 flex items-center gap-4">
            <span className="text-4xl text-gold-light leading-none">&ldquo;</span>
            <div>
              <p className="italic">Education is the most powerful weapon which you can use to change the world.</p>
              <p className="text-gold-light text-sm mt-2">— Nelson Mandela</p>
            </div>
          </blockquote>
        </div>
        <div>
          <div className="flex items-center gap-3 justify-center mb-4">
            <span className="h-px w-10 bg-gold" />
            <h3 className="text-gold font-bold tracking-wide text-sm">QUICK ACCESS</h3>
            <span className="h-px w-10 bg-gold" />
          </div>
          <button onClick={() => goLogin('student')} className="w-full text-left flex items-center gap-4 bg-maroon/5 border border-maroon/20 rounded-lg p-4 mb-3 hover:bg-maroon/10">
            <span className="bg-maroon text-white rounded-full p-2"><IconCap /></span>
            <span>
              <span className="block font-semibold text-maroon">For Students</span>
              <span className="block text-xs text-gray-600">Login with your Matriculation Number and Password to view your current published result.</span>
            </span>
            <span className="ml-auto text-maroon">›</span>
          </button>
          <button onClick={() => goLogin('staff')} className="w-full text-left flex items-center gap-4 bg-gold-light/20 border border-gold/40 rounded-lg p-4 hover:bg-gold-light/30">
            <span className="bg-gold text-white rounded-full p-2"><IconUsers /></span>
            <span>
              <span className="block font-semibold text-maroon">For Administrators</span>
              <span className="block text-xs text-gray-600">Admins can manage students, enter results and manage the academic process.</span>
            </span>
            <span className="ml-auto text-maroon">›</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-maroon-dark text-white px-6 md:px-10 py-8 scroll-mt-24">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-6 justify-between items-start text-sm">
          <div className="flex items-start gap-2 max-w-xs">
            <IconPin /> <span>{school.address}</span>
          </div>
          <div className="flex items-start gap-2">
            <IconPhoneOutline />
            <span>{school.phones.map((ph, i) => <span key={ph}>{ph}{i < school.phones.length - 1 && <br />}</span>)}</span>
          </div>
          <div className="flex items-start gap-2">
            <IconMail /> <span>{school.email}</span>
          </div>
          <div className="flex items-start gap-2">
            <IconGlobe /> <a href={school.websiteUrl} className="hover:underline">{school.website}</a>
          </div>
          <div className="text-white/70 text-xs max-w-xs">
            © {new Date().getFullYear()} {school.copyrightName}. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="bg-white rounded-lg p-5 text-center shadow-sm border">
      <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-maroon/10 text-maroon flex items-center justify-center">
        {icon}
      </div>
      <h4 className="font-semibold text-gray-800 text-sm mb-1">{title}</h4>
      <p className="text-xs text-gray-500">{text}</p>
    </div>
  );
}

/* ---- Minimal inline icon set (no external icon library needed) ---- */
function IconShield() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /></svg>;
}
function IconCap() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3L1 9l11 6 9-4.9V17" /><path d="M5 11.5V17c0 1.5 3 3 7 3s7-1.5 7-3v-5.5" /></svg>;
}
function IconChart() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20V10M12 20V4M20 20v-7" /></svg>;
}
function IconPrinter() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="8" rx="1" /><path d="M6 17v4h12v-4" /></svg>;
}
function IconPhone() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>;
}
function IconUser() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>;
}
function IconUsers() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3" /><path d="M2 20c0-3 3-5 7-5s7 2 7 5" /><circle cx="17" cy="9" r="2.5" /><path d="M22 20c0-2.2-2-4-4.5-4.7" /></svg>;
}
function IconBuilding() {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-90">
      <path d="M4 21V9l8-5 8 5v12" /><path d="M4 21h16" /><path d="M9 21v-6h6v6" /><path d="M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
    </svg>
  );
}
function IconPin() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>;
}
function IconPhoneOutline() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M22 16.9v2a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6A19.8 19.8 0 013.1 4.2 2 2 0 015.1 2h2a2 2 0 012 1.7c.1 1 .3 2 .6 2.9a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.2a2 2 0 012.1-.5c.9.3 1.9.5 2.9.6a2 2 0 011.7 2z" /></svg>;
}
function IconMail() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 6l10 7 10-7" /></svg>;
}
function IconGlobe() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z" /></svg>;
}
