import React from "react";

interface GalleryProps {
  images: string[];
}

const Gallery: React.FC<GalleryProps> = ({ images }) => (
  <section id="galeria" className="py-8 sm:py-16 flex h-auto sm:h-auto">
    <div className="container m-auto px-2 sm:px-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Galería de Imágenes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-4 p-6">
        {images.map((imgSrc, index) => (
          <img
            key={index}
            src={imgSrc}
            alt={`Imagen de la finca ${index + 1}`}
            className="w-full lg:h-80 h-72 object-cover rounded-lg shadow-md"
          />
        ))}
      </div>
    </div>
  </section>
);

export default Gallery;
