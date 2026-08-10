'use client';

import { Link } from 'react-router-dom';
import { Wifi, Users, Utensils, Trophy, Music, Briefcase } from 'lucide-react';
import Layout from '@/components/layout/layout';


export default function ServicesPage() {
  return (
    <Layout>
      

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-blue-900 mb-4">Nos Services</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Un environnement complet pour le bien-être et la réussite de nos élèves
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {[
              {
                icon: <Wifi className="w-8 h-8" />,
                title: 'Centre Digital & Informatique',
                description: 'Salles informatiques dernier cri avec accès internet haut débit, logiciels spécialisés et accompagnement pédagogique pour développer les compétences numériques.',
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: 'Orientation & Conseil',
                description: 'Service d\'orientation professionnelle pour aider nos élèves à choisir leur parcours académique et professionnel futur.',
              },
              {
                icon: <Utensils className="w-8 h-8" />,
                title: 'Restauration Scolaire',
                description: 'Cantine moderne proposant des repas équilibrés et nutritifs préparés par une équipe de cuisiniers expérimentés. Respect des régimes spéciaux.',
              },
              {
                icon: <Trophy className="w-8 h-8" />,
                title: 'Sports & Loisirs',
                description: 'Installations sportives complètes : football, basket-ball, volley-ball, tennis, athlétisme et programmes d\'activités extrascolaires variées.',
              },
              {
                icon: <Music className="w-8 h-8" />,
                title: 'Arts & Culture',
                description: 'Clubs d\'arts plastiques, musique, théâtre et danse. Participation à des événements culturels et représentations scolaires tout au long de l\'année.',
              },
              {
                icon: <Briefcase className="w-8 h-8" />,
                title: 'Suivi Académique',
                description: 'Tutorat personnalisé, soutien scolaire, étude dirigée et accompagnement individualisé pour chaque élève en fonction de ses besoins.',
              },
            ].map((service, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mb-4">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-3">{service.title}</h3>
                <p className="text-gray-700 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support Services */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Services de Soutien</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Soutien Psychosocial',
                points: [
                  'Psychologue scolaire',
                  'Conseiller d\'éducation',
                  'Infirmerie scolaire',
                  'Programme de bien-être',
                  'Gestion du stress et anxiété',
                ],
              },
              {
                title: 'Ressources Pédagogiques',
                points: [
                  'Bibliothèque digitale',
                  'Portail e-learning',
                  'Matériels scientifiques',
                  'Ressources en ligne',
                  'Accès à des bases de données',
                ],
              },
              {
                title: 'Connexion Famille-École',
                points: [
                  'Portail parent',
                  'Suivi académique en ligne',
                  'Réunions parents-profs',
                  'Communications régulières',
                  'Plateforme collaborative',
                ],
              },
            ].map((section, idx) => (
              <div key={idx} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-blue-900 mb-6">{section.title}</h3>
                <ul className="space-y-3">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span className="text-orange-500 font-bold">✓</span>
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transportation & Logistics */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Services Pratiques</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-blue-900 mb-6">Transport Scolaire</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold text-lg">🚌</span>
                  <div>
                    <p className="font-semibold text-gray-800">Flotte de minibus modernes</p>
                    <p className="text-sm text-gray-600">Véhicules entretenus régulièrement et climatisés</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold text-lg">🗺️</span>
                  <div>
                    <p className="font-semibold text-gray-800">Trajets variés</p>
                    <p className="text-sm text-gray-600">Plusieurs circuits couvrant différents quartiers</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold text-lg">⏰</span>
                  <div>
                    <p className="font-semibold text-gray-800">Horaires flexibles</p>
                    <p className="text-sm text-gray-600">Matin et soir adaptés au rythme scolaire</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-blue-900 mb-6">Internat</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="text-orange-600 font-bold text-lg">🏠</span>
                  <div>
                    <p className="font-semibold text-gray-800">Dortoirs confortables</p>
                    <p className="text-sm text-gray-600">Chambre doubles et simples selon préférence</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-orange-600 font-bold text-lg">📚</span>
                  <div>
                    <p className="font-semibold text-gray-800">Étude encadrée</p>
                    <p className="text-sm text-gray-600">Salles d\'étude avec accès internet 24h/24</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-orange-600 font-bold text-lg">🎯</span>
                  <div>
                    <p className="font-semibold text-gray-800">Encadrement de qualité</p>
                    <p className="text-sm text-gray-600">Surveillants présents et activités sociales</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Scholarships */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Bourses d\'Études</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                type: 'Bourse Mérite',
                percentage: 'jusqu\'à 50%',
                description: 'Récompense l\'excellence académique et les performances exceptionnelles',
              },
              {
                type: 'Bourse Sportive',
                percentage: 'jusqu\'à 40%',
                description: 'Soutient les élèves avec des talents sportifs remarquables',
              },
              {
                type: 'Bourse Sociale',
                percentage: 'jusqu\'à 75%',
                description: 'Aide les familles ayant des besoins financiers particuliers',
              },
            ].map((scholarship, idx) => (
              <div key={idx} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition text-center">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-xl font-bold text-blue-900 mb-2">{scholarship.type}</h3>
                <p className="text-3xl font-bold text-orange-500 mb-4">{scholarship.percentage}</p>
                <p className="text-gray-700">{scholarship.description}</p>
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
