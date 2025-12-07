import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, CreditCard, Loader2, ExternalLink, Maximize2, Minimize2, Receipt, Wallet } from 'lucide-react';

interface BillingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to extract ID from Drive URL and convert to direct link
const getDirectImageSrc = (url: string) => {
  try {
    // Extract ID between /d/ and /view
    const match = url.match(/\/d\/(.+?)\//);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
  } catch (e) {
    return url;
  }
};

const BILLING_STEPS = [
  { title: "Acceder a la Consola", desc: "Ingresa a la consola de Google Cloud. Confirma que el nombre del proyecto sea el correcto. En este ejemplo 'conexion-tester-suite'.", imgUrl: "https://drive.google.com/file/d/1O81IQu_27o8aDhHs41onOzrBicd1jAmA/view?usp=drive_link" },
  { title: "Ubicar el Buscador", desc: "Dirígete a la parte superior de la ventana y localiza la barra de búsqueda 'Buscar recursos, documentos...'.", imgUrl: "https://drive.google.com/file/d/1xvmaTYjGRZh8f1B8Hzd7HAoJrVKdnQ5P/view?usp=drive_link" },
  { title: "Activar Búsqueda", desc: "Haz clic en la barra para desplegar el menú de interacción con el asistente y el historial.", imgUrl: "https://drive.google.com/file/d/1bsyVcHg0CoGV6h80FKnqrMXmft0I9U1d/view?usp=drive_link" },
  { title: "Seleccionar Proyecto", desc: "Escribe el nombre del proyecto (ej. 'conexion-tester-suite') y selecciona el resultado coincidente en la lista.", imgUrl: "https://drive.google.com/file/d/1vDZ1l74Ggaz0HfDTAlfrd8msmlrhjYce/view?usp=drive_link" },
  { title: "Confirmar Proyecto Activo", desc: "Verifica que el nombre de tu proyecto aparezca resaltado en la sección 'Estás trabajando en...' para asegurarte de configurar el entorno correcto.", imgUrl: "https://drive.google.com/file/d/1lRseOpmjW2YwRmNCvQsNjMGxT2f_wgfS/view?usp=drive_link" },
  { title: "Ir a Facturación", desc: "En la sección de 'Acceso rápido' del panel principal, haz clic en la tarjeta 'Facturación'.", imgUrl: "https://drive.google.com/file/d/1rmq4qysA1GjukN-YlDo_cU6wmoset3Xd/view?usp=drive_link" },
  { title: "Administrar Cuentas", desc: "Si ves el mensaje 'Este proyecto no tiene cuenta de facturación', haz clic en el botón 'Administrar cuentas de facturación'.", imgUrl: "https://drive.google.com/file/d/1b3mgq-s0A77SrsvTc3maSkRh-YJsinfw/view?usp=drive_link" },
  { title: "Crear Nueva Cuenta", desc: "En la pantalla de administración, haz clic en el botón '+ Crear cuenta' ubicado en la parte superior izquierda.", imgUrl: "https://drive.google.com/file/d/17NwByTbeCw7F8GHLqzbPEcPKrHRqT-Ec/view?usp=drive_link" },
  { title: "Verificar País", desc: "Asegúrate de que el país seleccionado corresponda a tu ubicación fiscal (ej. México) en el primer campo del formulario.", imgUrl: "https://drive.google.com/file/d/1MDVYhbxrDVwSbZPwLL29FAMdS8u0evnN/view?usp=drive_link" },
  { title: "Nombrar Cuenta", desc: "Asigna un nombre descriptivo a la cuenta de facturación siguiendo el formato: Tester - [Banco/Tarjeta] - [Año].", imgUrl: "https://drive.google.com/file/d/1L-wRyZxAiEObE2JmGV23IZrHx2sfUyCT/view?usp=drive_link" },
  { title: "Continuar", desc: "Una vez llenados los datos básicos, haz clic en el botón azul 'Continuar'.", imgUrl: "https://drive.google.com/file/d/1om_oY9T6EwdiDn7XLLGbi8205Fl4Bxva/view?usp=drive_link" },
  { title: "Perfil de Pagos", desc: "Revisa la sección 'Información del cliente' para confirmar que tu tipo de cuenta y dirección fiscal sean correctos.", imgUrl: "https://drive.google.com/file/d/1SuhpyFcq7WCMm1SKCHgTCtB4N7cgrVfh/view?usp=drive_link" },
  { title: "Habilitar Facturación", desc: "Verifica el método de pago y haz clic en 'Enviar y habilitar la facturación' al final del formulario.", imgUrl: "https://drive.google.com/file/d/1n8w4KbBULTsRHILE8w8ji4eYd9_BzP7J/view?usp=drive_link" },
  { title: "Menú de Presupuestos", desc: "Ya dentro del panel de facturación, localiza y selecciona 'Presupuestos y alertas' en el menú lateral izquierdo.", imgUrl: "https://drive.google.com/file/d/1VkUE2XBHu3HLp8TwgsQkOz0umqJlaUAp/view?usp=drive_link" },
  { title: "Nuevo Presupuesto", desc: "Haz clic en el botón 'Crear presupuesto' ubicado en la parte superior de la zona de trabajo.", imgUrl: "https://drive.google.com/file/d/18LTofClbczPwDnOsJMHeG-juwTDq4nvW/view?usp=drive_link" },
  { title: "Definir Alcance", desc: "Asigna un nombre al presupuesto y configura el intervalo (ej. Mensual) y los proyectos a monitorear en la sección 'Alcance'.", imgUrl: "https://drive.google.com/file/d/1FNEGfegxpE3PD3BhLR7J_R_DgWNkrUCt/view?usp=drive_link" },
  { title: "Nombrar Presupuesto", desc: "Escribe un nombre claro (ej. 'Tester - Alerta 50 MXN') y marca la casilla 'Solo lectura' para proteger la configuración.", imgUrl: "https://drive.google.com/file/d/1nJVZecpLD1D-VyZtQ3kla6mQ1s3p5uYF/view?usp=drive_link" },
  { title: "Confirmar Alcance", desc: "Mantén seleccionados los programas de ahorro y descuentos predeterminados, luego haz clic en el botón 'Siguiente'.", imgUrl: "https://drive.google.com/file/d/1-hjR1uG3I0E12vgSQZtkK5Vx8R0g1Jvk/view?usp=drive_link" },
  { title: "Tipo de Importe", desc: "En la sección 'Importe', asegúrate de seleccionar 'Importe especificado' en la lista desplegable.", imgUrl: "https://drive.google.com/file/d/103mp4uOs5gDo9piGecR45u-k81c-RsL4/view?usp=drive_link" },
  { title: "Establecer Límite", desc: "Ingresa la cantidad máxima mensual que deseas monitorear (ej. $50) en el campo 'Importe objetivo'.", imgUrl: "https://drive.google.com/file/d/1RaU1CjLOq5dkMbAPV-x7b5VOfwUf_l-U/view?usp=drive_link" },
  { title: "Validar Importe", desc: "Una vez ingresada la cantidad, haz clic en 'Siguiente' para pasar a la configuración de notificaciones.", imgUrl: "https://drive.google.com/file/d/1OLiNj1Ndo5fgGxv3YOvx9SA1c0UHwhU3/view?usp=drive_link" },
  { title: "Reglas de Alerta", desc: "Revisa los umbrales sugeridos (50%, 90%, 100%). El sistema te enviará correos cuando tu gasto alcance estos porcentajes de tu presupuesto.", imgUrl: "https://drive.google.com/file/d/1_XM-GP161yylSEU8-sEgnPc6p_bZi_Zk/view?usp=drive_link" },
  { title: "Finalizar Configuración", desc: "Asegúrate de marcar la casilla 'Alertas por correo electrónico...' para recibir los avisos y haz clic en 'Finalizar'.", imgUrl: "https://drive.google.com/file/d/1_XM-GP161yylSEU8-sEgnPc6p_bZi_Zk/view?usp=drive_link" },
  { title: "Verificar Vinculación", desc: "Si al regresar a la vista principal ves el mensaje 'Este proyecto no tiene cuenta de facturación', significa que debemos asociarla manualmente.", imgUrl: "https://drive.google.com/file/d/1_MGMJvJ_p4cS8xYr296lK-KzkpTllt-P/view?usp=drive_link" },
  { title: "Iniciar Enlace", desc: "Haz clic en el botón 'Vincular una cuenta de facturación'.", imgUrl: "https://drive.google.com/file/d/1JDoU96wl0VBIotjhiSPtzIAoDbOmu4JN/view?usp=drive_link" },
  { title: "Seleccionar Cuenta", desc: "Se abrirá una ventana emergente. Despliega la lista y selecciona la cuenta que creamos anteriormente (ej. Tester - [Banco]...).", imgUrl: "https://drive.google.com/file/d/1PNtDDPbNP-QIRu1oSv3d6RTiujfUzJO8/view?usp=drive_link" },
  { title: "Confirmar", desc: "Una vez seleccionada la cuenta correcta, haz clic en el botón azul 'Establecer cuenta'.", imgUrl: "https://drive.google.com/file/d/1ucNOLJzfhB5vOnt7b23x2B6t7UMY0Ebt/view?usp=drive_link" },
  { title: "Proceso Completado", desc: "¡Felicidades! Ahora verás el panel general de facturación activo. Tu proyecto está completamente configurado y listo para consumir las APIs.", imgUrl: "https://drive.google.com/file/d/1_EaeVP1BRqy-UyBpNzXz3cvn9I2fH8RM/view?usp=drive_link" },
];

const StepImage = ({ url, alt, isFullscreen }: { url: string, alt: string, isFullscreen: boolean }) => {
  const [loaded, setLoaded] = useState(false);
  const directSrc = getDirectImageSrc(url);

  return (
    <div className={`relative w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center transition-all duration-300 ${
      isFullscreen ? 'h-full' : 'h-64 md:h-96'
    }`}>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <span className="text-xs">Cargando imagen...</span>
        </div>
      )}
      <img 
        src={directSrc} 
        alt={alt}
        className={`w-full h-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          // Fallback if LH3 link fails, try original
          if (e.currentTarget.src !== url) {
             e.currentTarget.src = url;
          }
        }}
      />
    </div>
  );
};

export const BillingWizard: React.FC<BillingWizardProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen) return null;

  const nextStep = () => {
    if (currentStep < BILLING_STEPS.length - 1) setCurrentStep(prev => prev + 1);
    else onClose();
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const stepData = BILLING_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className={`bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 w-full h-full rounded-none z-[110]' 
          : 'rounded-xl w-full max-w-4xl max-h-[90vh]'
      }`}>
        
        {/* Header */}
        <div className="border-b border-slate-100 bg-white shrink-0">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <Receipt size={20} className="text-blue-500" />
                Configuración de Facturación
              </h2>
              
              <a 
                href="https://console.cloud.google.com/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
              >
                Ir a Google Cloud Console <ExternalLink size={12} />
              </a>
            </div>

            <div className="flex items-center gap-2">
               <a 
                href="https://console.cloud.google.com/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="sm:hidden p-2 text-blue-600 hover:bg-blue-50 rounded-full"
              >
                <ExternalLink size={20} />
              </a>
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors hidden sm:block"
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-100 shrink-0">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / BILLING_STEPS.length) * 100}%` }}
          ></div>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50 flex flex-col">
          <div className="mb-4 text-center md:text-left shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Paso {currentStep + 1} de {BILLING_STEPS.length}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">{stepData.title}</h3>
                <p className="text-slate-600 text-sm">{stepData.desc}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-center">
             <StepImage url={stepData.imgUrl} alt={stepData.title} isFullscreen={isFullscreen} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
          <button 
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentStep === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ChevronLeft size={18} /> Anterior
          </button>

          <span className="text-xs text-slate-400 hidden sm:block">
            {currentStep + 1} / {BILLING_STEPS.length}
          </span>

          <button 
            onClick={nextStep}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-200/50 transition-all transform hover:-translate-y-0.5"
          >
            {currentStep === BILLING_STEPS.length - 1 ? 'Finalizar' : 'Siguiente'} 
            {currentStep !== BILLING_STEPS.length - 1 && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};