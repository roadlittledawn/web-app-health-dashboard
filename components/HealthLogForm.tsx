'use client';

import { useState, FormEvent } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Alert,
  Collapse,
} from '@mui/material';
import { Add, Save, Cancel } from '@mui/icons-material';
import { formatForDateTimeLocal } from '@/lib/dateUtils';

interface HealthLogFormProps {
  incidentId: string;
  onSuccess: () => void;
}

export default function HealthLogForm({ incidentId, onSuccess }: HealthLogFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    issue_type: 'update' as 'update' | 'doctor_visit_notes',
    description: '',
    timestamp: formatForDateTimeLocal(new Date()),
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const token = localStorage.getItem('auth-token');
    if (!token) return;

    try {
      const response = await fetch('/api/health-logs-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          incident_id: incidentId,
          timestamp: new Date(formData.timestamp).toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create health log');
      }

      // Reset form
      setFormData({
        issue_type: 'update',
        description: '',
        timestamp: formatForDateTimeLocal(new Date()),
      });
      setShowForm(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setError('');
    setFormData({
      issue_type: 'update',
      description: '',
      timestamp: formatForDateTimeLocal(new Date()),
    });
  };

  return (
    <Box>
      {!showForm && (
        <Button
          startIcon={<Add />}
          onClick={() => setShowForm(true)}
          variant="outlined"
        >
          Add Entry
        </Button>
      )}

      <Collapse in={showForm}>
        <Card sx={{ mt: 2 }}>
          <CardContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Log Type</InputLabel>
                    <Select
                      value={formData.issue_type}
                      label="Log Type"
                      onChange={(e) => setFormData({ ...formData, issue_type: e.target.value as 'update' | 'doctor_visit_notes' })}
                    >
                      <MenuItem value="update">Update</MenuItem>
                      <MenuItem value="doctor_visit_notes">Doctor Visit Notes</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    size="small"
                    type="datetime-local"
                    label="Date & Time"
                    value={formData.timestamp}
                    onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                    slotProps={{
                      inputLabel: { shrink: true }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Update or doctor notes..."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      size="small"
                      startIcon={<Save />}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Collapse>
    </Box>
  );
}
