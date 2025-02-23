import { createContext, useContext, useEffect, useState } from "react";
import { mouthCues } from "../../public/mouth_cues";
const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const chat = async (messageee) => {
    setLoading(true);

    const audio = new Audio("public/welcome.ogg");
    const message = {
      text: "this is my data", // Text from the input
      audio: audio, // Audio URL from the fetched blob
      lipsync: {
        mouthCues,
      }, // Use default or empty lipsync data if not available
      facialExpression: "smile",
      animation: "Greeting",
    };
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
