import React from 'react'

const Custom404: React.FC = () => {
  return (
    <div className="h-[100dvh] bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full h-96 bg-white rounded-2xl shadow-2xl p-12 text-center">
        <h1 className="text-6xl font-extrabold text-gray-800 mb-6">404</h1>
        <h2 className="text-4xl font-bold text-gray-700 mb-8">Unexplored Territory</h2>
        <p className="text-xl text-gray-600 mb-10">
          It seems you've ventured beyond our known boundaries. 
          This page is located in unmarked territory on our digital map.
        </p>
        <div className="space-y-6">
          <p className="text-lg text-gray-500">
            Don't worry, even the best explorers get lost sometimes.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Custom404