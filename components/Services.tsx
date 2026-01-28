import { Code, Smartphone, Cloud, LineChart, Shield, Globe } from "lucide-react";

const services = [
  { icon: Code, title: "Web Development", description: "Custom web applications built with modern technologies like Next.js and React." },
  { icon: Smartphone, title: "Mobile Apps", description: "Native and cross-platform mobile solutions for iOS and Android." },
  { icon: Cloud, title: "Cloud Services", description: "Scalable cloud infrastructure, migration, and deployment on AWS and Azure." },
  { icon: LineChart, title: "Data Analytics", description: "Actionable insights from your business data to drive growth." },
  { icon: Shield, title: "Cyber Security", description: "Comprehensive security audits and protection for your digital assets." },
  { icon: Globe, title: "Digital Marketing", description: "Strategic digital marketing campaigns to grow your online presence." },
];

export default function Services() {
  return (
    <section id="services" className="py-16 lg:py-24 bg-light">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl lg:text-4xl font-bold text-center text-dark mb-12 font-heading">
          Our Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-lg hover:shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-shadow duration-300 group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <service.icon size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-dark font-heading">
                {service.title}
              </h3>
              <p className="text-gray-600 font-sans">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
