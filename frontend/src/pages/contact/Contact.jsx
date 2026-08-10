'use client';

import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import Layout from  '@/components/layout/layout';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (

    <Layout>
    <div className="min-h-screen bg-white">
      {/* Header */}
      

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-blue-900 mb-4">Nous Contacter</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Vos questions, suggestions et demandes sont importantes pour nous
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-20">
            {[
              {
                icon: <MapPin className="w-6 h-6" />,
                title: 'Adresse',
                content: 'Tananarive 101, Madagascar',
                detail: 'Région de Vakinankaratra',
              },
              {
                icon: <Phone className="w-6 h-6" />,
                title: 'Téléphone',
                content: '+261 20 2261 25',
                detail: 'Du lundi au vendredi',
              },
              {
                icon: <Mail className="w-6 h-6" />,
                title: 'Email',
                content: 'contact@college-lycee.mg',
                detail: 'Réponse sous 24h',
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: 'Horaires',
                content: '7h00 - 17h00',
                detail: 'Lun-Ven (Sauf jours fériés)',
              },
            ].map((info, idx) => (
              <div key={idx} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mx-auto mb-4">
                  {info.icon}
                </div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">{info.title}</h3>
                <p className="text-gray-800 font-semibold">{info.content}</p>
                <p className="text-gray-600 text-sm mt-1">{info.detail}</p>
              </div>
            ))}
          </div>

          {/* Quick Contact Links */}
          <div className="grid md:grid-cols-2 gap-6 mb-20">
            <a href="tel:+261202261125" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-xl hover:shadow-lg transition flex items-center gap-4">
              <Phone className="w-8 h-8" />
              <div>
                <p className="font-semibold">Appelez-nous directement</p>
                <p className="text-blue-100">+261 20 2261 25</p>
              </div>
            </a>
            <a href="mailto:contact@college-lycee.mg" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-8 rounded-xl hover:shadow-lg transition flex items-center gap-4">
              <Mail className="w-8 h-8" />
              <div>
                <p className="font-semibold">Envoyez-nous un email</p>
                <p className="text-orange-100">contact@college-lycee.mg</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Formulaire de Contact</h2>
          
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-gray-700 font-semibold mb-2">
                    Nom Complet *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre.email@gmail.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-gray-700 font-semibold mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+261 XX XXX XXXX"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-gray-700 font-semibold mb-2">
                    Sujet *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition"
                    required
                  >
                    <option value="">Sélectionnez un sujet</option>
                    <option value="admission">Demande d'admission</option>
                    <option value="programme">Renseignement sur les programmes</option>
                    <option value="service">Information sur les services</option>
                    <option value="bourse">Demande de bourse</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-gray-700 font-semibold mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Votre message détaillé..."
                  rows="6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition resize-none"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <MessageCircle size={20} />
                Envoyer le Message
              </button>
            </form>

            {/* {submitted && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 font-semibold flex items-center gap-2">
                  <span>✓</span>
                  Message envoyé avec succès! Nous vous répondrons bientôt.
                </p>
              </div>
            )} */}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">Notre Localisation</h2>
          <div className="w-full h-96 bg-gray-200 rounded-xl overflow-hidden shadow-lg">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3768.8241948277254!2d47.5240449!3d-19.0176!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x21f07aafe11aabab%3A0x5b3f8e8e8e8e8e8e!2sTananarive%2C%20Madagascar!5e0!3m2!1sfr!2sfr!4v1234567890"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-16">Questions Fréquemment Posées</h2>
          
          <div className="space-y-4">
            {[
              {
                q: 'Quels sont les frais d\'inscription?',
                a: 'Les frais varient selon le niveau (Collège ou Lycée). Nous proposons des plans de paiement flexibles et des bourses selon les critères académiques et sociaux.',
              },
              {
                q: 'Quelle est la date limite de candidature?',
                a: 'Les inscriptions se font généralement de novembre à mars pour l\'année suivante. Veuillez nous contacter pour les dates exactes.',
              },
              {
                q: 'Y a-t-il un système de transport?',
                a: 'Oui, nous disposons d\'une flotte de minibus modernes desservant différents quartiers de Tananarive.',
              },
              {
                q: 'Proposez-vous des bourses?',
                a: 'Oui, nous offrons des bourses au mérite, au sport et des bourses sociales pouvant couvrir jusqu\'à 75% des frais.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition">
                <h3 className="font-bold text-blue-900 mb-3">{faq.q}</h3>
                <p className="text-gray-700 leading-relaxed">{faq.a}</p>
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

          <div className="border-t border-blue-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-blue-100">
              <p>&copy; 2025 Collège-Lycée Madagascar. Tous droits réservés.</p>
              <div className="flex gap-6">
                <a href="#" className="hover:text-white transition">Politique de Confidentialité</a>
                <a href="#" className="hover:text-white transition">Conditions d'Utilisation</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </Layout>
  );
}
