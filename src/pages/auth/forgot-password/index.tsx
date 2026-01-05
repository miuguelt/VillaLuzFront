import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useState } from "react";
import { recoverAccount } from '@/features/auth/api/auth.service';
import { FaUser, FaCheckCircle, FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import { ClimbingBoxLoader } from "react-spinners";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";

const ForgotPassword = () => {
    const [identifier, setIdentifier] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const resolveErrorMessage = (err: any): string => {
        const raw =
            err?.message ||
            err?.response?.data?.message ||
            err?.response?.data?.detail ||
            err?.response?.data?.error;
        const message = typeof raw === "string" ? raw : "";
        const normalized = message.toLowerCase();
        if (normalized.includes("token") && (normalized.includes("ausente") || normalized.includes("missing"))) {
            return "No pudimos validar la solicitud. Recarga la pagina e intenta de nuevo.";
        }
        if (normalized.includes("csrf")) {
            return "No pudimos validar la solicitud. Recarga la pagina e intenta de nuevo.";
        }
        return message || "Ocurrio un error al procesar tu solicitud. Intentalo de nuevo.";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!identifier.trim()) {
            setError("El correo o numero de identificacion es obligatorio.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await recoverAccount(identifier.trim());
            const expiresIn = response?.expires_in ? ` Vencimiento aprox.: ${(response.expires_in / 60).toFixed(0)} min.` : "";
            const emailHint = response?.email_hint ? ` Enviamos un correo a ${response.email_hint}.` : "";
            setSuccessMessage(response?.message || `Si tus datos existen en el sistema, te enviamos instrucciones para restablecer tu contrasena.${emailHint}${expiresIn}`);
        } catch (err: any) {
            setError(resolveErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-[100dvh] overflow-y-auto bg-gradient-to-br from-green-50 to-green-100 p-4">
            {loading ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
                    <ClimbingBoxLoader color="#10B981" loading={loading} size={15} />
                </div>
            ) : (
                <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl">
                    <div className="flex items-center justify-between">
                        <Link to="/login" className="text-green-600 hover:text-green-700 flex items-center gap-2 text-sm font-medium">
                            <FaArrowLeft /> Volver al login
                        </Link>
                    </div>

                    <h2 className="text-3xl font-bold text-center text-green-700">
                        Recuperar contraseña
                    </h2>

                    {successMessage ? (
                        <Alert className="bg-green-50 border-green-200">
                            <FaCheckCircle className="h-5 w-5 text-green-600" />
                            <AlertTitle className="text-green-800 font-medium">¡Solicitud enviada!</AlertTitle>
                            <AlertDescription className="text-green-700">
                                {successMessage}
                            </AlertDescription>
                            <div className="mt-4">
                                <Link to="/login">
                                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                                        Regresar al Inicio de Sesión
                                    </Button>
                                </Link>
                            </div>
                        </Alert>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate className="space-y-6">
                            <p className="text-gray-600 text-center text-sm">
                                Ingresa tu correo o número de identificación y te enviaremos instrucciones para recuperar el acceso a tu cuenta.
                            </p>

                            <div className="space-y-2">
                                <Label htmlFor="identifier" className="text-green-700">
                                    Correo o identificación
                                </Label>
                                <div className="relative">
                                    <span className="absolute text-gray-600 inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaUser />
                                    </span>
                                    <Input
                                        id="identifier"
                                        type="text"
                                        inputMode="text"
                                        placeholder="Ingresa tu correo o identificación"
                                        value={identifier}
                                        onChange={(e) => {
                                            setIdentifier(e.target.value);
                                            setError(null);
                                        }}
                                        className={`w-full px-10 py-2 border ${error ? 'border-red-400 focus:ring-red-400' : 'border-green-300 focus:ring-green-500'} rounded-md focus:outline-none focus:ring-1`}
                                    />
                                </div>
                                {error && (
                                    <div
                                        role="alert"
                                        className="relative mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="absolute -top-2 left-4 h-3 w-3 rotate-45 border-l border-t border-red-200 bg-red-50"
                                        />
                                        {error}
                                    </div>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 focus:ring-green-500 focus:ring-offset-green-200 text-white transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Enviar instrucciones
                            </Button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default ForgotPassword;
