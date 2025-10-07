'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { datasetsApi } from '@/lib/api';
import { Dataset, DatasetImage, DatasetStatistics } from '@/types';
import { Upload, Image as ImageIcon, ChevronLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DatasetDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const datasetId = parseInt(params.id as string);

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [images, setImages] = useState<DatasetImage[]>([]);
  const [statistics, setStatistics] = useState<DatasetStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<'train' | 'val' | 'test'>('train');
  const [filterSplit, setFilterSplit] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && datasetId) {
      loadDataset();
      loadImages();
      loadStatistics();
    }
  }, [user, datasetId, filterSplit]);

  const loadDataset = async () => {
    try {
      const data = await datasetsApi.get(datasetId);
      setDataset(data);
    } catch (error) {
      console.error('Failed to load dataset:', error);
    }
  };

  const loadImages = async () => {
    try {
      const data = await datasetsApi.listImages(datasetId, filterSplit || undefined);
      setImages(data);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await datasetsApi.getStatistics(datasetId);
      setStatistics(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    setUploading(true);

    try {
      for (const file of acceptedFiles) {
        await datasetsApi.uploadImage(datasetId, file, selectedSplit);
      }
      setShowUploadModal(false);
      loadImages();
      loadStatistics();
      loadDataset();
    } catch (error) {
      console.error('Failed to upload images:', error);
      alert('Failed to upload some images');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.bmp']
    },
    multiple: true,
  });

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await datasetsApi.deleteImage(datasetId, imageId);
      loadImages();
      loadStatistics();
      loadDataset();
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image');
    }
  };

  if (authLoading || loading || !dataset) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/datasets" className="text-blue-600 hover:text-blue-700 flex items-center space-x-1 mb-4">
            <ChevronLeft size={20} />
            <span>Back to Datasets</span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{dataset.name}</h1>
              {dataset.description && (
                <p className="mt-2 text-gray-600">{dataset.description}</p>
              )}
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                  {dataset.dataset_type}
                </span>
              </div>
            </div>
            <Button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2"
            >
              <Upload size={20} />
              <span>Upload Images</span>
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <p className="text-sm text-gray-600 font-medium">Total Images</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.total_images}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 font-medium">Labeled</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{statistics.labeled_images}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 font-medium">Unlabeled</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{statistics.unlabeled_images}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 font-medium">Classes</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{dataset.num_classes}</p>
            </Card>
          </div>
        )}

        {/* Class Names */}
        {dataset.class_names && dataset.class_names.length > 0 && (
          <Card className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Classes</h3>
            <div className="flex flex-wrap gap-2">
              {dataset.class_names.map((className, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {className}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Filter by Split */}
        <div className="mb-6 flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter by split:</span>
          <div className="flex space-x-2">
            {['', 'train', 'val', 'test'].map((split) => (
              <button
                key={split}
                onClick={() => setFilterSplit(split)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterSplit === split
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {split || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Image Gallery */}
        <Card title="Images">
          {images.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No images yet</h3>
              <p className="text-gray-600 mb-4">Upload images to get started</p>
              <Button onClick={() => setShowUploadModal(true)}>
                Upload Images
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={`${API_BASE_URL}${image.file_path}`}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                      <Link href={`/labeling?dataset=${datasetId}&image=${image.id}`}>
                        <Button size="sm" variant="primary">
                          Label
                        </Button>
                      </Link>
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 truncate">{image.filename}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        image.is_labeled ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {image.is_labeled ? 'Labeled' : 'Unlabeled'}
                      </span>
                      <span className="text-xs text-gray-500">{image.split}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upload Modal */}
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Upload Images"
          footer={
            <Button variant="ghost" onClick={() => setShowUploadModal(false)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Split
              </label>
              <div className="flex space-x-2">
                {(['train', 'val', 'test'] as const).map((split) => (
                  <button
                    key={split}
                    onClick={() => setSelectedSplit(split)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSplit === split
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {split.charAt(0).toUpperCase() + split.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto text-gray-400 mb-4" size={48} />
              {uploading ? (
                <p className="text-gray-600">Uploading...</p>
              ) : isDragActive ? (
                <p className="text-gray-600">Drop the files here...</p>
              ) : (
                <>
                  <p className="text-gray-600 mb-2">
                    Drag & drop images here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports: JPG, JPEG, PNG, BMP
                  </p>
                </>
              )}
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
