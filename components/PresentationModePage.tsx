import React from 'react';
import Head from 'next/head';
import Image from 'next/image';

interface ContactInfo {
  location: string;
  email: string;
  phone: string;
  description: string;
  mapsUrl?: string;
}

interface Amenity {
  icon: string;
  label: string;
}

interface GalleryImage {
  src: string;
  alt: string;
}

interface PresentationModePageProps {
  amenities: Amenity[];
  galleryImages: GalleryImage[];
  contactInfo: ContactInfo;
}

export default function PresentationModePage({
  amenities,
  galleryImages,
  contactInfo,
}: PresentationModePageProps) {
  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>EnzoLoft - Apresentação da Casa</title>
        <meta
          name="description"
          content="Conheça a EnzoLoft: comodidades, galeria e localização da casa no coração do Alentejo."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="bg-white border-b-2 border-orange-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            EnzoLoft
          </h1>
          <span className="text-xs md:text-base text-gray-600 font-medium">Modo Apresentação</span>
        </div>
      </header>

      <section className="relative py-14 md:py-20 overflow-hidden min-h-[52vh] flex items-center">
        <div className="absolute inset-0 z-0 relative">
          <Image
            src="https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=1920&q=80"
            alt="Vista da EnzoLoft"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-orange-700 via-red-600 to-orange-700 opacity-60"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-white">
          <h2 className="text-3xl md:text-6xl font-bold mb-4 drop-shadow-lg leading-tight">Conheça a EnzoLoft</h2>
          <p className="text-base md:text-2xl max-w-3xl drop-shadow-md leading-relaxed">
            Casa de charme no Alentejo, ideal para descanso em família ou com amigos, com espaços amplos e ambiente tranquilo.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-gradient-to-br from-orange-50 to-red-50">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl md:text-4xl font-bold text-orange-900 mb-8 md:mb-10 text-center">Comodidades da Casa</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {amenities.map((amenity, index) => (
              <div
                key={index}
                className="bg-white p-4 md:p-5 rounded-xl border-2 border-orange-100 shadow-sm text-center"
              >
                <p className="text-2xl md:text-3xl mb-2">{amenity.icon}</p>
                <p className="font-semibold text-sm md:text-base text-gray-800">{amenity.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl md:text-4xl font-bold text-orange-900 mb-8 md:mb-10 text-center">Galeria</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {galleryImages.map((image, index) => (
              <div key={index} className="relative h-52 sm:h-56 rounded-xl overflow-hidden shadow-lg">
                <Image src={image.src} alt={image.alt} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-gradient-to-br from-gray-50 to-orange-50 border-t-2 border-orange-100">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-orange-900 mb-8 text-center">Contactos</h3>
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-5 md:p-8 space-y-4 border border-orange-100">
            <p className="text-gray-700">
              <strong>📍 Localização:</strong> {contactInfo.location}
            </p>
            <p className="text-gray-700">
              <strong>📧 Email:</strong> {contactInfo.email}
            </p>
            <p className="text-gray-700">
              <strong>📞 Telefone:</strong> {contactInfo.phone}
            </p>
            <p className="text-gray-700">
              <strong>📝 Descrição:</strong> {contactInfo.description}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
