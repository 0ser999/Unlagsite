import { Link } from 'react-router-dom';
import { Download as DownloadIcon, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/Blocks.jsx';
import { DOWNLOAD_URL, VERSION } from '../data.js';
import { t } from '../i18n/index.jsx';

export default function Download() {
  return (
    <main>
      <PageHeader title={t('download.title')}>{t('download.lead')}</PageHeader>
      <section className="section section-tight">
        <div className="wrap download-grid">
          <div className="download-card">
            <img src="/logo.webp" alt="" width="64" height="64" className="download-logo" />
            <div>
              <h2>{t('download.card')}</h2>
              <p className="mono">{t('download.meta', { v: VERSION })}</p>
            </div>
            <a href={DOWNLOAD_URL} className="btn btn-primary download-btn">
              <DownloadIcon size={18} strokeWidth={1.5} />{t('download.button')}
            </a>
            <dl className="reqs">
              {t('download.reqs').map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="install-title">{t('download.installTitle')}</h2>
            <ol className="steps">
              {t('download.install').map(([title, text], i) => (
                <li key={title}>
                  <span className="step-n mono">{i + 1}</span>
                  <div><h3>{title}</h3><p>{text}</p></div>
                </li>
              ))}
            </ol>
            <Link to="/how-it-works" className="text-link">{t('download.link')}<ArrowRight size={16} strokeWidth={1.5} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
