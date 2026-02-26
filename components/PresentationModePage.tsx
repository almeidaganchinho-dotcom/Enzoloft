import React, { useState } from 'react';
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
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

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
          <div className="flex items-center gap-2">
            <span className="text-3xl"></span>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              EnzoLoft
            </h1>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => document.getElementById('amenities')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 md:px-6 py-2 rounded-full hover:shadow-lg hover:shadow-purple-300 transition-all font-semibold text-sm md:text-base"
            >
              Comodidades
            </button>
            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 md:px-6 py-2 rounded-full hover:shadow-lg hover:shadow-orange-300 transition-all font-semibold text-sm md:text-base"
            >
              Contactos
            </button>
          </div>
        </div>
      </header>

      <section className="relative py-16 overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=1920&q=80')",
          }}
        ></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 opacity-50"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">Retiro Perfeito no Alentejo</h2>
              <p className="text-xl md:text-2xl mb-8 drop-shadow-md">Alojamento de charme em Vila Ruiva, Cuba - Beja</p>
              <div className="flex gap-4 text-lg flex-wrap">
                <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">📶 Wi-Fi Gratuito</span>
                <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">🏊 Piscina</span>
                <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">🌿 Jardim</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-2xl text-gray-800">
              <h3 className="text-2xl font-bold text-orange-900 mb-4">Modo Apresentação Ativo</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Esta página mostra apenas a apresentação da casa e as comodidades, sem formulário de reserva.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Para informações e marcações, contacte-nos através dos dados no final da página.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-orange-50 to-red-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-orange-900 mb-6">Sobre o EnzoLoft</h2>
              <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                Um refúgio encantador no coração do Alentejo, onde a natureza, conforto e charme se encontram.
                Perfeito para casais, famílias ou amigos que procuram descanso e autenticidade.
              </p>
              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                Com piscina, jardim espaçoso e todas as comodidades modernas, oferecemos uma experiência inesquecível.
              </p>
              <div className="flex gap-4">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <p className="text-2xl font-bold text-orange-600">4.9</p>
                  <p className="text-sm text-gray-600">Avaliação</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <p className="text-2xl font-bold text-orange-600">500+</p>
                  <p className="text-sm text-gray-600">Hóspedes felizes</p>
                </div>
              </div>
            </div>
            <div className="relative w-full h-80 rounded-xl shadow-xl overflow-hidden">
              <Image
                src="https://enzoloft.web.app/images/about/casa-exterior.jpg"
                alt="Casa exterior"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="amenities" className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-orange-900 mb-12 text-center">Comodidades</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {amenities.map((amenity, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl text-center hover:shadow-lg transition-all duration-300 border-2 border-orange-100"
              >
                <div className="text-5xl mb-4">{amenity.icon}</div>
                <h3 className="text-lg font-semibold text-orange-900">{amenity.label}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-orange-50 to-red-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-orange-900 mb-12 text-center">Galeria</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className="relative h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <Image src={image.src} alt={image.alt} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                <div className="absolute inset-0 bg-black opacity-0 hover:opacity-20 transition-opacity duration-300 flex items-center justify-center">
                  <span className="text-white text-4xl opacity-0 hover:opacity-100 transition-opacity">🔍</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white text-4xl hover:text-orange-500 transition-colors"
              aria-label="Fechar"
            >
              ✕
            </button>
            <Image
              src={selectedImage.src}
              alt={selectedImage.alt}
              width={1600}
              height={900}
              sizes="100vw"
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-4 text-xl">{selectedImage.alt}</p>
          </div>
        </div>
      )}

      <section id="contact" className="py-16 bg-gradient-to-br from-gray-50 to-orange-50 border-t-2 border-orange-100">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-orange-900 mb-8 text-center">Contactos</h3>
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8 space-y-4 border border-orange-100">
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

      <footer className="bg-gradient-to-r from-gray-900 to-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">EnzoLoft</h3>
          <p className="text-orange-200 text-lg mb-6">Retiro de charme no coração do Alentejo</p>
          <p className="text-orange-200 text-sm text-center">© 2026 EnzoLoft. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
