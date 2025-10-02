// src/data.ts

import landingimg1 from "@/assets/landingimg1.jpg";
import landingimg2 from "@/assets/landingimg2.jpg";
import landingimg3 from "@/assets/landingimg3.jpg";
import landingimg4 from "@/assets/landingimg4.jpg";
import landingimg5 from "@/assets/landingimg5.webp";
import landingimg6 from "@/assets/landingimg6.webp";
import { GiField } from "react-icons/gi";
import { FaUsersCog, FaCalendarAlt } from "react-icons/fa";
import { FaFileContract } from "react-icons/fa6";
import { MdOutlineHealing } from "react-icons/md";
import { IoNewspaperSharp } from "react-icons/io5";

// Datos de características (features)
export const features = [
  {
    title: "Control de Animales",
    icon: FaFileContract,
    description: "Registro de animales enfermos, mejoras geneticas y gestion de razas y especies",
  },
  {
    title: "Administración de Usuarios",
    icon: FaUsersCog,
    description: "Gestion de todos los usuarios del sistema con roles específicos",
  },
  {
    title: "Administracion de Terrenos",
    icon: GiField,
    description: "Control y gestion de los terrenos, manejo de pastoreo de animales y modulo para siembras",
  },
  {
    title: "Módulo de Sanidad",
    icon: MdOutlineHealing,
    description: "Control de las enfermedades, registro de medicamentos, vacunas y tratamientos",
  },
  {
    title: "Vacunación Programada",
    icon: FaCalendarAlt,
    description: "Planificación y gestion de las vacunaciones del ganado",
  },
  {
    title: "Analisis de producción",
    icon: IoNewspaperSharp,
    description: "Control y visualizacion de de las estadisticas de toda la base de datos",
  },
];

// Imágenes para la galería
export const images = [
  landingimg1,
  landingimg2,
  landingimg3,
  landingimg4,
  landingimg5,
  landingimg6,
];