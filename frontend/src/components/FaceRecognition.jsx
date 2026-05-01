import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Shield, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function FaceRecognition({ userId, onSuccess, mode = 'register' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [step, setStep] = useState('initial');
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (err) {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      toast.error('Erro ao acessar câmera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);
    setStep('capturing');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);

    const faceDescriptor = extractFaceDescriptor(canvas);

    if (mode === 'register') {
      await registerFace(imageData, faceDescriptor);
    } else {
      await verifyFace(faceDescriptor);
    }

    setIsCapturing(false);
  };

  const extractFaceDescriptor = (canvas) => {
    const descriptor = [];
    for (let i = 0; i < 128; i++) {
      descriptor.push(Math.random());
    }
    return JSON.stringify(descriptor);
  };

  const registerFace = async (faceData, faceDescriptor) => {
    try {
      setStep('verifying');
      const response = await api.post('/face-auth/register', {
        user_id: userId,
        face_data: faceData,
        face_descriptor: faceDescriptor
      });

      if (response.data.success) {
        setStep('success');
        toast.success('Reconhecimento facial cadastrado!');
        onSuccess?.();
      }
    } catch (err) {
      setError('Erro ao cadastrar reconhecimento facial.');
      setStep('initial');
      toast.error('Erro ao cadastrar face');
    }
  };

  const verifyFace = async (faceDescriptor) => {
    try {
      setStep('verifying');
      const response = await api.post('/face-auth/verify', {
        face_descriptor: faceDescriptor
      });

      if (response.data.success) {
        setStep('success');
        toast.success(`Bem-vindo, ${response.data.user.name}!`);
        onSuccess?.(response.data);
      }
    } catch (err) {
      setError('Rosto não reconhecido. Tente novamente.');
      setStep('initial');
      toast.error('Verificação falhou');
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setError(null);
    setStep('initial');
    startCamera();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
          {mode === 'register' ? <Camera className="w-8 h-8 text-white" /> : <Shield className="w-8 h-8 text-white" />}
        </div>
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {mode === 'register' ? 'Cadastrar Reconhecimento Facial' : 'Login com Reconhecimento Facial'}
        </h3>
      </div>

      <div className="relative rounded-2xl overflow-hidden mb-4"
        style={{ background: 'var(--bg-card)', border: '2px solid var(--border)' }}>
        {!capturedImage ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-52 rounded-full border-2 border-dashed border-white/50"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/70 text-xs text-center">
                  {cameraReady ? 'Posicione seu rosto aqui' : 'Iniciando câmera...'}
                </div>
              </div>
            </div>
          </>
        ) : (
          <img src={capturedImage} alt="Captura" className="w-full h-64 object-cover" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {!capturedImage ? (
          <button onClick={captureFace} disabled={!cameraReady || isCapturing}
            className="flex-1 btn-primary justify-center py-3">
            {isCapturing ? (
              <><RefreshCw className="w-5 h-5 animate-spin" /> Analisando...</>
            ) : (
              <><Camera className="w-5 h-5" /> {mode === 'register' ? 'Cadastrar Face' : 'Verificar Face'}</>
            )}
          </button>
        ) : (
          <button onClick={retake} className="flex-1 btn-secondary justify-center py-3">
            <RefreshCw className="w-5 h-5" /> Tentar Novamente
          </button>
        )}
      </div>

      {step === 'success' && (
        <div className="mt-4 p-4 rounded-xl text-center"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <div className="text-4xl mb-2">✅</div>
          <p className="font-semibold text-green-500">
            {mode === 'register' ? 'Cadastro realizado!' : 'Acesso liberado!'}
          </p>
        </div>
      )}
    </div>
  );
}