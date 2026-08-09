import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/kangrdfr/image/upload";
const CLOUDINARY_PRESET = "ohgnntfr";

function Home() {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [contentText, setContentText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [usersMap, setUsersMap] = useState({});

  // Sync with users collection in real-time to get latest name/avatar
  useEffect(() => {
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = {};
        snapshot.forEach((doc) => {
          data[doc.id] = doc.data();
        });
        setUsersMap(data);
      },
      (error) => {
        console.error("Error listening to users:", error);
      }
    );
    return unsubscribe;
  }, []);

  // Listen to posts in real-time
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postsList = [];
        snapshot.forEach((doc) => {
          postsList.push({ id: doc.id, ...doc.data() });
        });
        setPosts(postsList);
      },
      (error) => {
        console.error("Error listening to posts:", error);
        toast.error("Failed to load timeline posts.");
      }
    );
    return unsubscribe;
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!contentText.trim()) {
      toast.error("Post text is required.");
      return;
    }

    setUploading(true);
    try {
      let imageUrl = "";

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", CLOUDINARY_PRESET);
        const response = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!data.secure_url) throw new Error("Cloudinary upload failed");
        imageUrl = data.secure_url;
      }

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        authorName: user.displayName || "Anonymous User",
        authorPhotoURL: user.photoURL || "",
        content: contentText.trim(),
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
      });

      setContentText("");
      setImageFile(null);
      setImagePreview("");
      toast.success("Post created successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create post.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await deleteDoc(doc(db, "posts", postId));
      toast.success("Post deleted.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete post.");
    }
  };

  const formatPostTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Create Post Section */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Share Something</h2>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={3}
              placeholder={`What's on your mind, ${usersMap[user.uid]?.name || user.displayName || "friend"}?`}
              className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-blue-500 transition resize-none text-slate-800 text-sm"
            />

            {imagePreview && (
              <div className="relative inline-block rounded-xl overflow-hidden max-h-60 border border-slate-200">
                <img src={imagePreview} alt="Upload preview" className="object-cover max-h-56" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                  }}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition">
                <span className="text-lg">🖼️</span>
                <span className="text-xs font-semibold">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              <button
                type="submit"
                disabled={uploading}
                className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
              >
                {uploading ? "Posting..." : "Post"}
              </button>
            </div>
          </form>
        </div>

        {/* Timeline Posts Feed */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 shadow-sm">
              <p className="text-slate-500 text-sm">No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post) => {
              const author = usersMap[post.userId] || {};
              const authorName = author.name || post.authorName || "Anonymous";
              const authorPhoto = author.photoURL || post.authorPhotoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%2394a3b8'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%2394a3b8'/%3E%3C/svg%3E";
              const isOwner = post.userId === user.uid;

              return (
                <div
                  key={post.id}
                  className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition duration-300 hover:shadow-md"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={authorPhoto}
                        alt={authorName}
                        className="h-10 w-10 rounded-full object-cover border border-slate-100"
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e2e8f0'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%2394a3b8'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%2394a3b8'/%3E%3C/svg%3E";
                        }}
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">{authorName}</h3>
                        <p className="text-xs text-slate-400">{formatPostTime(post.createdAt)}</p>
                      </div>
                    </div>

                    {isOwner && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  <div className="space-y-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {post.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-100 max-h-96">
                        <img
                          src={post.imageUrl}
                          alt="Post attachment"
                          className="w-full object-cover max-h-96"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
