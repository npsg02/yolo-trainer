'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { datasetsApi } from '@/lib/api';
import { Dataset } from '@/types';
import { Plus, Search, Database, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function DatasetsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDescription, setNewDatasetDescription] = useState('');
  const [datasetType, setDatasetType] = useState<'detect' | 'segment' | 'pose' | 'classify' | 'tracking'>('detect');
  const [classNames, setClassNames] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadDatasets();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = datasets.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDatasets(filtered);
    } else {
      setFilteredDatasets(datasets);
    }
  }, [searchQuery, datasets]);

  const loadDatasets = async () => {
    try {
      const data = await datasetsApi.list();
      setDatasets(data);
      setFilteredDatasets(data);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) {
      setError('Dataset name is required');
      return;
    }

    const classNamesArray = classNames.split(',').map(c => c.trim()).filter(c => c);
    if (classNamesArray.length === 0) {
      setError('At least one class name is required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      await datasetsApi.create({
        name: newDatasetName,
        description: newDatasetDescription || undefined,
        dataset_type: datasetType,
        class_names: classNamesArray,
      });
      setShowCreateModal(false);
      setNewDatasetName('');
      setNewDatasetDescription('');
      setDatasetType('detect');
      setClassNames('');
      loadDatasets();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create dataset');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDataset = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await datasetsApi.delete(id);
      loadDatasets();
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      alert('Failed to delete dataset');
    }
  };

  if (authLoading || !user) {
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Datasets</h1>
            <p className="mt-2 text-gray-600">Manage your object detection datasets</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Create Dataset</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading datasets...</p>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Database className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No datasets found' : 'No datasets yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'Try a different search term' : 'Create your first dataset to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateModal(true)}>
                  Create Dataset
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDatasets.map((dataset) => (
              <Card key={dataset.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Database className="text-blue-500" size={24} />
                    <h3 className="text-lg font-semibold text-gray-900">{dataset.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDeleteDataset(dataset.id, dataset.name)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {dataset.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {dataset.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-semibold text-gray-900 capitalize">{dataset.dataset_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Images:</span>
                    <span className="font-semibold text-gray-900">{dataset.num_images}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Classes:</span>
                    <span className="font-semibold text-gray-900">{dataset.num_classes}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-semibold text-gray-900">
                      {format(new Date(dataset.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>

                <Link href={`/datasets/${dataset.id}`}>
                  <Button variant="secondary" size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dataset Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setError('');
          }}
          title="Create New Dataset"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDataset}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="Dataset Name"
              value={newDatasetName}
              onChange={(e) => setNewDatasetName(e.target.value)}
              placeholder="e.g., Vehicle Detection Dataset"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={newDatasetDescription}
                onChange={(e) => setNewDatasetDescription(e.target.value)}
                placeholder="Describe your dataset..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dataset Type
              </label>
              <select
                value={datasetType}
                onChange={(e) => setDatasetType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="detect">Object Detection</option>
                <option value="segment">Segmentation</option>
                <option value="pose">Pose Estimation</option>
                <option value="classify">Classification</option>
                <option value="tracking">Object Tracking</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Choose the type of computer vision task</p>
            </div>

            <Input
              label="Class Names"
              value={classNames}
              onChange={(e) => setClassNames(e.target.value)}
              placeholder="car, truck, bus (comma-separated)"
              required
            />
            <p className="text-xs text-gray-500">Enter class names separated by commas</p>
          </div>
        </Modal>
      </main>
    </div>
  );
}
