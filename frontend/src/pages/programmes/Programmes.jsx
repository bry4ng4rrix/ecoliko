'use client';

import { Link } from 'react-router-dom';
import { BookOpen, Lightbulb, Award } from 'lucide-react';
import Layout from '@/components/layout/layout';

export default function ProgrammesPage() {
  return (
    <Layout>
   

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-blue-900 mb-4">Nos Programmes Académiques</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Des filières adaptées à chaque profil d'élève du collège au lycée
          </p>
        </div>
      </section>

      {/* College Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="bg-blue-100 rounded-xl p-8 h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-gray-600 font-semibold">Collège (6ème à 3ème)</p>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-blue-900 mb-6">Cycle du Collège</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Le collège prépare nos élèves à une formation générale solide dans un environnement d'apprentissage stimulant. Nous mettons l'accent sur l'épanouissement personnel et le développement des compétences transversales.
              </p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 mb-3">Matières principales</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {['Français', 'Mathématiques', 'Anglais', 'Histoire-Géographie', 'Sciences Physiques', 'Biologie', 'Technologie', 'Informatique'].map((subject) => (
                      <div key={subject} className="flex gap-2">
                        <span className="text-orange-500">•</span>
                        <span className="text-gray-700">{subject}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-blue-900 mb-3">Options disponibles</h3>
                  <ul className="space-y-2">
                    <li className="flex gap-2">
                      <span className="text-orange-500">✓</span>
                      <span className="text-gray-700">Chinois ou Espagnol (3ème langue)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500">✓</span>
                      <span className="text-gray-700">Latin ou Grec ancien</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500">✓</span>
                      <span className="text-gray-700">Classe bilangue (dès la 6ème)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lycee Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h2 className="text-3xl font-bold text-blue-900 mb-6">Cycle du Lycée</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Le lycée offre des filières variées permettant à chaque élève de construire un projet d'études et professionnel adapté à ses aptitudes et ses aspirations. Nous préparons nos bacheliers aux études supérieures avec excellence.
              </p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 mb-3">Filières proposées</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Filière Générale (L, ES, S)', desc: 'Littéraire, Économique & Sociale, Scientifique' },
                      { name: 'Filière Technologique', desc: 'Sciences et Technologies de l\'Industrie et du Développement Durable' },
                      { name: 'Classes Préparatoires', desc: 'Préparation aux grandes écoles (CPGE)' },
                    ].map((filiere) => (
                      <div key={filiere.name} className="bg-white rounded-lg p-4">
                        <h4 className="font-bold text-blue-900">{filiere.name}</h4>
                        <p className="text-sm text-gray-600">{filiere.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-orange-100 rounded-xl p-8 h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎓</div>
                <p className="text-gray-600 font-semibold">Lycée (2nde à Terminale)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Specializations */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Spécialités et Options</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Lightbulb className="w-8 h-8" />,
                title: 'Options Scientifiques',
                subjects: ['SVT Spécialité', 'Mathématiques Approfondies', 'Chimie Avancée', 'Informatique'],
              },
              {
                icon: <BookOpen className="w-8 h-8" />,
                title: 'Options Littéraires',
                subjects: ['Philosophie', 'Littérature', 'Histoire-Géographie', 'Langues Vivantes'],
              },
              {
                icon: <Award className="w-8 h-8" />,
                title: 'Options Transversales',
                subjects: ['EPS (Sport)', 'Arts Plastiques', 'Musique', 'Théâtre'],
              },
            ].map((speciality, idx) => (
              <div key={idx} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mb-4">
                  {speciality.icon}
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-4">{speciality.title}</h3>
                <ul className="space-y-2">
                  {speciality.subjects.map((subject) => (
                    <li key={subject} className="flex gap-2 text-gray-700">
                      <span className="text-orange-500">▸</span>
                      {subject}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Educational Approach */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Notre Approche Pédagogique</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Apprentissage Actif',
                description: 'Nos élèves participent activement à leur processus d\'apprentissage par le biais de projets, débats et travaux collaboratifs.',
              },
              {
                title: 'Personnalisation',
                description: 'Nous adaptons notre enseignement aux besoins individuels de chaque élève pour maximiser sa réussite.',
              },
              {
                title: 'Dimensions Internationales',
                description: 'Programme bilingue, partenariats à l\'international et préparation aux examens internationaux.',
              },
              {
                title: 'Développement Global',
                description: 'Au-delà des académiques, nous développons les compétences sociales, émotionnelles et professionnelles.',
              },
            ].map((approach, idx) => (
              <div key={idx} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-blue-900 mb-3">{approach.title}</h3>
                <p className="text-gray-700 leading-relaxed">{approach.description}</p>
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
