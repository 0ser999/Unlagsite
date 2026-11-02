import { Link } from 'react-router-dom';
import { Download as DownloadIcon, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/Blocks.jsx';
import { DOWNLOAD_URL, VERSION } from '../data.js';

const REQUIREMENTS = [
  ['System', 'Windows 10 or Windows 11, 64-bit'],
  ['Rights', 'An administrator account'],
  ['Account', 'Email, Google or Discord sign-in'],
  ['BIOS module', 'A motherboard with AMI firmware'],
];

const INSTALL = [
  ['Run the installer', 'It installs Unlag for every user on the PC and adds desktop and Start menu shortcuts.'],
  ['Allow administrator access', 'Windows asks for it when Unlag starts. The engine needs it to change system settings.'],
  ['Sign in', 'Create an account with your email, or continue with Google or Discord.'],
  ['Create a restore point', 'Open Backups and make one before your first tweak. It takes a few seconds.'],
];

export default function Download() {
  return (
    <main>
      <PageHeader title="Download Unlag">
        One installer for Windows 10 and 11. Free to start, upgrade from inside the app.
      </PageHeader>
      <section className="section section-tight">
        <div className="wrap download-grid">
          <div className="download-card">
            <img src="/logo.png" alt="" width="64" height="64" className="download-logo" />
            <div>
              <h2>Unlag for Windows</h2>
              <p className="mono">v{VERSION} · x64 installer</p>
            </div>
            <a href={DOWNLOAD_URL} className="btn btn-primary download-btn">
              <DownloadIcon size={18} strokeWidth={1.5} />Download unlag.exe
            </a>
            <dl className="reqs">
              {REQUIREMENTS.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="install-title">Install in four steps</h2>
            <ol className="steps">
              {INSTALL.map(([title, text], i) => (
                <li key={title}>
                  <span className="step-n mono">{i + 1}</span>
                  <div><h4>{title}</h4><p>{text}</p></div>
                </li>
              ))}
            </ol>
            <Link to="/how-it-works" className="text-link">How Unlag keeps changes reversible<ArrowRight size={16} strokeWidth={1.5} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
