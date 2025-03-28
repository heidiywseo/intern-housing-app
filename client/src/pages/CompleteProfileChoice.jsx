import React from "react";
import { useNavigate } from "react-router-dom";

export default function CompleteProfileChoice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
      <div className="bg-white p-10 rounded-xl shadow-xl w-full max-w-xl text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Welcome to Woomie
        </h2>
        <p className="text-gray-600 mb-6">
          Do you want to find a compatible roommate? It takes just 1 minute to fill your lifestyle info.
        </p>
        <div className="flex justify-center gap-6">
          <button
            onClick={() => navigate("/userProfile")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Fill Roommate Profile
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Do it Later
          </button>
        </div>
      </div>
    </div>
  );
}
