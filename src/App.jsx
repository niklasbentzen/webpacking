import { Routes, Route, Link } from "react-router-dom";
import Trips from "./pages/Trips.jsx";
import Trip from "./pages/Trip.jsx";
import Stage from "./pages/Stage.jsx";
import Login from "./pages/Login.jsx";
import AdminHome from "./pages/admin/AdminHome.jsx";
import AdminTrip from "./pages/admin/AdminTrip.jsx";
import AdminStage from "./pages/admin/AdminStage.jsx";
import AdminTest from "./pages/admin/AdminTest.jsx";

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Trips />} />
        <Route path="/trips/:slug" element={<Trip />} />
        <Route path="/stages/:slug" element={<Stage />} />

        <Route path="/admin/" element={<AdminHome />} />
        <Route path="/admin/trips/:tripId" element={<AdminTrip />} />
        <Route path="/admin/stages/:stageId" element={<AdminStage />} />

        <Route path="/admin/test" element={<AdminTest />} />
      </Routes>
    </div>
  );
}
