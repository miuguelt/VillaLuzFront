import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, LogIn, Play, Menu, X } from 'lucide-react';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img 
                src="/assets/logoSenaOrange.svg" 
                alt="Logo SENA" 
                className="h-10 w-auto sm:h-12"
                loading="lazy"
                decoding="async"
              />
              <h1 className="ml-2 sm:ml-3 text-lg sm:text-2xl font-bold text-gray-900 hidden sm:block">
                Livestock Management
              </h1>
              <h1 className="ml-2 text-lg font-bold text-gray-900 sm:hidden">
                LMS
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-3">
              <Link 
                to="/login" 
                className="bg-green-600 hover:bg-green-700 text-white p-2.5 rounded-lg transition-colors"
                aria-label="Iniciar sesión"
              >
                <LogIn className="h-5 w-5" />
              </Link>
              <Link 
                to="/signUp" 
                className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg transition-colors"
                aria-label="Registrarse"
              >
                <UserPlus className="h-5 w-5" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="sm:hidden py-4 border-t border-gray-200">
              <div className="flex justify-center space-x-4">
                <Link 
                  to="/login" 
                  className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors"
                  aria-label="Iniciar sesión"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LogIn className="h-6 w-6" />
                </Link>
                <Link 
                  to="/signUp" 
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors"
                  aria-label="Registrarse"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <UserPlus className="h-6 w-6" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Smart Livestock
            <span className="block text-green-600 mt-1">Management</span>
          </h2>
          <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-gray-600 px-4">
            Complete system for livestock farm administration. 
            Control animals, treatments, vaccinations and more from an integrated platform.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 px-4">
            <Link 
              to="/login" 
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium transition-colors shadow-lg flex items-center justify-center gap-2"
              aria-label="Comenzar"
            >
              <LogIn className="h-5 w-5" />
              <span className="hidden sm:inline">Get Started</span>
            </Link>
            <button className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-900 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium transition-colors shadow-lg border border-gray-300 flex items-center justify-center gap-2" aria-label="Ver demostración">
              <Play className="h-5 w-5" />
              <span className="hidden sm:inline">Watch Demo</span>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-12 sm:mt-16 lg:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Animal Management</h3>
            <p className="text-gray-600 text-sm sm:text-base">Complete control of livestock inventory with individual tracking of each animal.</p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Health Control</h3>
            <p className="text-gray-600 text-sm sm:text-base">Tracking of treatments, vaccinations and health status of livestock.</p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Reports and Analytics</h3>
            <p className="text-gray-600 text-sm sm:text-base">Detailed analysis and reports to optimize farm productivity.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm sm:text-base">
              © 2024 Livestock Management System - SENA. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;