import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";

// 🔌 Connect socket
export const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
});
window.socket = socket;

const peerConnections = {};
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function GDRoom() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [botSpeaking, setBotSpeaking] = useState(false); // 🔊 AI audio state
  const localAudioRef = useRef(null);
  const recognitionRef = useRef(null);

  // ----------------- Initial Setup -----------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const userRes = await axios.get("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUserId(userRes.data._id);

        const res = await axios.post(
          `http://localhost:5000/api/session/${id}/join`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSession(res.data.session);

        if (!socket.connected) socket.connect();
        socket.emit("join-room", id);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicStream(stream);
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
        }

        setupSignalingHandlers(stream);
        startSpeechRecognition(); // 🔥 STT starts here

        // 🔊 Listen for AI bot audio reply
        socket.on("bot-audio", ({ roomId, text, audio, sender }) => {
          console.log(`📥 Received bot-audio from ${sender}: ${text}`);
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
      socket.off("bot-audio"); // ✅ cleanup
    };
  }, [id]);

  // ----------------- WebRTC Signaling -----------------
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
        const incomingStream = event.streams[0];
        const remoteAudio = document.createElement("audio");
        remoteAudio.srcObject = incomingStream;
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

  // ----------------- Speech to Text -----------------
  const startSpeechRecognition = () => {
    if (!SpeechRecognition) {
      console.warn("🚫 SpeechRecognition not supported");
      return;
    }

    if (recognitionRef.current) {
      console.warn("🟡 Already started");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      console.log("🎤 SpeechRecognition started");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("🗣️ You said:", transcript);
      socket.emit("user-message", {
        roomId: id,
        message: transcript,
        sender: "User",
      });
    };

    recognition.onerror = (event) => {
      console.error("🎤 Speech recognition error:", event.error);
      if (["not-allowed", "aborted", "service-not-allowed"].includes(event.error)) {
        recognition.stop();
        recognitionRef.current = null;
        return;
      }
    };

    recognition.onend = () => {
      console.log("🎤 Recognition ended — restarting...");
      if (recognitionRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            console.error("🔁 Restart error:", err.message);
          }
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error("❌ Failed to start:", err.message);
    }
  };

  // ----------------- AI Audio Playback -----------------
  const playBotAudio = (base64Audio) => {
    const audio = new Audio(base64Audio);
    setBotSpeaking(true);
    audio.onended = () => setBotSpeaking(false);
    audio.onerror = (err) => {
      console.error("🔇 Error playing bot audio:", err);
      setBotSpeaking(false);
    };
    audio.play().catch(err => {
      console.error("🔇 Playback failed:", err);
      setBotSpeaking(false);
    });
  };

  // ----------------- GD Start / End -----------------
  const handleStartGD = async () => {
    try {
      setLoadingAction(true);
      await axios.post(
        `http://localhost:5000/api/session/${id}/start`,
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
      await axios.post(
        `http://localhost:5000/api/session/${id}/end`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setSession((prev) => ({ ...prev, isEnded: true }));
    } catch {
      alert("Failed to end GD");
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

  // ----------------- UI -----------------
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
    </div>
  );
}

export default GDRoom;
