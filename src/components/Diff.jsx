// The signature: a registry value before and after, the way Unlag records it.
export default function Diff({ k, from, to, on = true }) {
  return (
    <div className={`diff mono${on ? ' is-on' : ''}`}>
      <span className="k">{k}</span>
      <span className="v-from">{from}</span>
      <span className="v-arrow">→</span>
      <span className="v-swap">
        <span className="v-to">{to}</span>
        <span className="v-back">{from}</span>
      </span>
    </div>
  );
}
