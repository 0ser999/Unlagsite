import { Check, Minus } from 'lucide-react';
import { PageHeader, PlanCards, CtaBand } from '../components/Blocks.jsx';
import { FaqList } from './Faq.jsx';
import { PLANS, PLAN_MATRIX } from '../data.js';
import { t } from '../i18n/index.jsx';

const RANK = { free: 0, premium: 1, ultra: 2 };

function Compare() {
  const labels = t('plans.matrix');
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <h2>{t('pricing.compareTitle')}</h2>
          <p>{t('pricing.compareText')}</p>
        </div>
        <div className="compare-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">{t('pricing.page')}</th>
                {PLANS.map((p) => <th scope="col" key={p.id}>{t(`plans.names.${p.id}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {PLAN_MATRIX.map(([page, min], i) => (
                <tr key={page}>
                  <th scope="row">{labels[i] || page}</th>
                  {PLANS.map((p) => (
                    <td key={p.id}>
                      {RANK[p.id] >= RANK[min]
                        ? <Check size={16} strokeWidth={1.5} aria-label={t('pricing.included')} />
                        : <Minus size={16} strokeWidth={1.5} className="no" aria-label={t('pricing.notIncluded')} />}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">{t('pricing.assistantRow')}</th>
                {PLANS.map((p) => <td key={p.id} className="mono">{p.ai}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function Pricing() {
  const groups = t('faq.groups');
  const planFaq = groups[groups.length - 1];
  return (
    <main>
      <PageHeader title={t('pricing.title')}>{t('pricing.lead')}</PageHeader>
      <section className="section section-tight">
        <div className="wrap">
          <PlanCards />
          <p className="plans-note">{t('pricing.note')}</p>
        </div>
      </section>
      <Compare />
      <section className="section">
        <div className="wrap faq">
          <div className="section-head"><h2>{t('pricing.about')}</h2></div>
          <FaqList items={planFaq.items} />
        </div>
      </section>
      <CtaBand />
    </main>
  );
}
