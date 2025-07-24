"use client"
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3, Brain, AlertCircle, Loader2, Upload, FileText, CheckCircle, AlertTriangle, Target } from 'lucide-react';
import Papa from 'papaparse';

const SMEForecastDashboard = () => {
    const [forecastData, setForecastData] = useState([]);
    const [inputData, setInputData] = useState([
        { name: 'Jan', revenue: 200000, expenses: 150000 },
        { name: 'Feb', revenue: 180000, expenses: 160000 },
        { name: 'Mar', revenue: 210000, expenses: 190000 }
    ]);
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [predictionPeriod, setPredictionPeriod] = useState(24);

    const GEMINI_API_KEY = 'AIzaSyBmvKYTmirmMMIguzcnCGq6K0BC3CMJXU0';
    const FORECAST_API_URL = 'https://bb-backend-693559507420.asia-south1.run.app/forecast';
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

    const handleCSVUpload = (event) => {
        const file = event.target.files[0];
        setUploadError(null);
        setUploadSuccess(false);

        if (!file) return;

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setUploadError('Please upload a valid CSV file.');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                try {
                    if (results.errors.length > 0) {
                        throw new Error('Parsing error: ' + results.errors[0].message);
                    }

                    const csvData = results.data;
                    if (csvData.length === 0) {
                        throw new Error('CSV file is empty or improperly formatted.');
                    }

                    const headers = Object.keys(csvData[0]).map(h => h.toLowerCase().trim());
                    const requiredHeaders = ['month', 'revenue', 'expenses'];
                    if (!requiredHeaders.every(req => headers.includes(req))) {
                        throw new Error(`Missing required columns. CSV must contain: ${requiredHeaders.join(', ')}.`);
                    }

                    const newData = csvData.map((row) => {
                        const month = row.Month || row.month;
                        const revenue = parseFloat(row.Revenue || row.revenue) || 0;
                        const expenses = parseFloat(row.Expenses || row.expenses) || 0;

                        if (!month) {
                            throw new Error('A row in your CSV is missing a value for the "Month" column.');
                        }

                        return { name: String(month).trim(), revenue, expenses };
                    });

                    setInputData(newData);
                    setUploadSuccess(true);
                    setAnalysis(null);
                    setForecastData([]);
                    setTimeout(() => setUploadSuccess(false), 3000);

                } catch (error) {
                    setUploadError(`Error processing CSV: ${error.message}`);
                }
            },
            error: (error) => {
                setUploadError('Failed to read CSV file: ' + error.message);
            }
        });
        event.target.value = '';
    };

    const downloadSampleCSV = () => {
        const sampleData = [
            { month: 'Jan', revenue: 200000, expenses: 150000 },
            { month: 'Feb', revenue: 180000, expenses: 160000 },
            { month: 'Mar', revenue: 210000, expenses: 190000 },
            { month: 'Apr', revenue: 220000, expenses: 180000 },
            { month: 'May', revenue: 240000, expenses: 200000 },
            { month: 'Jun', revenue: 260000, expenses: 210000 }
        ];
        const csv = Papa.unparse(sampleData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'sample_financial_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchForecastData = async () => {
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(FORECAST_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: inputData.map(item => ({
                        month: item.name,
                        revenue: item.revenue,
                        expenses: item.expenses
                    })),
                    periods: predictionPeriod
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            setForecastData(data);

            // Automatically trigger analysis after data is loaded
            if (data && data.length > 0) {
                await performAnalysis(data);
            }
        } catch (err) {
            console.error('Error fetching forecast data:', err);
            setError(`Failed to fetch forecast data: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const performAnalysis = async (data) => {
        setIsAnalyzing(true);
        setError('');

        const prompt = `
            You are an expert financial analyst. Analyze the following SME financial forecast data and provide insights and recommendations.
            The currency is Indian Rupees (INR).

            Forecast Data:
            ${JSON.stringify(data, null, 2)}

            Your task is to provide a comprehensive financial analysis.
            Your response MUST be a valid JSON object with the following structure:
            {
                "insights": [
                    "List of key insights about the financial trends",
                    "Revenue patterns observed",
                    "Expense patterns observed",
                    "Profitability trends"
                ],
                "recommendations": [
                    "Strategic recommendations for the business",
                    "Areas for cost optimization",
                    "Revenue growth opportunities",
                    "Risk mitigation strategies"
                ],
                "futureOutlook": {
                    "revenue": "Expected revenue trend description",
                    "expenses": "Expected expense trend description",
                    "profitability": "Profitability forecast description",
                    "riskFactors": ["List of potential risks"]
                }
            }

            Focus on practical business insights and actionable recommendations based on the financial data patterns.
            Do not include any introductory text, closing text, or markdown formatting.
            The response should be the raw JSON object itself.
        `;

        try {
            const response = await fetch(GEMINI_API_URL, {
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

            // Clean the response text to extract JSON
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const jsonText = jsonMatch ? jsonMatch[0] : rawText;

            const parsedAnalysis = JSON.parse(jsonText);
            setAnalysis(parsedAnalysis);

        } catch (error) {
            console.error('Analysis failed:', error);
            setError(`Analysis Failed: ${error.message}`);
            setAnalysis({
                insights: ['An error occurred during analysis.'],
                recommendations: ['Please check your API key and network connection, then try again.'],
                futureOutlook: {
                    revenue: 'Analysis unavailable',
                    expenses: 'Analysis unavailable',
                    profitability: 'Analysis unavailable',
                    riskFactors: ['Unable to assess risks due to analysis error']
                }
            });
        }
        setIsAnalyzing(false);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/80 backdrop-blur-sm p-4 border border-white/20 rounded-lg shadow-lg">
                    <p className="font-semibold text-white mb-2">{`Month: ${label}`}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {`${entry.dataKey}: ${formatCurrency(entry.value)}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white p-6 font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center font-bold text-2xl shadow-lg">
                            AI
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            SME Financial Forecast Engine
                        </h1>
                    </div>
                    <p className="text-gray-400 text-lg">
                        Upload your financial data for AI-powered forecasting and business insights
                    </p>
                </div>

                {/* Upload Section */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 mb-8">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4">Data Input & Forecast</h2>
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-semibold text-white">Forecast Period:</h3>
                                <div className="flex gap-2">
                                    {[12, 24, 36, 48].map((period) => (
                                        <button
                                            key={period}
                                            onClick={() => setPredictionPeriod(period)}
                                            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                                                predictionPeriod === period
                                                    ? 'bg-purple-600 text-white font-bold'
                                                    : 'bg-white/10 hover:bg-white/20'
                                            }`}
                                        >
                                            {period}M
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCSVUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    id="csv-upload"
                                />
                                <label
                                    htmlFor="csv-upload"
                                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all duration-300 cursor-pointer"
                                >
                                    <Upload className="w-4 h-4" />
                                    <span>Upload CSV</span>
                                </label>
                            </div>
                            <button
                                onClick={downloadSampleCSV}
                                className="flex items-center justify-center space-x-2 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 rounded-lg transition-all duration-300"
                            >
                                <FileText className="w-4 h-4" />
                                <span>Sample CSV</span>
                            </button>
                            <button
                                onClick={fetchForecastData}
                                disabled={isLoading}
                                className="flex items-center justify-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 rounded-lg transition-all duration-300"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <BarChart3 className="h-5 w-5" />
                                        <span>Generate Forecast</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Upload Status Messages */}
                    {uploadError && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-red-300 text-sm">{uploadError}</p>
                        </div>
                    )}
                    {uploadSuccess && (
                        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <p className="text-green-300 text-sm">CSV uploaded! {inputData.length} months of data loaded.</p>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Input Data Preview */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3">Current Input Data</h3>
                        <div className="overflow-x-auto bg-black/20 rounded-lg">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/20">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Month</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Revenue</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Expenses</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-300">Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inputData.slice(0, 5).map((month, index) => {
                                        const profit = month.revenue - month.expenses;
                                        return (
                                            <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4 font-medium text-white">{month.name}</td>
                                                <td className="py-3 px-4 text-green-400">{formatCurrency(month.revenue)}</td>
                                                <td className="py-3 px-4 text-red-400">{formatCurrency(month.expenses)}</td>
                                                <td className={`py-3 px-4 font-medium ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {formatCurrency(profit)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {inputData.length > 5 && (
                                        <tr>
                                            <td colSpan="4" className="py-3 px-4 text-center text-gray-400">
                                                ... and {inputData.length - 5} more months
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Financial Forecast Chart</h2>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-96">
                            <div className="text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
                                <p className="text-gray-400">Generating forecast data...</p>
                            </div>
                        </div>
                    ) : forecastData.length > 0 ? (
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                        tickFormatter={(value) => formatCurrency(value)}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#10B981"
                                        strokeWidth={3}
                                        dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                                        activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 2 }}
                                        name="Revenue"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="expenses"
                                        stroke="#F59E0B"
                                        strokeWidth={3}
                                        dot={{ fill: '#F59E0B', strokeWidth: 2, r: 6 }}
                                        activeDot={{ r: 8, stroke: '#F59E0B', strokeWidth: 2 }}
                                        name="Expenses"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-96">
                            <div className="text-center">
                                <BarChart3 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                                <p className="text-gray-400">Upload your financial data and click Generate Forecast to see predictions</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Analysis Section */}
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="bg-purple-600 p-2 rounded-lg">
                            <Brain className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">AI Analysis & Predictions</h2>
                        {isAnalyzing && (
                            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                        )}
                    </div>

                    {isAnalyzing ? (
                        <div className="text-center py-12">
                            <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
                            <p className="text-gray-400">Analyzing financial data and generating insights...</p>
                        </div>
                    ) : analysis ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Insights */}
                            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <TrendingUp className="w-7 h-7 text-blue-400" />
                                    <h3 className="text-xl font-bold text-white">AI Insights</h3>
                                </div>
                                <div className="space-y-4">
                                    {analysis.insights?.map((insight, index) => (
                                        <div key={index} className="bg-blue-500/10 rounded-lg p-4 border-l-4 border-blue-500 text-gray-300">
                                            {insight}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <Target className="w-7 h-7 text-green-400" />
                                    <h3 className="text-xl font-bold text-white">Actionable Recommendations</h3>
                                </div>
                                <div className="space-y-4">
                                    {analysis.recommendations?.map((recommendation, index) => (
                                        <div key={index} className="bg-green-500/10 rounded-lg p-4 border-l-4 border-green-500 text-gray-300">
                                            {recommendation}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Future Outlook */}
                            {analysis.futureOutlook && (
                                <div className="lg:col-span-2 mt-8">
                                    <h3 className="text-xl font-bold text-white mb-4">Future Outlook</h3>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
                                            <h4 className="font-semibold text-white mb-2">Revenue Trend</h4>
                                            <p className="text-gray-300">{analysis.futureOutlook.revenue}</p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
                                            <h4 className="font-semibold text-white mb-2">Expense Trend</h4>
                                            <p className="text-gray-300">{analysis.futureOutlook.expenses}</p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
                                            <h4 className="font-semibold text-white mb-2">Profitability</h4>
                                            <p className="text-gray-300">{analysis.futureOutlook.profitability}</p>
                                        </div>
                                    </div>

                                    {analysis.futureOutlook.riskFactors && (
                                        <div className="mt-6">
                                            <h4 className="font-semibold text-white mb-3">Risk Factors</h4>
                                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                                <ul className="list-disc list-inside space-y-2">
                                                    {analysis.futureOutlook.riskFactors.map((risk, index) => (
                                                        <li key={index} className="text-yellow-300">{risk}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Brain className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-400">AI analysis will appear here after forecast data is generated</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SMEForecastDashboard;
