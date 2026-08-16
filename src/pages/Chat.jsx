import { useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { ChatListSkeleton } from "../components/ChatListItemSkeleton";

const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%2394a3b8'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%2394a3b8'/%3E%3C/svg%3E";

function Chat() {
  const { user } = useContext(AuthContext);
  const [friendIds, setFriendIds] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [selectedFriend, setSelectedFriend] = useState(null);

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const creatingChatRef = useRef(false);

  // 1. Listen to friends list (accepted)
  useEffect(() => {
    const q = query(collection(db, "friends"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push(doc.data().friendId);
      });
      setFriendIds(list);
    });
    return unsubscribe;
  }, [user.uid]);

  // 2. Listen to all users (to map usernames/avatars)
  useEffect(() => {
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map = {};
      snapshot.forEach((doc) => {
        map[doc.id] = doc.data();
      });
      setUsersMap(map);
    });
    return unsubscribe;
  }, []);

  // 3. Listen to all chats where current user is a participant
  useEffect(() => {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setChats(list);
      setLoadingChats(false);
    });
    return unsubscribe;
  }, [user.uid]);

  // 4. Auto-scroll to bottom of chat when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset creation lock when selected friend changes
  useEffect(() => {
    creatingChatRef.current = false;
  }, [selectedFriend]);

  // 5. Detect/Create chat when a friend is selected
  useEffect(() => {
    if (!selectedFriend || loadingChats) {
      if (!selectedFriend) {
        setActiveChatId(null);
        setMessages([]);
      }
      return;
    }

    const existingChat = chats.find((c) =>
      c.participants.includes(selectedFriend.uid),
    );

    if (existingChat) {
      setActiveChatId(existingChat.id);
    } else {
      if (creatingChatRef.current) return;
      creatingChatRef.current = true;

      const createChat = async () => {
        try {
          const docRef = await addDoc(collection(db, "chats"), {
            participants: [user.uid, selectedFriend.uid],
            createdAt: serverTimestamp(),
          });
          setActiveChatId(docRef.id);
        } catch (error) {
          console.error("Error creating chat:", error);
          toast.error("Failed to start conversation.");
        } finally {
          creatingChatRef.current = false;
        }
      };
      createChat();
    }
  }, [selectedFriend, chats, loadingChats, user.uid]);

  // 6. Listen to messages for the active chat in real time
  useEffect(() => {
    if (!activeChatId) return;

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", activeChatId),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setMessages(list);
      },
      (error) => {
        console.error("Error fetching messages:", error);
      },
    );

    return unsubscribe;
  }, [activeChatId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChatId) return;

    try {
      await addDoc(collection(db, "messages"), {
        chatId: activeChatId,
        senderId: user.uid,
        text: messageText.trim(),
        createdAt: serverTimestamp(),
      });
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Message could not be sent.");
    }
  };

  // Build sidebar: merge friends + people from existing chats
  // This ensures the RECEIVER always sees the conversation
  const sidebarPeopleMap = {};
  friendIds.forEach((id) => {
    if (usersMap[id]) sidebarPeopleMap[id] = usersMap[id];
  });
  chats.forEach((chat) => {
    const otherId = chat.participants.find((p) => p !== user.uid);
    if (otherId && usersMap[otherId]) {
      sidebarPeopleMap[otherId] = usersMap[otherId];
    }
  });
  const sidebarPeople = Object.entries(sidebarPeopleMap).map(([uid, data]) => ({
    uid,
    ...data,
  }));

  const handleSelectPerson = (person) => {
    setSelectedFriend(person);
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50">
      {/* Sidebar */}
      <div
        className={`w-full md:w-80 border-r border-slate-200 bg-white flex flex-col ${
          selectedFriend ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Direct Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingChats ? (
            <ChatListSkeleton count={5} />
          ) : sidebarPeople.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">
                Add friends to start chatting!
              </p>
            </div>
          ) : (
            sidebarPeople.map((person) => {
              const hasExistingChat = chats.some((c) =>
                c.participants.includes(person.uid),
              );
              return (
                <button
                  key={person.uid}
                  onClick={() => handleSelectPerson(person)}
                  className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition duration-200 cursor-pointer ${
                    selectedFriend?.uid === person.uid
                      ? "bg-blue-50 text-blue-900 font-semibold"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={person.photoURL || DEFAULT_AVATAR}
                      alt={person.name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-200"
                    />
                    {hasExistingChat && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold">{person.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {hasExistingChat
                        ? "Tap to open chat"
                        : person.bio || "Available"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat pane */}
      <div
        className={`flex-1 flex flex-col bg-slate-50 ${
          !selectedFriend
            ? "hidden md:flex justify-center items-center"
            : "flex"
        }`}
      >
        {selectedFriend ? (
          <>
            {/* Chat header */}
            <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center gap-4">
              <button
                onClick={() => setSelectedFriend(null)}
                className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg text-lg transition font-bold"
              >
                ←
              </button>
              <img
                src={selectedFriend.photoURL || DEFAULT_AVATAR}
                alt={selectedFriend.name}
                className="h-10 w-10 rounded-full object-cover border border-slate-200"
              />
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {selectedFriend.name}
                </h3>
                <p className="text-xs text-slate-400">Active now</p>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">
                  No messages yet. Say hi! 👋
                </div>
              )}
              {messages.map((msg) => {
                const isSentByMe = msg.senderId === user.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        isSentByMe
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                      }`}
                    >
                      <p className="leading-relaxed break-words">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-white border-t border-slate-200 flex items-center gap-3"
            >
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 transition text-slate-800"
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/10 hover:bg-blue-700 transition cursor-pointer"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="text-center p-8 space-y-2">
            <div className="text-4xl">💬</div>
            <h3 className="text-lg font-semibold text-slate-700">Your Inbox</h3>
            <p className="text-slate-400 text-sm max-w-sm">
              Select a conversation from the left to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
