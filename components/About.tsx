export default function About() {
  return (
    <section id="about" className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 relative h-[400px] w-full rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
             <div className="text-center">
                <div className="text-6xl mb-4">🏢</div>
                <p className="text-gray-500 font-semibold">Our Headquarters</p>
             </div>
          </div>
          <div className="lg:w-1/2 space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold text-dark font-heading mb-4">
              About Epacific
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              We are a team of passionate developers, designers, and strategists dedicated to helping businesses transform their digital presence. With years of experience and a commitment to excellence, we deliver solutions that matter.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Our mission is to empower organizations with scalable technology that drives efficiency and growth. We believe in transparency, collaboration, and continuous innovation.
            </p>
            <div className="grid grid-cols-2 gap-8 pt-4">
              <div>
                <h4 className="text-4xl font-bold text-primary mb-2 font-heading">10+</h4>
                <p className="text-gray-500 font-medium">Years Experience</p>
              </div>
              <div>
                <h4 className="text-4xl font-bold text-primary mb-2 font-heading">200+</h4>
                <p className="text-gray-500 font-medium">Projects Delivered</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
