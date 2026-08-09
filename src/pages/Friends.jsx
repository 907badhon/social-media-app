import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";

function Friends() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("find"); // "find" | "requests" | "my_friends"
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [friendIds, setFriendIds] = useState([]);

  // 1. Listen to all registered users (excluding current user)
  useEffect(() => {
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          if (doc.id !== user.uid) {
            list.push({ uid: doc.id, ...doc.data() });
          }
        });
        setAllUsers(list);
      },
      (error) => {
        console.error("Error fetching users:", error);
      }
    );
    return unsubscribe;
  }, [user.uid]);

  // 2. Listen to sent friend requests
  useEffect(() => {
    const q = query(
      collection(db, "friendRequests"),
      where("senderId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setSentRequests(list);
    });
    return unsubscribe;
  }, [user.uid]);

  // 3. Listen to received friend requests
  useEffect(() => {
    const q = query(
      collection(db, "friendRequests"),
      where("receiverId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setReceivedRequests(list);
    });
    return unsubscribe;
  }, [user.uid]);

  // 4. Listen to friends list (accepted)
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

  // Actions
  const handleSendRequest = async (targetId) => {
    // Check if request already exists
    const alreadySent = sentRequests.some((r) => r.receiverId === targetId);
    const alreadyReceived = receivedRequests.some((r) => r.senderId === targetId);

    if (alreadySent || alreadyReceived) {
      toast.error("A friend request already exists between you.");
      return;
    }

    try {
      await addDoc(collection(db, "friendRequests"), {
        senderId: user.uid,
        receiverId: targetId,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      toast.success("Friend request sent!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send request.");
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      // 1. Update request status to accepted
      await updateDoc(doc(db, "friendRequests", request.id), {
        status: "accepted",
      });

      // 2. Add bidirectional entries in friends collection
      await setDoc(doc(db, "friends", `${user.uid}_${request.senderId}`), {
        userId: user.uid,
        friendId: request.senderId,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "friends", `${request.senderId}_${user.uid}`), {
        userId: request.senderId,
        friendId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast.success("Friend request accepted!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to accept request.");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, "friendRequests", requestId));
      toast.success("Request rejected/removed.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to reject request.");
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm("Are you sure you want to remove this friend?")) return;

    try {
      // 1. Delete friends entries
      await deleteDoc(doc(db, "friends", `${user.uid}_${friendId}`));
      await deleteDoc(doc(db, "friends", `${friendId}_${user.uid}`));

      // 2. Delete the friend requests record
      const req = [...sentRequests, ...receivedRequests].find(
        (r) =>
          (r.senderId === user.uid && r.receiverId === friendId) ||
          (r.senderId === friendId && r.receiverId === user.uid)
      );

      if (req) {
        await deleteDoc(doc(db, "friendRequests", req.id));
      }

      toast.success("Friend removed.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove friend.");
    }
  };

  // Helper selectors
  const getRequestStatus = (targetId) => {
    if (friendIds.includes(targetId)) return "friends";

    const sent = sentRequests.find((r) => r.receiverId === targetId);
    if (sent) return sent.status === "accepted" ? "friends" : "sent_pending";

    const received = receivedRequests.find((r) => r.senderId === targetId);
    if (received) return received.status === "accepted" ? "friends" : "received_pending";

    return "none";
  };

  // Filter users by search query
  const filteredUsers = allUsers.filter((u) =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // List of actual friend user details
  const myFriends = allUsers.filter((u) => friendIds.includes(u.uid));

  // Pending received requests with sender info
  const incomingPending = receivedRequests
    .filter((r) => r.status === "pending")
    .map((r) => {
      const senderInfo = allUsers.find((u) => u.uid === r.senderId) || {};
      return { ...r, senderInfo };
    });

  // Pending sent requests with receiver info
  const outgoingPending = sentRequests
    .filter((r) => r.status === "pending")
    .map((r) => {
      const receiverInfo = allUsers.find((u) => u.uid === r.receiverId) || {};
      return { ...r, receiverInfo };
    });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Friends Directory</h1>

        {/* Tab Headers */}
        <div className="mb-6 flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("find")}
            className={`border-b-2 px-6 py-3 text-sm font-semibold transition cursor-pointer ${
              activeTab === "find"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Find Friends
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`relative border-b-2 px-6 py-3 text-sm font-semibold transition cursor-pointer ${
              activeTab === "requests"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Requests
            {incomingPending.length > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {incomingPending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("my_friends")}
            className={`border-b-2 px-6 py-3 text-sm font-semibold transition cursor-pointer ${
              activeTab === "my_friends"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            My Friends ({myFriends.length})
          </button>
        </div>

        {/* Find Friends Tab */}
        {activeTab === "find" && (
          <div className="space-y-6">
            <input
              type="text"
              placeholder="Search users by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 transition text-sm text-slate-800 shadow-sm"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.length === 0 ? (
                <div className="col-span-full rounded-2xl bg-white p-8 text-center border border-slate-100 shadow-sm">
                  <p className="text-slate-500 text-sm">No users found.</p>
                </div>
              ) : (
                filteredUsers.map((item) => {
                  const status = getRequestStatus(item.uid);
                  return (
                    <div
                      key={item.uid}
                      className="flex items-center justify-between rounded-xl bg-white p-4 border border-slate-100 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.photoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%2394a3b8'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%2394a3b8'/%3E%3C/svg%3E"}
                          alt={item.name}
                          className="h-10 w-10 rounded-full object-cover border border-slate-100"
                          onError={(e) => {
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%2394a3b8'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%2394a3b8'/%3E%3C/svg%3E";
                          }}
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">{item.name}</h3>
                          <p className="text-xs text-slate-400 truncate max-w-xs">{item.bio || "No bio yet"}</p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        {status === "none" && (
                          <button
                            onClick={() => handleSendRequest(item.uid)}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
                          >
                            Add Friend
                          </button>
                        )}
                        {status === "sent_pending" && (
                          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                            Requested
                          </span>
                        )}
                        {status === "received_pending" && (
                          <button
                            onClick={() => setActiveTab("requests")}
                            className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 cursor-pointer"
                          >
                            Respond
                          </button>
                        )}
                        {status === "friends" && (
                          <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
                            ✓ Friend
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            {/* Received Requests */}
            <div>
              <h2 className="text-md font-semibold text-slate-700 mb-3">Received Requests</h2>
              {incomingPending.length === 0 ? (
                <div className="rounded-2xl bg-white p-6 text-center border border-slate-100 shadow-sm">
                  <p className="text-slate-500 text-sm">No incoming friend requests.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingPending.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between rounded-xl bg-white p-4 border border-slate-100 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={req.senderInfo.photoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%2394a3b8'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%2394a3b8'/%3E%3C/svg%3E"}
                          alt={req.senderInfo.name}
                          className="h-10 w-10 rounded-full object-cover border border-slate-100"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">
                            {req.senderInfo.name}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {req.senderInfo.bio || "No bio yet"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Requests */}
            <div>
              <h2 className="text-md font-semibold text-slate-700 mb-3">Sent Requests</h2>
              {outgoingPending.length === 0 ? (
                <div className="rounded-2xl bg-white p-6 text-center border border-slate-100 shadow-sm">
                  <p className="text-slate-500 text-sm">No pending sent requests.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {outgoingPending.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between rounded-xl bg-white p-4 border border-slate-100 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={req.receiverInfo.photoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%2394a3b8'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%2394a3b8'/%3E%3C/svg%3E"}
                          alt={req.receiverInfo.name}
                          className="h-10 w-10 rounded-full object-cover border border-slate-100"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">
                            {req.receiverInfo.name}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {req.receiverInfo.bio || "No bio yet"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 cursor-pointer"
                      >
                        Cancel Request
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Friends Tab */}
        {activeTab === "my_friends" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myFriends.length === 0 ? (
              <div className="col-span-full rounded-2xl bg-white p-8 text-center border border-slate-100 shadow-sm">
                <p className="text-slate-500 text-sm">You haven't added any friends yet.</p>
              </div>
            ) : (
              myFriends.map((friend) => (
                <div
                  key={friend.uid}
                  className="flex items-center justify-between rounded-xl bg-white p-4 border border-slate-100 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={friend.photoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%2394a3b8'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%2394a3b8'/%3E%3C/svg%3E"}
                      alt={friend.name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-100"
                      onError={(e) => {
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%2394a3b8'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%2394a3b8'/%3E%3C/svg%3E";
                      }}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{friend.name}</h3>
                      <p className="text-xs text-slate-400 truncate max-w-xs">{friend.bio || "No bio yet"}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveFriend(friend.uid)}
                    className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 cursor-pointer"
                  >
                    Unfriend
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Friends;
