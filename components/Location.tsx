import { MapPin, Phone, Mail, Clock } from "lucide-react";

export default function Location() {
  return (
    <section id="location" className="py-16 lg:py-24 bg-light">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl lg:text-4xl font-bold text-center text-dark mb-12 font-heading">
          Our Location
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-lg h-full">
            <h3 className="text-2xl font-bold mb-6 font-heading text-dark">
              Contact Information
            </h3>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-50 p-3 rounded-lg text-primary">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-dark mb-1">Visit Us</h4>
                  <p className="text-gray-600">
                    123 Tech Park, Innovation Street,
                    <br />
                    Silicon Valley, CA 94025
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-blue-50 p-3 rounded-lg text-primary">
                  <Phone size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-dark mb-1">Call Us</h4>
                  <p className="text-gray-600">+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-blue-50 p-3 rounded-lg text-primary">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-dark mb-1">Email Us</h4>
                  <p className="text-gray-600">info@epacifictech.com</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-blue-50 p-3 rounded-lg text-primary">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-dark mb-1">Working Hours</h4>
                  <p className="text-gray-600">Mon - Fri: 9:00 AM - 6:00 PM</p>
                </div>
              </div>
            </div>
          </div>
          <div className="min-h-[400px] lg:h-auto rounded-xl overflow-hidden shadow-lg bg-gray-200 relative">
            <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
               <div className="text-center">
                  <MapPin size={48} className="text-gray-500 mx-auto mb-2"/>
                  <p className="text-gray-600 font-semibold text-xl">Map Integration</p>
                  <p className="text-gray-500 text-sm">(Interactive map would be here)</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
