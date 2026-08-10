'use client';

import { Link } from 'react-router-dom';
import { Award, Users, BookOpen, Globe } from 'lucide-react';
import Layout from'@/components/layout/layout';


export default function PresentationPage() {
    console.log(navigation)
  return (
    <Layout>
      {/* Header */}
     

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-blue-900 mb-4">À Propos de Notre Établissement</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Découvrez notre histoire, nos valeurs et notre mission d'excellence académique
          </p>
        </div>
      </section>

      {/* History Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-blue-900 mb-6">Notre Histoire</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Fondé en 2000, notre établissement s'est construit sur les principes de l'excellence académique et du développement intégral de chaque élève. Depuis plus de deux décennies, nous avons formé des milliers de jeunes qui contribuent activement au développement de Madagascar et du monde.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Notre parcours est marqué par une constante innovation pédagogique, l'investissement dans les infrastructures modernes et un engagement indéfectible envers la réussite de chaque apprenant.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Aujourd'hui, nous accueillons plus de 1500 élèves du collège au lycée, encadrés par une équipe de 120 enseignants passionnés et dédiés.
              </p>
            </div>
            <div className="bg-blue-100 rounded-xl p-8 h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="text-7xl mb-4">🏛️</div>
                <p className="text-gray-600 font-semibold">Plus de 25 ans d'excellence</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Notre Mission et Vision</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-blue-900 mb-4">Notre Mission</h3>
              <p className="text-gray-700 leading-relaxed">
                Offrir une éducation de qualité qui prépare chaque élève à devenir un citoyen responsable, créatif et compétent, capable de relever les défis du 21ème siècle et de contribuer au développement durable de la société.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-blue-900 mb-4">Notre Vision</h3>
              <p className="text-gray-700 leading-relaxed">
                Être un établissement d'enseignement de référence en Afrique de l'Océan Indien, reconnu pour l'excellence de ses programmes, l'innovation pédagogique et la réussite académique et personnelle de ses élèves.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Nos Valeurs Fondamentales</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                icon: <Award className="w-8 h-8" />,
                title: 'Excellence',
                description: 'Nous visons l\'excellence dans chaque aspect de notre travail et de nos enseignements.',
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: 'Inclusivité',
                description: 'Nous accueillons et valorisons la diversité de tous nos élèves et collaborateurs.',
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: 'Ouverture',
                description: 'Nous préparons nos élèves à un monde globalisé et interconnecté.',
              },
              {
                icon: <BookOpen className="w-8 h-8" />,
                title: 'Apprentissage',
                description: 'Nous promouvons une culture d\'apprentissage continu et de curiosité intellectuelle.',
              },
            ].map((value, idx) => (
              <div key={idx} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-2">{value.title}</h3>
                <p className="text-gray-700 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Notre Équipe de Direction</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Dr. Jean Rakotoarison',
                role: 'Directeur Général',
                bio: 'Plus de 30 ans d\'expérience dans l\'éducation',
              },
              {
                name: 'Mme Sophie Randrianampoinimerina',
                role: 'Directrice Pédagogique',
                bio: 'Spécialiste en innovation pédagogique',
              },
              {
                name: 'Mr. Pierre Razafindramampoinimerina',
                role: 'Directeur des Programmes',
                bio: 'Expert en développement curriculaire international',
              },
            ].map((member, idx) => (
              <div key={idx} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition text-center">
                <div className="w-20 h-20 bg-blue-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-4xl">👤</span>
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-2">{member.name}</h3>
                <p className="text-orange-500 font-semibold mb-2">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Nos Infrastructures</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Laboratoires Scientifiques',
                items: ['Laboratoire de Biologie', 'Laboratoire de Chimie', 'Laboratoire de Physique', 'Espace Digital'],
              },
              {
                title: 'Espaces Pédagogiques',
                items: ['45 Salles de classe modernes', 'Amphithéâtre', 'Salles informatiques', 'Studios technologiques'],
              },
              {
                title: 'Ressources Documentaires',
                items: ['Bibliothèque centrale', 'Centre de documentation', 'Portail numérique', 'Ressources en ligne'],
              },
              {
                title: 'Vie Scolaire',
                items: ['Cantine moderne', 'Installations sportives', 'Salle d\'activités', 'Espaces de détente'],
              },
            ].map((section, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-8">
                <h3 className="text-xl font-bold text-blue-900 mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-orange-500 font-bold">✓</span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">Établissement</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><Link href="/presentation" className="hover:text-white transition">Présentation</Link></li>
                <li><Link href="/presentation" className="hover:text-white transition">Histoire</Link></li>
                <li><Link href="/presentation" className="hover:text-white transition">Équipe</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Programmes</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><Link href="/programmes" className="hover:text-white transition">Collège</Link></li>
                <li><Link href="/programmes" className="hover:text-white transition">Lycée</Link></li>
                <li><Link href="/programmes" className="hover:text-white transition">Spécialités</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li><Link href="/services" className="hover:text-white transition">Ressources</Link></li>
                <li><Link href="/services" className="hover:text-white transition">Activités</Link></li>
                <li><Link href="/services" className="hover:text-white transition">Bourses</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Suivez-Nous</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-blue-800 hover:bg-blue-700 rounded-full flex items-center justify-center transition text-sm">f</a>
                <a href="#" className="w-10 h-10 bg-blue-800 hover:bg-blue-700 rounded-full flex items-center justify-center transition text-sm">t</a>
                <a href="#" className="w-10 h-10 bg-blue-800 hover:bg-blue-700 rounded-full flex items-center justify-center transition text-sm">i</a>
              </div>
            </div>
          </div>

          <div className="border-t border-blue-800 pt-8 text-center text-sm text-blue-100">
            <p>&copy; 2025 Collège-Lycée Madagascar. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </Layout>
  );
}
