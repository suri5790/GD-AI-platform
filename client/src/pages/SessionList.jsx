import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function SessionList() {
  const [sessions, setSessions] = useState([]);
  const [copiedId, setCopiedId] = useState(null); // ✅ Track which session was copied
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/session/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSessions(res.data);
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      }
    };
    fetchSessions();
  }, []);

  const handleCopy = (id, link) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500); // Reset message after 1.5s
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Your GD Sessions</h1>
      {sessions.length === 0 ? (
        <p>No sessions created yet.</p>
      ) : (
        <ul className="space-y-4">
          {sessions.map((session) => {
            const roomLink = `${window.location.origin}/room/${session._id}`;
            return (
              <li key={session._id} className="bg-gray-800 p-4 rounded-lg shadow">
                <p className="mb-2"><strong>Topic:</strong> {session.topic}</p>
                <p className="mb-2">
                  <strong>Time:</strong> {new Date(session.scheduledTime).toLocaleString()}
                </p>
                <p className="mb-2">
                  <strong>Participants:</strong> {session.participants.length} Real, {session.aiCount} AI
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => navigate(`/room/${session._id}`)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
                  >
                    Join GD
                  </button>
                  <button
                    onClick={() => handleCopy(session._id, roomLink)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    {copiedId === session._id ? "✅ Copied!" : "📋 Copy Link"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SessionList;
