import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");

  const scrollRef = useRef();

  useEffect(() => {
    const newSocket = io("https://chatapp-acew.onrender.com");
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList]);

  const joinRoom = () => {
    if (username && room && socket) {
      setMessageList([]);
      socket.emit("join_room", { room, username });
      setShowChat(true);
    }
  };

  const sendMessage = () => {
    if (message !== "" && socket) {
      const messageData = {
        room,
        author: username,
        message,
        time: new Date().toLocaleTimeString(),
        type: "text",
      };

      socket.emit("send_message", messageData);
      setMessage("");
    }
  };

  const handleTyping = () => {
    socket.emit("typing", { room, username });
    setTimeout(() => socket.emit("stop_typing", { room }), 1000);
  };

const handleFileUpload = async (e) => {
  const file = e.target.files[0];

  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert("File too large (max 2MB)");
    return;
  }

  const reader = new FileReader();

  reader.onloadend = async () => {
    try {
      const res = await fetch("https://chatapp-acew.onrender.com/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: reader.result }),
      });

      const data = await res.json();

      socket.emit("send_message", {
        room,
        author: username,
        message: data.url,
        type: "image",
        time: new Date().toLocaleTimeString(),
      });

    } catch (err) {
      console.log("Upload error:", err);
    }
  };

  reader.readAsDataURL(file);
};

  useEffect(() => {
    if (!socket) return;

    socket.on("load_messages", setMessageList);
    socket.on("receive_message", (data) =>
      setMessageList((list) => [...list, data])
    );
    socket.on("online_users", setUsers);
    socket.on("typing", setTypingUser);
    socket.on("stop_typing", () => setTypingUser(""));

    return () => {
      socket.off("receive_message");
      socket.off("online_users");
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, [socket]);

  return (
    <div className="h-screen flex bg-[#0f172a] text-white font-sans">

      {/* Sidebar */}
      <div className="w-[280px] bg-[#111827] border-r border-gray-700 flex flex-col">

        {/* App Title */}
        <div className="p-4 text-lg font-semibold border-b border-gray-700">
          💬 ChatApp
        </div>

        {/* Room */}
        <div className="p-4 border-b border-gray-700">
          <div className="text-xs text-gray-400">Current Room</div>
          <div className="mt-1 bg-gray-800 p-2 rounded-md">
            {room || "Not joined"}
          </div>
        </div>

        {/* Users */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs text-gray-400 mb-2">Online Users</div>
          {users.map((user, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700 transition"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              {user}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center">

        {!showChat ? (
          <div className="bg-white text-black p-8 rounded-xl shadow-xl w-[350px]">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Join Chat
            </h2>

            <input
              placeholder="Username"
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mb-3 p-2 border rounded"
            />

            <input
              placeholder="Room ID"
              onChange={(e) => setRoom(e.target.value)}
              className="w-full mb-4 p-2 border rounded"
            />

            <button
              onClick={joinRoom}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Join Room
            </button>
          </div>
        ) : (
          <div className="w-[600px] h-[650px] bg-white text-black rounded-xl shadow-xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 font-medium">
              Room: {room}
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messageList.map((msg, i) => (
                <div
                  key={i}
                  className={`flex mb-3 ${
                    msg.author === username
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`px-3 py-2 rounded-lg max-w-[70%] text-sm shadow-sm ${
                      msg.author === username
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    <div className="font-medium text-xs mb-1">
                      {msg.author}
                    </div>

                    {msg.type === "image" ? (
                      <img
                        src={msg.message}
                        alt=""
                        className="rounded-md max-w-[200px]"
                      />
                    ) : (
                      msg.message
                    )}

                    <div className="text-[10px] mt-1 text-right opacity-70">
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}

              <div ref={scrollRef}></div>
            </div>

            {/* Typing */}
            {typingUser && (
              <div className="px-4 py-1 text-xs text-gray-500">
                {typingUser} is typing...
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t flex items-center gap-2 bg-white">
              <input
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                className="flex-1 border rounded-full px-4 py-2 text-sm outline-none"
                placeholder="Type a message..."
              />

              <input type="file" onChange={handleFileUpload} />

              <button
                onClick={sendMessage}
                className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;