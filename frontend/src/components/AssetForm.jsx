import React, { useState, useEffect } from 'react';
import api from '../services/api';
import axios from 'axios';
import '@google/model-viewer';
import { useUser, useAuth } from '@clerk/clerk-react';


function BaseAssetForm({ ownerId, getToken }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    asset_type: '3d_model',
    is_public: true
  });
  const [file, setFile] = useState(null);
  const [rules, setRules] = useState({});
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await api.get('/api/v1/assets/rules');
        setRules(response.data);
      } catch (err) {
        console.error("Failed to fetch validation rules from backend:", err);
      }
    };
    fetchRules();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'asset_type') {
        setFile(null);
        setPreviewUrl(null);
        setFileInputKey((prevKey) => prevKey + 1);
      }
      return updated;
    });
  };

  const handleCheckboxChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.checked });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const typeRules = rules[formData.asset_type];
    if (!typeRules) return;

    // 1. Validate File Size
    const maxSize = typeRules.max_size_mb * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      alert(`File exceeds maximum allowed size (${typeRules.max_size_mb}MB)!`);
      e.target.value = null;
      return;
    }
    
    // 2. Validate Extension
    const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!typeRules.extensions.includes(fileExtension)) {
      alert(`Invalid extension! Allowed: ${typeRules.extensions.join(', ')}`);
      e.target.value = null;
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file!");
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Request permission (get Presigned URL from FastAPI)
      const { data: urlData } = await api.post('/api/v1/upload-url', {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        asset_type: formData.asset_type,
        file_size: file.size
      });

      // Step 2: Direct upload to S3 (MinIO / Cloudflare R2)
      await axios.put(urlData.presigned_url, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      const headers = {};
      if (getToken) {
        const token = await getToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      // Step 3: Save metadata to the database via FastAPI
      await api.post('/api/v1/assets', {
        title: formData.title,
        description: formData.description,
        asset_type: formData.asset_type,
        file_url: urlData.file_url,
        is_public: formData.is_public,
        owner_id: ownerId
      }, { headers });

      alert("Content uploaded and saved successfully!");
      
      // Clear the form
      setFormData({ title: '', description: '', asset_type: '3d_model', is_public: true });
      setFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      setFileInputKey((prevKey) => prevKey + 1);

    } catch (error) {
      console.error("Upload error:", error);
      alert("An error occurred. Check the console for details.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Column: Form */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New AR Content</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input 
              type="text" name="title" value={formData.title} onChange={handleChange} required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea 
              name="description" value={formData.description} onChange={handleChange} rows="3"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Content Type</label>
            <select 
              name="asset_type" value={formData.asset_type} onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="3d_model">3D Model</option>
              <option value="texture">Texture</option>
              <option value="audio">Audio</option>
              <option value="marker">Marker Image</option>
            </select>
          </div>

          <div className="flex items-start mt-2">
            <div className="flex items-center h-5">
              <input
                id="is_public"
                name="is_public"
                type="checkbox"
                checked={formData.is_public}
                onChange={handleCheckboxChange}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="is_public" className="font-medium text-gray-700">Make Public (Allow anyone to view)</label>
              <p className="text-xs text-gray-500">Unchecking makes this private. <em>(Private hosting requires a premium subscription in future)</em></p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              File {Object.keys(rules).length === 0 && <span className="text-xs text-gray-400 font-normal">(Loading validation rules...)</span>}
            </label>
            <input 
              key={fileInputKey}
              type="file" 
              onChange={handleFileChange} 
              accept={rules[formData.asset_type]?.extensions?.join(',')}
              required
              disabled={Object.keys(rules).length === 0}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-xs text-gray-500 mt-1 text-right">{uploadProgress}%</p>
            </div>
          )}

          <button 
            type="submit" disabled={isUploading || Object.keys(rules).length === 0}
            className={`w-full text-white font-bold py-2 px-4 rounded ${isUploading || Object.keys(rules).length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isUploading ? 'Uploading...' : 'Upload to AR CMS'}
          </button>

        </form>
      </div>

      {/* Right Column: Dynamic Preview */}
      <div className="bg-gray-50 rounded-lg flex items-center justify-center min-h-[300px] border-2 border-dashed border-gray-300 overflow-hidden">
        {previewUrl ? (
          formData.asset_type === '3d_model' ? (
            <model-viewer 
              src={previewUrl} 
              camera-controls 
              auto-rotate 
              style={{ width: '100%', height: '400px' }}
            ></model-viewer>
          ) : (formData.asset_type === 'texture' || formData.asset_type === 'marker') ? (
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="max-h-[380px] max-w-full object-contain p-4" 
            />
          ) : formData.asset_type === 'audio' ? (
            <div className="flex flex-col items-center justify-center p-6 w-full">
              <span className="text-6xl mb-4 animate-bounce">🎵</span>
              <p className="text-sm font-medium text-gray-700 mb-2 truncate max-w-[200px]">{file?.name}</p>
              <audio controls src={previewUrl} className="w-full max-w-[280px]" />
            </div>
          ) : (
            <p className="text-gray-400 text-center px-4">Preview not available for this type</p>
          )
        ) : (
          <p className="text-gray-400 text-center px-4">
            Select a file to see preview
          </p>
        )}
      </div>
    </div>
  );
}

function ClerkForm() {
  const { user } = useUser();
  const { getToken } = useAuth();
  return <BaseAssetForm ownerId={user?.id || null} getToken={getToken} />;
}

export default function AssetForm() {
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (isClerkConfigured) {
    return <ClerkForm />;
  } else {
    return <BaseAssetForm ownerId={null} />;
  }
}