'use client';

import { useState, FormEvent } from 'react';
import {
  Box,
  Button,
  TextField,
  Alert,
  IconButton,
  Typography,
  Chip,
} from '@mui/material';
import { Edit, Save, Cancel } from '@mui/icons-material';
import { formatForDateTimeLocal, formatLocalDateTime } from '@/lib/dateUtils';
import { HealthLog } from '@/types/health';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownContent from '@/components/MarkdownContent';

interface HealthLogEditProps {
  log: HealthLog;
  incidentId: string;
  onSuccess: () => void;
}

export default function HealthLogEdit({ log, incidentId, onSuccess }: HealthLogEditProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    description: log.description,
    timestamp: formatForDateTimeLocal(new Date(log.timestamp || log.created_at)),
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const token = localStorage.getItem('auth-token');
    if (!token) return;

    try {
      const response = await fetch('/api/health-logs-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: log._id,
          updates: {
            incident_id: incidentId,
            description: formData.description,
            timestamp: new Date(formData.timestamp).toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update health log');
      }

      setEditing(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    setFormData({
      description: log.description,
      timestamp: formatForDateTimeLocal(new Date(log.timestamp || log.created_at)),
    });
  };

  if (editing) {
    return (
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        
        <Typography variant="subtitle2" gutterBottom>
          Description *
        </Typography>
        <MarkdownEditor
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          placeholder="Update or doctor notes... (Markdown supported)"
          minHeight={150}
          required
        />
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <TextField
            required
            size="small"
            type="datetime-local"
            value={formData.timestamp}
            onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
            slotProps={{
              inputLabel: { shrink: true }
            }}
            sx={{ width: 200 }}
          />
          
          <Box display="flex" gap={1}>
            <Button
              type="submit"
              variant="contained"
              size="small"
              startIcon={<Save />}
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Cancel />}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <MarkdownContent variant="body1">
        {log.description}
      </MarkdownContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="caption" display="block">
            {formatLocalDateTime(log.timestamp || log.created_at)}
          </Typography>
          <Chip size="small" label={log.issue_type} />
        </Box>
        <IconButton size="small" onClick={() => setEditing(true)}>
          <Edit fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
