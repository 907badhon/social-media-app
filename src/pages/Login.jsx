import { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";

const googleProvider = new GoogleAuthProvider();

function Login() {
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in successfully.");
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      await signInWithEmailAndPassword(auth, userEmail, userPassword);

      toast.success("Logged in successfully.");

      navigate("/");
    } catch {
      toast.error("Invalid email or password");
    }
  };

  const handleForgotPassword = async () => {
    if (!userEmail) {
      toast.error("Please enter your email.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, userEmail);

      toast.success("Password reset email sent.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800">Welcome Back</h1>

          <p className="mt-2 text-sm text-slate-500">
            Login to continue to your account
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>

            <input
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              type="email"
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>

            <input
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <p
            onClick={handleForgotPassword}
            className="cursor-pointer text-right text-sm text-blue-600 hover:underline"
          >
            Forgot Password?
          </p>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
          >
            Login
          </button>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
          >
            Login with Google
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?
          <Link
            to="/register"
            className="ml-1 font-semibold text-blue-600 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
