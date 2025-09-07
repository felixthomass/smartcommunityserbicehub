import React, { useState } from 'react'
import { 
  Building2, Shield, Users, Wrench, CreditCard, MessageSquare, 
  QrCode, Bell, BarChart3, Search, MessageCircle, Calculator,
  CheckCircle, Star, ArrowRight, Phone, Mail, MapPin
} from 'lucide-react'

const LandingPage = ({ onNavigateToLogin, darkMode, setDarkMode }) => {
  const [activeService, setActiveService] = useState(0)

  const services = [
    {
      icon: CreditCard,
      title: "Digital Payment System",
      description: "Pay maintenance bills instantly with UPI, Razorpay integration, and automated reminders."
    },
    {
      icon: MessageSquare,
      title: "Complaint Management",
      description: "Raise and track complaints with real-time status updates and priority assignment."
    },
    {
      icon: QrCode,
      title: "Visitor Management",
      description: "Generate QR codes for visitors with time-based access and security verification."
    },
    {
      icon: Bell,
      title: "Community Announcements",
      description: "Stay updated with important community news, events, and maintenance schedules."
    },
    {
      icon: Shield,
      title: "24/7 Security",
      description: "Advanced security monitoring with emergency alerts and visitor tracking."
    },
    {
      icon: Calculator,
      title: "Bill Splitter",
      description: "Easily split utility bills and shared expenses among residents."
    }
  ]

  const features = [
    {
      icon: Building2,
      title: "Modern Living Spaces",
      description: "Premium 2BHK and 3BHK apartments with contemporary amenities and smart home features."
    },
    {
      icon: Users,
      title: "Community Management",
      description: "Comprehensive resident portal for seamless community interaction and service requests."
    },
    {
      icon: Shield,
      title: "Advanced Security",
      description: "Multi-layer security with CCTV monitoring, access control, and emergency response systems."
    },
    {
      icon: Wrench,
      title: "Maintenance Services",
      description: "Professional maintenance team available 24/7 for all your residential needs."
    }
  ]

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Resident, Block A",
      content: "The digital payment system has made paying maintenance bills so convenient. No more standing in queues!",
      rating: 5
    },
    {
      name: "Rajesh Kumar",
      role: "Resident, Block B",
      content: "The visitor management system is fantastic. My guests can easily enter using QR codes.",
      rating: 5
    },
    {
      name: "Anita Patel",
      role: "Resident, Block C",
      content: "Quick complaint resolution and excellent communication from the management team.",
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Smart Community Hub
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button
                onClick={onNavigateToLogin}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Login / Register
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Welcome to Your
                <span className="text-blue-600 block">Smart Community</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Experience modern living with our comprehensive community management system. 
                From digital payments to visitor management, everything you need is at your fingertips.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={onNavigateToLogin}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Learn More
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <Building2 className="w-8 h-8 text-blue-600 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">156</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Happy Residents</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <Shield className="w-8 h-8 text-green-600 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">24/7</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Security</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <CreditCard className="w-8 h-8 text-purple-600 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">98%</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Digital Payments</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <MessageSquare className="w-8 h-8 text-orange-600 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">2hrs</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Our Community?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              We provide a comprehensive living experience with modern amenities and smart technology
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="text-center group">
                  <div className="bg-blue-100 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40 transition-colors">
                    <Icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Our Digital Services
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need for comfortable community living
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              {services.map((service, index) => {
                const Icon = service.icon
                return (
                  <div
                    key={index}
                    className={`p-6 rounded-lg cursor-pointer transition-all ${
                      activeService === index
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setActiveService(index)}
                  >
                    <div className="flex items-start gap-4">
                      <Icon className={`w-6 h-6 mt-1 ${
                        activeService === index ? 'text-white' : 'text-blue-600'
                      }`} />
                      <div>
                        <h3 className={`text-lg font-semibold mb-2 ${
                          activeService === index ? 'text-white' : 'text-gray-900 dark:text-white'
                        }`}>
                          {service.title}
                        </h3>
                        <p className={`${
                          activeService === index ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-2xl shadow-xl p-8">
              <div className="text-center">
                {React.createElement(services[activeService].icon, {
                  className: "w-16 h-16 text-blue-600 mx-auto mb-4"
                })}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {services[activeService].title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {services[activeService].description}
                </p>
                <button
                  onClick={onNavigateToLogin}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What Our Residents Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Real feedback from our community members
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  "{testimonial.content}"
                </p>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Ready to Join Our Community?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Experience the future of community living with our smart management system.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-blue-100">
                  <Phone className="w-5 h-5" />
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-3 text-blue-100">
                  <Mail className="w-5 h-5" />
                  <span>info@smartcommunityhub.com</span>
                </div>
                <div className="flex items-center gap-3 text-blue-100">
                  <MapPin className="w-5 h-5" />
                  <span>123 Smart Street, Tech City, TC 12345</span>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Get Started Today
              </h3>
              <div className="space-y-4">
                <button
                  onClick={onNavigateToLogin}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Register as Resident
                </button>
                <button
                  onClick={onNavigateToLogin}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Staff Registration
                </button>
                <button
                  onClick={onNavigateToLogin}
                  className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Security Login
                </button>
                <button
                  onClick={onNavigateToLogin}
                  className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Admin Access
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-8 h-8 text-blue-400" />
                <h3 className="text-xl font-bold">Smart Community Hub</h3>
              </div>
              <p className="text-gray-400">
                Modern community living with smart technology and exceptional service.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Digital Payments</li>
                <li>Visitor Management</li>
                <li>Complaint System</li>
                <li>Community Chat</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Residents</li>
                <li>Staff Portal</li>
                <li>Security</li>
                <li>Management</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>+91 98765 43210</li>
                <li>info@smartcommunityhub.com</li>
                <li>24/7 Support</li>
                <li>Emergency: 911</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Smart Community Hub. All rights reserved.</p>
          </div>
        </div>
      </footer>


    </div>
  )
}

export default LandingPage