import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser, useAuth } from '@clerk/clerk-react';
import '@google/model-viewer';

function DashboardContent({ clerkUser, getToken }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search and filters for Admin table
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  // Edit State
  const [editingAsset, setEditingAsset] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAllAssets = async () => {
    try {
      setLoading(true);
      // Fetch all assets (public_only=false is default if not set, or we can explicitly set it to false)
      const headers = {};
      if (getToken) {
        const token = await getToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }
      const response = await axios.get('http://localhost:8000/api/v1/assets', {
        params: { public_only: false },
        headers
      });
      setAssets(response.data);
    } catch (err) {
      console.error("Error fetching all assets for admin:", err);
      setError("Could not load database assets. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAssets();
  }, []);

  const handleDelete = async (assetId) => {
    if (!window.confirm("WARNING: You are logged in as Admin. Are you sure you want to permanently delete this asset and its file?")) {
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
      alert("Failed to update asset.");
    } finally {
      setIsSaving(false);
    }
  };

  // Stats Calculations
  const totalCount = assets.length;
  const publicCount = assets.filter(a => a.is_public).length;
  const privateCount = totalCount - publicCount;
  const model3dCount = assets.filter(a => a.asset_type === '3d_model').length;
  const textureCount = assets.filter(a => a.asset_type === 'texture').length;
  const audioCount = assets.filter(a => a.asset_type === 'audio').length;
  const markerCount = assets.filter(a => a.asset_type === 'marker').length;

  // Filtered Assets
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.owner_id && asset.owner_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      asset.id.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter;
    const matchesVisibility = 
      visibilityFilter === 'all' || 
      (visibilityFilter === 'public' && asset.is_public) || 
      (visibilityFilter === 'private' && !asset.is_public);

    return matchesSearch && matchesType && matchesVisibility;
  });

  // Admin Account Info
  const adminName = clerkUser ? clerkUser.fullName : "Super Admin";
  const adminEmail = clerkUser ? clerkUser.primaryEmailAddress?.emailAddress : "admin@ar-headless-cms.local";
  const adminAvatar = clerkUser ? clerkUser.imageUrl : "https://api.dicebear.com/7.x/identicon/svg?seed=admin";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-3xl">⚙️</span>
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Admin CMS Dashboard</h2>
          <p className="text-xs text-gray-500">System-wide asset administration, metadata editing, and database stats</p>
        </div>
      </div>

      {/* Grid containing Admin Info and System Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Admin Account Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Admin Account Info</h3>
            <div className="flex items-center space-x-4">
              <img 
                src={adminAvatar} 
                alt={adminName} 
                className="w-16 h-16 rounded-full border-2 border-indigo-100 shadow-sm bg-gray-50 object-cover"
              />
              <div>
                <p className="text-base font-extrabold text-gray-800">{adminName}</p>
                <p className="text-xs text-gray-500 font-semibold">{adminEmail}</p>
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 font-bold rounded-full bg-red-50 text-red-700 border border-red-100 uppercase">
                  CMS Root Access
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400 space-y-1">
            <p><strong>System Role:</strong> Database Owner / S3 Bucket Controller</p>
            <p><strong>Clerk ID:</strong> {clerkUser ? clerkUser.id.substring(0, 16) + '...' : 'Dev Admin Key'}</p>
          </div>
        </div>

        {/* Database Assets Stats */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Database Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Total Assets</span>
              <p className="text-2xl font-black text-gray-800 mt-1">{totalCount}</p>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-lg text-center border border-emerald-100/50">
              <span className="text-xs text-emerald-700 font-medium">🌍 Public</span>
              <p className="text-2xl font-black text-gray-800 mt-1">{publicCount}</p>
            </div>
            <div className="bg-amber-50/50 p-4 rounded-lg text-center border border-amber-100/50">
              <span className="text-xs text-amber-700 font-medium">🔒 Private</span>
              <p className="text-2xl font-black text-gray-800 mt-1">{privateCount}</p>
            </div>
            <div className="bg-blue-50/50 p-4 rounded-lg text-center border border-blue-100/50">
              <span className="text-xs text-blue-700 font-medium">3D Models</span>
              <p className="text-2xl font-black text-gray-800 mt-1">{model3dCount}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
            <div className="bg-gray-50/50 py-1.5 px-2 rounded text-gray-600">Textures: <strong>{textureCount}</strong></div>
            <div className="bg-gray-50/50 py-1.5 px-2 rounded text-gray-600">Audios: <strong>{audioCount}</strong></div>
            <div className="bg-gray-50/50 py-1.5 px-2 rounded text-gray-600">Markers: <strong>{markerCount}</strong></div>
          </div>
        </div>
      </div>

      {/* Asset Table Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Filters Header */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-gray-800">Manage Database Uploads</h3>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <input 
              type="text"
              placeholder="Search title, owner, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 md:w-64"
            />
            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Types</option>
              <option value="3d_model">3D Models</option>
              <option value="texture">Textures</option>
              <option value="audio">Audio Files</option>
              <option value="marker">Markers</option>
            </select>
            {/* Visibility filter */}
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Visibility</option>
              <option value="public">Public Only</option>
              <option value="private">Private Only</option>
            </select>
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50">{error}</div>
        ) : filteredAssets.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <span className="text-4xl block mb-2">🔍</span>
            No assets found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold text-xs border-b border-gray-100">
                  <th className="p-4">Visual</th>
                  <th className="p-4">Title & Description</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Visibility</th>
                  <th className="p-4">Owner ID</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      {/* Mini Preview thumbnail */}
                      <div className="w-12 h-12 rounded bg-gray-100 border border-gray-100 overflow-hidden flex items-center justify-center">
                        {asset.asset_type === '3d_model' && asset.file_url ? (
                          <span className="text-xl">🕶️</span>
                        ) : (asset.asset_type === 'texture' || asset.asset_type === 'marker') && asset.file_url ? (
                          <img src={asset.file_url} className="object-cover w-full h-full" alt="" />
                        ) : asset.asset_type === 'audio' ? (
                          <span className="text-xl">🎵</span>
                        ) : (
                          <span className="text-gray-400 text-xs">None</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="font-bold text-gray-800 truncate" title={asset.title}>{asset.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-1" title={asset.description}>{asset.description || 'No description'}</p>
                      <span className="text-[10px] text-gray-400 block font-mono">{asset.id}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 uppercase">
                        {asset.asset_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        asset.is_public 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {asset.is_public ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-500">
                      {asset.owner_id ? (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded cursor-help" title={`Full Owner ID: ${asset.owner_id}`}>
                          {asset.owner_id.substring(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-gray-400">Anonymous</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-gray-400">
                      {new Date(asset.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => startEdit(asset)}
                        className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-semibold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="px-2.5 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded font-semibold transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Admin Override Editor</h3>
              <button 
                onClick={() => setEditingAsset(null)}
                className="text-white/80 hover:text-white font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg text-[11px] text-amber-800 font-medium">
                🛡️ You are editing asset: <strong>{editingAsset.id}</strong>. This modification changes the values database-wide.
              </div>

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
                    id="admin_edit_is_public"
                    type="checkbox"
                    checked={editIsPublic}
                    onChange={(e) => setEditIsPublic(e.target.checked)}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer"
                  />
                </div>
                <div className="ml-3 text-xs">
                  <label htmlFor="admin_edit_is_public" className="font-bold text-gray-700 cursor-pointer">Make Public (Allow anyone to view)</label>
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

function ClerkDashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  return <DashboardContent clerkUser={user} getToken={getToken} />;
}

export default function AdminDashboard() {
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (isClerkConfigured) {
    return <ClerkDashboard />;
  }
  return <DashboardContent clerkUser={null} />;
}
