import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) setUserData(snap.data());
      });
    }
  }, [user]);

  if (!userData) return <p>Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow">
      <div className="flex justify-center mb-8">
        <img
          src={userData.photoURL || "/default-avatar.png"}
          alt="Avatar"
          className="w-32 h-32 rounded-full border-4 border-blue-500"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Name</h3>
          <p>{userData.firstName} {userData.lastName}</p>
          <h3 className="font-semibold">Email</h3>
          <p>{userData.email}</p>
          <h3 className="font-semibold">Budget</h3>
          <p>${userData.minBudget} - ${userData.maxBudget}</p>
          <h3 className="font-semibold">Work ZIP</h3>
          <p>{userData.workLocation}</p>
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">Roommate Pref</h3>
          <p>{userData.roommateStatus}</p>
          <h3 className="font-semibold">Sleep / Wake</h3>
          <p>{userData.sleepTime} / {userData.wakeTime}</p>
          <h3 className="font-semibold">Cleanliness</h3>
          <p>{userData.cleanliness}</p>
          <h3 className="font-semibold">Noise Tolerance</h3>
          <p>{userData.noiseTolerance}</p>
          <h3 className="font-semibold">Guests</h3>
          <p>{userData.guests}</p>
          <h3 className="font-semibold">Smoking / Drinking</h3>
          <p>{userData.smoking} / {userData.drinking}</p>
          <h3 className="font-semibold">Pets</h3>
          <p>{userData.pets}</p>
        </div>
      </div>
      <div className="mt-8 flex justify-center space-x-4">
        <button
          onClick={() => navigate("/edit-preferences")}
          className="px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition"
        >
          Edit Preferences
        </button>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}