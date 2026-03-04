import { Routes, Route } from "react-router-dom";
import Trips from "./pages/Trips.jsx";
import Trip from "./pages/Trip.jsx";
import Stage from "./pages/Stage.jsx";
import Login from "./pages/Login.jsx";

import AdminLayout from "./components/AdminLayout/AdminLayout.jsx";
import AdminHome from "./pages/admin/AdminHome.jsx";
import AdminTrip from "./pages/admin/AdminTrip.jsx";
import AdminStage from "./pages/admin/AdminStage.jsx";
import AdminTest from "./pages/admin/AdminTest.jsx";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<Trips />} />
        <Route path="/trips/:slug" element={<Trip />} />
        <Route path="/stages/:slug" element={<Stage />} />

        <Route path="/admin" element={<AdminLayout requireAuth={true} />}>
          <Route index element={<AdminHome />} />
          <Route path="trips/:tripId" element={<AdminTrip />} />
          <Route path="stages/:stageId" element={<AdminStage />} />
          <Route path="test" element={<AdminTest />} />
        </Route>
      </Routes>
    </>
  );
}
