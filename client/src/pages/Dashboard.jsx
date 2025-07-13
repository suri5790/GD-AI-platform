import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SessionList from "./SessionList"; // ✅ Import here

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/");

    if (location.state?.message) {
      setSuccess(location.state.message);
      setTimeout(() => setSuccess(""), 2000);
    }
  }, [navigate, location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
  <h1 className="text-4xl font-bold mb-4">Welcome to Dashboard 🎉</h1>
  <p className="mb-6 text-purple-300">You are logged in with a valid JWT</p>

  {success && (
    <div className="mb-4 px-4 py-2 rounded bg-green-500 text-white">
      ✅ {success}
    </div>
  )}

  <button
    onClick={() => navigate("/create-session")}
    className="mb-4 bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded text-white font-semibold"
  >
    + Create GD / Interview Session
  </button>

  <button
  onClick={() => navigate("/mysessions")}
  className="mb-4 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-white font-semibold"
>
  📋 View My GD Sessions
</button>


  <button
    onClick={handleLogout}
    className="mt-4 bg-red-500 hover:bg-red-600 px-6 py-2 rounded text-white font-semibold"
  >
    Logout
  </button>
</div>

  );
}

export default Dashboard;
