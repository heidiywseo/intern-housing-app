import React, {useState} from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db  } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

       // Fetch user's first name from Firestore
       const userDoc = await getDoc(doc(db, "users", user.uid));
       if (userDoc.exists()) {
         const data = userDoc.data();
         setUser({ uid: user.uid, firstName: data.firstName });
       }

       navigate("/");
      } catch (error) {
        alert(error.message);
      }
    };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EDEBE4]">
      <motion.div
        className="bg-white p-10 rounded-xl shadow-xl w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-gray-700 mb-6 text-center">
          Welcome Back
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="submit"
            className="w-full bg-[#4E674A] text-white py-3 rounded-lg hover:bg-[#4E674A]/70 transition"
          >
            Sign In
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don’t have an account?{" "}
          <span
            className="text-[#4E674A] cursor-pointer hover:underline"
            onClick={() => navigate("/signup")}
          >
            Sign up
          </span>
        </p>
      </motion.div>
    </div>
  );
}
