"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase"; // Make sure this path is correct for your project structure

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname(); // Hook to detect the current page
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: "Jargon Simplifier", href: "/jargon-simplifier" },
    { name: "Financial Dashboard", href: "/analysis" },
    { name: "AI Funding Pitch", href: "/funding" },
    { name: "Revenue Prediction", href: "/prediction" },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Handle navigation
  const handleNavigation = (href) => {
    router.push(href);
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  return (
    <nav className="relative z-30 bg-black/20 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavigation('/')}>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center font-bold">
              B
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Budget Buddy
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigationItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${pathname === item.href
                    ? "bg-white/20 text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* User Section */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoading ? (
              <div className="w-20 h-8 bg-white/10 rounded-lg animate-pulse"></div>
            ) : user ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-semibold text-sm">
                    {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm text-white font-medium bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => handleNavigation("/dashboard")}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-300"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="sr-only">Open main menu</span>
              <svg className={`${isMobileMenuOpen ? "hidden" : "block"} h-6 w-6`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg className={`${isMobileMenuOpen ? "block" : "hidden"} h-6 w-6`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${isMobileMenuOpen ? "block" : "hidden"}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 bg-black/40 backdrop-blur-lg border-t border-white/10">
          {navigationItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${pathname === item.href
                ? "bg-white/20 text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
            >
              {item.name}
            </button>
          ))}
          <div className="pt-4 pb-3 border-t border-white/10">
            {isLoading ? (
              <div className="px-3"><div className="w-full h-8 bg-white/10 rounded-lg animate-pulse"></div></div>
            ) : user ? (
              <div className="px-3 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-semibold text-sm">
                    {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="text-sm text-gray-300">{user.email}</span>
                </div>
                <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-base font-medium bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors text-gray-300">
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="px-3">
                <button onClick={() => handleNavigation("/dashboard")} className="w-full px-4 py-2 text-base font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all">
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};


export default function RootLayout({ children }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} flex flex-col min-h-screen bg-gray-900`}>
        {pathname !== "/" && <Navbar />}
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}