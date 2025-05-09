import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export function PreferencesModal({
  open,
  onClose,
  roomieName,
  prefs,
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[#4E674A]">
            {roomieName}’s Preferences
          </h3>
          <button onClick={onClose} className="text-[#4E674A] hover:text-[#4E674A]/70">
            <FontAwesomeIcon icon={faXmark} className="text-2xl" />
          </button>
        </div>
        <div className="space-y-2 text-gray-700">
          <p><strong>Budget:</strong> ${prefs.minBudget} – ${prefs.maxBudget}</p>
          <p><strong>Work ZIP:</strong> {prefs.workLocation}</p>
          <p><strong>Roommate Status:</strong> {prefs.roommateStatus}</p>
          <p><strong>Sleep / Wake:</strong> {prefs.sleepTime} / {prefs.wakeTime}</p>
          <p><strong>Cleanliness:</strong> {prefs.cleanliness}</p>
          <p><strong>Noise Tolerance:</strong> {prefs.noiseTolerance}</p>
          <p><strong>Guests:</strong> {prefs.guests}</p>
          <p><strong>Smoking:</strong> {prefs.smoking}</p>
          <p><strong>Drinking:</strong> {prefs.drinking}</p>
          <p><strong>Pets:</strong> {prefs.pets}</p>
        </div>
      </div>
    </div>
  );
}
