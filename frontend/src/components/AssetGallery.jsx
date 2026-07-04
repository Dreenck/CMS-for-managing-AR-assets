import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '@google/model-viewer';
import { useUser } from '@clerk/clerk-react';

function GalleryContent({ clerkUser }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const handleDelete = async (assetId) => {
    if (!window.confirm("Are you sure you want to delete this asset from both the database and cloud storage?")) {
      return;
    }
    try {
      await axios.delete(`http://localhost:8000/api/v1/assets/${assetId}`);
      setAssets(assets.filter((a) => a.id !== assetId));
    } catch (err) {
      console.error("Error deleting asset:", err);
      alert("Failed to delete the asset. Check the console for details.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-10 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-center">
        {error}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-200 max-w-4xl mx-auto mt-10">
        <p className="text-gray-500 text-lg">No public assets found.</p>
        <p className="text-gray-400 text-sm mt-1">Be the first to upload and share your AR content!</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Public AR Asset Gallery</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <div key={asset.id} className="bg-white rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow border border-gray-100 flex flex-col">
            {/* Visual Preview Container */}
            <div className="h-48 bg-gray-50 flex items-center justify-center border-b border-gray-100 relative">
              {asset.asset_type === '3d_model' && asset.file_url ? (
                <model-viewer
                  src={asset.file_url}
                  camera-controls
                  auto-rotate
                  style={{ width: '100%', height: '100%' }}
                ></model-viewer>
              ) : asset.asset_type === 'marker' && asset.file_url ? (
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
              <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 uppercase">
                {asset.asset_type.replace('_', ' ')}
              </span>
            </div>

            {/* Info Container */}
            <div className="p-4 flex-grow flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-800 truncate" title={asset.title}>
                  {asset.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2" title={asset.description}>
                  {asset.description || 'No description provided.'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                <div className="flex items-center space-x-3">
                  {(!isClerkConfigured || (clerkUser && asset.owner_id === clerkUser.id)) && (
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="text-red-500 hover:text-red-700 font-semibold transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                  {asset.owner_id ? (
                    <span className="truncate max-w-[80px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded" title={`Owner: ${asset.owner_id}`}>
                      Owner: {asset.owner_id.substring(0, 8)}...
                    </span>
                  ) : (
                    <span>Anonymous</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
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
