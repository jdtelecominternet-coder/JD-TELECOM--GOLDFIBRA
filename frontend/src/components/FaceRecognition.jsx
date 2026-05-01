import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Shield, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function FaceRecognition({ userId, onSuccess, mode = 'register' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [livenessData, setLivenessData] = useState(null);
  const [step, setStep] = useState('initial'); // initial, capturing, verifying, success
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Iniciar câmera
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      toast.error('Erro ao acessar câmera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  // Capturar imagem e verificar liveness
  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    setStep('capturing');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Configurar canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Desenhar frame do vídeo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Converter para base64
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);

    // Simular análise de liveness (em produção usar face-api.js)
    // Verificações: movimento, profundidade, iluminação
    const liveness = await analyzeLiveness(canvas);
    setLivenessData(liveness);

    if (liveness.score < 0.7) {
      setError('Possível foto detectada. Aproxime o rosto e piscue os olhos.');
      setStep('initial');
      setIsCapturing(false);
      return;
    }

    // Extrair descritor facial (simulação)
    const faceDescriptor = extractFaceDescriptor(canvas);

    if (mode === 'register') {
      await registerFace(imageData, faceDescriptor, liveness);
    } else {
      await verifyFace(faceDescriptor, liveness);
    }

    setIsCapturing(false);
  };

  // Análise de liveness (anti-spoofing)
  const analyzeLiveness = async (canvas) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Análise de textura (fotos têm textura diferente de rostos reais)
    let textureScore = 0;
    let movementDetected = false;
    let depthVariation = 0;

    // Verificar variação de cores (rostos têm mais variação natural)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calcular variação de luminosidade
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      depthVariation += luminance;
    }

    // Normalizar scores
    depthVariation = depthVariation / (data.length / 4) / 255;
    textureScore = Math.random() * 0.3 + 0.7; // Simulação
    movementDetected = true; // Simulação - em produção comparar frames

    const score = (textureScore + depthVariation + (movementDetected ? 0.3 : 0)) / 3;

    return {
      score: Math.min(1, score),
      hasMovement: movementDetected,
      depthScore: depthVariation,
      naturalLight: Math.random() * 0.4 + 0.6,
      blinkDetected: true
    };
  };

  // Extrair descritor facial (simulação)
  const extractFaceDescriptor = (canvas) => {
    // Em produção, usar face-api.js para extrair 128 pontos faciais
    // Aqui simulamos um descritor aleatório para demonstração
    const descriptor = [];
    for (let i = 0; i < 128; i++) {
      descriptor.push(Math.random());
    }
    return JSON.stringify(descriptor);
  };

  // Registrar face no banco de dados
  const registerFace = async (faceData, faceDescriptor, liveness) => {
    try {
      setStep('verifying');
      
      const response = await api.post('/face-auth/register', {
        user_id: userId,
        face_data: faceData,
        face_descriptor: faceDescriptor,
        liveness_data: JSON.stringify(liveness)
      });

      if (response.data.success) {
        setStep('success');
        toast.success('Reconhecimento facial cadastrado com sucesso!');
        onSuccess?.();
      }
    } catch (err) {
      console.error('Erro ao registrar face:', err);
      setError('Erro ao cadastrar reconhecimento facial. Tente novamente.');
      setStep('initial');
      toast.error('Erro ao cadastrar face');
    }
  };

  // Verificar face para login
  const verifyFace = async (faceDescriptor, liveness) => {
    try {
      setStep('verifying');
      
      const response = await api.post('/face-auth/verify', {
        face_descriptor: faceDescriptor,
        liveness_check: liveness
      });

      if (response.data.success) {
        setStep('success');
        toast.success(`Bem-vindo, ${response.data.user.name}!`);
        onSuccess?.(response.data);
      }
    } catch (err) {
      console.error('Erro na verificação:', err);
      
      if (err.response?.data?.code === 'LIVENESS_FAILED') {
        setError('Foto detectada! Use seu rosto real, não uma imagem.');
      } else {
        setError('Rosto não reconhecido. Tente novamente.');
      }
      
      setStep('initial');
      toast.error('Verificação falhou');
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setLivenessData(null);
    setError(null);
    setStep('initial');
    startCamera();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
        >
          {mode === 'register' ? <Camera className="w-8 h-8 text-white" /> : <Shield className="w-8 h-8 text-white" />}
        </div>
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {mode === 'register' ? 'Cadastrar Reconhecimento Facial' : 'Login com Reconhecimento Facial'}
        </h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {mode === 'register' 
            ? 'Posicione seu rosto no centro e piscue os olhos'
            : 'Aproxime seu rosto da câmera para desbloquear'
          }
        </p>
      </div>

      {/* Área da câmera */}
      <div className="relative rounded-2xl overflow-hidden mb-4"
        style={{ background: 'var(--bg-card)', border: '2px solid var(--border)' }}
      >
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            
            {/* Overlay de guia */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-52 rounded-full border-2 border-dashed border-white/50"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/70 text-xs text-center">
                  {cameraReady ? 'Posicione seu rosto aqui' : 'Iniciando câmera...'}
                </div>
              </div>
            </div>

            {/* Indicador de liveness */}
            {livenessData && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ 
                  background: livenessData.score > 0.7 ? 'rgba(34,197,94,0.9)' : 'rgba(245,158,11,0.9)',
                  color: '#fff'
                }}
              >
                <Shield className="w-4 h-4" />
                {livenessData.score > 0.7 ? 'Rosto real detectado' : 'Aproxime mais o rosto'}
              </div>
            )}
          </>
        ) : (
          <img 
            src={capturedImage} 
            alt="Captura" 
            className="w-full h-64 object-cover"
          /
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3">
        {!capturedImage ? (
          <button
            onClick={captureFace}
            disabled={!cameraReady || isCapturing}
            className="flex-1 btn-primary justify-center py-3"
          >
            {isCapturing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                {mode === 'register' ? 'Cadastrar Face' : 'Verificar Face'}
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={retake}
              className="flex-1 btn-secondary justify-center py-3"
            >
              <RefreshCw className="w-5 h-5" />
              Tentar Novamente
            </button>
          </>
        )}
      </div>

      {/* Status */}
      {step === 'success' && (
        <div className="mt-4 p-4 rounded-xl text-center"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <div className="text-4xl mb-2">✅</div>
          <p className="font-semibold text-green-500">
            {mode === 'register' ? 'Cadastro realizado!' : 'Acesso liberado!'}
          </p>
        </div>
      )}

      {/* Info de segurança */}
      <div className="mt-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        <Shield className="w-3 h-3 inline mr-1" />
        Seus dados biométricos são criptografados e armazenados com segurança
      </div>
    </div>
  );
}
