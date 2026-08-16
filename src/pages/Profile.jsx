import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import ProfileSkeleton from "../components/ProfileSkeleton";

function Profile() {
  const { user } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);

  const getUserProfile = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        setProfile(data);
        setName(data.name || "");
        setBio(data.bio || "");
        setPreview(data.photoURL || "");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load profile.");
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      getUserProfile();
    }
  }, [user, getUserProfile]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    setImage(file);

    setPreview(URL.createObjectURL(file));
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    try {
      let photoURL = profile?.photoURL || "";

      if (image) {
        const formData = new FormData();

        formData.append("file", image);

        formData.append("upload_preset", "ohgnntfr");

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/kangrdfr/image/upload",
          {
            method: "POST",
            body: formData,
          },
        );

        const data = await response.json();

        photoURL = data.secure_url;
      }

      const docRef = doc(db, "users", user.uid);

      await updateDoc(docRef, {
        name: name.trim(),
        bio: bio.trim(),
        photoURL,
      });

      setProfile((prev) => ({
        ...prev,
        name: name.trim(),
        bio: bio.trim(),
        photoURL,
      }));

      setPreview(photoURL);

      setImage(null);

      toast.success("Profile updated successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile.");
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800">
            Profile Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Update your account information
          </p>
        </div>

        {/* Image */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative">
            <img
              src={
                preview ||
                profile?.photoURL ||
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%23e2e8f0'/%3E%3Ccircle cx='60' cy='48' r='22' fill='%2394a3b8'/%3E%3Cellipse cx='60' cy='105' rx='36' ry='24' fill='%2394a3b8'/%3E%3C/svg%3E"
              }
              alt="Profile"
              className="
              h-32 w-32 
              rounded-full 
              border-4 
              border-blue-600
              object-cover
              shadow-md
            "
            />

            <label
              htmlFor="imageUpload"
              className="
              absolute
              bottom-1
              right-1
              flex
              h-9
              w-9
              cursor-pointer
              items-center
              justify-center
              rounded-full
              bg-blue-600
              text-white
              hover:bg-blue-700
              transition
            "
            >
              ✎
            </label>

            <input
              id="imageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <p className="mt-3 text-sm text-slate-500">Click image to change</p>
        </div>

        {/* Form */}

        <div className="space-y-5">
          {/* Name */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full Name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Enter your full name"
              className="
              w-full
              rounded-lg
              border
              border-slate-300
              px-4
              py-3
              outline-none
              focus:border-blue-500
            "
            />
          </div>

          {/* Email */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              value={profile?.email || ""}
              disabled
              className="
              w-full
              rounded-lg
              border
              border-slate-300
              bg-slate-100
              px-4
              py-3
              text-slate-500
            "
            />
          </div>

          {/* Bio */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Bio
            </label>

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Write your bio..."
              className="
              w-full
              rounded-lg
              border
              border-slate-300
              px-4
              py-3
              outline-none
              focus:border-blue-500
            "
            />
          </div>

          {/* Button */}

          <button
            onClick={handleUpdateProfile}
            className="
            w-full
            rounded-lg
            bg-blue-600
            py-3
            font-semibold
            text-white
            transition
            hover:bg-blue-700
            cursor-pointer
          "
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
export default Profile;
