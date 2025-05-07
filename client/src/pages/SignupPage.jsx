import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
    minBudget: "",
    maxBudget: "",
    workLocation: "",
    roommateStatus: "",
    sleepTime: "",
    wakeTime: "",
    cleanliness: "",
    noiseTolerance: "",
    guests: "",
    smoking: "",
    drinking: "",
    pets: ""
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
  
      // Store user info in Firebase
      await setDoc(doc(db, "users", user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        minBudget: formData.minBudget,
        maxBudget: formData.maxBudget,
        workLocation: formData.workLocation,
        roommateStatus: formData.roommateStatus,
        sleepTime: formData.sleepTime,
        wakeTime: formData.wakeTime,
        cleanliness: formData.cleanliness,
        noiseTolerance: formData.noiseTolerance,
        guests: formData.guests,
        smoking: formData.smoking,
        drinking: formData.drinking,
        pets: formData.pets,
      });
  
      navigate("/"); // or wherever you want to send the user
    } catch (error) {
      console.error("Signup error:", error);
      alert(error.message);
    }
  };
  

  return (
    <div className="min-h-screen py-10 flex items-center justify-center bg-[#4E674A]/90">
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
              type="text"
              placeholder="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
              type="text"
              placeholder="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <input
            type="email"
            placeholder="Email"
            name ="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="password"
            placeholder="Password"
            name ="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          <div className="grid grid-cols-3 gap-4">
            <input
              type="number"
              placeholder="Min Budget ($/mo)"
              name ="minBudget"
              value={formData.minBudget}
              onChange={handleChange}
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
              type="number"
              placeholder="Max Budget ($/mo)"
              name ="maxBudget"
              value={formData.maxBudget}
              onChange={handleChange}
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Work ZIP Code"
                name ="workLocation"
                value={formData.workLocation}
                onChange={handleChange}
                className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
          </div>

          <div>
  <label className="block font-semibold text-gray-700 mb-1">
    What's your roommate situation or preference?
  </label>
  <select
    name="roommateStatus"
    value={formData.roommateStatus}
    onChange={handleChange}
    className="w-full p-2 border rounded-lg"
  >
    <option value="">Select an option</option>
    <option>Looking for a roommate</option>
    <option>Open to sharing / don’t mind</option>
    <option>Prefer to live alone / Already have a roommate(s)</option>
  </select>
</div>


          <div className="space-y-4">
  {/* Sleep Schedule */}
  <div>
    <label className="block font-semibold text-gray-700 mb-1">When do you usually go to bed?</label>
    <select
      name="sleepTime"
      value={formData.sleepTime}
      onChange={handleChange}
      className="w-full p-2 border rounded-lg"
    >
      <option>Before 9:00 PM</option>
      <option>Between 9:00 PM - 11:00 PM</option>
      <option>Between 11:00 PM - 1:00 AM</option>
      <option>After 1:00 AM</option>
    </select>
  </div>

  <div>
    <label className="block font-semibold text-gray-700 mb-1">When do you usually wake up?</label>
    <select
      name="wakeTime"
      value={formData.wakeTime}
      onChange={handleChange}
      className="w-full p-2 border rounded-lg"
      >
      <option>Before 6:00 AM</option>
      <option>6:00 AM - 8:00 AM</option>
      <option>8:00 AM - 10:00 AM</option>
      <option>After 10:00 AM</option>
    </select>
  </div>

  {/* Cleanliness */}
  <div>
    <label className="block font-semibold text-gray-700 mb-1">How often do you clean your living space?</label>
    <select
      name="cleanliness"
      value={formData.cleanliness}
      onChange={handleChange}
      className="w-full p-2 border rounded-lg"
      >
      <option>I deep clean daily</option>
      <option>I clean up once a week</option>
      <option>I clean every two weeks</option>
      <option>I clean when necessary</option>
    </select>
  </div>

  {/* Noise Tolerance */}
  <div>
    <label className="block font-semibold text-gray-700 mb-1">What is your noise tolerance level?</label>
    <select
      name="noiseTolerance"
      value={formData.noiseTolerance}
      onChange={handleChange}
      className="w-full p-2 border rounded-lg"
      >
      <option>I need complete quiet to focus or sleep</option>
      <option>Okay with white noise or background TV/music</option>
      <option>I don't mind frequent guests or late-night noise</option>
      <option>I’m generally okay with most types of noise</option>
    </select>
  </div>

  {/* Guest Frequency */}
  <div>
    <label className="block font-semibold text-gray-700 mb-1">How often do you plan to have guests over?</label>
    <select
      name="guests"
      value={formData.guests}
      onChange={handleChange}
      className="w-full p-2 border rounded-lg"
      >
      <option>Rarely or never</option>
      <option>Occasionally (a few times a month)</option>
      <option>Often (weekly)</option>
      <option>Very frequently (multiple times a week)</option>
    </select>
  </div>

  {/* Smoking  */}
  <div>
    <label className="block font-semibold text-gray-700 mb-1">Do you smoke?</label>
    <select
      name="smoking"
      value={formData.smoking}
      onChange={handleChange}
      className="w-full p-2 border rounded-lg"
      >
      <option>No</option>
      <option>Yes, but only outside</option>
      <option>Yes, including indoors</option>
    </select>
  </div>

  <div>
    <label className="block font-semibold text-gray-700 mb-1">Do you drink alcohol?</label>
    <select
      name="drinking"
      value={formData.drinking}
      onChange={handleChange}
      className="w-full p-2 border rounded-lg"
      >
      <option>No</option>
      <option>Occasionally (socially)</option>
      <option>Regularly</option>
    </select>
  </div>

  {/* Pet Preferences */}
  <div>
    <label className="block font-semibold text-gray-700 mb-1">Are you okay living with pets?</label>
    <select
      name="pets"
      value={formData.pets}
      onChange={handleChange}
      className="w-full p-2 border rounded-lg"
      >
      <option>Yes, I love pets!</option>
      <option>Okay with pets but don’t own any</option>
      <option>Not okay with pets due to allergies or preference</option>
    </select>
  </div>
</div>


          <button
            type="submit"
            className="w-full bg-[#4E674A] text-white py-3 rounded-lg hover:bg-[#4E674A]/70 transition"
          >
            Sign Up
          </button>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account? {" "}
            <span
              className="text-[#4E674A] cursor-pointer hover:underline"
              onClick={() => navigate("/login")}
            >
              Log in
            </span>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
