import { Routes, Route, Link } from "react-router-dom";
import Trips from "./pages/Trips.jsx";
import Trip from "./pages/Trip.jsx";
import Stage from "./pages/Stage.jsx";

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Trips />} />
        <Route path="/trips/:slug" element={<Trip />} />
        <Route path="/stages/:slug" element={<Stage />} />
      </Routes>
    </div>
  );
}
