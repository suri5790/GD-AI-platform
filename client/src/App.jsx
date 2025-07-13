import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateSession from "./pages/CreateSession";
import SessionList from "./pages/SessionList";
import GDRoom from "./pages/GDRoom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} /> 
        <Route path="/create-session" element={<CreateSession />} />
        <Route path="/mysessions" element={<SessionList />} />
        <Route path="/room/:id" element={<GDRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
