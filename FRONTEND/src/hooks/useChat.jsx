import { createContext, useContext, useEffect, useState } from "react";
import { mouthCues } from "../../public/mouth_cues";
import axios from "axios";
const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ChatContext = createContext();

const base64ToBlob = (base64, mimeType) => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
};

//
export const ChatProvider = ({ children }) => {
  const chat = async (messageee) => {
    setLoading(true);
    const response = await axios.post("https://portfolio-vi.onrender.com/ask", {
      question: messageee,
    });
    console.log("response:", response);
    // const audio = new Audio(response.data.audio);
    // const audioBlob = base64ToBlob(response.data.audio, "audio/mpeg");
    // const audioUrl = URL.createObjectURL(audioBlob);
    // console.log(response.data.audio);
     const audioUrl = `/ab.mp3`; // Corrected path
      const audio = new Audio(audioUrl);

      const message = {
        text: response.data.response,
        audio: audio,
      lipsync: {
        mouthCues: "public/mouth_cues.js",
      }, // Use default or empty lipsync data if not available
      facialExpression: "smile",
      animation: "Talking",
    };
    // audio.play();
    setMessages((messages) => [...messages, message]);
    setLoading(false);
  };

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);
  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
