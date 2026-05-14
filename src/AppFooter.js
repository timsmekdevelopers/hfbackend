import React from 'react';

const DEFAULT_HOSTS = new Set(['localhost', '127.0.0.1', 'hffrontend.vercel.app']);

export default function AppFooter({ org }) {
  const year = new Date().getFullYear();
  const isOrgDomain = !DEFAULT_HOSTS.has(window.location.hostname);
  const showOrgBranding = isOrgDomain && org;

  const footerStyle = {
    background: 'var(--theme-primary, #4169e1)',
    color: 'rgba(255,255,255,0.9)',
    padding: '14px 24px',
    textAlign: 'center',
    fontSize: '0.82rem',
    flexShrink: 0,
    marginTop: 'auto'
  };

  const linkStyle = {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    margin: '0 8px',
    fontSize: '0.82rem'
  };

  return (
    <footer style={footerStyle}>
      {showOrgBranding && org.footerLinks && org.footerLinks.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {org.footerLinks.map((link, i) => (
            <a
              key={i}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
      <div>
        {showOrgBranding
          ? `© ${year} ${org.name}. All rights reserved.`
          : `© ${year} Our Church Fellowship`}
      </div>
    </footer>
  );
}
