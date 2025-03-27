import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { City } from "../models/City"; // 3D City Model
import "../index.css";

export default function HomePage() {
  const [hoveredListing, setHoveredListing] = useState(null);

  return (
    <motion.div
      className="w-full min-h-screen bg-white dark:bg-[#121212] flex flex-col items-center justify-start relative transition-colors"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    >
      {/* 🔹 Navigation Bar */}
      <div className="absolute top-5 right-5 flex space-x-4">
        <button className="text-[#645355] dark:text-white font-semibold border px-4 py-2 rounded-md shadow-sm hover:bg-[#645355] hover:text-white dark:hover:bg-white dark:hover:text-[#645355] transition">
          Log In
        </button>
        <button className="bg-[#645355] dark:bg-white text-white dark:text-[#645355] px-4 py-2 rounded-md shadow-md hover:bg-opacity-90 transition">
          Sign Up
        </button>
      </div>

      {/* 🔹 Immersive 3D City (Parallax Scrolling Effect) */}
      <motion.div
        className="w-full h-[25vh] md:h-[50vh] lg:h-[75vh] relative"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 4, ease: "easeOut" }}
      >
        <CanvasComponent hoveredListing={hoveredListing} />
      </motion.div>

      {/* 🔹 Search Filters (Sliders Instead of Dropdowns) */}
      <div className="w-full max-w-6xl px-6 py-10">
        <h2 className="text-3xl font-semibold text-[#645355] dark:text-white mb-6 flex items-center">
          🏡 Find Your Perfect Stay
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <FilterSlider label="Budget" min={500} max={3000} step={100} unit="$" />
          <FilterSlider label="Commute" min={5} max={60} step={5} unit="min" />
          <FilterSlider label="Ratings" min={3} max={5} step={0.1} unit="★" />
        </div>

        {/* 🔹 Dynamic Housing Listings */}
        <DynamicListings setHoveredListing={setHoveredListing} />
      </div>
    </motion.div>
  );
}

/* 🔹 City Canvas with Subtle Floating Effect */
function CanvasComponent({ hoveredListing }) {
  return (
    <Canvas camera={{ position: [0, 8, 20], fov: 50 }}>
      <Environment preset="city" />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.8} />
      <CityWrapper hoveredListing={hoveredListing} />
    </Canvas>
  );
}

/* 🔹 City Model with Smooth Floating & Highlight Effect */
function CityWrapper({ hoveredListing }) {
  const cityRef = useRef();

  useFrame(() => {
    if (cityRef.current) {
      cityRef.current.rotation.y += 0.002; // Smooth rotation
      cityRef.current.position.y = Math.sin(Date.now() * 0.0005) * 0.3; // Floating effect
    }
  });

  return (
    <group ref={cityRef}>
      <City scale={[2, 2, 2]} />
    </group>
  );
}

/* 🔹 Slider Component */
function FilterSlider({ label, min, max, step, unit }) {
  const [value, setValue] = useState((min + max) / 2);

  return (
    <div>
      <label className="text-gray-700 dark:text-gray-300">{label}: {unit}{value}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full slider"
      />
    </div>
  );
}

/* 🔹 Dynamic Listings with Hover Effect */
function DynamicListings({ setHoveredListing }) {
  const listings = [
    { id: 1, title: "Cozy Apartment", price: "$1200", distance: "10 min", rating: "4.7" },
    { id: 2, title: "Luxury Loft", price: "$2500", distance: "5 min", rating: "4.9" },
    { id: 3, title: "Budget Studio", price: "$800", distance: "20 min", rating: "4.3" },
  ];

  return (
    <div className="w-full h-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing) => (
        <motion.div
          key={listing.id}
          className="bg-gray-200 dark:bg-gray-900 rounded-lg p-4 shadow-lg transition-transform hover:scale-105"
          onMouseEnter={() => setHoveredListing(listing.id)}
          onMouseLeave={() => setHoveredListing(null)}
        >
          <h3 className="text-lg font-semibold">{listing.title}</h3>
          <p className="text-gray-600 dark:text-gray-400">{listing.price} • {listing.distance} • ★ {listing.rating}</p>
        </motion.div>
      ))}
    </div>
  );
}
