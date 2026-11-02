export default function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`toggle${on ? ' is-on' : ''}`}
      onClick={onChange}
    >
      <span className="toggle-knob" />
    </button>
  );
}
