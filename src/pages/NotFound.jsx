import { Link } from 'react-router-dom';
import Diff from '../components/Diff.jsx';

export default function NotFound() {
  return (
    <main className="notfound">
      <div className="wrap">
        <Diff k="PageExists" from="1" to="missing" />
        <h1>This page does not exist</h1>
        <p>The link may be old, or the address has a typo.</p>
        <Link to="/" className="btn btn-secondary">Back to home</Link>
      </div>
    </main>
  );
}
