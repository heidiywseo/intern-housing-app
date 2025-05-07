import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function PreferenceForm({ userId, onComplete }) {
  const [prefs, setPrefs] = useState({
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
    pets: "",
  });

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, "users", userId)).then((snap) => {
      if (snap.exists()) setPrefs((prev) => ({ ...prev, ...snap.data() }));
    });
  }, [userId]);

  const handleChange = (e) => {
    setPrefs({ ...prefs, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Update Firebase
      await updateDoc(doc(db, "users", userId), prefs);

      // Sync with AWS database via API Gateway
      // Replace with your actual API Gateway invoke URL, e.g., https://abcdef123.execute-api.us-east-1.amazonaws.com/prod/api/users/update
      const response = await fetch(
        "https://<your-api-gateway-id>.execute-api.<region>.amazonaws.com/prod/api/users/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            ...prefs,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to sync with AWS database");
      }

      onComplete?.();
    } catch (error) {
      console.error("Preference update error:", error);
      alert("Error updating preferences: " + error.message);
    }
  };

  return (
    <motion.div
      className="bg-white p-10 rounded-xl shadow-xl w-full max-w-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">
        Update Preferences
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <input
            type="number"
            placeholder="Min Budget ($/mo)"
            name="minBudget"
            value={prefs.minBudget}
            onChange={handleChange}
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="number"
            placeholder="Max Budget ($/mo)"
            name="maxBudget"
            value={prefs.maxBudget}
            onChange={handleChange}
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Work ZIP Code"
            name="workLocation"
            value={prefs.workLocation}
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
            value={prefs.roommateStatus}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Select an option</option>
            <option>Looking for a roommate</option>
            <option>Open to sharing / don’t mind</option>
            <option>Prefer to live alone / Already have a roommate(s)</option>
          </select>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              When do you usually go to bed?
            </label>
            <select
              name="sleepTime"
              value={prefs.sleepTime}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Select an option</option>
              <option>Before 9:00 PM</option>
              <option>Between 9:00 PM - 11:00 PM</option>
              <option>Between 11:00 PM - 1:00 AM</option>
              <option>After 1:00 AM</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              When do you usually wake up?
            </label>
            <select
              name="wakeTime"
              value={prefs.wakeTime}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Select an option</option>
              <option>Before 6:00 AM</option>
              <option>6:00 AM - 8:00 AM</option>
              <option>8:00 AM - 10:00 AM</option>
              <option>After 10:00 AM</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              How often do you clean your living space?
            </label>
            <select
              name="cleanliness"
              value={prefs.cleanliness}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Select an option</option>
              <option>I deep clean daily</option>
              <option>I clean up once a week</option>
              <option>I clean every two weeks</option>
              <option>I clean when necessary</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              What is your noise tolerance level?
            </label>
            <select
              name="noiseTolerance"
              value={prefs.noiseTolerance}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Select an option</option>
              <option>I need complete quiet</option>
              <option>Okay with background TV/music</option>
              <option>Don't mind frequent guests or noise</option>
              <option>Generally okay with most noise</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              How often do you plan to have guests over?
            </label>
            <select
              name="guests"
              value={prefs.guests}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Select an option</option>
              <option>Rarely or never</option>
              <option>Occasionally (few times/month)</option>
              <option>Often (weekly)</option>
              <option>Very frequently (multiple times/week)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Do you smoke?
            </label>
            <select
              name="smoking"
              value={prefs.smoking}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Select an option</option>
              <option>No</option>
              <option>Yes, but only outside</option>
              <option>Yes, including indoors</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Do you drink alcohol?
            </label>
            <select
              name="drinking"
              value={prefs.drinking}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Select an option</option>
              <option>No</option>
              <option>Occasionally (socially)</option>
              <option>Regularly</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Are you okay living with pets?
            </label>
            <select
              name="pets"
              value={prefs.pets}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Select an option</option>
              <option>Yes, I love pets!</option>
              <option>Okay with pets but don’t own any</option>
              <option>Not okay with pets</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#4E674A] text-white py-3 rounded-lg hover:bg-[#4E674A]/70 transition"
        >
          Save Preferences
        </button>
      </form>
    </motion.div>
  );
}