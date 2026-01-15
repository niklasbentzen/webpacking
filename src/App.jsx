import { Routes, Route, Link } from "react-router-dom";
import Trips from "./pages/Trips.jsx";
import Trip from "./pages/Trip.jsx";
import Segment from "./pages/Segment.jsx";

export default function App() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <Link to="/">Trips</Link>
      </header>

      <Routes>
        <Route path="/" element={<Trips />} />
        <Route path="/trips/:slug" element={<Trip />} />
        <Route path="/segments/:slug" element={<Segment />} />
      </Routes>
    </div>
  );
}
