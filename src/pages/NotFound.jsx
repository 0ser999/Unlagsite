import { Link } from 'react-router-dom';
import Diff from '../components/Diff.jsx';
import { t } from '../i18n/index.jsx';

export default function NotFound() {
  return (
    <main className="notfound">
      <div className="wrap">
        <Diff k="PageExists" from="1" to="missing" />
        <h1>{t('notFound.title')}</h1>
        <p>{t('notFound.text')}</p>
        <Link to="/" className="btn btn-secondary">{t('notFound.back')}</Link>
      </div>
    </main>
  );
}
