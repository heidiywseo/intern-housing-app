import React from 'react'
import { useNavigate } from 'react-router-dom';

const About = () => {
    const navigate = useNavigate();
    
    const handleFindStayClick = () => {
        window.scrollTo(0, 0);
        navigate('/search');
    };
    
    return (
        <div className="flex flex-col bg-[#4E674A] w-full min-h-screen">
            <div className="flex-grow flex items-center justify-end">
                <div className="w-2/3"></div>
                <div className="w-1/2 pr-40 text-gray-200">
                    <div className="text-6xl font-bold">
                        The perfect intern home
                    </div>
                    <p className="text-2xl pt-10">
                        We'll match you with the best summer stay to make your
                        professional journey comfortable.
                    </p>
                    <div 
                        className="bg-[#f6f0e8] drop-shadow-lg hover:scale-[1.10] transition-[2.0] text-xl font-semibold text-center justify-center border-[#f6f0e8] text-[#4E674A] border-3 rounded-4xl h-14 w-50 mt-8 flex flex-col cursor-pointer"
                        onClick={handleFindStayClick}
                    >
                        Find your stay
                    </div>
                </div>
            </div>
        </div>
    )
}

export default About