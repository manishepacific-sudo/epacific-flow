import Carousel from "./Carousel";

export default function Hero() {
  const slides = [
    { src: "/hero/slide1.svg", alt: "Innovating the Future" },
    { src: "/hero/slide2.svg", alt: "Scalable Solutions" },
    { src: "/hero/slide3.svg", alt: "Expert Team" },
  ];

  return (
    <section id="hero" className="relative w-full h-[600px] lg:h-[800px] bg-dark overflow-hidden">
      <Carousel images={slides} />
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <div className="container mx-auto px-4 py-16 lg:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading animate-slide-up drop-shadow-lg">
            Welcome to Epacific
          </h1>
          <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto animate-fade-in opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms] drop-shadow-md">
            We deliver cutting-edge technology solutions to drive your business forward.
          </p>
          <a
            href="#contact"
            className="pointer-events-auto inline-block bg-accent hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg animate-scale-in opacity-0 [animation-fill-mode:forwards] [animation-delay:400ms]"
          >
            Get Started
          </a>
        </div>
      </div>
    </section>
  );
}
