import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '@google/model-viewer';
import { useUser } from '@clerk/clerk-react';

function GalleryContent({ clerkUser }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    const fetchPublicAssets = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v1/assets', {
          params: { public_only: true }
        });
        setAssets(response.data);
      } catch (err) {
        console.error("Error fetching gallery:", err);
        setError("Could not load assets. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicAssets();
  }, []);

  // 1. Filter assets based on Search Query and Asset Type
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.description && asset.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // 2. Sort assets based on Sort Order
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortOrder === 'oldest') {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (sortOrder === 'title-az') {
      return a.title.localeCompare(b.title);
    } else if (sortOrder === 'title-za') {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-10 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-center shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Section Title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Public AR Asset Gallery</h2>
        <p className="text-sm text-gray-500 mt-1">Explore high-quality 3D assets, textures, markers, and audio files</p>
      </div>

      {/* Filter and Search Bar Section */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none bg-gray-50/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Asset Type filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Assets</option>
              <option value="3d_model">3D Models 🕶️</option>
              <option value="texture">Textures 🎨</option>
              <option value="audio">Audios 🎵</option>
              <option value="marker">Markers 🖼️</option>
            </select>
          </div>

          {/* Sort selection */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title-az">Alphabetical (A-Z)</option>
              <option value="title-za">Alphabetical (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Asset Cards Grid */}
      {sortedAssets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-200/60 max-w-4xl mx-auto">
          <span className="text-4xl block mb-3">🔎</span>
          <p className="text-gray-500 text-lg font-semibold">No assets found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sortedAssets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col hover:-translate-y-0.5">
              
              {/* Visual Preview Container */}
              <div className="h-48 bg-gray-50 flex items-center justify-center border-b border-gray-50 relative">
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
                    <span className="text-4xl">🎵</span>
                    <audio controls src={asset.file_url} className="w-full mt-4 scale-90" />
                  </div>
                ) : (
                  <span className="text-gray-400">No media file</span>
                )}
                {/* Type Badge */}
                <span className="absolute top-3 right-3 px-2.5 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 uppercase border border-blue-100">
                  {asset.asset_type.replace('_', ' ')}
                </span>
              </div>

              {/* Info Container */}
              <div className="p-5 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg truncate" title={asset.title}>
                    {asset.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2" title={asset.description}>
                    {asset.description || 'No description provided.'}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                  <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center space-x-2">

                    {asset.owner_id ? (
                      <span className="truncate max-w-[80px] bg-gray-50 text-gray-500 border border-gray-100 px-1.5 py-0.5 rounded" title={`Owner: ${asset.owner_id}`}>
                        Owner: {asset.owner_id.substring(0, 8)}
                      </span>
                    ) : (
                      <span className="bg-gray-50 text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded">Anonymous</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClerkGallery() {
  const { user } = useUser();
  return <GalleryContent clerkUser={user} />;
}

export default function AssetGallery() {
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (isClerkConfigured) {
    return <ClerkGallery />;
  }
  return <GalleryContent clerkUser={null} />;
}
