import { Link } from "react-router-dom";

export default function Roommate() {
  return (
    <div className="text-center text-white p-10">
      <h1 className="text-3xl">About Page</h1>
      <p>This project helps interns find housing and roommates.</p>
      <nav className="mt-4">
        <Link to="/" className="text-blue-400">Go to Home</Link>
      </nav>
    </div>
  );
}
