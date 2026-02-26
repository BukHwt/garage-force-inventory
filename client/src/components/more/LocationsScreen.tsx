import React, { useMemo, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  createLocation,
  deleteLocation,
  updateLocation,
  UpsertLocationRequest,
} from '../../api/services/locations';
import { useAuth } from '../../context/AuthContext';
import { Location, Product } from '../../types';
import { Header } from '../layout/Header';

type LocationsScreenProps = {
  locations: Location[];
  products: Product[];
  onLocationsChanged: () => Promise<void>;
};

type FormState = {
  name: string;
  description: string;
};

const initialFormState: FormState = {
  name: '',
  description: '',
};

function sortLocations(items: Location[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export function LocationsScreen({ locations, products, onLocationsChanged }: LocationsScreenProps) {
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';
  const [createForm, setCreateForm] = useState<FormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sortedLocations = useMemo(() => sortLocations(locations), [locations]);
  const quantityByLocationId = useMemo(() => {
    const totals = new Map<string, number>();
    products.forEach((product) => {
      product.inventoryItems.forEach((item) => {
        const next = (totals.get(item.location.id) ?? 0) + item.quantity;
        totals.set(item.location.id, next);
      });
    });
    return totals;
  }, [products]);

  const startEditing = (location: Location) => {
    setEditingId(location.id);
    setEditForm({
      name: location.name,
      description: location.description ?? '',
    });
    setError(null);
    setSuccess(null);
  };

  const stopEditing = () => {
    setEditingId(null);
    setEditForm(initialFormState);
  };

  const buildPayload = (form: FormState): UpsertLocationRequest => ({
    name: form.name,
    description: form.description,
  });

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isViewer) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await createLocation(buildPayload(createForm));
      setCreateForm(initialFormState);
      await onLocationsChanged();
      setSuccess('Location created.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to create location';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isViewer || !editingId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await updateLocation(editingId, buildPayload(editForm));
      await onLocationsChanged();
      stopEditing();
      setSuccess('Location updated.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to update location';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (location: Location) => {
    if (isViewer) {
      return;
    }

    const hasInventory = (quantityByLocationId.get(location.id) ?? 0) > 0;
    if (hasInventory) {
      return;
    }

    const confirmed = window.confirm(`Delete location "${location.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteLocation(location.id);
      if (editingId === location.id) {
        stopEditing();
      }
      await onLocationsChanged();
      setSuccess('Location deleted.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to delete location';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="p-4 pb-28 space-y-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-dark-text-primary">Manage Locations</h2>
          <p className="text-sm text-dark-text-secondary">
            Create and maintain tenant-specific storage locations.
          </p>
          {isViewer && (
            <p className="text-xs text-dark-text-muted mt-2">
              View-only users can browse locations but cannot modify them.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-alert-red-bg border border-alert-red-border text-alert-red text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-gf-green-900 border border-gf-green text-gf-green-200 text-sm rounded-lg p-3">
            {success}
          </div>
        )}

        {!isViewer && (
          <form
            onSubmit={handleCreate}
            className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-3"
          >
            <h3 className="font-heading text-lg text-dark-text-primary">Create Location</h3>
            <div>
              <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                Name
              </label>
              <input
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
                placeholder="Warehouse"
                maxLength={100}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                Description (optional)
              </label>
              <textarea
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary min-h-[90px]"
                placeholder="Main storage location"
                maxLength={300}
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-gf w-full py-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Add Location'}
            </button>
          </form>
        )}

        <div className="space-y-3">
          {sortedLocations.map((location) => {
            const isEditing = editingId === location.id;
            const inventoryCount = location._count?.inventoryItems ?? 0;
            const totalQuantity = quantityByLocationId.get(location.id) ?? 0;
            const canDelete = totalQuantity === 0 && !isViewer;

            return (
              <div
                key={location.id}
                className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-3"
              >
                {isEditing ? (
                  <form onSubmit={handleSaveEdit} className="space-y-3">
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                        Name
                      </label>
                      <input
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
                        maxLength={100}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        value={editForm.description}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary min-h-[90px]"
                        maxLength={300}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-gf flex-1 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={stopEditing}
                        disabled={isSubmitting}
                        className="btn-gf-outline flex-1 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-heading text-lg text-dark-text-primary">{location.name}</p>
                        <p className="text-sm text-dark-text-secondary">
                          {location.description?.trim() || 'No description'}
                        </p>
                      </div>
                      <div className="text-xs text-dark-text-muted text-right">
                        <p>{inventoryCount} inventory item{inventoryCount === 1 ? '' : 's'}</p>
                        <p>{totalQuantity} total unit{totalQuantity === 1 ? '' : 's'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => startEditing(location)}
                          disabled={isSubmitting}
                          className="btn-gf-outline px-4 py-2 text-sm"
                        >
                          Edit
                        </button>
                      )}
                      {!isViewer && (
                        <button
                          type="button"
                          onClick={() => handleDelete(location)}
                          disabled={!canDelete || isSubmitting}
                          title={!canDelete ? 'Location can only be deleted when it has zero inventory.' : undefined}
                          className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors duration-150 ${
                            canDelete
                              ? 'border-alert-red text-alert-red hover:bg-alert-red hover:text-white'
                              : 'border-dark-border text-dark-text-muted cursor-not-allowed opacity-60'
                          }`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
