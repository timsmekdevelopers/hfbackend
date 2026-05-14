import React, { useState } from 'react';

export default function OrgNavbar({ org }) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (!org || !org.navbarItems || org.navbarItems.length === 0) return null;

  const navStyle = {
    background: 'var(--theme-primary-dark, #27408b)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    minHeight: 44,
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: 0,
    position: 'relative'
  };

  const linkStyle = {
    color: 'rgba(255,255,255,0.9)',
    textDecoration: 'none',
    padding: '10px 16px',
    fontSize: '0.9rem',
    fontWeight: 500,
    display: 'inline-block',
    transition: 'background 0.15s',
    borderRadius: 4
  };

  const hamburgerStyle = {
    display: 'none',
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 22,
    cursor: 'pointer',
    padding: '8px 4px',
    marginLeft: 'auto'
  };

  return (
    <nav style={navStyle} aria-label="Organization navigation">
      {/* Desktop links */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0,
          alignItems: 'center'
        }}
        className="org-nav-links"
      >
        {org.navbarItems.map((item, i) => (
          <a
            key={i}
            href={item.href}
            target={item.href.startsWith('http') ? '_blank' : undefined}
            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            style={linkStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {item.label}
          </a>
        ))}
      </div>

      {/* Mobile hamburger */}
      <button
        style={{ ...hamburgerStyle, display: 'block' }}
        className="org-nav-hamburger"
        aria-label="Toggle navigation menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(o => !o)}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--theme-primary-dark, #27408b)',
            zIndex: 999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column'
          }}
          className="org-nav-mobile"
        >
          {org.navbarItems.map((item, i) => (
            <a
              key={i}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{ ...linkStyle, padding: '12px 20px', borderRadius: 0, borderBottom: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
