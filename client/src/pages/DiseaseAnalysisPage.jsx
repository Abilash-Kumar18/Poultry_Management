import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Upload, ShieldAlert, Check, RotateCcw, AlertTriangle, 
  Video, VideoOff, Loader2, Sparkles, Activity, FileText, Plus 
} from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useLanguage } from '../hooks/useLanguage';
import { useFarmerMode } from '../hooks/useFarmerMode';
import farmerScanner from '../assets/farmer_scanner.png';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function DiseaseAnalysisPage() {
  const { t } = useLanguage();
  const { isFarmerMode } = useFarmerMode();
  const navigate = useNavigate();
  const { data: farmsData, loading: loadingFarms } = useFetch('/farms');
  
  // States
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload'
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogIndex, setScanLogIndex] = useState(0);
  const [diagnosis, setDiagnosis] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [affectedCount, setAffectedCount] = useState('1');
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false);
  
  // Media refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scanning simulation log text rotation
  useEffect(() => {
    let interval;
    if (isScanning) {
      interval = setInterval(() => {
        setScanLogIndex(prev => (prev + 1) % 4);
      }, 700);
    } else {
      setScanLogIndex(0);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  // Handle camera start/stop
  const startCamera = async () => {
    try {
      setCapturedImage(null);
      setDiagnosis(null);
      const constraints = { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      toast.success('Camera connected');
    } catch (err) {
      console.error('Camera access error:', err);
      toast.error(t('scanner.camera_error'));
      setActiveTab('upload');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Capture Image from Video Stream
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // File Upload Handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
        setDiagnosis(null);
        toast.success(t('scanner.file_selected'));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Trigger Scanning & Diagnostics Simulation
  const handleAnalyze = () => {
    if (!capturedImage) return;
    setIsScanning(true);
    setDiagnosis(null);

    // Mock high-fidelity realistic outcomes
    setTimeout(() => {
      setIsScanning(false);
      
      // Select disease database randomly
      const diseases = [
        {
          name: 'Newcastle Disease',
          severity: 'critical',
          confidence: 94.2,
          symptoms: ['Respiratory distress', 'Greenish watery diarrhea', 'Nervous twisting of head', 'Swelling around eyes'],
          recommendations: 'Quarantine the entire poultry house immediately. Restrict personnel entry. Notify local veterinary authorities.',
          actions: 'Administer electrolyte support, implement strict terminal disinfection of equipment, prepare for vaccination ring.'
        },
        {
          name: 'African Swine Fever',
          severity: 'critical',
          confidence: 91.5,
          symptoms: ['High fever', 'Loss of appetite', 'Hemoral red spots on ears/snout', 'Vomiting and diarrhea'],
          recommendations: 'Isolate affected pigs. Ban swine movements from farm premises immediately. Strictly sanitize footwear at entrance.',
          actions: 'Establish solid footbaths with glutaraldehyde-based disinfectants. Notify national emergency response department.'
        },
        {
          name: 'Foot-and-Mouth Disease',
          severity: 'high',
          confidence: 88.7,
          symptoms: ['Blisters on tongue/lips/snout', 'Severe lameness', 'Excessive sticky salivation', 'Sudden drop in lactation'],
          recommendations: 'Isolate infected cows/cattle. Place disinfectant vehicle mats at gates. Ban all raw dairy transportation.',
          actions: 'Clean lesions with mild antiseptics, quarantine feed stores, consult veterinarian regarding emergency trivalent vaccination.'
        },
        {
          name: 'Rice Blast (Magnaporthe oryzae)',
          severity: 'high',
          confidence: 89.4,
          symptoms: ['Spindle-shaped lesions on leaves', 'Ash-grey centers with brown borders', 'Rotten neck collar nodes', 'Grains fails to mature'],
          recommendations: 'Isolate affected crop quadrants. Regulate irrigation channels to prevent spore flows to healthy paddies.',
          actions: 'Apply systematic triazole fungicide spray. Adjust nitrogen fertilizer applications to minimize plant susceptibility.'
        }
      ];

      const selectedDisease = diseases[Math.floor(Math.random() * diseases.length)];
      setDiagnosis(selectedDisease);
      
      // Auto-set the first farm if available
      if (farmsData?.farms && farmsData.farms.length > 0) {
        setSelectedFarm(farmsData.farms[0].id);
      }
      
      toast.success('AI Diagnostics complete!');
    }, 3000);
  };

  // Log Outbreak Alert directly to Mongoose Backend
  const handleFileOutbreakAlert = async () => {
    if (!selectedFarm) {
      toast.error('Please select a farm to log the alert.');
      return;
    }
    setIsSubmittingAlert(true);
    try {
      const postData = {
        farm_id: selectedFarm,
        title: `AI Outbreak Scan: ${diagnosis.name}`,
        severity: diagnosis.severity,
        description: t('scanner.alert_description', { disease: diagnosis.name, confidence: diagnosis.confidence }),
        symptoms: diagnosis.symptoms.join(', '),
        actions: diagnosis.recommendations + ' ' + diagnosis.actions,
        affected_animals: parseInt(affectedCount) || 1
      };
      
      await api.post('/api/alerts', postData);
      toast.success(t('scanner.log_success'));
      navigate('/alerts');
    } catch (err) {
      console.error('File alert error:', err);
      toast.error(t('scanner.log_error'));
    } finally {
      setIsSubmittingAlert(false);
    }
  };

  // Reset Scanner
  const handleReset = () => {
    setCapturedImage(null);
    setDiagnosis(null);
    setCameraActive(false);
    stopCamera();
  };

  const logs = [
    t('scanner.scan_log_1'),
    t('scanner.scan_log_2'),
    t('scanner.scan_log_3'),
    t('scanner.scan_log_4')
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Styles for scanning laser animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes laser-sweep {
          0% { top: 0%; opacity: 0.1; }
          50% { top: 100%; opacity: 0.9; filter: drop-shadow(0 0 8px #10b981); }
          100% { top: 0%; opacity: 0.1; }
        }
        @keyframes pulse-frame {
          0%, 100% { border-color: rgba(16, 185, 129, 0.4); }
          50% { border-color: rgba(16, 185, 129, 1); filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.5)); }
        }
        .laser-line {
          height: 3px;
          background: linear-gradient(90deg, transparent, #10b981, transparent);
          position: absolute;
          left: 0;
          right: 0;
          z-index: 10;
          animation: laser-sweep 2s infinite ease-in-out;
        }
        .viewfinder-corners {
          position: absolute;
          inset: 15px;
          border: 2px solid transparent;
          animation: pulse-frame 3s infinite ease-in-out;
          pointer-events: none;
          z-index: 5;
        }
        .viewfinder-corners::before {
          content: '';
          position: absolute;
          top: -2px; left: -2px; width: 20px; height: 20px;
          border-top: 4px solid #10b981; border-left: 4px solid #10b981;
        }
        .viewfinder-corners::after {
          content: '';
          position: absolute;
          top: -2px; right: -2px; width: 20px; height: 20px;
          border-top: 4px solid #10b981; border-right: 4px solid #10b981;
        }
        .viewfinder-corners-bottom::before {
          content: '';
          position: absolute;
          bottom: -2px; left: -2px; width: 20px; height: 20px;
          border-bottom: 4px solid #10b981; border-left: 4px solid #10b981;
        }
        .viewfinder-corners-bottom::after {
          content: '';
          position: absolute;
          bottom: -2px; right: -2px; width: 20px; height: 20px;
          border-bottom: 4px solid #10b981; border-right: 4px solid #10b981;
        }
      `}} />

      {/* Visual Header Banner for Farmers */}
      {isFarmerMode && (
        <div className="relative rounded-2xl overflow-hidden mb-6 shadow-md border border-gray-200 dark:border-gray-800">
          <img src={farmerScanner} alt="Farmer Scanner Banner" className="w-full h-48 sm:h-56 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex flex-col justify-end p-6 text-white">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">{t('scanner.banner_title')}</h2>
            <p className="text-sm text-gray-200/90 max-w-lg">{t('scanner.banner_desc')}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('scanner.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
            {t('scanner.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Scanner Capture Area */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          <div className="card overflow-hidden relative">
            {/* Input Selection Tabs */}
            {!capturedImage && !isScanning && (
              <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-1 w-fit">
                <button
                  onClick={() => { stopCamera(); setActiveTab('camera'); }}
                  className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'camera' 
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <Camera size={16} />
                  {t('scanner.camera_mode')}
                </button>
                <button
                  onClick={() => { stopCamera(); setActiveTab('upload'); }}
                  className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'upload' 
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <Upload size={16} />
                  {t('scanner.upload_mode')}
                </button>
              </div>
            )}

            {/* Video Viewport / Capture Panel */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-950 border border-gray-200 dark:border-gray-800 flex items-center justify-center">
              {isScanning && (
                <>
                  <div className="laser-line" />
                  <div className="absolute inset-0 bg-black/40 z-10" />
                </>
              )}

              {/* TAB: Camera Capture */}
              {activeTab === 'camera' && !capturedImage && (
                <div className="w-full h-full flex flex-col items-center justify-center relative">
                  <video 
                    ref={videoRef} 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {cameraActive && (
                    <div className="viewfinder-corners">
                      <div className="viewfinder-corners-bottom w-full h-full" />
                    </div>
                  )}

                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                      <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center text-primary-500 animate-pulse">
                        <Video size={32} />
                      </div>
                      <p className="text-xs text-gray-400 max-w-xs">{t('scanner.allow_camera')}</p>
                      <button onClick={startCamera} className="btn-primary flex items-center gap-2 text-xs">
                        <Video size={14} />
                        {t('scanner.start_camera')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Upload File */}
              {activeTab === 'upload' && !capturedImage && (
                <div 
                  onClick={triggerFileSelect}
                  className="w-full h-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-2xl cursor-pointer hover:border-primary-500 transition-all text-center space-y-4 bg-gray-900/10 dark:bg-gray-900/30"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <div className="w-16 h-16 bg-gray-150 dark:bg-gray-800/80 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <Upload size={32} />
                  </div>
                  <div className="text-xs md:text-sm">
                    <span className="text-gray-500">{t('scanner.upload_prompt')} </span>
                    <span className="text-primary-500 font-semibold underline">{t('scanner.browse_files')}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">Supports JPG, PNG, WEBP (Max 5MB)</p>
                </div>
              )}

              {/* Image Preview (After Capturing or Uploading) */}
              {capturedImage && (
                <div className="w-full h-full relative">
                  <img 
                    src={capturedImage} 
                    alt="Scan target" 
                    className="w-full h-full object-cover"
                  />
                  {isScanning && (
                    <div className="viewfinder-corners">
                      <div className="viewfinder-corners-bottom w-full h-full" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                {capturedImage ? (
                  <button 
                    onClick={handleReset} 
                    disabled={isScanning}
                    className="btn-outline flex items-center gap-2 text-xs"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                ) : (
                  cameraActive && (
                    <button 
                      onClick={stopCamera} 
                      className="btn-outline flex items-center gap-2 text-xs text-red-500 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/10"
                    >
                      <VideoOff size={14} />
                      {t('scanner.stop_camera')}
                    </button>
                  )
                )}
              </div>

              <div>
                {capturedImage ? (
                  <button 
                    onClick={handleAnalyze} 
                    disabled={isScanning}
                    className="btn-primary flex items-center gap-2 text-xs shadow-lg shadow-primary-500/20 bg-gradient-to-r from-primary-500 to-emerald-600 border-transparent hover:shadow-primary-500/30"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {t('scanner.scanning_progress')}
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        {t('scanner.scan_now')}
                      </>
                    )}
                  </button>
                ) : (
                  activeTab === 'camera' && cameraActive && (
                    <button 
                      onClick={capturePhoto} 
                      className="btn-primary flex items-center gap-2 text-xs"
                    >
                      <Camera size={14} />
                      {t('scanner.capture_btn')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Scanning Progress Logs */}
            {isScanning && (
              <div className="absolute inset-x-0 bottom-0 bg-black/85 text-white py-3 px-4 flex items-center gap-3 animate-fade-in z-20">
                <Loader2 size={16} className="text-primary-500 animate-spin flex-shrink-0" />
                <span className="text-xs font-mono tracking-wide text-gray-300">{logs[scanLogIndex]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Reports and Database alert integration */}
        <div className="col-span-1 lg:col-span-5 space-y-6">
          {/* STATE A: Idle/Ready to scan info banner */}
          {!diagnosis && !isScanning && (
            <div className="card bg-gradient-to-br from-primary-500/10 via-secondary-500/5 to-transparent border border-primary-500/20 p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Ready for Diagnostics</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                Capture a close-up image of poultry lesions, pig snouts, crop leaves, or skin textures to run high-confidence disease classification reports.
              </p>
            </div>
          )}

          {/* STATE B: Scanner actively running */}
          {isScanning && (
            <div className="card border border-primary-500/30 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <Activity size={24} className="absolute inset-0 m-auto text-primary-500 animate-pulse" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">AI Classification Running</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                Running computer vision model filters against standard epidemiology databases...
              </p>
            </div>
          )}

          {/* STATE C: Diagnosis Report loaded */}
          {diagnosis && !isScanning && (
            <div className="space-y-6 animate-slide-up">
              {/* Diagnosis Details Card */}
              <div className="card border border-emerald-500/30 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-800 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <FileText size={18} />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {t('scanner.diagnostic_report')}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {t('scanner.pathogen')}
                    </span>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {diagnosis.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        {t('scanner.confidence')}
                      </span>
                      <p className="text-lg font-extrabold text-gray-900 dark:text-white mt-0.5">
                        {diagnosis.confidence}%
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        {t('scanner.severity')}
                      </span>
                      <div className="mt-1">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${
                          diagnosis.severity === 'critical' 
                            ? 'bg-red-150 text-red-700 bg-red-100 dark:bg-red-950/40 dark:text-red-400' 
                            : 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400'
                        }`}>
                          {diagnosis.severity === 'critical' ? t('scanner.severity_critical') : t('scanner.severity_high')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      {t('scanner.symptoms')}
                    </span>
                    <ul className="mt-1.5 space-y-1">
                      {diagnosis.symptoms.map((sym, index) => (
                        <li key={index} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                          <Check size={12} className="text-emerald-500 flex-shrink-0" />
                          {sym}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-yellow-700 dark:text-yellow-400 tracking-wider flex items-center gap-1.5">
                      <ShieldAlert size={12} />
                      {t('scanner.recommendations')}
                    </span>
                    <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1 leading-relaxed">
                      {diagnosis.recommendations}
                    </p>
                  </div>
                </div>
              </div>

              {/* Database Persist Outbreak Form Card */}
              <div className="card border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/60 shadow-lg">
                <div className="pb-4 border-b border-gray-200 dark:border-gray-800 mb-4">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                    {t('scanner.action_required')}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Log this outbreak alert in the portal database to alert staff and lock down biosecurity gates.
                  </p>
                </div>

                {loadingFarms ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 size={20} className="animate-spin text-primary-500" />
                  </div>
                ) : !farmsData?.farms || farmsData.farms.length === 0 ? (
                  <div className="p-4 border border-red-200 dark:border-red-950/40 bg-red-50/50 dark:bg-red-950/10 rounded-xl flex flex-col items-center text-center space-y-3">
                    <AlertTriangle className="text-red-500" size={24} />
                    <p className="text-xs text-red-800 dark:text-red-300 font-medium">
                      {t('scanner.no_farms_error')}
                    </p>
                    <button 
                      onClick={() => navigate('/farms')} 
                      className="btn-primary text-xs py-1.5 flex items-center gap-1.5"
                    >
                      <Plus size={12} />
                      Create Farm
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">
                        {t('scanner.select_farm')}
                      </label>
                      <select 
                        value={selectedFarm}
                        onChange={e => setSelectedFarm(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                      >
                        {farmsData.farms.map(farm => (
                          <option key={farm.id} value={farm.id}>
                            {farm.type === 'pig' ? '🐷' : farm.type === 'poultry' ? '🐔' : '🏡'} {farm.name} ({farm.location})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">
                        {t('scanner.affected_count')}
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        value={affectedCount}
                        onChange={e => setAffectedCount(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                      />
                    </div>

                    <button
                      onClick={handleFileOutbreakAlert}
                      disabled={isSubmittingAlert}
                      className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingAlert ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {t('scanner.outbreak_submitting')}
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={14} />
                          {t('scanner.outbreak_persist')}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
