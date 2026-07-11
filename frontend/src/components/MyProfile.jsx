import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '@google/model-viewer';
import { useUser, useAuth } from '@clerk/clerk-react';

function ProfileContent({ clerkUser, getToken }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit State
  const [editingAsset, setEditingAsset] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const ownerId = clerkUser ? clerkUser.id : null;

  const fetchUserAssets = async () => {
    try {
      setLoading(true);
      // Fetch assets by owner. If auth is bypassed, fetch assets with owner_id=null (anonymous uploads)
      const params = {};
      if (isClerkConfigured && ownerId) {
        params.owner_id = ownerId;
      } else if (!isClerkConfigured) {
        // If Clerk is not configured, fetch all (or we can filter by null)
        // Let's fetch all assets to allow demo-ing profile/uploads in local dev easily
        params.public_only = false;
      }
      
      const headers = {};
      if (getToken) {
        const token = await getToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }
      
      const response = await axios.get('http://localhost:8000/api/v1/assets', { params, headers });
      
      // If Clerk is configured but we are logged in, we only see our own.
      // If Clerk is bypassed, we show all assets as if they belong to this dev profile.
      if (isClerkConfigured && ownerId) {
        setAssets(response.data.filter(a => a.owner_id === ownerId));
      } else {
        setAssets(response.data);
      }
    } catch (err) {
      console.error("Error fetching user profile assets:", err);
      setError("Could not load your assets. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAssets();
  }, [ownerId]);

  const handleDelete = async (assetId) => {
    if (!window.confirm("Are you sure you want to delete this asset? This cannot be undone.")) {
      return;
    }
    try {
      const headers = {};
      if (getToken) {
        const token = await getToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }
      await axios.delete(`http://localhost:8000/api/v1/assets/${assetId}`, { headers });
      setAssets(assets.filter((a) => a.id !== assetId));
    } catch (err) {
      console.error("Error deleting asset:", err);
      alert("Failed to delete the asset.");
    }
  };

  const startEdit = (asset) => {
    setEditingAsset(asset);
    setEditTitle(asset.title);
    setEditDescription(asset.description || '');
    setEditIsPublic(asset.is_public);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingAsset) return;

    setIsSaving(true);
    try {
      const headers = {};
      if (getToken) {
        const token = await getToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }
      const response = await axios.put(`http://localhost:8000/api/v1/assets/${editingAsset.id}`, {
        title: editTitle,
        description: editDescription,
        is_public: editIsPublic
      }, { headers });
      
      // Update local state
      setAssets(assets.map(a => a.id === editingAsset.id ? response.data : a));
      setEditingAsset(null);
    } catch (err) {
      console.error("Error updating asset:", err);
      alert("Failed to update asset. Check the backend connection.");
    } finally {
      setIsSaving(false);
    }
  };

  // Profile Stats
  const totalAssets = assets.length;
  const publicAssets = assets.filter(a => a.is_public).length;
  const privateAssets = totalAssets - publicAssets;
  const typeCounts = assets.reduce((acc, curr) => {
    acc[curr.asset_type] = (acc[curr.asset_type] || 0) + 1;
    return acc;
  }, {});

  // Display user information
  const profileName = clerkUser ? clerkUser.fullName : "Developer Admin";
  const profileEmail = clerkUser ? clerkUser.primaryEmailAddress?.emailAddress : "admin@ar-headless-cms.local";
  const profileAvatar = clerkUser ? clerkUser.imageUrl : "https://api.dicebear.com/7.x/bottts/svg?seed=ar-cms";
  const profileJoined = clerkUser ? new Date(clerkUser.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 mb-8 transition-transform duration-300">
        <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
        <div className="px-6 pb-6 relative flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-10">
          <img 
            src={profileAvatar} 
            alt={profileName} 
            className="w-28 h-28 rounded-full border-4 border-white shadow-md bg-white object-cover"
          />
          <div className="flex-grow text-center md:text-left mt-2">
            <h2 className="text-2xl font-extrabold text-gray-900">{profileName}</h2>
            <p className="text-sm text-gray-500 font-medium">{profileEmail}</p>
            <div className="mt-2 flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                User ID: {ownerId ? ownerId.substring(0, 15) + '...' : 'Local Dev Mode'}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-50 text-gray-600 border border-gray-100">
                Joined: {profileJoined}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center hover:shadow transition-shadow">
          <p className="text-sm font-semibold text-gray-400">Total Uploaded</p>
          <p className="text-3xl font-black text-gray-800 mt-1">{totalAssets}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center hover:shadow transition-shadow">
          <p className="text-sm font-semibold text-green-500">🌍 Public Assets</p>
          <p className="text-3xl font-black text-gray-800 mt-1">{publicAssets}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center hover:shadow transition-shadow">
          <p className="text-sm font-semibold text-amber-500">🔒 Private Assets</p>
          <p className="text-3xl font-black text-gray-800 mt-1">{privateAssets}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center hover:shadow transition-shadow">
          <p className="text-sm font-semibold text-blue-500">3D Models</p>
          <p className="text-3xl font-black text-gray-800 mt-1">{typeCounts['3d_model'] || 0}</p>
        </div>
      </div>

      {/* My Uploads Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">My Uploads & Assets</h3>
          <p className="text-xs text-gray-500">Manage visibility, title, and metadata of your uploaded files.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="max-w-md mx-auto p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-center">
          {error}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200/80 shadow-sm max-w-4xl mx-auto">
          <span className="text-5xl block mb-3">📁</span>
          <p className="text-gray-500 text-lg font-medium">No assets uploaded yet.</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">Upload some 3D models, audio, or textures to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow transition-shadow border border-gray-100 flex flex-col relative group">
              
              {/* Privacy Badge overlay */}
              <span className={`absolute top-3 left-3 z-10 px-2 py-0.5 text-xs font-bold rounded-full shadow ${
                asset.is_public 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {asset.is_public ? '🌍 Public' : '🔒 Private'}
              </span>

              {/* Visual Preview Container */}
              <div className="h-44 bg-gray-50 flex items-center justify-center border-b border-gray-50 relative">
                {asset.asset_type === '3d_model' && asset.file_url ? (
                  <model-viewer
                    src={asset.file_url}
                    camera-controls
                    auto-rotate
                    style={{ width: '100%', height: '100%' }}
                  ></model-viewer>
                ) : (asset.asset_type === 'marker' || asset.asset_type === 'texture') && asset.file_url ? (
                  <img
                    src={asset.file_url}
                    alt={asset.title}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                ) : asset.asset_type === 'audio' && asset.file_url ? (
                  <div className="flex flex-col items-center justify-center p-4 w-full">
                    <span className="text-3xl">🎵</span>
                    <audio controls src={asset.file_url} className="w-full mt-3 scale-90" />
                  </div>
                ) : (
                  <span className="text-gray-400">No preview file</span>
                )}
                {/* Type Badge */}
                <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 uppercase">
                  {asset.asset_type.replace('_', ' ')}
                </span>
              </div>

              {/* Info Container */}
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 truncate" title={asset.title}>
                    {asset.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={asset.description}>
                    {asset.description || 'No description provided.'}
                  </p>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                  <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEdit(asset)}
                      className="px-2 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-bold rounded transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 font-bold rounded transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Edit Asset Metadata</h3>
              <button 
                onClick={() => setEditingAsset(null)}
                className="text-white/80 hover:text-white font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea 
                  value={editDescription} 
                  onChange={(e) => setEditDescription(e.target.value)} 
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-start mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex items-center h-5">
                  <input
                    id="edit_is_public"
                    type="checkbox"
                    checked={editIsPublic}
                    onChange={(e) => setEditIsPublic(e.target.checked)}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer"
                  />
                </div>
                <div className="ml-3 text-xs">
                  <label htmlFor="edit_is_public" className="font-bold text-gray-700 cursor-pointer">Make Public (Allow anyone to view)</label>
                  <p className="text-gray-500">Unchecking makes this private. It won't show in the public gallery.</p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ClerkProfile() {
  const { user } = useUser();
  const { getToken } = useAuth();
  return <ProfileContent clerkUser={user} getToken={getToken} />;
}

export default function MyProfile() {
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (isClerkConfigured) {
    return <ClerkProfile />;
  }
  return <ProfileContent clerkUser={null} />;
}
