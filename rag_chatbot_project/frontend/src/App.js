import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function App() {
  const [conversation, setConversation] = useState([
    {
      sender: "bot",
      text: "Hello! I can help you register complaints or check status. What would you like to do?",
    },
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState("initial");
  const [complaintID, setComplaintID] = useState("");
  const [userData, setUserData] = useState({ name: "", mobile: "", email: "", details: "" });
  const [isTyping, setIsTyping] = useState(false);

  // Ref for scrolling
  const messagesEndRef = useRef(null);

  // Scroll to bottom when conversation or typing status changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation, isTyping]);

  const validateMobileNumber = (mobile) => {
    const regex = /^(\+91)?[6-9]\d{9}$/;
    return regex.test(mobile);
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const addMessage = (sender, text) => {
    setConversation((prev) => [...prev, { sender, text }]);
  };

  const casualReplies = {
    hi: "Hey there! 😊 How can I assist you today?",
    hello: "Hello! Need help registering a complaint or checking status?",
    "how are you": "I'm just a bot, but I'm here to help you! 🤖",
    "thank you": "You're most welcome! 🙏",
    thanks: "No problem at all! Happy to help. 👍",
    ok: "Got it! Let me know if you need anything else.",
    okay: "Alright! 😊",
    bye: "Bye! Take care and have a great day! 👋",
    exit: "🔄 Conversation reset. Let me know if you want to register or check status again.",
    goodbye: "Goodbye! Hope to chat again soon. 💬",
    "who are you":
      "I'm your complaint assistant bot. Here to register complaints and check status for you!",
  };

  const detectIntent = (text) => {
    const normalized = text.toLowerCase().trim();
    for (const key in casualReplies) {
      if (normalized.includes(key)) {
        return casualReplies[key];
      }
    }
    return null;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    addMessage("user", input);
    const userInput = input.trim().toLowerCase();
    setInput("");
    setIsTyping(true);

    setTimeout(async () => {
      const reply = detectIntent(userInput);
      if (reply) {
        addMessage("bot", reply);
        if (userInput.includes("exit")) setStep("initial");
        setIsTyping(false);
        return;
      }

      try {
        if (step === "initial") {
          if (["register", "complaint", "file", "report"].some((k) => userInput.includes(k))) {
            addMessage("bot", "Do you want to register a complaint? Please answer Yes or No.");
            setStep("confirm_register");
          } else if (["status", "check", "track"].some((k) => userInput.includes(k))) {
            addMessage("bot", "Do you want to check your complaint status? Please answer Yes or No.");
            setStep("confirm_status");
          } else {
            addMessage(
              "bot",
              "Sorry, I can only help with complaint registration or status. Did you mean to register or check status?"
            );
          }
        } else if (step === "confirm_register") {
          if (userInput === "yes") {
            addMessage("bot", "Please provide your name.");
            setStep("ask_name");
          } else if (userInput === "no") {
            addMessage("bot", "Okay, let me know if you want to register or check status.");
            setStep("initial");
          } else {
            addMessage("bot", "Please reply with Yes or No.");
          }
        } else if (step === "confirm_status") {
          if (userInput === "yes") {
            addMessage("bot", "Please provide your complaint ID.");
            setStep("ask_status_id");
          } else if (userInput === "no") {
            addMessage("bot", "Okay, let me know if you want to register a complaint or check status.");
            setStep("initial");
          } else {
            addMessage("bot", "Please reply with Yes or No.");
          }
        } else if (step === "ask_name") {
          setUserData((prev) => ({ ...prev, name: input.trim() }));
          addMessage("bot", "Please provide your mobile number.");
          setStep("ask_mobile");
        } else if (step === "ask_mobile") {
          if (validateMobileNumber(input.trim())) {
            setUserData((prev) => ({ ...prev, mobile: input.trim() }));
            addMessage("bot", "Please provide your email address.");
            setStep("ask_email");
          } else {
            addMessage(
              "bot",
              "Invalid mobile number. Please enter a valid 10-digit mobile number (optionally prefixed with +91)."
            );
          }
        } else if (step === "ask_email") {
          if (validateEmail(input.trim())) {
            setUserData((prev) => ({ ...prev, email: input.trim() }));
            addMessage("bot", "Please describe your grievance.");
            setStep("ask_details");
          } else {
            addMessage("bot", "❌ Invalid email address. Please enter a valid email.");
          }
        } else if (step === "ask_details") {
          setUserData((prev) => ({ ...prev, details: input.trim() }));
          try {
            const response = await axios.post("http://localhost:5000/register", {
              name: userData.name,
              mobile: userData.mobile,
              email: userData.email,
              details: input.trim(),
            });
            setComplaintID(response.data.complaint_id);
            addMessage(
              "bot",
              `✅ Your complaint has been registered successfully.\n🆔 Complaint ID: ${response.data.complaint_id}`
            );
          } catch (error) {
            addMessage("bot", "❌ Failed to register complaint. Please try again.");
          }
          setStep("initial");
        } else if (step === "ask_status_id") {
          const complaintIdInput = input.trim();
          setComplaintID(complaintIdInput);
          try {
            const response = await axios.get(`http://localhost:5000/status/${complaintIdInput}`);
            if (response.data.message === "Complaint not found") {
              addMessage("bot", "❌ Complaint not found. Please check your ID and try again.");
            } else {
              const createdDate = new Date(response.data.created_at);
              const formattedDate = createdDate.toLocaleString();

              addMessage(
                "bot",
                `📄 Complaint Details:
🆔 ID: ${response.data.id}
📱 Mobile: ${response.data.mobile}
📧 Email: ${response.data.email}
📝 Issue: ${response.data.details}
📌 Status: ${response.data.status}
🕒 Created At: ${formattedDate}`
              );
            }
          } catch (error) {
            addMessage("bot", "❌ Error fetching complaint status. Please try again later.");
          }
          setStep("initial");
        }
      } catch (err) {
        addMessage("bot", "❌ Something went wrong. Please try again.");
        setStep("initial");
      }

      setIsTyping(false);
    }, 1000);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 600,
        height: 600,
        borderRadius: 24,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 0 20px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          color: "white",
          fontWeight: "bold",
          fontSize: 24,
          backgroundColor: "rgba(255,255,255,0.1)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <img
          src="https://img.icons8.com/clouds/100/robot.png"
          alt="Bot logo"
          style={{ width: 40, height: 40 }}
        />
        Smart Complaint Bot
      </header>
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          color: "white",
          textAlign: "center",
        }}
      >
        {conversation.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "75%",
              margin: "0 auto",
            }}
          >
            <img
              src={
                msg.sender === "bot"
                  ? "https://img.icons8.com/color/48/000000/robot-2.png"
                  : "https://img.icons8.com/color/48/000000/user.png"
              }
              alt={msg.sender}
              style={{ width: 32, height: 32 }}
            />
            <div
              style={{
                backgroundColor: msg.sender === "bot" ? "rgba(255,255,255,0.2)" : "#22c55e",
                color: "white",
                borderRadius: 16,
                padding: "8px 16px",
                marginTop: 4,
                whiteSpace: "pre-wrap",
                textAlign: "center",
                width: "fit-content",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "white",
              fontSize: 14,
              fontStyle: "italic",
              opacity: 0.7,
            }}
          >
            <img
              src="https://img.icons8.com/color/48/000000/robot-2.png"
              alt="bot"
              style={{ width: 24, height: 24 }}
            />
            Typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>
      <footer
        style={{
          display: "flex",
          gap: 8,
          padding: 16,
          borderTop: "1px solid rgba(255,255,255,0.2)",
          backgroundColor: "rgba(255,255,255,0.1)",
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <input
          type="text"
          placeholder="Type your message..."
          style={{
            flexGrow: 1,
            padding: "8px 12px",
            borderRadius: 12,
            border: "none",
            fontSize: 16,
            outline: "none",
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          aria-label="Message input"
        />
        <button
          onClick={handleSend}
          style={{
            backgroundColor: "#4f46e5",
            color: "white",
            borderRadius: 12,
            padding: "8px 16px",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          aria-label="Send message"
        >
          Send
        </button>
      </footer>
    </div>
  );
}

export default App;
