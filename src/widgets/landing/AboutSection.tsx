const AboutSection = () => (
  <section id="informacion" className="py-16 flex h-auto bg-green-50">
    <div className="container m-auto">
      <h2 className="text-3xl font-bold text-center mb-12">
        Sobre la Finca Villa Luz
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 p-6 lg:px-24 items-center justify-center">
        <div className="text-justify">
          <p className="mb-4">
            La Finca Villa Luz es una unidad productiva perteneciente al
            Servicio Nacional de Aprendizaje (SENA) en Colombia. Nuestro
            objetivo es proporcionar un espacio de aprendizaje práctico para los
            estudiantes de programas agrícolas y servir como modelo de gestión
            eficiente para pequeños y medianos productores.
          </p>
          <p>
            Con nuestro sistema de gestión, buscamos optimizar todos los
            procesos relacionados con la administración de la finca, desde la
            planificación de cultivos hasta la comercialización de productos,
            garantizando la sostenibilidad y la eficiencia en todas nuestras
            operaciones.
          </p>
        </div>
        <div className="flex justify-center w-full">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3968.2816693846635!2d-73.64989558982238!3d5.95587679400385!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e41e59b0bca46a1%3A0xaa1e3138e91a30a!2sFinca%20villa%20luz%20(Sena)!5e0!3m2!1ses!2sco!4v1725830335251!5m2!1ses!2sco"
            width="100%"
            height="250"
            className="rounded-xl border-0"
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </div>
  </section>
);

export default AboutSection;