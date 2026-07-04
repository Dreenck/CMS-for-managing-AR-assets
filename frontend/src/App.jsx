import React, { useState } from 'react'
import AssetForm from './components/AssetForm'
import AssetGallery from './components/AssetGallery'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'

function App() {
  const [activeTab, setActiveTab] = useState('gallery')
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🕶️</span>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">AR Headless CMS</h1>
              <p className="text-xs text-gray-500">Asset Storage & Public Gallery</p>
            </div>
          </div>
          
          <nav className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                activeTab === 'gallery'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/55'
              }`}
            >
              🖼️ Public Gallery
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/55'
              }`}
            >
              📤 Upload Asset
            </button>
          </nav>

          <div className="flex items-center">
            {isClerkConfigured ? (
              <>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded text-sm transition-colors shadow">
                      Log In / Sign Up
                    </button>
                  </SignInButton>
                </SignedOut>
              </>
            ) : (
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded border border-yellow-200">
                🔒 Clerk Dev Mode (Auth Bypassed)
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow">
        {activeTab === 'gallery' ? (
          <AssetGallery />
        ) : (
          /* Handle Upload view auth protection */
          isClerkConfigured ? (
            <>
              <SignedIn>
                <AssetForm />
              </SignedIn>
              <SignedOut>
                <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow-md border border-gray-100 text-center">
                  <span className="text-5xl block mb-4">🔒</span>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Authentication Required</h3>
                  <p className="text-gray-500 mb-6 text-sm">
                    You must sign in to upload assets to the AR Headless CMS. Public gallery viewing remains open.
                  </p>
                  <SignInButton mode="modal">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded transition-colors shadow">
                      Sign In Now
                    </button>
                  </SignInButton>
                </div>
              </SignedOut>
            </>
          ) : (
            <AssetForm />
          )
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12 text-center text-xs text-gray-400">
        <p>© 2026 AR Headless CMS. Built for high performance and zero egress fees.</p>
      </footer>
    </div>
  )
}
export default App