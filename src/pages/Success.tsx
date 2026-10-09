import { CheckCircle, Info } from 'lucide-react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

const SuccessPage = () => {
  useEffect(() => {
    // Scroll to top on load
    window.scrollTo(0, 0);

    // Prevent back button
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-white flex flex-col items-center justify-center p-4"
    >
      <Helmet>
        <title>Solicitação Enviada - Saldo Já</title>
        <meta name="description" content="Sua solicitação de conversão de vale-refeição foi enviada com sucesso. Aguarde nosso processamento." />
      </Helmet>
      <div className="max-w-md w-full text-center space-y-8">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle className="w-14 h-14 text-emerald-600" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-black text-emerald-950 tracking-tight">
            Solicitação Enviada com Sucesso!
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Sua solicitação de conversão foi recebida e está sendo processada pelo nosso sistema.
          </p>
        </div>

        <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100 shadow-sm text-left space-y-4">
          <div className="flex items-center gap-3 text-emerald-900 font-bold text-xl">
            <Info className="w-6 h-6" />
            <span>Próximos passos:</span>
          </div>
          <div className="space-y-3 text-emerald-800">
            <p className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">•</span>
              Nossa equipe analisará os dados fornecidos.
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">•</span>
              Você receberá uma confirmação no seu e-mail cadastrado.
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">•</span>
              O prazo médio de processamento é de até 24 horas úteis.
            </p>
          </div>
        </div>

        <div className="pt-8">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <div className="h-px w-8 bg-gray-200" />
            <span>Ambiente Seguro & Criptografado</span>
            <div className="h-px w-8 bg-gray-200" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SuccessPage;
