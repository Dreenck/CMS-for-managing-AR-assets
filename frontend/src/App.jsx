import React, { useState, useEffect } from 'react'
import AssetForm from './components/AssetForm'
import AssetGallery from './components/AssetGallery'
import MyProfile from './components/MyProfile'
import AdminDashboard from './components/AdminDashboard'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react'

function App() {
  const [activeTab, setActiveTab] = useState('gallery')
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  const { user } = isClerkConfigured ? useUser() : { user: null }
  
  // If Clerk is not configured, we are in Developer Bypass mode and default to Admin
  const isAdmin = !isClerkConfigured || user?.publicMetadata?.role === 'admin'

  // If the active tab is admin but the user is not an admin, fallback to gallery
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('gallery')
    }
  }, [activeTab, isAdmin])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Navigation Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => setActiveTab('gallery')}
          >
            <span className="text-3xl transition-transform duration-300 group-hover:scale-110">🕶️</span>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AR Headless CMS
              </h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">High-Performance Asset Management</p>
            </div>
          </div>
          
          {/* Navigation Menu */}
          <nav className="flex items-center flex-wrap gap-1.5 bg-gray-100/80 p-1 rounded-2xl border border-gray-200/30">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'gallery'
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200/40'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              🖼️ Public Gallery
            </button>
            
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'upload'
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200/40'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              📤 Upload Asset
            </button>
            
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200/40'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              👤 My Profile
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  activeTab === 'admin'
                    ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/40'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                ⚙️ Admin Dash`board
              </button>
            )}
          </nav>

          {/* User Sign-In Action / Profile Menu */}
          <div className="flex items-center">
            {isClerkConfigured ? (
              <div className="flex items-center space-x-2">
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-all duration-200 shadow-md shadow-blue-500/10 active:scale-95 cursor-pointer">
                      Sign In / Register
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            ) : (
              <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 tracking-wide uppercase">
                🔑 Developer Bypass Mode
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow">
        {activeTab === 'gallery' && <AssetGallery />}
        
        {activeTab === 'upload' && (
          isClerkConfigured ? (
            <>
              <SignedIn>
                <AssetForm />
              </SignedIn>
              <SignedOut>
                <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-2xl shadow-md border border-gray-100 text-center">
                  <span className="text-5xl block mb-4">🔒</span>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Authentication Required</h3>
                  <p className="text-gray-500 mb-6 text-sm">
                    You must sign in to upload assets to the AR Headless CMS.
                  </p>
                  <SignInButton mode="modal">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors shadow">
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

        {activeTab === 'profile' && (
          isClerkConfigured ? (
            <>
              <SignedIn>
                <MyProfile />
              </SignedIn>
              <SignedOut>
                <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-2xl shadow-md border border-gray-100 text-center">
                  <span className="text-5xl block mb-4">🔒</span>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Sign In to View Profile</h3>
                  <p className="text-gray-500 mb-6 text-sm">
                    Sign in to access your dashboard, view your uploads (including private items), and edit metadata.
                  </p>
                  <SignInButton mode="modal">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors shadow cursor-pointer">
                      Sign In Now
                    </button>
                  </SignInButton>
                </div>
              </SignedOut>
            </>
          ) : (
            <MyProfile />
          )
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminDashboard />
        )}
      </main>
      
      {/* Premium Footer */}
      <footer className="bg-gray-950 text-gray-400 mt-20 border-t border-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 text-white mb-4">
              <span className="text-2xl">🕶️</span>
              <span className="font-extrabold text-lg tracking-tight">AR Headless CMS</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-500 max-w-sm">
              An enterprise-grade headless CMS optimized for storing, managing, and streaming 3D models, textures, audio, and marker images directly to WebXR engines.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setActiveTab('gallery')} className="hover:text-white transition-colors cursor-pointer">
                  Public Gallery
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('upload')} className="hover:text-white transition-colors cursor-pointer">
                  Upload Asset
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('profile')} className="hover:text-white transition-colors cursor-pointer">
                  My Profile
                </button>
              </li>
              {isAdmin && (
                <li>
                  <button onClick={() => setActiveTab('admin')} className="hover:text-white transition-colors cursor-pointer">
                    Admin Dashboard
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Tech Stack Badges */}
          <div>
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Tech Stack</h4>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">FastAPI</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">React 19</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">PostgreSQL</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">MinIO S3</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">Tailwind CSS</span>
            </div>
          </div>
          
        </div>

        {/* Sub-Footer */}
        <div className="border-t border-gray-900/60 bg-gray-950/50 py-6 text-center text-xs text-gray-600">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>© 2026 AR Headless CMS. All rights reserved.</p>
            <p className="flex items-center space-x-1">
              <span>Made with</span>
              <span className="text-red-500">❤️</span>
              <span>for high-fidelity WebXR experiences</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App