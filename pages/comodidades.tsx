import Head from 'next/head';
import Link from 'next/link';

const amenities = [
  { icon: '📶', label: 'Wi-Fi Gratuito' },
  { icon: '❄️', label: 'Ar Condicionado' },
  { icon: '🍳', label: 'Cozinha Equipada' },
  { icon: '🧺', label: 'Máquina de Lavar e Secar Roupa' },
  { icon: '🍽️', label: 'Máquina de Lavar Loiça' },
  { icon: '🌤️', label: 'Espaço Exterior' },
  { icon: '🚗', label: 'Estacionamento' },
  { icon: '🔑', label: 'Check-in autónomo' },
  { icon: '📺', label: '3 TVs' },
  { icon: '🔥', label: 'Lareira' },
  { icon: '🏊', label: 'Tanque Alentejano' },
  { icon: '☕', label: 'Máquina de café Nespresso' },
];

export default function ComodidadesPage() {
  return (
    <>
      <Head>
        <title>Comodidades | EnzoLoft</title>
        <meta
          name="description"
          content="Conheça todas as comodidades da EnzoLoft para uma estadia confortável no Alentejo."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-red-50">
        <header className="bg-white border-b-2 border-orange-100 sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-5 flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              EnzoLoft
            </h1>
            <Link
              href="/#booking"
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full hover:shadow-lg hover:shadow-orange-300 transition-all font-semibold"
            >
              Reservar Agora
            </Link>
          </div>
        </header>

        <section className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-4xl md:text-5xl font-bold text-orange-900 text-center mb-3">Comodidades</h2>
          <p className="text-center text-gray-600 mb-10 text-lg">
            Tudo o que precisa para uma estadia confortável e tranquila.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {amenities.map((amenity) => (
              <article
                key={amenity.label}
                className="bg-white rounded-2xl border-2 border-orange-100 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="text-5xl mb-4" aria-hidden="true">{amenity.icon}</div>
                <h3 className="text-xl font-bold text-orange-900">{amenity.label}</h3>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}