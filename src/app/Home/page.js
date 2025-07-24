"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// A reusable component for feature cards
const FeatureCard = ({ icon, title, description }) => (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center transform hover:-translate-y-2 transition-transform duration-300">
        <div className="mx-auto w-16 h-16 mb-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
    </div>
);

// Main Homepage Component
export default function HomePage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleNavigation = (href) => {
        router.push(href);
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white overflow-x-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>

            <main className="relative z-10 container mx-auto px-6 text-center pt-20 pb-24">
                {/* Hero Section */}
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl lg:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-purple-300 to-blue-300 bg-clip-text text-transparent">
                        {user
                            ? `Welcome Back, ${user.displayName || user.email}`
                            : "Your AI-Powered Financial Co-Pilot for SMEs"}
                    </h2>
                    <p className="text-lg lg:text-xl text-gray-300 mb-8">
                        {user
                            ? "Ready to manage your finances?"
                            : "Stop guessing, start growing. Automate budgeting, forecast cash flow, and get smart financial insights with the power of AI."}
                    </p>
                    <button
                        onClick={() => handleNavigation("/dashboard")}
                        className="px-8 py-4 font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all duration-300 transform hover:scale-105"
                    >
                        {user ? "Go to Dashboard" : "Get Started for Free"}
                    </button>
                </div>

                {/* Features Section */}
                <div className="mt-24">
                    <h3 className="text-3xl font-bold mb-12">
                        Everything You Need to Master Your Finances
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <FeatureCard
                            icon={
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 7h6m0 10v-3.414A1 1 0 0014.586 13H9.414A1 1 0 009 13.586V17m2-10V5a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6"
                                    />
                                </svg>
                            }
                            title="AI-Powered Budget Buddy"
                            description="Upload expenses via CSV or invoices. Our AI summarizes spending and recommends smart monthly budgets."
                        />
                        <FeatureCard
                            icon={
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                    />
                                </svg>
                            }
                            title="Smart Cash Flow Forecast"
                            description="Visualize past and future cash flow. Get AI-powered predictions and warnings about risky trends before they happen."
                        />
                        <FeatureCard
                            icon={
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                            }
                            title="Auto-Categorize Expenses"
                            description="Simply upload receipts or bank statements. AI extracts data, auto-categorizes everything, and flags anomalies."
                        />
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 text-center p-8">
                <p className="text-gray-400">
                    &copy; {new Date().getFullYear()} Budget Buddy. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
