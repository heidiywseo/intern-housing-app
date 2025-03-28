import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        profileComplete: false, 
      });

      navigate("/completeProfileChoice");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <motion.div className="bg-white p-10 rounded-xl shadow-xl w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Sign Up</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <input
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              className="p-3 border rounded-lg w-full"
            />
            <input
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              className="p-3 border rounded-lg w-full"
            />
          </div>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="p-3 border rounded-lg w-full"
          />
          <p className="text-xs text-gray-600 mt-4 text-center">
              By selecting <span className="font-semibold">Agree and Continue</span>, I agree to{" "}
              <a href="/terms" className="text-blue-600 hover:underline">Woomie's Terms of Service</a>{" "}
              and{" "}
              <a href="/nondiscrimination" className="text-blue-600 hover:underline">Nondiscrimination Policy</a>, and acknowledge the{" "}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </p>

            <button
              type="submit"
              className="w-full mt-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Agree and Continue
            </button>
        </form>
      </motion.div>
    </div>
  );
}
