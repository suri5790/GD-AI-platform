// 🚨 make sure this file is saved as: src/pages/GDRoom.jsx

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_SERVER_URL, {
  transports: ["websocket", "polling"],
});
window.socket = socket;

const peerConnections = {};
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function GDRoom() {
  const { id: sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);
  const [userTranscripts, setUserTranscripts] = useState([]);
  const localAudioRef = useRef(null);
  const recognitionRef = useRef(null);

  // ✅ Function to invite bot to the room
  const inviteBotToRoom = async () => {
    const alreadyInvited = localStorage.getItem(`bot-invited-${sessionId}`);
    if (alreadyInvited) return;

    try {
      await axios.post("https://your-bot-server-url.com/invite-bot", {
        roomId: sessionId,
      });
      console.log("✅ AI bot invited to room:", sessionId);
      localStorage.setItem(`bot-invited-${sessionId}`, "true");
    } catch (err) {
      console.error("❌ Failed to invite AI bot:", err.message);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const userRes = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/auth/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setCurrentUserId(userRes.data._id);

        const res = await axios.post(
          `${import.meta.env.VITE_SERVER_URL}/api/session/${sessionId}/join`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSession(res.data.session);

        if (!socket.connected) socket.connect();
        socket.emit("join-room", sessionId);

        // ✅ Invite AI bot right after joining
        inviteBotToRoom();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStream(stream);
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
        }

        setupSignalingHandlers(stream);
        startSpeechRecognition();

        socket.on("bot-audio", ({ audio }) => {
          playBotAudio(audio);
        });

      } catch (err) {
        console.error("❌ Setup error:", err);
        setError(err.response?.data?.message || "Failed to join GD session.");
      }
    };

    fetchData();

    return () => {
      socket.off("join-room");
      socket.off("bot-audio");
    };
  }, [sessionId]);

  // (... rest of your existing code remains unchanged ...)
  // DO NOT remove anything from here down, everything stays same from your existing file

  const setupSignalingHandlers = (stream) => {
    socket.on("user-joined", async (peerId) => {
      if (peerConnections[peerId]) return;
      const pc = new RTCPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      peerConnections[peerId] = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { to: peerId, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { to: peerId, offer });
    });

    socket.on("offer", async ({ from, offer }) => {
      const pc = new RTCPeerConnection();
      micStream.getTracks().forEach(track => pc.addTrack(track, micStream));
      peerConnections[from] = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { to: from, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const remoteAudio = document.createElement("audio");
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.autoplay = true;
        document.body.appendChild(remoteAudio);
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { to: from, answer });
    });

    socket.on("answer", async ({ from, answer }) => {
      const pc = peerConnections[from];
      if (!pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("ice-candidate", async ({ from, candidate }) => {
      const pc = peerConnections[from];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  };

  const startSpeechRecognition = () => {
    if (!SpeechRecognition) return;
    if (recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      socket.emit("user-message", {
        roomId: sessionId,
        message: transcript,
        sender: "User",
      });

      setUserTranscripts((prev) => [
        ...prev,
        { user: currentUserId, text: transcript }
      ]);
    };

    recognition.onend = () => {
      setTimeout(() => {
        try {
          recognition.start();
        } catch (err) {
          console.error("Restart error:", err.message);
        }
      }, 1000);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error("Speech start failed:", err.message);
    }
  };

  const playBotAudio = (base64Audio) => {
    const audio = new Audio(base64Audio);
    setBotSpeaking(true);
    audio.onended = () => setBotSpeaking(false);
    audio.play().catch((err) => {
      console.error("Bot audio play error:", err);
      setBotSpeaking(false);
    });
  };

  const handleStartGD = async () => {
    try {
      setLoadingAction(true);
      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/session/${sessionId}/start`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setSession((prev) => ({ ...prev, isStarted: true }));
    } catch {
      alert("Failed to start GD");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEndGD = async () => {
    try {
      setLoadingAction(true);
      const fakeFeedback = session.participants.map((user, i) => ({
        username: user.username || `User ${i + 1}`,
        feedback: `✅ Participation: Good\n✅ Communication: Clear\n✅ Points Made: Relevant\n📝 Suggestion: Try to involve others more.`,
      }));

      setFeedbackData(fakeFeedback);
      setSession((prev) => ({ ...prev, isEnded: true }));
    } catch (err) {
      console.error("❌ GD end or feedback error: ", err);
      alert("GD End failed. Check console.");
    } finally {
      setLoadingAction(false);
    }
  };

  const toggleMute = () => {
    if (micStream) {
      micStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  };

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-400 bg-gray-900">❌ {error}</div>;
  }

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-gray-900">⏳ Joining GD Room...</div>;
  }

  const isCreator = session.createdBy === currentUserId;
  const status = session.isEnded ? "⚫ Ended" : session.isStarted ? "🟢 Ongoing" : "🔴 Not Started";

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-4">💬 Group Discussion Room</h1>

      <div className="bg-gray-800 p-6 rounded mb-6">
        <p><strong>Topic:</strong> {session.topic}</p>
        <p><strong>Time:</strong> {new Date(session.scheduledTime).toLocaleString()}</p>
        <p><strong>Participants:</strong> {session.participants.length} Real, {session.aiCount} AI</p>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Mode:</strong> Audio Chat {micStream ? "✅" : "❌"}</p>

        {isCreator && !session.isStarted && !session.isEnded && (
          <button onClick={handleStartGD} disabled={loadingAction} className="mt-4 bg-green-600 px-4 py-2 rounded">
            ▶️ Start GD
          </button>
        )}
        {isCreator && session.isStarted && !session.isEnded && (
          <button onClick={handleEndGD} disabled={loadingAction} className="mt-4 bg-red-600 px-4 py-2 rounded">
            🛑 End GD
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {session.participants.map((user, i) => (
          <div key={i} className="bg-purple-700 p-4 rounded text-center">
            🧑 {user.username || `User ${i + 1}`}
          </div>
        ))}
        {[...Array(session.aiCount)].map((_, i) => (
          <div key={`ai-${i}`} className="bg-green-700 p-4 rounded text-center">
            🤖 AI Bot {i + 1}
          </div>
        ))}
      </div>

      {botSpeaking && (
        <div className="text-center text-yellow-400 mt-4 animate-pulse">
          🔊 AI is speaking...
        </div>
      )}

      <div className="text-center">
        <audio ref={localAudioRef} autoPlay muted></audio>
        <p className="text-sm text-green-400 mt-2">
          🎤 Mic is {micStream ? "active ✅" : "blocked ❌"}
        </p>
        <button onClick={toggleMute} className={`mt-4 px-4 py-2 rounded ${isMuted ? "bg-yellow-600" : "bg-blue-600"}`}>
          {isMuted ? "🔇 Unmute Mic" : "🎙️ Mute Mic"}
        </button>
      </div>

      {session.isEnded && feedbackData && (
        <div className="mt-8 bg-gray-800 p-6 rounded">
          <h2 className="text-2xl font-semibold mb-4 text-green-400">🧠 AI Feedback Summary</h2>
          {feedbackData.map((entry, i) => (
            <div key={i} className="mb-6 border-b border-gray-600 pb-4">
              <h3 className="text-lg font-bold mb-1">👤 {entry.username}</h3>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">{entry.feedback}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GDRoom;
