"use client"
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { FileText, Lightbulb, Copy, Upload, AlertCircle, CheckCircle, Loader2, BookOpen, Sparkles, Globe, FileUp } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const FeatureCard = ({ icon, title, description }) => (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center transform hover:-translate-y-2 transition-transform duration-300">
        <div className="mx-auto w-16 h-16 mb-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
    </div>
);

const FinancialJargonSimplifier = () => {
    const [originalText, setOriginalText] = useState('');
    const [simplifiedData, setSimplifiedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [hoveredTerm, setHoveredTerm] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('english');
    const [isExtractingText, setIsExtractingText] = useState(false);

    const GEMINI_API_KEY = 'AIzaSyBmvKYTmirmMMIguzcnCGq6K0BC3CMJXU0';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const languages = [
        { code: 'english', name: 'English', flag: '🇺🇸' },
        { code: 'hindi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
        { code: 'marathi', name: 'मराठी (Marathi)', flag: '🇮🇳' },
        { code: 'gujarati', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
        { code: 'tamil', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
        { code: 'telugu', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
        { code: 'kannada', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
        { code: 'bengali', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
        { code: 'spanish', name: 'Español', flag: '🇪🇸' },
        { code: 'french', name: 'Français', flag: '🇫🇷' },
        { code: 'german', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'portuguese', name: 'Português', flag: '🇵🇹' },
        { code: 'italian', name: 'Italiano', flag: '🇮🇹' },
        { code: 'dutch', name: 'Nederlands', flag: '🇳🇱' },
        { code: 'russian', name: 'Русский', flag: '🇷🇺' },
        { code: 'chinese', name: '中文', flag: '🇨🇳' },
        { code: 'japanese', name: '日本語', flag: '🇯🇵' },
        { code: 'korean', name: '한국어', flag: '🇰🇷' },
        { code: 'arabic', name: 'العربية', flag: '🇸🇦' },
        { code: 'turkish', name: 'Türkçe', flag: '🇹🇷' },
    ];

    const sampleTexts = [
        {
            title: "Bank Term Sheet",
            text: "The facility includes a revolving credit line with LIBOR+200bps pricing, subject to EBITDA covenant of 3.5x, with a debt service coverage ratio (DSCR) of 1.25x minimum. The loan-to-value (LTV) ratio shall not exceed 75%, and requires maintenance of tangible net worth of $2M minimum."
        },
        {
            title: "Investment Agreement",
            text: "The Series A preferred shares carry liquidation preference of 1x non-participating, with anti-dilution protection (weighted average broad-based). The investors receive pro rata rights, drag-along rights, and board representation. Valuation is pre-money $5M with a 20% option pool."
        }
    ];

    const getLanguageInstruction = (languageCode) => {
        const languageMap = {
            'english': 'English',
            'hindi': 'Hindi (हिंदी)',
            'marathi': 'Marathi (मराठी)',
            'gujarati': 'Gujarati (ગુજરાતી)',
            'tamil': 'Tamil (தமிழ்)',
            'telugu': 'Telugu (తెలుగు)',
            'kannada': 'Kannada (ಕನ್ನಡ)',
            'bengali': 'Bengali (বাংলা)',
            'spanish': 'Spanish (Español)',
            'french': 'French (Français)',
            'german': 'German (Deutsch)',
            'portuguese': 'Portuguese (Português)',
            'italian': 'Italian (Italiano)',
            'dutch': 'Dutch (Nederlands)',
            'russian': 'Russian (Русский)',
            'chinese': 'Chinese (中文)',
            'japanese': 'Japanese (日本語)',
            'korean': 'Korean (한국어)',
            'arabic': 'Arabic (العربية)',
            'turkish': 'Turkish (Türkçe)'
        };

        return languageMap[languageCode] || 'English';
    };

    const processFinancialText = async () => {
        if (!originalText.trim()) {
            setError('Please enter some financial text to simplify');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setSimplifiedData(null);

        const targetLanguage = getLanguageInstruction(selectedLanguage);
        const isEnglish = selectedLanguage === 'english';

        const prompt = `You are a financial expert helping MSME business owners understand complex financial jargon. 

Analyze the following financial text and provide your response ENTIRELY in ${targetLanguage}:

1. Identify all financial terms, acronyms, and jargon
2. Create simplified explanations for each term in ${targetLanguage}
3. Rewrite the entire text in simple, easy-to-understand ${targetLanguage} that a business owner can understand
4. Provide context about why each term matters to a business owner

${isEnglish ? '' : `IMPORTANT: Your entire response must be in ${targetLanguage}. All explanations, terms, and text should be in ${targetLanguage}. If you need to keep the original English financial terms, provide them in parentheses after the ${targetLanguage} explanation.`}

Financial Text:
"${originalText}"

Return your response in this JSON format:
{
  "simplifiedText": "Complete rewrite of the text in simple ${targetLanguage} that an MSME owner can understand",
  "terms": [
    {
      "original": "exact term from the text",
      "simple": "simple explanation in ${targetLanguage}",
      "context": "why this matters to a business owner (in ${targetLanguage})",
      "example": "practical example if helpful (in ${targetLanguage})"
    }
  ],
  "summary": "2-3 sentence summary in ${targetLanguage} of what this document means for the business owner"
}

Make explanations conversational and practical in ${targetLanguage}. Focus on implications for business decisions. ${isEnglish ? '' : `Remember to translate financial concepts appropriately while keeping technical terms recognizable.`}`;

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
            setSimplifiedData(parsedData);

        } catch (error) {
            console.error('Processing failed:', error);
            setError(`Processing Failed: ${error.message}`);
        }

        setIsProcessing(false);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const highlightTerms = (text, terms) => {
        if (!terms || terms.length === 0) return text;

        let highlightedText = text;
        terms.forEach((term, index) => {
            const regex = new RegExp(`\\b${term.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            highlightedText = highlightedText.replace(regex, `<mark data-term="${index}" class="bg-purple-200 hover:bg-purple-300 cursor-pointer px-1 rounded transition-colors">$&</mark>`);
        });

        return highlightedText;
    };

    const loadSampleText = (text) => {
        setOriginalText(text);
        setSimplifiedData(null);
        setError(null);
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file && file.type === 'application/pdf') {
            setIsExtractingText(true);
            setError(null);
            setOriginalText('');

            try {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const typedArray = new Uint8Array(event.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n\n';
                    }
                    setOriginalText(fullText.trim());
                };
                reader.readAsArrayBuffer(file);
            } catch (e) {
                setError('Failed to extract text from PDF. Please ensure it is a valid file.');
                console.error('PDF extraction error:', e);
            } finally {
                setIsExtractingText(false);
            }
        } else {
            setError('Please drop a valid PDF file.');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false,
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white overflow-x-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

            <div className="relative z-10 container mx-auto px-6 pt-10 pb-10">
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-300 to-blue-300 bg-clip-text text-transparent">
                            Financial Jargon Simplifier
                        </h1>
                    </div>
                    <p className="text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto">
                        Transform complex financial terms and documents into simple language.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                                <FileText className="w-6 h-6" />
                                <span>Original Financial Text</span>
                            </h2>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => copyToClipboard(originalText)}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                    title="Copy original text"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div
                            {...getRootProps()}
                            className={`w-full h-48 bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/10 ${isDragActive ? 'bg-purple-500/20 border-purple-400' : ''}`}
                        >
                            <input {...getInputProps()} />
                            <FileUp className="w-10 h-10 mb-3 text-gray-400" />
                            {isDragActive ? (
                                <p className="text-lg font-bold">Drop the PDF here ...</p>
                            ) : (
                                <div>
                                    <p className="font-bold">Drag & drop a PDF file here</p>
                                    <p className="text-sm text-gray-400">or click to select a file</p>
                                </div>
                            )}
                            {isExtractingText && (
                                <div className="mt-4 flex items-center space-x-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Extracting text from PDF...</span>
                                </div>
                            )}
                        </div>

                        <br />

                        <div className="mb-6">
                            <div className="flex items-center space-x-3 mb-3">
                                <Globe className="w-5 h-5 text-purple-400" />
                                <label className="text-white font-bold">Output Language:</label>
                            </div>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {languages.map((lang) => (
                                    <option key={lang.code} value={lang.code} className="bg-gray-800 text-white">
                                        {lang.flag} {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-white mb-4">Sample Documents</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {sampleTexts.map((sample, index) => (
                                    <div
                                        key={index}
                                        onClick={() => loadSampleText(sample.text)}
                                        className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 cursor-pointer transform hover:-translate-y-1 transition-transform duration-300"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <div className="text-white font-bold">{sample.title}</div>
                                                <div className="text-gray-400 text-sm truncate">{sample.text.substring(0, 60)}...</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <textarea
                            value={originalText}
                            onChange={(e) => setOriginalText(e.target.value)}
                            placeholder="Paste your financial document, term sheet, or any text with financial jargon here..."
                            className="w-full h-64 bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            disabled={isExtractingText}
                        />

                        {error && (
                            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                                <div className="flex items-center space-x-2">
                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                    <p className="text-red-300">{error}</p>
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <button
                                onClick={processFinancialText}
                                disabled={isProcessing || !originalText.trim() || isExtractingText}
                                className="w-full px-8 py-4 font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all duration-300 transform hover:scale-105 disabled:scale-100"
                            >
                                {isProcessing ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Simplifying with AI...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center space-x-2">
                                        <span>Simplify in {languages.find(l => l.code === selectedLanguage)?.name.split(' ')[0] || 'Selected Language'}</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 relative">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                                <Lightbulb className="w-6 h-6" />
                                <span>Simplified Explanation</span>
                            </h2>
                            {simplifiedData && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-400">
                                        {languages.find(l => l.code === selectedLanguage)?.flag}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(simplifiedData.simplifiedText)}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                        title="Copy simplified text"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {!simplifiedData && !isProcessing && (
                            <div className="h-64 flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>Enter financial text on the left to see simplified explanations here</p>
                                    <p className="text-sm mt-2">
                                        Output will be in: {languages.find(l => l.code === selectedLanguage)?.flag} {languages.find(l => l.code === selectedLanguage)?.name}
                                    </p>
                                </div>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="h-64 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                                    </div>
                                    <p className="text-gray-300">AI is analyzing your financial text...</p>
                                    <p className="text-sm text-gray-400 mt-2">
                                        Generating response in {languages.find(l => l.code === selectedLanguage)?.name}
                                    </p>
                                </div>
                            </div>
                        )}

                        {simplifiedData && (
                            <div className="space-y-6">
                                {simplifiedData.summary && (
                                    <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-4">
                                        <h3 className="text-purple-300 font-bold mb-2">Quick Summary:</h3>
                                        <p className="text-white">{simplifiedData.summary}</p>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-white font-bold mb-3">Simplified Version:</h3>
                                    <div
                                        className="bg-white/5 rounded-xl p-4 text-gray-300 leading-relaxed"
                                        dangerouslySetInnerHTML={{
                                            __html: highlightTerms(simplifiedData.simplifiedText, simplifiedData.terms)
                                        }}
                                        onMouseOver={(e) => {
                                            if (e.target.tagName === 'MARK') {
                                                const termIndex = parseInt(e.target.getAttribute('data-term'));
                                                setHoveredTerm(simplifiedData.terms[termIndex]);
                                            }
                                        }}
                                        onMouseOut={() => setHoveredTerm(null)}
                                    />
                                </div>

                                {simplifiedData.terms && simplifiedData.terms.length > 0 && (
                                    <div>
                                        <h3 className="text-white font-bold mb-4">Financial Terms Glossary:</h3>
                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                            {simplifiedData.terms.map((term, index) => (
                                                <div key={index} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                                                    <div className="font-bold text-purple-300 mb-1">{term.original}</div>
                                                    <div className="text-white mb-2">{term.simple}</div>
                                                    {term.context && (
                                                        <div className="text-gray-400 text-sm italic mb-2">
                                                            Why it matters: {term.context}
                                                        </div>
                                                    )}
                                                    {term.example && (
                                                        <div className="text-blue-300 text-sm">
                                                            Example: {term.example}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {hoveredTerm && (
                            <div className="absolute top-20 right-6 bg-black/90 border border-white/20 rounded-xl p-4 max-w-xs z-50 shadow-xl">
                                <div className="font-bold text-purple-300 text-sm">{hoveredTerm.original}</div>
                                <div className="text-white text-sm mt-1">{hoveredTerm.simple}</div>
                                {hoveredTerm.context && (
                                    <div className="text-gray-300 text-xs mt-2 italic">{hoveredTerm.context}</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {copySuccess && (
                    <div className="fixed bottom-6 right-6 bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-300">Copied to clipboard!</span>
                    </div>
                )}
            </div>

        </div>
    );
};

export default FinancialJargonSimplifier;
