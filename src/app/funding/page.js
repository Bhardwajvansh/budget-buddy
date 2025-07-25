"use client"
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Pause, RotateCcw, Send, Loader2, AlertCircle, CheckCircle, Twitter, Linkedin, Copy } from 'lucide-react';

const AIFundingPitch = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [transcript, setTranscript] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState('');
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioRef = useRef(null);
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);

    const GEMINI_API_KEY = 'AIzaSyAuYknzhnY40TVetD5YGTvreMlt3TyDZ2I';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    useEffect(() => {
        if (!navigator.mediaDevices || !window.webkitSpeechRecognition) {
            setError('Your browser does not support audio recording or speech recognition.');
        }

        if (window.webkitSpeechRecognition) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    setTranscript(prev => prev + finalTranscript);
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setError(`Speech recognition error: ${event.error}`);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            setError('');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            if (recognitionRef.current) {
                recognitionRef.current.start();
            }

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            setError('Failed to access microphone. Please check permissions.');
            console.error('Recording error:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        setIsRecording(false);
    };

    const playAudio = () => {
        if (audioBlob && audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                const audioUrl = URL.createObjectURL(audioBlob);
                audioRef.current.src = audioUrl;
                audioRef.current.play();
                setIsPlaying(true);

                audioRef.current.onended = () => {
                    setIsPlaying(false);
                };
            }
        }
    };

    const resetRecording = () => {
        setAudioBlob(null);
        setTranscript('');
        setAnalysis(null);
        setError('');
        setRecordingTime(0);
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.src = '';
        }
    };

    const analyzePitch = async () => {
        if (!transcript.trim()) {
            setError('No transcript available to analyze. Please record your pitch first.');
            return;
        }

        setIsAnalyzing(true);
        setError('');

        const prompt = `Analyze this funding pitch and provide a detailed assessment in JSON format. The pitch is: "${transcript}"

Please evaluate the pitch on the following criteria and return a JSON object with this exact structure:
{
    "overallScore": (number from 1-10),
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2", "weakness3"],
    "marketOpportunity": {
        "score": (1-10),
        "feedback": "detailed feedback"
    },
    "businessModel": {
        "score": (1-10),
        "feedback": "detailed feedback"
    },
    "team": {
        "score": (1-10),
        "feedback": "detailed feedback"
    },
    "traction": {
        "score": (1-10),
        "feedback": "detailed feedback"
    },
    "financials": {
        "score": (1-10),
        "feedback": "detailed feedback"
    },
    "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
    "fundingReadiness": "High/Medium/Low",
    "summary": "overall summary of the pitch"
}`;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
            }

            const apiResponse = await response.json();
            const rawText = apiResponse.candidates[0]?.content?.parts[0]?.text;

            if (!rawText) {
                throw new Error("Received an empty response from the AI.");
            }

            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Could not extract valid JSON from response");
            }

            const parsedData = JSON.parse(jsonMatch[0]);
            setAnalysis(parsedData);

        } catch (error) {
            console.error('Analysis failed:', error);
            setError(`Analysis Failed: ${error.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getScoreColor = (score) => {
        if (score >= 8) return 'text-green-400';
        if (score >= 6) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getFundingReadinessColor = (readiness) => {
        switch (readiness) {
            case 'High': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'Medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'Low': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

            <div className="relative z-10 flex flex-col items-center px-6 lg:px-8 pb-20">
                <div className="flex items-center justify-center space-x-3 m-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                        <Mic className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-300 to-blue-300 bg-clip-text text-transparent">
                        AI Funding Pitch
                    </h1>
                </div>
                <p className="text-xl text-gray-300 mb-10">AI-Powered Funding Pitch Analysis</p>

                <div className="w-full max-w-6xl space-y-8">
                        <div className="grid lg:grid-cols-2 gap-8">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                                    <Mic className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">Record Your Pitch</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-center space-x-4">
                                    {!isRecording ? (
                                        <button
                                            onClick={startRecording}
                                            disabled={isAnalyzing}
                                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-full p-4 transition-all duration-200 shadow-lg hover:shadow-red-500/25"
                                        >
                                            <Mic size={32} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopRecording}
                                            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-full p-4 transition-all duration-200 shadow-lg animate-pulse"
                                        >
                                            <MicOff size={32} />
                                        </button>
                                    )}

                                    {audioBlob && (
                                        <>
                                            <button
                                                onClick={playAudio}
                                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full p-3 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                                            >
                                                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                                            </button>

                                            <button
                                                onClick={resetRecording}
                                                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all duration-200 shadow-lg border border-white/10"
                                            >
                                                <RotateCcw size={24} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                <div className="text-center">
                                    {isRecording && (
                                        <div className="flex items-center justify-center space-x-2 text-red-400">
                                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                            <span className="font-medium">Recording: {formatTime(recordingTime)}</span>
                                        </div>
                                    )}

                                    {audioBlob && !isRecording && (
                                        <div className="flex items-center justify-center space-x-2 text-green-400">
                                            <CheckCircle size={20} />
                                            <span className="font-medium">Recording completed</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-lg font-semibold text-gray-300 mb-3">Your Pitch</h4>
                                    <textarea
                                        value={transcript}
                                        onChange={(e) => setTranscript(e.target.value)}
                                        placeholder="Record your pitch or type it here..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 min-h-48 max-h-64 overflow-y-auto text-gray-200 leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all duration-200"
                                    />
                                </div>

                                <button
                                    onClick={analyzePitch}
                                    disabled={!transcript.trim() || isAnalyzing}
                                    className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${transcript.trim() && !isAnalyzing
                                        ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-purple-500/25"
                                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                                        }`}
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Analyzing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={20} />
                                            <span>Analyze Pitch</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <audio ref={audioRef} className="hidden" />
                        </div>

                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                    <svg
                                        className="w-5 h-5 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-white">AI Analysis Results</h3>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start space-x-3">
                                    <AlertCircle className="text-red-400 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="text-red-400 font-medium mb-1">Error</h4>
                                        <p className="text-red-300">{error}</p>
                                    </div>
                                </div>
                            )}

                            {analysis ? (
                                <div className="space-y-6">
                                    <div className="text-center bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6">
                                        <h4 className="text-lg font-semibold text-gray-300 mb-2">Overall Score</h4>
                                        <div className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                                            {analysis.overallScore}/10
                                        </div>
                                        <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${getFundingReadinessColor(analysis.fundingReadiness)}`}>
                                            {analysis.fundingReadiness} Funding Readiness
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-300 mb-4">Detailed Scores</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {Object.entries({
                                                'Market Opportunity': analysis.marketOpportunity,
                                                'Business Model': analysis.businessModel,
                                                'Team': analysis.team,
                                                'Traction': analysis.traction,
                                                'Financials': analysis.financials
                                            }).map(([category, data]) => (
                                                <div key={category} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h5 className="font-medium text-gray-300">{category}</h5>
                                                        <span className={`font-bold ${getScoreColor(data.score)}`}>
                                                            {data.score}/10
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-400">{data.feedback}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-lg font-semibold text-green-400 mb-3">Strengths</h4>
                                            <ul className="space-y-2">
                                                {analysis.strengths.map((strength, index) => (
                                                    <li key={index} className="flex items-start space-x-2">
                                                        <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-gray-300 text-sm">{strength}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className="text-lg font-semibold text-red-400 mb-3">Areas for Improvement</h4>
                                            <ul className="space-y-2">
                                                {analysis.weaknesses.map((weakness, index) => (
                                                    <li key={index} className="flex items-start space-x-2">
                                                        <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-gray-300 text-sm">{weakness}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-300 mb-3">Recommendations</h4>
                                        <ul className="space-y-2">
                                            {analysis.recommendations.map((recommendation, index) => (
                                                <li key={index} className="flex items-start space-x-2">
                                                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                                                    <span className="text-gray-300 text-sm">{recommendation}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                        <h4 className="text-lg font-semibold text-blue-400 mb-2">Summary</h4>
                                        <p className="text-blue-300 leading-relaxed">{analysis.summary}</p>
                                    </div>

                                    <div className="pt-6 border-t border-white/10">
                                        <h4 className="text-lg font-semibold text-gray-300 mb-4">Share Your Pitch</h4>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={() => {
                                                    const tweetText = `I just analyzed my funding pitch with AI! Here's the summary: "${analysis.summary}" #AI #Startup #FundingPitch`;
                                                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#1DA1F2] hover:bg-[#1A91DA] text-white font-medium transition-colors"
                                            >
                                                <Twitter size={18} />
                                                <span>Share on Twitter</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const linkedInText = `I just analyzed my funding pitch with AI and wanted to share the summary:\n\n"${analysis.summary}"\n\n#AI #Startup #VentureCapital #FundingPitch`;
                                                    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://your-app-url.com')}&summary=${encodeURIComponent(linkedInText)}`;
                                                    window.open(linkedInUrl, '_blank');
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#0A66C2] hover:bg-[#095AB0] text-white font-medium transition-colors"
                                            >
                                                <Linkedin size={18} />
                                                <span>Post on LinkedIn</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(analysis.summary);
                                                    setIsCopied(true);
                                                    setTimeout(() => setIsCopied(false), 2000);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                                            >
                                                <Copy size={18} />
                                                <span>{isCopied ? 'Copied!' : 'Copy Summary'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-64 text-gray-500">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Mic size={32} className="text-purple-400" />
                                        </div>
                                        <p className="text-gray-400">Record and analyze your pitch to see detailed feedback here</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIFundingPitch;
