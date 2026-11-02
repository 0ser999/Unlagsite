import { Check, Minus } from 'lucide-react';
import { PageHeader, PlanCards, CtaBand } from '../components/Blocks.jsx';
import { FaqList } from './Faq.jsx';
import { PLANS, PLAN_MATRIX, FAQ } from '../data.js';

const RANK = { free: 0, premium: 1, ultra: 2 };

function Compare() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <h2>Compare plans</h2>
          <p>The pages of the app each plan opens.</p>
        </div>
        <div className="compare-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">Page</th>
                {PLANS.map((p) => <th scope="col" key={p.id}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {PLAN_MATRIX.map(([page, min]) => (
                <tr key={page}>
                  <th scope="row">{page}</th>
                  {PLANS.map((p) => (
                    <td key={p.id}>
                      {RANK[p.id] >= RANK[min]
                        ? <Check size={16} strokeWidth={1.5} aria-label="Included" />
                        : <Minus size={16} strokeWidth={1.5} className="no" aria-label="Not included" />}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">Assistant messages a day</th>
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
  const planFaq = FAQ.find((g) => g.group === 'Account and plans');
  return (
    <main>
      <PageHeader title="Start for free, upgrade when you play">
        Cleanup and privacy are free. Paid plans add the modules that deal with latency and the BIOS.
      </PageHeader>
      <section className="section section-tight">
        <div className="wrap">
          <PlanCards />
          <p className="plans-note">Paid plans are activated from the app, on the Plans page. A plan is tied to one PC.</p>
        </div>
      </section>
      <Compare />
      <section className="section">
        <div className="wrap faq">
          <div className="section-head"><h2>About plans</h2></div>
          <FaqList items={planFaq.items} />
        </div>
      </section>
      <CtaBand />
    </main>
  );
}
