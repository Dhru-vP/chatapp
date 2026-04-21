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
    const newSocket = io("https://chatapp-acew.onrender.com", {
  transports: ["websocket", "polling"], // ✅ IMPORTANT
  withCredentials: true,
});

    newSocket.on("connect", () => {
      console.log("Connected:", newSocket.id);
    });

    newSocket.on("connect_error", (err) => {
      console.log("Socket error:", err);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // auto scroll
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

  // ✅ IMAGE UPLOAD (FIXED)
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
        const res = await fetch(
          "https://chatapp-acew.onrender.com/upload",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ image: reader.result }),
          }
        );

        const data = await res.json();

        if (!data.url) {
          console.log("Upload failed:", data);
          return;
        }

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

  // listeners
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
    <div className="h-screen flex bg-[#0f172a] text-white">

      {/* Sidebar */}
      <div className="w-[280px] bg-[#111827] border-r border-gray-700 flex flex-col">
        <div className="p-4 text-lg font-semibold border-b border-gray-700">
          💬 ChatApp
        </div>

        <div className="p-4 border-b border-gray-700">
          <div className="text-xs text-gray-400">Current Room</div>
          <div className="mt-1 bg-gray-800 p-2 rounded-md">
            {room || "Not joined"}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs text-gray-400 mb-2">Online Users</div>
          {users.map((user, i) => (
            <div key={i} className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded">
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
              className="w-full bg-blue-600 text-white py-2 rounded"
            >
              Join Room
            </button>
          </div>
        ) : (
          <div className="w-[600px] h-[650px] bg-white text-black rounded-xl shadow-xl flex flex-col">

            <div className="bg-blue-600 text-white p-4 text-center">
              Room: {room}
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
              {messageList.map((msg, i) => (
                <div
                  key={i}
                  className={`flex mb-3 ${
                    msg.author === username ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`p-2 rounded max-w-[70%] ${
                      msg.author === username
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300"
                    }`}
                  >
                    <b>{msg.author}</b>

                    {msg.type === "image" ? (
                      <img src={msg.message} alt="" className="mt-1 rounded w-40" />
                    ) : (
                      <div>{msg.message}</div>
                    )}

                    <div className="text-xs">{msg.time}</div>
                  </div>
                </div>
              ))}
              <div ref={scrollRef}></div>
            </div>

            {typingUser && (
              <div className="text-sm px-4 text-gray-500">
                {typingUser} is typing...
              </div>
            )}

            <div className="p-3 border-t flex gap-2">
              <input
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                className="flex-1 border p-2 rounded"
                placeholder="Type message..."
              />

              <input type="file" onChange={handleFileUpload} />

              <button
                onClick={sendMessage}
                className="bg-blue-600 text-white px-4 rounded"
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