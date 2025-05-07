import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase'; // Import auth from firebase

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-between bg-[#EDEBE4] p-4">
      <div className="flex items-center hover:cursor-pointer" onClick={() => navigate('/')}>
        <img src="/woomie3.svg" alt="Woomie Logo" className="h-10 w-10" />
        <p className="text-xl font-bold pl-2 pb-1 text-[#4E674A]">woomie</p>
        <p className="font-semibold pl-10 text-[#4E674A]">About Us</p>
      </div>
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            <span className="font-semibold text-[#4E674A]">
              Hello, {user.firstName}
            </span>
            <button
              onClick={handleLogout}
              className="hover:cursor-pointer px-4 py-2 rounded-lg bg-[#4E674A]/90 text-white font-semibold shadow-md hover:bg-[#4E674A] transition"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="hover:cursor-pointer px-4 py-2 rounded-lg bg-[#4E674A]/90 text-white font-semibold shadow-md hover:bg-[#4E674A] transition"
          >
            Login
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;