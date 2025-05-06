import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import axios from "axios";

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

      // Update PostgreSQL
      await axios.put(`http://localhost:3001/users/${userId}/preferences`, {
        min_budget: prefs.minBudget ? parseFloat(prefs.minBudget) : null,
        max_budget: prefs.maxBudget ? parseFloat(prefs.maxBudget) : null,
        work_zip_code: prefs.workLocation || null,
        roommate_status: prefs.roommateStatus || null,
        sleep_time: prefs.sleepTime || null,
        wake_time: prefs.wakeTime || null,
        cleanliness: prefs.cleanliness || null,
        noise_tolerance: prefs.noiseTolerance || null,
        guest_frequency: prefs.guests || null,
        smoking_preference: prefs.smoking || null,
        drinking_preference: prefs.drinking || null,
        pet_preference: prefs.pets || null,
      });

      onComplete?.();
    } catch (error) {
      console.error("Preference update error:", error);
      alert("Error updating preferences: " + error.message);
    }
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold mb-6 text-center">Update Preferences</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
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
            placeholder="Work ZIP Code"
            name="workLocation"
            value={prefs.workLocation}
            onChange={handleChange}
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* Roommate */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">
            Roommate Preference
          </label>
          <select
            name="roommateStatus"
            value={prefs.roommateStatus}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg"
          >
            <option value="">Select an option</option>
            <option>Looking for a roommate</option>
            <option>Open to sharing / don’t mind</option>
            <option>Prefer to live alone / Already have a roommate(s)</option>
          </select>
        </div>

        {/* Lifestyle Preferences */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Bedtime</label>
            <select name="sleepTime" value={prefs.sleepTime} onChange={handleChange} className="w-full p-2 border rounded-lg">
              <option value="">Select an option</option>
              <option>Before 9:00 PM</option>
              <option>Between 9:00 PM - 11:00 PM</option>
              <option>Between 11:00 PM - 1:00 AM</option>
              <option>After 1:00 AM</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Wake Time</label>
            <select name="wakeTime" value={prefs.wakeTime} onChange={handleChange} className="w-full p-2 border rounded-lg">
              <option value="">Select an option</option>
              <option>Before 6:00 AM</option>
              <option>6:00 AM - 8:00 AM</option>
              <option>8:00 AM - 10:00 AM</option>
              <option>After 10:00 AM</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Cleanliness</label>
            <select name="cleanliness" value={prefs.cleanliness} onChange={handleChange} className="w-full p-2 border rounded-lg">
              <option value="">Select an option</option>
              <option>I deep clean daily</option>
              <option>I clean up once a week</option>
              <option>I clean every two weeks</option>
              <option>I clean when necessary</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Noise Tolerance</label>
            <select name="noiseTolerance" value={prefs.noiseTolerance} onChange={handleChange} className="w-full p-2 border rounded-lg">
              <option value="">Select an option</option>
              <option>I need complete quiet</option>
              <option>Okay with background TV/music</option>
              <option>Don't mind frequent guests or noise</option>
              <option>Generally okay with most noise</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Guest Frequency</label>
            <select name="guests" value={prefs.guests} onChange={handleChange} className="w-full p-2 border rounded-lg">
              <option value="">Select an option</option>
              <option>Rarely or never</option>
              <option>Occasionally (few times/month)</option>
              <option>Often (weekly)</option>
              <option>Very frequently (multiple times/week)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Smoking</label>
            <select name="smoking" value={prefs.smoking} onChange={handleChange} className="w-full p-2 border rounded-lg">
              <option value="">Select an option</option>
              <option>No</option>
              <option>Yes, but only outside</option>
              <option>Yes, including indoors</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Drinking</label>
            <select name="drinking" value={prefs.drinking} onChange={handleChange} className="w-full p-2 border rounded-lg">
              <option value="">Select an option</option>
              <option>No</option>
              <option>Occasionally (socially)</option>
              <option>Regularly</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Pets</label>
            <select name="pets" value={prefs.pets} onChange={handleChange} className="w-full p-2 border rounded-lg">
              <option value="">Select an option</option>
              <option>Yes, I love pets!</option>
              <option>Okay with pets but don’t own any</option>
              <option>Not okay with pets</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Save Preferences
        </button>
      </form>
    </motion.div>
  );
}