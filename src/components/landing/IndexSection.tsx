import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";


const IndexSection = () => {
    const navigate = useNavigate();
  return (
    <section
      id="inicio"
      className="relative h-[620px] flex items-center justify-center text-white"
    >
      <div className="absolute inset-0 bg-black opacity-70 z-10"></div>
      <div className="absolute inset-0 bg-[url('assets/landing-background.webp?height=500&width=1000&text=Finca+Villa+Luz')] bg-cover bg-center"></div>
      <div className="relative z-10 text-center px-4">
        <h2 className="text-4xl font-bold mb-4">
          Sistema de Gestión Finca Villa Luz
        </h2>
        <p className="text-xl mb-8">
          Optimizando la administración y producción agrícola
        </p>
        <Button className="bg-green-600 text-lg hover:bg-green-700" onClick={() => navigate("/login")}>
          Ingresar al Sistema <ChevronRight className="ml-2" />
        </Button>
      </div>
    </section>
  );
};

export default IndexSection;