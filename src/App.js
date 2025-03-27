import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

function App() {
  const [formData, setFormData] = useState({
    ARRIVO: '',
    DESTINAZIONE: '',
    KMINIZIALI: '',
    ORAINIZIO: '',
    FRUITORE: ''
  });
  const [error, setError] = useState('');
  const [results, setResults] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const currentQuestionRef = useRef(null);
  const audioContextRef = useRef(null);
  const [printerStatus, setPrinterStatus] = useState('Non connesso');
  const [connectedDevice, setConnectedDevice] = useState(null);

  const questions = {
    ARRIVO: 'Luogo di prelievo?',
    DESTINAZIONE: 'destinazione?',
    KMINIZIALI: 'chilometri iniziali?',
    ORAINIZIO: 'orario inizio ?',
    FRUITORE: 'nome del cliente',
    PRINT_CONFIRM: 'procedo alla stampa del documento, pronunciare annulla per bloccare la stampa'
  };

  const questionOrder = ['ARRIVO', 'DESTINAZIONE', 'KMINIZIALI', 'ORAINIZIO', 'FRUITORE', 'PRINT_CONFIRM'];

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const initializeAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext inizializzato');
      }
    };

    window.addEventListener('click', initializeAudioContext, { once: true });

    return () => {
      window.removeEventListener('click', initializeAudioContext);
    };
  }, []);

  const playReadySound = () => {
    if (!audioContextRef.current) {
      console.error('AudioContext non inizializzato');
      return;
    }

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
    }, 200);
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Il riconoscimento vocale non è supportato in questo browser.');
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'it-IT';

    recognitionInstance.onstart = () => {
      playReadySound();
    };

    recognitionInstance.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log('Received transcript:', transcript);

      if (transcript.includes('annulla')) {
        console.log('Procedura annullata.');
        handleReload();
        recognitionInstance.stop();
        setIsListening(false);
        return;
      }

      if (currentQuestionRef.current === 'PRINT_CONFIRM') {
        console.log('Processing print confirmation...');
        recognitionInstance.stop();
        setIsListening(false);
        handlePrint();
        return;
      }

      setResults(transcript);
      handleFormUpdate(currentQuestionRef.current, transcript);
      recognitionInstance.stop();
      setTimeout(() => askNextQuestion(), 1000);
    };

    recognitionInstance.onerror = (event) => {
      console.error('Errore Recognition:', event.error);
      setIsListening(false);
      
      // If we get a no-speech error during PRINT_CONFIRM, proceed with printing
      if (event.error === 'no-speech' && currentQuestionRef.current === 'PRINT_CONFIRM') {
        console.log('No speech detected, proceeding with print...');
        handlePrint();
      }
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognitionInstance;
  }, []);

  const handleFormUpdate = useCallback((field, value) => {
    if (field !== 'PRINT_CONFIRM') { // Only update form if it's not the print confirmation
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  }, []);

  const askNextQuestion = useCallback(() => {
    const currentIndex = questionOrder.indexOf(currentQuestionRef.current);

    if (currentIndex === -1 || currentIndex === questionOrder.length - 1) {
      setIsListening(false);
      console.log('Tutte le domande completate.');
      // Instead of directly calling handlePrint, show confirmation
      setCurrentQuestion('PRINT_CONFIRM');
      speak(questions['PRINT_CONFIRM']);
      return;
    }

    const nextQuestion = questionOrder[currentIndex + 1];
    currentQuestionRef.current = nextQuestion;
    setCurrentQuestion(nextQuestion);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }

    speak(questions[nextQuestion]);
  }, [questions]);

  const speak = async (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    
    return new Promise((resolve) => {
      utterance.onend = () => {
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch (error) {
              console.error('Error starting recognition:', error);
            }
          }
          resolve();
        }, 500);
      };
      speechSynthesis.speak(utterance);
    });
  };

  const startListening = async () => {
    if (!recognitionRef.current) {
      setError('Il riconoscimento vocale non è inizializzato');
      return;
    }
    setFormData({ ARRIVO: '', DESTINAZIONE: '', KMINIZIALI: '', ORAINIZIO: '', FRUITORE: '' });
    setError('');
    setResults('');
    setCurrentQuestion(null);
    currentQuestionRef.current = questionOrder[0];
    setCurrentQuestion(questionOrder[0]);
    await speak(questions[questionOrder[0]]);
  };

  const handlePrint = async () => {
    try {
      if (!connectedDevice) {
        throw new Error('Stampante non connessa');
      }
  
      const server = await connectedDevice.gatt.connect();
      // Request the GOOJPRT printer
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GOOJPRT' }
        ],
        optionalServices: [PRINTER_SERVICE_UUID]
      });

      console.log('Connecting to printer...');
      server = await device.gatt.connect();

      // Get the printer service
      const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC_UUID);

      // Format the print data
      const printData = [
        '\x1B\x40',  // Initialize printer
        '\x1B\x61\x01',  // Center alignment
        'NCC FOCARELLI GIAMPAOLO\n',
        'VIA DANIMARCA,8-POMEZIA(RM)\n',
        'VIA TUNISI, 52 - ROMA\n',
        'PIVA: 05047761001\n',
        '--------------------------------\n',
        'FOGLIO DI SERVIZIO NCC N.1\n',
        '--------------------------------\n',
        `PARTENZA: Via Tunisi, 52\n`,
        `ARRIVO: ${formData.ARRIVO}\n`,
        `DESTINAZIONE: ${formData.DESTINAZIONE}\n`,
        `KM INIZIALI: ${formData.KMINIZIALI}\n`,
        `ORA INIZIO: ${formData.ORAINIZIO}\n`,
        `FRUITORE: ${formData.FRUITORE}\n`,
        '--------------------------------\n',
        `TARGA: GW 831 XH\n`,
        '--------------------------------\n',
        `DRIVER: ${document.getElementById('driver').value}\n`,
        '--------------------------------\n',
        `DATA: ${getTodayDate()}\n`,
        '--------------------------------\n',
        'FIRMA:\n',
        '--------------------------------\n',
        '\n\n\n\n',  // Feed paper
        '\x1D\x56\x41\x03'  // Cut paper
      ].join('');

      // Convert text to bytes
      const encoder = new TextEncoder();
      const data = encoder.encode(printData);

      // Send data in chunks (GOOJPRT usually has a 20-byte MTU)
      const CHUNK_SIZE = 20;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await characteristic.writeValue(chunk);
      }

      console.log('Print job sent successfully');
      
      // Disconnect from printer
      device.gatt.disconnect();
      
    } catch (error) {
      console.error('Errore durante la stampa:', error);
      setError(`Errore durante la stampa: ${error.message}`);
    }
  };

  const connectPrinter = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GOOJPRT' }
        ],
        optionalServices: [PRINTER_SERVICE_UUID]
      });

      setPrinterStatus('Connessione in corso...');
      const server = await device.gatt.connect();
      setConnectedDevice(device);
      setPrinterStatus('Stampante connessa');

      device.addEventListener('gattserverdisconnected', () => {
        setPrinterStatus('Non connesso');
        setConnectedDevice(null);
      });

    } catch (error) {
      console.error('Errore connessione:', error);
      setPrinterStatus(`Errore: ${error.message}`);
    }
  };

  const handleReload = () => {
    setFormData({
      ARRIVO: '',
      DESTINAZIONE: '',
      KMINIZIALI: '',
      ORAINIZIO: '',
      FRUITORE: ''
    });
    setError('');
    setResults('');
    setCurrentQuestion(null);
    currentQuestionRef.current = null;
    setIsListening(false);
  };

  return (
    <div className="container" >
      <button onClick={connectPrinter} className="button" style={{ fontSize: '10px' }}>
        CONNECT PRINTER
      </button>&nbsp;
      <span 
        className={`led-indicator ${connectedDevice ? 'led-green' : 'led-red'}`} 
        title={printerStatus}
      ></span>
      <br></br>
      <button onClick={isListening ? () => recognitionRef.current?.stop() : startListening} className="button" style={{ fontSize: '10px' }}>
        {isListening ? 'Stop' : 'INSERT'}
      </button>&nbsp;
      <button onClick={handlePrint} className="button" style={{ fontSize: '10px' }}>
        PRINT
      </button>&nbsp;
      <button onClick={handleReload} className="button" style={{ fontSize: '10px' }}>
        RELOAD
      </button>
      <br></br>
      <div className="form-data" style={{ fontSize: '10px' }}>
        --------------------------------<br></br>
        NCC FOCARELLI GIAMPAOLO<br></br>
        VIA DANIMARCA,8-POMEZIA(RM)<br></br>
        VIA TUNISI, 52 - ROMA<br></br>
        PIVA: 05047761001<br></br>
        --------------------------------<br></br>
        FOGLIO DI SERVIZIO NCC N.1<br></br>
        --------------------------------<br></br>
        PARTENZA: Via Tunisi, 52<br></br>
        --------------------------------<br></br>
        
        {Object.keys(formData)
          .filter(field => field !== 'PRINT_CONFIRM') // Filter out PRINT_CONFIRM
          .map(field => (
            <div key={field} className="form-field">
              <label>{field}<br></br></label>
              <span>{formData[field] || '*-'}</span><br></br>
              --------------------------------
            </div>
          ))
        }
        TARGA: GW 831 XH<br></br>
        --------------------------------<br></br>
        DRIVER:&nbsp;   
        <select name="drivers" id="driver" style={{ backgroundColor: 'white', borderColor: 'white', fontSize: '11px' }}>
        <option value="cecca">Luca Ceccarelli</option>
        <option value="locci">Emiliano Locci</option>
        <option value="Ari">Aristide Montanera</option>
        </select><br></br>
        --------------------------------<br></br>
        DATA: <input 
          type="date" 
          defaultValue={getTodayDate()}
          className="date-input"
          style={{ 
            fontSize: '11px', 
            boxShadow: 'none', 
            outline: 'none', 
            border: 'none', 
            backgroundColor: 'white', 
            appearance: 'none', // Nasconde l'indicatore del calendario
            WebkitAppearance: 'none', // Per browser basati su WebKit
            MozAppearance: 'textfield' // Per Firefox
          }}
        /><br></br>
        --------------------------------<br></br>
        FIRMA: <br></br>
        --------------------------------<br></br>
      </div>
    </div>
  );
}

export default App;
