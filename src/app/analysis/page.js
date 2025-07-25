"use client"
import React, { useState } from 'react';
import { PlusCircle, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, DollarSign, Upload, FileText } from 'lucide-react';
import Papa from 'papaparse';

const GEMINI_API_KEY = 'AIzaSyAuYknzhnY40TVetD5YGTvreMlt3TyDZ2I';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;


const FinancialAnalysisTable = () => {
    const [months, setMonths] = useState([
        { name: 'Jan', revenue: 200000, expenses: 150000 },
        { name: 'Feb', revenue: 180000, expenses: 160000 },
        { name: 'Mar', revenue: 210000, expenses: 190000 }
    ]);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [healthRating, setHealthRating] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const addMonth = () => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const nextMonthName = monthNames[months.length % 12];
        setMonths([...months, { name: nextMonthName, revenue: 0, expenses: 0 }]);
        setAnalysis(null);
    };

    const updateMonth = (index, field, value) => {
        const newMonths = [...months];
        newMonths[index][field] = parseInt(value) || 0;
        setMonths(newMonths);
        setAnalysis(null);
    };

    const removeMonth = (index) => {
        if (months.length > 1) {
            setMonths(months.filter((_, i) => i !== index));
            setAnalysis(null);
        }
    };

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

                    const newMonths = csvData.map((row) => {
                        const month = row.Month || row.month;
                        const revenue = parseFloat(row.Revenue || row.revenue) || 0;
                        const expenses = parseFloat(row.Expenses || row.expenses) || 0;

                        if (!month) {
                            throw new Error('A row in your CSV is missing a value for the "Month" column.');
                        }

                        return { name: String(month).trim(), revenue, expenses };
                    });

                    setMonths(newMonths);
                    setUploadSuccess(true);
                    setAnalysis(null);
                    setHealthRating(null);
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

    const calculateHealthRating = (monthsData) => {
        if (!monthsData || monthsData.length === 0) return null;
        const totalRevenue = monthsData.reduce((sum, m) => sum + m.revenue, 0);
        const totalExpenses = monthsData.reduce((sum, m) => sum + m.expenses, 0);
        const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

        let rating;
        if (profitMargin >= 25) {
            rating = { status: 'Excellent', color: 'text-green-400', icon: CheckCircle, bg: 'bg-green-500/20', emoji: '🟢' };
        } else if (profitMargin >= 15) {
            rating = { status: 'Good', color: 'text-yellow-400', icon: CheckCircle, bg: 'bg-yellow-500/20', emoji: '🟡' };
        } else {
            rating = { status: 'At Risk', color: 'text-red-400', icon: AlertTriangle, bg: 'bg-red-500/20', emoji: '🔴' };
        }
        rating.margin = profitMargin.toFixed(1);
        return rating;
    };

    const analyzeFinancials = async () => {
        setIsAnalyzing(true);
        setHealthRating(null);
        setAnalysis(null);
        setUploadError(null);

        if (months.length === 0 || months.every(m => m.revenue === 0 && m.expenses === 0)) {
            setUploadError("Please enter some financial data before analyzing.");
            setIsAnalyzing(false);
            return;
        }

        const rating = calculateHealthRating(months);
        setHealthRating(rating);

        const promptData = months.map(m => ({
            month: m.name,
            revenue: m.revenue,
            expenses: m.expenses,
            profit: m.revenue - m.expenses
        }));

        const prompt = `
            You are an expert financial analyst. Analyze the following monthly financial data for a business.
            The currency is Indian Rupees (INR).

            Financial Data:
            ${JSON.stringify(promptData, null, 2)}

            Your task is to provide a concise financial analysis.
            Your response MUST be a valid JSON object with ONLY two keys: "insights" and "recommendations".
            - "insights": An array of three short, distinct, string sentences summarizing key data-driven observations.
            - "recommendations": An array of three short, distinct, string sentences giving actionable advice.

            Do not include any introductory text, closing text, or markdown formatting like \`\`\`json.
            The response should be the raw JSON object itself.
        `;

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

            const parsedAnalysis = JSON.parse(rawText);
            setAnalysis(parsedAnalysis);

        } catch (error) {
            console.error('Analysis failed:', error);
            setUploadError(`Analysis Failed: ${error.message}`);
            setAnalysis({
                insights: ['An error occurred during analysis.'],
                recommendations: ['Please check your API key and network connection, then try again.']
            });
        }
        setIsAnalyzing(false);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white p-6 font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-3 mb-4 flex-wrap">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center font-bold text-2xl shadow-lg">
                            AI
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                            Financial Analysis
                        </h1>
                    </div>
                    <p className="text-gray-400 text-lg">
                        Upload your financial data for AI-powered insights and recommendations.
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 mb-8">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-white">Monthly Financial Data</h2>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <input type="file" accept=".csv" onChange={handleCSVUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id="csv-upload" />
                                <label htmlFor="csv-upload" className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all duration-300 cursor-pointer">
                                    <Upload className="w-4 h-4" />
                                    <span>Upload CSV</span>
                                </label>
                            </div>
                            <button onClick={downloadSampleCSV} className="flex items-center justify-center space-x-2 px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/20 rounded-lg transition-all duration-300">
                                <FileText className="w-4 h-4" />
                                <span>Sample CSV</span>
                            </button>
                            <button onClick={addMonth} className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-all duration-300">
                                <PlusCircle className="w-4 h-4" />
                                <span>Add Month</span>
                            </button>
                        </div>
                    </div>

                    {uploadError && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-red-300 text-sm">{uploadError}</p>
                        </div>
                    )}
                    {uploadSuccess && (
                        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <p className="text-green-300 text-sm">CSV uploaded! {months.length} months of data loaded.</p>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/20">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Month</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Revenue</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Expenses</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Profit</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Margin</th>
                                    <th className="text-center py-3 px-4 font-semibold text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {months.map((month, index) => {
                                    const profit = month.revenue - month.expenses;
                                    const margin = month.revenue > 0 ? ((profit / month.revenue) * 100).toFixed(1) : '0.0';
                                    return (
                                        <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4 font-medium text-white">{month.name}</td>
                                            <td className="py-4 px-4"><input type="number" value={month.revenue} onChange={(e) => updateMonth(index, 'revenue', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="0" /></td>
                                            <td className="py-4 px-4"><input type="number" value={month.expenses} onChange={(e) => updateMonth(index, 'expenses', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="0" /></td>
                                            <td className={`py-4 px-4 font-medium ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(profit)}</td>
                                            <td className={`py-4 px-4 font-medium ${margin >= 25 ? 'text-green-400' : margin >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>{margin}%</td>
                                            <td className="py-4 px-4 text-center">{months.length > 1 && (<button onClick={() => removeMonth(index)} className="text-red-500 hover:text-red-400 transition-colors font-semibold">Remove</button>)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 text-center">
                        <button onClick={analyzeFinancials} disabled={isAnalyzing} className="px-8 py-3 font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed">
                            {isAnalyzing ? (<div className="flex items-center space-x-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>Analyzing...</span></div>) : 'Get AI Analysis'}
                        </button>
                    </div>
                </div>

                {(healthRating || analysis) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {healthRating && (
                            <div className={`${healthRating.bg} backdrop-blur-lg border border-white/10 rounded-2xl p-5 flex flex-col justify-center items-center text-center`}>
                                <h4 className="text-lg font-semibold text-white mb-1">Financial Health</h4>
                                <div className="flex items-center space-x-2"><healthRating.icon className={`w-7 h-7 ${healthRating.color}`} /><p className={`text-2xl font-bold ${healthRating.color}`}>{healthRating.status} {healthRating.emoji}</p></div>
                                <p className="text-sm text-gray-300 mt-1">Overall Margin: {healthRating.margin}%</p>
                            </div>
                        )}
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 text-center flex flex-col justify-center">
                            <h4 className="text-lg font-semibold text-white mb-1">Total Revenue</h4><p className="text-2xl font-bold text-green-400">{formatCurrency(months.reduce((sum, m) => sum + m.revenue, 0))}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 text-center flex flex-col justify-center">
                            <h4 className="text-lg font-semibold text-white mb-1">Total Expenses</h4><p className="text-2xl font-bold text-red-400">{formatCurrency(months.reduce((sum, m) => sum + m.expenses, 0))}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 text-center flex flex-col justify-center">
                            <h4 className="text-lg font-semibold text-white mb-1">Net Profit</h4><p className={`text-2xl font-bold ${months.reduce((s, m) => s + (m.revenue - m.expenses), 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(months.reduce((sum, m) => sum + (m.revenue - m.expenses), 0))}</p>
                        </div>
                    </div>
                )}


                {analysis && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center space-x-3 mb-4"><TrendingUp className="w-7 h-7 text-blue-400" /><h3 className="text-xl font-bold text-white">AI Insights</h3></div>
                            <div className="space-y-4">{analysis.insights.map((insight, index) => (<div key={index} className="bg-blue-500/10 rounded-lg p-4 border-l-4 border-blue-500 text-gray-300">{insight}</div>))}</div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center space-x-3 mb-4"><Target className="w-7 h-7 text-green-400" /><h3 className="text-xl font-bold text-white">Actionable Recommendations</h3></div>
                            <div className="space-y-4">{analysis.recommendations.map((rec, index) => (<div key={index} className="bg-green-500/10 rounded-lg p-4 border-l-4 border-green-500 text-gray-300">{rec}</div>))}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialAnalysisTable;