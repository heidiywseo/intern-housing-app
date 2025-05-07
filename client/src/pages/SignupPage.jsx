import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import PreferenceForm from "./PreferenceForm";

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("signup");
  const [userId, setUserId] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleChange = (e) =>
    setFormData((fd) => ({ ...fd, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = cred.user;

      // Write basic info to Firebase
      await setDoc(doc(db, "users", user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      });

     
      const response = await fetch("http://localhost:3000/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        }),
      });
      

      if (!response.ok) {
        throw new Error("Failed to sync with AWS database");
      }

      setUserId(user.uid);
      setStep("askPrefs");
    } catch (error) {
      console.error("Signup error:", error);
      alert("Error during signup: " + error.message);
    }
  };

  return (
    <div className="min-h-screen py-10 flex items-center justify-center bg-[#4E674A]/90">
      {step === "signup" && (
        <motion.div
          className="bg-white p-10 rounded-xl shadow-xl w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold text-gray-700 mb-6 text-center">
            Create Account
          </h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <input
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="submit"
              className="w-full bg-[#4E674A] text-white py-3 rounded-lg hover:bg-[#4E674A]/70 transition"
            >
              Sign Up
            </button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <span
              className="text-[#4E674A] cursor-pointer hover:underline"
              onClick={() => navigate("/login")}
            >
              Log in
            </span>
          </p>
        </motion.div>
      )}

      {step === "askPrefs" && (
        <motion.div
          className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Would you like to set up your preferences now?
          </h2>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setStep("collectPrefs")}
              className="bg-[#4E674A] text-white px-6 py-2 rounded-lg hover:bg-[#4E674A]/70 transition"
            >
              Yes
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
            >
              No, later
            </button>
          </div>
        </motion.div>
      )}

      {step === "collectPrefs" && (
        <PreferenceForm userId={userId} onComplete={() => navigate("/")} />
      )}
    </div>
  );
}