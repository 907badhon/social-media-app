import { createContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";

export const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logoutUser = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      console.log("Firebase Check Complete");
      setUser(currentUser);

      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, logoutUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
