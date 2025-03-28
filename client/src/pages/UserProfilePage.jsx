import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const lifestyleOptions = {
  sleepTime: [
    "Before 9:00 PM",
    "9:00 PM - 11:00 PM",
    "11:00 PM - 1:00 AM",
    "After 1:00 AM",
  ],
  wakeTime: [
    "Before 6:00 AM",
    "6:00 AM - 8:00 AM",
    "8:00 AM - 10:00 AM",
    "After 10:00 AM",
  ],
  cleanliness: [
    "I deep clean daily",
    "I clean up once a week",
    "I clean every two weeks",
    "I clean when necessary",
  ],
  noiseTolerance: [
    "Need complete quiet",
    "Okay with background noise",
    "Don't mind frequent guests or loud noise",
    "Okay with most types of noise",
  ],
  guests: [
    "Rarely or never",
    "Occasionally (a few times/month)",
    "Often (weekly)",
    "Very frequently (multiple times/week)",
  ],
  smoking: ["No", "Yes, only outside", "Yes, including indoors"],
  drinking: ["No", "Occasionally (socially)", "Regularly"],
  pets: [
    "Yes, I love pets!",
    "Okay with pets but don’t own any",
    "Not okay with pets",
  ],
};

export default function UserProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [editMode, setEditMode] = useState(true); 
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData(docSnap.data());
        }
      }
    };
    fetchUserData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setError("");

    for (const key in lifestyleOptions) {
      if (!formData[key]) {
        setError(`Please complete the '${key}' field.`);
        return;
      }
    }

    try {
      await setDoc(doc(db, "users", auth.currentUser.uid), formData, {
        merge: true,
      });
      setSaveSuccess(true);
      setEditMode(false); 
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError("There was an error updating your profile.");
    }
  };

  if (!formData) {
    return <div className="text-center mt-20">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8 flex items-center justify-center">
      <motion.div
        className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto bg-blue-200 rounded-full flex items-center justify-center text-3xl font-bold text-white">
            {formData.firstName?.charAt(0)}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mt-4">
            {formData.firstName} {formData.lastName}
          </h2>
          <p className="text-gray-600">{formData.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {Object.entries(lifestyleOptions).map(([field, options]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
              </label>
              {editMode ? (
                <select
                  name={field}
                  value={formData[field] || ""}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Select an option</option>
                  {options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-800">{formData[field]}</p>
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-500 mt-4 text-center font-medium">{error}</p>
        )}

        {editMode ? (
          <button
            onClick={handleSave}
            className="mt-8 w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Save Changes
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 mt-8">
            {saveSuccess && (
              <div className="text-green-600 font-medium">
                Profile updated successfully!
              </div>
            )}
            <button
                onClick={() => setEditMode(true)}
                className="bg-white border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-md hover:bg-blue-50 transition"
                >
                Edit Profile
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Start Exploring Housing
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
