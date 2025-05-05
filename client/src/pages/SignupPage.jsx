// SignupPage.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// 👉 Make sure you have this import!
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
    const cred = await createUserWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );
    const user = cred.user;

    // set displayName
    await updateProfile(user, {
      displayName: `${formData.firstName} ${formData.lastName}`,
    });

    // write basic info
    await setDoc(doc(db, "users", user.uid), {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
    });

    setUserId(user.uid);
    setStep("askPrefs");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      {step === "signup" && (
        <motion.div
          className="bg-white p-10 rounded-xl shadow-xl w-full max-w-md"
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
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300"
              />
              <input
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Sign Up
            </button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <span
              className="text-blue-600 cursor-pointer hover:underline"
              onClick={() => navigate("/login")}
            >
              Log in
            </span>
          </p>
        </motion.div>
      )}

      {step === "askPrefs" && (
        <motion.div
          className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-xl font-semibold mb-4">
            Would you like to set up your preferences now?
          </h2>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setStep("collectPrefs")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Yes
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400"
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
