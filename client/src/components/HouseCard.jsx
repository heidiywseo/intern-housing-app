import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookmark as solidBookmark } from '@fortawesome/free-solid-svg-icons';
import { faBookmark as regularBookmark } from '@fortawesome/free-regular-svg-icons';

const HouseCard = ({ house, isSaved, toggleSaveHouse, user, onClick }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (house.id) {
      navigate(`/house/${house.id}`);
    }
  };

  const handleBookmarkClick = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (house.id && toggleSaveHouse) {
      await toggleSaveHouse(house.id.toString());
    }
  };

  const title = house.title || 'No Title Available';
  let priceDisplay = 'Price Unavailable';
  if (house.price != null) {
    let amount = typeof house.price === 'string'
      ? parseFloat(house.price.replace(/[^0-9.]/g, ''))
      : house.price;
    if (!isNaN(amount)) {
      const rounded = Math.round(amount);
      priceDisplay = `$${rounded}/mo`;
    }
  }

  let description = house.description || 'No description available.';
  description = description.replace(/<br\s*\/?>(?=<br\s*\/?>)?/gi, ' ');
  const image = house.images?.[0] || 'https://via.placeholder.com/400x200?text=No+Image';
  const bedrooms = house.bedrooms || '--';
  const bathrooms = house.bathrooms || '--';
  const area = house.area || '--';

  return (
    <div
      className="hover:scale-[1.03] duration-300 ease-in-out cursor-pointer relative"
      onClick={onClick}
    >
      <button
        className="absolute top-2 right-2 z-10 bg-white/80 p-2 rounded-full hover:bg-white"
        onClick={handleBookmarkClick}
      >
        <FontAwesomeIcon
          icon={isSaved ? solidBookmark : regularBookmark}
          className={isSaved ? 'text-yellow-500' : 'text-gray-600'}
        />
      </button>

      <img
        src={image}
        alt={title}
        className="h-48 w-full object-cover bg-gray-800 rounded-t-lg"
      />
      <div className="bg-white rounded-b-lg p-6 shadow-md h-auto">
        <div className="flex justify-between">
          <h2 className="text-xl font-semibold mb-4 pr-2">{title}</h2>
          <span className="text-[#4E674A] font-semibold text-yellow-800/60">{priceDisplay}</span>
        </div>

        <p className="text-[#4E674A]/70 mb-2">{description}</p>

        <div className="flex gap-3 text-sm text-gray-500">
          <span>{bedrooms} bed</span>
          <span>{bathrooms} bath</span>
          <span>{area} sq ft</span>
        </div>
      </div>
    </div>
  );
};

export default HouseCard;