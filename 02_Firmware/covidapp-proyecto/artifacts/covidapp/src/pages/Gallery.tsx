import { Card } from "@/components/ui/card";

export default function Gallery() {
  const images = [
    {
      url: "https://elquindiano.com/wp-content/uploads/2018/04/b201804100959477.jpg",
      title: "COVIDA - Fundación",
      source: "Fuente: El Quindiano",
    },
    {
      url: "https://archivo.cronicadelquindio.com/files/noticias/20140623063324.jpg",
      title: "Servicios de Rehabilitación",
      source: "Fuente: La Crónica del Quindío",
    },
    {
      url: "https://elquindiano.com/wp-content/uploads/2025/03/COVIDA-la-fundacion-que-en-Armenia-contribuye-a-superar-barreras-fisicas-de-los-ninos-tambien-trabaja-para-la-comunidad-de-su-entorno.jpg",
      title: "COVIDA y la Comunidad",
      source: "Fuente: El Quindiano",
    },
    {
      url: `${import.meta.env.BASE_URL}images/gallery-1.png`,
      title: "Terapia Física",
      source: "COVIDAPP",
    },
    {
      url: `${import.meta.env.BASE_URL}images/gallery-2.png`,
      title: "Terapia Ocupacional",
      source: "COVIDAPP",
    },
    {
      url: `${import.meta.env.BASE_URL}images/gallery-3.png`,
      title: "Atención Especializada",
      source: "COVIDAPP",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-4xl font-black font-display text-foreground mb-4">Galería de Imágenes</h1>
        <p className="text-lg text-muted-foreground">
          Conoce nuestra fundación y los espacios donde la rehabilitación hace posible una mejor calidad de vida.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((img, idx) => (
          <Card key={idx} className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-border/50">
            <div className="relative overflow-hidden" style={{ height: 200 }}>
              <img
                src={img.url}
                alt={img.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}images/gallery-1.png`;
                }}
              />
            </div>
            <div className="p-4 bg-background">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{img.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{img.source}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-12 bg-primary/5 rounded-3xl p-8 text-center border border-primary/10">
        <h2 className="text-2xl font-bold font-display mb-3">¿Quieres conocer más?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Te invitamos a visitarnos en Armenia, Colombia. Nuestro equipo estará feliz de atenderte.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center text-sm text-primary font-medium">
          <a href="tel:+573011234567" className="hover:underline">📞 +57 301 123 4567</a>
          <span className="hidden sm:inline text-muted-foreground">|</span>
          <a href="mailto:contacto@covida.edu.co" className="hover:underline">✉️ contacto@covida.edu.co</a>
        </div>
      </div>
    </div>
  );
}
