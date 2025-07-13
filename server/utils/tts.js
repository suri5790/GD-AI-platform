// server/utils/tts.js
import axios from "axios";

export async function getAudioFromText(text) {
  try {
    const res = await axios.get("https://api.streamelements.com/kappa/v2/speech", {
      params: {
        voice: "Brian", // Options: Brian, Matthew, Amy, etc.
        text: text.slice(0, 200), // Trim to 200 chars for safety
      },
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(res.data, "binary");
    return `data:audio/mp3;base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("🛑 TTS Error:", err.message);
    return null;
  }
}
