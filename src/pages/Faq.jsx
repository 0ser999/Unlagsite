import { Plus } from 'lucide-react';
import { PageHeader, CtaBand } from '../components/Blocks.jsx';
import { t } from '../i18n/index.jsx';

export function FaqList({ items, openFirst = true }) {
  return (
    <div className="faq-list">
      {items.map((item, i) => (
        <details key={item.q} open={openFirst && i === 0}>
          <summary>{item.q}?<Plus size={18} strokeWidth={1.5} /></summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export default function Faq() {
  return (
    <main>
      <PageHeader title={t('faq.title')}>{t('faq.lead')}</PageHeader>
      {t('faq.groups').map((group, i) => (
        <section className={`section${i === 0 ? ' section-tight' : ''}`} key={group.group}>
          <div className="wrap faq">
            <div className="section-head"><h2>{group.group}</h2></div>
            <FaqList items={group.items} openFirst={i === 0} />
          </div>
        </section>
      ))}
      <CtaBand />
    </main>
  );
}
